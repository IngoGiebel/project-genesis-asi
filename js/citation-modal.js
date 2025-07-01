/*************************************************************************
 * Handles the “Copy BibTeX” button inside the citation modal
 ************************************************************************/

import {t} from "./i18n.js"

async function setupCitationModal() {
  const citeButton = document.querySelector("a[href$='#citationModal']")
  const modalElement = document.getElementById("citationModal")
  if (!citeButton || !modalElement) return

  const copiedStr = await t("citation.copied")
  const copyStr = await t("citation.copyToClipboard")

  // noinspection JSUnresolvedFunction
  const citationModal = new bootstrap.Modal(modalElement)

  citeButton.addEventListener("click", event => {
    event.preventDefault()
    citationModal.show()
  })

  const copyButton = modalElement.querySelector(".code-copy-button")
  const codeBlock = modalElement.querySelector("pre.sourceCode code")
  if (!copyButton || !codeBlock) return

  copyButton.title = copyStr

  copyButton.addEventListener("click", () => {
      navigator.clipboard.writeText(codeBlock.innerText).then(() => {
        const originalIcon = copyButton.innerHTML
        copyButton.innerHTML = "<i class='bi bi-check2'></i>"
        copyButton.title = copiedStr
        // Revert after 2 seconds
        setTimeout(
          () => {
            copyButton.innerHTML = originalIcon
            copyButton.title = copyStr
          },
          2000)
      }).catch(err => {
        console.error("Failed to copy text using navigator.clipboard: ", err)
      })
    },
  )
}

// Ensure DOM is ready before setting up the modal citation window
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setupCitationModal().catch(console.error)
  })
} else {
  void setupCitationModal()
}
