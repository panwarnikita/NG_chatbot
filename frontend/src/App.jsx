import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import { FiMenu, FiMic, FiMicOff, FiPaperclip, FiPlus, FiGlobe, FiSquare } from 'react-icons/fi'
import { IoSend } from 'react-icons/io5'
import speechService from './services/speechService'

const translations = {
  en: {
    navGurukul: 'NaviAI ✨',
    newChat: 'New Chat',
    noChatYet: 'No chats yet',
    role: 'Role',
    guest: 'Guest User',
    logout: 'Logout',
    hiGuest: 'Hi Guest User,',
    selectRole: 'Please select your role to continue.',
    assistantHello: 'I am the NavGurukul AI Assistant. How can I help you today?',
    selectRoleButton: 'Select Role',
    noHistory: 'No chats yet',
    thinking: 'Thinking...',
    askAnything: 'Ask NaviAI anything...',
    selectRoleFirst: 'Select role first...',
    voiceInput: 'Voice Input',
    stopVoice: 'Stop Voice Input',
    listening: 'Listening...',
    send: 'Send',
    student: 'Student',
    studentDesc: 'Simple, clear and step-by-step admission help.',
    parent: 'Parent',
    parentDesc: 'Safety, eligibility and outcomes with trust-focused guidance.',
    partner: 'Partner',
    partnerDesc: 'Professional info for NGO, government and teachers.',
    whatIsNavGurukul: 'What is NavGurukul?',
    admissionProcess: 'Tell me about Admission process',
    successStories: 'Show me success stories',
    etiocracy: 'Explain Etiocracy',
    language: 'Language'
  },
  hi: {
    navGurukul: 'NaviAI ✨',
    newChat: 'नई चैट',
    noChatYet: 'अभी कोई चैट नहीं',
    role: 'भूमिका',
    guest: 'अतिथि उपयोगकर्ता',
    logout: 'लॉग आउट',
    hiGuest: 'नमस्ते अतिथि उपयोगकर्ता,',
    selectRole: 'जारी रखने के लिए कृपया अपनी भूमिका चुनें।',
    assistantHello: 'मैं NavGurukul AI सहायक हूँ। मैं आपकी आज कैसे मदद कर सकता हूँ?',
    selectRoleButton: 'भूमिका चुनें',
    noHistory: 'अभी कोई चैट नहीं',
    thinking: 'सोच रहा हूँ...',
    askAnything: 'NaviAI से कुछ भी पूछें...',
    selectRoleFirst: 'पहले भूमिका चुनें...',
    voiceInput: 'वॉयस इनपुट',
    stopVoice: 'वॉयस इनपुट बंद करें',
    listening: 'सुन रहा हूँ...',
    send: 'भेजें',
    student: 'छात्र',
    studentDesc: 'सरल, स्पष्ट और चरण-दर-चरण प्रवेश सहायता।',
    parent: 'माता-पिता',
    parentDesc: 'सुरक्षा, पात्रता और विश्वास-केंद्रित मार्गदर्शन के साथ परिणाम।',
    partner: 'भागीदार',
    partnerDesc: 'एनजीओ, सरकार और शिक्षकों के लिए पेशेवर जानकारी।',
    whatIsNavGurukul: 'NavGurukul क्या है?',
    admissionProcess: 'प्रवेश प्रक्रिया के बारे में बताएं',
    successStories: 'सफलता की कहानियां दिखाएं',
    etiocracy: 'Etiocracy समझाएं',
    language: 'भाषा'
  },
  mr: {
    navGurukul: 'NaviAI ✨',
    newChat: 'नवीन गप्पा',
    noChatYet: 'अजून कधीही गप नाही',
    role: 'भूमिका',
    guest: 'अतिथी वापरकर्ता',
    logout: 'लॉग आउट करा',
    hiGuest: 'नमस्कार अतिथी वापरकर्ता,',
    selectRole: 'सुरू ठेवण्याचे नाते कृपया आपली भूमिका निवडा।',
    assistantHello: 'मी NavGurukul AI सहायक आहे. मी आज आपली कशी मदत करू शकतो?',
    selectRoleButton: 'भूमिका निवडा',
    noHistory: 'अजून कधीही गप नाही',
    thinking: 'विचार करत आहे...',
    askAnything: 'NaviAI ला कसेही विचारा...',
    selectRoleFirst: 'प्रथम भूमिका निवडा...',
    voiceInput: 'व्हॉईस इनपुट',
    stopVoice: 'व्हॉईस इनपुट थांबवा',
    listening: 'ऐकत आहे...',
    send: 'पाठवा',
    student: 'विद्यार्थी',
    studentDesc: 'सोपे, स्पष्ट आणि चरण-दर-चरण प्रवेश सहायता।',
    parent: 'पालक',
    parentDesc: 'सुरक्षा, पात्रता आणि विश्वास-केंद्रित मार्गदर्शन।',
    partner: 'भागीदार',
    partnerDesc: 'NGO, सरकार आणि शिक्षकांसाठी व्यावसायिक माहिती।',
    whatIsNavGurukul: 'NavGurukul म्हणजे काय?',
    admissionProcess: 'प्रवेश प्रक्रिया सांगा',
    successStories: 'यशस्वी कहाणी दाखवा',
    etiocracy: 'Etiocracy समजावून सांगा',
    language: 'भाषा'
  }
}

