// src/utils/modelCache.js
// MOBILE TTS OPTIMIZATION: Enhanced caching with mobile network detection

import { detectNetworkSpeed, isMobileDevice } from './deviceDetector';

// Cache timeout configuration
const CACHE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// MOBILE OPTIMIZATION: Implement aggressive caching for mobile devices
const getCacheStore = async (isMobile = false) => {
    try {
        // Use standard caches API
        const caches_store = await caches.open(`piper-models-${isMobile ? 'mobile' : 'desktop'}`);
        return caches_store;
    } catch (error) {
        console.warn('[Cache] Failed to open cache:', error);
        return null;
    }
};

// MOBILE OPTIMIZATION: Check if cached response is still fresh
const isCacheFresh = (response) => {
    if (!response) return false;
    
    const cacheTime = response.headers.get('X-Cache-Time');
    if (!cacheTime) return true; // If no cache time, assume fresh
    
    const now = new Date().getTime();
    return (now - parseInt(cacheTime)) < CACHE_TIMEOUT;
};

export async function getCachedOrFetch(url, onProgress) {
    const isMobile = isMobileDevice();
    const networkSpeed = detectNetworkSpeed();
    
    try {
        const cache = await getCacheStore(isMobile);
        if (!cache) throw new Error('Cache store unavailable');
        
        const cachedResponse = await cache.match(url);
        
        if (cachedResponse && isCacheFresh(cachedResponse)) {
            console.log(`%c[Cache] Loading from storage: ${url}`, "color: #00ff00");
            return await cachedResponse.blob();
        }
    } catch (error) {
        console.warn('[Cache] Cache lookup failed:', error);
    }

    console.log(`%c[Network] Downloading model: ${url}`, "color: #ffaa00");
    console.log(`%c[Network Speed] ${networkSpeed}`, "color: #0099ff");

    try {
        const response = await fetch(url, {
            // MOBILE OPTIMIZATION: Abort if timeout on slow networks
            signal: AbortSignal.timeout(networkSpeed === 'slow' ? 120000 : 60000)
        });
        
        if (!response.ok) throw new Error(`Failed to fetch model: ${response.statusText}`);

        // Progress tracking logic
        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length');
        let receivedLength = 0;
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedLength += value.length;
            if (onProgress) {
                onProgress(receivedLength, contentLength);
            }
        }

        const blob = new Blob(chunks);
        
        // MOBILE OPTIMIZATION: Cache with timestamp for freshness validation
        try {
            const cache = await getCacheStore(isMobile);
            if (cache) {
                // Create response with cache timestamp header
                const responseWithTimestamp = new Response(blob, {
                    headers: {
                        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
                        'X-Cache-Time': new Date().getTime().toString()
                    }
                });
                await cache.put(url, responseWithTimestamp);
            }
        } catch (cacheError) {
            console.warn('[Cache] Failed to save to cache:', cacheError);
        }
        
        return blob;
    } catch (error) {
        // MOBILE OPTIMIZATION: Provide better error messages for mobile
        if (error.name === 'AbortError') {
            throw new Error(`Download timeout - Network too slow. Check your connection.`);
        }
        throw error;
    }
}

// MOBILE OPTIMIZATION: Clear old cache entries
export async function cleanupOldCache() {
    try {
        const cacheNames = await caches.keys();
        const now = new Date().getTime();
        
        for (const cacheName of cacheNames) {
            if (cacheName.startsWith('piper-models-')) {
                const cache = await caches.open(cacheName);
                const keys = await cache.keys();
                
                for (const request of keys) {
                    const response = await cache.match(request);
                    const cacheTime = response.headers.get('X-Cache-Time');
                    
                    if (cacheTime && (now - parseInt(cacheTime)) > CACHE_TIMEOUT) {
                        await cache.delete(request);
                        console.log('[Cache] Removed stale cache:', request.url);
                    }
                }
            }
        }
    } catch (error) {
        console.warn('[Cache] Cleanup failed:', error);
    }
}