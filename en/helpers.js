/*************************************************************************
 * Small utilities shared by survey.js, discussion.js, etc.
 ************************************************************************/

export const STATUS_TEXT = {
  400: "Bad request – the data we sent was malformed.",
  401: "Unauthorised – please log in first.",
  403: "Forbidden – you don’t have permission.",
  404: "Endpoint not found on the server.",
  500: "Server error – please try again later.",
}

export const $ = (sel, ctx = document) => ctx.querySelector(sel)

/**
 * Returns a tiny helper that writes STATUS messages into one DOM element.
 *
 * @param {string} selector – the element where messages should appear
 * @returns {(txt:string, warn?:boolean)=>void}
 *          txt  – message to display
 *          warn – if truthy, add Bootstrap’s “text-warning” class
 */
export const msgFactory = (selector) => {
  const el = document.querySelector(selector)

  return (txt, warn = false) => {
    if (!el) return
    el.textContent = txt
    el.classList.toggle("text-warning", Boolean(warn))
  }
}

// Short-form error message from a fetch Response
export async function errMsgShort(resp) {
  const niceText = STATUS_TEXT[resp.status] ?? resp.statusText
  const ct = resp.headers.get("content-type") ?? ""

  // If the server sent structured JSON, prefer its .error message
  if (ct.includes("application/json")) {
    try {
      const {error} = await resp.json()
      return error ? `${niceText} (${error})` : niceText
    } catch {
      // Ignore JSON parse errors
    }
  }
  return `${niceText} — ${new URL(resp.url).pathname}`
}
