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

    msg(r.ok
        ? "Thank you! Your submission was successful."
        : `Error ${r.status}: ${await r.text()}`);
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
