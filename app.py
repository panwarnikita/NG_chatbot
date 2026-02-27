# import os
# import uuid 
# import os
# from dotenv import load_dotenv
# load_dotenv()
# from flask import Flask, render_template, request, jsonify, session, url_for, redirect
# from authlib.integrations.flask_client import OAuth
# from pymongo import MongoClient

# from langchain_community.vectorstores import FAISS
# from langchain_huggingface import HuggingFaceEmbeddings
# from langchain_nvidia_ai_endpoints import ChatNVIDIA 
# from langchain_community.document_loaders import TextLoader
# from langchain_text_splitters import RecursiveCharacterTextSplitter

# app = Flask(__name__)
# app.secret_key = "NAV_GURUKUL_AI_SECRET" 


# MONGO_URI = "mongodb+srv://Nikitapanwar:Panwar123@cluster0.wvwjupu.mongodb.net/?appName=Cluster0"
# client = MongoClient(MONGO_URI)
# db = client['NavGurukulDB']
# chats_collection = db['chats']


# oauth = OAuth(app)
# google = oauth.register(
#     name='google',
#     client_id = os.environ.get('GOOGLE_CLIENT_ID'),
#     client_secret = os.environ.get('GOOGLE_CLIENT_SECRET'),
#     server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
#     client_kwargs={'scope': 'openid email profile'}
# )


# os.environ["NVIDIA_API_KEY"] = os.environ.get('NVIDIA_API_KEY')


# def initialize_vector_db():
#     if os.path.exists("vectorstore"):
#         embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
#         return FAISS.load_local("vectorstore", embeddings, allow_dangerous_deserialization=True)
#     return None


# vector_db = None

# @app.before_request
# def load_db():
#     global vector_db
#     if vector_db is None:
#         vector_db = initialize_vector_db()



# @app.route('/')
# def index():
#     if 'user' in session:
#         all_chats = list(chats_collection.find({"email": session['user']['email']}).sort("_id", -1))
#         seen_ids = set()
#         unique_history = []
#         for chat in all_chats:
#             if 'chat_id' in chat and chat['chat_id'] not in seen_ids:
#                 unique_history.append(chat)
#                 seen_ids.add(chat['chat_id'])
#         return render_template('index.html', user=session['user'], history=unique_history)
#     return redirect(url_for('login_page'))

# @app.route('/login_page')
# def login_page(): return render_template('login.html')

# @app.route('/login')
# def login(): return google.authorize_redirect(url_for('auth', _external=True))

# @app.route('/auth')
# def auth():
#     token = google.authorize_access_token()
#     user = google.parse_id_token(token, nonce=None)
#     session['user'] = user
#     db['users'].update_one({"email": user['email']}, {"$set": user}, upsert=True)
#     return redirect('/')

# @app.route('/get_chat/<chat_id>')
# def get_chat(chat_id):
#     chat = chats_collection.find_one({"chat_id": chat_id})
#     if chat: return jsonify({"messages": chat['messages']})
#     return jsonify({"error": "Chat not found"}), 404

# @app.route('/ask', methods=['POST'])
# def ask():
#     if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    
#     data = request.json
#     query = data.get("query")
#     chat_id = data.get("chat_id")
    
#     history_text = ""
#     if chat_id:
#         chat_data = chats_collection.find_one({"chat_id": chat_id})
#         if chat_data and 'messages' in chat_data:
#             for msg in chat_data['messages'][-5:]:
#                 role = "User" if msg['role'] == 'user' else "NaviAI"
#                 history_text += f"{role}: {msg['content']}\n"


