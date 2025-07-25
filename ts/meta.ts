/*************************************************************************
 * Build the client-metadata blob that every POST payload needs
 * -----------------------------------------------------------------------
 * ▸ Keeps one anonymous, stable fingerprint ID per browser
 * ▸ Adds navigator.language
 * ▸ Adds ?tag=… when present in the URL
 ************************************************************************/

export interface ClientMeta {
  fid: string
  locale: string
  tag?: string
}

// One stable ID per browser session
const fid =
  localStorage.getItem("aaFid") ??
  (() => {
    const new_fid = crypto.randomUUID()
    localStorage.setItem("aaFid", new_fid)
    return new_fid
  })()

/**
 * Assemble the metadata payload.
 */
export function buildClientMeta(): ClientMeta {
  const tag = new URLSearchParams(location.search).get("tag") ?? ""

  const meta: ClientMeta = {
    fid,
    locale: navigator.language || ""
  }
  if (tag) meta.tag = tag
  return meta
}
