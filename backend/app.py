# -*- coding: utf-8 -*-
import os
import uuid
from dotenv import load_dotenv

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from openai import OpenAI

from langchain_qdrant import QdrantVectorStore
from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings 

load_dotenv()

app = Flask(__name__)
CORS(app)
print("[BOOT] Flask app initialized — RAG debug logging enabled", flush=True)

@app.before_request
def _log_request():
    print(f"[REQ] {request.method} {request.path}", flush=True)
vector_db = None
primary_llm = None
RAG_TOP_K = 5
RAG_MAX_CONTEXT_CHARS = 4000
LLM_MAX_TOKENS = 400

ROLE_PROMPTS = {
    "student": "You are Swara, the NavGurukul AI assistant for STUDENTS. Be friendly and simple.",
    "parent": "You are Swara, the NavGurukul AI assistant for PARENTS. Focus on safety and trust.",
    "partner": "You are Swara, the NavGurukul AI assistant for PARTNERS. Be professional and data-driven."
}

ROLE_PROMPTS_HI = {
    "student": "आप स्वरा हैं, नवगुरुकुल की एआई सहायिका, छात्रों के लिए। मित्रवत और सरल भाषा में मदद करें।",
    "parent": "आप स्वरा हैं, नवगुरुकुल की एआई सहायिका, माता-पिता के लिए। सुरक्षा और भरोसे पर ध्यान दें।",
    "partner": "आप स्वरा हैं, नवगुरुकुल की एआई सहायिका, साझेदारों (NGO/सरकार/शिक्षकों) के लिए। पेशेवर और जानकारी-आधारित जवाब दें।"
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
        primary_llm = OpenAI(
            api_key=os.environ.get("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com/v1"
        )

def translate_hi_to_en_for_retrieval(client, hi_query):
    # Why: corpus is English + Hinglish (Roman script), but the embedding model
    # (nv-embedqa-e5-v5) is English-first. Devanagari queries end up cosine-far
    # from the Hinglish/English chunks, so similarity_search returns irrelevant
    # docs and the LLM — grounded only on context — falls back to "I don't have
    # that information" for every Hindi question. Translating the query to
    # English aligns its script/vocabulary with the corpus before retrieval.
    # The original Hindi query is still passed to the LLM so the user-facing
    # answer stays in Hindi.
    try:
        resp = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "The user's question is in Hindi — written either in Devanagari (e.g. 'नवगुरुकुल का संस्थापक कौन है') or in Hinglish / Romanized Hindi (e.g. 'navGurukul ke baare mein batao'). Translate it into a concise English search query suitable for vector retrieval. Preserve proper nouns like NavGurukul as-is. Output only the English query text — no quotes, no prefix, no explanation."},
                {"role": "user", "content": hi_query}
            ],
            temperature=0.0,
            max_tokens=60,
        )
        en = (resp.choices[0].message.content or "").strip()
        return en or hi_query
    except Exception as e:
        print(f"[WARN] HI->EN translation failed, falling back to original query: {e}", flush=True)
        return hi_query

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

    # 3. RAG CONTEXT — enrich short/follow-up queries with the previous user turn
    # so that "yes"/"continue" doesn't retrieve random docs and hijack the topic.
    history_from_frontend = data.get("history", "")
    prev_user_line = ""
    for line in reversed(history_from_frontend.split("\n")):
        stripped = line.strip()
        if stripped.lower().startswith("user:"):
            prev_user_line = stripped[5:].strip()
            break

    if len(query.split()) <= 4 and prev_user_line:
        rag_query = f"{prev_user_line} {query}"
    else:
        rag_query = query

    # Translate Devanagari queries to English before vector search. See
    # translate_hi_to_en_for_retrieval() docstring for rationale (corpus is
    # English/Hinglish, embedding model is English-first, so Hindi queries
    # retrieve irrelevant docs).
    if user_lang == 'hi':
        original_rag_query = rag_query
        rag_query = translate_hi_to_en_for_retrieval(primary_llm, rag_query)
        print(f"[DEBUG] HI->EN rag_query: {original_rag_query[:120]} => {rag_query[:120]}", flush=True)

    docs = vector_db.similarity_search(rag_query, k=RAG_TOP_K) if vector_db else []
    context = "\n\n---\n\n".join([f"[Doc {i+1}] {d.page_content}" for i, d in enumerate(docs)])[:RAG_MAX_CONTEXT_CHARS]
    print(f"\n[DEBUG] ===== RAG RETRIEVAL =====", flush=True)
    print(f"[DEBUG] Query: {rag_query[:150]}", flush=True)
    print(f"[DEBUG] Retrieved {len(docs)} docs, total context chars: {len(context)}", flush=True)
    for i, d in enumerate(docs):
        source = d.metadata.get("source") or d.metadata.get("file_path") or d.metadata.get("title") or "unknown"
        preview = d.page_content[:200].replace("\n", " ")
        print(f"[DEBUG] --- Doc {i+1} | source={source} | chars={len(d.page_content)} ---", flush=True)
        print(f"[DEBUG]   metadata: {d.metadata}", flush=True)
        print(f"[DEBUG]   preview: {preview}...", flush=True)
    print(f"[DEBUG] ==========================\n", flush=True)

    # 1+2. LANGUAGE-SPECIFIC SYSTEM PROMPT
    if user_lang == 'hi':
        role_text = ROLE_PROMPTS_HI.get(selected_role, ROLE_PROMPTS_HI['student'])
        if is_first_message:
            greeting_rule = "अपने उत्तर की शुरुआत 'नमस्ते! मैं स्वरा, नवगुरुकुल एआई सहायिका हूँ। मैं आपकी कैसे मदद कर सकती हूँ?' से करें।"
        else:
            greeting_rule = "अभिवादन न करें। नमस्ते/Hello न कहें। सीधे प्रश्न का उत्तर दें।"

        system_prompt = (
            "# ग्राउंडिंग नियम (सर्वोच्च प्राथमिकता — सभी अन्य नियमों से ऊपर)\n"
            "1. केवल उपयोगकर्ता संदेश में दिए गए ---संदर्भ--- में मौजूद तथ्यों का उपयोग करें।\n"
            "2. अपनी पूर्व जानकारी, सामान्य ज्ञान, या किसी उदाहरण को तथ्य के रूप में उपयोग न करें।\n"
            "3. यदि उत्तर संदर्भ में नहीं है, तो केवल यह कहें: 'मेरे पास यह जानकारी नहीं है। कृपया नवगुरुकुल से सीधे संपर्क करें।' और रुक जाएं — कुछ और न जोड़ें।\n"
            "4. ऐसे चरण, संख्या, अवधि, नाम, या समय सीमा कभी न गढ़ें जो संदर्भ में नहीं हैं।\n\n"
            "# भाषा\n"
            "आप केवल और केवल हिंदी (देवनागरी लिपि) में जवाब दें। अंग्रेज़ी, हिंग्लिश या रोमन लिपि का प्रयोग न करें। "
            "संदर्भ में अंग्रेज़ी हो सकती है, परन्तु आपका उत्तर पूरी तरह शुद्ध हिंदी में होना चाहिए।\n\n"
            f"# पहचान\n{role_text}\n\n"
            f"# अभिवादन\n{greeting_rule}\n\n"
            "# प्रारूप\n"
            "- अधिकतम 3-4 पंक्तियों में उत्तर दें।\n"
            "- सूची के लिए 1. 2. 3. का प्रयोग करें। *, # या - का उपयोग न करें।\n"
            "- निरंतर बातचीत में अभिवादन न दोहराएं।\n\n"
            "# चेकपॉइंट वाक्य (डिफ़ॉल्ट: बंद — न जोड़ें)\n"
            "डिफ़ॉल्ट रूप से, उत्तर को पूर्ण विराम पर समाप्त करें और रुक जाएं। कोई अनुवर्ती प्रश्न न जोड़ें।\n"
            "चेकपॉइंट वाक्य केवल तभी जोड़ें जब निम्न तीनों शर्तें सत्य हों:\n"
            "  (अ) प्रश्न किसी बहु-चरण प्रक्रिया के बारे में है (जैसे प्रवेश के चरण, नामांकन प्रक्रिया),\n"
            "  (ब) इस उत्तर में आपने केवल एक चरण बताया है, और\n"
            "  (स) ---संदर्भ--- में अगला चरण स्पष्ट रूप से मौजूद है जो आपने अभी तक नहीं बताया।\n"
            "यदि इनमें से कोई भी शर्त पूरी नहीं होती — सरल तथ्यात्मक प्रश्न, हाँ/नहीं उत्तर, या 'जानकारी नहीं है' उत्तर सहित — तो चेकपॉइंट वाक्य न जोड़ें।\n"
            "जब अनुमति हो, तब एक छोटा वाक्य जैसे 'क्या मैं आगे बढ़ूँ?' या 'क्या अगला चरण बताऊँ?' का उपयोग करें — और सामग्री गढ़कर इसे जोड़ने का बहाना कभी न बनाएं।\n\n"
            "# इतिहास\n"
            "[इतिहास] पढ़कर समझें कि आप कौन सा भाग पहले ही बता चुके हैं — वही बात दोहराएं नहीं।\n\n"
            "🔴 अंतिम याद: आपका पूरा उत्तर केवल हिंदी (देवनागरी) में होना चाहिए। संदर्भ के बाहर की कोई जानकारी न जोड़ें।"
        )
    else:
        greeting_msg = "Hello! I am Swara, the NavGurukul AI assistant."
        lang_instruction = "You MUST respond ONLY and ALWAYS in English. NEVER use Hindi or any other language."
        if is_first_message:
            greeting_rule = f"START your response with: '{greeting_msg} How can I help you today?'"
        else:
            greeting_rule = "DO NOT greet. DO NOT say Hello/Namaste. Directly answer the question."

        system_prompt = (
            "# GROUNDING (HIGHEST PRIORITY — OVERRIDES ALL OTHER RULES)\n"
            "1. Answer ONLY using facts present in the ---CONTEXT--- provided in the user message.\n"
            "2. Do NOT use prior training, world knowledge, or any example as a source of facts.\n"
            "3. If the answer is NOT in the context, reply exactly: \"I don't have that information. Please contact NavGurukul directly.\" Then STOP — add nothing else.\n"
            "4. Never invent stages, steps, durations, numbers, names, eligibility criteria, or timelines that the context does not explicitly state.\n"
            "5. If the context partially answers the question, answer only the part that's covered and say the rest is not available.\n\n"
            f"# LANGUAGE\n{lang_instruction}\n\n"
            f"# IDENTITY\n{ROLE_PROMPTS.get(selected_role, ROLE_PROMPTS['student'])}\n\n"
            f"# GREETING\n{greeting_rule}\n\n"
            "# FORMAT\n"
            "- Keep replies to 3-4 sentences max.\n"
            "- Use 1. 2. 3. for numbered lists. Never use *, #, or -.\n"
            "- Do not repeat greetings in follow-up turns.\n\n"
            "# CHECKPOINT LINE (DEFAULT: OFF — do NOT add one)\n"
            "By default, end your answer with a period and STOP. Do not add any follow-up question.\n"
            "Only add a checkpoint line if ALL of these are true:\n"
            "  (a) the user's question is about a multi-step process (e.g. admission stages, enrollment steps),\n"
            "  (b) you answered ONE step in this turn, AND\n"
            "  (c) the ---CONTEXT--- explicitly contains the NEXT step you have not yet shared.\n"
            "If any of (a)(b)(c) is false — including simple factual questions, yes/no answers, or 'I don't have that information' replies — DO NOT add a checkpoint line.\n"
            "When allowed, use exactly one short line such as 'Shall I continue?' or 'Want the next step?' — never invent content to justify adding it.\n\n"
            "# HISTORY\n"
            "Read [HISTORY] to know which part you already explained — do not repeat it, move to the next one (only if that next part is in the context).\n\n"
            "🔴 FINAL REMINDER: Every fact in your reply must be traceable to the ---CONTEXT---. If it isn't, don't say it."
        )

    print(f"[DEBUG] User Language: {user_lang}")

    try:
        if user_lang == 'hi':
            user_message = (
                "केवल नीचे दिए गए संदर्भ का उपयोग करके उत्तर दें। "
                "यदि उत्तर संदर्भ में नहीं है, तो कहें कि आपके पास यह जानकारी नहीं है।\n"
                f"---संदर्भ---\n{context}\n---संदर्भ समाप्त---\n\n"
                f"[इतिहास]\n{history_from_frontend}\n\n"
                f"प्रश्न: {query}\nहिंदी में उत्तर:"
            )
        else:
            user_message = (
                "Use ONLY the following context to answer. "
                "If the answer is not in the context, say you don't have that information.\n"
                f"---CONTEXT---\n{context}\n---END CONTEXT---\n\n"
                f"[HISTORY]\n{history_from_frontend}\n\n"
                f"User Question: {query}\nAI:"
            )
        
        def generate():
            response = primary_llm.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.0,
                top_p=0.1,
                max_tokens=LLM_MAX_TOKENS,
                stream=True
            )
            for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        return Response(stream_with_context(generate()), mimetype='text/plain')
    except Exception as e: 
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5001)))