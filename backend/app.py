import os
import uuid 
from dotenv import load_dotenv
from flask import Flask, request, jsonify, Response, stream_with_context
# MongoDB ki lines hata di hain

from langchain_qdrant import QdrantVectorStore
from langchain_nvidia_ai_endpoints import ChatNVIDIA, NVIDIAEmbeddings 

load_dotenv()

app = Flask(__name__)
vector_db = None
primary_llm = None
RAG_TOP_K = 8
RAG_MAX_CONTEXT_CHARS = 4000
LLM_MAX_TOKENS = 500

ROLE_PROMPTS = {
    "student": "You are NavGurukul AI assistant for STUDENTS. Be friendly and simple.",
    "parent": "You are NavGurukul AI assistant for PARENTS. Focus on safety and trust.",
    "partner": "You are NavGurukul AI assistant for PARTNERS. Be professional and data-driven."
}

def initialize_vector_db():
    try:
        embeddings = NVIDIAEmbeddings(model="nvidia/nv-embedqa-e5-v5")
        return QdrantVectorStore.from_existing_collection(
            embedding=embeddings,
            collection_name=os.environ.get("QDRANT_COLLECTION", "navgurukul_docs"),
            url=os.environ.get("QDRANT_URL"),
            api_key=os.environ.get("QDRANT_API_KEY"),
            prefer_grpc=False
        )
    except Exception as e:
        print(f"Vector DB Error: {e}")
        return None

def initialize_llms():
    global primary_llm
    if primary_llm is None:
        primary_llm = ChatNVIDIA(
            model="meta/llama-3.1-8b-instruct", 
            temperature=0.1, 
            max_completion_tokens=LLM_MAX_TOKENS
        )

@app.route('/ask', methods=['POST'])
def ask():
    global vector_db
    if vector_db is None: 
        vector_db = initialize_vector_db()
    initialize_llms()

    data = request.json
    query = data.get("query", "").strip()
    user_lang = data.get("language", "en")
    selected_role = (data.get("role") or "student").lower()
    
    # FRONTEND se hum ek flag bhejenge 'is_first' taaki greeting handle ho sake
    is_first_message = data.get("is_first", False)

    # 1. LANGUAGE LOGIC
    if user_lang == 'hi':
        greeting_msg = "नमस्ते! मैं नवगुरुकुल एआई सहायक हूँ।"
        lang_instruction = "आप हमेशा और केवल हिंदी में ही जवाब दें। कभी भी अंग्रेजी का प्रयोग न करें।"
    else:
        greeting_msg = "Hello! I am NavGurukul AI assistant."
        lang_instruction = "You MUST respond ONLY and ALWAYS in English. NEVER use Hindi or any other language."

    # 2. DYNAMIC GREETING RULE
    if is_first_message:
        greeting_rule = f"START your response with: '{greeting_msg} How can I help you today?'"
    else:
        greeting_rule = "DO NOT greet. DO NOT say Hello/Namaste. Directly answer the question."

    # 3. RAG CONTEXT (Vector DB se Nagpur/SOE info uthana)
    docs = vector_db.similarity_search(query, k=RAG_TOP_K) if vector_db else []
    context = "\n".join([d.page_content for d in docs])[:RAG_MAX_CONTEXT_CHARS]

    system_prompt = (
        f"⚠️ CRITICAL - LANGUAGE RULE: {lang_instruction}\n\n"
        f"{ROLE_PROMPTS.get(selected_role, ROLE_PROMPTS['student'])}\n\n"
        f"GREETING RULE: {greeting_rule}\n\n"
        "CORE RULES:\n"
        "1. NO REPETITION: Don't repeat greetings in a continuous chat.\n"
        "2. NO SYMBOLS: Use 1. 2. 3. for lists. NEVER use * or # or -.\n"
        "3. KNOWLEDGE: Answer questions about SOE, Nagpur, etc., using the context below.\n\n"
        f"Context:\n{context}"
    )

    print(f"[DEBUG] User Language: {user_lang}, Lang Instruction: {lang_instruction}")

    try:
        # Note: MongoDB nahi hai toh hum history frontend se hi as string mangwa sakte hain agar zaroorat ho
        history_from_frontend = data.get("history", "")
        full_message = f"{system_prompt}\n\n[HISTORY]\n{history_from_frontend}\nUser Question: {query}\nAI:"
        
        def generate():
            for chunk in primary_llm.stream(full_message):
                if chunk.content:
                    yield chunk.content

        return Response(stream_with_context(generate()), mimetype='text/plain')
    except Exception as e: 
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)