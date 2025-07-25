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

import {buildClientMeta} from "./meta"
import {$, errMsgShort, msgFactory} from "./helpers"
import {t} from "./i18n"

/*───── Small helpers ──────────────────────────────────────────────────*/

const json = async <T>(u: string, o?: RequestInit): Promise<T> => {
  const r = await fetch(u, o)
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return await r.json() as T
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
} as const

/*───── State ──────────────────────────────────────────────────────────*/

let editor: EasyMDE

const msg = msgFactory(Q.msg)

// Pre-fetch localized UI strings once
const STR = {
  enterPost: await t("discussion.enter_post"),
  errorFetchingPosts: await t("discussion.error_fetching_posts"),
  noPosts: await t("discussion.no_posts"),
  placeholder: await t("discussion.placeholder"),
  submitting: await t("discussion.submitting"),
  thankYou: await t("discussion.thank_you"),
}

/* ── Types ────────────────────────────────────────────────────────────*/

interface Post {
  author?: string
  content?: string
  server?: { date?: string }
}

/*───── View helpers ───────────────────────────────────────────────────*/

const renderPost = ({author, content = "", server = {}}: Post): string => {
  const ts = server.date ? new Date(server.date).toLocaleString() : ""

  const rawHtml = marked.parse(content) as string
  const html = content.trim()
    ? DOMPurify.sanitize(rawHtml)
    : ""

  return `
    <article class="post-card">
      <header>${author || "Anonymous"}</header>
      <footer class="timestamp">${ts}</footer>
      <div class="body markdown-body">${html}</div>
    </article>`
}

/*───── Editor setup & validation ──────────────────────────────────────*/

const validateEditor = (): boolean => {
  const empty = !editor.value().trim()
  editor.codemirror.getInputField().setCustomValidity(empty ? STR.enterPost : "")
  return !empty
}

const initializeEditor = () => {
  editor = new EasyMDE({
    element: $(Q.text)!,
    spellChecker: false,
    sideBySideFullscreen: false,
    placeholder: STR.placeholder,
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
      "undo", "redo"
    ]
  })

  // Native validity shim
  const src = editor.codemirror.getInputField() as HTMLTextAreaElement & {
    setCustomValidity?: (msg: string) => void
    reportValidity?: () => boolean
  }
  src.setCustomValidity ??= () => {
  }
  src.reportValidity ??= () => true

  editor.codemirror.on("change", validateEditor)
  validateEditor()
}

/*───── Network handlers ───────────────────────────────────────────────*/

const handleSubmit = async (evt: SubmitEvent) => {
  evt.preventDefault()
  msg(STR.submitting)

  const author = ($(Q.who) as HTMLInputElement).value.trim()
  const content = editor.value().trim()

  if (!content) {
    msg(STR.enterPost, true)
    editor.codemirror.focus()
    return
  }

  const body = {
    author,
    content,
    client: buildClientMeta()
  }

  try {
    const r = await fetch(API.SUBMIT, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body)
    })

    if (!r.ok) throw new Error(await errMsgShort(r))
    msg(STR.thankYou)
    ;(evt.target as HTMLFormElement).reset()
    editor.value("")
    await fetchAndDisplayPosts()
  } catch (err) {
    msg(String(err), true)
    console.error(err)
  }
}

const fetchAndDisplayPosts = async () => {
  const container = $(Q.list)
  if (!container) return

  try {
    const posts = await json<Post[]>(API.LIST)
    container.innerHTML = posts.length
      ? posts.map(renderPost).join("")
      : `<p class="fst-italic">${STR.noPosts}</p>`
  } catch (err) {
    console.error("[Posts]", err)
    container.innerHTML =
      `<p class="text-warning">${STR.errorFetchingPosts}</p>`
  }
}

/*───── Bootstrap when DOM ready ───────────────────────────────────────*/

const bootstrap = async () => {
  initializeEditor()
  await fetchAndDisplayPosts().catch(() => {
  })
  document.querySelector<HTMLFormElement>(Q.form)?.addEventListener("submit", evt => {
    void handleSubmit(evt)
  })
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => void bootstrap())
else
  void bootstrap()
