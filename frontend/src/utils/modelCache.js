export const CACHE_NAME = 'piper-models-cache-v1';

/**
 * Fetches a resource and caches it using the Cache API
 * If already cached, returns from cache immediately
 * Supports progress tracking for large downloads
 */
export async function getCachedOrFetch(url, progressCallback) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(url);

    if (cachedResponse) {
      console.log(`[Cache] Hit for ${url}`);
      return cachedResponse.blob();
    }

    console.log(`[Cache] Miss for ${url}, downloading...`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    let validResponse = response.clone();

    if (progressCallback && response.body) {
      const reader = response.body.getReader();
      const stream = new ReadableStream({
        async start(controller) {
          let loaded = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            loaded += value.byteLength;
            progressCallback(loaded, total);
            controller.enqueue(value);
          }
          controller.close();
        },
      });
      validResponse = new Response(stream, response);
    }

    const blob = await validResponse.blob();
    await cache.put(url, new Response(blob));
    return blob;
  } catch (error) {
    console.error('Cache Error:', error);
    throw error;
  }
}
