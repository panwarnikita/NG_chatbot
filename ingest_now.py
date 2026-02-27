import os
from langchain_community.vectorstores import FAISS
from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# NVIDIA API Key yahan dalo
os.environ["NVIDIA_API_KEY"] = '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'

def create_vector_db():
    if not os.path.exists("data/about_ng.txt"):
        print("Error: about_ng.txt file nahi mili!")
        return

    print("Data load ho raha hai...")
    loader = TextLoader("data/about_ng.txt")
    documents = loader.load()

    print("Text split ho raha hai...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=700, chunk_overlap=100)
    docs = text_splitter.split_documents(documents)

    print("NVIDIA Embeddings se Vectorstore ban raha hai...")
    embeddings = NVIDIAEmbeddings(model="nvidia/nv-embedqa-e5-v5")
    
    # Naya vectorstore create karega
    vector_db = FAISS.from_documents(docs, embeddings)

    # Use 'vectorstore' folder mein save karega
    vector_db.save_local("vectorstore")
    print("✅ Success! 'vectorstore' folder ban gaya hai.")

if __name__ == "__main__":
    create_vector_db()