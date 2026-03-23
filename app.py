# app.py
from flask import Flask, request, jsonify, render_template, session
from datetime import timedelta
import joblib
import os
# Import both the chat and the new scan function
from chatbot import get_ai_response, scan_ai_text

app = Flask(__name__)

# --- SESSION CONFIG ---
# Secured session for Jhon Anthony Pano's Portfolio
app.secret_key = os.getenv("FLASK_SECRET_KEY", "jhon_anthony_pano_secret_key_2026")
app.permanent_session_lifetime = timedelta(days=1)

# --- Paths & Models (UNTOUCHED AS REQUESTED) ---
model_folder = os.path.join("train", "models")
vectorizer_path = os.path.join(model_folder, "vectorizer.pkl")
svm_path = os.path.join(model_folder, "svm_model.pkl")
lr_path = os.path.join(model_folder, "lr_model.pkl")
nb_path = os.path.join(model_folder, "nb_model.pkl")

print("Loading models and vectorizer...")
vectorizer = joblib.load(vectorizer_path)
svm_model = joblib.load(svm_path)
lr_model = joblib.load(lr_path)
nb_model = joblib.load(nb_path)
print("Models loaded successfully!")

@app.route("/")
def home():
    return render_template("index.html")

# --- UPGRADED: Chatbot System ---
@app.route("/chat", methods=["POST"])
def chat():
    session.permanent = True  
    data = request.get_json()
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"reply": "Yo, you gotta type something first! 🙄"})

    if "chat_history" not in session:
        session["chat_history"] = []

    # get_ai_response now handles Groq -> Gemini -> HF automatically
    ai_reply = get_ai_response(user_message, list(session["chat_history"]))

    # Update session
    history = session["chat_history"]
    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": ai_reply})

    # Keep last 10 exchanges (20 msgs) to prevent Cookie Overflow
    if len(history) > 20:
        history = history[-20:]

    session["chat_history"] = history
    session.modified = True 

    return jsonify({"reply": ai_reply})

# --- NEW UPGRADE: AI Detector Route --- (not using it -- out of project plan)
@app.route("/scan", methods=["POST"])
def scan():
    """Uses the Hugging Face model to check if text is AI-generated"""
    data = request.get_json()
    text_to_scan = data.get("text", "").strip()
    
    if not text_to_scan:
        return jsonify({"error": "No text to scan"}), 400
        
    result = scan_ai_text(text_to_scan)
    return jsonify(result)

# --- PREDICT AREA (UNTOUCHED) ---
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400

    text = str(data["text"])
    vec = vectorizer.transform([text])

    try:
        svm_prob = float(svm_model.predict_proba(vec)[0][1])
    except AttributeError:
        svm_prob = float(svm_model.predict(vec)[0])

    lr_prob = float(lr_model.predict_proba(vec)[0][1])
    nb_prob = float(nb_model.predict_proba(vec)[0][1])

    return jsonify({
        "nb": nb_prob,
        "lsvm": svm_prob,
        "lr": lr_prob
    })

if __name__ == "__main__":
    app.run(debug=True)