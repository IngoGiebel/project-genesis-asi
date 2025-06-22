/*************************************************************************
 *  AI-Consciousness Survey — client-side logic
 *  ----------------------------------------------------------------------
 *  ▸ Loads Choices.js dynamically
 *  ▸ Builds the Nationality, Education, and Profession select elements
 *  ▸ Handles form submission to Netlify function
 ************************************************************************/

import Choices from "https://cdn.jsdelivr.net/npm/choices.js@11/+esm"

import {keepHighlightVisible, selectInputValue} from "./choices-utils.js"
import {$, errMsgShort, msgFactory} from "./helpers.js"

/*───── Declare Choices.js instances type ──────────────────────────────*/

/** @typedef {import("choices.js").default} ChoicesJS */

/** @type {ChoicesJS} */ let choicesNationality
/** @type {ChoicesJS} */ let choicesEducation
/** @type {ChoicesJS} */ let choicesProfession

/*───── Constants ──────────────────────────────────────────────────────*/

const API = {
  COUNTRIES: "data/countries.min.json",
  EDUCATION: "data/education.min.json",
  PROFESSION: "data/profession.min.json",
  SUBMIT: ".netlify/functions/submit-survey",
}

const Q = {
  form: "#ai-consciousness-survey",
  messages: "#form-messages",
  nationality: "#nationality",
  education: "#education",
  profession: "#profession",
}

const fid = localStorage.aaFid ?? crypto.randomUUID()
localStorage.aaFid ??= fid

// `?tag=foo`  → "foo", otherwise empty string
const TAG = new URLSearchParams(location.search).get("tag") || ""

/*───── Helpers ────────────────────────────────────────────────────────*/

const msg = msgFactory(Q.messages)

async function fetchData(endpoint) {
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(), 8000)
  const r = await fetch(endpoint, {signal: ctrl.signal})
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}

/*───── Build Nationality select with Choices.js ───────────────────────*/

async function initNationality() {
  const select = $(Q.nationality)
  if (!select) return

  try {
    const list = await fetchData(API.COUNTRIES)

    // Native <option> — accessibility & fallback
    select.innerHTML = "<option value='' disabled selected>--Please choose an option--</option>" +
      list.map(([code, name]) => `<option value="${code}">${name}</option>`).join("")

    // Choices instance
    choicesNationality = new Choices(
      select,
      {
        searchEnabled: true,
        searchPlaceholderValue: "Search for a country…",
        itemSelectText: "",
        shouldSort: false,
      })
    keepHighlightVisible(choicesNationality)
    selectInputValue(choicesNationality)
  } catch (err) {
    console.error("[Countries] ", err)
    select.innerHTML = `<option>Error loading list: ${err.message}</option>`
    msg("Error loading country options. Please refresh.", true)
  }
}

/*───── Build Education select with Choices.js ─────────────────────────*/

async function initEducation() {
  const select = $(Q.education)
  if (!select) return

  try {
    const list = await fetchData(API.EDUCATION)

    // Native <option> — accessibility & fallback
    select.innerHTML = "<option value='' disabled selected>--Please choose an option--</option>" +
      list.map(([code, name]) => `<option value="${code}">${name}</option>`).join("")

    // Choices instance
    choicesEducation = new Choices(
      select,
      {
        searchEnabled: true,
        searchPlaceholderValue: "Search for education…",
        itemSelectText: "",
        shouldSort: false,
      })
    keepHighlightVisible(choicesEducation)
    selectInputValue(choicesEducation)
  } catch (err) {
    console.error("[Education] ", err)
    select.innerHTML = `<option>Error loading list: ${err.message}</option>`
    msg("Error loading education options. Please refresh.", true)
  }
}

/*───── Build Profession select with Choices.js ────────────────────────*/

async function initProfession() {
  const select = $(Q.profession)
  if (!select) return

  try {
    const list = await fetchData(API.PROFESSION)

    // Native <option> — accessibility & fallback
    select.innerHTML = "<option value='' disabled selected>--Please choose an option--</option>" +
      list.map(([code, name]) => `<option value="${code}">${name}</option>`).join("")

    // Choices instance
    choicesProfession = new Choices(
      select,
      {
        searchEnabled: true,
        searchPlaceholderValue: "Search for a field…",
        itemSelectText: "",
        shouldSort: false,
      })
    keepHighlightVisible(choicesProfession)
    selectInputValue(choicesProfession)
  } catch (err) {
    console.error("[Profession] ", err)
    select.innerHTML = `<option>Error loading list: ${err.message}</option>`
    msg("Error loading profession options. Please refresh.", true)
  }
}

/*───── Submit handler ─────────────────────────────────────────────────*/

async function handleSubmit(evt) {
  evt.preventDefault()
  msg("Submitting…")

  // Grab form fields (age → number)
  const fields = Object.fromEntries(
    [...new FormData(evt.target).entries()]
      .map(([k, v]) => k === "age" && v !== "" ? [k, Number(v)] : [k, v]),
  )

  // Assemble client metadata
  const client = {
    fid,
    locale: navigator.language || "",
    ...(TAG ? {tag: TAG} : {}),
  }

  // Final JSON payload
  /** @type {Record<string, any>} */
  const payload = {...fields, client}

  try {
    const r = await fetch(API.SUBMIT, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload),
    })

    if (!r.ok) {
      msg(await errMsgShort(r), true)
      return console.error("Server response →", r)
    }

    msg("Thank you! Your submission was successful.")

    // Reset the form
    evt.target.reset()
    // noinspection JSUnresolvedVariable
    choicesNationality?.setChoiceByValue("")
    // noinspection JSUnresolvedVariable
    choicesEducation?.setChoiceByValue("")
    // noinspection JSUnresolvedVariable
    choicesProfession?.setChoiceByValue("")
  } catch (err) {
    console.error("[Submit]", err)
    msg("Network error. Please try again.", true)
  }
}

/*───── Bootstrap when DOM ready ───────────────────────────────────────*/

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    try {
      // Initialize the three <select> widgets in parallel
      await Promise.all([
        initNationality(),
        initEducation(),
        initProfession(),
      ])
    } catch (err) {
      // If any of the three failed you still log, but the page keeps working
      console.error("[Select-init] ", err)
    }

    // Hook up the form after the selects are ready
    $(Q.form)?.addEventListener("submit", handleSubmit)
  })