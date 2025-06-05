const form = document.getElementById("ai-consciousness-survey");
const messageDiv = document.getElementById("form-messages");
const ageInput = document.getElementById("age");
const nationalityElement = document.getElementById("nationality");

let choicesNationality;
let rawCountryDataForReset;

async function setupNationalityDropdown() {
  if (nationalityElement) {
    try {
      const response = await fetch("data/countries.json");
      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}, statusText: ${response.statusText}`
        );
      }
      rawCountryDataForReset = await response.json();
      const countryChoicesData = rawCountryDataForReset.map((country) => ({
        value: country.alpha2,
        label: country.name
      }));

      // Add the placeholder at the beginning
      const finalCountryChoices = [
        {
          value: "",
          label: "--Please choose an option--",
          selected: true,
          disabled: true,
          placeholder: true
        },
        ...countryChoicesData
      ];

      // Clear any existing options in the select (important if this function is ever re-run)
      nationalityElement.innerHTML = "";

      // Populate the native select element (good for fallback and if Choices.js fails)
      finalCountryChoices.forEach((country) => {
        const option = document.createElement("option");
        option.value = country.value;
        option.textContent = country.label;
        if (country.selected) {
          option.selected = true;
        }
        if (country.disabled) {
          option.disabled = true;
        }
        nationalityElement.appendChild(option);
      });

      // Initialize Choices.js on the select element
      choicesNationality = new Choices(nationalityElement, {
        searchPlaceholderValue: "Search for a country...",
        itemSelectText: "",
        allowHTML: false,
        sorter: function (a, b) {
          if (
            a.placeholder ||
            (a.customProperties && a.customProperties.placeholder)
          )
            return -1;
          if (
            b.placeholder ||
            (b.customProperties && b.customProperties.placeholder)
          )
            return 1;
          return a.label.localeCompare(b.label);
        }
      });

      // Keep highlighted choice in view (mouse OR keyboard)
      choicesNationality.passedElement.element.addEventListener(
        "highlightChoice",
        (e) => {
          if (e.detail && e.detail.el) {
            e.detail.el.scrollIntoView({
              block: "nearest",
              behavior: "smooth"
            });
          }
        }
      );
    } catch (error) {
      console.error(
        "Could not load or initialize country data. Full error object:",
        error
      );
      if (nationalityElement) {
        nationalityElement.innerHTML = `<option value=''>Error loading countries: ${error.message}</option>`;
      }
      if (messageDiv) {
        messageDiv.textContent = `Error loading country list: ${error.message}. Please try refreshing.`;
      }
    }
  }
}

// Call the setup function when the DOM is ready
document.addEventListener("DOMContentLoaded", setupNationalityDropdown);

// Add input event listener for the age field
if (ageInput) {
  ageInput.addEventListener("input", function (e) {
    let value = e.target.value;

    // Prevent more than 3 digits from being entered
    if (value.length > 3) {
      // If more than 3 digits, slice the value to the first 3 digits
      value = value.slice(0, 3);
    }

    // If it is a valid number and exceeds max (120), cap it at max
    // This provides immediate feedback as they type.
    // The HTML5 validation (max="120") also handles this on form submission.
    const numValue = parseInt(value, 10);
    // Get max value from the input's attribute
    const max = parseInt(e.target.max, 10);

    if (!isNaN(numValue) && numValue > max) {
      // If the value exceeds max, set it to max
      value = max.toString();
    }
    // Update the input field's value
    e.target.value = value;
  });

  // Enforce min value if they type "0" or something less than 1 on blur
  ageInput.addEventListener("blur", function (e) {
    let value = e.target.value;
    const numValue = parseInt(value, 10);
    const min = parseInt(e.target.min, 10);

    if (value !== "" && !isNaN(numValue) && numValue < min) {
      e.target.value = min.toString();
    }
    // Specifically handle if they type "0"
    else if (value === "0" && min > 0) {
      e.target.value = min.toString();
    }
  });
}

// Form submission logic
if (form) {
  form.addEventListener("submit", async (event) => {
    // Prevent default HTML form submission
    event.preventDefault();
    // Check if messageDiv exists
    if (messageDiv) messageDiv.textContent = "Submitting...";

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/.netlify/functions/submit-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        if (messageDiv)
          messageDiv.textContent = "Thank you! Your submission was successful.";
      } else {
        const result = await response.json();
        if (messageDiv)
          messageDiv.textContent =
            "Error: " +
            (result.error || "Submission failed. Please try again.");
        console.error("Submission error result:", result);
      }
    } catch (error) {
      if (messageDiv)
        messageDiv.textContent =
          "Network error. Please check your connection and try again.";
      console.error("Network error:", error);
    }
  });
}
