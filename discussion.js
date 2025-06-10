/*************************************************************************
 * Discussion Page — client-side logic
 * ----------------------------------------------------------------------
 * ▸ Initializes EasyMDE markdown editor
 * ▸ Handles post submission to Netlify function
 * ▸ (Future) Fetches and displays existing posts
 ************************************************************************/

// Note: EasyMDE is loaded globally via the <script> tag in the QMD header,
// so we can access it directly via the `EasyMDE` variable without an import.

/*───── Constants ──────────────────────────────────────────────────────*/

const API = {
  SUBMIT         : ".netlify/functions/submit-post"
  // TODO:
  // In the future, an endpoint to get posts will be added, e.g.:
  // GET_POSTS   : ".netlify/functions/get-posts"
};

const QS = {
  form           : "#discussion-post-form",
  messages       : "#form-messages",
  authorInput    : "#post-author",
  editorTextarea : "#post-content",
  postsContainer : "#posts-container"
};

// To hold the editor instance
let easyMDE;

/*───── Helpers ────────────────────────────────────────────────────────*/

const STATUS_TEXT = {
  400: "Bad request – the data we sent was malformed.",
  401: "Unauthorised – please log in first.",
  403: "Forbidden – you don’t have permission.",
  404: "Endpoint not found on the server.",
  500: "Server error – please try again later."
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);

const msg = (txt) => {$(QS.messages).textContent = txt;};

// Get a brief error message
const err_msg_short = async (resp) => {
  const niceText = STATUS_TEXT[resp.status] ?? resp.statusText;
  const ct = resp.headers.get("content-type") ?? "";

  // If the server sent structured JSON, prefer its .error message
  if (ct.includes("application/json")) {
    try {
      const {error} = await resp.json();
      return error ? `${niceText} (${error})` : niceText;
    }
    catch {
      // Ignore JSON parse errors
    }
  }

  // Add the failing path for context
  const urlPath = new URL(resp.url).pathname;
  return `${niceText} — ${urlPath}`;
};

/*───── Custom easyMDE validator ───────────────────────────────────────*/

function validateEditor () {
  const inputField = easyMDE.codemirror.getInputField();
  const empty = !easyMDE.value().trim();
  inputField.setCustomValidity(empty ? "Please enter a post." : "");
  return !empty;
}

function wireValidation () {
  easyMDE.codemirror.on(
    "change",
    () => {
      validateEditor();
    });
}

/*───── Initialize easyMDE ─────────────────────────────────────────────*/

function initializeEditor() {
  easyMDE = new EasyMDE({
    element: $(QS.editorTextarea),
    spellChecker: false,
    sideBySideFullscreen: false,
    toolbar: [
        "bold", "italic", "strikethrough", "heading-1", "heading-2", "heading-3",
        "|",
        "code", "quote", "unordered-list", "ordered-list", "clean-block",
        "|",
        "link", "table",
        "|",
        "preview", "side-by-side",
        "|",
        "guide",
        "|",
        "undo", "redo"
      ],
    placeholder: "Enter your thoughts here... You can use Markdown for formatting."
    });
  validateEditor();
}

/*───── Submit handler ─────────────────────────────────────────────────*/

async function handleSubmit(evt) {
  evt.preventDefault();
  msg("Submitting…");

  const author = $(QS.authorInput).value.trim();
  const content = easyMDE.value().trim();
  const body = {author, content};

  try {
    const r = await fetch(
      API.SUBMIT,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body : JSON.stringify(body)
      });

    if (r.ok) {
      msg("Thank you! Your post has been submitted.");
      // Reset the form
      evt.target.reset();
      // Clear the editor
      easyMDE.value("");
    }
    else {
      msg(await err_msg_short(r));
      console.error("Server response →", r);
    }
  }
  catch (err) {
    console.error("[Submit] ", err);
    msg("Network error. Please try again.");
  }
}

/*───── Fetch and display posts ────────────────────────────────────────*/

async function fetchAndDisplayPosts() {
  const container = $(QS.postsContainer);

  // TODO:
  // This is a placeholder for now: Fetch from the get-posts function here.
  // The placeholder text is now set directly in the HTML of discussion.qmd
  // In the future, this comment will be replaced with a fetch call.
}

/*───── Bootstrap when DOM ready ───────────────────────────────────────*/

document.addEventListener(
  "DOMContentLoaded",
  () => {
    initializeEditor();
    wireValidation();
    fetchAndDisplayPosts();
    $(QS.form)?.addEventListener("submit", handleSubmit);
  });
