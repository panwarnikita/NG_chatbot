import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import { FiMenu, FiMic, FiMicOff, FiPaperclip, FiPlus } from 'react-icons/fi'
import { IoSend } from 'react-icons/io5'

const quickPrompts = [
  { text: 'What is NavGurukul?', icon: '🏫' },
  { text: 'Tell me about Admission process', icon: '📝' },
  { text: 'Show me success stories', icon: '🌟' },
  { text: 'Explain Etiocracy', icon: '🤝' }
]

const roleOptions = [
  {
    key: 'student',
    label: 'Student',
    description: 'Simple, clear and step-by-step admission help.'
  },
  {
    key: 'parent',
    label: 'Parent',
    description: 'Safety, eligibility and outcomes with trust-focused guidance.'
  },
  {
    key: 'partner',
    label: 'Partner',
    description: 'Professional info for NGO, government and teachers.'
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
  const chatRef = useRef(null)
  const recognitionRef = useRef(null)

  const userInitial = useMemo(() => 'G', [])

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

  const selectedRoleLabel = roleOptions.find((role) => role.key === selectedRole)?.label || 'Select Role'

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
        <div className="sidebar-brand">NaviAI ✨</div>
        <button className="new-chat-btn" onClick={startNewChat}><FiPlus /> New Chat</button>
        <div className="history-list">
          {history.length === 0 && <div className="history-empty">No chats yet</div>}
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
          <div className="user-info">
            <span className="role-badge">Role: {selectedRoleLabel}</span>
            <span>Guest User</span>
            <a href="/logout">Logout</a>
          </div>
        </header>

        <div id="chat-window" ref={chatRef}>
          {messages.length === 0 ? (
            <div id="landing-container">
              <div className="welcome-text">
                <h1 className="gradient-text">Hi Guest User,</h1>
                <h2>
                  {selectedRole
                    ? 'I am the NavGurukul AI Assistant. How can I help you today?'
                    : 'Please select your role to continue.'}
                </h2>
              </div>

              {!selectedRole ? (
                <div className="role-cards">
                  {roleOptions.map((role) => (
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
                  {quickPrompts.map((prompt) => (
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
                  <div className="bubble ai-bubble italic">Thinking...</div>
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
              placeholder={selectedRole ? 'Ask NaviAI anything...' : 'Select role first...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={!selectedRole}
            />

            <button
              className={`icon-btn mic-btn ${isListening ? 'mic-btn-active' : ''}`}
              type="button"
              onClick={handleVoice}
              title={isListening ? 'Stop Voice Input' : 'Voice Input'}
              disabled={!selectedRole || loading}
            >
              {isListening ? <FiMicOff /> : <FiMic />}
            </button>

            {isListening && <span className="mic-status">Listening...</span>}

            <button className="send-btn" type="button" onClick={() => sendMessage()} disabled={!selectedRole || loading}>
              <IoSend />
              <span>Send</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
