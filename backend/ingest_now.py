

import os
from dotenv import load_dotenv
from langchain_qdrant import QdrantVectorStore
from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
from langchain_community.document_loaders import TextLoader, DirectoryLoader # 1. DirectoryLoader add kiya
from langchain_text_splitters import RecursiveCharacterTextSplitter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(ROOT_DIR, '.env'))

QDRANT_COLLECTION = os.environ.get("QDRANT_COLLECTION", "navgurukul_docs")
QDRANT_URL = os.environ.get("QDRANT_URL")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")
QDRANT_TIMEOUT = int(os.environ.get("QDRANT_TIMEOUT", "180"))
QDRANT_BATCH_SIZE = int(os.environ.get("QDRANT_BATCH_SIZE", "16"))

def get_qdrant_connection_kwargs(vectorstore_path):
    if QDRANT_URL and QDRANT_API_KEY:
        return {
            "url": QDRANT_URL,
            "api_key": QDRANT_API_KEY,
            "prefer_grpc": False,
            "timeout": QDRANT_TIMEOUT,
        }
    return {
        "path": vectorstore_path,
    }

def create_vector_db():
    # Ab hum sirf ek file nahi, pura "data" folder check karenge
    data_folder = os.path.join(BASE_DIR, "data")

    if not os.path.exists(data_folder):
        print("Error: data folder nahi mila!")
        return

    print(f"Data load ho raha hai folder se: {data_folder}...")
    
    # 2. DirectoryLoader use kiya taaki Admission.txt, QA.txt, etc. sab utha le
    loader = DirectoryLoader(data_folder, glob="*.txt", loader_cls=TextLoader)
    documents = loader.load()

    print(f"Total {len(documents)} files mil gayi hain.")

    print("Text split ho raha hai...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=700, chunk_overlap=100)
    docs = text_splitter.split_documents(documents)

    print("NVIDIA Embeddings se Qdrant Vector DB ban raha hai...")
    embeddings = NVIDIAEmbeddings(model="nvidia/nv-embedqa-e5-v5")

    using_cloud = bool(QDRANT_URL and QDRANT_API_KEY)

    QdrantVectorStore.from_documents(
        docs,
        embeddings,
        collection_name=QDRANT_COLLECTION,
        batch_size=QDRANT_BATCH_SIZE,
        force_recreate=True, # Purana data delete karke naya data refresh karega
        **get_qdrant_connection_kwargs(""),
    )
    
    if using_cloud:
        print("✅ Success! Qdrant Cloud refresh ho gaya saari files ke saath.")
    else:
        print("✅ Success! Local vectorstore update ho gaya.")

if __name__ == "__main__":
    create_vector_db()