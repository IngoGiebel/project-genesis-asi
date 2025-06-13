/*************************************************************************
 * Discussion Page — client-side logic
 * ----------------------------------------------------------------------
 * ▸ Initializes EasyMDE markdown editor
 * ▸ Handles post submission to Netlify function
 * ▸ (Future) Fetches and displays existing posts
 ************************************************************************/

import EasyMDE from "https://cdn.jsdelivr.net/npm/easymde@2/dist/easymde.min.js/+esm";

import {$, msgFactory, errMsgShort} from "./helpers.js";

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

/**
 * To hold the editor instance.
 * @type {EasyMDE}
 */
let easyMDE;

/*───── Helpers ────────────────────────────────────────────────────────*/

const msg = msgFactory(QS.messages);

/*───── Custom easyMDE validator ───────────────────────────────────────*/

function validateEditor () {
  // noinspection JSUnresolvedReference
  const inputField = easyMDE.codemirror.getInputField();
  // noinspection JSUnresolvedReference
  const empty = !easyMDE.value().trim();
  inputField.setCustomValidity(empty ? "Please enter a post." : "");
  return !empty;
}

function wireValidation () {
  // noinspection JSUnresolvedReference
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
  // noinspection JSUnresolvedReference
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
      // noinspection JSUnresolvedReference
      easyMDE.value("");
    }
    else {
      msg(await errMsgShort(r));
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
  // TODO:
  // This is a placeholder for now: Fetch from the get-posts function here.
  // The placeholder text is now set directly in the HTML of discussion.qmd
  // In the future, this comment will be replaced with a fetch call.

  // const container = $(QS.postsContainer);
}

/*───── Bootstrap when DOM ready ───────────────────────────────────────*/

// ─── run once the DOM is fully parsed ────────────────────────────────
document.addEventListener(
  "DOMContentLoaded",
  async () => {
    initializeEditor();
    wireValidation();
    // wait for community posts to load, but don’t let a failure break the page
    try {
      await fetchAndDisplayPosts();
    } catch (err) {
      console.error("[Posts] ", err);
    }
    // hook up the form after everything else is ready
    $(QS.form)?.addEventListener("submit", handleSubmit);
  });
