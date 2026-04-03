# NG Chatbot - NavGurukul AI Assistant

A full-stack AI chatbot application for NavGurukul using FastAPI/Flask backend with React frontend. Powered by NVIDIA AI endpoints and Qdrant vector database for RAG (Retrieval-Augmented Generation).

## 🎯 Features

- **Role-Based Responses**: Different AI personas for students, mentors, and staff
- **RAG System**: Retrieves relevant context from NavGurukul knowledge base before generating responses
- **Chat History**: Persistent chat storage with MongoDB
- **Real-time Responses**: Streaming chat responses with chat history context
- **Modern UI**: React-based responsive frontend with real-time chat interface
- **🎤 Speech-to-Text (STT)**: Hindi, English, and Marathi voice input using Web Speech API
- **🔊 Text-to-Speech (TTS)**: 
  - **Hindi**: High-quality neural voice (Piper ONNX model)
  - **English**: Natural-sounding female voice via Piper TTS
- **Voice-Based Chat**: Full voice interaction - speak to chat, hear AI responses

## 📋 Prerequisites

- Python 3.8+ (Backend)
- Node.js 16+ (Frontend)
- MongoDB Atlas account (for chat storage)
- Qdrant Cloud account (for vector embeddings)
- NVIDIA API key (for LLM endpoints)
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

### 4. Setup Voice Models (Optional but Recommended)

For high-quality Hindi TTS, download the voice model:

```bash
# From project root
python check_models.py    # Check if models exist
```

**Download Hindi Model Files:**
1. Create `frontend/public/models/` directory
2. Download from Hugging Face:
   - Model: https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/hi/hi_IN/priyamvada/medium/model.onnx (~60MB)
   - Config: https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/hi/hi_IN/priyamvada/medium/model.json
3. Save as:
   - `frontend/public/models/hi_IN-priyamvada-medium.onnx`
   - `frontend/public/models/hi_IN-priyamvada-medium.json`

**Without models**: Hindi TTS uses browser's native speech synthesis (works fine but different voice).

### 5. Environment Configuration

Create `.env` file in the root `NG_chatbot` directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in your credentials:
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console  
- `NVIDIA_API_KEY` - From NVIDIA AI Endpoints
- `QDRANT_URL` - Your Qdrant Cloud instance URL
- `QDRANT_API_KEY` - Your Qdrant API key
- `QDRANT_COLLECTION` - Vector collection name (default: navgurukul_docs)

