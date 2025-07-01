/*************************************************************************
 * Discussion Page — client-side logic
 * -----------------------------------------------------------------------
 * ▸ Initializes EasyMDE markdown editor
 * ▸ Handles post submission to Netlify function
 * ▸ Fetches and displays existing posts
 ************************************************************************/

import DOMPurify from "https://cdn.jsdelivr.net/npm/dompurify@3/+esm"
import EasyMDE from "https://cdn.jsdelivr.net/npm/easymde@2/dist/easymde.min.js/+esm"
import {marked} from "https://cdn.jsdelivr.net/npm/marked@15/+esm"

import {buildClientMeta} from "./meta.js"
import {errMsgShort, msgFactory} from "./helpers.js"
import {rootPath, t} from "./i18n.js"

/*───── Tiny helpers ───────────────────────────────────────────────────*/

const $ = (s, r = document) => r.querySelector(s)

const json = async (u, o) => {
  const r = await fetch(u, o)
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}

/*───── Constants ──────────────────────────────────────────────────────*/

const API = {
  SUBMIT: "/.netlify/functions/submit_post",
  LIST: "/.netlify/functions/submit_post",
}

const Q = {
  form: "#discussion-post-form",
  msg: "#form-messages",
  who: "#post-author",
  text: "#post-content",
  list: "#posts-container",
}

/*───── State ──────────────────────────────────────────────────────────*/

let easyMDE

const msg = msgFactory(Q.msg)

// Localized UI strings (loaded once at module import)
const STR = {
  enterPost: await t("discussion.enter_post"),
  errorFetchingPosts: await t("discussion.error_fetching_posts"),
  noPosts: await t("discussion.no_posts"),
  placeholder: await t("discussion.placeholder"),
  submitting: await t("discussion.submitting"),
  thankYou: await t("discussion.thank_you"),
}

/*───── View helpers ───────────────────────────────────────────────────*/

function renderPost({author, content = "", server = {}}) {
  const ts = new Date(server.date).toLocaleString()
  const html = content.trim() ? DOMPurify.sanitize(marked.parse(content)) : ""
  return `
    <article class="post-card">
      <header>${author || "Anonymous"}</header>
      <footer class="timestamp">${ts}</footer>
      <div class="body markdown-body">${html}</div>
    </article>`
}

/*───── Editor ─────────────────────────────────────────────────────────*/

function validateEditor() {
  // noinspection JSUnresolvedReference
  const empty = !easyMDE.value().trim()
  // noinspection JSUnresolvedReference
  easyMDE.codemirror.getInputField().setCustomValidity(empty ? STR.enterPost : "")
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
    placeholder: STR.placeholder,
  })

  // noinspection JSUnresolvedReference
  const src = easyMDE.codemirror.getInputField()
  // Duck-type native validation API
  if (!src.setCustomValidity) src.setCustomValidity = () => {
  }
  if (!src.reportValidity) src.reportValidity = () => true

  // noinspection JSUnresolvedReference
  easyMDE.codemirror.on("change", validateEditor)
  validateEditor()
}

/*───── Network ────────────────────────────────────────────────────────*/

async function handleSubmit(evt) {
  evt.preventDefault()
  msg(STR.submitting)

  // Trim & validate
  const author = $(Q.who).value.trim()
  const content = easyMDE.value().trim()

  if (!content) {
    msg(STR.enterPost, true)
    // noinspection JSUnresolvedReference
    easyMDE.codemirror.focus()
    return
  }

  // noinspection JSUnresolvedReference
  const body = {
    author,
    content,
    client: buildClientMeta(),
  }

  try {
    const r = await fetch(
      rootPath(API.SUBMIT), {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
      })

    if (!r.ok) throw new Error(await errMsgShort(r))
    msg(STR.thankYou)

    evt.target.reset()
    // noinspection JSUnresolvedReference
    easyMDE.value("")
    // Refresh list after a successful submit
    await fetchAndDisplayPosts()
  } catch (err) {
    msg(String(err), true)
    console.error(err)
  }
}

async function fetchAndDisplayPosts() {
  const c = $(Q.list)
  if (!c) return
  try {
    const posts = (await json(rootPath(API.LIST))) ?? []
    console.log(await t("discussion.no_posts"))
    c.innerHTML = posts.length
      ? posts.map(renderPost).join("")
      : `<p class="fst-italic">${await t("discussion.no_posts")}</p>`
  } catch (err) {
    console.error("[Posts]", err)
    c.innerHTML = `<p class="text-warning">${await t("discussion.error_fetching_posts")}</p>`
  }
}

/*───── Bootstrap when DOM ready ───────────────────────────────────────*/

async function bootstrap() {
  initializeEditor()
  try {
    await fetchAndDisplayPosts()
  } catch {
    // Already handled
  }
  $(Q.form)?.addEventListener("submit", handleSubmit)
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap)
} else {
  bootstrap().catch(console.error)
}
