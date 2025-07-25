/*************************************************************************
 *  AI-Consciousness Survey — client-side logic
 *  ----------------------------------------------------------------------
 *  ▸ Loads Choices.js from CDN
 *  ▸ Builds the Nationality, Education, and Profession <select>s
 *  ▸ Handles form submission to Netlify function
 ************************************************************************/

import Choices from "https://cdn.jsdelivr.net/npm/choices.js@11/+esm"

import {keepHighlightVisible, selectInputValue} from "./choices-utils"
import {$, errMsgShort, msgFactory} from "./helpers"
import {DETECTED_LANG, t} from "./i18n"
import {buildClientMeta} from "./meta"

type ChoicesJS = typeof Choices.prototype

/* ── Instances ────────────────────────────────────────────────────────*/

let choicesNationality: ChoicesJS | undefined
let choicesEducation: ChoicesJS | undefined
let choicesProfession: ChoicesJS | undefined

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

/*───── Status helper ──────────────────────────────────────────────────*/

const msg = msgFactory(Q.messages)

/* ── Localized strings (resolved once) ────────────────────────────────*/

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

/* ──  Fetch helper with timeout ───────────────────────────────────────*/

const fetchData = async <T>(url: string): Promise<T> => {
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(), 8_000)
  const r = await fetch(url, {signal: ctrl.signal})
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return await r.json() as T
}

/* ── Generic builder for each <select> ────────────────────────────────*/

type ListEntry = [string, string]

const buildSelect = async (
  endpoint: string,
  select: HTMLSelectElement,
  searchPlaceholder: string
): Promise<ChoicesJS> => {
  const list = await fetchData<ListEntry[]>(endpoint)

  /* native <option>s for accessibility */
  select.innerHTML =
    `<option value="" disabled selected>${STR.placeholder}</option>` +
    list.map(([val, label]) => `<option value="${val}">${label}</option>`).join("")

  const ch = new Choices(select, {
    searchEnabled: true,
    searchPlaceholderValue: searchPlaceholder,
    itemSelectText: "",
    shouldSort: false
  })

  keepHighlightVisible(ch)
  selectInputValue(ch)

  return ch
}

/* ── initialization ───────────────────────────────────────────────────*/

const initSelects = async () => {
  const natSel = $(Q.nationality) as HTMLSelectElement | null
  const eduSel = $(Q.education) as HTMLSelectElement | null
  const proSel = $(Q.profession) as HTMLSelectElement | null

  try {
    if (natSel) choicesNationality = await buildSelect(API.COUNTRIES, natSel, STR.searchCountry)
  } catch (err) {
    console.error("[Countries]", err)
    msg(STR.errorLoadCountry, true)
  }

  try {
    if (eduSel) choicesEducation = await buildSelect(API.EDUCATION, eduSel, STR.searchEducation)
  } catch (err) {
    console.error("[Education]", err)
    msg(STR.errorLoadEducation, true)
  }

  try {
    if (proSel) choicesProfession = await buildSelect(API.PROFESSION, proSel, STR.searchProfession)
  } catch (err) {
    console.error("[Profession]", err)
    msg(STR.errorLoadProfession, true)
  }
}

/*───── Submit handler ─────────────────────────────────────────────────*/

const handleSubmit = async (evt: SubmitEvent) => {
  evt.preventDefault()
  msg(STR.submitting)

  // Verify required selects
  const missing = [
    {el: $(Q.nationality) as HTMLSelectElement, label: "Nationality"},
    {el: $(Q.education) as HTMLSelectElement, label: "Education"},
    {el: $(Q.profession) as HTMLSelectElement, label: "Profession"}
  ].filter(({el}) => !el?.value)

  if (missing.length) {
    missing[0].el.closest(".choices")?.classList.add("is-open")
    missing[0].el.closest(".choices")?.querySelector("input")?.focus()

    const human = missing.map(m => m.label).join(", ").replace(/, ([^,]*)$/, " and $1")
    msg(`${STR.noOptionChosen}${human}.`, true)
    return
  }

  // Collect form data
  const fields = Object.fromEntries(
    [...new FormData(evt.target as HTMLFormElement).entries()]
      .map(([k, v]) => (k === "age" && v !== "" ? [k, Number(v)] : [k, v]))
  )

  const payload = {...fields, client: buildClientMeta()}

  try {
    const r = await fetch(API.SUBMIT, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    })

    if (!r.ok) {
      msg(await errMsgShort(r), true)
      console.error("Server response →", r)
      return
    }

    msg(STR.thankYou)

    /* reset form + Choices */
    ;(evt.target as HTMLFormElement).reset()
    choicesNationality?.setChoiceByValue("")
    choicesEducation?.setChoiceByValue("")
    choicesProfession?.setChoiceByValue("")
  } catch (e) {
    console.error("[Submit]", e)
    msg(STR.networkError, true)
  }
}

/*───── Bootstrap when DOM ready ───────────────────────────────────────*/

const bootstrap = async () => {
  await initSelects()
  const form = document.querySelector<HTMLFormElement>(Q.form)
  form?.addEventListener("submit", evt => void handleSubmit(evt))
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => void bootstrap())
else
  void bootstrap()
