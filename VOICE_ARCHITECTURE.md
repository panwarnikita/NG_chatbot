# Architecture & Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                           │
│                    (React App @ :5173)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ App.jsx Integration                                  │   │
│  │ ├─ useSTT Hook (Speech-to-Text)                     │   │
│  │ ├─ useTTS Hook (Text-to-Speech)                     │   │
│  │ └─ speechService Config                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┴─────────────────┐
        ↓                                   ↓
┌──────────────────┐          ┌──────────────────────────┐
│  BROWSER APIs    │          │  BROWSER WASM (Local)    │
│  ────────────    │          │  ─────────────────────   │
│ Web Speech API   │          │  Piper TTS WASM          │
│ (STT)            │          │  ├─ piper_worker.js      │
│                  │          │  ├─ piper_phonemize.js   │
│ Recognizes:      │          │  ├─ piper_phonemize.wasm │
│ ✓ Hindi (hi-IN)  │          │  └─ ONNX Runtime         │
│ ✓ English        │          │                          │
│ ✓ Marathi        │          │ Generates Audio:         │
└──────────────────┘          │ ✓ Hindi voice            │
         ↓                     │ ✓ English voice          │
    Text: "बताओ"             └──────────────────────────┘
         ↓                            ↓
         └─────────────┬──────────────┘
                       ↓
        ┌──────────────────────────────┐
        │   FLASK BACKEND (@ :5000)    │
        │   ────────────────────────   │
        │  /ask endpoint:              │
        │                              │
        │  Input: "बताओ"              │
        │  Language: Hindi             │
        │  Role: Student               │
        │        ↓                      │
        │  LangChain + NVIDIA LLM      │
        │  MongoDB Vector Store        │
        │        ↓                      │
        │  Output: "NavGurukul एक..." │
        └──────────────────────────────┘
                       ↓
                  Text response
                       ↓
                   TTS Process
                       ↓
                  User hears!
```

---

## User Voice Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER JOURNEY                              │
└─────────────────────────────────────────────────────────────┘

START
  │
  ↓
┌─────────────────────┐
│ Select Role         │  (Student/Parent/Partner)
└────────────┬────────┘
             │
             ↓
  ┌──────────────────────────────┐
  │ Click 🎤 Microphone Button   │
  └────────────┬─────────────────┘
               │
               ↓
  ┌────────────────────────────────────────┐
  │ Browser Listens (Web Speech API)       │
  │ [Status: 🎤 Listening...]              │
  └────────────┬─────────────────────────────┘
               │
               ↓
  ┌────────────────────────────────────────┐
  │ User Speaks:                           │
  │ "NavGurukul के    प्रवेश के बारे में" │
  │ (Microphone actively listening)        │
  └────────────┬─────────────────────────────┘
               │
               ↓ (2-5 seconds speaking)
  ┌────────────────────────────────────────┐
  │ STT Converts to Text:                  │
  │ "NavGurukul के प्रवेश के बारे में"    │
  │ [Confidence: 95%]                      │
  └────────────┬─────────────────────────────┘
               │
               ↓ (0.5 sec processing)
  ┌────────────────────────────────────────┐
  │ Text sent to Backend                   │
  │ POST /ask HTTP Request                 │
  │ ├─ query: "NavGurukul के प्रवेश..."   │
  │ ├─ role: "student"                     │
  │ └─ language: "hi"                      │
  └────────────┬─────────────────────────────┘
               │
               ↓ (1-3 sec network)
  ┌────────────────────────────────────────┐
  │ Backend AI Processing                  │
  │ [LangChain → NVIDIA LLM → Response]    │
  │                                        │
  │ Response:                              │
  │ "NavGurukul में प्रवेश 3 चरणों में है:|"
  │ 1. आवेदन फॉर्म भरें...              │
  └────────────┬─────────────────────────────┘
               │
               ↓ (0.5 sec)
  ┌────────────────────────────────────────┐
  │ Text appears on screen                 │
  │ Message shows in chat bubble           │
  │ Status: TTS loading model (first time) │
  └────────────┬─────────────────────────────┘
               │
               ↓ (30-50 sec first time, <1 sec later)
  ┌────────────────────────────────────────┐
  │ TTS Model Loads (Piper WASM)           │
  │ Status: "Loading voice model: 85%"     │
  │ (Model cached in browser after 1st time)
  └────────────┬─────────────────────────────┘
               │
               ↓ (0 sec on subsequent loads)
  ┌────────────────────────────────────────┐
  │ TTS Generates Audio (Browser WASM)     │
  │ Input: "NavGurukul में प्रवेश..."   │
  │ Algorithm: Piper Neural Vocoder       │
  │ Format: MP3 Audio Buffer               │
  │ Time: 2-5 seconds                      │
  └────────────┬─────────────────────────────┘
               │
               ↓
  ┌────────────────────────────────────────┐
  │ Audio Plays in Browser                 │
  │ [🔊 Playing Hindi speech]              │
  │ Mic icon: 🔴 Pulsing (AI speaking)    │
  │ Duration: 3-8 seconds                  │
  └────────────┬─────────────────────────────┘
               │
               ↓
  ┌────────────────────────────────────────┐
  │ USER HEARS RESPONSE                    │
  │ User sees text + hears audio           │
  │ Clear, natural-sounding voice          │
  │ Complete answer delivered              │
  └────────────┬─────────────────────────────┘
               │
               ↓
  ┌────────────────────────────────────────┐
  │ Ready for next interaction             │
  │ User can:                              │
  │ ├─ Click 🎤 again to ask again        │
  │ ├─ Type a follow-up question           │
  │ └─ Switch language and repeat          │
  └────────────┬─────────────────────────────┘
               │
               ↓
              END

TOTAL TIME: ~5-8 seconds
```

