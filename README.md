# Awesome WASM Tools 1000

Browser utilities for images, audio, archives, cryptography, text, PDFs, encoding and calculations. Implementations use JavaScript, browser APIs and some WebAssembly — **not every page is a verified working WASM tool**.

[Audit report](docs/AUDIT-2026-09-24.md) · [Implementation evidence](docs/unavailable-implementations.json)

## Current status

The source contains **1,186 tool pages across nine directories**. The generated catalog uses actual titles, stable category-scoped keys and explicit availability. **218 pages are unavailable** because known implementations or required resources are incomplete. Remaining pages are labeled **unverified**, not certified.

Known simulated encryption, validation, compression, audio and PDF operations no longer fabricate successful results. Their original source remains in Git history. Do not use unverified cryptography to protect sensitive data. Keep original files.

Some tools load external CDN dependencies. Full offline operation and universal browser compatibility are **not guaranteed**. The npm vulnerability report does not audit external CDN scripts.

## Development

Use Node.js 22.12 or newer with npm. CI uses Node 22.

```sh
npm ci
npm run dev
```

The development server binds to localhost. New tools belong in `src/tools/<category>/<ID>/index.html`; production inputs and directory entries are discovered automatically. Existing URLs are preserved, including CAL IDs present in different categories.

## Verification and production

```sh
npm test
npm run typecheck
npm run build
npm run check:dist
npx playwright install chromium
npm run test:e2e
```

`npm run check` runs the non-browser gates. Browser tests use a static server at both `/` and `/awesome-wasm-tools-1000/`. `CHROMIUM_PATH` can select an installed Chromium executable; it does not override browser security policies.

Serve **dist**, not the source directory, in production. The build emits all tool pages, bundles module scripts, preserves classic scripts that rely on window globals, and replaces known unavailable pages with no-input/no-download explanations.

For a custom crawl origin and path:

```sh
SITE_URL=https://example.com/tools/ npm run build
```

Relative navigation supports subdirectory deployments. No backend, credentials or user-file upload endpoint is added by this audit.

## Architecture

- `scripts/catalog.mjs`: discovery, availability checks, static directory, portable links and classic-script inventory.
- `src/catalog/`: responsive directory, search, category/status filters and language UI.
- `src/utils/`: image state/resource ownership, arithmetic parser, spreadsheet evaluator and shared availability/accessibility helpers.
- `scripts/validate-dist.mjs`: checks all emitted HTML routes/assets, blocked-page safety and sitemap alignment.
- `tests/`: source-syntax, parser, inventory, browser and conversion regressions.
- `public/tools.json` and `public/catalog/`: generated; do not hand-edit.

The static directory supports navigation without JavaScript. Legacy tool interfaces and translations vary; the language switch does not imply full translation of every page.

## Contributing

Use real implementations and fixtures. Test output bytes with independent parsers, not only filenames or success messages. Include negative/corrupt inputs and resource cleanup tests. See the audit's re-enabling requirements before removing an unavailable marker.

Historical `plan*.md` files are planning documents, not current implementation status. Package metadata declares MIT; a standalone LICENSE was absent at audit baseline and must be confirmed by the maintainer before making licensing assurances.
