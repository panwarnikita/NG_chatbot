import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import { FiMic, FiGlobe, FiChevronLeft, FiCheckCircle, FiVolume2, FiPause } from 'react-icons/fi';
import { IoSend } from 'react-icons/io5';
import { usePiper } from './hooks/text-to-speech_hook';
import { TTSLogic, sharedAudioPlayer, cleanTextForTTS } from "speech-to-speech";


// --- Translations & Content ---
const translations = {
  en: {
    navGurukul: 'NavGurukul AI ✨', hiGuest: "Hi, I'm NavGurukul AI", selectRole: 'Please select your role to continue.', 
    startBtn: 'Start Chatting', loading: 'Loading Voices...', back: 'Back', 
    student: 'Student', studentDesc: 'Simple, clear and step-by-step admission help.',
    parent: 'Parent', parentDesc: 'Safety, eligibility and outcomes with trust-focused guidance.',
    partner: 'Partner', partnerDesc: 'Professional info for NGO, government and teachers.',
    testMic: 'Test Microphone', testSpk: 'Test Speaker', micOk: 'Mic Access Granted', spkOk: 'Sound Working?',
    askAnything: 'Ask AI anything...',
    quickPrompt1: 'What is NavGurukul?',
    quickPrompt2: 'Tell me about Admission Process',
    quickPrompt3: 'Tell me about Schools in NavGurukul',
    quickPrompt4: 'show me success stories'
  },
  hi: {
    navGurukul: 'NavGurukul AI ✨', hiGuest: 'नमस्ते, मैं NavGurukul AI हूँ', selectRole: 'जारी रखने के लिए कृपया अपनी भूमिका चुनें।',
    startBtn: 'बातचीत शुरू करें', loading: 'आवाज़ें लोड हो रही हैं...', back: 'पीछे', 
    student: 'छात्र', studentDesc: 'सरल, स्पष्ट और चरण-दर-चरण प्रवेश सहायता।',
    parent: 'माता-पिता', parentDesc: 'सुरक्षा, पात्रता और विश्वास-केंद्रित मार्गदर्शन।',
    partner: 'भागीदार', partnerDesc: 'एनजीओ, सरकार और शिक्षकों के लिए पेशेवर जानकारी।',
    testMic: 'माइक टेस्ट करें', testSpk: 'स्पीकर टेस्ट करें', micOk: 'माइक चालू है', spkOk: 'आवाज़ आई?',
    askAnything: 'AI से कुछ भी पूछें...',
    quickPrompt1: 'NavGurukul क्या है?',
    quickPrompt2: 'प्रवेश प्रक्रिया बताएं',
    quickPrompt3: 'NavGurukul में स्कूलों के बारे में बताएं',
    quickPrompt4: 'मुझे सफलता के कहानियाँ दिखाएं'
  }
};

