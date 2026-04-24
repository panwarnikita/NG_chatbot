import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import { FiMic, FiGlobe, FiPause, FiChevronLeft } from 'react-icons/fi';
import { FaGraduationCap, FaUsers, FaHandshake } from 'react-icons/fa';
import { IoSend } from 'react-icons/io5';
import { usePiper } from './hooks/text-to-speech_hook';


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
    openQuickQuestions: 'Suggested Questions',
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
    openQuickQuestions: 'सुझाए गए सवाल',  
    quickPrompt1: 'नवगुरुकुल क्या है?',
    quickPrompt2: 'प्रवेश प्रक्रिया बताएं',
    quickPrompt3: 'नवगुरुकुल में स्कूलों के बारे में बताएं',
    quickPrompt4: 'मुझे सफलता के कहानियाँ दिखाएं'
  }
};

// --- Welcome Messages ---
const welcomeMessages = {
  en: "Hi, I'm Swara. I can help you with any information about NavGurukul. What would you like to know today?",
  hi: 'नमस्ते! मैं स्वरा हूँ मैं नवगुरुकुल के बारे में आपकी किसी भी प्रकार की सहायता कर सकती हूँ। बताइए, आज आप क्या जानना चाहेंगे?'
};

export default function App() {
  const [appStage, setAppStage] = useState('selection'); 
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('hi');
  const [hasUserGesture, setHasUserGesture] = useState(false);

  const chatRef = useRef(null);
  const appStageRef = useRef(appStage);
  const ttsStoppedRef = useRef(false);
  const selectionAnnouncedRef = useRef(false);
  const chatWelcomeAnnouncedRef = useRef(false);
  const t = translations[language];

  useEffect(() => {
    appStageRef.current = appStage;
  }, [appStage]);

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
    // Stop the previous page narration when stage changes.
    ttsStoppedRef.current = false;
    resetTTS();
    if (appStage === 'selection') {
      chatWelcomeAnnouncedRef.current = false;
    }
    if (appStage === 'chat') {
      // selectionAnnouncedRef.current = false; // Don't reset, so it doesn't repeat on back
    }
  }, [appStage, resetTTS]);

  useEffect(() => {
    if (appStage !== 'chat') return;
    if (!hasUserGesture || !isReady || chatWelcomeAnnouncedRef.current) return;
    chatWelcomeAnnouncedRef.current = true;
    const chatIntro = welcomeMessages[language];
    speakText(chatIntro, 'chat').catch(() => {});
  }, [appStage, hasUserGesture, isReady, language]);

  useEffect(() => {
    if (appStage !== 'selection') {
      return;
    }
    if (!hasUserGesture || !isReady || selectionAnnouncedRef.current) return;
    selectionAnnouncedRef.current = true;
    const selectionIntro = language === 'hi'
      ? 'नमस्ते! मैं स्वरा हूँ आगे बढ़ने के लिए कृपया बताइए — क्या आप छात्र हैं, माता-पिता हैं, या भागीदार हैं?'
      : "Hi, I'm Swara. To get started, please tell me — are you a student, a parent, or a partner?";
    speakText(selectionIntro, 'selection').catch(() => {});
  }, [appStage, hasUserGesture, isReady, language]);

  // --- Auto Scroll Chat ---
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // --- Speak Logic ---
  const speakText = async (text, stageGuard = null) => {
    if (!text || !text.trim()) return;
    if (!isReady) return;
    if (ttsStoppedRef.current) return;
    if (stageGuard && appStageRef.current !== stageGuard) return;

    const sentences = text.replace(/[*#\-_]/g, ' ').match(/[^.!?।\n]+[.!?।\n]+/g) || [text];
    for (const s of sentences) {
      if (ttsStoppedRef.current) break;
      if (stageGuard && appStageRef.current !== stageGuard) break;
      speak(s.trim());
    }
  };

  // --- Stop TTS Logic ---
  const stopTTS = () => {
    ttsStoppedRef.current = true;
    resetTTS();
  };

  const handleQuickPromptClick = (promptText) => {
    if (!promptText) return;
    sendMessage(promptText, false);
  };

  const handleBackToHome = () => {
    ttsStoppedRef.current = false;
    resetTTS();
    setIsListening(false);
    setLoading(false);
    setInput('');
    setMessages([]);
    setAppStage('selection');
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
    
    ttsStoppedRef.current = false;
    resetTTS(); // Purani voice band karo
    
    // UI Update
    setMessages(prev => [...prev, { role: 'User', content: queryText }]);
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'AI', content: '...' }]);

    try {
      const res = await fetch('/ask', {
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
        if (ttsStoppedRef.current) {
          try {
            await reader.cancel();
          } catch {
            // ignore cancellation errors
          }
          break;
        }
        if (appStageRef.current !== 'chat') {
          try {
            await reader.cancel();
          } catch {
            // ignore cancellation errors
          }
          break;
        }
        
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
              if (ttsStoppedRef.current) break;
              if (appStageRef.current !== 'chat') break;
              speak(textToSpeak);
              lastSpokenIndex += (boundaryIndex + 1);
            }
          }
        }
      }

      // Final Check: Bacha hua text (agar last mein punctuation na ho)
      const remaining = fullResponse.slice(lastSpokenIndex).trim();
      if (remaining.length > 0 && appStageRef.current === 'chat' && !ttsStoppedRef.current) {
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
        <div className="gesture-overlay" onClick={() => setHasUserGesture(true)}>
          <div className="gesture-overlay-card">
            <div className="gesture-mascot-wrap" aria-hidden="true">
              <span className="gesture-mascot-ring" />
              <span className="gesture-mascot-ring gesture-mascot-ring-delayed" />
              <div className="gesture-mascot">
                <video autoPlay muted loop playsInline>
                  <source src="/thoughtbubble.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
            <h2 className="gesture-title">{t.hiGuest}</h2>
            <p className="gesture-subtitle">{t.tapToBegin}</p>
          </div>
        </div>
      )}
      <header className="zoe-header">
        <h2
          className="brand brand-clickable"
          role="button"
          tabIndex={0}
          onClick={handleBackToHome}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleBackToHome();
            }
          }}
        >
          {t.navGurukul}
        </h2>
        <button onClick={() => setLanguage(l => l === 'en' ? 'hi' : 'en')} className="lang-btn">
          <FiGlobe /> {language === 'en' ? 'हिन्दी' : 'English'}
        </button>
      </header>

      {/* --- STAGE 1: SELECTION --- */}
      {appStage === 'selection' && (
        <div className="stage selection">
          <div className={`selection-shell ${language === 'hi' ? 'is-hi' : ''}`}>
            <div className="selection-mascot" aria-hidden="true">
              <div className="mascot-circle-frame">
                <video autoPlay muted loop key={isTTSPlaying ? 'selection-speaking' : 'selection-idle'} width="300" height="300">
                  <source src={isTTSPlaying ? '/speaking-edited.mp4' : '/ballbounce.mp4'} type="video/mp4" />
                </video>
              </div>
            </div>
            <h2 className="selection-title">{t.hiGuest}</h2>
            <p className="text-slate-500 text-sm font-medium max-w-xl mx-auto px-4 mb-7">{t.selectRole}</p>

            <div className="selection-cards">
              <button
                className={`card ${selectedRole === 'student' ? 'selected' : ''}`}
                onClick={() => setSelectedRole('student')}
              >
                <div className="radio-container">
                  <input 
                    type="radio" 
                    name="role" 
                    checked={selectedRole === 'student'} 
                    readOnly 
                  />
                </div>
                <div className="card-header">
                  <div className="feature-icon"><FaGraduationCap /></div>
                  <h3 className="card-title">{t.student}</h3>
                </div>
                <p className="card-description">{t.studentDesc}</p>
                <div className="card-content-text"></div>
              </button>

              <button 
                className={`card ${selectedRole === 'parent' ? 'selected' : ''}`} 
                onClick={() => setSelectedRole('parent')}
              >
                <div className="radio-container">
                  <input 
                    type="radio" 
                    name="role" 
                    checked={selectedRole === 'parent'} 
                    readOnly 
                  />
                </div>
                <div className="card-header">
                  <div className="feature-icon"><FaUsers /></div>
                  <h3 className="card-title">{t.parent}</h3>
                </div>
                <p className="card-description">{t.parentDesc}</p>
                <div className="card-content-text"></div>
              </button>

              <button 
                className={`card ${selectedRole === 'partner' ? 'selected' : ''}`} 
                onClick={() => setSelectedRole('partner')}
              >
                <div className="radio-container">
                  <input 
                    type="radio" 
                    name="role" 
                    checked={selectedRole === 'partner'} 
                    readOnly 
                  />
                </div>
                <div className="card-header">
                  <div className="feature-icon"><FaHandshake /></div>
                  <h3 className="card-title">{t.partner}</h3>
                </div>
                <p className="card-description">{t.partnerDesc}</p>
                <div className="card-content-text"></div>
              </button>
            </div>

            <div className="proceed-container">
              <button className="primary-btn proceed-btn" onClick={() => setAppStage('chat')}>
                {t.startBtn}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {appStage === 'chat' && (
        <div className="stage chat">
          <div className="chat-back-row">
            <button onClick={handleBackToHome} className="chat-back-btn"><FiChevronLeft /> {t.back}</button>
          </div>

          <div className="ai-visual-container">
            <div className="chat-mascot-frame mascot-circle-frame">
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
                  <source src="/bubblepop.mp4" type="video/mp4" />
                </video>
              )}
            </div>
          </div>

          <div className="chat-history" ref={chatRef}>
            {messages.map((m, i) => (
              <div key={i} className={`msg-bubble ${m.role.toLowerCase()}`}>
                <div dangerouslySetInnerHTML={{ __html: marked.parse(m.content) }} />
              </div>
            ))}
          </div>

          {messages.length === 0 && (
            <div className="quick-prompts-dock is-open">
              <div className="quick-prompts-section">
                <div className="quick-prompts-grid">
                  <button className="quick-prompt-btn" onClick={() => handleQuickPromptClick(t.quickPrompt1)}>
                    {t.quickPrompt1}
                  </button>
                  <button className="quick-prompt-btn" onClick={() => handleQuickPromptClick(t.quickPrompt2)}>
                    {t.quickPrompt2}
                  </button>
                </div>
              </div>
            </div>
          )}

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