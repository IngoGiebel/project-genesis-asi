/*************************************************************************
 * choices-utils.js
 * -----------------------------------------------------------------------
 * Tiny, framework-agnostic helpers that smooth out the UX of
 * [Choices.js](https://github.com/Choices-js/Choices) single-select lists.
 *
 *  ▸ keepHighlightVisible ─ ensures the keyboard-highlighted option is
 *    always scrolled into view while the user moves up / down.
 *
 *  ▸ selectInputValue ─ when the dropdown opens, pre-fill the search box
 *    with the currently selected label and keep it in view; this mimics
 *    the behaviour of most native <select> elements.
 *
 * Both helpers are *side-effect* utilities: they attach the relevant
 * listeners once and return void.  Import them **after** you create the
 * Choices instance:
 *
 *    import { keepHighlightVisible, selectInputValue } from "./choices-utils.js";
 *    const ch = new Choices(select, { /* … *\/ });
 *    keepHighlightVisible(ch);
 *    selectInputValue(ch);
 *
 * These functions are used by survey.js but can be dropped into any page
 * without additional dependencies.
 *
 * @typedef {import("choices.js").default} ChoicesJS
 *************************************************************************/

/**
 * Keep the highlighted option in view while the user moves through the list
 * @param {ChoicesJS} choices   A Choices.js instance
 */
export function keepHighlightVisible(choices) {
  // noinspection JSUnresolvedVariable
  choices.passedElement.element.addEventListener(
    "highlightChoice",
    e => {
      const el = e?.detail?.el
      if (!el) return
      // Jump instantly just enough to reveal the item
      el.scrollIntoView({block: "nearest", behavior: "auto"})
    },
  )
}

/**
 * Focus and select search input text
 * @param {ChoicesJS} choices   A Choices.js instance
 */
export function selectInputValue(choices) {
  // noinspection JSUnresolvedVariable
  choices.passedElement.element.addEventListener("showDropdown", () => {
    requestAnimationFrame(() => {
      const input = choices.input.element
      const choice = choices.getValue()

      if (choice && typeof choice === "object") {
        input.value = choice.label
        // noinspection JSUnresolvedVariable
        const el = choices.choiceList.element.querySelector(`.choices__item[data-value="${choice.value}"]`)
        if (el) {
          el.scrollIntoView({block: "center", behavior: "auto"})
          // noinspection JSUnresolvedVariable
          choices.choiceList.element.querySelector(".is-highlighted")?.classList.remove("is-highlighted")
          el.classList.add("is-highlighted")
        }
      }
      input.focus()
      input.select()
    })
  })
}
