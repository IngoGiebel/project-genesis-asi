/*************************************************************************
 * Lightweight i18n loader / cache  (TypeScript)
 * ----------------------------------------------------------------------
 * ▸ English strings live in /data/i18n.json
 * ▸ Other languages live in /data/i18n.<lang>.json
 * ▸ Detects language from URL (/de/… → "de"; default "en")
 * ▸ Caches each JSON file after first request
 * ▸ t("chatbot.noResponse") → Promise<string>
 ************************************************************************/

type Dict = Record<string, string>

// Which language are we on?
export const DETECTED_LANG: string = (() => {
  const m = location.pathname.match(/^\/([a-z]{2})(?:\/|$)/i)
  return m ? m[1] : "en"
})()

// In-memory cache
const CACHE = new Map<string, Dict>()

/**
 * Load (and memoise) the dictionary for one language. Falls back to English silently if the file is missing.
 */
async function loadDict(lang: string): Promise<Dict> {
  if (CACHE.has(lang)) return CACHE.get(lang)!

  // data/i18n.json    (English – canonical)
  // data/i18n.de.json (German)
  const url = lang === "en" ? "/data/i18n.json" : `/data/i18n.${lang}.json`

  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const dict: Dict = await resp.json()
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
 */
export async function t(key: string): Promise<string> {
  const dict = await loadDict(DETECTED_LANG)
  return dict[key] ?? (await loadDict("en"))[key] ?? key
}
