# NG Chatbot - NavGurukul AI Assistant

A full-stack AI chatbot application for NavGurukul using FastAPI/Flask backend with React frontend. Powered by NVIDIA AI endpoints and Qdrant vector database for RAG (Retrieval-Augmented Generation).

## 🎯 Features

- **Role-Based Responses**: Different AI personas for students, mentors, and staff
- **RAG System**: Retrieves relevant context from NavGurukul knowledge base before generating responses
- **Chat History**: Persistent chat storage with MongoDB
- **Real-time Responses**: Streaming chat responses with chat history context
- **Modern UI**: React-based responsive frontend with real-time chat interface

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

### 4. Environment Configuration

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
│   ├── app.py                 # Flask main application
│   ├── ingest_now.py          # Vector DB ingestion script
│   ├── requirements.txt        # Python dependencies
│   └── data/
│       └── about_ng.txt       # Training data for RAG
├── frontend/
│   ├── package.json           # npm dependencies
│   ├── vite.config.js         # Vite build configuration
│   ├── index.html             # React entry point
│   └── src/
│       ├── App.jsx            # Main React component
│       ├── main.jsx           # React DOM entry
│       └── styles.css         # Application styles
├── .env.example               # Environment variables template
├── ROLE_SYSTEM.md             # System prompt documentation
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
