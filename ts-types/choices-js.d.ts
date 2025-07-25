declare module "choices.js" {
  class Choices {
    constructor(element: HTMLElement | HTMLInputElement, options?: unknown)

    passedElement: { element: HTMLElement }
    input: { element: HTMLInputElement }
    choiceList: { element: HTMLElement }

    getValue(): { label: string; value: string } | undefined

    setChoiceByValue(value: string): void
  }

  // noinspection JSUnusedGlobalSymbols
  export default Choices
}
