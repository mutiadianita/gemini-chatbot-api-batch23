// DOM Elements
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// Store conversation history for API
let conversationHistory = [];

// Inject CSS for loading animation and message formatting
const style = document.createElement('style');
style.textContent = `
  .message {
    word-wrap: break-word;
  }

  .message.bot h1, .message.bot h2, .message.bot h3, .message.bot h4, .message.bot h5, .message.bot h6 {
    margin: 12px 0 8px 0;
  }

  .message.bot strong {
    font-weight: bold;
  }

  .message.bot em {
    font-style: italic;
  }

  .message.bot code {
    background-color: #f1f1f1;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9em;
  }

  .message.bot pre {
    background-color: #f1f1f1;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
    font-family: monospace;
    font-size: 0.9em;
    margin: 8px 0;
  }

  .message.bot ul, .message.bot ol {
    margin: 8px 0 8px 20px;
  }

  .message.bot li {
    margin: 4px 0;
  }

  .message.bot hr {
    border: none;
    border-top: 1px solid #ccc;
    margin: 12px 0;
  }

  .message.bot a {
    color: #0066cc;
    text-decoration: none;
  }

  .message.bot a:hover {
    text-decoration: underline;
  }

  .loading {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .loading span {
    width: 8px;
    height: 8px;
    background-color: #333;
    border-radius: 50%;
    animation: bounce 1.4s infinite;
  }

  .loading span:nth-child(1) {
    animation-delay: 0s;
  }

  .loading span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .loading span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scaleY(0.5);
      opacity: 0.5;
    }
    40% {
      transform: scaleY(1);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// Handle form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // Add user message to UI
  appendMessage('user', userMessage);
  input.value = '';

  // Add user message to conversation history
  conversationHistory.push({
    role: 'user',
    text: userMessage
  });

  // Show loading animation
  const thinkingElement = appendMessage('bot', null, true);

  try {
    // Send request to backend
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation: conversationHistory
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Check if result exists
    if (!data.result) {
      throw new Error('No response received from server');
    }

    // Update conversation history with bot response
    conversationHistory.push({
      role: 'model',
      text: data.result
    });

    // Replace loading animation with actual response (parsed markdown)
    thinkingElement.innerHTML = markdownToHtml(data.result);
  } catch (error) {
    console.error('Error:', error);
    
    // Replace loading animation with error message
    thinkingElement.innerHTML = '<em>Sorry, failed to get response from server.</em>';
  }
});

/**
 * Append a message to the chat box
 * @param {string} sender - 'user' or 'bot'
 * @param {string} text - Message text (supports markdown for bot messages)
 * @param {boolean} isLoading - Show loading animation (default: false)
 * @returns {HTMLElement} - The created message element
 */
function appendMessage(sender, text, isLoading = false) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', sender);

  if (isLoading) {
    // Create loading animation
    messageDiv.innerHTML = '<div class="loading"><span></span><span></span><span></span></div>';
  } else if (sender === 'bot') {
    // Parse markdown to HTML for bot messages
    messageDiv.innerHTML = markdownToHtml(text);
  } else {
    // Plain text for user messages
    messageDiv.textContent = text;
  }

  chatBox.appendChild(messageDiv);
  
  // Auto-scroll to bottom
  chatBox.scrollTop = chatBox.scrollHeight;
  
  return messageDiv;
}

/**
 * Simple markdown parser to convert markdown to HTML
 * @param {string} text - Markdown text
 * @returns {string} - HTML string
 */
function markdownToHtml(text) {
  if (!text) return '';

  let html = text
    // Escape HTML special characters first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Horizontal rule: ---
    .replace(/\n---\n/g, '<hr>')
    // Headers: # H1, ## H2, ### H3, etc
    .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Code blocks: ```code```
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Inline code: `text`
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links: [text](url)
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
    // Unordered lists: - item
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Ordered lists: 1. item
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Convert line breaks to <br>
    .replace(/\n/g, '<br>');

  // Wrap consecutive list items in <ul> or <ol>
  html = html.replace(/(<li>.+<\/li>)/s, (match) => {
    return match.includes('<br>') ? '<ul>' + match.replace(/<br>/g, '') + '</ul>' : '<ul>' + match.replace(/<br>/g, '') + '</ul>';
  });

  // Unescape HTML in code blocks and pre tags
  html = html.replace(/<(code|pre)>(.*?)<\/(code|pre)>/gs, (match) => {
    return match
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  });

  return html;
}
