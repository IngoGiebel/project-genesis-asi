/*************************************************************************
 * Chatbot Widget — client-side logic
 * -----------------------------------------------------------------------
 * ▸ Dynamically loads internationalization strings
 * ▸ Handles chat window visibility and auto-growing textarea
 * ▸ Sends user messages to a Netlify function
 * ▸ Renders user and AI messages to the chat UI
 ************************************************************************/

import DOMPurify from "https://cdn.jsdelivr.net/npm/dompurify@3/+esm"
import {marked} from "https://cdn.jsdelivr.net/npm/marked@15/+esm"
import {CONSENT, hasCookieConsent} from "./cookie-consent.js"
import {t} from "./i18n.js"

/*───── Constants ──────────────────────────────────────────────────────*/

const API = {
  I18N: "/data/i18n.json",
  CHAT: "/.netlify/functions/chat",
}

const Q = {
  openBtn: "#open-chat-btn",
  closeBtn: "#close-chat-btn",
  chatWindow: "#chat-window",
  chatBody: "#chat-body",
  chatForm: "#chat-form",
  chatInput: "#chat-input",
}

const STORAGE_KEY = "aaChatHistory_v1"

let GREETING_TEXT = ""
let NO_RESPONSE_TEXT = ""

/*───── Types ──────────────────────────────────────────────────────────*/

/** @typedef {{role:"user"|"model", parts:[{text:string}]}} ChatTurn */

/*───── History load / save ────────────────────────────────────────────*/

let chatHistory = loadHistory()

function loadHistory() {
  if (!hasCookieConsent(CONSENT.FUNCTIONALITY)) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(history) {
  if (!hasCookieConsent(CONSENT.FUNCTIONALITY)) return
  try {
    // Crude size guard (~200 KB)
    const trimmed = history.length > 25 ? history.slice(-25) : history
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Silent
  }
}

/*───── DOM Helpers ─────────────────────────────────────────────────────*/

const $ = (sel) => document.querySelector(sel)

/**
 * Render a message bubble.
 * @param {string} text - The message text.
 * @param {("user"|"ai"|"thinking")} type - The type of message.
 */
function addMessage(text, type) {
  const chatBody = $(Q.chatBody)
  if (!chatBody) return

  const wrap = document.createElement("div")
  wrap.className = `chat-message ${type}-message`

  const body = document.createElement("div")
  body.className = "msg-inner"

  if (type === "thinking") {
    body.textContent = text
    wrap.id = "thinking-indicator"
  } else {
    // Parse → sanitize → render
    body.innerHTML = DOMPurify.sanitize(marked.parse(text))
  }

  wrap.appendChild(body)
  chatBody.appendChild(wrap)
  chatBody.scrollTop = chatBody.scrollHeight
}

/*───── Submit logic ─────────────────────────────────────────────────────*/

async function handleChatSubmit(evt) {
  evt.preventDefault()

  const input = $(Q.chatInput)
  const userMessage = input.value.trim()
  if (!userMessage) return

  // Add user message to UI and history
  addMessage(userMessage, "user")
  chatHistory.push({role: "user", parts: [{text: userMessage}]})
  saveHistory(chatHistory)

  // Clear input and show "thinking" indicator
  input.value = ""
  input.style.height = "auto"
  addMessage("...", "thinking")

  try {
    // Send the entire chat history to the Netlify function
    const r = await fetch(API.CHAT, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({history: chatHistory}),
    })

    if (!r.ok) {
      const err = await r.json()
      throw new Error(err.error || "The server responded with an error.")
    }

    const {response: aiText = ""} = await r.json()

    // Remove "thinking" indicator
    document.getElementById("thinking-indicator")?.remove()

    // Add AI response to UI and history
    if (aiText) {
      addMessage(aiText, "ai")
      chatHistory.push({role: "model", parts: [{text: aiText}]})
      saveHistory(chatHistory)
    } else {
      addMessage(NO_RESPONSE_TEXT, "ai")
    }
  } catch (err) {
    console.error("Chat Error:", err)
    document.getElementById("thinking-indicator")?.remove()
    addMessage(`Error: ${err.message}`, "ai")
  }
}

/*───── UI bootstrap ───────────────────────────────────────────────────*/

function renderInitialHistory() {
  if (!chatHistory.length) {
    // First visit – seed with greeting
    chatHistory = [
      {role: "model", parts: [{text: GREETING_TEXT}]},
    ]
    saveHistory(chatHistory)
  }
  // Render previous turns
  /** @type {ChatTurn[]} */ (chatHistory).forEach(t => {
    addMessage(t.parts[0].text, t.role === "user" ? "user" : "ai")
  })
}

async function setupChatUI() {
  // Load i18n first
  GREETING_TEXT = await t("chatbot.initialGreeting")
  NO_RESPONSE_TEXT = await t("chatbot.noResponse")

  const openBtn = $(Q.openBtn)
  const closeBtn = $(Q.closeBtn)
  const chatWindow = $(Q.chatWindow)
  const chatForm = $(Q.chatForm)
  const chatInput = $(Q.chatInput)

  if (!openBtn || !closeBtn || !chatWindow || !chatForm || !chatInput) return

  openBtn.addEventListener("click", () => {
    chatWindow.classList.toggle("is-open")
    // If the window is now open, focus the input field.
    if (chatWindow.classList.contains("is-open")) {
      // Use a short timeout to ensure the element is focusable after the CSS transition.
      // 100ms is usually enough time for the element to become visible.
      setTimeout(() => chatInput.focus(), 100)
    }
  })
  closeBtn.addEventListener("click", () => chatWindow.classList.remove("is-open"))
  chatForm.addEventListener("submit", handleChatSubmit)

  // Logic for auto-growing textarea and Enter/Shift+Enter key presses
  chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      chatForm.requestSubmit()
    }
  })
  chatInput.addEventListener("input", () => {
    // Auto-grow textarea based on content
    chatInput.style.height = "auto"
    chatInput.style.height = (chatInput.scrollHeight + 5) + "px"
  })

  // Restore previous conversation
  renderInitialHistory()
}

document.addEventListener("DOMContentLoaded", setupChatUI)
