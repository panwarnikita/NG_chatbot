import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Speech-to-Text Hook using Web Speech API
 * Supports Hindi and English languages
 * Auto-stops on silence timeout
 */
export const useSTT = (options = { lang: 'en-IN', continuous: true, silenceTimeout: 2000 }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Web Speech API is not supported in this browser.');
      return;
    }

    // Initialize the recognition instance
    const recognition = new SpeechRecognition();
    recognition.continuous = options.continuous;
    recognition.interimResults = true;
    recognition.lang = options.lang;

    // --- EVENT HANDLERS ---

    recognition.onresult = (event) => {
      if (options.silenceTimeout) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          recognition.stop();
        }, options.silenceTimeout);
      }

      let finalTranscripts = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (!(event.results[i][0].confidence > 0)) continue;
        if (event.results[i].isFinal && event.results[i][0].confidence >= 0.7) {
          finalTranscripts = event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      if (finalTranscripts) {
        setTranscript((prev) => prev + ' ' + finalTranscripts);
      }
      setInterimTranscript(currentInterim);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(event.error);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    recognitionRef.current = recognition;

    // Cleanup on unmount
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [options.lang, options.continuous, options.silenceTimeout]);

  // --- EXPOSED METHODS ---

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        setInterimTranscript('');
        recognitionRef.current.start();
        setError(null);
      } catch (err) {
        console.error('Error starting recognition:', err);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    error,
    browserSupportsSpeechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  };
};
