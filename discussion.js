/*************************************************************************
 * Discussion Page — client-side logic
 * ----------------------------------------------------------------------
 * ▸ Initializes EasyMDE markdown editor
 * ▸ Handles post submission to Netlify function
 * ▸ (Future) Fetches and displays existing posts
 ************************************************************************/

import EasyMDE from "https://cdn.jsdelivr.net/npm/easymde@2/dist/easymde.min.js/+esm"
import {marked} from "https://cdn.jsdelivr.net/npm/marked@15/+esm"
import DOMPurify from "https://cdn.jsdelivr.net/npm/dompurify@3/+esm"

import {$, errMsgShort, msgFactory} from "./helpers.js"

/*───── Constants ──────────────────────────────────────────────────────*/

const API = {
  SUBMIT: ".netlify/functions/submit-post",
  LIST: ".netlify/functions/submit-post",
}

const TAG =
  new URLSearchParams(location.search).get("tag")
  || window.DISCUSSION_TAG
  || ""

const FINGERID = (() => {
  const k = "aa-fid"
  let v = localStorage.getItem(k)
  if (!v) {
    v = crypto.randomUUID()
    localStorage.setItem(k, v)
  }
  return v
})()

const QS = {
  form: "#discussion-post-form",
  messages: "#form-messages",
  authorInput: "#post-author",
  editorTextarea: "#post-content",
  postsContainer: "#posts-container",
}

/**
 * To hold the editor instance.
 * @type {EasyMDE}
 */
let easyMDE

/*───── Helpers ────────────────────────────────────────────────────────*/

const msg = msgFactory(QS.messages)

function renderPost({author, content, date}) {
  const html = DOMPurify.sanitize(marked.parse(content))
  const ts = date ? new Date(date).toLocaleString() : ""
  return `
    <article class="mb-4 border rounded p-3 bg-body-secondary">
      <header class="mb-2 fw-bold">${author || "Anonymous"}</header>
      <div class="markdown-body">${html}</div>
      <footer class="mt-2 small text-secondary">${ts}</footer>
    </article>`
}

/*───── Custom easyMDE validator ───────────────────────────────────────*/

function validateEditor() {
  // noinspection JSUnresolvedReference
  const inputField = easyMDE.codemirror.getInputField()
  // noinspection JSUnresolvedReference
  const empty = !easyMDE.value().trim()
  inputField.setCustomValidity(empty ? "Please enter a post." : "")
  return !empty
}

function wireValidation() {
  // noinspection JSUnresolvedReference
  easyMDE.codemirror.on(
    "change",
    () => {
      validateEditor()
    })
}

/*───── Initialize easyMDE ─────────────────────────────────────────────*/

function initializeEditor() {
  easyMDE = new EasyMDE({
    element: $(QS.editorTextarea),
    spellChecker: false,
    sideBySideFullscreen: false,
    toolbar: [
      "bold", "italic", "strikethrough",
      "|",
      "heading-1", "heading-2", "heading-3",
      "|",
      "code", "quote", "link",
      "|",
      "unordered-list", "ordered-list",
      "|",
      "side-by-side", "guide",
      "|",
      "undo", "redo",
    ],
    placeholder: "Enter your thoughts here... You can use Markdown for formatting.",
  })
  validateEditor()
}

/*───── Submit handler ─────────────────────────────────────────────────*/

async function handleSubmit(evt) {
  evt.preventDefault()
  msg("Submitting…")

  const author = $(QS.authorInput).value.trim()
  // noinspection JSUnresolvedReference
  const content = easyMDE.value().trim()
  const body = {
    author,
    content,
    client: {
      tag: TAG,
      fid: FINGERID,
      locale: navigator.language || "",
    },
  }

  try {
    const r = await fetch(
      API.SUBMIT,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
      })

    if (r.ok) {
      msg("Thank you! Your post has been submitted.")
      // Reset the form
      evt.target.reset()
      // Clear the editor
      // noinspection JSUnresolvedReference
      easyMDE.value("")
      // Refresh list after a successful submit
      await fetchAndDisplayPosts()
    } else {
      msg(await errMsgShort(r))
      console.error("Server response →", r)
    }
  } catch (err) {
    console.error("[Submit] ", err)
    msg("Network error. Please try again.")
  }
}

/*───── Fetch and display posts ────────────────────────────────────────*/

async function fetchAndDisplayPosts() {
  const container = $(QS.postsContainer)
  if (!container) return

  try {
    const r = await fetch(API.LIST)
    if (!r.ok) {
      container.innerHTML =
        `<p class="text-warning">Could not load posts (${r.status}).</p>`
      return
    }

    // Get array of postDoc from Go
    const posts = await r.json()
    if (!posts.length) {
      container.innerHTML =
        `<p class="fst-italic">No posts yet – be the first to contribute!</p>`
      return
    }

    container.innerHTML = posts.map(renderPost).join("")
  } catch (err) {
    console.error("[Posts] ", err)
    container.innerHTML =
      `<p class="text-danger">Error fetching posts. Please refresh.</p>`
  }
}

/*───── Bootstrap when DOM ready ───────────────────────────────────────*/

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    initializeEditor()
    wireValidation()
    try {
      await fetchAndDisplayPosts()
    } catch (err) {
      // Already handled
    }
    $(QS.form)?.addEventListener("submit", handleSubmit)
  })
