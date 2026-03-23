import os
import json
import requests
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load Profile
with open(os.path.join(BASE_DIR, 'info.json'), 'r', encoding='utf-8') as f:
    MY_INFO_DATA = json.load(f)

RULES = (
    "You are Tony's digital gatekeeper. Your style is INTP: direct and witty. "
    f"Identity Data: {json.dumps(MY_INFO_DATA)}. "
    "Rules: 1. Say 'Yo' to greetings. 2. Don't dump info. 3. Max 2 sentences. "
    "4. Ask their name if they ask yours. 5. Use emojis but never be angry."
)

# API Keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
HF_TOKEN = os.getenv("HF_TOKEN")

# Clients
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

def get_groq_response(user_message, history):
    """Layer 1: Groq (Llama 3.1 8B) - Fastest & High Limit"""
    try:
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
        messages = [{"role": "system", "content": RULES}]
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})

        payload = {"model": "llama-3.1-8b-instant", "messages": messages, "temperature": 0.7, "max_tokens": 150}
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=8)
        return response.json()["choices"][0]["message"]["content"]
    except Exception:
        return None

def get_gemini_response(user_message, history):
    """Layer 2: Gemini 1.5 Flash - Most Reliable Backup"""
    try:
        formatted_history = []
        for msg in history:
            role = "user" if msg["role"] == "user" else "model"
            formatted_history.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))
        
        chat = gemini_client.chats.create(
            model='gemini-1.5-flash', # Use 1.5 Flash for huge free daily limits
            config=types.GenerateContentConfig(system_instruction=RULES),
            history=formatted_history
        )
        return chat.send_message(user_message).text
    except Exception:
        return None

def get_hf_chat_response(user_message, history):
    """Layer 3: Hugging Face (Mistral-7B) - The Emergency Net"""
    try:
        API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"
        headers = {"Authorization": f"Bearer {HF_TOKEN}"}
        
        # Simple prompt construction for HF
        prompt = f"System: {RULES}\n"
        for msg in history:
            prompt += f"{msg['role']}: {msg['content']}\n"
        prompt += f"user: {user_message}\nassistant:"

        response = requests.post(API_URL, headers=headers, json={"inputs": prompt, "parameters": {"max_new_tokens": 100}}, timeout=10)
        output = response.json()
        # Clean up output to just get the assistant's reply
        full_text = output[0]['generated_text']
        return full_text.split("assistant:")[-1].strip()
    except Exception:
        return "Everyone is offline. Even the backup's backup. Try later! ⚡"

def scan_ai_text(text):
    """Utility: AI Content Detector (Specific task)"""
    try:
        headers = {"Authorization": f"Bearer {HF_TOKEN}"}
        API_URL = "https://api-inference.huggingface.co/models/Hello-SimpleAI/chatgpt-detector-roberta"
        response = requests.post(API_URL, headers=headers, json={"inputs": text}, timeout=10)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def get_ai_response(user_message, history):
    """The Triple-Threat Waterfall"""
    # 1. Try Groq
    res = get_groq_response(user_message, history)
    if res: return res
    
    # 2. Try Gemini
    print("⚠️ Groq down. Trying Gemini...")
    res = get_gemini_response(user_message, history)
    if res: return res
    
    # 3. Try Hugging Face
    print("⚠️ Gemini down. Trying Hugging Face...")
    return get_hf_chat_response(user_message, history)