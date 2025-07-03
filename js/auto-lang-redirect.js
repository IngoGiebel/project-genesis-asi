/*************************************************************************
 * Auto-language redirect
 * -----------------------------------------------------------------------
 *  ▸ On the very first visit (no aaLangPref yet) look at navigator.language
 *  ▸ Afterwards honour the stored aaLangPref set by language-switch.js
 *  ▸ Never redirect when we’re already on the right language
 ************************************************************************/

(() => {
  const barePath = () => location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/i, "") || "/"

  const goto = lang => {
    const target = lang === "en" ? barePath() : `/${lang}${barePath()}`
    if (target !== location.pathname) location.replace(target)
  }

  // Is there a stored preference from the language menu?
  const pref = localStorage.getItem("aaLangPref")
  if (pref) {
    const cur = (location.pathname.match(/^\/([a-z]{2})(?=\/|$)/i) || [])[1] || "en"
    if (pref !== cur) goto(pref)
    return
  }

  // First visit → fall back to browser language
  const navLang = (navigator.language || "").toLowerCase()
  if (navLang.startsWith("de")) {
    // Remember for next time
    localStorage.setItem("aaLangPref", "de")
    if (location.pathname === "/" || barePath() === "/") goto("de")
  } else {
    // Any non-German browser language defaults to English
    // No redirect needed – English lives at bare paths
    localStorage.setItem("aaLangPref", "en")
  }
})()
