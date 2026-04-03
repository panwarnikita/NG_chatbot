# NG Chatbot - NavGurukul AI Assistant

A full-stack AI chatbot application for NavGurukul using FastAPI/Flask backend with React frontend. Powered by NVIDIA AI endpoints and Qdrant vector database for RAG (Retrieval-Augmented Generation).

## 🎯 Features

- **🎤 Voice Input (STT)**: Multilingual speech-to-text for Hindi, English, and Marathi
- **🔊 Voice Output (TTS)**: Natural-sounding text-to-speech responses
- **Role-Based Responses**: Different AI personas for students, parents, and partners
- **RAG System**: Retrieves relevant context from NavGurukul knowledge base before generating responses
- **Real-time Streaming**: Streaming responses with dynamic LLM output
- **Multilingual Support**: English, Hindi (हिंदी), and Marathi (मराठी)
- **Modern UI**: React + Vite responsive frontend with real-time chat interface
- **Stateless API**: No session storage, clean RESTful design

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
│   ├── ingest_now.py          # Vector DB ingestion script
│   ├── requirements.txt        # Python dependencies
│   └── data/
│       └── about_ng.txt       # Training data for RAG
├── frontend/
│   ├── package.json           # npm dependencies
│   ├── vite.config.js         # Vite build configuration
│   ├── index.html             # React entry point
│   ├── public/
│   │   ├── models/            # ONNX voice models (optional)
│   │   └── piper-wasm/        # Piper TTS WebAssembly
│   └── src/
│       ├── App.jsx            # Main React component
│       ├── main.jsx           # React DOM entry
│       ├── styles.css         # Application styles
│       ├── hooks/
│       │   ├── useSTT.jsx     # Speech-to-Text hook
│       │   ├── useTTS.jsx     # Hindi TTS hook
│       │   └── useTTSPiper.jsx# English TTS hook
│       ├── services/
│       │   └── speechService.js # Voice configuration service
│       └── utils/
│           ├── modelCache.js  # Voice model caching
│           └── ...
├── .env                       # Environment variables (NEVER commit)
├── .env.example               # Environment variables template
├── ROLE_SYSTEM.md             # System prompt documentation
├── VOICE_ARCHITECTURE.md      # Voice system details
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
- **Vite** dev server with hot module replacement
- **React 18** with hooks (useState, useEffect, useRef, useCallback)
- **Real-time voice feedback** with STT/TTS integration
- **Marked.js** for markdown rendering
- **speech-to-speech** library for English TTS
- **onnxruntime-web** for local ONNX model inference (Hindi TTS)
- Proxy to backend at `http://localhost:5000` (see `vite.config.js`)

### Voice Implementation
- **STT (Speech-to-Text)**: Web Speech API (browser-native, no server needed)
- **TTS (Text-to-Speech)**: 
  - English: Piper WASM via speech-to-speech library
  - Hindi: Local ONNX models (optional, falls back to browser native TTS)
- **Languages**: en-IN, hi-IN, mr-IN

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
gunicorn -w 4 app.main:app
```

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
- Check browser support: Open Console (F12), look for `✅ Speech Recognition API is supported`
- Grant microphone permission when asked by browser
- Ensure microphone is connected and working
- Try different browser (Chrome has best support)
- Check language is selected correctly
- See [STT_DEBUGGING_GUIDE.md](./STT_DEBUGGING_GUIDE.md) for detailed troubleshooting

### Voice Output (TTS) Not Working
- English TTS (Piper): Check browser console for WASM loading errors
- Hindi TTS: Models must be manually downloaded to `frontend/public/models/`
- Try reloading page or hard refresh (Ctrl+Shift+R)
- Check browser console for specific error messages

### Streaming Response Slow or Stuck
- Check NVIDIA API key is valid
- Verify Qdrant connection is stable
- Check network latency
- Try restarting backend: `python backend/app.py`

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

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | Flask + LangChain | Python 3.8+ |
| **LLM** | Meta Llama 3.1 8B (NVIDIA) | Latest |
| **Vector DB** | Qdrant Cloud + NVIDIA Embeddings | Latest |
| **Frontend** | React + Vite | ^18.3 / ^5.4 |
| **Voice In** | Web Speech API | Browser native |
| **Voice Out** | Piper WASM (EN) + ONNX (HI) | WASM |
| **Languages** | English, Hindi, Marathi | Multi-script |
| **Format** | Streaming text + Voice | Real-time |

---

**Last Updated**: April 2026
