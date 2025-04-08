# app.py
from flask import Flask, request, jsonify, Response, render_template
from flask_cors import CORS
import requests
import json
import os

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

OLLAMA_API_URL = "http://localhost:11434/api/generate"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')
    
    def generate():
        headers = {
            'Content-Type': 'application/json',
        }
        
        payload = {
            'model': 'gemma3:1b',
            'prompt': user_message,
            'stream': True
        }
        
        try:
            with requests.post(OLLAMA_API_URL, json=payload, headers=headers, stream=True) as response:
                for line in response.iter_lines():
                    if line:
                        try:
                            line_data = json.loads(line)
                            if 'response' in line_data:
                                yield f"data: {json.dumps({'text': line_data['response']})}\n\n"
                        except json.JSONDecodeError:
                            continue
                
                # Send a completion message
                yield f"data: {json.dumps({'done': True})}\n\n"
                
        except requests.RequestException as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        # Use a quick health check instead of a full model load
        response = requests.get("http://localhost:11434/api/tags")
        if response.status_code == 200:
            # Check if the model exists
            models = response.json().get("models", [])
            model_exists = any(m.get("name") == "gemma3:1b" for m in models)
            
            if model_exists:
                return jsonify({"status": "ok", "message": "Ollama service is running with Gemma 3 model"})
            else:
                return jsonify({"status": "warning", "message": "Ollama running but Gemma 3 model not found"}), 200
        else:
            return jsonify({"status": "error", "message": "Ollama service returned an error"}), 500
    except requests.RequestException:
        return jsonify({"status": "error", "message": "Could not connect to Ollama service"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)