const quickPrompts = (lang) => [
  { text: translations[lang].whatIsNavGurukul, icon: '🏫' },
  { text: translations[lang].admissionProcess, icon: '📝' },
  { text: translations[lang].successStories, icon: '🌟' },
  { text: translations[lang].etiocracy, icon: '🤝' }
]

const roleOptions = (lang) => [
  {
    key: 'student',
    label: translations[lang].student,
    description: translations[lang].studentDesc
  },
  {
    key: 'parent',
    label: translations[lang].parent,
    description: translations[lang].parentDesc
  },
  {
    key: 'partner',
    label: translations[lang].partner,
    description: translations[lang].partnerDesc
  }
]

export default function App() {
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [currentChatId, setCurrentChatId] = useState(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false) // Tracking if AI is speaking
  const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'en')
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const chatRef = useRef(null)
  const languageDropdownRef = useRef(null)

  const userInitial = useMemo(() => 'G', [])
  const t = translations[language]

  useEffect(() => {
    localStorage.setItem('appLanguage', language)
  }, [language])

  // Initialize TTS on component mount
  useEffect(() => {
    speechService.initTTS().catch(err => console.error('TTS init error:', err))
    
    return () => {
      speechService.dispose()
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setShowLanguageDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const scrollToBottom = () => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }

  const addMessage = (role, content) => {
    setMessages((prev) => [...prev, { role, content }])
    setTimeout(scrollToBottom, 0)
  }

  // TTS Logic with Stop tracking - Using Piper TTS
  const stopSpeaking = () => {
    speechService.stopSpeaking();
    setIsSpeaking(false);
  };

  const speakText = async (text, lang) => {
    stopSpeaking();
    
    // Map language code to lang param for speechService
    const langMap = {
      'en': 'en',
      'hi': 'hi',
      'mr': 'mr'
    };
    
    await speechService.speak(
      text, 
      langMap[lang] || 'en',
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const sendMessage = async (presetQuery, wasVoice = false) => {
    const queryText = (presetQuery ?? input).trim();
    if (!queryText || loading || !selectedRole) return;

    stopSpeaking(); // Naya message send karte hi voice stop karein
    addMessage('User', queryText);
    setInput(''); // Always clear input after sending message
    setLoading(true);

    const langInstructions = {
        en: "Reply strictly in English.",
        hi: "Reply strictly in Hindi using Devanagari script (हिंदी) only. Do NOT use English alphabets or Hinglish.",
        mr: "Reply strictly in Marathi using Devanagari script (मराठी) only. Do NOT use English alphabets."
    };

    const finalPrompt = `IMPORTANT: ${langInstructions[language]}\n\nUser Message: ${queryText}`;

    try {
      const res = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: finalPrompt, chat_id: currentChatId, role: selectedRole })
      });
      const data = await res.json();

      addMessage('AI', data.response || 'No response from server');
      
      if (wasVoice) {
        speakText(data.response, language);
      }

      if (!currentChatId && data.chat_id) {
        setCurrentChatId(data.chat_id);
        setHistory((prev) => [{ id: data.chat_id, title: queryText }, ...prev]);
      }
    } catch (error) {
      addMessage('AI', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVoice = () => {
    if (!selectedRole || loading) return;

    if (isListening) {
      speechService.stopSTT();
      setIsListening(false);
      return;
    }

    // Map language to Web Speech API format
    const langMap = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'mr': 'mr-IN'
    };

    speechService.startSTT(
      langMap[language] || 'en-IN',
      (transcript) => {
        if (transcript.trim()) {
          setIsListening(false);
          sendMessage(transcript, true);
        }
      },
      (error) => {
        console.error('STT Error:', error);
        setIsListening(false);
      }
    );
    
    setIsListening(true);
  }

  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setInput('');
    setSelectedRole('');
    stopSpeaking();
  }

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setSidebarOpen(true);
  }

  const renderBubble = (msg, idx) => {
    const isAI = msg.role === 'AI'
    return (
      <div key={idx} className={`message-wrapper ${isAI ? '' : 'user-wrapper'}`}>
        <div className={`avatar ${isAI ? 'ai-avatar' : 'user-avatar'}`}>{isAI ? 'Navi' : userInitial}</div>
        <div className={`bubble ${isAI ? 'ai-bubble' : 'user-bubble'}`} 
             dangerouslySetInnerHTML={{ __html: isAI ? marked.parse(msg.content || '') : msg.content }} />
      </div>
    )
  }

  return (
  <div className="app-layout">
    {/* Sidebar Block: Yahan humne toggle button andar daal diya hai */}
    <aside id="sidebar" className={sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="sidebar-brand">{t.navGurukul}</div>
        {/* Sidebar ke andar wala close button */}
        <button 
          className="icon-btn" 
          onClick={() => setSidebarOpen(false)} 
          style={{ color: 'white', fontSize: '20px' }}
        >
          <FiMenu />
        </button>
      </div>

      <button className="new-chat-btn" onClick={startNewChat}><FiPlus /> {t.newChat}</button>
      <div className="history-list">
        {history.length === 0 && <div className="history-empty">{t.noHistory}</div>}
        {history.map((item) => (
          <div key={item.id} className="history-card" onClick={() => loadThread(item.id)}>{(item.title || '').slice(0, 50)}...</div>
        ))}
      </div>
    </aside>

    <main id="main-content">
      <header>
        <div className="header-left">
          {/* Header wala button: Ye sirf tab dikhega jab sidebar band ho */}
          {!sidebarOpen && selectedRole && (
            <button className="toggle-sidebar-btn" onClick={() => setSidebarOpen(true)}>
              <FiMenu />
            </button>
          )}
          <div className="brand-name-header">NaviAI <span>✨</span></div>
        </div>
        
        {/* ... baaki header ka code (Language selection, user-info) same rahega ... */}
        <div className="header-right">
          <div className="language-selector" ref={languageDropdownRef}>
            <button className="language-toggle" onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}><FiGlobe /> {language === 'en' ? 'English' : language === 'hi' ? 'हिंदी' : 'मराठी'}</button>
            {showLanguageDropdown && (
              <div className="language-dropdown">
                {['en', 'hi', 'mr'].map(l => (
                  <button key={l} className={`language-option ${language === l ? 'active' : ''}`} onClick={() => {setLanguage(l); setShowLanguageDropdown(false)}}>
                    {l === 'en' ? '🇬🇧 English' : l === 'hi' ? '🇮🇳 हिंदी' : '🇮🇳 मराठी'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="user-info">
          <span className="role-badge">{roleOptions(language).find(r => r.key === selectedRole)?.label || t.selectRoleButton}</span>
          <a href="/logout">{t.logout}</a>
        </div>
      </header>

      {/* ... baaki ka chat-window aur input-container same rahega ... */}

        <div id="chat-window" ref={chatRef}>
          {messages.length === 0 ? (
            <div id="landing-container">
              <div className="welcome-text"><h1 className="gradient-text">{t.hiGuest}</h1><h2>{selectedRole ? t.assistantHello : t.selectRole}</h2></div>
              {!selectedRole ? (
                <div className="role-cards">
                  {roleOptions(language).map((role) => (
                    <button key={role.key} className="role-card" onClick={() => handleRoleSelect(role.key)}><h3>{role.label}</h3><p>{role.description}</p></button>
                  ))}
                </div>
              ) : (
                <div className="quick-cards">
                  {quickPrompts(language).map((p) => (
                    <div key={p.text} className="card" onClick={() => sendMessage(p.text, false)}><p>{p.text}</p><span className="card-icon">{p.icon}</span></div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map(renderBubble)}
              {loading && <div className="message-wrapper"><div className="avatar ai-avatar">Navi</div><div className="bubble ai-bubble italic">{t.thinking}</div></div>}
            </>
          )}
        </div>

        <div className="input-container">
          <div className="input-bar">
            <label htmlFor="file-upload" className="icon-btn" title="Add file"><FiPaperclip /><input type="file" id="file-upload" style={{ display: 'none' }} /></label>
            <input type="text" id="user-input" placeholder={selectedRole ? t.askAnything : t.selectRoleFirst} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage(input, false)} disabled={!selectedRole} />
            
            {/* AGAR AI BOL RAHA HAI TOH STOP BUTTON DIKHEGA, WARNA MIC ICON */}
            {isSpeaking ? (
              <button 
                className="icon-btn stop-btn" 
                onClick={stopSpeaking} 
                title="Stop Reading"
              >
                <FiSquare style={{ color: 'red' }} />
              </button>
            ) : (
              <button 
                className={`icon-btn mic-btn ${isListening ? 'mic-btn-active' : ''}`} 
                onClick={handleVoice} 
                title={isListening ? t.stopVoice : t.voiceInput} 
                disabled={!selectedRole || loading}
              >
                {isListening ? <FiMicOff /> : <FiMic />}
              </button>
            )}

            <button className="send-btn" onClick={() => sendMessage(input, false)} disabled={!selectedRole || loading || !input.trim()}><IoSend /><span>{t.send}</span></button>
          </div>
        </div>
      </main>
    </div>
  )
}