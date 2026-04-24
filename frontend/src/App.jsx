import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import { FiMic, FiGlobe, FiChevronLeft, FiCheckCircle, FiVolume2, FiPause } from 'react-icons/fi';
import { IoSend } from 'react-icons/io5';
import { usePiper } from './hooks/text-to-speech_hook';
import { staticPhrases } from './constants/staticPhrases';
import { playCachedAudio, stopCachedAudio } from './utils/cachedAudio';


// --- Translations & Content ---
const translations = {
  en: {
    navGurukul: 'Swara ', hiGuest: "Hi, I'm Swara", selectRole: 'Please select your role to continue.', 
    startBtn: 'Start Chatting', loading: 'Loading Voices...', back: 'Back', 
    student: 'I am Student', studentDesc: 'Simple, clear and step-by-step admission help.',
    parent: 'I am Parent', parentDesc: 'Safety, eligibility and outcomes with trust-focused guidance.',
    partner: 'I am Partner', partnerDesc: 'Professional info for NGO, government and teachers.',
    testMic: 'Test Microphone', testSpk: 'Test Speaker', micOk: 'Mic Access Granted', spkOk: 'Sound Working?',
    askAnything: 'Ask AI anything...',
    tapToBegin: 'Tap to begin',
    quickPrompt1: 'What is NavGurukul?',
    quickPrompt2: 'Tell me about Admission Process',
    quickPrompt3: 'Tell me about Schools in NavGurukul',
    quickPrompt4: 'show me success stories'
  },
  hi: {
    navGurukul: 'स्वरा ', hiGuest: 'नमस्ते, मैं स्वरा हूँ', selectRole: 'जारी रखने के लिए कृपया अपनी भूमिका चुनें।',
    startBtn: 'बातचीत शुरू करें', loading: 'आवाज़ें लोड हो रही हैं...', back: 'पीछे', 
    student: 'मैं छात्र  हूँ', studentDesc: 'सरल, स्पष्ट और चरण-दर-चरण प्रवेश सहायता।',
    parent: 'मैं माता-पिता हूँ', parentDesc: 'सुरक्षा, पात्रता और विश्वास-केंद्रित मार्गदर्शन।',
    partner: 'मैं भागीदार हूँ', partnerDesc: 'एनजीओ, सरकार और शिक्षकों के लिए पेशेवर जानकारी।',
    testMic: 'माइक टेस्ट करें', testSpk: 'स्पीकर टेस्ट करें', micOk: 'माइक चालू है', spkOk: 'आवाज़ आई?',
    askAnything: 'AI से कुछ भी पूछें...',
    tapToBegin: 'शुरू करने के लिए टैप करें',
    quickPrompt1: 'नवगुरुकुल क्या है?',
    quickPrompt2: 'प्रवेश प्रक्रिया बताएं',
    quickPrompt3: 'नवगुरुकुल में स्कूलों के बारे में बताएं',
    quickPrompt4: 'मुझे सफलता के कहानियाँ दिखाएं'
  }
};

const welcomeMessages = staticPhrases.welcome;

