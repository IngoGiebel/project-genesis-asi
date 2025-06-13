/*************************************************************************
 *  AI-Consciousness Survey — client-side logic
 *  ----------------------------------------------------------------------
 *  ▸ Loads Choices.js dynamically
 *  ▸ Builds the Nationality, Education, and Profession select elements
 *  ▸ Handles form submission to Netlify function
 ************************************************************************/

import Choices from "https://cdn.jsdelivr.net/npm/choices.js@11.1.0/+esm"

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

const QS = {
  form: "#ai-consciousness-survey",
  messages: "#form-messages",
  nationality: "#nationality",
  education: "#education",
  profession: "#profession",
}

/*───── Helpers ────────────────────────────────────────────────────────*/

const msg = msgFactory(QS.messages)

async function fetchData(endpoint) {
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(), 8000)
  const r = await fetch(endpoint, {signal: ctrl.signal})
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}

/**
 * Keep the highlighted option in view while the user moves through the list
 * @param {ChoicesJS} choices   A Choices.js instance
 */
function keepHighlightVisible(choices) {
  // noinspection JSUnresolvedVariable
  choices.passedElement.element.addEventListener(
    "highlightChoice",
    e => {
      const el = e?.detail?.el
      if (!el) return
      // Jump instantly just enough to reveal the item
      el.scrollIntoView({block: "nearest"})
    },
  )
}

/**
 * Focus and select search input text
 * @param {ChoicesJS} choices   A Choices.js instance
 */
function selectInputValue(choices) {
  // noinspection JSUnresolvedVariable
  choices.passedElement.element.addEventListener(
    "showDropdown",
    () => {
      requestAnimationFrame(() => {
        const input = choices.input.element
        const choice = choices.getValue()

        if (choice.value) {
          input.value = choice.label
        }
        input.focus()
        input.select()

        // noinspection JSUnresolvedVariable
        const el = choices.choiceList.element.querySelector(`.choices__item[data-value="${choice.value}"]`)
        if (el) {
          el.scrollIntoView({block: "center"})
          // noinspection JSUnresolvedVariable
          choices.choiceList.element.querySelector(".is-highlighted")?.classList.remove("is-highlighted")
          el.classList.add("is-highlighted")
        }
      })
    },
  )
}

/*───── Build Nationality select with Choices.js ───────────────────────*/

async function initNationality() {
  const select = $(QS.nationality)
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
    msg("Error loading country options. Please refresh.")
  }
}

/*───── Build Education select with Choices.js ─────────────────────────*/

async function initEducation() {
  const select = $(QS.education)
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
    msg("Error loading education options. Please refresh.")
  }
}

/*───── Build Profession select with Choices.js ────────────────────────*/

async function initProfession() {
  const select = $(QS.profession)
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
    msg("Error loading profession options. Please refresh.")
  }
}

/*───── Submit handler ─────────────────────────────────────────────────*/

async function handleSubmit(evt) {
  evt.preventDefault()
  msg("Submitting…")

  const body = Object.fromEntries(new FormData(evt.target))

  try {
    const r = await fetch(
      API.SUBMIT,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
      })

    if (r.ok) {
      msg("Thank you! Your submission was successful.")
      // Reset the form
      evt.target.reset()
      // Reset Choices.js fields to their placeholder
      // noinspection JSUnresolvedVariable
      choicesNationality?.setChoiceByValue("")
      // noinspection JSUnresolvedVariable
      choicesEducation?.setChoiceByValue("")
      // noinspection JSUnresolvedVariable
      choicesProfession?.setChoiceByValue("")
    } else {
      msg(await errMsgShort(r))
      console.error("Server response →", r)
    }
  } catch (err) {
    console.error("[Submit] ", err)
    msg("Network error. Please try again.")
  }
}

/*───── Bootstrap when DOM ready ───────────────────────────────────────*/

document.addEventListener(
  "DOMContentLoaded",
  () => {
    initNationality()
    initEducation()
    initProfession()
    $(QS.form)?.addEventListener("submit", handleSubmit)
  })
