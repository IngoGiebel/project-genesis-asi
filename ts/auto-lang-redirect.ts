/*************************************************************************
 * Auto-language redirect
 * -----------------------------------------------------------------------
 *  ▸ First visit → look at navigator.language
 *  ▸ After that → honor stored aaLangPref from language-switch.js
 *  ▸ Skip redirect when already on the correct language
 ************************************************************************/

type Lang = "en" | "de";

(() => {
  const barePath = (): string =>
    location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/i, "") || "/"

  const goto = (lang: Lang) => {
    const target = lang === "en" ? barePath() : `/${lang}${barePath()}`
    if (target !== location.pathname) location.replace(target)
  }

  /* ── Stored preference? ─────────────────────────────────────────────*/

  const pref = localStorage.getItem("aaLangPref") as Lang | null
  if (pref) {
    const cur =
      (location.pathname.match(/^\/([a-z]{2})(?=\/|$)/i) || [])[1] ?? "en"
    if (pref !== cur) goto(pref)
    return
  }

  /* ── First visit → browser language ─────────────────────────────────*/

  const navLang = (navigator.language ?? "").toLowerCase()
  if (navLang.startsWith("de")) {
    localStorage.setItem("aaLangPref", "de")
    if (location.pathname === "/" || barePath() === "/") goto("de")
  } else {
    // Any non-German browser language defaults to English
    localStorage.setItem("aaLangPref", "en")
  }
})()
