// Plays a pre-baked audio clip from /audio/{key}_{lang}.wav.
// Returns a promise that resolves when playback ends and rejects if the
// file is missing / browser blocks autoplay — callers should fall back to
// live Piper TTS in that case.

const activeAudioRef = { current: null };

export const playCachedAudio = (key, language) => {
  return new Promise((resolve, reject) => {
    const url = `/audio/${key}_${language}.wav`;
    const audio = new Audio(url);
    activeAudioRef.current = audio;

    audio.onended = () => {
      if (activeAudioRef.current === audio) activeAudioRef.current = null;
      resolve();
    };
    audio.onerror = () => {
      if (activeAudioRef.current === audio) activeAudioRef.current = null;
      reject(new Error(`cached audio failed: ${url}`));
    };
    audio.play().catch((e) => {
      if (activeAudioRef.current === audio) activeAudioRef.current = null;
      reject(e);
    });
  });
};

export const stopCachedAudio = () => {
  const audio = activeAudioRef.current;
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    activeAudioRef.current = null;
  }
};
