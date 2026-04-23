// MOBILE TTS OPTIMIZATION: Configuration constants

export const MOBILE_CONFIG = {
    // Network timeouts
    FETCH_TIMEOUT_FAST: 60000,        // 60s for 4G/WiFi
    FETCH_TIMEOUT_SLOW: 120000,       // 120s for 3G/2G
    INIT_TIMEOUT_FAST: 25000,         // 25s for 4G/WiFi
    INIT_TIMEOUT_SLOW: 40000,         // 40s for 3G/2G

    // TTS optimization
    WORD_THRESHOLD_MOBILE: 3,         // Stream TTS after 3 words on mobile
    WORD_THRESHOLD_DESKTOP: 5,        // Stream TTS after 5 words on desktop
    
    // Response optimization
    MAX_TOKENS_MOBILE: 250,           // Shorter responses for mobile
    MAX_TOKENS_DESKTOP: 400,          // Full responses for desktop
    
    // RAG optimization
    RAG_TOP_K_MOBILE: 3,              // Fewer docs for mobile (faster)
    RAG_TOP_K_DESKTOP: 5,             // More docs for desktop
    RAG_MAX_CONTEXT_MOBILE: 2000,     // Smaller context for mobile
    RAG_MAX_CONTEXT_DESKTOP: 4000,    // Full context for desktop

    // Audio optimization
    AUDIO_SAMPLE_RATE_MOBILE: 22050,  // 22kHz for mobile (saves bandwidth)
    AUDIO_SAMPLE_RATE_DESKTOP: 44100, // 44.1kHz for desktop
    MAX_AUDIO_QUEUE_SIZE: 3,          // Max audio clips in queue
    MAX_AUDIO_MEMORY: 10 * 1024 * 1024, // 10MB max audio memory

    // Cache settings
    CACHE_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    
    // Device detection
    MOBILE_REGEX: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i,
    
    // Feature detection
    FEATURES: {
        SERVICE_WORKER: 'serviceWorker' in navigator,
        CACHE_API: 'caches' in window,
        AUDIO_CONTEXT: 'AudioContext' in window || 'webkitAudioContext' in window,
        NETWORK_INFO: 'connection' in navigator,
        DEVICE_MEMORY: 'deviceMemory' in navigator,
        CPU_COUNT: 'hardwareConcurrency' in navigator,
    }
};

// Network speed thresholds
export const NETWORK_SPEED_THRESHOLDS = {
    'slow-2g': { priority: 4, downlink: 0.4 },
    '2g': { priority: 3, downlink: 0.4 },
    '3g': { priority: 2, downlink: 1.6 },
    '4g': { priority: 1, downlink: 10 },
    'wifi': { priority: 0, downlink: 50 }
};

// Platform-specific configurations
export const PLATFORM_CONFIG = {
    ios: {
        supportsSpeaker: false,  // iOS has stricter audio output controls
        supportsAutoplay: false, // Requires user gesture
        audioFormat: 'wav',
        bufferSize: 1024,
    },
    android: {
        supportsSpeaker: true,
        supportsAutoplay: true,
        audioFormat: 'wav',
        bufferSize: 2048,
    },
    desktop: {
        supportsSpeaker: true,
        supportsAutoplay: true,
        audioFormat: 'wav',
        bufferSize: 4096,
    }
};

// Quality presets for different network conditions
export const QUALITY_PRESETS = {
    LOW: {
        audioQuality: 'low',
        sampleRate: 22050,
        bitrate: 64,
        wordThreshold: 2,
        maxTokens: 200
    },
    MEDIUM: {
        audioQuality: 'medium',
        sampleRate: 22050,
        bitrate: 128,
        wordThreshold: 3,
        maxTokens: 250
    },
    HIGH: {
        audioQuality: 'high',
        sampleRate: 44100,
        bitrate: 256,
        wordThreshold: 5,
        maxTokens: 400
    }
};

// Error messages for mobile
export const MOBILE_ERROR_MESSAGES = {
    NETWORK_TIMEOUT: 'Connection timeout. Check your internet and try again.',
    SLOW_NETWORK: 'Your network is slow. Please wait...',
    NO_AUDIO_SUPPORT: 'Your device does not support audio playback.',
    WORKER_INIT_FAILED: 'Failed to initialize voice. Trying again...',
    FETCH_FAILED: 'Failed to fetch response. Check your connection.',
    CACHE_FAILED: 'Cache error. Using direct download.',
};

// Debug flags
export const DEBUG = {
    ENABLED: false,
    LOG_NETWORK_SPEED: false,
    LOG_DEVICE_INFO: false,
    LOG_AUDIO_QUEUE: false,
    LOG_CACHE_OPERATIONS: false,
};

export default MOBILE_CONFIG;
