import { TTSLogic, sharedAudioPlayer } from 'speech-to-speech';

class SpeechService {
  constructor() {
    this.tts = null;
    this.isInitializing = false;
    this.isSpeaking = false;
    this.recognitionRef = null;
  }

  // Initialize TTS (Piper)
  async initTTS() {
    if (this.tts || this.isInitializing) return;

    try {
      this.isInitializing = true;
      
      // Configure shared audio player
      sharedAudioPlayer.configure({
        autoPlay: true,
        volume: 1.0,
      });

      // Initialize Piper TTS
      this.tts = new TTSLogic({
        voiceId: 'en_US-hfc_female-medium', // Default voice
        warmUp: true,
        enableWasmCache: true,
      });

      await this.tts.initialize();
      console.log('TTS initialized successfully');
    } catch (error) {
      console.error('TTS initialization failed:', error);
      this.tts = null;
    } finally {
      this.isInitializing = false;
    }
  }

  // STT using Web Speech API
  startSTT(language = 'en-IN', onResult, onError) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      onError?.('Speech Recognition not supported in your browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      console.log('STT started listening...');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onResult?.(finalTranscript.trim());
        this.recognitionRef = null;
      }
    };

    recognition.onerror = (error) => {
      console.error('STT error:', error);
      onError?.(error.error);
    };

    recognition.onend = () => {
      console.log('STT ended');
      this.recognitionRef = null;
    };

    this.recognitionRef = recognition;
    recognition.start();
  }

  // Stop STT
  stopSTT() {
    if (this.recognitionRef) {
      this.recognitionRef.stop();
      this.recognitionRef = null;
    }
  }

  // TTS - Speak text using Piper
  async speak(text, language = 'en', onStart, onEnd) {
    if (!this.tts) {
      await this.initTTS();
    }

    if (!this.tts) {
      console.error('TTS not initialized');
      return;
    }

    try {
      this.isSpeaking = true;
      onStart?.();

      // Set up audio player callbacks
      sharedAudioPlayer.setPlayingChangeCallback((isPlaying) => {
        if (!isPlaying && this.isSpeaking) {
          this.isSpeaking = false;
          onEnd?.();
        }
      });

      // For long responses, split into sentences
      const sentences = text
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.trim().length > 0);

      // Synthesize and queue audio
      for (const sentence of sentences) {
        try {
          const result = await this.tts.synthesize(sentence);
          sharedAudioPlayer.addAudioIntoQueue(result.audio, result.sampleRate);
        } catch (error) {
          console.error('Error synthesizing sentence:', error);
        }
      }

      // Wait for queue to complete
      await sharedAudioPlayer.waitForQueueCompletion();
      this.isSpeaking = false;
      onEnd?.();
    } catch (error) {
      console.error('TTS error:', error);
      this.isSpeaking = false;
      onEnd?.();
    }
  }

  // Stop speaking
  stopSpeaking() {
    try {
      sharedAudioPlayer.stopAndClearQueue();
      this.isSpeaking = false;
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  }

  // Get speaking status
  getSpeakingStatus() {
    return this.isSpeaking;
  }

  // Change TTS voice
  async changeVoice(voiceId) {
    if (this.tts) {
      try {
        this.stopSpeaking();
        await this.tts.dispose();
        this.tts = null;

        this.tts = new TTSLogic({
          voiceId,
          warmUp: true,
          enableWasmCache: true,
        });

        await this.tts.initialize();
        console.log(`Voice changed to ${voiceId}`);
      } catch (error) {
        console.error('Error changing voice:', error);
      }
    }
  }

  // Cleanup
  async dispose() {
    this.stopSTT();
    this.stopSpeaking();
    
    if (this.tts) {
      try {
        await this.tts.dispose();
      } catch (error) {
        console.error('Error disposing TTS:', error);
      }
    }
    
    this.tts = null;
  }
}

export default new SpeechService();