export default function App() {
  const [appStage, setAppStage] = useState('selection'); 
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('en'); 
  const [micTested, setMicTested] = useState(false);
  const [isEnglishTTSPlaying, setIsEnglishTTSPlaying] = useState(false);

  const chatRef = useRef(null);
  const englishTTSRef = useRef(null);
  const [isEnglishTTSReady, setIsEnglishTTSReady] = useState(false);
  const t = translations[language];

  // --- TTS Hook Config ---
  const piperConfig = useMemo(() => ({
    voiceModelUrl: '/models/hi_IN-priyamvada-medium.onnx',
    voiceConfigUrl: '/models/hi_IN-priyamvada-medium.json',
    warmupText: ''
  }), []);

  const { speak, isReady, isPlaying: isTTSPlaying, resetTTS, isLoading: isModelLoading } = usePiper(piperConfig);

  // --- Initialize English TTS when stage is Setup ---
  useEffect(() => {
    if (appStage === 'setup' && language === 'en') {
      const initEn = async () => {
        try {
          sharedAudioPlayer.configure({ autoPlay: true });
          const tts = new TTSLogic({ voiceId: "en_US-hfc_female-medium" });
          await tts.initialize();
          englishTTSRef.current = tts;
          setIsEnglishTTSReady(true);
        } catch (e) { console.error("English TTS Error:", e); }
      };
      initEn();
    }
  }, [appStage, language]);

  // --- Auto Scroll Chat ---
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // --- Speak Logic ---
  const speakText = async (text) => {
    if (language === 'en' && isEnglishTTSReady) {
      setIsEnglishTTSPlaying(true);
      const sentences = cleanTextForTTS(text).split(/(?<=[.!?।])\s+/);
      for (const s of sentences) {
        const res = await englishTTSRef.current.synthesize(s);
        sharedAudioPlayer.addAudioIntoQueue(res.audio, res.sampleRate);
      }
      // Set a timer to track when audio finishes
      setTimeout(() => {
        setIsEnglishTTSPlaying(false);
      }, text.length * 50); // Rough estimate of audio duration
    } else if (language === 'hi' && isReady) {
      const sentences = text.replace(/[*#\-_]/g, " ").match(/[^.!?।\n]+[.!?।\n]+/g) || [text];
      sentences.forEach(s => speak(s.trim()));
    }
  };

  // --- Stop TTS Logic ---
  const stopTTS = () => {
    resetTTS();
    setIsEnglishTTSPlaying(false);
    sharedAudioPlayer.stopAndClearQueue();
  };

  // --- Send Message Logic ---
  const sendMessage = async (queryText = input, wasVoice = false) => {
    if (!queryText.trim() || loading) return;
    
    stopTTS();
    
    // User Message
    setMessages(prev => [...prev, { role: 'User', content: queryText }]);
    setInput('');
    setLoading(true);

    // AI Placeholder
    setMessages(prev => [...prev, { role: 'AI', content: '...' }]);

    try {
      const res = await fetch('https://ng-chatbot-backend.onrender.com/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: queryText, 
          role: selectedRole, 
          language,
          history: messages.slice(-5).map(m => `${m.role}: ${m.content}`).join("\n") 
        })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value);
        
        setMessages(prev => {
          const newMsg = [...prev];
          newMsg[newMsg.length - 1].content = fullResponse;
          return newMsg;
        });
      }
      
      if (wasVoice) speakText(fullResponse);

    } catch (e) {
      console.error("Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  };

  // --- Voice Input Logic ---
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser does not support Speech Recognition.");
    
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => sendMessage(e.results[0][0].transcript, true);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <div className="zoe-container">
      <header className="zoe-header">
        {/* <button onClick={() => setAppStage('selection')} className="back-btn"><FiChevronLeft /> {t.back}</button> */}
        <h2 className="brand">{t.navGurukul}</h2>
        <button onClick={() => setLanguage(l => l === 'en' ? 'hi' : 'en')} className="lang-btn">
          <FiGlobe /> {language === 'en' ? 'English' : 'हिन्दी'}
        </button>
      </header>

      {/* --- STAGE 1: SELECTION --- */}
      {appStage === 'selection' && (
        <div className="stage selection">
          <div className="zoe-avatar-static">
            <video autoPlay muted loop width="300" height="300">
              <source src="/glassadjustment.mp4" type="video/mp4" />
            </video>
          </div>
          <h1>{t.hiGuest}</h1>
          <p>{t.selectRole}</p>
          <div className="role-grid">
            {['student', 'parent', 'partner'].map(role => (
              <div key={role} className="zoe-card" onClick={() => { setSelectedRole(role); setAppStage('setup'); }}>
                <h3>{translations[language][role]}</h3>
                <p>{translations[language][role + 'Desc']}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- STAGE 2: SETUP --- */}
      {appStage === 'setup' && (
        <div className="stage setup">
          <h2>Test your mic and speaker</h2>
          <div className="test-grid">
            <div className="test-card" onClick={async () => { 
                try { await navigator.mediaDevices.getUserMedia({ audio: true }); setMicTested(true); } 
                catch(e) { alert("Mic permission denied"); }
              }}>
              {micTested ? <FiCheckCircle color="green" /> : <FiMic />}
              <p>{micTested ? t.micOk : t.testMic}</p>
            </div>
            <div className="test-card" onClick={() => { 
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const osc = audioContext.createOscillator();
                osc.connect(audioContext.destination);
                osc.start();
                osc.stop(audioContext.currentTime + 0.3);
              }}>
              <FiVolume2 />
              <p>{t.testSpk}</p>
            </div> 
          </div>
          <button className="primary-btn" onClick={() => setAppStage('chat')} disabled={isModelLoading}>
             {isModelLoading ? t.loading : t.startBtn}
          </button>
        </div>
      )}
      
      {appStage === 'chat' && (
        <div className="stage chat">
          <div className="ai-visual-container">
            {isListening ? (
              <video autoPlay muted loop key="listening">
                <source src="/listening.mp4" type="video/mp4" />
              </video>
            ) : isTTSPlaying || isEnglishTTSPlaying ? (
              <video autoPlay muted loop key="speaking">
                <source src="/speaking-edited.mp4" type="video/mp4" />
              </video>
            ) : (
              <video autoPlay muted loop key="idle">
                <source src="/ballbounce.mp4" type="video/mp4" />
              </video>
            )}
          </div>

          <div className="chat-history" ref={chatRef}>
            {messages.length === 0 && (
              <div className="quick-prompts-section">
                <p className="quick-prompts-label">Quick Questions:</p>
                <div className="quick-prompts-grid">
                  <button className="quick-prompt-btn" onClick={() => sendMessage(t.quickPrompt1, false)}>
                    {t.quickPrompt1}
                  </button>
                  <button className="quick-prompt-btn" onClick={() => sendMessage(t.quickPrompt2, false)}>
                    {t.quickPrompt2}
                  </button>
                  <button className="quick-prompt-btn" onClick={() => sendMessage(t.quickPrompt3, false)}>
                    {t.quickPrompt3}
                  </button>
                  <button className="quick-prompt-btn" onClick={() => sendMessage(t.quickPrompt4, false)}>
                    {t.quickPrompt4}
                  </button>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`msg-bubble ${m.role.toLowerCase()}`}>
                <div dangerouslySetInnerHTML={{ __html: marked.parse(m.content) }} />
              </div>
            ))}
          </div>

          <div className="zoe-input-section">
            <div className="input-pill">
              <input 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && sendMessage(input, false)} 
                placeholder={t.askAnything} 
              />
              <button className={`mic-circle ${isListening ? 'active' : ''}`} onClick={handleVoiceInput}>
                <FiMic />
              </button>
              {isTTSPlaying || isEnglishTTSPlaying ? (
                <button className="send-circle stop-btn" onClick={stopTTS} title="Stop Audio">
                  <FiPause />
                </button>
              ) : (
                <button className="send-circle" onClick={() => sendMessage(input, false)}>
                  <IoSend />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


