/*************************************************************************
 *  AI-Consciousness Survey — client-side logic
 *  ----------------------------------------------------------------------
 *  ▸ Loads Choices.js dynamically
 *  ▸ Builds the Nationality and Eduction select elements
 *  ▸ Handles form submission to Netlify Function
 ************************************************************************/

import Choices from "https://cdn.jsdelivr.net/npm/choices.js@11.1.0/+esm";

/*───── Constants ──────────────────────────────────────────────────────*/

const API = {
  COUNTRIES  : "data/countries.min.json",
  EDUCATION  : "data/education.min.json",
  SUBMIT     : ".netlify/functions/submit-survey"
};

const QS = {
  form       : "#ai-consciousness-survey",
  messages   : "#form-messages",
  nationality: "#nationality",
  education  : "#education"
};

// Declare choices instances in a higher scope to be accessible in handleSubmit
let choicesNationality;
let choicesEducation;

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

async function fetchData (endpoint) {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 8000);
  const r = await fetch(endpoint, {signal: ctrl.signal});
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

function keepHighlightVisible (choices) {
  choices.passedElement.element.addEventListener(
    "highlightChoice",
    e => e?.detail?.el?.scrollIntoView({block: "nearest", behavior: "smooth"})
  );
}

// Function to focus and select search input text
function selectInputValue (choices) {
  choices.passedElement.element.addEventListener(
    "showDropdown",
    () => {
      requestAnimationFrame(() => {
        const input  = choices.input.element;
        const choice = choices.getValue();

        if (choice.value) {
          input.value = choice.label;
        }
        input.focus();
        input.select();

        const el = choices.choiceList.element.querySelector(`.choices__item[data-value="${choice.value}"]`);
        if (el) {
          el.scrollIntoView({block: "nearest"});
          choices.choiceList.element.querySelector(".is-highlighted") ?.classList.remove("is-highlighted");
          el.classList.add("is-highlighted");
        }
      });
    }
  );
}

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

/*───── Build Nationality select with Choices.js ───────────────────────*/

async function initNationality () {
  const select = $(QS.nationality);
  if (!select) return;

  try {
    const list = await fetchData(API.COUNTRIES);

    // Native <option> — accessibility & fallback
    select.innerHTML = "<option value='' disabled selected>--Please choose an option--</option>" +
    list.map(([code, name]) => `<option value="${code}">${name}</option>`).join("");

    // Choices instance
    const choicesNationality = new Choices(
      select,
      {
        searchEnabled: true,
        searchPlaceholderValue: "Search for a country…",
        itemSelectText: "",
        shouldSort: false,
      });
    keepHighlightVisible(choicesNationality);
    selectInputValue(choicesNationality);
  }
  catch (err) {
    console.error("[Countries] ", err);
    select.innerHTML = `<option>Error loading list: ${err.message}</option>`;
    msg("Error loading country options. Please refresh.");
  }
}

/*───── Build Education select with Choices.js ─────────────────────────*/

async function initEducation () {
  const select = $(QS.education);
  if (!select) return;

  try {
    const list = await fetchData(API.EDUCATION);

    // Native <option> — accessibility & fallback
    select.innerHTML = "<option value='' disabled selected>--Please choose an option--</option>" +
    list.map(([code, name]) => `<option value="${code}">${name}</option>`).join("");

    // Choices instance
    const choicesEducation = new Choices(
      select,
      {
        searchEnabled: true,
        searchPlaceholderValue: "Search for education…",
        itemSelectText: "",
        shouldSort: false,
      });
    keepHighlightVisible(choicesEducation);
    selectInputValue(choicesEducation);
  }
  catch (err) {
    console.error("[Education] ", err);
    select.innerHTML = `<option>Error loading list: ${err.message}</option>`;
    msg("Error loading education options. Please refresh.");
  }
}

/*───── Submit handler ─────────────────────────────────────────────────*/

async function handleSubmit (evt) {
  evt.preventDefault();
  msg("Submitting…");

  const body = Object.fromEntries(new FormData(evt.target));

  try {
    const r = await fetch(API.SUBMIT, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body : JSON.stringify(body)
    });

    if (r.ok) {
      msg("Thank you! Your submission was successful.");
      // Reset the form
      evt.target.reset();
      // Reset Choices.js fields to their placeholder
      choicesNationality?.setChoiceByValue("");
      choicesEducation?.setChoiceByValue("");
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

/*───── Bootstrap when DOM ready ───────────────────────────────────────*/

document.addEventListener("DOMContentLoaded", () => {
  initNationality();
  initEducation();
  $(QS.form)?.addEventListener("submit", handleSubmit);
});
