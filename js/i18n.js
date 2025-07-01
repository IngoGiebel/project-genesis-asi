/*************************************************************************
 * Simple i18n loader / cache
 * -----------------------------------------------------------------------
 * ▸ Detects lang from URL (/de/ → "de"; fallback "en")
 * ▸ Fetches /data/i18n.json once, caches per language
 * ▸ t(key) returns string or key itself if missing
 * ▸ rootPath(url) strips "/de" (or other langs) so you can call backend
 ************************************************************************/

export const DETECTED_LANG = (() => {
  const m = location.pathname.match(/^\/([a-z]{2})(?:\/|$)/i)
  return m ? m[1] : "en"
})()

const DICT_CACHE = new Map()

async function loadDict(lang) {
  if (DICT_CACHE.has(lang)) return DICT_CACHE.get(lang)

  const resp = await fetch("/data/i18n.json")
  const all = await resp.json()
  DICT_CACHE.set(lang, all[lang] || all.en || {})
  return DICT_CACHE.get(lang)
}

/**
 * Translate a dotted key.
 * @param {string} key  e.g. "chatbot.noResponse"
 * @returns {Promise<string>}
 */
export async function t(key) {
  const dict = await loadDict(DETECTED_LANG)
  return dict[key] ?? (await loadDict("en"))[key] ?? key
}
