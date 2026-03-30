import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Text-to-Speech Hook using Piper WASM
 * Supports Hindi and English voices
 * Generates audio locally in browser without server calls
 */
export const useTTS = (config = null) => {
  const [state, setState] = useState({
    isReady: false,
    isLoading: false,
    error: null,
    downloadProgress: null,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState(null);

  const playbackCounterRef = useRef(0);
  const audioQueueRef = useRef([]);
  const synthesisQueueRef = useRef([]);
  const processingRef = useRef(false);
  const isSynthesizingRef = useRef(false);
  const workerRef = useRef(null);
  const configRef = useRef(config);

  // Keep config ref updated
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    if (!config || !config.voiceModelUrl || !config.voiceConfigUrl) return;

    let active = true;

    const initPiper = async () => {
      setState((s) => ({
        ...s,
        isReady: false,
        isLoading: true,
        error: null,
        downloadProgress: { loaded: 0, total: 100 },
      }));

      try {
        // Just verify files exist
        console.log('📥 Verifying model file:', config.voiceModelUrl);
        const modelResponse = await fetch(config.voiceModelUrl);
        if (!modelResponse.ok) throw new Error(`Failed to fetch model: HTTP ${modelResponse.status}`);
        console.log('✓ Model file verified');

        console.log('📥 Verifying config file:', config.voiceConfigUrl);
        const configResponse = await fetch(config.voiceConfigUrl);
        if (!configResponse.ok) throw new Error(`Failed to fetch config: HTTP ${configResponse.status}`);
        console.log('✓ Config file verified');

        if (!active) return;

        // Fetch ALL files as blobs first before passing to worker
        // This avoids most URL handling issues
        const blobs = {};
        
        try {
          const filesToFetch = [
            config.voiceModelUrl,
            config.voiceConfigUrl,
            '/piper-wasm/piper_phonemize.js',
            '/piper-wasm/piper_phonemize.wasm',
            '/piper-wasm/piper_phonemize.data',
          ];

          console.log('📥 Fetching all files as blobs...');
          
          for (const url of filesToFetch) {
            try {
              const res = await fetch(url);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const blob = await res.blob();
              blobs[url] = blob;
              console.log(`   ✓ ${url} (${blob.size} bytes)`);
            } catch (err) {
              console.error(`   ❌ Failed to fetch ${url}: ${err.message}`);
            }
          }
        } catch (err) {
          console.error('❌ Failed to pre-fetch files:', err);
          return;
        }

        // Initialize Worker
        const workerUrl = '/piper-wasm/piper_worker.js';
        const worker = new Worker(workerUrl);
        workerRef.current = worker;

        let initComplete = false;
        const timeout = setTimeout(() => {
          if (!initComplete && active) {
            console.error('❌ Piper initialization timeout (60s)');
            setState((s) => ({
              ...s,
              isLoading: false,
              error: 'Piper initialization timeout',
              isReady: false,
            }));
          }
        }, 60000);

        const handleMessage = (event) => {
          const data = event.data;

          if (data.kind === 'output') {
            clearTimeout(timeout);
            console.log('✅ Piper warmup complete');
            initComplete = true;
            if (active) {
              setState((s) => ({
                ...s,
                isReady: true,
                isLoading: false,
                downloadProgress: null,
                error: null,
              }));
            }
          } else if (data.kind === 'stderr') {
            console.warn('⚠️ Piper:', data.message);
          } else if (data.kind === 'fetch') {
            // Log fetch events for debugging
            const { id, url, loaded, total } = data;
            if (loaded !== undefined) {
              console.log(`⬇️  ${url}: ${loaded}/${total || '?'} bytes`);
            }
          }
        };

        worker.addEventListener('message', handleMessage);

        console.log('🚀 Initializing Piper TTS with pre-fetched blobs');
        console.log('   Blobs ready:', Object.keys(blobs).length, 'files');
        
        // Send init with ALL files as blobs
        // Worker's getBlob() will find them in the blobs cache immediately
        worker.postMessage({
          kind: 'init',
          input: config.warmupText || 'नमस्ते',
          modelUrl: config.voiceModelUrl,
          modelConfigUrl: config.voiceConfigUrl,
          blobs: blobs,  // Pass all pre-fetched blobs
          piperPhonemizeJsUrl: '/piper-wasm/piper_phonemize.js',
          piperPhonemizeWasmUrl: '/piper-wasm/piper_phonemize.wasm',
          piperPhonemizeDataUrl: '/piper-wasm/piper_phonemize.data',
          onnxruntimeUrl: window.location.origin + '/',
        });

        // Timeout for init
        const initTimeout = setTimeout(() => {
          if (!initComplete && active) {
            console.error('❌ Piper initialization timeout');
            worker.terminate();
            setState((s) => ({
              ...s,
              isReady: false,
              isLoading: false,
              error: 'Voice initialization timeout',
            }));
          }
        }, 60000);

        return () => clearTimeout(initTimeout);
      } catch (err) {
        console.error('❌ Failed to initialize Piper:', err.message);
        if (active) {
          setState((s) => ({
            ...s,
            isReady: false,
            isLoading: false,
            error: `Voice error: ${err.message}`,
          }));
        }
      }
    };

    initPiper();

    return () => {
      active = false;
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [config?.voiceModelUrl, config?.voiceConfigUrl, config?.warmupText]);

  // Helper: Synthesize a single sentence
  const synthesize = useCallback(
    (text) => {
      if (!workerRef.current) throw new Error('Worker not initialized');
      if (!configRef.current) throw new Error('Config not available');

      return new Promise((resolve, reject) => {
        const worker = workerRef.current;
        const timeoutId = setTimeout(() => {
          reject(new Error('Synthesis timeout'));
        }, 30000); // 30 second timeout

        const handleMessage = (event) => {
          const data = event.data;
          if (data.kind === 'output') {
            clearTimeout(timeoutId);
            worker.removeEventListener('message', handleMessage);
            resolve(data.file);
          } else if (data.kind === 'stderr') {
            console.log('Piper Log:', data.message);
          } else if (data.kind === 'fetch') {
            // Handle worker's fetch requests
            const { id, url } = data;
            fetch(url)
              .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
                return res.blob();
              })
              .then((blob) => {
                worker.postMessage({ kind: 'fetch', id, url, blob });
              })
              .catch((err) => {
                console.error('❌ Fetch error:', url, err);
                worker.postMessage({ kind: 'fetch', id, url, error: err.message });
              });
          }
        };

        worker.addEventListener('message', handleMessage);

        // Use config file paths - worker will fetch them, include blobs for WASM files
        worker.postMessage({
          kind: 'generate',
          input: text,
          modelUrl: configRef.current.voiceModelUrl,
          modelConfigUrl: configRef.current.voiceConfigUrl,
          blobs: {},  // Empty - worker will request files via fetch messages
          piperPhonemizeJsUrl: '/piper-wasm/piper_phonemize.js',
          piperPhonemizeWasmUrl: '/piper-wasm/piper_phonemize.wasm',
          piperPhonemizeDataUrl: '/piper-wasm/piper_phonemize.data',
          onnxruntimeUrl: window.location.origin + '/',
        });
      });
    },
    []
  );

  // Play audio queue
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
          const audio = new Audio(URL.createObjectURL(blob));
          audio.onended = () => resolve();
          audio.onerror = (e) => {
            console.error('Audio playback error', e);
            resolve();
          };
          audio.play().catch((e) => {
            console.error('Playback failed', e);
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

  // Process synthesis queue
  const processSynthesisQueue = useCallback(async () => {
    if (isSynthesizingRef.current) return;
    isSynthesizingRef.current = true;

    try {
      while (synthesisQueueRef.current.length > 0) {
        const text = synthesisQueueRef.current.shift();
        if (text) {
          try {
            const startTime = performance.now();
            const blob = await synthesize(text);
            const endTime = performance.now();
            console.log(`Time to synthesize: ${(endTime - startTime).toFixed(2)}ms for: "${text}"`);
            audioQueueRef.current.push(blob);
            if (!processingRef.current) {
              playQueue();
            }
          } catch (err) {
            console.error('Synthesis error:', err);
          }
        }
      }
    } finally {
      isSynthesizingRef.current = false;
    }
  }, [synthesize, playQueue]);

  // Main: Speak text
  const speak = useCallback(
    (text) => {
      if (text.trim()) {
        synthesisQueueRef.current.push(text.trim());
        processSynthesisQueue();
      }
    },
    [processSynthesisQueue]
  );

  // Reset TTS
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
    ...state,
  };
};
