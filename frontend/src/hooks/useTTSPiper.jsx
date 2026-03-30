import { useEffect, useRef, useState } from 'react'
import { TTSLogic, sharedAudioPlayer } from 'speech-to-speech'

/**
 * useTTSPiper - Text-to-Speech hook using Piper TTS via speech-to-speech library
 * Used specifically for English TTS with high-quality voices from Piper models
 * Features automatic model downloading and WASM caching
 */
export function useTTSPiper() {
  const ttsRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState(null)
  const initPromiseRef = useRef(null)

  // Initialize Piper TTS on mount
  useEffect(() => {
    const initializeTTS = async () => {
      try {
        // Configure shared audio player for auto-play queue
        sharedAudioPlayer.configure({ autoPlay: true })
        
        // Initialize TTS with English female voice
        // en_US-hfc_female-medium: Female, natural sounding, medium quality
        ttsRef.current = new TTSLogic({
          voiceId: 'en_US-hfc_female-medium',
          warmUp: true,
          enableWasmCache: true,
        })

        await ttsRef.current.initialize()
        setIsReady(true)
        setError(null)
        console.log('Piper TTS initialized successfully')
      } catch (err) {
        console.error('Failed to initialize Piper TTS:', err)
        setError(err.message)
        setIsReady(false)
      }
    }

    // Store promise to prevent race conditions
    initPromiseRef.current = initializeTTS()
    initializeTTS()

    return () => {
      if (ttsRef.current) {
        ttsRef.current.dispose().catch(err => console.error('Cleanup error:', err))
      }
    }
  }, [])

  /**
   * Speak text using Piper TTS
   * @param {string} text - Text to synthesize
   * @returns {Promise<Blob>} Audio blob (WAV format)
   */
  const speak = async (text) => {
    if (!text || text.trim().length === 0) {
      console.warn('Empty text provided to speak()')
      return null
    }

    if (!ttsRef.current) {
      const errMsg = 'Piper TTS not initialized'
      setError(errMsg)
      throw new Error(errMsg)
    }

    if (!isReady) {
      console.warn('Waiting for Piper TTS to initialize...')
      await initPromiseRef.current
    }

    try {
      setError(null)
      setIsSpeaking(true)

      // Synthesize text to audio
      const result = await ttsRef.current.synthesize(text)

      // Add to shared audio queue (auto-plays if configured)
      sharedAudioPlayer.addAudioIntoQueue(result.audio, result.sampleRate)

      console.log(`Synthesized ${text.length} characters in ${result.duration.toFixed(2)}s`)
      return result.audioBlob
    } catch (err) {
      console.error('TTS synthesis error:', err)
      setError(err.message)
      throw err
    } finally {
      setIsSpeaking(false)
    }
  }

  /**
   * Speak multiple sentences with slight delay between them
   * @param {Array<string>} sentences - Array of sentences to speak
   * @param {number} delayMs - Delay between sentences in milliseconds
   */
  const speakSentences = async (sentences, delayMs = 200) => {
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]
      try {
        await speak(sentence)
        // Wait before next sentence (gives time for synthesis to queue)
        if (i < sentences.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }
      } catch (err) {
        console.error(`Failed to speak sentence ${i}:`, err)
      }
    }
  }

  /**
   * Stop all speech and clear queue
   */
  const stop = async () => {
    try {
      await sharedAudioPlayer.stopAndClearQueue()
      setIsSpeaking(false)
      console.log('Speech stopped and queue cleared')
    } catch (err) {
      console.error('Error stopping speech:', err)
    }
  }

  /**
   * Change voice model
   * @param {string} voiceId - Piper voice ID (e.g., 'en_US-hfc_female-medium')
   */
  const changeVoice = async (voiceId) => {
    try {
      // Dispose old instance
      if (ttsRef.current) {
        await ttsRef.current.dispose()
      }

      // Create new instance with different voice
      ttsRef.current = new TTSLogic({
        voiceId,
        warmUp: true,
        enableWasmCache: true,
      })

      await ttsRef.current.initialize()
      console.log(`Voice changed to: ${voiceId}`)
      setError(null)
    } catch (err) {
      console.error('Failed to change voice:', err)
      setError(err.message)
    }
  }

  return {
    speak,
    speakSentences,
    stop,
    changeVoice,
    isReady,
    isSpeaking,
    error,
  }
}
