/*************************************************************************
 * Discussion Page — client-side logic
 * ----------------------------------------------------------------------
 * ▸ Initializes EasyMDE markdown editor
 * ▸ Handles post submission to Netlify function
 * ▸ Fetches and displays existing posts
 ************************************************************************/

import EasyMDE from "https://cdn.jsdelivr.net/npm/easymde@2/dist/easymde.min.js/+esm"
import {marked} from "https://cdn.jsdelivr.net/npm/marked@15/+esm"
import DOMPurify from "https://cdn.jsdelivr.net/npm/dompurify@3/+esm"

import {errMsgShort, msgFactory} from "./helpers.js"

/*───── Tiny helpers ───────────────────────────────────────────────────*/

const $ = (s, r = document) => r.querySelector(s)

const json = async (u, o) => {
  const r = await fetch(u, o)
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}

const fid = localStorage.aaFid ?? crypto.randomUUID()

localStorage.aaFid ??= fid;

/*───── Constants ──────────────────────────────────────────────────────*/

const API = {
  SUBMIT: ".netlify/functions/submit-post",
  LIST  : ".netlify/functions/submit-post",
}

const TAG = new URLSearchParams(location.search).get("tag") ?? window.DISCUSSION_TAG ?? ""

const Q = {
  form  : "#discussion-post-form",
  msg   : "#form-messages",
  who   : "#post-author",
  text  : "#post-content",
  list  : "#posts-container"
}

/*───── State ──────────────────────────────────────────────────────────*/

let easyMDE
const msg = msgFactory(Q.msg)

/*───── View helpers ───────────────────────────────────────────────────*/

function renderPost({author, content="", date}) {
  const html = content.trim() ? DOMPurify.sanitize(marked.parse(content)) : ""
  const ts = date ? new Date(date).toLocaleString() : ""
  return `
    <article class="mb-4 border rounded p-3 bg-body-secondary">
      <header class="mb-2 fw-bold">${author || "Anonymous"}</header>
      <div class="markdown-body">${html}</div>
      <footer class="mt-2 small text-secondary">${ts}</footer>
    </article>`;
}

/*───── Editor ─────────────────────────────────────────────────────────*/

function validateEditor() {
  // noinspection JSUnresolvedReference
  const empty = !easyMDE.value().trim();
  // noinspection JSUnresolvedReference
  easyMDE.codemirror.getInputField().setCustomValidity(empty ? "Please enter a post." : "")
  return !empty
}

function initializeEditor() {
  easyMDE = new EasyMDE({
    element: $(Q.text),
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
  // noinspection JSUnresolvedReference
  easyMDE.codemirror.on("change", validateEditor)
  validateEditor()
}

/*───── Network ────────────────────────────────────────────────────────*/

async function handleSubmit(e) {
  e.preventDefault()
  msg("Submitting…")

  // noinspection JSUnresolvedReference
  const body = {
    author: $(Q.who).value.trim(),
    content: easyMDE.value().trim(),
    client: {
      tag: TAG,
      fid,
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

    if (!r.ok) throw new Error(await errMsgShort(r))
    msg("Thank you! Your post has been submitted.")

    e.target.reset()
    // noinspection JSUnresolvedReference
    easyMDE.value("")
    // Refresh list after a successful submit
    await fetchAndDisplayPosts();
  } catch (err) {
    msg(String(err), true)
    console.error(err)
  }
}

async function fetchAndDisplayPosts() {
  const c = $(Q.list)
  if (!c) return
  try {
    const posts = await json(API.LIST)
    c.innerHTML = posts.length
      ? posts.map(renderPost).join("")
      : `<p class="fst-italic">No posts yet – be the first to contribute!</p>`
  } catch (err) {
    console.error("[Posts]", err);
    c.innerHTML = `<p class="text-warning">Error fetching posts. Please refresh.</p>`
  }
}

/*───── Bootstrap when DOM ready ───────────────────────────────────────*/

document.addEventListener("DOMContentLoaded", async () => {
  initializeEditor();
  try {
    await fetchAndDisplayPosts();
  } catch {
    // Already handled
  }
  $(Q.form).addEventListener("submit", handleSubmit);
})
