# `js/` — generated JavaScript bundle (TypeScript output only)

All client-side logic is written in **TypeScript** and lives in `/ts`.  
During the build step (`tsc`) those sources are transpiled into plain
ECMAScript modules and emitted here. The browser therefore loads files from
`/js`, while developers work exclusively in `/ts`.

---

## Workflow

```bash
# install dev-dependencies
npm ci

# one-off compile → populates /js
npx tsc

# continuous watch
npx tsc --watch
