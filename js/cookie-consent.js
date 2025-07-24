/*************************************************************************
 * Cookie-consent utils
 * ----------------------------------------------------------------------
 * ▸ Works with Quarto’s “express” banner (cookie name: `cookie_consent_level`).
 ************************************************************************/

/** Named levels exactly as Quarto stores them in the JSON payload */
export const CONSENT = {
  STRICTLY_NECESSARY: "strictly-necessary",
  FUNCTIONALITY: "functionality",
  TRACKING: "tracking",
  TARGETING: "targeting",
}

/**
 * Check whether the user has granted a particular consent level.
 *
 * @param {string} level One of the values in CONSENT
 * @returns {boolean}
 */
export function hasCookieConsent(level = CONSENT.FUNCTIONALITY) {
  // Find the cookie
  const cookie = document.cookie.split("; ").find(cookie => cookie.startsWith("cookie_consent_level="))

  if (!cookie) return false

  try {
    const prefs = JSON.parse(decodeURIComponent(c.split("=")[1]))
    return Boolean(prefs[level])
  } catch {
    // Malformed cookie → treat as no consent
    return false
  }
}
