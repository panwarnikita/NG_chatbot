// import { useEffect, useMemo, useRef, useState } from 'react'
// import { marked } from 'marked'
// import { FiMenu, FiMic, FiMicOff, FiPaperclip, FiPlus, FiGlobe, FiSquare } from 'react-icons/fi'
// import { IoSend } from 'react-icons/io5'
// import { usePiper } from './hooks/text-to-speech_hook' 

// // --- Nayi Library Imports (Sirf English ke liye) ---
// import { TTSLogic, sharedAudioPlayer, cleanTextForTTS } from "speech-to-speech";

// const translations = {
//   en: {
//     navGurukul: 'AI ✨', newChat: 'New Chat', noChatYet: 'No chats yet', role: 'Role', guest: 'Guest User', logout: 'Logout', hiGuest: 'Hi User,',
//     selectRole: 'Please select your role to continue.', assistantHello: 'I am the AI Assistant. How can I help you today?', selectRoleButton: 'Select Role',
//     noHistory: 'No chats yet', thinking: 'Thinking...', askAnything: 'Ask AI anything...', selectRoleFirst: 'Select role first...',
//     voiceInput: 'Voice Input', stopVoice: 'Stop Voice Input', listening: 'Listening...', send: 'Send',
//     student: 'Student', studentDesc: 'Simple, clear and step-by-step admission help.',
//     parent: 'Parent', parentDesc: 'Safety, eligibility and outcomes with trust-focused guidance.',
//     partner: 'Partner', partnerDesc: 'Professional info for NGO, government and teachers.',
//     whatIsNavGurukul: 'What is NavGurukul?', admissionProcess: 'Tell me about Admission process',
//     successStories: 'Show me success stories', etiocracy: 'Explain Etiocracy', language: 'Language'
//   },
//   hi: {
//     navGurukul: 'AI ✨', newChat: 'नई चैट', noChatYet: 'अभी कोई चैट नहीं', role: 'भूमिका', guest: 'अतिथि उपयोगकर्ता', logout: 'लॉग आउट', hiGuest: 'नमस्ते उपयोगकर्ता,',
//     selectRole: 'जारी रखने के लिए कृपया अपनी भूमिका चुनें।', assistantHello: 'मैं AI सहायक हूँ। मैं आपकी आज कैसे मदद कर सकता हूँ?', selectRoleButton: 'भूमिका चुनें',
//     noHistory: 'अभी कोई चैट नहीं', thinking: 'सोच रहा हूँ...', askAnything: 'AI से कुछ भी पूछें...', selectRoleFirst: 'पहले भूमिका चुनें...',
//     voiceInput: 'वॉयस इनपुट', stopVoice: 'वॉयस इनपुट बंद करें', listening: 'सुन रहा हूँ...', send: 'भेजें',
//     student: 'छात्र', studentDesc: 'सरल, स्पष्ट और चरण-दर-चरण प्रवेश सहायता।',
//     parent: 'माता-पिता', parentDesc: 'सुरक्षा, पात्रता और विश्वास-केंद्रित मार्गदर्शन।',
//     partner: 'भागीदार', partnerDesc: 'एनजीओ, सरकार और शिक्षकों के लिए पेशेवर जानकारी।',
//     whatIsNavGurukul: 'NavGurukul क्या है?', admissionProcess: 'प्रवेश प्रक्रिया के बारे में बताएं',
//     successStories: 'सफलता की कहानियां दिखाएं', etiocracy: 'Etiocracy समझाएं', language: 'भाषा'
//   }
// }

// const quickPrompts = (lang) => [
//   { text: translations[lang].whatIsNavGurukul, icon: '🏫' },
//   { text: translations[lang].admissionProcess, icon: '📝' },
//   { text: translations[lang].successStories, icon: '🌟' },
//   { text: translations[lang].etiocracy, icon: '🤝' }
// ]

// const roleOptions = (lang) => [
//   { key: 'student', label: translations[lang].student, description: translations[lang].studentDesc },
//   { key: 'parent', label: translations[lang].parent, description: translations[lang].parentDesc },
//   { key: 'partner', label: translations[lang].partner, description: translations[lang].partnerDesc }
// ]

