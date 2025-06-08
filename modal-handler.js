// This function will run once the main document is loaded.
function setupCitationModal() {
  console.log("Attempting to set up citation modal...");

  const citeButton = document.querySelector("a[href$='#citationModal']");
  const modalElement = document.getElementById("citationModal");

  if (citeButton && modalElement) {
    console.log("Cite button and modal element found.");
    const citationModal = new bootstrap.Modal(modalElement);

    citeButton.addEventListener("click", event => {
      event.preventDefault();
      citationModal.show();
    });

    const copyButton = modalElement.querySelector('.code-copy-button');
    const codeBlock = modalElement.querySelector('pre.sourceCode code');

    if (copyButton && codeBlock) {
      copyButton.addEventListener('click', () => {
        const textToCopy = codeBlock.innerText;

        // Use the modern Navigator Clipboard API
        navigator.clipboard.writeText(textToCopy).then(() => {
          // This block runs on successful copy
          console.log('Text copied successfully using navigator.clipboard!');

          const originalIcon = copyButton.innerHTML;
          copyButton.innerHTML = '<i class="bi bi-check2"></i>'; // Bootstrap check icon
          copyButton.title = 'Copied!';

          setTimeout(() => {
            copyButton.innerHTML = originalIcon;
            copyButton.title = 'Copy to clipboard';
          }, 2000); // Revert after 2 seconds

        }).catch(err => {
          // This block runs if the copy fails
          console.error('Failed to copy text using navigator.clipboard: ', err);
          // You could add user feedback here, e.g., changing button text to "Error"
        });
      });

    } else {
        console.error("Could not find the copy button or code block inside the modal.");
    }

  } else {
    console.error("Could not find the 'Cite' button or the modal element on the page.");
  }
}

// Ensure DOM is ready before setting up the modal
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupCitationModal);
} else {
  setupCitationModal();
}