#     docs = vector_db.similarity_search(query, k=10) if vector_db else []
#     context = "\n".join([d.page_content for d in docs])

 
#     system_prompt = (
#         "You are NaviAI, the friendly official NavGurukul assistant. "
#         "STRICT CONVERSATION RULES:\n"
#         "1. RELATIONSHIP: If the user asks 'provide the link' or 'for students', you MUST look at the 'Recent Chat History' first. "
#         "If the previous message was about Notion/Slack/Discord, give links ONLY for those. Do NOT give unrelated links (like Abracadraw) unless specifically asked.\n"
#         "2. NO HALLUCINATION: If the specific link for a tool mentioned in history is NOT in the 'NavGurukul Info' file, "
#         "politely say that you don't have the link in your records. Do NOT guess or provide other random links.\n"
#         "3. TONE: Human-like, no robotic phrases. Match the user's language.\n"
#         "4. CONTINUITY: You are in a continuous chat. Never start a response as if it's the first time you are meeting the user."
#         "5. Knowledge Fallback: Use the NavGurukul context first. If not found, use your general knowledge "
#         "to answer politely while maintaining NavGurukul's supportive vibe. "
#         "6. DEFAULT LANGUAGE: Always start the conversation in English. "
#         "7. ADAPTIVE LANGUAGE: Use English as default language."
#         "8.IMPORTANT: You must act as a continuous conversationalist."
#     )
    
   
#     llm = ChatNVIDIA(model="meta/llama-3.3-70b-instruct", temperature=0.2) 
    
#     try:
#         full_message = f"""
#         {system_prompt}

#         {context}

#         [RECENT_CHAT_HISTORY]
#         {history_text}

#         User Question: {query}
#         NaviAI:"""

#         response = llm.invoke(full_message).content
        
#         if not chat_id:
#             chat_id = str(uuid.uuid4())
#             chats_collection.insert_one({
#                 "chat_id": chat_id, "email": session['user']['email'],
#                 "question": query[:50], 
#                 "messages": [{"role": "user", "content": query}, {"role": "ai", "content": response}]
#             })
#         else:
#             chats_collection.update_one(
#                 {"chat_id": chat_id},
#                 {"$push": {"messages": {"$each": [{"role": "user", "content": query}, {"role": "ai", "content": response}]}}}
#             )
        
#         return jsonify({"response": response, "chat_id": chat_id})
#     except Exception as e:
#         return jsonify({"response": f"Error: {str(e)}"}), 500

# @app.route('/logout')
# def logout():
#     session.pop('user', None)
#     return redirect(url_for('login_page'))

# if __name__ == '__main__':
#     # app.run(debug=True, port=5000)
#     port = int(os.environ.get("PORT", 5000))
#     app.run(host='0.0.0.0', port=port)




import os
import uuid 
from dotenv import load_dotenv
load_dotenv()
from flask import Flask, render_template, request, jsonify, session, url_for, redirect
from authlib.integrations.flask_client import OAuth
from pymongo import MongoClient

from langchain_community.vectorstores import FAISS
# CHANGE 1: HuggingFace hata kar NVIDIAEmbeddings dalo
from langchain_nvidia_ai_endpoints import ChatNVIDIA, NVIDIAEmbeddings 
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

app = Flask(__name__)
app.secret_key = "NAV_GURUKUL_AI_SECRET" 

# Render settings for HTTPS login
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
app.config['PREFERRED_URL_SCHEME'] = 'https'

MONGO_URI = "mongodb+srv://Nikitapanwar:Panwar123@cluster0.wvwjupu.mongodb.net/?appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client['NavGurukulDB']
chats_collection = db['chats']

oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id = os.environ.get('GOOGLE_CLIENT_ID'),
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

os.environ["NVIDIA_API_KEY"] = os.environ.get('NVIDIA_API_KEY')

# Global variable
vector_db = None

def initialize_vector_db():
    if os.path.exists("vectorstore"):
        # CHANGE 2: API based embeddings (RAM ki bachat)
        embeddings = NVIDIAEmbeddings(model="nvidia/nv-embedqa-e5-v5")
        return FAISS.load_local("vectorstore", embeddings, allow_dangerous_deserialization=True)
    return None

# CHANGE 3: @app.before_request hata diya taaki LOGIN fast ho jaye