// export default function App() {
//   const [messages, setMessages] = useState([])
//   const [history, setHistory] = useState([])
//   const [input, setInput] = useState('')
//   const [currentChatId, setCurrentChatId] = useState(null)
//   const [selectedRole, setSelectedRole] = useState('')
//   const [loading, setLoading] = useState(false)
//   const [sidebarOpen, setSidebarOpen] = useState(false)
//   const [isListening, setIsListening] = useState(false)
//   const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en')
//   const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  
 
//   const [isEnglishTTSReady, setIsEnglishTTSReady] = useState(false);
//   const englishTTSRef = useRef(null);

//   const chatRef = useRef(null)
//   const recognitionRef = useRef(null)
//   const languageDropdownRef = useRef(null)

//   const userInitial = "N"
//   const t = translations[language]

 
//   const piperConfig = useMemo(() => ({
//     voiceModelUrl: '/models/hi_IN-priyamvada-medium.onnx',
//     voiceConfigUrl: '/models/hi_IN-priyamvada-medium.json',
//     warmupText: ''
//   }), []);

//   const { speak, isReady, isPlaying: isTTSPlaying, resetTTS, isLoading: isModelLoading, error: hindiTtsError } = usePiper(piperConfig);

//   useEffect(() => {
//     let isMounted = true;
//     async function initEnglish() {
//       if (language === 'en') {
//         try {
//           sharedAudioPlayer.configure({ autoPlay: true });
//           const tts = new TTSLogic({ voiceId: "en_US-hfc_female-medium" });
//           await tts.initialize();
//           if (isMounted) {
//             englishTTSRef.current = tts;
//             setIsEnglishTTSReady(true);
//           }
//         } catch (e) { console.error(e); }
//       } else {
//         setIsEnglishTTSReady(false);
//         englishTTSRef.current = null;
//         if (sharedAudioPlayer) sharedAudioPlayer.stopAndClearQueue();
//       }
//     }
//     initEnglish();
//     return () => { isMounted = false; };
//   }, [language]); 

//   useEffect(() => {
//     localStorage.setItem('appLanguage', language)
//     resetTTS();
//   }, [language, resetTTS])

//   useEffect(() => {
//     if (hindiTtsError) {
//       console.error('Hindi TTS Error:', hindiTtsError);
//     }
//   }, [hindiTtsError]);

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
//         setShowLanguageDropdown(false)
//       }
//     }
//     document.addEventListener('mousedown', handleClickOutside)
//     return () => document.removeEventListener('mousedown', handleClickOutside)
//   }, [])

//   const scrollToBottom = () => {
//     if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
//   }

//   const stopSpeaking = () => {
//     resetTTS(); 
//     sharedAudioPlayer.stopAndClearQueue(); // English stop
//   };

//   const speakText = async (text) => {
//     console.log("speakText called with:", text, "Language:", language);
//     if (language === 'en') {
//       if (isEnglishTTSReady && englishTTSRef.current) {
//         console.log("English TTS - synthesizing");
//         const clean = cleanTextForTTS(text);
//         const sentences = clean.split(/(?<=[.!?।])\s+/).filter(s => s.trim());
//         for (const sentence of sentences) {
//           const result = await englishTTSRef.current.synthesize(sentence);
//           sharedAudioPlayer.addAudioIntoQueue(result.audio, result.sampleRate);
//         }
//       } else {
//         console.log("English TTS not ready:", { isEnglishTTSReady, hasRef: !!englishTTSRef.current });
//       }
//     } else {
//       console.log("Hindi TTS - isReady:", isReady);
//       if (isReady) {
//         // Remove markdown formatting: **text**, *text*, # , ## etc
//         const cleanHindi = text
//           .replace(/\*\*/g, "")      // Remove **
//           .replace(/\*/g, "")        // Remove *
//           .replace(/#{1,6}\s/g, "")  // Remove #, ##, etc
//           .replace(/`/g, "")         // Remove backticks
//           .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Convert [text](url) to text
//           .replace(/[<>~_]/g, " ");  // Remove other markdown chars
        
