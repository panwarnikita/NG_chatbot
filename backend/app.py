import os
import uuid 
from dotenv import load_dotenv
from flask import Flask, request, jsonify, session
from pymongo import MongoClient

from langchain_qdrant import QdrantVectorStore
from langchain_nvidia_ai_endpoints import ChatNVIDIA, NVIDIAEmbeddings 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(ROOT_DIR, '.env'))

app = Flask(__name__)
app.secret_key = "NAV_GURUKUL_AI_SECRET" 

MONGO_URI = "mongodb+srv://Nikitapanwar:Panwar123@cluster0.wvwjupu.mongodb.net/?appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client['NavGurukulDB']
chats_collection = db['chats']

os.environ["NVIDIA_API_KEY"] = os.environ.get('NVIDIA_API_KEY')

vector_db = None
QDRANT_COLLECTION = os.environ.get("QDRANT_COLLECTION", "navgurukul_docs")
QDRANT_URL = os.environ.get("QDRANT_URL")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")
RAG_TOP_K = int(os.environ.get("RAG_TOP_K", "4"))
RAG_MAX_CONTEXT_CHARS = int(os.environ.get("RAG_MAX_CONTEXT_CHARS", "2200"))
CHAT_HISTORY_MESSAGES = int(os.environ.get("CHAT_HISTORY_MESSAGES", "4"))
NVIDIA_PRIMARY_MODEL = os.environ.get("NVIDIA_PRIMARY_MODEL", "meta/llama-3.1-8b-instruct")
NVIDIA_FALLBACK_MODEL = os.environ.get("NVIDIA_FALLBACK_MODEL", "meta/llama-3.3-70b-instruct")
LLM_MAX_TOKENS = int(os.environ.get("LLM_MAX_TOKENS", "280"))
primary_llm = None
fallback_llm = None


def get_qdrant_connection_kwargs(vectorstore_path):
    if QDRANT_URL and QDRANT_API_KEY:
        return {
            "url": QDRANT_URL,
            "api_key": QDRANT_API_KEY,
            "prefer_grpc": False,
        }
    return {
        "path": vectorstore_path,
    }

    

ROLE_PROMPTS = {
    "student": (
        "You are a NavGurukul admissions assistant helping a student. "
        "Give simple, clear, and friendly answers with step-by-step guidance."
    ),
    "parent": (
        "You are a NavGurukul admissions assistant speaking to a parent. "
        "Provide clear, trustworthy, and reassuring information about safety, eligibility, and outcomes."
    ),
    "partner": (
        "You are a NavGurukul admissions assistant assisting an institutional partner. "
        "Give professional, concise, and structured information about programs, collaboration, and processes."
    )
}

def initialize_vector_db():
    using_cloud = bool(QDRANT_URL and QDRANT_API_KEY)
    if not using_cloud:
        return None
    
    embeddings = NVIDIAEmbeddings(model="nvidia/nv-embedqa-e5-v5")
    return QdrantVectorStore.from_existing_collection(
        embedding=embeddings,
        collection_name=QDRANT_COLLECTION,
        **get_qdrant_connection_kwargs(""),
    )

def initialize_llms():
    global primary_llm, fallback_llm
    if primary_llm is None:
        primary_llm = ChatNVIDIA(
            model=NVIDIA_PRIMARY_MODEL,
            temperature=0.2,
            max_tokens=LLM_MAX_TOKENS,
        )
    if NVIDIA_FALLBACK_MODEL and NVIDIA_FALLBACK_MODEL != NVIDIA_PRIMARY_MODEL and fallback_llm is None:
        fallback_llm = ChatNVIDIA(
            model=NVIDIA_FALLBACK_MODEL,
            temperature=0.2,
            max_tokens=LLM_MAX_TOKENS,
        )

@app.before_request
def ensure_temp_user_session():
    if 'user' not in session:
        session['user'] = {
            "name": "Guest User",
            "email": "guest@local.dev"
        }

@app.route('/')
def home():
    return jsonify({"status": "ok", "service": "NaviAI backend"})

@app.route('/logout')
def logout():
    session.pop('user', None)
    return jsonify({"status": "logged_out"})

@app.route('/get_chat/<chat_id>')
def get_chat(chat_id):
    chat = chats_collection.find_one({"chat_id": chat_id})
    if chat:
        return jsonify({
            "messages": chat['messages'],
            "role": chat.get("role", "student")
        })
    return jsonify({"error": "Chat not found"}), 404

@app.route('/ask', methods=['POST'])
def ask():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401

    global vector_db
    if vector_db is None:
        vector_db = initialize_vector_db()
    initialize_llms()

    data = request.json
    query = data.get("query")
    chat_id = data.get("chat_id")
    selected_role = (data.get("role") or session.get("selected_role") or "student").lower()
    if selected_role not in ROLE_PROMPTS:
        selected_role = "student"
    session["selected_role"] = selected_role

    if not query:
        return jsonify({"error": "Query is required"}), 400

    history_text = ""
    if chat_id:
        chat_data = chats_collection.find_one({"chat_id": chat_id})
        if chat_data and 'messages' in chat_data:
            for msg in chat_data['messages'][-CHAT_HISTORY_MESSAGES:]:
                role = "User" if msg['role'] == 'user' else "NaviAI"
                history_text += f"{role}: {msg['content']}\n"

    docs = vector_db.similarity_search(query, k=RAG_TOP_K) if vector_db else []
    context = "\n".join([d.page_content for d in docs])[:RAG_MAX_CONTEXT_CHARS]

    role_prompt = ROLE_PROMPTS[selected_role]

    
    try:
        full_message = f"""{system_prompt}\n\n{context}\n\n[RECENT_CHAT_HISTORY]\n{history_text}\n\nUser Question: {query}\nNaviAI:"""
        try:
            response = primary_llm.invoke(full_message).content
        except Exception:
            if fallback_llm is not None:
                response = fallback_llm.invoke(full_message).content
            else:
                raise

        if not chat_id:
            chat_id = str(uuid.uuid4())
            chats_collection.insert_one({
                "chat_id": chat_id, "email": session['user']['email'],
                "role": selected_role,
                "question": query[:50],
                "messages": [{"role": "user", "content": query}, {"role": "ai", "content": response}]
            })
        else:
            chats_collection.update_one(
                {"chat_id": chat_id},
                {
                    "$set": {"role": selected_role},
                    "$push": {"messages": {"$each": [{"role": "user", "content": query}, {"role": "ai", "content": response}]}}
                }
            )

        return jsonify({"response": response, "chat_id": chat_id, "role": selected_role})
    except Exception as e:
        return jsonify({"response": f"Error: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)