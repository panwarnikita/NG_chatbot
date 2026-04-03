import os
import uuid 
from dotenv import load_dotenv
from flask import Flask, request, jsonify, session

from langchain_qdrant import QdrantVectorStore
from langchain_nvidia_ai_endpoints import ChatNVIDIA, NVIDIAEmbeddings 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(ROOT_DIR, '.env'))

app = Flask(__name__)
app.secret_key = "NAV_GURUKUL_AI_SECRET" 

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
        "You are NaviAI, NavGurukul's friendly AI assistant helping a STUDENT. "
        "Your role: Make admission easy to understand with simple, step-by-step explanations. "
        "Be encouraging, use everyday language, and explain why things matter. "
        "Focus on: admission eligibility, what to expect, how to apply, success stories of past students."
    ),
    "parent": (
        "You are NaviAI, NavGurukul's trusted AI assistant speaking to a PARENT. "
        "Your role: Build trust by addressing safety, outcomes, and value. "
        "Be professional but warm, provide concrete facts about student safety, placement rates, and program benefits. "
        "Address concerns about quality, career growth, and investment. Use reassuring, confident tone."
    ),
    "partner": (
        "You are Navi, NavGurukul's professional AI assistant for institutional PARTNERS (NGOs, government, schools). "
        "Your role: Provide structured, professional information about partnerships, collaboration models, impact metrics. "
        "Be direct, data-focused, and outcome-oriented. Discuss programs, scalability, and mutual benefits clearly."
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

def generate_system_prompt(role_prompt, context):
    """Generate the complete system prompt with detailed instructions"""
    system_prompt = (
        f"{role_prompt}\n\n"
        "CORE INSTRUCTIONS FOR NAVI AI:\n"
        "=" * 50 + "\n"
        "SMART GREETING DETECTION:\n"
        "- Check if the user's message is ONLY a greeting (Hi, Hello, Namaste, Hey, etc).\n"
        "- If YES (pure greeting): Greet them back, introduce yourself as Navi, and ask what they want to learn.\n"
        "- If NO (actual question like 'what is navgurukul', 'tell me about', etc): SKIP greeting and DIRECTLY ANSWER the question in detail.\n"
        "- Do NOT greet when answering substantive questions - go straight to the answer.\n\n"
        "RESPONSE QUALITY FOR SUBSTANTIVE QUESTIONS:\n"
        "- Answer the user's actual question with FULL DETAIL and COMPLETE INFORMATION.\n"
        "- Do NOT give random or unrelated answers.\n"
        "- Keep responses focused, clear, and relevant to NavGurukul.\n\n"
        "CRITICAL - NO HALLUCINATION RULE:\n"
        "- ONLY use information from the NavGurukul Knowledge Base provided below.\n"
        "- If the specific information (name, event, fact, person) is NOT in the Knowledge Base, STOP.\n"
        "- NEVER make up or invent information about people, students, or specific events.\n"
        "- NEVER assume or imagine details that aren't explicitly shown in the Knowledge Base.\n"
        "- If asked about someone (e.g., 'Who is Swara?') and that person is NOT in your knowledge base, respond EXACTLY like this:\n"
        "  → 'I don't have specific information about Swara in my knowledge base. However, if you'd like to know about NavGurukul's students or alumni, I'd be happy to help. Is there something else about NavGurukul you'd like to know?'\n"
        "- EXAMPLES OF WHAT TO DO:\n"
        "  ✓ User asks 'What is NavGurukul?' → Answer from Knowledge Base with full details.\n"
        "  ✓ User asks 'Who is Swara?' (but Swara not in KB) → Say 'I don't have this information' and redirect.\n"
        "  ✓ User asks 'Tell me about programs' → Answer from Knowledge Base programs listed.\n"
        "  ✗ User asks 'Who is Swara?' (but Swara not in KB) → DO NOT make up a story about Swara.\n"
        "  ✗ DO NOT say 'Based on my knowledge' if the specific info isn't in the Knowledge Base - be direct that you don't have it.\n\n"
        "ROLE-SPECIFIC ANSWER TONE:\n"
        "- STUDENT: Use simple, encouraging, inspiring language. Break complex info into clear steps. Motivate them.\n"
        "- PARENT: Build confidence and trust. Address safety, quality, outcomes, and value for investment. Be reassuring but fact-based.\n"
        "- PARTNER: Professional, data-driven tone. Focus on metrics, scalability, partnership models, and mutual benefits.\n\n"
        "LANGUAGE & FORMATTING:\n"
        "- Respond in the SAME language as the user's question.\n"
        "- If Hindi: Only use Devanagari script (नमस्ते), NEVER Hinglish or English letters.\n"
        "- NO special symbols for bullet points (* # -). Use simple text, numbered lists (1. 2. 3.), or new lines.\n"
        "- Always write COMPLETE sentences. Never stop in the middle of a word or sentence.\n"
        "- For detailed questions: Provide 4-6 substantial points, not just 3-4 brief ones.\n\n"
        "CONVERSATION CONTINUITY:\n"
        "- Remember previous messages in chat history (use Recent Chat History below).\n"
        "- If user asks a follow-up, reference your previous response.\n"
        "- Be a natural conversationalist, not robotic.\n\n"
        "NavGurukul Knowledge Base:\n"
        f"{context}\n"
    )
    return system_prompt

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
    # Chat history storage disabled (MongoDB removed)
    return jsonify({"error": "Chat history feature disabled"}), 501

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

    # Chat history disabled (MongoDB removed)
    history_text = ""

    docs = vector_db.similarity_search(query, k=RAG_TOP_K) if vector_db else []
    context = "\n".join([d.page_content for d in docs])[:RAG_MAX_CONTEXT_CHARS]

    role_prompt = ROLE_PROMPTS[selected_role]
    system_prompt = generate_system_prompt(role_prompt, context)

    
    try:
        full_message = f"""{system_prompt}\n\n[RECENT_CHAT_HISTORY]\n{history_text}\n\nUser Question: {query}\nNaviAI:"""
        try:
            response = primary_llm.invoke(full_message).content
        except Exception:
            if fallback_llm is not None:
                response = fallback_llm.invoke(full_message).content
            else:
                raise

        # Chat history storage disabled (MongoDB removed)
        if not chat_id:
            chat_id = str(uuid.uuid4())

        return jsonify({"response": response, "chat_id": chat_id, "role": selected_role})
    except Exception as e:
        return jsonify({"response": f"Error: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)