//         const sentences = cleanHindi.match(/[^.!?।\n]+[.!?।\n]+/g) || [cleanHindi];
//         console.log("Hindi sentences to speak:", sentences);
//         sentences.forEach(s => { if (s.trim().length > 0) { console.log("Speaking:", s.trim()); speak(s.trim()); } });
//       } else {
//         console.log("Hindi TTS not ready - model still loading", { isModelLoading, hindiTtsError });
//       }
//     }
//   };

//   const sendMessage = async (presetQuery, wasVoice = false) => {
//     const queryText = (presetQuery ?? input).trim();
//     if (!queryText || loading || !selectedRole) return;

//     stopSpeaking(); 
//     if (!presetQuery) setInput('');
//     setMessages(prev => [...prev, { role: 'User', content: queryText }]);
//     setLoading(true);

//     setMessages(prev => [...prev, { role: 'AI', content: '...' }]);
//     let fullAiResponse = "";

//     try {
//     const res = await fetch('/ask', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ 
//         query: queryText, 
//         role: selectedRole,
//         language: language,
//         // Pehle message par true baki sab par false
//         is_first: messages.length === 0, 
//         // Purane messages ko string bana kar bhej do (optional)
//         history: messages.map(m => `${m.role}: ${m.content}`).join("\n")
//     })
// });

//         const reader = res.body.getReader();
//         const decoder = new TextDecoder();

//         while (true) {
//             const { done, value } = await reader.read();
//             if (done) break;
//             const chunk = decoder.decode(value);
//             if (fullAiResponse === "") fullAiResponse = chunk;
//             else fullAiResponse += chunk;

//             setMessages(prev => {
//                 const newMessages = [...prev];
//                 newMessages[newMessages.length - 1].content = fullAiResponse;
//                 return newMessages;
//             });
//             scrollToBottom();
//         }
//         if (wasVoice) speakText(fullAiResponse);
//     } catch (error) {
//         console.error("Streaming Error:", error);
//     } finally {
//         setLoading(false);
//     }
// };

//   const handleVoice = () => {
//     if (!selectedRole || loading) return;
//     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//     if (!SpeechRecognition) return alert('Speech Recognition not supported.');
//     if (isListening && recognitionRef.current) {
//       recognitionRef.current.stop();
//       return;
//     }
//     const recognition = new SpeechRecognition();
//     recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
//     recognition.onstart = () => setIsListening(true);
//     recognition.onresult = (event) => {
//       const transcript = (event.results?.[0]?.[0]?.transcript || '').trim();
//       if (transcript) sendMessage(transcript, true);
//     };
//     recognition.onend = () => setIsListening(false);
//     recognitionRef.current = recognition;
//     recognition.start();
//   }

//   const startNewChat = () => {
//     setCurrentChatId(null);
//     setMessages([]);
//     setInput('');
//     setSelectedRole('');
//     stopSpeaking();
//   }

//   const handleRoleSelect = (role) => {
//     setSelectedRole(role);
//     setSidebarOpen(true);
//   }

//   const renderBubble = (msg, idx) => {
//     const isAI = msg.role === 'AI'
//     return (
//       <div key={idx} className={`message-wrapper ${isAI ? '' : 'user-wrapper'}`}>
//         <div className={`avatar ${isAI ? 'ai-avatar' : 'user-avatar'}`}>{isAI ? 'AI' : userInitial}</div>
//         <div className={`bubble ${isAI ? 'ai-bubble' : 'user-bubble'}`}
//           dangerouslySetInnerHTML={{ __html: isAI ? marked.parse(msg.content || '') : msg.content }} />
//       </div>
//     )
//   }

