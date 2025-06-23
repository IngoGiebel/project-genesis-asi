/*************************************************************************
 * Build the client-metadata blob that every POST payload needs
 * ----------------------------------------------------------------------
 * • Generates (or re-uses) the visitor’s fingerprint-ID
 * • Adds navigator.language
 * • Adds ?tag=… when the URL (or Quarto variable) provides it
 ************************************************************************/

// keep one anonymous, stable ID per browser
const fid = localStorage.aaFid ?? crypto.randomUUID()
localStorage.aaFid ??= fid

/**
 * @returns {{fid:string, locale:string, tag?:string}}
 */
export function buildClientMeta() {
  // ?tag=foo  → "foo", otherwise ""
  const tag = new URLSearchParams(location.search).get("tag") ?? ""

  const meta = {
    fid,
    locale: navigator.language || "",
  }
  if (tag) meta.tag = tag
  return meta
}
