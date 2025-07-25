/*************************************************************************
 * Language switcher — delegated click
 ************************************************************************/

import {DETECTED_LANG} from "./i18n"

/* ── Helpers ──────────────────────────────────────────────────────────*/

// Helper: strip any leading /xx prefix
const barePath = (): string =>
  location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/i, "") || "/"

// Helper: join “/de” + “/foo.html” safely
const join = (prefix: string, path: string): string =>
  prefix === "" ? path : path === "/" ? `${prefix}/` : `${prefix}${path}`

function handleLangSel(anchor: HTMLAnchorElement) {
  const raw = anchor.getAttribute("href")
  if (!raw) return

  const path = new URL(raw, location.origin).pathname
  const lang = path.split("/").filter(Boolean).at(-1) ?? "en"

  if (lang === DETECTED_LANG) return

  // Persist deliberate language choice
  localStorage.setItem("aaLangPref", lang)

  const prefix = lang === "en" ? "" : `/${lang}`
  location.href = join(prefix, barePath())
}

/* ── Bootstrap ────────────────────────────────────────────────────────*/

// Grab the globe-icon toggle (first link with data-bs-toggle=dropdown)
const langToggle = document.querySelector<HTMLElement>("[data-bs-toggle=\"dropdown\"]")

if (langToggle) {
  langToggle.addEventListener("show.bs.dropdown", () => {
    const menu = langToggle.parentElement?.querySelector<HTMLUListElement>("ul.dropdown-menu")
    if (!menu) return

    // One-shot handlers for each entry
    menu.querySelectorAll<HTMLAnchorElement>("a.dropdown-item").forEach(a => {
      a.addEventListener(
        "click",
        evt => {
          evt.preventDefault()
          handleLangSel(a)
        },
        {once: true}
      )
    })
  })
}
