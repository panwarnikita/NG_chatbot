import os
import uuid 
from dotenv import load_dotenv
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS

from langchain_qdrant import QdrantVectorStore
from langchain_nvidia_ai_endpoints import ChatNVIDIA, NVIDIAEmbeddings 

load_dotenv()

app = Flask(__name__)
CORS(app)
vector_db = None
primary_llm = None
RAG_TOP_K = 8
RAG_MAX_CONTEXT_CHARS = 4000
LLM_MAX_TOKENS = 500

ROLE_PROMPTS = {
    "student": "You are Swara, the NavGurukul AI assistant for STUDENTS. Be friendly and simple.",
    "parent": "You are Swara, the NavGurukul AI assistant for PARENTS. Focus on safety and trust.",
    "partner": "You are Swara, the NavGurukul AI assistant for PARTNERS. Be professional and data-driven."
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
    selected_role = (data.get("role") or "student").lower()
    is_first_message = data.get("is_first", False)

    is_hindi_script = any('\u0900' <= char <= '\u097f' for char in query)
    hinglish_words = ['kaise', 'kya', 'hai', 'kab', 'kon', 'kaha', 'tha', 'rahe', 'aap', 'mein', 'ko']
    is_hinglish = any(word in query.lower().split() for word in hinglish_words)

    if is_hindi_script or is_hinglish:
        target_lang = "PURE HINDI"
        lang_instruction = (
            "STRICT SCRIPT RULE: You MUST respond in Devanagari (Hindi) script ONLY. "
            "NEVER use English/Roman letters for Hindi words. "
            "STRICT VOCABULARY: Do not use English words like 'Admission', 'Campus', 'Process'. "
            "Use 'प्रवेश', 'परिसर', 'प्रक्रिया', 'साक्षात्कार' instead."
        )
        final_nudge = "Respond ONLY in Hindi Devanagari script. No English letters allowed."
    else:
        target_lang = "ENGLISH"
        lang_instruction = "STRICT RULE: Respond ONLY in English. Do not use any Hindi script."
        final_nudge = "Respond ONLY in English."

  
    docs = vector_db.similarity_search(query, k=RAG_TOP_K) if vector_db else []
    context = "\n".join([d.page_content for d in docs])[:RAG_MAX_CONTEXT_CHARS]

   
    system_prompt = (
        f"Identity: {ROLE_PROMPTS.get(selected_role, ROLE_PROMPTS['student'])}\n\n"
        "CORE RULES:\n"
        f"- {lang_instruction}\n"
        "- CONVERSATIONAL TONE: Keep it short (3-4 lines). Talk like a warm, helpful friend.\n"
        "- KNOWLEDGE BOUNDARY: Only answer about NavGurukul using the context. If the question is outside "
        "NavGurukul's scope (like general history or unknown places), politely say: "
        "'क्षमा करें, मुझे इस बारे में जानकारी नहीं है। मैं केवल नवगुरुकुल से जुड़ी आपकी सहायता कर सकती हूँ।'\n"
        "- NO SYMBOLS: Never use * or # or -. Use 1. 2. 3. for lists.\n"
        f"{'Start with a warm greeting in the target script.' if is_first_message else 'Start the answer directly.'}\n\n"
        f"Context Data:\n{context}"
    )

    try:
        history_from_frontend = data.get("history", "")
        full_message = (
            f"{system_prompt}\n\n"
            f"[HISTORY]\n{history_from_frontend}\n"
            f"User Question: {query}\n"
            f"Instruction: {final_nudge}\n"
            f"Swara:"
        )
        
        def generate():
            for chunk in primary_llm.stream(full_message):
                if chunk.content:
                    yield chunk.content

        return Response(stream_with_context(generate()), mimetype='text/plain')
    except Exception as e: 
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)