//   return (
//     <div className="app-layout">
//       <main id="main-content">
//         <header>
//           <div className="header-left">
//             <div className="brand-name-header">AI <span>✨</span></div>
//           </div>
//           <div className="header-right">
//             <div className="language-selector" ref={languageDropdownRef}>
//               <button className="language-toggle" onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}>
//                 <FiGlobe /> {language === 'en' ? 'English' :  'हिंदी'}
//               </button>
//               {showLanguageDropdown && (
//                 <div className="language-dropdown">
//                   {['en', 'hi'].map(l => (
//                     <button key={l} className={`language-option ${language === l ? 'active' : ''}`} onClick={() => { setLanguage(l); setShowLanguageDropdown(false); }}>
//                       {l === 'en' ? '🇬🇧 English' : '🇮🇳 हिंदी' }
//                     </button>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//           <div className="user-info">
//             <span className="role-badge">{roleOptions(language).find(r => r.key === selectedRole)?.label || t.selectRoleButton}</span>
//             <a href="/logout" onClick={(e) => e.preventDefault()}>{t.logout}</a>
//           </div>
//         </header>

//         <div id="chat-window" ref={chatRef}>
//           {/* Dono models ke liye loader check */}
//           {(language === 'hi' ? isModelLoading : !isEnglishTTSReady) && (
//             <div className="model-loader">{language === 'hi' ? 'Hindi' : 'English'} Voice Loading... Please wait</div>
//           )}
          
//           {messages.length === 0 ? (
//             <div id="landing-container">
//               <div className="welcome-text"><h1 className="gradient-text">{t.hiGuest}</h1><h2>{selectedRole ? t.assistantHello : t.selectRole}</h2></div>
//               {!selectedRole ? (
//                 <div className="role-cards">
//                   {roleOptions(language).map((role) => (
//                     <button key={role.key} className="role-card" onClick={() => handleRoleSelect(role.key)}><h3>{role.label}</h3><p>{role.description}</p></button>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="quick-cards">
//                   {quickPrompts(language).map((p) => (
//                     <div key={p.text} className="card" onClick={() => sendMessage(p.text, false)}><p>{p.text}</p><span className="card-icon">{p.icon}</span></div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           ) : messages.map(renderBubble)}
//         </div>

//         <div className="input-container">
//           <div className="input-bar">
//             <label htmlFor="file-upload" className="icon-btn" title="Add file"><FiPaperclip /><input type="file" id="file-upload" style={{ display: 'none' }} /></label>
//             <input type="text" id="user-input" placeholder={selectedRole ? t.askAnything : t.selectRoleFirst} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage(input, false)} disabled={!selectedRole} />
            
//             {/* Audio Stop Button Logic */}
//             {(isTTSPlaying || sharedAudioPlayer.isPlaying) ? (
//               <button className="icon-btn stop-btn" onClick={stopSpeaking} title="Stop Reading"><FiSquare style={{ color: 'red' }} /></button>
//             ) : (
//               <button className={`icon-btn mic-btn ${isListening ? 'mic-btn-active' : ''}`} onClick={handleVoice} title={isListening ? t.stopVoice : t.voiceInput} disabled={!selectedRole || loading}>
//                 {isListening ? <FiMicOff /> : <FiMic />}
//               </button>
//             )}
            
//             <button className="send-btn" onClick={() => sendMessage(input, false)} disabled={!selectedRole || loading || !input.trim()}><IoSend /><span>{t.send}</span></button>
//           </div>
//         </div>
//       </main>
//     </div>
//   )
// }




import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import { FiMic, FiGlobe, FiChevronLeft, FiCheckCircle, FiVolume2, FiBookOpen, FiUsers, FiBriefcase } from 'react-icons/fi';
import { IoSend } from 'react-icons/io5';
import { usePiper } from './hooks/text-to-speech_hook';
import { TTSLogic, sharedAudioPlayer, cleanTextForTTS } from "speech-to-speech";
import { MascotClips } from './components/MascotClips';

