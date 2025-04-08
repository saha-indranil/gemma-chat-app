# Gemma 3 Chat App

A modern web application to chat with the Gemma 3 1B model via Ollama, with support for both local development and containerized deployment.

## Features

- Clean, modern user interface
- Real-time streaming responses from Gemma 3 1B parameter model (32k context window)
- Stop button to interrupt ongoing responses
- Status indicators for model connectivity
- Code block formatting
- Auto-resizing input field
- Responsive design for mobile and desktop
- Docker containerization for easy deployment

## Local Development Setup

### Prerequisites

- Python 3.7+
- Ollama installed and running locally
- Gemma 3 1B model pulled (`ollama pull gemma3:1b`)

### Setup Instructions

1. Clone or download this repository

2. Install dependencies:

   ```
   pip install -r requirements.txt
   ```

3. Make sure Ollama is running with the Gemma 3 1B model installed:

   ```
   ollama list
   ```

   If you don't see `gemma3:1b` in the list, pull it:

   ```
   ollama pull gemma3:1b
   ```

4. Run the Flask application:

   ```
   python app.py
   ```

5. Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

## Deployment with Docker

For deployment on servers where Ollama isn't pre-installed or for easier setup, you can use Docker:

### Prerequisites

- Docker and Docker Compose

### Deployment Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/saha-indranil/gemma-chat-app.git
   cd gemma-chat-app
   ```

2. Start the application with Docker Compose:
   ```bash
   docker-compose up -d
   ```

3. The application will be available at http://localhost:5000

4. Initial startup may take some time as the Gemma 3 1B model (~815 MB) is downloaded.

### Without GPU

If you're running on a system without a GPU, modify the `docker-compose.yml` file to remove the GPU-specific configuration:

```yaml
# Remove this section from docker-compose.yml if no GPU is available
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

## Project Structure

```
gemma-chat-app/
├── app.py                 # Flask backend
├── requirements.txt       # Python dependencies
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile.app         # Dockerfile for Flask app
├── Dockerfile.ollama      # Dockerfile for Ollama service
├── start-ollama.sh        # Script to initialize Ollama and pull the model
├── .gitignore             # Git ignore file
├── templates/
│   └── index.html         # Main HTML template
└── static/
    ├── css/
    │   └── styles.css     # Styling
    └── js/
        └── main.js        # Frontend JavaScript
```

## Customization

- To change the Ollama API URL, update the `OLLAMA_API_URL` variable in `app.py`
- Adjust styling in `static/css/styles.css`
- Modify the UI behavior in `static/js/main.js`

## Troubleshooting

### Local Setup Issues

If you encounter any issues with local setup:

1. Make sure Ollama is running by checking `http://localhost:11434` in your browser
2. Verify the Gemma 3 1B model is installed with `ollama list`
3. Check the Flask server logs for any backend errors
4. Inspect your browser's developer console for frontend errors

### Docker Deployment Issues

1. Check container status: `docker-compose ps`
2. View container logs: `docker-compose logs -f`
3. Make sure your server has enough RAM (4GB minimum recommended)
4. If the model download seems stuck, check network connectivity and disk space