export default function App() {
  const [appStage, setAppStage] = useState('selection'); 
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('hi');
  const [micTested, setMicTested] = useState(false);
  const [hasUserGesture, setHasUserGesture] = useState(false);

  const chatRef = useRef(null);
  const setupAnnouncedRef = useRef(false);
  const selectionAnnouncedRef = useRef(false);
  const chatWelcomeAnnouncedRef = useRef(false);
  const t = translations[language];

  // --- TTS Hook Config ---
  const piperConfig = useMemo(() => {
    if (language === 'hi') {
      return {
        voiceModelUrl: '/models/hi_IN-priyamvada-medium.onnx',
        voiceConfigUrl: '/models/hi_IN-priyamvada-medium.json',
        warmupText: 'नमस्ते, मैं स्वरा हूँ।'
      };
    }

    return {
      voiceModelUrl: '/models/Indian_accent_1.onnx',
      voiceConfigUrl: '/models/Indian_accent_1.json',
      warmupText: "Hello, I'm Swara."
    };
  }, [language]);

  const { speak, isReady, isPlaying: isTTSPlaying, resetTTS, isLoading: isModelLoading } = usePiper(piperConfig);

  useEffect(() => {
    if (appStage !== 'setup' || setupAnnouncedRef.current) return;
    setupAnnouncedRef.current = true;
    playCachedAudio('setup_intro', language).catch(() => {
      speakText(staticPhrases.setup_intro[language]).catch(() => {});
    });
  }, [appStage, language]);

  useEffect(() => {
    if (appStage !== 'setup') {
      setupAnnouncedRef.current = false;
    }
    if (appStage === 'selection') {
      selectionAnnouncedRef.current = false;
      chatWelcomeAnnouncedRef.current = false;
    }
  }, [appStage]);

  useEffect(() => {
    if (appStage !== 'chat' || messages.length !== 0 || chatWelcomeAnnouncedRef.current) return;
    chatWelcomeAnnouncedRef.current = true;
    playCachedAudio('welcome', language).catch(() => {
      if (isReady) speakText(welcomeMessages[language]).catch(() => {});
    });
  }, [appStage, isReady, language]);

  useEffect(() => {
    if (appStage !== 'selection') {
      selectionAnnouncedRef.current = false;
      return;
    }
    if (!hasUserGesture || selectionAnnouncedRef.current) return;
    selectionAnnouncedRef.current = true;
    playCachedAudio('selection_intro', language).catch(() => {
      if (isReady) speakText(staticPhrases.selection_intro[language]).catch(() => {});
    });
  }, [appStage, isReady, language, hasUserGesture]);

  // --- Auto Scroll Chat ---
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // --- Speak Logic ---
  const speakText = async (text) => {
    if (!text || !text.trim()) return;
    if (!isReady) return;

    const sentences = text.replace(/[*#\-_]/g, ' ').match(/[^.!?।\n]+[.!?।\n]+/g) || [text];
    sentences.forEach((s) => speak(s.trim()));
  };

  // --- Stop TTS Logic ---
  const stopTTS = () => {
    stopCachedAudio();
    resetTTS();
  };

  // --- Send Message Logic ---
  // const sendMessage = async (queryText = input, wasVoice = false) => {
  //   if (!queryText.trim() || loading) return;
    
  //   stopTTS();
    
  //   // User Message
  //   setMessages(prev => [...prev, { role: 'User', content: queryText }]);
  //   setInput('');
  //   setLoading(true);

  //   // AI Placeholder
  //   setMessages(prev => [...prev, { role: 'AI', content: '...' }]);

  //   try {
  //     const res = await fetch('/ask', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ 
  //         query: queryText, 
  //         role: selectedRole, 
  //         language,
  //         history: messages.slice(-10).map(m => `${m.role}: ${m.content}`).join("\n")
  //       })
  //     });

  //     const reader = res.body.getReader();
  //     const decoder = new TextDecoder();
  //     let fullResponse = "";

  //     while (true) {
  //       const { done, value } = await reader.read();
  //       if (done) break;
  //       fullResponse += decoder.decode(value);
        
  //       setMessages(prev => {
  //         const newMsg = [...prev];
  //         newMsg[newMsg.length - 1].content = fullResponse;
  //         return newMsg;
  //       });
  //     }
      
  //     await speakText(fullResponse);

  //   } catch (e) {
  //     console.error("Fetch Error:", e);
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  // --- Updated Send Message Logic for Ultra-Fast Voice ---
  const sendMessage = async (queryText = input, wasVoice = false) => {
    if (!queryText.trim() || loading) return;
    
    stopTTS(); // Purani voice band karo
    
    // UI Update
    setMessages(prev => [...prev, { role: 'User', content: queryText }]);
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'AI', content: '...' }]);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: queryText, 
          role: selectedRole, 
          language,
          history: messages.slice(-10).map(m => `${m.role}: ${m.content}`).join("\n")
        })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let lastSpokenIndex = 0; 

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        fullResponse += chunk;
        
        // 1. Update UI Text
        setMessages(prev => {
          const newMsg = [...prev];
          newMsg[newMsg.length - 1].content = fullResponse;
          return newMsg;
        });

        // 2. Faster Voice Logic
        const unsentPart = fullResponse.slice(lastSpokenIndex);
        const words = unsentPart.trim().split(/\s+/);

        // Terminate on punctuation OR if we reach 5 words
        const terminators = /[.!?।\n]/;
        const hasTerminator = terminators.test(unsentPart);
        
        if (hasTerminator || words.length >= 5) {
          let boundaryIndex = unsentPart.search(terminators);
          
          // Agar punctuation nahi mila par 5 words ho gaye, toh last space dhoondo
          if (boundaryIndex === -1) {
            boundaryIndex = unsentPart.lastIndexOf(' ');
          }

          if (boundaryIndex !== -1) {
            const textToSpeak = unsentPart.slice(0, boundaryIndex + 1).trim();
            
            // Sirf tab bole jab text valid ho
            if (textToSpeak.length > 1) {
              speak(textToSpeak);
              lastSpokenIndex += (boundaryIndex + 1);
            }
          }
        }
      }

      // Final Check: Bacha hua text (agar last mein punctuation na ho)
      const remaining = fullResponse.slice(lastSpokenIndex).trim();
      if (remaining.length > 0) {
        speak(remaining);
      }

    } catch (e) {
      console.error("Fetch Error:", e);
      setMessages(prev => {
        const newMsg = [...prev];
        newMsg[newMsg.length - 1].content = "Sorry, something went wrong. Please try again.";
        return newMsg;
      });
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
      {!hasUserGesture && (
        <div
          onClick={() => setHasUserGesture(true)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(252, 228, 236, 0.96)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer',
            textAlign: 'center',
            padding: '24px',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>👋</div>
          <h2 style={{ color: '#2d5a27', margin: '0 0 8px 0' }}>{t.hiGuest}</h2>
          <p style={{ color: '#2d5a27', fontSize: '18px', margin: 0 }}>{t.tapToBegin}</p>
        </div>
      )}
      <header className="zoe-header">
        {/* <button onClick={() => setAppStage('selection')} className="back-btn"><FiChevronLeft /> {t.back}</button> */}
        <h2 className="brand">{t.navGurukul}</h2>
        <button onClick={() => setLanguage(l => l === 'en' ? 'hi' : 'en')} className="lang-btn">
          <FiGlobe /> {language === 'en' ? 'हिन्दी' : 'English'}
        </button>
      </header>

      {/* --- STAGE 1: SELECTION --- */}
      {appStage === 'selection' && (
        <div className="stage selection">
          <div className="zoe-avatar-static">
            <video autoPlay muted loop key={isTTSPlaying ? "speaking" : "idle"} width="300" height="300">
              <source src={isTTSPlaying ? "/speaking-edited.mp4" : "/glassadjustment.mp4"} type="video/mp4" />
            </video>
          </div>
          <h1>{t.hiGuest}</h1>
          <p>{t.selectRole}</p>
          <div className="role-grid">
            {['student', 'parent', 'partner'].map(role => (
              <div key={role} className="zoe-card" onClick={() => { stopTTS(); setSelectedRole(role); setAppStage('setup'); }}>
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
           <button className="primary-btn" onClick={() => { stopTTS(); setAppStage('chat'); }} disabled={isModelLoading || !isReady}>
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
            ) : isTTSPlaying ? (
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
              {isTTSPlaying ? (
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


