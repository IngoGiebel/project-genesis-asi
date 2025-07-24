/*************************************************************************
 * Cookie-consent utils
 * Works with Quarto’s “express” banner: cookie name `cookie_consent_level`
 ************************************************************************/

export const CONSENT = {
  STRICTLY_NECESSARY: "strictly-necessary",
  FUNCTIONALITY: "functionality",
  TRACKING: "tracking",
  TARGETING: "targeting"
} as const

export type ConsentLevel = typeof CONSENT[keyof typeof CONSENT]

/**
 * Return true when the given consent level has been granted.
 */
export function hasCookieConsent(level: ConsentLevel = CONSENT.FUNCTIONALITY): boolean {
  const cookie = document.cookie
    .split("; ")
    .find(c => c.startsWith("cookie_consent_level="))

  if (!cookie) return false

  try {
    const prefs = JSON.parse(decodeURIComponent(cookie.split("=")[1])) as Record<string, unknown>
    return Boolean(prefs[level])
  } catch {
    // Malformed cookie → treat as no consent
    return false
  }
}
