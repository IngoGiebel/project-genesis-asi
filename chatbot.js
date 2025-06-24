/*************************************************************************
 * Chatbot Widget — client-side logic
 * ----------------------------------------------------------------------
 * ▸ Handles chat window visibility
 * ▸ Sends user messages to a Netlify function
 * ▸ Renders user and AI messages to the chat UI
 ************************************************************************/

/*───── Constants ──────────────────────────────────────────────────────*/

const API = {
  CHAT: "/.netlify/functions/chat"
};

const Q = {
  openBtn   : "#open-chat-btn",
  closeBtn  : "#close-chat-btn",
  chatWindow: "#chat-window",
  chatBody  : "#chat-body",
  chatForm  : "#chat-form",
  chatInput : "#chat-input"
};

/*───── State Management ───────────────────────────────────────────────*/

// Simple history of the conversation to send to the Gemini API for context.
// The AI message is the initial greeting.
let chatHistory = [
  {
    role: "model",
    parts: [{ text: "Hello! I am the Alpha Auriga project assistant, powered by Gemini. Ask me about AI, consciousness, or the project's timeline." }]
  }
];

/*───── DOM Helpers ─────────────────────────────────────────────────────*/

const $ = (sel) => document.querySelector(sel);

/**
 * Add a message to the chat body.
 * @param {string} text - The message text.
 * @param {('user'|'ai'|'thinking')} type - The type of message.
 */
function addMessage(text, type) {
  const chatBody = $(Q.chatBody);
  if (!chatBody) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${type}-message`;

  // Create a <p> tag for the text content to ensure proper styling
  const p = document.createElement('p');
  p.textContent = text;
  messageDiv.appendChild(p);

  // If this is a "thinking" message, give it an ID so we can remove it later
  if (type === 'thinking') {
    messageDiv.id = 'thinking-indicator';
  }

  chatBody.appendChild(messageDiv);
  // Scroll to the bottom of the chat body to show the new message
  chatBody.scrollTop = chatBody.scrollHeight;
}

/*───── Main logic ─────────────────────────────────────────────────────*/

async function handleChatSubmit(event) {
  event.preventDefault();
  const input = $(Q.chatInput);
  const userMessage = input.value.trim();

  if (!userMessage) return;

  // Add user message to UI and history
  addMessage(userMessage, 'user');
  chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });

  // Clear input and show "thinking" indicator
  input.value = '';
  addMessage('...', 'thinking');

  try {
    // Send the entire chat history to the Netlify function
    const response = await fetch(API.CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: chatHistory })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'The server responded with an error.');
    }

    const data = await response.json();
    const aiResponse = data.response;

    // Remove "thinking" indicator
    const thinkingIndicator = document.getElementById('thinking-indicator');
    if (thinkingIndicator) {
      thinkingIndicator.remove();
    }

    // Add AI response to UI and history
    if (aiResponse) {
      addMessage(aiResponse, 'ai');
      chatHistory.push({ role: 'model', parts: [{ text: aiResponse }] });
    } else {
      addMessage("I'm sorry, I couldn't generate a response. Please try again.", 'ai');
    }

  } catch (error) {
    console.error("Chat Error:", error);
    const thinkingIndicator = document.getElementById('thinking-indicator');
    if (thinkingIndicator) {
      thinkingIndicator.remove();
    }
    addMessage(`Error: ${error.message}`, 'ai');
  }
}

function setupChatUI() {
  const openBtn = $(Q.openBtn);
  const closeBtn = $(Q.closeBtn);
  const chatWindow = $(Q.chatWindow);
  const chatForm = $(Q.chatForm);

  if (openBtn && closeBtn && chatWindow && chatForm) {
    openBtn.addEventListener('click', () => chatWindow.classList.add('is-open'));
    closeBtn.addEventListener('click', () => chatWindow.classList.remove('is-open'));
    chatForm.addEventListener('submit', handleChatSubmit);
  }
}

/*───── Bootstrap when DOM ready ───────────────────────────────────────*/
document.addEventListener("DOMContentLoaded", setupChatUI);
