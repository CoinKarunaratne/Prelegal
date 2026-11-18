# Prelegal frontend: Mutual NDA Creator

A Next.js app where a user fills in the key terms of a Mutual Non-Disclosure
Agreement, sees the completed agreement update live, and downloads it as a PDF.

The agreement text comes from Common Paper's Mutual NDA (Version 1.0) in the
repository's [`templates/`](../templates) directory, used under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Running it

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests (vitest)
npm run lint
npm run build    # production build; the page is prerendered as static HTML
```

Run these from `frontend/`: the app reads `../templates/` at build time.

## How it works

```
templates/Mutual-NDA-Cover-Page.md ─┐  build time (server)
templates/Mutual-NDA.md ────────────┤  lib/nda/template.ts: blanks → {{tokens}}
                                    │  lib/nda/markdown.ts: remark + GFM → mdast
                                    ▼
                         NdaCreator (client) ── form values
                                    │  lib/nda/fill.ts: {{tokens}} → field nodes
                                    ├─► NdaPreview: HTML live preview
                                    └─► NdaPdf: PDF via @react-pdf/renderer
                                        (loaded only when Download is clicked)
```

- **One source of truth.** Both the preview and the PDF render the same
  filled-in syntax tree, so they always say the same thing.
- **User input is never parsed as markdown.** Form values replace placeholder
  tokens after parsing, as plain-text `field` nodes.
- **Template changes fail loudly.** `prepareCoverPage` expects each blank it
  replaces to appear exactly once, and throws at build time otherwise.
- **PDF fonts.** `public/fonts/` holds Noto Serif and Noto Sans (SIL Open Font
  License, see `public/fonts/OFL.txt`), which cover Latin, Greek and Cyrillic.
  The form warns about, and blocks downloads for, characters these fonts can't
  draw (for example Chinese, Japanese, Arabic or emoji).
