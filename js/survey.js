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
import {DETECTED_LANG, t} from "./i18n.js"
import {buildClientMeta} from "./meta.js"

/*───── Declare Choices.js instances type ──────────────────────────────*/

/** @typedef {import("choices.js").default} ChoicesJS */

/** @type {ChoicesJS} */ let choicesNationality
/** @type {ChoicesJS} */ let choicesEducation
/** @type {ChoicesJS} */ let choicesProfession

/*───── Constants ──────────────────────────────────────────────────────*/

const API = {
  COUNTRIES: DETECTED_LANG === "de" ? "data/countries.de.json" : "data/countries.json",
  EDUCATION: DETECTED_LANG === "de" ? "data/education.de.json" : "data/education.json",
  PROFESSION: DETECTED_LANG === "de" ? "data/profession.de.json" : "data/profession.json",
  SUBMIT: "/.netlify/functions/submit_survey",
}

const Q = {
  form: "#ai-consciousness-survey",
  messages: "#form-messages",
  nationality: "#nationality",
  education: "#education",
  profession: "#profession",
}

/*───── State ──────────────────────────────────────────────────────────*/

const msg = msgFactory(Q.messages)

// Localized UI strings (loaded once at module import)
const STR = {
  errorLoadCountry: await t("survey.error_load_country"),
  errorLoadEducation: await t("survey.error_load_education"),
  errorLoadProfession: await t("survey.error_load_profession"),
  networkError: await t("survey.network_error"),
  noOptionChosen: await t("survey.no_option_chosen"),
  placeholder: await t("survey.placeholder"),
  searchCountry: await t("survey.search_country"),
  searchEducation: await t("survey.search_education"),
  searchProfession: await t("survey.search_profession"),
  submitting: await t("survey.submitting"),
  thankYou: await t("survey.thank_you"),
}

/*───── Helpers ────────────────────────────────────────────────────────*/

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
    select.innerHTML = `<option value='' disabled selected>${STR.placeholder}</option>` +
      list.map(([code, name]) => `<option value="${code}">${name}</option>`).join("")

    // Choices instance
    choicesNationality = new Choices(
      select,
      {
        searchEnabled: true,
        searchPlaceholderValue: STR.searchCountry,
        itemSelectText: "",
        shouldSort: false,
      })
    keepHighlightVisible(choicesNationality)
    selectInputValue(choicesNationality)
  } catch (err) {
    console.error("[Countries] ", err)
    select.innerHTML = `<option>Error loading list: ${err.message}</option>`
    msg(STR.errorLoadCountry, true)
  }
}

/*───── Build Education select with Choices.js ─────────────────────────*/

async function initEducation() {
  const select = $(Q.education)
  if (!select) return

  try {
    const list = await fetchData(API.EDUCATION)

    // Native <option> — accessibility & fallback
    select.innerHTML = `<option value='' disabled selected>${STR.placeholder}</option>` +
      list.map(([code, name]) => `<option value="${code}">${name}</option>`).join("")

    // Choices instance
    choicesEducation = new Choices(
      select,
      {
        searchEnabled: true,
        searchPlaceholderValue: STR.searchEducation,
        itemSelectText: "",
        shouldSort: false,
      })
    keepHighlightVisible(choicesEducation)
    selectInputValue(choicesEducation)
  } catch (err) {
    console.error("[Education] ", err)
    select.innerHTML = `<option>Error loading list: ${err.message}</option>`
    msg(STR.errorLoadEducation, true)
  }
}

/*───── Build Profession select with Choices.js ────────────────────────*/

async function initProfession() {
  const select = $(Q.profession)
  if (!select) return

  try {
    const list = await fetchData(API.PROFESSION)

    // Native <option> — accessibility & fallback
    select.innerHTML = `<option value='' disabled selected>${STR.placeholder}</option>` +
      list.map(([code, name]) => `<option value="${code}">${name}</option>`).join("")

    // Choices instance
    choicesProfession = new Choices(
      select,
      {
        searchEnabled: true,
        searchPlaceholderValue: STR.searchProfession,
        itemSelectText: "",
        shouldSort: false,
      })
    keepHighlightVisible(choicesProfession)
    selectInputValue(choicesProfession)
  } catch (err) {
    console.error("[Profession] ", err)
    select.innerHTML = `<option>Error loading list: ${err.message}</option>`
    msg(STR.errorLoadProfession, true)
  }
}

/*───── Submit handler ─────────────────────────────────────────────────*/

async function handleSubmit(evt) {
  evt.preventDefault()
  msg(STR.submitting)

  // Validate that the three Choice-selects are filled in
  const selects = [
    {el: $(Q.nationality), label: "Nationality"},
    {el: $(Q.education), label: "Education"},
    {el: $(Q.profession), label: "Profession"},
  ]

  const missing = selects.filter(({el}) => !el.value)
  if (missing.length) {
    // Open + focus the first empty Choices dropdown
    const wrapper = missing[0].el.closest(".choices")
    wrapper?.classList.add("is-open")
    wrapper?.querySelector("input")?.focus()
    // Build human-readable list: “A, B and C”
    const list = missing
      .map(m => m.label)
      .join(", ")
      .replace(/, ([^,]*)$/, " and $1")

    msg(`${STR.noOptionChosen}${list}.`, true)
    return
  }

  // Grab form fields (age → number)
  const fields = Object.fromEntries(
    [...new FormData(evt.target).entries()]
      .map(([k, v]) => k === "age" && v !== "" ? [k, Number(v)] : [k, v]),
  )

  // Final JSON payload
  const payload = {
    ...fields,
    client: buildClientMeta(),
  }

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

    msg(STR.thankYou)

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
    msg(STR.networkError, true)
  }
}

/*───── Bootstrap when DOM ready ───────────────────────────────────────*/

async function bootstrap() {
  try {
    await Promise.all([
      initNationality(),
      initEducation(),
      initProfession(),
    ])
  } catch (err) {
    console.error("[Select-init] ", err)
  }
  $(Q.form)?.addEventListener("submit", handleSubmit)
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap)
} else {
  bootstrap().catch(console.error)
}