---

## Component Relation Diagram

```
┌─────────────────────────────────────────────────┐
│              App.jsx (Main Component)           │
├─────────────────────────────────────────────────┤
│                                                 │
│  State Management:                              │
│  ├─ messages (chat history)                    │
│  ├─ selectedRole (user role)                   │
│  ├─ language (en/hi/mr)                        │
│  ├─ isListening (STT status)                   │
│  └─ isPlaying (TTS status)                     │
│                                                 │
│  Custom Hooks:                                  │
│  ├─ useSTT(config)                             │
│  │  ├─ Returns: {                              │
│  │  │   isListening,                           │
│  │  │   transcript,                            │
│  │  │   startListening,                        │
│  │  │   stopListening,                         │
│  │  │   resetTranscript                        │
│  │  │ }                                         │
│  │  └─ Uses: Web Speech API                    │
│  │                                             │
│  └─ useTTS(config)                             │
│     ├─ Returns: {                              │
│     │   speak,                                 │
│     │   isPlaying,                             │
│     │   isReady,                               │
│     │   isLoading,                             │
│     │   downloadProgress                       │
│     │ }                                         │
│     └─ Uses: Piper WASM in Worker              │
│                                                 │
│  Configuration:                                 │
│  └─ speechService (Config Provider)            │
│     ├─ getTTSConfig(voiceType)                 │
│     └─ getSTTConfig(language)                  │
│                                                 │
└─────────────────────────────────────────────────┘
         ↓
    ┌────┴────┬──────────────────┐
    ↓         ↓                  ↓
 useSTT    useTTS        speechService
  Hook      Hook            Config
```

---

## Data Flow Diagram

```
User Input (Voice)
      ↓
   ┌──────────────────────────────────────┐
   │  useSTT Hook Processing              │
   │  ├─ Web Speech API captures audio    │
   │  ├─ Converts to text                 │
   │  └─ Returns: transcript              │
   └──────────┬───────────────────────────┘
              ↓
        transcript = "बताओ"
              ↓
   ┌──────────────────────────────────────┐
   │  App.jsx useEffect Handler           │
   │  (Triggered when transcript changes) │
   └──────────┬───────────────────────────┘
              ↓
       sendMessage(transcript, true)
              ↓
   ┌──────────────────────────────────────┐
   │  Backend API Call                    │
   │  POST /ask                           │
   │  ├─ query: transcript                │
   │  ├─ role: selectedRole               │
   │  └─ chat_id: currentChatId           │
   └──────────┬───────────────────────────┘
              ↓
   ┌──────────────────────────────────────┐
   │  Flask Backend Processing            │
   │  ├─ LangChain + NVIDIA LLM           │
   │  ├─ Vector DB search                 │
   │  └─ Returns: response text           │
   └──────────┬───────────────────────────┘
              ↓
        response = "NavGurukul एक..."
              ↓
   ┌──────────────────────────────────────┐
   │  Frontend Handler                    │
   │  ├─ Display text in chat             │
   │  └─ Check: wasVoice = true?          │
   └──────────┬───────────────────────────┘
              ↓ (Yes, auto-speak)
   ┌──────────────────────────────────────┐
   │  useTTS Hook: speak(response)        │
   │  ├─ Load model (if first time)       │
   │  ├─ Generate audio in browser        │
   │  ├─ Play to user                     │
   │  └─ Return: audio blob                │
   └──────────┬───────────────────────────┘
              ↓
        🔊 User hears response!
```

---

## File Dependencies

```
App.jsx
 ├─ useSTT (from ./hooks/useSTT.jsx)
 ├─ useTTS (from ./hooks/useTTS.jsx)
 ├─ speechService (from ./services/speechService.js)
 └─ react-icons (external library)

useTTS.jsx
 ├─ react hooks (useState, useEffect, useRef, useCallback)
 ├─ getCachedOrFetch (from ../utils/modelCache.js)
 └─ Web Worker (/public/piper-wasm/piper_worker.js)

modelCache.js
 ├─ Cache API (browser native)
 └─ fetch() (browser native)

speechService.js
 ├─ Configuration only
 └─ No actual implementation (hooks do the work)

piper_worker.js
 ├─ WASM modules (/public/piper-wasm/*)
 ├─ ONNX models (/public/models/*)
 └─ ONNX Runtime Web
```

