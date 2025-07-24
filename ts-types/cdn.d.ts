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
