/*************************************************************************
 * choices-utils.js
 * -----------------------------------------------------------------------
 * Tiny, framework-agnostic helpers that smooth out the UX of
 * Choices.js single-select lists
 *
 *  ▸ keepHighlightVisible ─ keeps the keyboard-highlighted option scrolled
 *    into view while the user moves up / down.
 *
 *  ▸ selectInputValue ─ when the dropdown opens, pre-fill the search box
 *    with the currently selected label and keep it visible (like native
 *    <select> elements).
 *
 * Usage (after creating the Choices instance):
 *
 * import {keepHighlightVisible, selectInputValue} from "./choices-utils.js";
 * const ch = new Choices(select, { /* … *\/ });
 * keepHighlightVisible(ch);
 * selectInputValue(ch);
 *
 * Both helpers attach their listeners once and return void.
 ************************************************************************/

import type Choices from "choices.js"

// Helper type: highlightChoice event payload
interface HighlightEvent extends Event {
  readonly detail?: { el?: HTMLElement }
}

/**
 * keep the highlighted option visible.
 */
export function keepHighlightVisible(choices: Choices): void {
  // highlightChoice is dispatched from choices.passedElement.element
  choices.passedElement.element.addEventListener(
    "highlightChoice",
    (evt: HighlightEvent) => {
      const el = evt.detail?.el
      el?.scrollIntoView({block: "nearest", behavior: "auto"})
    }
  )
}

/**
 * Pre-fill search box with current label
 */
export function selectInputValue(choices: Choices): void {
  choices.passedElement.element.addEventListener("showDropdown", () => {
    requestAnimationFrame(() => {
      const input = choices.input.element
      const choice = choices.getValue() as { label: string; value: string } | undefined

      if (choice) {
        input.value = choice.label

        const list = choices.choiceList.element
        const active = list.querySelector<HTMLElement>(`.choices__item[data-value="${choice.value}"]`)
        if (active) {
          active.scrollIntoView({block: "center", behavior: "auto"})
          list.querySelector(".is-highlighted")?.classList.remove("is-highlighted")
          active.classList.add("is-highlighted")
        }
      }

      input.focus()
      input.select()
    })
  })
}
