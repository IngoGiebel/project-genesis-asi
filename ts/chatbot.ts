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
} as const

const Q = {
  openBtn: "#open-chat-btn",
  closeBtn: "#close-chat-btn",
  chatWindow: "#chat-window",
  chatBody: "#chat-body",
  chatForm: "#chat-form",
  chatInput: "#chat-input",
} as const

const STORAGE_KEY = "aaChatHistory_v1"

let GREETING_TEXT = ""
let NO_RESPONSE_TEXT = ""

/*───── Types ──────────────────────────────────────────────────────────*/

export interface ChatTurn {
  role: "user" | "model"
  parts: [{ text: string }]
}

/*───── History load / save ────────────────────────────────────────────*/

let chatHistory: ChatTurn[] = loadHistory()

function loadHistory(): ChatTurn[] {
  if (!hasCookieConsent(CONSENT.FUNCTIONALITY)) return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch {
    return []
  }
}

function saveHistory(history: ChatTurn[]): void {
  if (!hasCookieConsent(CONSENT.FUNCTIONALITY)) return
  try {
    const trimmed = history.slice(-25)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Silent
  }
}

/*───── DOM Helpers ────────────────────────────────────────────────────*/

const $ = <T extends HTMLElement>(sel: string) =>
  document.querySelector<T>(sel)

/**
 * Render a message bubble.
 */
function addMessage(text: string, type: "user" | "ai" | "thinking"): void {
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
    body.innerHTML = DOMPurify.sanitize(marked.parse(text, {async: false}) as string)
  }

  wrap.append(body)
  chatBody.append(wrap)
  chatBody.scrollTop = chatBody.scrollHeight
}

/*───── Submit logic ─────────────────────────────────────────────────────*/

async function handleChatSubmit(evt: SubmitEvent) {
  evt.preventDefault()

  const input = $(Q.chatInput) as HTMLTextAreaElement | null
  if (!input) return

  const userMessage = input.value.trim()
  if (!userMessage) return

  // Add user message to UI and history
  addMessage(userMessage, "user")
  chatHistory.push({role: "user", parts: [{text: userMessage}]})
  saveHistory(chatHistory)

  // Clear input and show "thinking" indicator
  input.value = ""
  input.style.height = "auto"
  addMessage("…", "thinking")

  try {
    // Send the entire chat history to the Netlify function
    const res = await fetch(API.CHAT, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({history: chatHistory})
    })

    if (!res.ok) {
      const {error} = (await res.json()) as { error?: string }
      throw new Error(error ?? "Server responded with an error")
    }

    const {response: aiText = ""} = (await res.json()) as { response?: string }

    // Remove "thinking" indicator
    document.getElementById("thinking-indicator")?.remove()

    // Add AI response to UI and history
    if (aiText) {
      addMessage(aiText, "ai")
      chatHistory.push({role: "model", parts: [{text: aiText}]})
      saveHistory(chatHistory)
    } else addMessage(NO_RESPONSE_TEXT, "ai")
  } catch (err) {
    console.error("Chat error", err)
    document.getElementById("thinking-indicator")?.remove()
    addMessage(`Error: ${(err as Error).message}`, "ai")
  }
}

/*───── UI bootstrap ───────────────────────────────────────────────────*/

function renderInitialHistory() {
  if (!chatHistory.length) {
    // First visit – seed with greeting
    chatHistory = [{role: "model", parts: [{text: GREETING_TEXT}]}]
    saveHistory(chatHistory)
  }
  // Render previous turns
  chatHistory.forEach(t =>
    addMessage(t.parts[0].text, t.role === "user" ? "user" : "ai")
  )
}

async function setupChatUI() {
  // Load i18n first
  GREETING_TEXT = await t("chatbot.initialGreeting")
  NO_RESPONSE_TEXT = await t("chatbot.noResponse")

  const openBtn = $(Q.openBtn)
  const closeBtn = $(Q.closeBtn)
  const chatWindow = $(Q.chatWindow)
  const chatForm = $(Q.chatForm) as HTMLFormElement | null
  const chatInput = $(Q.chatInput) as HTMLTextAreaElement | null
  if (!openBtn || !closeBtn || !chatWindow || !chatForm || !chatInput) return

  openBtn.addEventListener("click", () => {
    chatWindow.classList.toggle("is-open")
    // If the window is now open, focus the input field
    if (chatWindow.classList.contains("is-open"))
      // Use a short timeout to ensure the element is focusable after the CSS transition
      setTimeout(() => chatInput.focus(), 100)
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
    chatInput.style.height = "auto"
    chatInput.style.height = `${chatInput.scrollHeight + 5}px`
  })

  // Restore previous conversation
  renderInitialHistory()
}

document.addEventListener("DOMContentLoaded", setupChatUI)
