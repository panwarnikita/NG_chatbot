# -*- coding: utf-8 -*-
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
RAG_TOP_K = 5
RAG_MAX_CONTEXT_CHARS = 1500
LLM_MAX_TOKENS = 180

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

    docs = vector_db.similarity_search(rag_query, k=RAG_TOP_K) if vector_db else []
    context = "\n".join([d.page_content for d in docs])[:RAG_MAX_CONTEXT_CHARS]
    print(f"[DEBUG] RAG query: {rag_query[:100]}")

    # 1+2. LANGUAGE-SPECIFIC SYSTEM PROMPT
    if user_lang == 'hi':
        role_text = ROLE_PROMPTS_HI.get(selected_role, ROLE_PROMPTS_HI['student'])
        if is_first_message:
            greeting_rule = "अपने उत्तर की शुरुआत 'नमस्ते! मैं स्वरा, नवगुरुकुल एआई सहायिका हूँ। मैं आपकी कैसे मदद कर सकती हूँ?' से करें।"
        else:
            greeting_rule = "अभिवादन न करें। नमस्ते/Hello न कहें। सीधे प्रश्न का उत्तर दें।"

        system_prompt = (
            "⚠️ अति महत्वपूर्ण भाषा नियम: आप केवल और केवल हिंदी (देवनागरी लिपि) में जवाब दें। "
            "कभी भी अंग्रेज़ी, हिंग्लिश या रोमन लिपि का प्रयोग न करें। "
            "नीचे दिए गए संदर्भ में अंग्रेज़ी हो सकती है, परन्तु आपका उत्तर पूरी तरह शुद्ध हिंदी में होना चाहिए।\n\n"
            f"{role_text}\n\n"
            f"अभिवादन नियम: {greeting_rule}\n\n"
            "मूल नियम:\n"
            "1. दोहराव नहीं: निरंतर बातचीत में अभिवादन न दोहराएं।\n"
            "2. प्रतीक नहीं: सूची के लिए 1. 2. 3. का प्रयोग करें। *, # या - का उपयोग न करें।\n"
            "3. ज्ञान: नीचे दिए संदर्भ का उपयोग करके SOE, नागपुर आदि के बारे में उत्तर दें।\n"
            "4. छोटा उत्तर: अधिकतम 3-4 पंक्तियों में बात करें। एक ही बार में पूरी जानकारी न दें।\n"
            "5. हमेशा चेकपॉइंट वाक्य से समाप्त करें: कई चरणों वाले विषयों में हर उत्तर को 3-4 पंक्तियों की व्याख्या के बाद एक छोटे चेकपॉइंट वाक्य से समाप्त करें। यह अनिवार्य है। नीचे दी गई सूची में से एक वाक्य चुनें (हर बार अलग चुनें, एक ही वाक्य लगातार न दोहराएं):\n"
            "   - 'क्या मैं आगे बढ़ूँ?'\n"
            "   - 'क्या अगला चरण भी बताऊँ?'\n"
            "   - 'अगले भाग पर जाएं?'\n"
            "   - 'क्या यह स्पष्ट है?'\n"
            "   - 'कोई प्रश्न है इस पर?'\n"
            "   केवल व्याख्या पर उत्तर समाप्त न करें — अंत में चेकपॉइंट वाक्य अवश्य होना चाहिए।\n"
            "6. उत्तर की प्रतीक्षा: चेकपॉइंट वाक्य के बाद उपयोगकर्ता के उत्तर की प्रतीक्षा करें। 'हाँ'/'आगे बढ़ो' पर अगला चरण दें (दूसरे चेकपॉइंट वाक्य के साथ)। कोई प्रश्न हो तो पहले उत्तर दें, फिर दोबारा चेकपॉइंट पूछें।\n"
            "\nउदाहरण:\n"
            "उपयोगकर्ता: प्रवेश प्रक्रिया क्या है?\n"
            "स्वरा: प्रवेश प्रक्रिया दो चरणों में होती है। पहला चरण है ऑनलाइन आवेदन — जहाँ आप अपनी जानकारी भरते हैं और दस्तावेज़ अपलोड करते हैं। इसे घर बैठे 20 मिनट में पूरा किया जा सकता है। क्या मैं दूसरा चरण भी बताऊँ?\n"
            "उपयोगकर्ता: हाँ\n"
            "स्वरा: दूसरा चरण है कैंपस में व्यक्तिगत साक्षात्कार। आपसे आपकी रुचियों और पृष्ठभूमि पर सरल प्रश्न पूछे जाएंगे, घबराने की कोई बात नहीं। कोई प्रश्न है इस पर?\n"
            "7. इतिहास देखें: [इतिहास] पढ़कर समझें कि आप कौन सा चरण पहले ही बता चुके हैं — वही बात दोहराएं नहीं, अगले चरण पर बढ़ें।\n\n"
            f"संदर्भ:\n{context}\n\n"
            "🔴 अंतिम याद: आपका पूरा उत्तर केवल हिंदी (देवनागरी) में होना चाहिए। एक भी अंग्रेज़ी शब्द न लिखें।"
        )
    else:
        greeting_msg = "Hello! I am Swara, the NavGurukul AI assistant."
        lang_instruction = "You MUST respond ONLY and ALWAYS in English. NEVER use Hindi or any other language."
        if is_first_message:
            greeting_rule = f"START your response with: '{greeting_msg} How can I help you today?'"
        else:
            greeting_rule = "DO NOT greet. DO NOT say Hello/Namaste. Directly answer the question."

        system_prompt = (
            f"⚠️ CRITICAL - LANGUAGE RULE: {lang_instruction}\n\n"
            f"{ROLE_PROMPTS.get(selected_role, ROLE_PROMPTS['student'])}\n\n"
            f"GREETING RULE: {greeting_rule}\n\n"
            "CORE RULES:\n"
            "1. NO REPETITION: Don't repeat greetings in a continuous chat.\n"
            "2. NO SYMBOLS: Use 1. 2. 3. for lists. NEVER use * or # or -.\n"
            "3. KNOWLEDGE: Answer questions about SOE, Nagpur, etc., using the context below.\n"
            "4. SHORT ANSWERS: Keep each reply to 3-4 sentences max. Do NOT dump everything at once.\n"
            "5. ALWAYS END WITH A CHECKPOINT LINE: For multi-stage topics, after explaining one stage in 3-4 sentences, you MUST end your reply with one short checkpoint line. This is mandatory. Pick ONE line from this list (rotate — do not repeat the same one two turns in a row):\n"
            "   - 'Shall I continue?'\n"
            "   - 'Want me to explain the next part?'\n"
            "   - 'Ready for the next step?'\n"
            "   - 'Does that make sense so far?'\n"
            "   - 'Any questions before I go on?'\n"
            "   Never end your reply with just the explanation — the checkpoint line is required.\n"
            "6. WAIT FOR THE REPLY: After the checkpoint line, wait for the user. 'yes/continue/go on' → next stage (with a different checkpoint line). A question → answer it first, then re-ask with a checkpoint line.\n"
            "\nExample:\n"
            "User: What is the admission process?\n"
            "Swara: The admission process has two stages. Stage 1 is the online application, where you fill in your details and upload documents. You can complete it from home in about 20 minutes. Want me to explain the next part?\n"
            "User: Yes\n"
            "Swara: Stage 2 is an in-person interview at the campus. You'll be asked simple questions about your interests and background — nothing to worry about. Any questions before I go on?\n"
            "7. CHECK HISTORY: Read [HISTORY] to know which stage you already explained — do not repeat it, move to the next one.\n\n"
            f"Context:\n{context}"
        )

    print(f"[DEBUG] User Language: {user_lang}")

    try:
        if user_lang == 'hi':
            full_message = f"{system_prompt}\n\n[इतिहास]\n{history_from_frontend}\nप्रश्न: {query}\nहिंदी में उत्तर:"
        else:
            full_message = f"{system_prompt}\n\n[HISTORY]\n{history_from_frontend}\nUser Question: {query}\nAI:"
        
        def generate():
            for chunk in primary_llm.stream(full_message):
                if chunk.content:
                    yield chunk.content

        return Response(stream_with_context(generate()), mimetype='text/plain')
    except Exception as e: 
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5001)))