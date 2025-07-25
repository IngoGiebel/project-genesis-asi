/*************************************************************************
 * Small utilities shared across survey / discussion pages
 ************************************************************************/

import {t} from "./i18n"

/* ── Status-code dictionary (lazy-loaded) ─────────────────────────────*/

const STATUS_CODES = [400, 401, 403, 404, 500] as const
type StatusCode = (typeof STATUS_CODES)[number]

export const STATUS_TEXT: Record<StatusCode, string> =
  Object.fromEntries(
    await Promise.all(
      STATUS_CODES.map(async code => [code, await t(`status.${code}`)])
    )
  ) as Record<StatusCode, string>

/* ── DOM helper ───────────────────────────────────────────────────────*/

export const $ = <T extends Element = Element>(
  sel: string,
  ctx: ParentNode | Document = document
) => ctx.querySelector<T>(sel)

/* ── Message factory ──────────────────────────────────────────────────*/

export type MsgFn = (txt: string, warn?: boolean) => void

export const msgFactory = (selector: string): MsgFn => {
  const el = document.querySelector<HTMLElement>(selector)

  return (txt, warn = false) => {
    if (!el) return           // element missing → nothing to do
    el.textContent = txt
    el.classList.toggle("text-warning", warn)
  }
}

/* ── Short-form fetch error helper ────────────────────────────────────*/

export async function errMsgShort(resp: Response): Promise<string> {
  const niceText =
    (STATUS_TEXT as Record<number, string>)[resp.status] ?? resp.statusText

  const ct = resp.headers.get("content-type") ?? ""
  if (ct.includes("application/json")) {
    try {
      const {error} = (await resp.json()) as { error?: string }
      return error ? `${niceText} (${error})` : niceText
    } catch {
      // Ignore JSON parse errors
    }
  }
  return `${niceText} — ${new URL(resp.url).pathname}`
}
