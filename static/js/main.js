// static/js/main.js
document.addEventListener("DOMContentLoaded", function () {
  const chatContainer = document.getElementById("chat-container");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const stopButton = document.getElementById("stop-button");
  const statusIndicator = document.getElementById("status-indicator");

  let activeResponseId = null;
  let abortController = null;

  // Check if the Ollama service is running
  function checkServiceStatus() {
    updateStatus("connecting", "Connecting to Ollama...");

    fetch("/api/health")
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "ok") {
          updateStatus("online", "Connected to Gemma 3 1B");
        } else {
          updateStatus("offline", "Cannot connect to Ollama");
        }
      })
      .catch((error) => {
        updateStatus("offline", "Service unavailable");
        console.error("Health check error:", error);
      });
  }

  function updateStatus(status, message) {
    const statusDot = statusIndicator.querySelector(".status-dot");
    const statusText = statusIndicator.querySelector(".status-text");

    statusDot.className = "status-dot " + status;
    statusText.textContent = message;
  }

  function addMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender);

    const messageContent = document.createElement("div");
    messageContent.classList.add("message-content");

    // Format code blocks if it's a bot message
    let formattedText = text;
    if (sender === "bot") {
      formattedText = formatMarkdown(text);
    }

    messageContent.innerHTML = formattedText;
    messageDiv.appendChild(messageContent);

    // Add a unique ID for bot messages that need updating
    if (sender === "bot" && !messageDiv.id) {
      activeResponseId = "bot-message-" + Date.now();
      messageDiv.id = activeResponseId;
    }

    chatContainer.appendChild(messageDiv);
    scrollToBottom();
    return messageDiv;
  }

  function formatMarkdown(text) {
    // Improved markdown processor for formatting various elements
    let formatted = text;

    // Format code blocks with ```
    formatted = formatted.replace(
      /```(\w*)([\s\S]*?)```/g,
      function (match, language, code) {
        return `<pre><code class="language-${language}">${escapeHtml(
          code.trim(),
        )}</code></pre>`;
      },
    );

    // Format inline code with `
    formatted = formatted.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Format bold text with ** or __
    formatted = formatted.replace(
      /\*\*(.*?)\*\*|__(.*?)__/g,
      "<strong>$1$2</strong>",
    );

    // Format italic text with * or _
    formatted = formatted.replace(/\*(.*?)\*|_(.*?)_/g, "<em>$1$2</em>");

    // Format bullet points
    formatted = formatted.replace(/^\s*[\*\-]\s+(.*)/gm, "<li>$1</li>");
    formatted = formatted.replace(/<li>.*?<\/li>(?=\n<li>)/g, function (match) {
      return "<ul>" + match;
    });
    formatted = formatted.replace(/<\/li>(?!\n<li>)/g, "</li></ul>");

    // Format numbered lists
    formatted = formatted.replace(/^\s*(\d+)\.\s+(.*)/gm, "<li>$2</li>");
    formatted = formatted.replace(/<li>.*?<\/li>(?=\n<li>)/g, function (match) {
      if (!match.includes("<ul>")) {
        return "<ol>" + match;
      }
      return match;
    });
    formatted = formatted.replace(/<\/li>(?!\n<li>)/g, function (match) {
      if (match.includes("<ol>")) {
        return "</li></ol>";
      }
      return match;
    });

    // Format headings (# Heading)
    formatted = formatted.replace(
      /^(#{1,6})\s+(.*?)$/gm,
      function (match, hashes, content) {
        const level = hashes.length;
        return `<h${level}>${content}</h${level}>`;
      },
    );

    // Convert line breaks to <br> except after block elements
    formatted = formatted.replace(
      /\n(?!<\/(?:pre|h\d|ul|ol|li|blockquote)>)/g,
      "<br>",
    );

    return formatted;
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showTypingIndicator() {
    const indicatorDiv = document.createElement("div");
    indicatorDiv.classList.add("message", "bot", "typing-indicator");
    indicatorDiv.id = "typing-indicator";

    const indicatorContent = document.createElement("div");
    indicatorContent.classList.add("message-content");
    indicatorContent.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;

    indicatorDiv.appendChild(indicatorContent);
    chatContainer.appendChild(indicatorDiv);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) {
      indicator.remove();
    }
  }

  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Add user message to chat
    addMessage(`<p>${escapeHtml(message)}</p>`, "human");
    userInput.value = "";

    // Adjust back to normal height
    userInput.style.height = "auto";

    showTypingIndicator();
    sendButton.style.display = "none";
    stopButton.style.display = "flex";

    // Create a new AbortController for this request
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    // Create a new bot message element
    removeTypingIndicator();
    const botMessageDiv = addMessage("", "bot");
    activeResponseId = botMessageDiv.id;

    let botResponse = "";

    // Make the fetch request with the AbortController signal
    fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: message }),
      signal: abortController.signal,
    })
      .then((response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        function processResult(result) {
          if (result.done) {
            // Finished receiving data
            stopButton.style.display = "none";
            sendButton.style.display = "flex";
            abortController = null;
            return;
          }

          const chunk = decoder.decode(result.value, { stream: true });
          const lines = chunk.split("\n\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));

                if (data.text) {
                  botResponse += data.text;

                  // Update the bot message
                  const currentBotMessage =
                    document.getElementById(activeResponseId);
                  if (currentBotMessage) {
                    const messageContent =
                      currentBotMessage.querySelector(".message-content");
                    messageContent.innerHTML = formatMarkdown(botResponse);
                  }
                }

                if (data.done || data.error) {
                  stopButton.style.display = "none";
                  sendButton.style.display = "flex";
                  abortController = null;

                  if (data.error) {
                    const currentBotMessage =
                      document.getElementById(activeResponseId);
                    if (currentBotMessage) {
                      const messageContent =
                        currentBotMessage.querySelector(".message-content");
                      messageContent.innerHTML = `<p>Error: ${data.error}</p>`;
                    }
                  }
                }
              } catch (e) {
                console.error("Error parsing JSON:", e);
              }
            }
          }

          // Continue reading
          return reader.read().then(processResult);
        }

        // Start reading
        return reader.read().then(processResult);
      })
      .catch((error) => {
        // Only show error if it's not an abort error
        if (error.name !== "AbortError") {
          const currentBotMessage = document.getElementById(activeResponseId);
          if (currentBotMessage) {
            const messageContent =
              currentBotMessage.querySelector(".message-content");
            messageContent.innerHTML = `<p>Error: Could not connect to the server. ${error.message}</p>`;
          }
        }

        stopButton.style.display = "none";
        sendButton.style.display = "flex";
        abortController = null;
      });
  }

  function stopGeneration() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    stopButton.style.display = "none";
    sendButton.style.display = "flex";
    removeTypingIndicator();
  }

  // Auto-resize the input field
  userInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  });

  // Event listeners
  sendButton.addEventListener("click", sendMessage);
  stopButton.addEventListener("click", stopGeneration);

  userInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Check status on load
  checkServiceStatus();

  // Periodically check status
  setInterval(checkServiceStatus, 30000);
});
