let audioContext = null;
let audioQueue = [];
let isPlaying = false;
let nextPlayTime = 0;

// Initialize context on first user interaction for Mobile Chrome/Safari
export const initTTSAudioContext = () => {
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

// Enqueues audio chunks and plays them back-to-back smoothly
export const playAudioChunk = async (arrayBuffer) => {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) return;
  
  const ctx = initTTSAudioContext();
  
  try {
    // Copy buffer for Safari compatibility
    const bufferCopy = arrayBuffer.slice(0);
    const decodedAudio = await ctx.decodeAudioData(bufferCopy);
    
    audioQueue.push(decodedAudio);
    
    if (!isPlaying) {
      playNextInQueue();
    }
  } catch (error) {
    console.warn("Mobile audio decode error (chunk skipped):", error);
  }
};

const playNextInQueue = () => {
  if (audioQueue.length === 0) {
    isPlaying = false;
    return;
  }

  isPlaying = true;
  const ctx = initTTSAudioContext();
  const bufferInfo = audioQueue.shift();
  const source = ctx.createBufferSource();
  
  source.buffer = bufferInfo;
  source.connect(ctx.destination);

  // If we fell behind, start immediately with a tiny buffer
  let startTime = Math.max(ctx.currentTime + 0.05, nextPlayTime);
  
  source.start(startTime);
  nextPlayTime = startTime + bufferInfo.duration;

  source.onended = () => {
    // Check if we have more in queue to keep playing smoothly
    if (audioQueue.length > 0) {
      playNextInQueue();
    } else {
      isPlaying = false;
      // Reset nextPlayTime so next message starts instantly
      nextPlayTime = 0; 
    }
  };
};

export const stopMobileAudio = () => {
  audioQueue = [];
  isPlaying = false;
  nextPlayTime = 0;
  if (audioContext && audioContext.state !== 'closed') {
    // Create new context to immediately kill current buffer playback
    audioContext.close();
    audioContext = null;
  }
};
