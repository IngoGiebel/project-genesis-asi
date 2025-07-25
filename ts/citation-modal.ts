/*************************************************************************
 * Citation modal – “Copy BibTeX” button
 ************************************************************************/

import {t} from "./i18n"

/* ── Global bootstrap ─────────────────────────────────────────────────*/

async function setupCitationModal(): Promise<void> {
  const citeButton = document.querySelector<HTMLAnchorElement>(
    "a[href$='#citationModal']"
  )
  const modalElement = document.getElementById("citationModal")
  if (!citeButton || !modalElement) return

  const copiedStr = await t("citation.copied")
  const copyStr = await t("citation.copyToClipboard")

  // Bootstrap 5 Modal – provided globally
  const citationModal = new (window as any).bootstrap.Modal(modalElement)

  citeButton.addEventListener("click", evt => {
    evt.preventDefault()
    citationModal.show()
  })

  const copyButton = modalElement.querySelector<HTMLButtonElement>(
    ".code-copy-button"
  )
  const codeBlock = modalElement.querySelector<HTMLElement>(
    "pre.sourceCode code"
  )
  if (!copyButton || !codeBlock) return

  copyButton.title = copyStr

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(codeBlock.innerText)

      const originalIcon = copyButton.innerHTML
      copyButton.innerHTML = "<i class='bi bi-check2'></i>"
      copyButton.title = copiedStr

      setTimeout(() => {
        copyButton.innerHTML = originalIcon
        copyButton.title = copyStr
      }, 2_000)
    } catch (err) {
      console.error("Failed to copy text:", err)
    }
  })
}

/* ── Run after DOM ready ──────────────────────────────────────────────*/

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setupCitationModal().catch(console.error)
  })
} else {
  void setupCitationModal()
}
