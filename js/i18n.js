/*************************************************************************
 * Lightweight i18n loader / cache
 * ----------------------------------------------------------------------
 * ▸ English strings live in /data/i18n.json
 * ▸ Other languages live in /data/i18n.<lang>.json   (e.g. i18n.de.json)
 * ▸ Detects language from the URL (/de/... → "de"; default "en")
 * ▸ Caches every JSON file the first time it is requested
 * ▸ t("chatbot.noResponse") → Promise<string>
 *************************************************************************/

// Which language are we on?
export const DETECTED_LANG = (() => {
  const m = location.pathname.match(/^\/([a-z]{2})(?:\/|$)/i)
  return m ? m[1] : "en"
})()

// In-memory cache
const CACHE = new Map()

/**
 * Load (and memoise) the dictionary for one language.
 * Falls back to English silently if the file is missing.
 * @param   {string} lang  "en", "de", …
 * @returns {Promise<Object<string,string>>}
 */
async function loadDict(lang) {
  if (CACHE.has(lang)) return CACHE.get(lang);

  // data/i18n.json    (English – canonical)
  // data/i18n.de.json (German)
  const url = lang === "en" ? "/data/i18n.json" : `data/i18n.${lang}.json`

  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const dict = await resp.json()
    CACHE.set(lang, dict)
    return dict
  } catch {
    // Fallback → English file is guaranteed to exist
    if (lang !== "en") return loadDict("en")
    // Empty placeholder to avoid loops
    CACHE.set("en", {})
    return {}
  }
}

/**
 * Translate a dotted key (e.g. "chatbot.noResponse").
 * If the key is missing in the current language, fall back to English, then finally return the key itself.
 * @param {string} key  e.g. "chatbot.noResponse"
 * @returns {Promise<string>}
 */
export async function t(key) {
  const dict = await loadDict(DETECTED_LANG)
  return dict[key] ?? (await loadDict("en"))[key] ?? key
}
