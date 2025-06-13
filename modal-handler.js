function setupCitationModal() {
  const citeButton = document.querySelector("a[href$='#citationModal']")
  const modalElement = document.getElementById("citationModal")

  if (citeButton && modalElement) {
    const citationModal = new bootstrap.Modal(modalElement)

    citeButton.addEventListener(
      "click",
      event => {
        event.preventDefault()
        citationModal.show()
      })

    const copyButton = modalElement.querySelector(".code-copy-button")
    const codeBlock = modalElement.querySelector("pre.sourceCode code")

    if (copyButton && codeBlock) {
      copyButton.addEventListener(
        "click",
        () => {
          const textToCopy = codeBlock.innerText
          navigator.clipboard.writeText(textToCopy).then(() => {
            const originalIcon = copyButton.innerHTML
            copyButton.innerHTML = "<i class='bi bi-check2'></i>"
            copyButton.title = "Copied!"
            // Revert after 2 seconds
            setTimeout(
              () => {
                copyButton.innerHTML = originalIcon
                copyButton.title = "Copy to clipboard"
              },
              2000)
          }).catch(err => {
            console.error("Failed to copy text using navigator.clipboard: ", err)
            // You could add user feedback here, e.g., changing button text to "Error"
          })
        },
      )
    }
  }
}

// Ensure DOM is ready before setting up the modal
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupCitationModal)
} else {
  setupCitationModal()
}