// --- Translations & Content ---
const translations = {
  en: {
    navGurukul: 'AI ✨', hiGuest: 'Hi Guest user,', selectRole: 'Please select your role to continue your botanical journey.', 
    startBtn: 'Start Chatting', loading: 'Loading Voices...', back: 'Back', 
    student: 'Student', studentDesc: 'Simple, clear and step-by-step admission help.',
    parent: 'Parent', parentDesc: 'Safety, eligibility and outcomes with trust-focused guidance.',
    partner: 'Partner', partnerDesc: 'Professional info for NGO, government and teachers.',
    testMic: 'Test Microphone', testSpk: 'Test Speaker', micOk: 'Mic Access Granted', spkOk: 'Sound Working?',
    askAnything: 'Ask AI anything...',
    whatIsNavGurukul: 'What is NavGurukul?',
    admissionProcess: 'Tell me about admission process',
    successStories: 'Show me success stories',
    etiocracy: 'Explain Etiocracy'
  },
  hi: {
    navGurukul: 'AI ✨', hiGuest: 'नमस्ते उपयोगकर्ता,', selectRole: 'जारी रखने के लिए कृपया अपनी भूमिका चुनें।',
    startBtn: 'बातचीत शुरू करें', loading: 'आवाज़ें लोड हो रही हैं...', back: 'पीछे', 
    student: 'छात्र', studentDesc: 'सरल, स्पष्ट और चरण-दर-चरण प्रवेश सहायता।',
    parent: 'माता-पिता', parentDesc: 'सुरक्षा, पात्रता और विश्वास-केंद्रित मार्गदर्शन।',
    partner: 'भागीदार', partnerDesc: 'एनजीओ, सरकार और शिक्षकों के लिए पेशेवर जानकारी।',
    testMic: 'माइक टेस्ट करें', testSpk: 'स्पीकर टेस्ट करें', micOk: 'माइक चालू है', spkOk: 'आवाज़ आई?',
    askAnything: 'AI से कुछ भी पूछें...',
    whatIsNavGurukul: 'NavGurukul क्या है?',
    admissionProcess: 'प्रवेश प्रक्रिया के बारे में बताएं',
    successStories: 'सफलता की कहानियां दिखाएं',
    etiocracy: 'Etiocracy समझाएं'
  },
  mr: {
    navGurukul: 'AI ✨', hiGuest: 'नमस्कार वापरकर्ता,', selectRole: 'पुढे जाण्यासाठी कृपया तुमची भूमिका निवडा.',
    startBtn: 'चॅट सुरू करा', loading: 'आवाज लोड होत आहेत...', back: 'मागे',
    student: 'विद्यार्थी', studentDesc: 'सोपे, स्पष्ट आणि टप्प्याटप्प्याने प्रवेश मार्गदर्शन.',
    parent: 'पालक', parentDesc: 'सुरक्षा, पात्रता आणि विश्वासावर आधारित मार्गदर्शन.',
    partner: 'भागीदार', partnerDesc: 'एनजीओ, सरकार आणि शिक्षकांसाठी व्यावसायिक माहिती.',
    testMic: 'माइक चाचणी', testSpk: 'स्पीकर चाचणी', micOk: 'माइक सुरू आहे', spkOk: 'आवाज येतोय?',
    askAnything: 'AI ला काहीही विचारा...',
    whatIsNavGurukul: 'NavGurukul म्हणजे काय?',
    admissionProcess: 'प्रवेश प्रक्रियेबद्दल सांगा',
    successStories: 'यशोगाथा दाखवा',
    etiocracy: 'Etiocracy समजावून सांगा'
  }
};

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'mr', label: 'मराठी' }
];

const quickPrompts = (lang) => ([
  { text: (translations[lang] || translations.en).whatIsNavGurukul, icon: '🏫' },
  { text: (translations[lang] || translations.en).admissionProcess, icon: '📝' },
  { text: (translations[lang] || translations.en).successStories, icon: '🌟' },
  { text: (translations[lang] || translations.en).etiocracy, icon: '💡' }
]);

