/**
 * Speech Service - Integrates STT (Web Speech API) and TTS (Piper WASM)
 * This service provides a bridge between React components and voice hooks
 * Used for configuration and global state management
 */

class SpeechService {
  constructor() {
    this.ttsConfig = null;
    this.sttConfig = null;
    this.currentLanguage = 'en-IN';
    this.currentVoiceType = 'english'; // 'english' or 'hindi'
  }

  /**
   * Get TTS configuration for specific voice model
   * @param {string} voiceType - 'hindi' or 'english'
   * @returns {Object} Configuration object for useTTS/useTTSPiper hook
   */
  getTTSConfig(voiceType = 'hindi') {
    const voiceModels = {
      hindi: {
        // Local ONNX model - High-quality (63MB but worth it!)
        type: 'local-onnx',
        voiceModelUrl: '/models/hi_IN-priyamvada-medium.onnx',
        voiceConfigUrl: '/models/hi_IN-priyamvada-medium.json',
        warmupText: 'नमस्ते',
      },
      english: {
        // Piper TTS via speech-to-speech library
        type: 'piper',
        voiceId: 'en_US-hfc_female-medium', // Female, natural, medium quality
        warmupText: 'Hello',
        // Alternative voices available:
        // en_US-hfc_female-medium - Female, natural ✓ DEFAULT
        // en_US-lessac-medium - Neutral, medium
        // en_US-lessac-high - Neutral, high quality (larger)
        // en_US-lessac-low - Neutral, low quality (faster)
      },
    };

    this.currentVoiceType = voiceType;
    this.ttsConfig = voiceModels[voiceType] || voiceModels.english;
    return this.ttsConfig;
  }

  /**
   * Get STT configuration for specific language
   * @param {string} language - Language code like 'en-IN', 'hi-IN'
   * @returns {Object} Configuration object for useSTT hook
   */
  getSTTConfig(language = 'en-IN') {
    this.currentLanguage = language;
    this.sttConfig = {
      lang: language,
      continuous: true,
      silenceTimeout: 2000, // Auto-stop after 2 seconds of silence
    };
    return this.sttConfig;
  }

  /**
   * Check browser support for required APIs
   */
  checkBrowserSupport() {
    const supportsSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const supportsAudioContext = !!(window.AudioContext || window.webkitAudioContext);
    const supportsWorkers = !!window.Worker;
    const supportsCache = !!window.caches;

    return {
      speechRecognition: supportsSpeechRecognition,
      audioContext: supportsAudioContext,
      workers: supportsWorkers,
      cache: supportsCache,
      allSupported: supportsSpeechRecognition && supportsAudioContext && supportsWorkers && supportsCache,
    };
  }

  /**
   * Get current settings
   */
  getSettings() {
    return {
      currentLanguage: this.currentLanguage,
      currentVoiceType: this.currentVoiceType,
      ttsConfig: this.ttsConfig,
      sttConfig: this.sttConfig,
    };
  }

  /**
   * Send speech data for processing (example usage)
   */
  processSpeechInput(text, callbacks = {}) {
    const { onStart, onProcess, onEnd, onError } = callbacks;

    if (!text || text.trim().length === 0) {
      onError?.('Empty text');
      return;
    }

    try {
      onStart?.();
      // Actual processing happens in React components using hooks
      onProcess?.(text);
      onEnd?.();
    } catch (error) {
      console.error('Speech processing error:', error);
      onError?.(error.message);
    }
  }
}

export default new SpeechService();
