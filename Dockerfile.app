FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Modify app.py to use the environment variable for Ollama URL
RUN sed -i 's|OLLAMA_API_URL = "http://localhost:11434/api/generate"|OLLAMA_API_URL = os.environ.get("OLLAMA_API_URL", "http://localhost:11434") + "/api/generate"|g' app.py

# Also update the health check URL
RUN sed -i 's|"http://localhost:11434/api/tags"|os.environ.get("OLLAMA_API_URL", "http://localhost:11434") + "/api/tags"|g' app.py

EXPOSE 5000

CMD ["python", "app.py"]