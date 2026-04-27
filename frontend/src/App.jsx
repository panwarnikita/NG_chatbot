import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import { FiMic, FiGlobe, FiPause, FiChevronLeft } from 'react-icons/fi';
import { FaGraduationCap, FaUsers, FaHandshake } from 'react-icons/fa';
import { IoSend } from 'react-icons/io5';
import { usePiper } from './hooks/text-to-speech_hook';
import { staticPhrases } from './constants/staticPhrases';

const translations = {
  en: {
    navGurukul: 'Swara ', hiGuest: "Hi, I'm Swara", selectRole: 'Please select your role to continue.', 
    startBtn: 'Start Chatting', loading: 'Loading Voices...', back: 'Back', 
    student: 'I am Student', studentDesc: 'Simple, clear and step-by-step admission help.',
    parent: 'I am Parent', parentDesc: 'Safety, eligibility and outcomes with trust-focused guidance.',
    partner: 'I am Partner', partnerDesc: 'Professional info for NGO, government and teachers.',
    askAnything: 'Ask AI anything...', tapToBegin: 'Tap to begin',
    quickPrompt1: 'What is NavGurukul?', quickPrompt2: 'Tell me about Admission Process',
  },
  hi: {
    navGurukul: 'स्वरा ', hiGuest: 'नमस्ते, मैं स्वरा हूँ', selectRole: 'जारी रखने के लिए कृपया अपनी भूमिका चुनें।',
    startBtn: 'बातचीत शुरू करें', loading: 'आवाज़ें लोड हो रही हैं...', back: 'पीछे', 
    student: 'मैं छात्र  हूँ', studentDesc: 'सरल, स्पष्ट और चरण-दर-चरण प्रवेश सहायता।',
    parent: 'मैं माता-पिता हूँ', parentDesc: 'सुरक्षा, पात्रता और विश्वास-केंद्रित मार्गदर्शन।',
    partner: 'मैं भागीदार हूँ', partnerDesc: 'एनजीओ, सरकार और शिक्षकों के लिए पेशेवर जानकारी।',
    askAnything: 'AI से कुछ भी पूछें...', tapToBegin: 'शुरू करने के लिए टैप करें',
    quickPrompt1: 'नवगुरुकुल क्या है?', quickPrompt2: 'प्रवेश प्रक्रिया बताएं',
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
  const [hasUserGesture, setHasUserGesture] = useState(false);

  const chatRef = useRef(null);
  const appStageRef = useRef(appStage);
  const ttsStoppedRef = useRef(false);
  const currentAudioRef = useRef(null); 
  const selectionAnnouncedRef = useRef(false);
  const chatWelcomeAnnouncedRef = useRef(false);
  const t = translations[language];

  useEffect(() => { appStageRef.current = appStage; }, [appStage]);

  const piperConfig = useMemo(() => {
    return language === 'hi' 
      ? { voiceModelUrl: '/models/hi_IN-priyamvada-medium.onnx', voiceConfigUrl: '/models/hi_IN-priyamvada-medium.json', warmupText: 'नमस्ते' }
      : { voiceModelUrl: '/models/Indian_accent_1.onnx', voiceConfigUrl: '/models/Indian_accent_1.json', warmupText: "Hello" };
  }, [language]);

  const { speak, isReady, isPlaying: isTTSPlaying, resetTTS, isLoading: isModelLoading } = usePiper(piperConfig);

  const stopAllAudio = () => {
    ttsStoppedRef.current = true;
    resetTTS(); // Stop AI
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    ttsStoppedRef.current = false;
    stopAllAudio();
    if (appStage === 'selection') chatWelcomeAnnouncedRef.current = false;
  }, [appStage]);

  // Play Static Audio Helper
  const playStaticFile = (fileName) => {
    return new Promise((resolve, reject) => {
      stopAllAudio();
      ttsStoppedRef.current = false;
      const audio = new Audio(`/audio/${fileName}.wav`);
      currentAudioRef.current = audio;
      audio.play().then(resolve).catch(reject);
    });
  };

  useEffect(() => {
    if (appStage !== 'selection' || !hasUserGesture || selectionAnnouncedRef.current) return;
    selectionAnnouncedRef.current = true;
    playStaticFile(`selection_intro_${language}`).catch(() => {
      const txt = language === 'hi' ? 'नमस्ते! मैं स्वरा हूँ आगे बढ़ने के लिए कृपया अपनी भूमिका चुनें।' : "Hi, I'm Swara. To get started, please select your role.";
      speakText(txt, 'selection');
    });
  }, [appStage, hasUserGesture, language]);

  // --- Chat Welcome Audio ---
  useEffect(() => {
    if (appStage !== 'chat' || messages.length !== 0 || chatWelcomeAnnouncedRef.current || !hasUserGesture) return;
    chatWelcomeAnnouncedRef.current = true;
    playStaticFile(`welcome_${language}`).catch(() => {
      speakText(welcomeMessages[language], 'chat');
    });
  }, [appStage, hasUserGesture, language, messages.length]);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  const speakText = async (text, stageGuard = null) => {
    if (!text || !text.trim() || !isReady || ttsStoppedRef.current) return;
    if (stageGuard && appStageRef.current !== stageGuard) return;
    const sentences = text.replace(/[*#\-_]/g, ' ').match(/[^.!?।\n]+[.!?।\n]+/g) || [text];
    for (const s of sentences) {
      if (ttsStoppedRef.current || (stageGuard && appStageRef.current !== stageGuard)) break;
      speak(s.trim());
    }
  };

  const handleBackToHome = () => {
    stopAllAudio(); setIsListening(false); setLoading(false); setInput(''); setMessages([]); setAppStage('selection');
  };

  const sendMessage = async (queryText = input) => {
    if (!queryText.trim() || loading) return;
    stopAllAudio();
    ttsStoppedRef.current = false;
    setMessages(prev => [...prev, { role: 'User', content: queryText }, { role: 'AI', content: '...' }]);
    setInput(''); setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/ask`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, role: selectedRole, language, history: messages.slice(-10).map(m => `${m.role}: ${m.content}`).join("\n") })
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "", lastSpokenIndex = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done || ttsStoppedRef.current || appStageRef.current !== 'chat') { if (!done) await reader.cancel(); break; }
        fullResponse += decoder.decode(value);
        setMessages(prev => { const n = [...prev]; n[n.length - 1].content = fullResponse; return n; });

        const unsent = fullResponse.slice(lastSpokenIndex);
        const terminators = /[.!?।\n]/;
        if (terminators.test(unsent) || unsent.trim().split(/\s+/).length >= 5) {
          let idx = unsent.search(terminators);
          if (idx === -1) idx = unsent.lastIndexOf(' ');
          if (idx !== -1) {
            const chunk = unsent.slice(0, idx + 1).trim();
            if (chunk.length > 1) { speak(chunk); lastSpokenIndex += (idx + 1); }
          }
        }
      }
      const rem = fullResponse.slice(lastSpokenIndex).trim();
      if (rem.length > 0 && !ttsStoppedRef.current) speak(rem);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleVoiceInput = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert("Not supported");
    const rec = new SR(); rec.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => sendMessage(e.results[0][0].transcript);
    rec.onend = () => setIsListening(false);
    rec.start();
  };

  return (
    <div className="zoe-container">
      {!hasUserGesture && (
        <div className="gesture-overlay" onClick={() => setHasUserGesture(true)}>
          <div className="gesture-overlay-card">
            <div className="gesture-mascot-wrap"><div className="gesture-mascot">
                <video autoPlay muted loop playsInline><source src="/thoughtbubble.mp4" type="video/mp4" /></video>
            </div></div>
            <h2 className="gesture-title">{t.hiGuest}</h2>
            <p className="gesture-subtitle">{t.tapToBegin}</p>
          </div>
        </div>
      )}

      <header className="zoe-header">
        <h2 className="brand brand-clickable" onClick={handleBackToHome}>{t.navGurukul}</h2>
        <button onClick={() => setLanguage(l => l === 'en' ? 'hi' : 'en')} className="lang-btn">
          <FiGlobe /> {language === 'en' ? 'हिन्दी' : 'English'}
        </button>
      </header>

      {appStage === 'selection' && (
        <div className="stage selection">
          <div className={`selection-shell ${language === 'hi' ? 'is-hi' : ''}`}>
            <div className="selection-mascot">
              <div className="mascot-circle-frame">
                <video autoPlay muted loop key={isTTSPlaying || (currentAudioRef.current && !currentAudioRef.current.paused) ? 's-speak' : 's-idle'} width="300">
                  <source src={isTTSPlaying || (currentAudioRef.current && !currentAudioRef.current.paused) ? '/speaking-edited.mp4' : '/ballbounce.mp4'} type="video/mp4" />
                </video>
              </div>
            </div>
            <h2 className="selection-title">{t.hiGuest}</h2>
            <p className="text-slate-500 text-sm font-medium max-w-xl mx-auto mb-7">{t.selectRole}</p>

            <div className="selection-cards">
              {['student', 'parent', 'partner'].map(role => (
                <button key={role} className={`card ${selectedRole === role ? 'selected' : ''}`} onClick={() => setSelectedRole(role)}>
                  <div className="radio-container"><input type="radio" checked={selectedRole === role} readOnly /></div>
                  <div className="card-header">
                    <div className="feature-icon">{role === 'student' ? <FaGraduationCap/> : role === 'parent' ? <FaUsers/> : <FaHandshake/>}</div>
                    <h3 className="card-title">{translations[language][role]}</h3>
                  </div>
                  <p className="card-description">{translations[language][role + 'Desc']}</p>
                </button>
              ))}
            </div>
            <div className="proceed-container">
              <button className="primary-btn proceed-btn" onClick={() => setAppStage('chat')}>{t.startBtn}</button>
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
              <video autoPlay muted loop key={isListening ? 'l' : isTTSPlaying || (currentAudioRef.current && !currentAudioRef.current.paused) ? 's' : 'i'}>
                <source src={isListening ? "/listening.mp4" : isTTSPlaying || (currentAudioRef.current && !currentAudioRef.current.paused) ? "/speaking-edited.mp4" : "/bubblepop.mp4"} type="video/mp4" />
              </video>
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
                  <button className="quick-prompt-btn" onClick={() => sendMessage(t.quickPrompt1)}>
                    {t.quickPrompt1}
                  </button>
                  <button className="quick-prompt-btn" onClick={() => sendMessage(t.quickPrompt2)}>
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
                onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                placeholder={t.askAnything} 
              />
              <button className={`mic-circle ${isListening ? 'active' : ''}`} onClick={handleVoiceInput}>
                <FiMic />
              </button>
              {isTTSPlaying || (currentAudioRef.current && !currentAudioRef.current.paused) ? (
                <button className="send-circle stop-btn" onClick={stopAllAudio}>
                  <FiPause />
                </button>
              ) : (
                <button className="send-circle" onClick={() => sendMessage()}>
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