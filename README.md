# NG Chatbot - NavGurukul AI Assistant

A full-stack AI chatbot application for NavGurukul using FastAPI/Flask backend with React frontend. Powered by NVIDIA AI endpoints and Qdrant vector database for RAG (Retrieval-Augmented Generation).

## 🎯 Features

- **🎤 Voice Input (STT)**: Real-time speech-to-text for Hindi and English with browser Web Speech API
- **🔊 Voice Output (TTS)**: 
  - English: High-quality Piper WASM (en_US-hfc_female-medium)
  - Hindi: Local ONNX neural voices with multiple speaker options
  - Stop/Pause button to control playback
- **🎬 Dynamic Video Avatars**: Animated characters that respond to AI state:
  - 🎨 Idle: `ballbounce.mp4` animation
  - 🎤 Listening: `listening.mp4` when user speaks
  - 💬 Speaking: `speaking-edited.mp4` when AI responds
- **Role-Based AI Personalities**: Different responses for students, parents, and institutional partners
- **RAG System**: Semantic search over NavGurukul knowledge base using Qdrant + NVIDIA embeddings
- **Real-time Streaming**: Stream LLM responses chunk-by-chunk for instant feedback
- **Bilingual UI**: Full English/हिंदी support with language switcher
- **Fully Responsive Design**: Optimized for mobile (320px), tablet (480px), and desktop (1025px+)
- **Modern Tech Stack**: React 18 + Vite with Tailwind-style utilities
- **Stateless API**: No session storage, clean RESTful design with context passed per request
- **Language Enforcement**: Strict system prompts ensure responses stay in user's selected language

## 📋 Prerequisites

- Python 3.8+ (Backend)
- Node.js 16+ (Frontend)
- Qdrant Cloud account (for vector embeddings)
- NVIDIA API key (for LLM endpoints)
- Modern browser with Web Speech API support (for STT/TTS features)
- Microphone access (for voice input)
- Google OAuth credentials (optional, for authentication)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd NG_chatbot
```

### 2. Setup Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Setup Frontend

```bash
cd frontend

# Install npm dependencies
npm install
```

### 4. Environment Configuration

Create `.env` file in the root `NG_chatbot` directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in your credentials:
- `NVIDIA_API_KEY` - From NVIDIA AI Endpoints console
- `QDRANT_URL` - Your Qdrant Cloud instance URL
- `QDRANT_API_KEY` - Your Qdrant API key (read-only sufficient)
- `QDRANT_COLLECTION` - Vector collection name (default: navgurukul_docs)
- `FLASK_ENV` - Set to 'development' for local testing
- `PORT` - Backend port (default: 5000)

### 5. Run the Application

**Terminal 1 - Backend (from `backend/` directory):**
```bash
cd backend
python app.py
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend (from `frontend/` directory):**
```bash
cd frontend
npm run dev
# Dev server runs on http://localhost:5173
```

The frontend automatically proxies API requests to the backend (see `vite.config.js`).

## 📚 Project Structure

```
NG_chatbot/
├── backend/
│   ├── app.py                 # Flask main application (LLM + RAG)
│   │   ├── POST /ask          # Streaming chat endpoint
│   │   ├── RAG system         # Qdrant vector search
│   │   └── Language rules     # Enforced language responses
│   ├── ingest_now.py          # Vector DB ingestion script
│   ├── requirements.txt        # Python dependencies
│   └── data/
│       ├── about_ng.txt       # NavGurukul knowledge base
│       ├── Admission.txt      # Admission info
│       ├── Programs.txt       # Program details
│       └── QA.txt            # QA data
├── frontend/
│   ├── index.html             # React entry point
│   ├── package.json           # npm dependencies & scripts
│   ├── vite.config.js         # Vite build + proxy config
│   ├── public/
│   │   ├── glassadjustment.mp4    # Welcome video
│   │   ├── ballbounce.mp4        # Idle avatar animation
│   │   ├── listening.mp4         # STT active animation
│   │   ├── speaking-edited.mp4   # TTS/Speaking animation
│   │   ├── models/              # ONNX voice models for Hindi TTS
│   │   │   ├── hi_IN-priyamvada-medium.onnx
│   │   │   ├── hi_IN-priyamvada-medium.json
│   │   │   └── [other voice models]
│   │   └── piper-wasm/           # English TTS WebAssembly
│   │       ├── piper_worker.js
│   │       ├── piper_phonemize.js
│   │       └── dist/
│   └── src/
│       ├── App.jsx            # Main React app (3-stage design)
│       │   ├── Stage 1: Role Selection
│       │   ├── Stage 2: Mic/Speaker Testing
│       │   └── Stage 3: Chat Interface
│       ├── main.jsx           # React DOM entry
│       ├── styles.css         # All styles + responsive media queries
│       ├── hooks/
│       │   └── text-to-speech_hook.js  # Hindi TTS with Piper
│       └── utils/
│           └── modelCache.js          # Voice model caching
├── ROLE_SYSTEM.md             # Role-based prompt documentation
├── GITHUB_PUSH_READY.md       # Deployment checklist
├── .env                       # Environment variables (NEVER commit)
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## 🔌 API Endpoints

### POST `/ask`
Submit a question to the chatbot and get a streaming response.

**Request:**
```json
{
  "query": "Your question here",
  "role": "student|parent|partner",
  "language": "en|hi|mr",
  "is_first": false,
  "history": "[optional chat context]"
}
```

**Response:**
Streaming text response (text/plain). Frontend receives chunks in real-time.

**Example Usage:**
```bash
curl -X POST http://localhost:5000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I apply?",
    "role": "student",
    "language": "en",
    "is_first": false
  }'
