/*************************************************************************
 * Language switcher — delegated click
 ************************************************************************/

import {DETECTED_LANG} from "./i18n.js"

// Helper: strip any leading /xx prefix
function barePath() {
  return location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/i, "") || "/"
}

/* Helper that joins “/de” + “/foo.html” safely */
function join(prefix, path) {
  // English:
  if (prefix === "") return path
  // home → "/de/"
  if (path === "/") return prefix + "/"
  // "/de/foo.html"
  return `${prefix}${path}`
}

function handleLangSel(anchor) {
  const raw = anchor.getAttribute("href")
  const path = new URL(raw, location.origin).pathname
  console.log("Path: ", path)
  // ["de","en"] etc.
  const segs = path.split("/").filter(Boolean)
  const lang = segs.length ? segs.at(-1) : "en"

  if (!lang || lang === DETECTED_LANG) return

  const prefix = lang === "en" ? "" : `/${lang}`
  location.href = join(prefix, barePath())
}

// Grab the globe-icon toggle (first link with data-bs-toggle=dropdown)
const langToggle = document.querySelector("[data-bs-toggle=\"dropdown\"]")

if (langToggle) {
  langToggle.addEventListener("show.bs.dropdown", () => {
      const menu = langToggle.parentElement?.querySelector("ul.dropdown-menu")
      if (!menu) return

      // One-shot handlers for each entry
      menu.querySelectorAll("a.dropdown-item").forEach(a => {
        a.addEventListener("click", evt => {
            evt.preventDefault()
            handleLangSel(a)
          },
          // New handler every time menu opens
          {once: true},
        )
      })
    },
  )
}