export default function App() {
  const [appStage, setAppStage] = useState('selection'); 
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('en'); 
  const [micTested, setMicTested] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const roleMenuRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const englishTTSRef = useRef(null);
  const [isEnglishTTSReady, setIsEnglishTTSReady] = useState(false);
  const t = translations[language] || translations.en;

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target)) {
        setShowRoleMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChatScroll = () => {
    if (!chatRef.current) return;
    const el = chatRef.current;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Keep auto-follow only if user is already near the latest message.
    shouldAutoScrollRef.current = distanceFromBottom < 120;
    setShowJumpToLatest(distanceFromBottom > 140);
  };

  const scrollToLatest = () => {
    if (!chatRef.current) return;
    shouldAutoScrollRef.current = true;
    chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
    setShowJumpToLatest(false);
  };

  // --- Auto Scroll Chat ---
  useEffect(() => {
    if (chatRef.current && shouldAutoScrollRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
      setShowJumpToLatest(false);
    }
  }, [messages]);

  const stopSpeaking = () => {
    resetTTS();
    sharedAudioPlayer.stopAndClearQueue();
  };

  // --- Speak Logic ---
  const speakText = async (text) => {
    if (language === 'en' && isEnglishTTSReady) {
      const sentences = cleanTextForTTS(text).split(/(?<=[.!?।])\s+/);
      for (const s of sentences) {
        const res = await englishTTSRef.current.synthesize(s);
        sharedAudioPlayer.addAudioIntoQueue(res.audio, res.sampleRate);
      }
    } else if ((language === 'hi' || language === 'mr') && isReady) {
      const sentences = text.replace(/[*#\-_]/g, " ").match(/[^.!?।\n]+[.!?।\n]+/g) || [text];
      sentences.forEach(s => speak(s.trim()));
    }
  };

  // --- Send Message Logic ---
  const sendMessage = async (queryText = input, wasVoice = false) => {
    const normalizedQuery = queryText.trim();
    if (!normalizedQuery || loading) return;

    stopSpeaking();

    const aiMessageId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // User Message
    setMessages(prev => [
      ...prev,
      { role: 'User', content: normalizedQuery },
      { id: aiMessageId, role: 'AI', content: '...' }
    ]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: normalizedQuery,
          role: selectedRole, 
          language,
          history: messages.slice(-5).map(m => `${m.role}: ${m.content}`).join("\n") 
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        setMessages(prev => prev.map((m) => (
          m.id === aiMessageId
            ? { ...m, content: errText || 'Server error. Please try again.' }
            : m
        )));
        return;
      }

      if (!res.body) {
        const fallbackText = await res.text();
        setMessages(prev => prev.map((m) => (
          m.id === aiMessageId
            ? { ...m, content: fallbackText || 'No response received from server.' }
            : m
        )));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });

        setMessages(prev => prev.map((m) => (
          m.id === aiMessageId ? { ...m, content: fullResponse } : m
        )));
      }

      fullResponse += decoder.decode();

      if (!fullResponse.trim()) {
        setMessages(prev => prev.map((m) => (
          m.id === aiMessageId
            ? { ...m, content: 'Empty response. Please try again.' }
            : m
        )));
      }
      
      if (wasVoice) speakText(fullResponse);

    } catch (e) {
      console.error("Fetch Error:", e);
      setMessages(prev => prev.map((m) => (
        m.id === aiMessageId
          ? { ...m, content: 'Cannot connect to backend. Start Flask server on port 5000 and try again.' }
          : m
      )));
    } finally {
      setLoading(false);
    }
  };

  // --- Voice Input Logic ---
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser does not support Speech Recognition.");
    
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => sendMessage(e.results[0][0].transcript, true);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const resetChatState = () => {
    stopSpeaking();
    setMessages([]);
    setInput('');
    setLoading(false);
    setIsListening(false);
    setShowJumpToLatest(false);
    shouldAutoScrollRef.current = true;
  };

  const handleSelectRoleAction = () => {
    resetChatState();
    setMicTested(false);
    setAppStage('selection');
    setShowRoleMenu(false);
  };

  const handleLogout = () => {
    resetChatState();
    setSelectedRole('');
    setMicTested(false);
    setAppStage('selection');
    setShowRoleMenu(false);
  };

  const handleRolePick = (role) => {
    resetChatState();
    setSelectedRole(role);
    setMicTested(false);
    setShowRoleMenu(false);
    setAppStage('setup');
  };

  return (
    <div className="zoe-container">
      <header className="zoe-header">
        <h2 className="brand">{t.navGurukul}</h2>
        <div className="lang-select-wrap">
          <FiGlobe />
          <select className="lang-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {appStage === 'selection' && (
          <div className="header-actions">
            <button type="button" className="header-ghost-btn" onClick={() => setShowRoleMenu(v => !v)}>
              {selectedRole ? t[selectedRole] : 'Select role'}
            </button>
            <button type="button" className="header-ghost-btn" onClick={handleLogout}>Logout</button>
          </div>
        )}
      </header>

      {appStage !== 'selection' && (
        <div className="back-row">
          <button onClick={() => setAppStage('selection')} className="back-btn"><FiChevronLeft /> {t.back}</button>
        </div>
      )}

      {appStage === 'selection' && showRoleMenu && (
        <div className="role-menu" ref={roleMenuRef}>
          <button type="button" className="role-menu-item" onClick={() => handleRolePick('student')}>
            {t.student}
          </button>
          <button type="button" className="role-menu-item" onClick={() => handleRolePick('parent')}>
            {t.parent}
          </button>
          <button type="button" className="role-menu-item" onClick={() => handleRolePick('partner')}>
            {t.partner}
          </button>
        </div>
      )}

      {/* --- STAGE 1: SELECTION --- */}
      {appStage === 'selection' && (
        <div className="stage selection">
          <MascotClips />
          <h1>{t.hiGuest}</h1>
          <p>{t.selectRole}</p>
          <div className="role-grid">
            {['student', 'parent', 'partner'].map(role => (
              <div key={role} className="zoe-card" onClick={() => { setSelectedRole(role); setAppStage('setup'); }}>
                <h3>
                  <span className="role-icon-box">
                    {role === 'student' && <FiBookOpen />}
                    {role === 'parent' && <FiUsers />}
                    {role === 'partner' && <FiBriefcase />}
                  </span>
                  {translations[language][role]}
                </h3>
                <p>{translations[language][role + 'Desc']}</p>
              </div>
            ))}
          </div>
          <div className="selection-input-wrap">
            <div className="selection-input-pill">
              <input value="" readOnly placeholder="Select role first..." />
              <button type="button" disabled><IoSend /></button>
            </div>
            <p className="selection-helper">You must select a role before you can start interacting with the AI assistant.</p>
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
          <div className="quick-prompts-panel quick-prompts-top">
            <div className="quick-prompts-title">Tap a NavGurukul question to ask it</div>
            <div className="quick-prompts-row">
              {quickPrompts(language).map((prompt) => (
                <button
                  key={prompt.text}
                  type="button"
                  className="quick-prompt-chip"
                  onClick={() => {
                    setInput(prompt.text);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                >
                  <span className="quick-prompt-icon">{prompt.icon}</span>
                  <span>{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="chat-history" ref={chatRef} onScroll={handleChatScroll}>
            {messages.map((m, i) => (
              m.role === 'AI' ? (
                <div key={m.id || i} className="ai-msg-row">
                  <div className="ai-msg-avatar" aria-hidden="true">
                    <img src="/zoe-character.png" alt="" className="ai-msg-avatar-img" />
                  </div>
                  <div className="msg-bubble ai">
                    <div dangerouslySetInnerHTML={{ __html: marked.parse(m.content) }} />
                  </div>
                </div>
              ) : (
                <div key={m.id || i} className="msg-bubble user">
                  <div dangerouslySetInnerHTML={{ __html: marked.parse(m.content) }} />
                </div>
              )
            ))}
          </div>

          {showJumpToLatest && messages.length > 0 && (
            <button type="button" className="jump-latest-btn" onClick={scrollToLatest}>
              Jump to latest
            </button>
          )}

          <div className="zoe-input-section">
            <div className="input-pill">
              <input 
                ref={inputRef}
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && sendMessage(input, false)} 
                placeholder={t.askAnything} 
              />
              <button className={`mic-circle ${isListening ? 'active' : ''}`} onClick={handleVoiceInput}>
                <FiMic />
              </button>
              <button className="send-circle" onClick={() => sendMessage(input, false)}>
                <IoSend />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