```

## 🤖 Role System

The chatbot adapts its persona based on the user's role:

- **👨‍🎓 Student**: Simple, encouraging, step-by-step guidance for admission and learning
- **👪 Parent**: Trust-focused, safety-conscious, emphasizing outcomes and eligibility
- **🤝 Partner**: Professional, data-driven, suitable for NGO/government/teacher inquiries

Each role has:
- Custom system prompts tailored to the audience
- Language-specific instructions (English/Hindi/Marathi)
- Context-aware RAG retrieval for accurate information
- Greeting rules for first messages

See [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) for complete prompt configurations.

## 🔄 RAG System (Vector Database)

The application uses **Qdrant** for semantic search over NavGurukul knowledge base:

**How it Works:**
1. **Preparation**: Knowledge base (`data/about_ng.txt`) is embedded using NVIDIA's embeddings
2. **Ingestion**: Run `python backend/ingest_now.py` to populate Qdrant
3. **Retrieval**: On each query, top-K most relevant documents are fetched from Qdrant
4. **Context Injection**: Retrieved context is passed to LLM within system prompt
5. **Grounding**: LLM generates responses based on your knowledge base, preventing hallucination

**Key Configuration:**
- `RAG_TOP_K`: Number of documents to retrieve (default: 8)
- `RAG_MAX_CONTEXT_CHARS`: Max context length (default: 4000)
- `QDRANT_COLLECTION`: Vector collection name (default: navgurukul_docs)
- **Embedding Model**: `nvidia/nv-embedqa-e5-v5` (excellent for Hindi + English RAG)

**Setup RAG:**
```bash
cd backend
python ingest_now.py
# This populates your Qdrant collection from about_ng.txt
```

## 🛠️ Development

### Backend Development
- Flask in debug mode with auto-reload (`FLASK_DEBUG=1`)
- All endpoints in `backend/app.py`
- **Stateless design**: No session/chat history storage (all history passed from frontend)
- Streaming responses using Flask's `stream_with_context`
- LLM: Meta Llama 3.1 8B Instruct via NVIDIA endpoints
- Vector DB: Qdrant Cloud with semantic search

### Frontend Development

**Architecture:**
- **React 18** with hooks (useState, useEffect, useRef, useMemo)
- **Vite** dev server with hot module replacement & instant updates
- **3-Stage User Flow**:
  1. **Role Selection**: Pick student/parent/partner role
  2. **Mic & Speaker Testing**: Verify audio devices work
  3. **Chat Interface**: Full conversation with dynamic avatars
- **State Management**: Local React state, context passed to backend per message
- **Real-time Features**:
  - Live STT transcript as you speak
  - Automatic message sending after silence
  - Streaming UI updates as LLM generates response
  - Dynamic video avatar changes based on app state

**Key Components:**
- `usePiper()` hook for Hindi TTS with ONNX models
- `handleVoiceInput()` for Web Speech API integration
- `speakText()` for dual-language voice output (English + Hindi)
- Conditional video rendering based on `isListening` and `isTTSPlaying` states
- Responsive CSS with @media queries for all screen sizes

**Styling:**
- Soft pink background (#FCE4EC) matching app theme
- Green buttons (#2d5a27) for actions
- Rounded elements (border-radius for modern feel)
- Mobile-first responsive design
- Hidden scrollbars for clean look

**Proxy Configuration** (vite.config.js):
```javascript
proxy: {
  '/ask': 'http://localhost:5000',
  '/get_chat': 'http://localhost:5000',
  '/logout': 'http://localhost:5000'
}
```

### Voice Implementation

**Text-to-Speech (TTS):**
- **English**: Piper WASM (en_US-hfc_female-medium) via speech-to-speech library
  - High-quality neural voice
  - Real-time browser processing (no server latency)
  - Automatic playback when user uses voice input
  - Stop button (red pause icon) to halt playback
- **Hindi**: Local ONNX models (hi_IN-priyamvada-medium)
  - Multiple speaker options available
  - Falls back gracefully if model loading fails
  - Downloads ~60MB models on first use
  - Full Devanagari script support

**Speech-to-Text (STT):**
- **Web Speech API** built into modern browsers
- **Real-time feedback**: Green italic text shows live transcript
- **Languages**: 
  - English (en-US)
  - Hindi (hi-IN)
- **Auto-send**: Message sends 2 seconds after silence detected
- **Error handling**: Graceful fallback if browser doesn't support
- **No server processing**: All speech recognition happens in browser

**State Management:**
- `isListening`: Triggers listening.mp4 video
- `isTTSPlaying`: Triggers speaking-edited.mp4 video
- `isEnglishTTSPlaying`: Tracks English TTS separately from Hindi
- Automatic state cleanup after audio completes

**Video Avatar Integration:**
```
User just opened app
    ↓