@app.route('/')
def index():
    if 'user' in session:
        all_chats = list(chats_collection.find({"email": session['user']['email']}).sort("_id", -1))
        seen_ids = set()
        unique_history = []
        for chat in all_chats:
            if 'chat_id' in chat and chat['chat_id'] not in seen_ids:
                unique_history.append(chat)
                seen_ids.add(chat['chat_id'])
        return render_template('index.html', user=session['user'], history=unique_history)
    return redirect(url_for('login_page'))

@app.route('/login_page')
def login_page(): return render_template('login.html')

@app.route('/login')
def login(): return google.authorize_redirect(url_for('auth', _external=True))

@app.route('/auth')
def auth():
    token = google.authorize_access_token()
    user = google.parse_id_token(token, nonce=None)
    session['user'] = user
    db['users'].update_one({"email": user['email']}, {"$set": user}, upsert=True)
    return redirect('/')

@app.route('/get_chat/<chat_id>')
def get_chat(chat_id):
    chat = chats_collection.find_one({"chat_id": chat_id})
    if chat: return jsonify({"messages": chat['messages']})
    return jsonify({"error": "Chat not found"}), 404

@app.route('/ask', methods=['POST'])
def ask():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    
    # CHANGE 4: Lazy loading yahan check hoga (First chat message par load hoga)
    global vector_db
    if vector_db is None:
        vector_db = initialize_vector_db()
        
    data = request.json
    query = data.get("query")
    chat_id = data.get("chat_id")
    
    history_text = ""
    if chat_id:
        chat_data = chats_collection.find_one({"chat_id": chat_id})
        if chat_data and 'messages' in chat_data:
            for msg in chat_data['messages'][-5:]:
                role = "User" if msg['role'] == 'user' else "NaviAI"
                history_text += f"{role}: {msg['content']}\n"

    docs = vector_db.similarity_search(query, k=10) if vector_db else []
    context = "\n".join([d.page_content for d in docs])

    # YOUR ORIGINAL PROMPTS (Unchanged)
    system_prompt = (
        "You are NaviAI, the friendly official NavGurukul assistant. "
        "STRICT CONVERSATION RULES:\n"
        "1. RELATIONSHIP: If the user asks 'provide the link' or 'for students', you MUST look at the 'Recent Chat History' first. "
        "If the previous message was about Notion/Slack/Discord, give links ONLY for those. Do NOT give unrelated links (like Abracadraw) unless specifically asked.\n"
        "2. NO HALLUCINATION: If the specific link for a tool mentioned in history is NOT in the 'NavGurukul Info' file, "
        "politely say that you don't have the link in your records. Do NOT guess or provide other random links.\n"
        "3. TONE: Human-like, no robotic phrases. Match the user's language.\n"
        "4. CONTINUITY: You are in a continuous chat. Never start a response as if it's the first time you are meeting the user."
        "5. Knowledge Fallback: Use the NavGurukul context first. If not found, use your general knowledge "
        "to answer politely while maintaining NavGurukul's supportive vibe. "
        "6. DEFAULT LANGUAGE: Always start the conversation in English. "
        "7. ADAPTIVE LANGUAGE: Use English as default language."
        "8.IMPORTANT: You must act as a continuous conversationalist."
    )
    
    llm = ChatNVIDIA(model="meta/llama-3.3-70b-instruct", temperature=0.2) 
    
    try:
        full_message = f"""{system_prompt}\n\n{context}\n\n[RECENT_CHAT_HISTORY]\n{history_text}\n\nUser Question: {query}\nNaviAI:"""
        response = llm.invoke(full_message).content
        
        if not chat_id:
            chat_id = str(uuid.uuid4())
            chats_collection.insert_one({
                "chat_id": chat_id, "email": session['user']['email'],
                "question": query[:50], 
                "messages": [{"role": "user", "content": query}, {"role": "ai", "content": response}]
            })
        else:
            chats_collection.update_one(
                {"chat_id": chat_id},
                {"$push": {"messages": {"$each": [{"role": "user", "content": query}, {"role": "ai", "content": response}]}}}
            )
        
        return jsonify({"response": response, "chat_id": chat_id})
    except Exception as e:
        return jsonify({"response": f"Error: {str(e)}"}), 500

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login_page'))

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)