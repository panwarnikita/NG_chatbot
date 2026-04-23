// MOBILE TTS OPTIMIZATION: Device detection and network speed detection

export const isMobileDevice = () => {
    // Check user agent for mobile devices
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    return mobileRegex.test(userAgent);
};

export const detectNetworkSpeed = () => {
    // Check if Network Information API is available
    if (!navigator.connection && !navigator.mozConnection && !navigator.webkitConnection) {
        return 'unknown'; // Fallback
    }

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    // Check effective type (4g, 3g, 2g, slow-2g)
    if (connection.effectiveType) {
        return connection.effectiveType;
    }
    
    // Fallback to type if effectiveType is not available
    if (connection.type) {
        return connection.type;
    }

    // Additional check: if connection speed is available
    if (connection.downlink && connection.downlink < 1) {
        return 'slow';
    }

    return 'unknown';
};

export const getPlatform = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
        return 'ios';
    } else if (/android/.test(userAgent)) {
        return 'android';
    } else if (/windows/.test(userAgent)) {
        return 'windows';
    } else if (/mac/.test(userAgent)) {
        return 'macos';
    } else if (/linux/.test(userAgent)) {
        return 'linux';
    }
    
    return 'unknown';
};

export const getDeviceMemory = () => {
    // Check if Device Memory API is available
    if (navigator.deviceMemory) {
        return navigator.deviceMemory; // Returns GB
    }
    return null; // Not available
};

export const getCPUCount = () => {
    // Check if Hardware Concurrency API is available
    if (navigator.hardwareConcurrency) {
        return navigator.hardwareConcurrency;
    }
    return null; // Not available
};

export const checkAudioContextSupport = () => {
    const audioContext = window.AudioContext || window.webkitAudioContext;
    return !!audioContext;
};

export const optimizeForMobile = (config = {}) => {
    const isMobile = isMobileDevice();
    const networkSpeed = detectNetworkSpeed();
    const platform = getPlatform();
    const deviceMemory = getDeviceMemory();
    const cpuCount = getCPUCount();
    
    return {
        isMobile,
        networkSpeed,
        platform,
        deviceMemory,
        cpuCount,
        isLowMemory: deviceMemory && deviceMemory < 4,
        isSlowNetwork: ['slow', '2g', '3g'].includes(networkSpeed),
        supportsAudioContext: checkAudioContextSupport(),
        // Recommended chunk size for mobile
        chunkSize: isMobile ? 10 : 20,
        // Timeout adjustment for slow networks
        initTimeout: ['slow', '2g', '3g'].includes(networkSpeed) ? 40000 : 25000,
        // Buffer size optimization
        bufferSize: isMobile && networkSpeed === 'slow' ? 1 : 3,
        ...config
    };
};