Video: glassadjustment.mp4 (welcome screen)
    ↓
Role selected, testing stage
    ↓
Chat starts - Idle video: ballbounce.mp4
    ↓
User clicks mic, speaks
    ↓
Video switches: listening.mp4
    ↓
AI generates response
    ↓
Video switches: speaking-edited.mp4 (plays during TTS)
    ↓
TTS completes
    ↓
Back to idle: ballbounce.mp4
```

### Development Commands

```bash
# Frontend
npm run dev           # Start dev server with hot reload on :5173
npm run build         # Create production build
npm run preview       # Preview production build locally

# Backend
python app.py         # Run Flask development server on :5000
python ingest_now.py  # Re-ingest knowledge base to Qdrant

# Make sure you're in the correct directories:
# Frontend commands run from: frontend/
# Backend commands run from: backend/
```

**Testing Voice Features:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for debug messages like `🎤 STT started`, `🔊 TTS playing`
4. Check Network tab for Piper WASM file loading
5. Use microphone to test voice input
6. Check speaker for audio output

### Key Files to Modify

**Adding New Roles/Personas:**
- File: [ROLE_SYSTEM.md](./ROLE_SYSTEM.md)
- Action: Define new role prompt with English/Hindi versions
- Note: Role is automatically used in system message when selected

**Changing Colors/Styling:**
- File: [frontend/src/styles.css](./frontend/src/styles.css)
- Colors defined at top of file:
  - `--zoe-green: #2d5a27` (buttons, accents)
  - `--student-bg-soft: #FCE4EC` (background)
- Media queries at bottom for responsive adjustments
- Change and save to see hot reload immediately

**Adding Training Data:**
- Files: Create `.txt` files in [backend/data/](./backend/data/)
- Command: Run `python ingest_now.py` to add to vector DB
- Note: Existing data files auto-loaded on backend startup
- Format: Plain text, one concept per line or paragraph