### 6. Run the Application

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
│   ├── app.py                 # Flask main application
│   ├── ingest_now.py          # Vector DB ingestion script
│   ├── requirements.txt        # Python dependencies
│   └── data/
│       └── about_ng.txt       # Training data for RAG
├── frontend/
│   ├── package.json           # npm dependencies
│   ├── vite.config.js         # Vite build configuration
│   ├── index.html             # React entry point
│   ├── public/
│   │   ├── models/            # Voice model files (optional)
│   │   │   ├── hi_IN-priyamvada-medium.onnx
│   │   │   ├── hi_IN-priyamvada-medium.json
│   │   │   └── ort*.* files   # ONNX Runtime libraries
│   │   └── piper-wasm/        # TTS WASM worker files
│   └── src/
│       ├── App.jsx            # Main React component
│       ├── main.jsx           # React DOM entry
│       ├── styles.css         # Application styles
│       ├── hooks/
│       │   ├── useSTT.jsx     # Speech-to-Text hook
│       │   ├── useTTS.jsx     # Hindi TTS hook
│       │   └── useTTSPiper.jsx # English TTS hook
│       ├── services/
│       │   └── speechService.js # Voice configuration
│       └── utils/
│           └── modelCache.js  # Browser caching for models
├── .env.example               # Environment variables template
├── ROLE_SYSTEM.md             # System prompt documentation
├── VOICE_SETUP_GUIDE.md       # Voice features guide
├── DOWNLOAD_MODELS.md         # Model download instructions
├── check_models.py            # Model validation script
└── README.md                  # This file
```

## 🔌 API Endpoints

### POST `/ask`
Submit a question to the chatbot.

**Payload:**
```json
{
  "query": "Your question here",
  "chat_id": "optional-chat-id",
  "role": "student|mentor|staff"  // Optional, defaults to student
}
```

**Response:**
```json
{
  "response": "AI response text",
  "chat_id": "chat-uuid",
  "role": "selected-role"
}
```

### GET `/get_chat/:chat_id`
Retrieve full chat history.

### POST `/logout`
Logout user session.

## 🎤 Voice Features

### Speech-to-Text (STT)
- **Languages**: Hindi (hi-IN), English (en-IN), Marathi (mr-IN)
- **Technology**: Web Speech API (built-in browser support)
- **Features**: 
  - Real-time transcription with interim results
  - Auto-stop after 2 seconds of silence
  - Language auto-detection

### Text-to-Speech (TTS)
**Hindi:**
- Uses neural Piper model for natural-sounding voice
- Fallback to browser's native Hindi voice if model unavailable
- Model size: ~60MB (downloaded once, cached in browser)

**English:**
- High-quality Piper TTS with female voice (en_US-hfc_female-medium)
- Optimized for low-latency synthesis
- Auto-downloads model on first use

### Using Voice Features
1. Click the **🎤 Mic button** to start speaking
2. Say your question in Hindi or English
3. AI responds with both text and voice
4. Hear the answer played automatically

See [VOICE_SETUP_GUIDE.md](./VOICE_SETUP_GUIDE.md) for detailed voice setup.

## 🤖 Role System

The chatbot has different personalities based on role:
- **Student**: Helpful, encouraging tone with learning resources
- **Mentor**: Professional, guidance-focused responses
- **Staff**: Administrative and policy-related responses

See [ROLE_SYSTEM.md](./ROLE_SYSTEM.md) for complete prompt configurations.

## 🔄 RAG System (Vector Database)

The application uses Qdrant for semantic search over NavGurukul knowledge base:

1. **Ingestion**: Run `python backend/ingest_now.py` to populate vector DB from `data/about_ng.txt`
2. **Retrieval**: On each query, top-K relevant documents are fetched from Qdrant
3. **Context**: Retrieved context is passed to LLM for generating grounded responses

**Configuration:**
- `RAG_TOP_K`: Number of documents to retrieve (default: 4)
- `RAG_MAX_CONTEXT_CHARS`: Max context length (default: 2200)
- `QDRANT_COLLECTION`: Vector collection name (default: navgurukul_docs)

## 🛠️ Development

### Backend Development
- Flask runs in debug mode with auto-reload
- All endpoints are in `backend/app.py`
- MongoDB credentials required for chat persistence

### Frontend Development
- Vite dev server with hot module replacement
- React 18+ with hooks
- CSS for styling (includes marked.js for markdown rendering)
- Proxy to backend at `http://localhost:5000` (see `vite.config.js`)
- Voice hooks: `useSTT`, `useTTS`, `useTTSPiper` for voice integration
- Web Workers for Piper WASM processing (non-blocking synthesis)

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

### Backend
- Flask - Web framework
- LangChain - LLM orchestration
- Qdrant Client - Vector database client
- PyMongo - MongoDB driver
- python-dotenv - Environment configuration

### Frontend
- React 18 - UI framework
- React Router - Navigation
- Vite - Build tool
- React Icons - Icon library
- Marked.js - Markdown parsing
- **speech-to-speech** - English TTS via Piper WASM
- **onnxruntime-web** - Neural network inference for Hindi TTS models

## 🔐 Security Notes

1. **Never commit `.env`** - Keep sensitive credentials in `.env` only
2. **Use `.env.example`** - Template file for developers
3. **API Keys** - Store all API keys in environment variables
4. **HTTPS in Production** - Use HTTPS for all API calls
5. **CORS** - Frontend proxy configured in `vite.config.js`

## 🐛 Troubleshooting

### Backend won't start
- Check Python version (3.8+)
- Verify all dependencies: `pip install -r requirements.txt`
- Check `.env` file has all required variables
- Ensure Qdrant and MongoDB connections are accessible

### Frontend won't load
- Clear `frontend/node_modules` and reinstall: `npm install`
- Check backend is running on port 5000
- Review browser console for errors
- Clear browser cache

### Chat not saving
- Verify MongoDB connection string in `.env`
- Check MongoDB Atlas network access settings
- Ensure `MONGO_URI` is correct

## 📝 Logging

All logs are printed to console. For production, consider:
- Adding structured logging (e.g., python-json-logger)
- Saving logs to files
- Using centralized logging service

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

**Last Updated**: March 2025
