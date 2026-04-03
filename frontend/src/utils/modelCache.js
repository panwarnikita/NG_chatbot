// src/utils/modelCache.js

export async function getCachedOrFetch(url, onProgress) {
  const cache = await caches.open('piper-models');
  const cachedResponse = await cache.match(url);

  if (cachedResponse) {
    console.log(`%c[Cache] Loading from storage: ${url}`, "color: #00ff00");
    return await cachedResponse.blob();
  }

  console.log(`%c[Network] Downloading model: ${url}`, "color: #ffaa00");
  const response = await fetch(url);
  
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
  // Save to cache for next time
  await cache.put(url, new Response(blob));
  
  return blob;
}