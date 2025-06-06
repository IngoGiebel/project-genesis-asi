/*****************************************************************
 *  AI-Consciousness Survey — client-side logic
 *  --------------------------------------------------------------
 *  ▸ Loads Choices.js dynamically
 *  ▸ Builds the Nationality select
 *  ▸ Handles form submission to Netlify Function
 *****************************************************************/

import Choices from "https://cdn.jsdelivr.net/npm/choices.js@11.1.0/+esm";

/*───── constants ───────────────────────────────────────────────*/

const API = {
  COUNTRIES  : "data/countries.min.json",
  SUBMIT     : ".netlify/functions/submit-survey"
};

const QS = {
  form       : "#ai-consciousness-survey",
  messages   : "#form-messages",
  nationality: "#nationality"
};

/*───── helpers ─────────────────────────────────────────────────*/

const STATUS_TEXT = {
  400: "Bad request – the data we sent was malformed.",
  401: "Unauthorised – please log in first.",
  403: "Forbidden – you don’t have permission.",
  404: "Endpoint not found on the server.",
  500: "Server error – please try again later."
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);

const msg = (txt) => {$(QS.messages).textContent = txt;};

async function fetchCountries () {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 8000);
  const r = await fetch(API.COUNTRIES, {signal: ctrl.signal});
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

function keepHighlightVisible (choices) {
  choices.passedElement.element.addEventListener(
    "highlightChoice",
    e => e?.detail?.el?.scrollIntoView({block: "nearest", behavior: "smooth"})
  );
}

/* Get a brief error message */
const err_msg_short = async (resp) => {
  const niceText = STATUS_TEXT[resp.status] ?? resp.statusText;
  const ct = resp.headers.get("content-type") ?? "";

  /* If the server sent structured JSON, prefer its .error message */
  if (ct.includes("application/json")) {
    try {
      const {error} = await resp.json();
      return error ? `${niceText} (${error})` : niceText;
    }
    catch {
      /* Ignore JSON parse errors */
    }
  }

  /* Add the failing path for context */
  const urlPath = new URL(resp.url).pathname;
  return `${niceText} — ${urlPath}`;
};

/*───── build Nationality select with Choices.js ────────────────*/

async function initNationality () {
  const select = $(QS.nationality);
  if (!select) return;

  try {
    const list = await fetchCountries();

    // native <option> — accessibility & fallback
    select.innerHTML = "<option value='' disabled selected>--Please choose an option--</option>" +
    list.map(([code, name]) => `<option value="${code}">${name}</option>`).join("");

    // Choices instance
    const choices = new Choices(select, {
      searchEnabled: true,
      searchPlaceholderValue: "Search for a country…",
      itemSelectText: "",
      allowHTML: false,
      shouldSort: true,
      position: "auto"
    });

    keepHighlightVisible(choices);
  }
  catch (err) {
    console.error("[Countries] ", err);
    select.innerHTML = `<option>Error loading list: ${err.message}</option>`;
    msg("Error loading country list. Please refresh.");
  }
}

/*───── submit handler ──────────────────────────────────────────*/

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
      form.reset();
      choicesNationality?.clearStore();
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

/*───── bootstrap when DOM ready ────────────────────────────────*/

document.addEventListener("DOMContentLoaded", () => {
  initNationality();
  $(QS.form)?.addEventListener("submit", handleSubmit);
});