**Adjusting LLM Behavior:**
- File: [backend/app.py](./backend/app.py)
- Find `temperature=0.1` parameter (search in file)
- Lower values (0.0-0.2) = focused, consistent responses
- Higher values (0.5-0.9) = creative, varied responses
- Also adjust `max_tokens` if responses are too short/long

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
# Output: frontend/dist/
```

**Backend:**
Use a production WSGI server (gunicorn):
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

**Environment Setup for Production:**
1. Use strong, unique API keys
2. Set `FLASK_ENV=production` in `.env`
3. Set `REACT_ENV=production` in frontend
4. Use HTTPS for all connections
5. Consider using Docker for containerization
6. Set up monitoring and error tracking (Sentry)

## 📦 Dependencies

### Backend (`pip install -r requirements.txt`)
- **flask** - Web framework with streaming support
- **langchain** - LLM orchestration and RAG pipelines
- **langchain-nvidia-ai-endpoints** - NVIDIA LLM integration
- **langchain-qdrant** - Qdrant vector store connector
- **qdrant-client** - Vector database client
- **python-dotenv** - Environment configuration
- **gunicorn** - Production WSGI server
- **requests** - HTTP library

### Frontend (`npm install`)
- **react** (^18.3.1) - UI framework
- **react-dom** (^18.3.1) - React DOM rendering
- **vite** (^5.4.11) - Build tool and dev server
- **marked** (^15.0.12) - Markdown parsing
- **react-icons** (^5.6.0) - Icon library
- **speech-to-speech** (^0.1.4) - Piper TTS library for English
- **onnxruntime-web** (^1.24.3) - ONNX runtime for Hindi TTS

## 🔐 Security Notes

1. **Never commit `.env`** - Keep sensitive credentials in `.env` only
2. **Use `.env.example`** - Template file for developers
3. **API Keys** - Store all API keys in environment variables
4. **HTTPS in Production** - Use HTTPS for all API calls
5. **CORS** - Frontend proxy configured in `vite.config.js`

## 🚀 Deploying the Backend

Backend runs on EC2 as `gunicorn` behind `nginx`. Use the deploy script to push updates without manual SSH steps:

```bash
EC2_HOST=<public-ip-or-dns> ./scripts/deploy-backend.sh
```

**What it does** on the EC2 box:
1. `git pull` the latest code on the configured branch (default `main`)
2. `pip install -r backend/requirements.txt` inside the existing venv
3. `kill -HUP` the gunicorn master → workers re-fork and re-read `.env`

**Overridable env vars:**
- `EC2_HOST` (required) — public IP or DNS of the EC2 instance
- `EC2_USER` (default `ubuntu`) — SSH user
- `APP_DIR` (default `/home/ubuntu/ng-chatbot`) — path to the checkout on the box
- `DEPLOY_BRANCH` (default `main`) — branch to deploy

**Prerequisite:** your laptop can `ssh ${EC2_USER}@${EC2_HOST}` (SSH key already configured in `~/.ssh/config` or agent).

**What it does not do:** managing `.env` (update manually on the box) or running tests (none yet). Both stay deliberate until CI/CD lands.

## 🎤 Voice Features

### Speech-to-Text (STT)
Uses **Web Speech API** for real-time voice input:
- **Supported Languages**: English (en-IN), Hindi (hi-IN), Marathi (mr-IN)
- **Real-time Feedback**: Green italic text shows live transcript as you speak
- **Auto-send**: Message auto-sends 2 seconds after silence detected
- **Async**: Browser handles speech recognition, no server processing
- **Browser Support**: Chrome, Firefox, Edge, Safari (14.5+)

**Getting Started:**
1. Click 🎤 mic button
2. Grant microphone permission when prompted
3. Speak in selected language
4. Watch input field for live text
5. Stop speaking → Auto-sends after 2 seconds

### Text-to-Speech (TTS)
- **English**: High-quality Piper (en_US-hfc_female-medium) via WebAssembly
- **Hindi**: ONNX neural voice (optional, downloads ~60MB model)
- **Auto-play**: AI responses automatically spoken if you used voice input
- **No latency**: All processing happens in browser (WASM)

---

## 📱 Responsive Design

The application is **fully responsive** and optimized for all devices:

### Breakpoints & Adaptations

| Device | Width | Grid | Video | Layout |
|--------|-------|------|-------|--------|
| **Phone** | 320-480px | 1 column | 100px | Stacked, full-width |
| **Tablet** | 481-768px | 2 columns | 120px | Compact spacing |
| **Small Desktop** | 769-1024px | 3 columns | 130px | Optimized |
| **Large Desktop** | 1025px+ | 3 columns | 140px | Full featured |

**Features That Scale:**
- 📐 Role grid adapts: 1 column (mobile) → 3 columns (desktop)
- 🎬 Video avatars: 100px (mobile) → 140px (desktop)
- 📝 Chat bubbles: 85% width (mobile) → 75% width (desktop)
- 🎙️ Input field: Full width (mobile) → max-width 700px (desktop)
- 🔤 Font sizes: Scaled at each breakpoint
- 🎯 Touch targets: Larger buttons on mobile

**Testing:**
```bash
# Test responsive design
1. Open frontend: http://localhost:5173
2. Press F12 to open DevTools (Chrome/Firefox)
3. Click device toggle (mobile icon)
4. Test all devices from iPhone SE (375px) to Desktop (1920px)
5. Check video sizes, button sizes, and text readability
```

---

## 🐛 Troubleshooting

### Backend won't start
- Check Python version (3.8+)
- Verify all dependencies: `pip install -r requirements.txt`
- Check `.env` file has all required variables (NVIDIA_API_KEY, QDRANT_URL, QDRANT_API_KEY)
- Ensure Qdrant Cloud instance is accessible
- Check port 5000 is not in use: `netstat -ano | findstr :5000` (Windows)

### Frontend won't load
- Clear `frontend/node_modules` and reinstall: `npm install && npm run dev`
- Check backend is running on http://localhost:5000
- Review browser console (F12) for errors
- Try hard refresh: `Ctrl+Shift+R` (Cmd+Shift+R on Mac)

### Voice Input (STT) Not Working
- Check browser support: Open Console (F12), look for `🎤` logs
- Grant microphone permission when asked by browser
- Ensure microphone is connected and working
- Try different browser (Chrome has best support)
- Check language is selected correctly
- See browser console for detailed error messages

### Voice Output (TTS) Not Working
- **English TTS (Piper)**: Check browser console for WASM loading errors
- **Hindi TTS**: Ensure models are in `frontend/public/models/`
- Try reloading page or hard refresh (Ctrl+Shift+R)
- Check Network tab in DevTools for failed model downloads
- Verify `onnxruntime-web` is installed: `npm list onnxruntime-web`

### Video Avatars Not Showing
- Verify video files exist in `frontend/public/`:
  - `glassadjustment.mp4` (welcome)
  - `ballbounce.mp4` (idle)
  - `listening.mp4` (STT active)
  - `speaking-edited.mp4` (TTS active)
- Check Network tab for 404 errors on video files
- Verify videos are valid MP4 format
- Try different browser (some have codec restrictions)
- Clear browser cache (Ctrl+Shift+Delete)

### Responsive Design Issues
- Page looks broken on mobile:
  1. Hard refresh: Ctrl+Shift+R
  2. Clear localStorage: `localStorage.clear()` in console
  3. Check viewport meta tag in `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
  4. Zoom should be 100% (check browser zoom level)
  5. Test in Chrome DevTools mobile emulation

