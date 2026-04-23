// MOBILE TTS OPTIMIZATION: Audio compression and quality management

/**
 * Optimize audio blob for mobile devices
 * Reduces file size while maintaining acceptable quality
 */
export async function optimizeAudioForMobile(audioBlob) {
    try {
        // Only optimize if blob is large (over 100KB)
        if (audioBlob.size < 100 * 1024) {
            return audioBlob;
        }

        // Use Web Audio API to re-encode audio at lower quality
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            22050 // Reduce sample rate to 22kHz for mobile (from 44.1kHz)
        );

        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start(0);

        const renderedBuffer = await offlineContext.startRendering();
        
        // Convert back to WAV blob
        const wav = bufferToWav(renderedBuffer);
        return new Blob([wav], { type: 'audio/wav' });
    } catch (error) {
        console.warn('[Audio] Optimization failed, using original:', error);
        return audioBlob;
    }
}

/**
 * Convert AudioBuffer to WAV format
 * Helps with mobile compatibility
 */
function bufferToWav(audioBuffer) {
    const length = audioBuffer.length * audioBuffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels = [];
    let offset = 0;

    // WAV Header
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(offset, 'RIFF');
    offset += 4;
    view.setUint32(offset, 36 + audioBuffer.length * 2, true);
    offset += 4;
    writeString(offset, 'WAVE');
    offset += 4;
    writeString(offset, 'fmt ');
    offset += 4;
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, audioBuffer.numberOfChannels, true);
    offset += 2;
    view.setUint32(offset, audioBuffer.sampleRate, true);
    offset += 4;
    view.setUint32(offset, audioBuffer.sampleRate * 2, true);
    offset += 4;
    view.setUint16(offset, audioBuffer.numberOfChannels * 2, true);
    offset += 2;
    view.setUint16(offset, 16, true);
    offset += 2;
    writeString(offset, 'data');
    offset += 4;
    view.setUint32(offset, audioBuffer.length * 2, true);
    offset += 4;

    // Audio Data
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channels.push(audioBuffer.getChannelData(i));
    }

    let index = 0;
    const volume = 0.8; // Reduce volume slightly for safety
    while (offset < arrayBuffer.byteLength) {
        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            const s = Math.max(-1, Math.min(1, channels[i][index]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }
        index++;
    }

    return arrayBuffer;
}

/**
 * Create a memory-efficient audio queue for mobile
 * Limits queue size to prevent memory bloat
 */
export class MobileAudioQueue {
    constructor(maxQueueSize = 3) {
        this.queue = [];
        this.maxQueueSize = maxQueueSize;
        this.totalSize = 0;
        this.maxTotalSize = 10 * 1024 * 1024; // 10MB max
    }

    async add(audioBlob) {
        // Optimize audio before adding to queue
        const optimized = await optimizeAudioForMobile(audioBlob);
        
        // Check if adding this would exceed limits
        if (this.queue.length >= this.maxQueueSize || 
            this.totalSize + optimized.size > this.maxTotalSize) {
            // Remove oldest item if queue is full
            if (this.queue.length > 0) {
                const removed = this.queue.shift();
                this.totalSize -= removed.size;
            }
        }

        this.queue.push(optimized);
        this.totalSize += optimized.size;
        
        console.log(`[Audio Queue] Size: ${this.queue.length}, Total: ${Math.round(this.totalSize / 1024)}KB`);
    }

    get(index) {
        return this.queue[index] || null;
    }

    remove(index) {
        if (index >= 0 && index < this.queue.length) {
            const removed = this.queue.splice(index, 1)[0];
            this.totalSize -= removed.size;
        }
    }

    clear() {
        this.queue = [];
        this.totalSize = 0;
    }

    size() {
        return this.queue.length;
    }

    isEmpty() {
        return this.queue.length === 0;
    }

    getMemoryUsage() {
        return {
            items: this.queue.length,
            bytes: this.totalSize,
            KB: Math.round(this.totalSize / 1024),
            MB: Math.round(this.totalSize / (1024 * 1024))
        };
    }
}

/**
 * Detect if user is on a slow mobile network
 * Helps decide whether to use lower quality TTS
 */
export function shouldUseReducedQuality() {
    if (!navigator.connection) return false;
    
    const connection = navigator.connection;
    const effectiveType = connection.effectiveType;
    
    return effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
}

/**
 * Preload audio for better performance on mobile
 */
export async function preloadAudio(url) {
    try {
        const response = await fetch(url);
        const audioBlob = await response.blob();
        
        // Create object URL for faster playback
        const objectUrl = URL.createObjectURL(audioBlob);
        
        // Pre-decode audio in audio context for faster playback
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        return {
            objectUrl,
            audioBuffer,
            blob: audioBlob
        };
    } catch (error) {
        console.warn('[Audio] Preload failed:', error);
        return null;
    }
}
