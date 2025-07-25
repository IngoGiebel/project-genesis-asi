declare module "https://cdn.jsdelivr.net/npm/dompurify@3/+esm" {
  interface DOMPurifyInstance {
    sanitize(source: string | Node): string
  }

  export const DOMPurify: DOMPurifyInstance & ((win?: Window) => DOMPurifyInstance)

  // noinspection JSUnusedGlobalSymbols
  export default DOMPurify
}

declare module "https://cdn.jsdelivr.net/npm/marked@15/+esm" {
  export * from "marked"
}

declare module "https://cdn.jsdelivr.net/npm/choices.js@11/+esm" {
  import Choices from "choices.js"
  // noinspection JSUnusedGlobalSymbols
  export default Choices
}

declare module "https://cdn.jsdelivr.net/npm/easymde@2/dist/easymde.min.js/+esm" {
  import EasyMDE from "easymde"
  // noinspection JSUnusedGlobalSymbols
  export default EasyMDE
}
