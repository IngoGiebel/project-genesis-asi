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

export const msgFactory = (selector) =>
  (txt) => {
    document.querySelector(selector).textContent = txt
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
