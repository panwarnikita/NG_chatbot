import { useState, useEffect, useRef, useCallback } from 'react';
import { getCachedOrFetch } from '../utils/modelCache';

export const usePiper = (config) => {
    // TypeScript types (<PiperState>) hata diye hain
    const [state, setState] = useState({
        isReady: false,
        isLoading: false,
        error: null,
        downloadProgress: null
    });
    const [isPlaying, setIsPlaying] = useState(false);

    // New: Active Sentence Index State
    const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState(null);
    const playbackCounterRef = useRef(0);

    const audioQueueRef = useRef([]);
    const synthesisQueueRef = useRef([]);
    const processingRef = useRef(false);
    const isSynthesizingRef = useRef(false);

    const workerRef = useRef(null);

    useEffect(() => {
        if (!config || !config.voiceModelUrl || !config.voiceConfigUrl) return;

        let active = true;
        const blobUrls = [];

        const initPiper = async () => {
            setState(s => ({ ...s, isReady: false, isLoading: true, error: null, downloadProgress: { loaded: 0, total: 100 } })); 

            try {
                // 1. Fetch/Cache Model & Config
                console.log("Fetching/Caching Model:", config.voiceModelUrl);
                const modelBlob = await getCachedOrFetch(config.voiceModelUrl, (loaded, total) => {
                    if (active) setState(s => ({ ...s, downloadProgress: { loaded, total } }));
                });
                console.log("Fetching/Caching Config:", config.voiceConfigUrl);
                const configBlob = await getCachedOrFetch(config.voiceConfigUrl);

                if (!active) return;

                // 2. Create Object URLs
                const modelUrl = URL.createObjectURL(modelBlob);
                const configUrl = URL.createObjectURL(configBlob);
                blobUrls.push(modelUrl, configUrl);

                // 3. Initialize Worker
                const workerUrl = '/piper-wasm/piper_worker.js';
                const worker = new Worker(workerUrl);
                workerRef.current = worker;

                const handleInit = (event) => {
                    const data = event.data;
                    if (data.kind === 'output') {
                        console.log("Piper warmup complete");
                        if (active) setState(s => ({ ...s, isReady: true, isLoading: false, downloadProgress: null }));
                        worker.removeEventListener('message', handleInit);
                    } else if (data.kind === 'stderr') {
                        console.log("Piper Log:", data.message); 
                    }
                };

                worker.addEventListener('message', handleInit);

                worker.postMessage({
                    kind: 'init',
                    input: config.warmupText || 'Warmup',
                    modelUrl: modelUrl,
                    modelConfigUrl: configUrl,
                    piperPhonemizeJsUrl: '/piper-wasm/piper_phonemize.js',
                    piperPhonemizeWasmUrl: '/piper-wasm/piper_phonemize.wasm',
                    piperPhonemizeDataUrl: '/piper-wasm/piper_phonemize.data',
                    // onnxruntimeUrl: window.location.origin + '/',
                    onnxruntimeUrl: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/',
                    blobs: {},
                });

            } catch (err) {
                console.error("Failed to start Piper worker", err);
                if (active) setState(s => ({ ...s, isReady: false, isLoading: false, error: err.message || "Failed to start" }));
            }
        };

        initPiper();

        return () => {
            active = false;
            workerRef.current?.terminate();
            workerRef.current = null;
            blobUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [config?.voiceModelUrl, config?.voiceConfigUrl, config?.warmupText]);


    // Helper: Synthesize a single sentence
    const synthesize = useCallback(async (text) => {
        if (!workerRef.current) throw new Error("Worker not initialized");

        return new Promise((resolve) => {
            const worker = workerRef.current;

            const handleMessage = (event) => {
                const data = event.data;
                if (data.kind === 'output') {
                    worker.removeEventListener('message', handleMessage);
                    resolve(data.file);
                } else if (data.kind === 'stderr') {
                    console.log("Piper Log:", data.message);
                }
            };

            worker.addEventListener('message', handleMessage);

            worker.postMessage({
                kind: 'generate',
                input: text,
                modelUrl: config?.voiceModelUrl,
                modelConfigUrl: config?.voiceConfigUrl,
                piperPhonemizeJsUrl: '/piper-wasm/piper_phonemize.js',
                piperPhonemizeWasmUrl: '/piper-wasm/piper_phonemize.wasm',
                piperPhonemizeDataUrl: '/piper-wasm/piper_phonemize.data',
                onnxruntimeUrl: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/',
                blobs: {},
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
                    const audio = new Audio(URL.createObjectURL(blob));
                    audio.onended = () => resolve();
                    audio.onerror = (e) => {
                        console.error("Audio playback error", e);
                        resolve();
                    };
                    audio.play().catch(e => {
                        console.error("Playback failed check", e);
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
                        console.log("Synthesizing text:", text);
                        const startTime = performance.now();
                        const blob = await synthesize(text);
                        const endTime = performance.now();
                        console.log(`Time to synthesize: ${(endTime - startTime).toFixed(2)}ms for sentence: "${text}"`);
                        console.log("Blob received:", blob);
                        audioQueueRef.current.push(blob);
                        console.log("Audio queue length:", audioQueueRef.current.length);
                        if (!processingRef.current) {
                            console.log("Starting playQueue");
                            playQueue();
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
    const speak = useCallback(async (text) => {
        if (text.trim()) {
            synthesisQueueRef.current.push(text.trim());
            processSynthesisQueue();
        }
    }, [processSynthesisQueue]);

    // New: Reset Logic
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