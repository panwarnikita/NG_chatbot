import { useState, useEffect, useRef, useCallback } from 'react';

// Drop-in replacement for usePiper that delegates synthesis to the browser's
// Web Speech API. Used as a fallback for slow networks / low-RAM devices,
// where the 60MB Piper model + WASM inference is too heavy.
//
// Returns the same shape as usePiper so App.jsx can swap them transparently:
//   { speak, isPlaying, currentlyPlayingIndex, resetTTS, isReady, isLoading,
//     error, downloadProgress }
//
// Notes:
//   • Voice list loads async on most browsers — gated via 'voiceschanged'.
//   • OS-level queue handles concatenation; no chunking needed in the caller.
//   • currentlyPlayingIndex is preserved so the mascot animation keeps working.

export const useWebSpeech = (config) => {
    const [state, setState] = useState({
        isReady: false,
        isLoading: false,
        error: null,
        downloadProgress: null
    });
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState(null);

    const counterRef = useRef(0);
    const voiceRef = useRef(null);
    const langRef = useRef('en-US');

    useEffect(() => {
        if (!config) return;
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            setState(s => ({ ...s, isReady: false, isLoading: false, error: 'Web Speech API not available' }));
            return;
        }

        const synth = window.speechSynthesis;
        let active = true;
        let voicesTimeoutId = null;

        // Infer target language from warmup text (Devanagari → Hindi).
        const isHindi = /[ऀ-ॿ]/.test(config.warmupText || '');
        const targetLang = isHindi ? 'hi-IN' : 'en-US';
        const langPrefix = targetLang.split('-')[0];
        langRef.current = targetLang;

        setState(s => ({ ...s, isLoading: true, isReady: false, error: null }));

        const pickVoice = () => {
            const allVoices = synth.getVoices();
            if (allVoices.length === 0) return null;

            // Filter out network voices when offline — they fail silently and
            // leave the user with no audio. navigator.onLine is the standard
            // signal; treat undefined as online.
            const isOnline = typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
            const voices = isOnline ? allVoices : allVoices.filter(v => v.localService);
            if (voices.length === 0) return null;

            const inLang = (v) => v.lang === targetLang || v.lang.startsWith(langPrefix);

            if (targetLang === 'hi-IN') {
                // Known female Hindi voice names across vendors. Web Speech API
                // doesn't expose gender, so we positive-match by name.
                //   Apple:     Lekha
                //   Microsoft: Heera, Kalpana, Swara
                //   Misc:      Priya, Veena
                const femaleNames = /lekha|heera|kalpana|swara|priya|veena/i;

                // 1. Google Hindi — sounds most natural per QA testing.
                const googleHindi = voices.find(v => inLang(v) && /google/i.test(v.name));
                if (googleHindi) return googleHindi;

                // 2. Other known female Hindi voices.
                const knownFemale = voices.find(v => inLang(v) && femaleNames.test(v.name));
                if (knownFemale) return knownFemale;

                // 3. Anything explicitly tagged female.
                const explicitFemale = voices.find(v => inLang(v) && /female|woman/i.test(v.name));
                if (explicitFemale) return explicitFemale;
            }

            return (
                voices.find(v => v.lang === targetLang && v.localService) ||
                voices.find(v => v.lang === targetLang) ||
                voices.find(v => v.lang.startsWith(langPrefix) && v.localService) ||
                voices.find(v => v.lang.startsWith(langPrefix)) ||
                voices.find(v => v.default) ||
                voices[0] ||
                null
            );
        };

        const init = () => {
            if (!active) return;
            const voice = pickVoice();
            voiceRef.current = voice;

            if (!voice) {
                setState(s => ({ ...s, isReady: false, isLoading: false, error: 'No TTS voices available on this device' }));
                return;
            }

            const matchedLang = voice.lang.startsWith(langPrefix);
            console.log(`[tts] webspeech voice: "${voice.name}" (${voice.lang}, ${voice.localService ? 'local' : 'network'})${matchedLang ? '' : ' ⚠ no Hindi voice — using fallback'}`);

            setState(s => ({ ...s, isReady: true, isLoading: false }));
        };

        if (synth.getVoices().length > 0) {
            init();
        } else {
            const onVoicesChanged = () => {
                synth.removeEventListener('voiceschanged', onVoicesChanged);
                init();
            };
            synth.addEventListener('voiceschanged', onVoicesChanged);
            // Safari sometimes never fires voiceschanged — try anyway after 1.5s.
            voicesTimeoutId = setTimeout(() => {
                synth.removeEventListener('voiceschanged', onVoicesChanged);
                init();
            }, 1500);
        }

        return () => {
            active = false;
            if (voicesTimeoutId) clearTimeout(voicesTimeoutId);
            synth.cancel();
            voiceRef.current = null;
            counterRef.current = 0;
            setIsPlaying(false);
            setCurrentlyPlayingIndex(null);
        };
    }, [config?.warmupText]);

    const speak = useCallback((text) => {
        if (!text || !text.trim()) return;
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text.trim());
        if (voiceRef.current) {
            utterance.voice = voiceRef.current;
            utterance.lang = voiceRef.current.lang;
        } else {
            utterance.lang = langRef.current;
        }
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const idx = counterRef.current++;

        utterance.onstart = () => {
            setIsPlaying(true);
            setCurrentlyPlayingIndex(idx);
        };

        const finish = () => {
            // Only flip to idle when the OS queue is fully drained — onend fires
            // per utterance, but more may still be queued from earlier speak() calls.
            if (!synth.speaking && !synth.pending) {
                setIsPlaying(false);
                setCurrentlyPlayingIndex(null);
            }
        };

        utterance.onend = finish;
        utterance.onerror = (e) => {
            console.warn('[tts] webspeech utterance error:', e?.error || e);
            finish();
        };

        synth.speak(utterance);
    }, []);

    const resetTTS = useCallback(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        counterRef.current = 0;
        setIsPlaying(false);
        setCurrentlyPlayingIndex(null);
    }, []);

    return { speak, isPlaying, currentlyPlayingIndex, resetTTS, ...state };
};
