import { useState, useEffect, useRef, useCallback } from 'react';
import { getCachedOrFetch } from '../utils/modelCache';

// 1 worker with full CPU threads is faster per-chunk than 2 workers splitting
// them. Multi-worker pools on hwConcurrency-threaded ORT oversubscribe the
// CPU and slow every inference ~3×, which balloons first-audio latency far
// beyond any gain from parallel chunks. Keep at 1 unless you also rework the
// worker to cap numThreads per instance.
const POOL_SIZE = 1;

export const usePiper = (config) => {
    const [state, setState] = useState({
        isReady: false,
        isLoading: false,
        error: null,
        downloadProgress: null
    });
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState(null);

    // Playback-side refs (stable across config changes)
    const playbackCounterRef = useRef(0);
    const audioQueueRef = useRef([]);
    const processingRef = useRef(false);
    const lastPlayEndRef = useRef(null);

    // Synthesis-side refs (reset when config reloads or resetTTS() is called)
    const workerPoolRef = useRef([]);           // [{ worker, id, ready, busy, currentJob }]
    const synthesisQueueRef = useRef([]);       // [{ seq, gen, text }]
    const pendingBlobsRef = useRef({});         // seq -> blob, drained in order
    const submitSeqRef = useRef(0);
    const nextOutSeqRef = useRef(0);
    const resetGenRef = useRef(0);

    // Bridges so speak()/resetTTS() can call into closures defined inside useEffect
    const speakRef = useRef(() => {});
    const resetTTSRef = useRef(() => {});

    const playQueue = useCallback(async () => {
        if (processingRef.current) return;
        processingRef.current = true;
        setIsPlaying(true);
        try {
            while (audioQueueRef.current.length > 0) {
                const blob = audioQueueRef.current.shift();
                if (!blob) break;
                setCurrentlyPlayingIndex(playbackCounterRef.current);
                const playStart = performance.now();
                const gap = lastPlayEndRef.current == null
                    ? 'n/a'
                    : `${(playStart - lastPlayEndRef.current).toFixed(0)}ms`;
                await new Promise((resolve) => {
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
                    audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
                    audio.play().catch(resolve);
                });
                const playEnd = performance.now();
                lastPlayEndRef.current = playEnd;
                console.log(`[tts] play=${(playEnd - playStart).toFixed(0)}ms gap_before=${gap}`);
                playbackCounterRef.current += 1;
            }
        } finally {
            processingRef.current = false;
            setIsPlaying(false);
            setCurrentlyPlayingIndex(null);
        }
    }, []);

    useEffect(() => {
        if (!config || !config.voiceModelUrl || !config.voiceConfigUrl) return;

        let active = true;
        let firstReadyAnnounced = false;
        let initTimeoutId = null;

        // Reset synthesis-side state on config change
        workerPoolRef.current = [];
        synthesisQueueRef.current = [];
        pendingBlobsRef.current = {};
        submitSeqRef.current = 0;
        nextOutSeqRef.current = 0;
        resetGenRef.current = 0;

        setState(s => ({ ...s, isReady: false, isLoading: true, error: null }));

        const modelUrl = config.voiceModelUrl;
        const configUrl = config.voiceConfigUrl;

        const genMessage = (text) => ({
            kind: 'generate',
            input: text,
            modelUrl,
            modelConfigUrl: configUrl,
            piperPhonemizeJsUrl: '/piper-wasm/piper_phonemize.js',
            piperPhonemizeWasmUrl: '/piper-wasm/piper_phonemize.wasm',
            piperPhonemizeDataUrl: '/piper-wasm/piper_phonemize.data',
            onnxruntimeUrl: '/piper-wasm/dist/',
            blobs: { "ort-wasm-simd-threaded.wasm": true },
        });

        const initMessage = () => ({
            kind: 'init',
            input: config.warmupText || 'नमस्ते',
            modelUrl,
            modelConfigUrl: configUrl,
            piperPhonemizeJsUrl: '/piper-wasm/piper_phonemize.js',
            piperPhonemizeWasmUrl: '/piper-wasm/piper_phonemize.wasm',
            piperPhonemizeDataUrl: '/piper-wasm/piper_phonemize.data',
            onnxruntimeUrl: '/piper-wasm/dist/',
            blobs: { "ort-wasm-simd-threaded.wasm": true },
        });

        const drainInOrder = () => {
            while (pendingBlobsRef.current[nextOutSeqRef.current] !== undefined) {
                audioQueueRef.current.push(pendingBlobsRef.current[nextOutSeqRef.current]);
                delete pendingBlobsRef.current[nextOutSeqRef.current];
                nextOutSeqRef.current += 1;
            }
            if (!processingRef.current && audioQueueRef.current.length > 0) {
                playQueue();
            }
        };

        const schedule = () => {
            for (const item of workerPoolRef.current) {
                if (synthesisQueueRef.current.length === 0) return;
                if (!item.ready || item.busy) continue;
                const job = synthesisQueueRef.current.shift();
                item.busy = true;
                item.currentJob = { ...job, t0: performance.now() };
                item.worker.postMessage(genMessage(job.text));
            }
        };

        const createPoolItem = (id) => {
            const worker = new Worker('/piper-wasm/piper_worker.js');
            const item = { worker, id, ready: false, busy: false, currentJob: null };

            worker.onmessage = (event) => {
                if (event.data.kind === 'output') {
                    if (!item.ready) {
                        // Warmup 'output' — worker is now ready
                        item.ready = true;
                        console.log(`✅ Piper worker ${id} ready`);
                        if (!firstReadyAnnounced && active) {
                            firstReadyAnnounced = true;
                            if (initTimeoutId) { clearTimeout(initTimeoutId); initTimeoutId = null; }
                            setState(s => ({ ...s, isReady: true, isLoading: false, downloadProgress: null }));
                        }
                        schedule();
                        return;
                    }

                    // Generate 'output' — an in-flight job completed
                    const job = item.currentJob;
                    item.currentJob = null;
                    item.busy = false;

                    if (!job) {
                        schedule();
                        return;
                    }

                    const synthMs = (performance.now() - job.t0).toFixed(0);

                    // Drop stale output from a previous generation (pre-reset)
                    if (job.gen !== resetGenRef.current) {
                        schedule();
                        return;
                    }

                    const preview = job.text.length > 40 ? job.text.slice(0, 40) + '…' : job.text;
                    console.log(`[tts] synth=${synthMs}ms w=${id} "${preview}"`);

                    pendingBlobsRef.current[job.seq] = event.data.file;
                    drainInOrder();
                    schedule();
                } else if (event.data.kind === 'stderr') {
                    if (typeof event.data.message === 'string' && event.data.message.toLowerCase().includes('error')) {
                        console.error(`Piper worker ${id} stderr error:`, event.data.message);
                        if (!firstReadyAnnounced && active) {
                            if (initTimeoutId) { clearTimeout(initTimeoutId); initTimeoutId = null; }
                            setState(s => ({ ...s, isReady: false, isLoading: false, error: event.data.message }));
                        }
                    }
                }
            };

            worker.onerror = (err) => {
                console.error(`❌ Piper worker ${id} error:`, {
                    message: err?.message, filename: err?.filename,
                    lineno: err?.lineno, colno: err?.colno, type: err?.type
                });
                item.ready = false;
                item.busy = false;
                item.currentJob = null;
                if (!firstReadyAnnounced && active) {
                    if (initTimeoutId) { clearTimeout(initTimeoutId); initTimeoutId = null; }
                    setState(s => ({ ...s, isReady: false, isLoading: false, error: err?.message || 'Worker error' }));
                }
            };

            worker.onmessageerror = (err) => {
                console.error(`❌ Piper worker ${id} message error:`, err);
            };

            worker.postMessage(initMessage());
            return item;
        };

        const boot = async () => {
            try {
                // Prime the Cache API so both workers load the ONNX from storage
                await getCachedOrFetch(modelUrl, (loaded, total) => {
                    if (active) setState(s => ({ ...s, downloadProgress: { loaded, total } }));
                });
                await getCachedOrFetch(configUrl);
                if (!active) return;

                // Timeout only gates the FIRST worker coming up (enough for TTS to start).
                initTimeoutId = setTimeout(() => {
                    if (!active || firstReadyAnnounced) return;
                    setState(s => ({
                        ...s, isLoading: false, isReady: false,
                        error: 'Piper init timeout.'
                    }));
                }, 25000);

                // Spin up worker 0 immediately, worker 1 ~100ms later to avoid
                // both racing for the same model XHR on a cold cache.
                workerPoolRef.current.push(createPoolItem(0));
                setTimeout(() => {
                    if (active && workerPoolRef.current.length < POOL_SIZE) {
                        workerPoolRef.current.push(createPoolItem(1));
                    }
                }, 100);
            } catch (err) {
                console.error("❌ Failed to start Piper pool", err);
                if (active) setState(s => ({ ...s, isReady: false, isLoading: false, error: err.message }));
            }
        };

        boot();

        speakRef.current = (text) => {
            if (!text || !text.trim()) return;
            const trimmed = text.trim();
            const seq = submitSeqRef.current++;
            const gen = resetGenRef.current;
            synthesisQueueRef.current.push({ seq, gen, text: trimmed });
            schedule();
        };

        resetTTSRef.current = () => {
            audioQueueRef.current = [];
            synthesisQueueRef.current = [];
            pendingBlobsRef.current = {};
            submitSeqRef.current = 0;
            nextOutSeqRef.current = 0;
            resetGenRef.current += 1;
            playbackCounterRef.current = 0;
            lastPlayEndRef.current = null;
            // In-flight jobs stay in-flight; their 'output' will be dropped as
            // stale when they return, freeing the worker for the next job.
            setCurrentlyPlayingIndex(null);
            setIsPlaying(false);
        };

        return () => {
            active = false;
            if (initTimeoutId) clearTimeout(initTimeoutId);
            workerPoolRef.current.forEach(item => item.worker.terminate());
            workerPoolRef.current = [];
            speakRef.current = () => {};
            resetTTSRef.current = () => {};
        };
    }, [config?.voiceModelUrl, config?.voiceConfigUrl, config?.warmupText, playQueue]);

    const speak = useCallback((text) => speakRef.current(text), []);
    const resetTTS = useCallback(() => resetTTSRef.current(), []);

    return { speak, isPlaying, currentlyPlayingIndex, resetTTS, ...state };
};
