#!/bin/bash

# Start the Ollama server in the background
ollama serve &

# Wait for Ollama to start up
sleep 10

# Pull the Gemma model
ollama pull gemma3:1b

# Keep the container running
wait