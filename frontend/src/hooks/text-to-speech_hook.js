import { useState, useEffect, useRef, useCallback } from 'react';
import { getCachedOrFetch } from '../utils/modelCache';

export const usePiper = (config) => {
    const [state, setState] = useState({
        isReady: false,
        isLoading: false,
        error: null,
        downloadProgress: null
    });
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState(null);
    
    const playbackCounterRef = useRef(0);
    const audioQueueRef = useRef([]);
    const synthesisQueueRef = useRef([]);
    const processingRef = useRef(false);
    const isSynthesizingRef = useRef(false);
    const workerRef = useRef(null);
    const initTimeoutRef = useRef(null);

    useEffect(() => {
        if (!config || !config.voiceModelUrl || !config.voiceConfigUrl) return;

        let active = true;

        const initPiper = async () => {
            console.log("🚀 Initializing Hindi Piper...");
            setState(s => ({ ...s, isReady: false, isLoading: true, error: null }));

            try {
                const modelBlob = await getCachedOrFetch(config.voiceModelUrl, (loaded, total) => {
                    if (active) setState(s => ({ ...s, downloadProgress: { loaded, total } }));
                });
                const configBlob = await getCachedOrFetch(config.voiceConfigUrl);

                if (!active) return;

                // Cache fetched to warm up, but pass direct URLs to worker
                void modelBlob;
                void configBlob;

                const modelUrl = config.voiceModelUrl;
                const configUrl = config.voiceConfigUrl;

                const worker = new Worker('/piper-wasm/piper_worker.js');
                workerRef.current = worker;

                initTimeoutRef.current = setTimeout(() => {
                    if (!active) return;
                    setState(s => ({
                        ...s,
                        isLoading: false,
                        isReady: false,
                        error: 'Hindi voice init timeout. Check worker/wasm loading.'
                    }));
                }, 25000);

                worker.onmessage = (event) => {
                    if (event.data.kind === 'output') {
                        console.log("✅ Piper warmup complete for Hindi");
                        if (initTimeoutRef.current) {
                            clearTimeout(initTimeoutRef.current);
                            initTimeoutRef.current = null;
                        }
                        if (active) setState(s => ({ ...s, isReady: true, isLoading: false, downloadProgress: null }));
                    } else if (event.data.kind === 'stderr') {
                        console.log("Piper Internal:", event.data.message);
                        if (typeof event.data.message === 'string' && event.data.message.toLowerCase().includes('error')) {
                            if (initTimeoutRef.current) {
                                clearTimeout(initTimeoutRef.current);
                                initTimeoutRef.current = null;
                            }
                            if (active) {
                                setState(s => ({ ...s, isReady: false, isLoading: false, error: event.data.message }));
                            }
                        }
                    }
                };

                worker.onerror = (err) => {
                    console.error('❌ Hindi worker error:', {
                        message: err?.message,
                        filename: err?.filename,
                        lineno: err?.lineno,
                        colno: err?.colno,
                        type: err?.type
                    });
                    if (initTimeoutRef.current) {
                        clearTimeout(initTimeoutRef.current);
                        initTimeoutRef.current = null;
                    }
                    if (active) {
                        setState(s => ({ ...s, isReady: false, isLoading: false, error: err?.message || 'Worker error' }));
                    }
                };

                worker.onmessageerror = (err) => {
                    console.error('❌ Hindi worker message error:', err);
                };

                worker.postMessage({
                    kind: 'init',
                    input: config.warmupText || 'नमस्ते',
                    modelUrl: modelUrl,
                    modelConfigUrl: configUrl,
                    piperPhonemizeJsUrl: '/piper-wasm/piper_phonemize.js',
                    piperPhonemizeWasmUrl: '/piper-wasm/piper_phonemize.wasm',
                    piperPhonemizeDataUrl: '/piper-wasm/piper_phonemize.data',
                    onnxruntimeUrl: '/piper-wasm/dist/',
                    blobs: { "ort-wasm-simd-threaded.wasm": true }
                });

            } catch (err) {
                console.error("❌ Failed to start Piper worker", err);
                if (initTimeoutRef.current) {
                    clearTimeout(initTimeoutRef.current);
                    initTimeoutRef.current = null;
                }
                if (active) setState(s => ({ ...s, isReady: false, isLoading: false, error: err.message }));
            }
        };

        initPiper();

        return () => {
            active = false;
            workerRef.current?.terminate();
            if (initTimeoutRef.current) {
                clearTimeout(initTimeoutRef.current);
                initTimeoutRef.current = null;
            }
        };
    }, [config?.voiceModelUrl, config?.voiceConfigUrl]);

    // Helper: Synthesize a single sentence
    const synthesize = useCallback(async (text) => {
        if (!workerRef.current) throw new Error("Worker not initialized");

        return new Promise((resolve) => {
            const worker = workerRef.current;

            const handleMessage = (event) => {
                if (event.data.kind === 'output') {
                    worker.removeEventListener('message', handleMessage);
                    resolve(event.data.file);
                }
            };

            worker.addEventListener('message', handleMessage);

            worker.postMessage({
                kind: 'generate',
                input: text,
                modelUrl: config.voiceModelUrl,
                modelConfigUrl: config.voiceConfigUrl,
                piperPhonemizeJsUrl: '/piper-wasm/piper_phonemize.js',
                piperPhonemizeWasmUrl: '/piper-wasm/piper_phonemize.wasm',
                piperPhonemizeDataUrl: '/piper-wasm/piper_phonemize.data',
                onnxruntimeUrl: '/piper-wasm/dist/',
                blobs: { "ort-wasm-simd-threaded.wasm": true }
            });
        });
    }, [config]);

    // Loop 2: Audio Player Consumer
    const playQueue = useCallback(async () => {
        if (processingRef.current) return;
        processingRef.current = true;
        setIsPlaying(true);

        try {
            while (audioQueueRef.current.length > 0) {
                const blob = audioQueueRef.current.shift();
                if (!blob) break;

                setCurrentlyPlayingIndex(playbackCounterRef.current);

                await new Promise((resolve) => {
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    
                    audio.onended = () => {
                        URL.revokeObjectURL(url);
                        resolve();
                    };
                    
                    audio.onerror = (e) => {
                        console.error("Audio playback error", e);
                        URL.revokeObjectURL(url);
                        resolve();
                    };
                    
                    audio.play().catch((err) => {
                        console.error("Playback failed", err);
                        URL.revokeObjectURL(url);
                        resolve();
                    });
                });

                playbackCounterRef.current += 1;
            }
        } finally {
            processingRef.current = false;
            setIsPlaying(false);
            setCurrentlyPlayingIndex(null);
        }
    }, []);

    // Loop 1: Synthesis Consumer
    const processSynthesisQueue = useCallback(async () => {
        if (isSynthesizingRef.current) return;
        isSynthesizingRef.current = true;

        try {
            while (synthesisQueueRef.current.length > 0) {
                const text = synthesisQueueRef.current.shift();
                if (text) {
                    try {
                        const blob = await synthesize(text);
                        if (blob) {
                            audioQueueRef.current.push(blob);
                            if (!processingRef.current) {
                                playQueue();
                            }
                        }
                    } catch (err) {
                        console.error("Synthesis error:", err);
                    }
                }
            }
        } finally {
            isSynthesizingRef.current = false;
        }
    }, [synthesize, playQueue]);

    // Main: Output Entry Point
    const speak = useCallback((text) => {
        if (text && text.trim()) {
            synthesisQueueRef.current.push(text.trim());
            processSynthesisQueue();
        }
    }, [processSynthesisQueue]);

    // Reset Logic
    const resetTTS = useCallback(() => {
        audioQueueRef.current = [];
        synthesisQueueRef.current = [];
        playbackCounterRef.current = 0;
        setCurrentlyPlayingIndex(null);
        setIsPlaying(false);
    }, []);

    return {
        speak,
        isPlaying,
        currentlyPlayingIndex,
        resetTTS,
        ...state
    };
};
