// Decides whether to use Piper (on-device WASM) or the browser's Web Speech
// API based on device capability and network conditions. Runs once at startup;
// the choice is fixed for the session.
//
// Rules:
//   1. ?tts=piper or ?tts=webspeech in URL — dev override
//   2. No window.speechSynthesis             → piper (no fallback available)
//   3. iOS                                   → piper (capable devices, better quality)
//   4. deviceMemory < 2 GB                   → webspeech (Piper is too heavy)
//   5. effectiveType in 2g/3g/slow-2g        → webspeech (avoid 60MB model download)
//   6. default                               → piper

export const detectTTSEngine = () => {
    if (typeof window === 'undefined') return 'piper';

    const params = new URLSearchParams(window.location.search);
    const override = params.get('tts');
    if (override === 'piper' || override === 'webspeech') {
        console.log(`[tts] engine override via URL: ${override}`);
        return override;
    }

    if (!window.speechSynthesis) {
        console.log('[tts] no speechSynthesis — falling back to piper');
        return 'piper';
    }

    const ua = navigator.userAgent || '';
    const isIOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
        console.log('[tts] iOS detected — using piper');
        return 'piper';
    }

    if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 2) {
        console.log(`[tts] low RAM (${navigator.deviceMemory}GB) — using webspeech`);
        return 'webspeech';
    }

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && conn.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType)) {
        console.log(`[tts] slow network (${conn.effectiveType}) — using webspeech`);
        return 'webspeech';
    }

    console.log('[tts] capable device + good network — using piper');
    return 'piper';
};
