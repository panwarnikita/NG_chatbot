import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import { FiMenu, FiMic, FiMicOff, FiPaperclip, FiPlus, FiGlobe } from 'react-icons/fi'
import { IoSend } from 'react-icons/io5'

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
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'en'
  })
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const chatRef = useRef(null)
  const recognitionRef = useRef(null)
  const languageDropdownRef = useRef(null)

  const userInitial = useMemo(() => 'G', [])
  const t = translations[language]

  // Save language preference
  useEffect(() => {
    localStorage.setItem('appLanguage', language)
  }, [language])

  // Close dropdown when clicking outside
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
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }

  const addMessage = (role, content) => {
    setMessages((prev) => [...prev, { role, content }])
    setTimeout(scrollToBottom, 0)
  }

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const loadThread = async (chatId) => {
    if (!chatId) return
    try {
      const res = await fetch(`/get_chat/${chatId}`)
      const data = await res.json()
      if (!data.messages) return
      const mapped = data.messages.map((msg) => ({
        role: msg.role === 'user' ? 'User' : 'AI',
        content: msg.content
      }))
      setCurrentChatId(chatId)
      setSelectedRole(data.role || 'student')
      setMessages(mapped)
      setTimeout(scrollToBottom, 0)
    } catch (error) {
      console.error('History load error:', error)
    }
  }

  const sendMessage = async (presetQuery) => {
    const query = (presetQuery ?? input).trim()
    if (!query || loading || !selectedRole) return

    addMessage('User', query)
    if (!presetQuery) setInput('')
    setLoading(true)

    try {
      const res = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, chat_id: currentChatId, role: selectedRole })
      })
      const data = await res.json()

      addMessage('AI', data.response || 'No response from server')
      if (!currentChatId && data.chat_id) {
        setCurrentChatId(data.chat_id)
        setHistory((prev) => [{ id: data.chat_id, title: query }, ...prev])
      }
    } catch (error) {
      addMessage('AI', `Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleVoice = () => {
    if (!selectedRole || loading) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Your browser does not support Speech Recognition.')
      return
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.continuous = false

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      const transcript = (event.results?.[0]?.[0]?.transcript || '').trim()
      if (transcript) setInput(transcript)
    }

    recognition.onerror = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const startNewChat = () => {
    setCurrentChatId(null)
    setMessages([])
    setInput('')
    setSelectedRole('')
  }

  const handleRoleSelect = (role) => {
    setSelectedRole(role)
    setSidebarOpen(true)
  }

  const selectedRoleLabel = roleOptions(language).find((role) => role.key === selectedRole)?.label || t.selectRoleButton

  const renderBubble = (msg, idx) => {
    const isAI = msg.role === 'AI'
    return (
      <div key={idx} className={`message-wrapper ${isAI ? '' : 'user-wrapper'}`}>
        <div className={`avatar ${isAI ? 'ai-avatar' : 'user-avatar'}`}>
          {isAI ? 'NaviAI' : userInitial}
        </div>
        <div
          className={`bubble ${isAI ? 'ai-bubble' : 'user-bubble'}`}
          dangerouslySetInnerHTML={{
            __html: isAI ? marked.parse(msg.content || '') : msg.content
          }}
        />
      </div>
    )
  }

  return (
    <div className="app-layout">
      <aside id="sidebar" className={sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}>
        <div className="sidebar-brand">{t.navGurukul}</div>
        <button className="new-chat-btn" onClick={startNewChat}><FiPlus /> {t.newChat}</button>
        <div className="history-list">
          {history.length === 0 && <div className="history-empty">{t.noHistory}</div>}
          {history.map((item) => (
            <div key={item.id} className="history-card" onClick={() => loadThread(item.id)}>
              {(item.title || '').slice(0, 50)}...
            </div>
          ))}
        </div>
      </aside>

      <main id="main-content">
        <header>
          <div className="header-left">
            {selectedRole && (
              <button 
                className="toggle-sidebar-btn" 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                <FiMenu />
              </button>
            )}
            <div className="brand-name-header">NaviAI <span>✨</span></div>
          </div>
          <div className="header-right">
            <div className="language-selector" ref={languageDropdownRef}>
              <button 
                className="language-toggle"
                title={t.language}
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              >
                <FiGlobe /> {language.toUpperCase()}
              </button>
              {showLanguageDropdown && (
                <div className="language-dropdown">
                  <button 
                    className={`language-option ${language === 'en' ? 'active' : ''}`}
                    onClick={() => {
                      setLanguage('en')
                      setShowLanguageDropdown(false)
                    }}
                  >
                    🇬🇧 English
                  </button>
                  <button 
                    className={`language-option ${language === 'hi' ? 'active' : ''}`}
                    onClick={() => {
                      setLanguage('hi')
                      setShowLanguageDropdown(false)
                    }}
                  >
                    🇮🇳 हिंदी (Hindi)
                  </button>
                  <button 
                    className={`language-option ${language === 'mr' ? 'active' : ''}`}
                    onClick={() => {
                      setLanguage('mr')
                      setShowLanguageDropdown(false)
                    }}
                  >
                    🇮🇳 मराठी (Marathi)
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="user-info">
            <span className="role-badge">{t.role}: {selectedRoleLabel}</span>
            <span>{t.guest}</span>
            <a href="/logout">{t.logout}</a>
          </div>
        </header>

        <div id="chat-window" ref={chatRef}>
          {messages.length === 0 ? (
            <div id="landing-container">
              <div className="welcome-text">
                <h1 className="gradient-text">{t.hiGuest}</h1>
                <h2>
                  {selectedRole
                    ? t.assistantHello
                    : t.selectRole}
                </h2>
              </div>

              {!selectedRole ? (
                <div className="role-cards">
                  {roleOptions(language).map((role) => (
                    <button
                      key={role.key}
                      className="role-card"
                      type="button"
                      onClick={() => handleRoleSelect(role.key)}
                    >
                      <h3>{role.label}</h3>
                      <p>{role.description}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="quick-cards">
                  {quickPrompts(language).map((prompt) => (
                    <div key={prompt.text} className="card" onClick={() => sendMessage(prompt.text)}>
                      <p>{prompt.text}</p>
                      <span className="card-icon">{prompt.icon}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map(renderBubble)}
              {loading && (
                <div className="message-wrapper">
                  <div className="avatar ai-avatar">NaviAI</div>
                  <div className="bubble ai-bubble italic">{t.thinking}</div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="input-container">
          <div className="input-bar">
            <label htmlFor="file-upload" className="icon-btn" title="Add file">
              <FiPaperclip />
              <input type="file" id="file-upload" style={{ display: 'none' }} />
            </label>

            <input
              type="text"
              id="user-input"
              placeholder={selectedRole ? t.askAnything : t.selectRoleFirst}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={!selectedRole}
            />

            <button
              className={`icon-btn mic-btn ${isListening ? 'mic-btn-active' : ''}`}
              type="button"
              onClick={handleVoice}
              title={isListening ? t.stopVoice : t.voiceInput}
              disabled={!selectedRole || loading}
            >
              {isListening ? <FiMicOff /> : <FiMic />}
            </button>

            {isListening && <span className="mic-status">{t.listening}</span>}

            <button className="send-btn" type="button" onClick={() => sendMessage()} disabled={!selectedRole || loading}>
              <IoSend />
              <span>{t.send}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