### Language Responses Wrong
- **Issue**: Asked in Hindi but got English response
- **Fix**: 
  1. Check backend console: Should show `[DEBUG] User Language: hi`
  2. Verify language is being sent: Open Network tab → POST /ask → Request body
  3. Verify system prompt contains Hindi instruction
  4. Restart backend: `python app.py`
  5. Hard refresh frontend: Ctrl+Shift+R

## 📝 Logging & Debugging

**Backend Logging:**
- All logs printed to console with Flask debug info
- Set `FLASK_DEBUG=1` in `.env` for auto-reload
- Set `FLASK_ENV=development` or `production`

**Frontend Console:**
- Open Browser DevTools: F12 → Console
- Voice support check: Look for `✅ Speech Recognition API is supported`
- STT errors: Shows in red error bar below input
- TTS errors: Logged to console

**Production Recommendations:**
- Use structured logging (python-json-logger)
- Save logs to files
- Monitor Qdrant and NVIDIA API response times
- Set up error tracking (Sentry, etc.)

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "Add your feature"`
3. Push to branch: `git push origin feature/your-feature`
4. Create Pull Request

## 📄 License

[Add your license here]

## 👥 Team

NavGurukul AI Development Team

## 📧 Support

For issues and questions, please create an issue in the repository.

---

## 📊 Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Flask + LangChain | REST API, LLM orchestration |
| **LLM** | Meta Llama 3.1 8B (NVIDIA) | Conversational AI responses |
| **Vector DB** | Qdrant Cloud + NVIDIA Embeddings | Semantic search & RAG |
| **Frontend** | React 18 + Vite | Modern UI with hot reload |
| **Speech Input** | Web Speech API | Browser-native STT |
| **Speech Output (EN)** | Piper WASM | High-quality English TTS |
| **Speech Output (HI)** | ONNX Models | Neural Hindi voices |
| **Video Avatars** | MP4 animations | Dynamic character responses |
| **Styling** | CSS 3 + Media Queries | Fully responsive design |
| **Build Tool** | Vite | Lightning-fast bundling |
| **Languages** | English, Hindi | Bilingual UI & responses |
| **Responsive** | Mobile/Tablet/Desktop | 320px to 1920px+ support |
| **Python** | 3.8+ | Backend runtime |
| **Node.js** | 16+ | Frontend tooling |

**Key Libraries:**
- **langchain**: LLM chains and RAG workflows
- **langchain-qdrant**: Vector database integration
- **onnxruntime-web**: ONNX model inference in browser
- **marked**: Markdown parsing for responses
- **react-icons**: Icon library (FiMic, IoSend, etc.)

---

**Last Updated**: April 2026