---

## State Flow Diagram

```
Language Change
      ↓
  setLanguage('hi')
      ↓
  useEffect triggers
      ↓
  setVoiceType('hindi')
      ↓
  ttsConfig changes
      ↓
  useTTS re-initializes
      ↓
  New model loads
      ↓
  Ready to speak Hindi

Voice Input
      ↓
  User clicks mic
      ↓
  startListening()
      ↓
  isListening = true
      ↓
  UI shows "Listening..."
      ↓
  User speaks
      ↓
  transcript updates
      ↓
  useEffect triggers
      ↓
  sendMessage(transcript, true)
      ↓
  isListening = false (auto)
      ↓
  UI shows message
      ↓
  Backend responds
      ↓
  speak(response) called
      ↓
  isPlaying = true
      ↓
  TTS generates audio
      ↓
  Audio plays
      ↓
  isPlaying = false
      ↓
  UI back to normal
```

---

## Performance Timeline

```
Start: User clicks 🎤
│
├─ 0-2 sec: User speaks
│
├─ 2-2.5 sec: STT processing
│
├─ 2.5-0.5 sec: Send to backend
│
├─ 3-5.5 sec: Backend AI processing
│
├─ 5.5-6 sec: Display text
│
├─ 6 sec: Check for voice response (YES!)
│
├─ 6-6.5 sec: Model load check
│
│  First time:
│  ├─ 6-36 sec: Download & cache model
│  └─ 36+ sec: Generate audio
│
│  Subsequent times:
│  ├─ 6-6.1 sec: Load from cache
│  └─ 6.1-8 sec: Generate audio
│
├─ ~8 sec: Play audio
│
├─ 8-13 sec: Audio playback (varies with response length)
│
└─ 13+ sec: Ready for next input

Total typical time: 5-8 seconds (after first load)
```

---

## Browser API Usage

```
┌─────────────────────────────────────┐
│       Browser APIs Utilized         │
├─────────────────────────────────────┤
│                                     │
│ Web Speech API                      │
│ └─ window.SpeechRecognition         │
│    └─ Recognizes speech to text     │
│                                     │
│ Web Workers                         │
│ └─ new Worker()                     │
│    └─ Runs piper_worker.js          │
│       └─ Executes WASM              │
│                                     │
│ Cache API                           │
│ └─ caches.open()                    │
│    └─ Stores ONNX models            │
│    └─ Instant load on reuse         │
│                                     │
│ Audio Interface                     │
│ └─ new Audio()                      │
│    └─ Plays generated audio         │
│                                     │
│ IndexedDB (via Cache API)           │
│ └─ Persistent model storage         │
│                                     │
└─────────────────────────────────────┘
```

---

## Technology Stack

```
Frontend Layer:
│
├─ React 18.3 (UI Framework)
│  └─ Functional components with hooks
│
├─ Vite 5.4 (Build tool)
│  └─ Fast dev server with HMR
│
├─ Tailwind CSS (if used)
│  └─ Styling
│
└─ React Icons (UI Icons)
   └─ 🎤 Mic button, etc.

Voice Layer:
│
├─ Web Speech API (STT)
│  └─ Browser native
│
├─ Piper WASM (TTS)
│  └─ Neural vocoder
│
├─ ONNX Runtime Web
│  └─ Executes ONNX models
│
└─ Cache API (Storage)
   └─ Model persistence

Backend Layer:
│
├─ Flask (Web framework)
│
├─ LangChain (LLM framework)
│  └─ Prompt management
│
├─ NVIDIA API (LLM)
│  └─ DeepSeek-V3 model
│
└─ MongoDB (Database)
   └─ Chat history & RAG
```

---

## Error Handling Flow

```
User Action
│
├─ STT Fails?
│  └─ Show error message
│  └─ Suggest microphone check
│
├─ Network Fails?
│  └─ Show "Connection error"
│  └─ Retry option
│
├─ Model Download Fails?
│  └─ Show "Model load failed"
│  └─ Check console for details
│
├─ TTS Generation Fails?
│  └─ Show text only (no voice)
│  └─ Continue chat normally
│
├─ Backend Error?
│  └─ Display error message
│  └─ Show as AI error response
│
└─ Graceful Degradation
   └─ Voice features optional
   └─ Text chat always works
```

---

## Browser Compatibility

```
✅ Excellent Support:
├─ Chrome/Chromium (99+)
├─ Edge (99+)
├─ Firefox (88+)
├─ Safari (14+)
├─ Opera (85+)
└─ Brave (1.35+)

⚠️  Limited Support:
├─ Mobile browsers (some features)
└─ Older versions (need update)

❌ Not Supported:
├─ Internet Explorer
└─ Ancient browsers (<2020)

Key Requirements:
├─ HTTPS or localhost (for mic)
├─ Modern JavaScript (ES2015+)
├─ Web Workers support
├─ Cache API support
└─ AudioContext support
```

---

**These diagrams provide a comprehensive visual reference for understanding how voice features work in your NG_chatbot!**
