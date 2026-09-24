# Preserve category-home design

## Maintainer scope

Keep category homepages in their original design. Individual tool pages under `src/tools/<category>/<ID>/` may be improved or redesigned. This correction updates PR #6 and does not merge or deploy it.

## Restored

- Original `index.html` template, identical to baseline `d3c5d0b1ae2c76e6006f6b1c3cf45afb4de46bae`: Git blob `0da4c3874734bc619d42826ef012ac66647ddd8d`.
- Original `src/styles/global.css`: Git blob `1722a64031aa173f41f5762c13557c58cb904460`.
- Original header, eight category groups, 160 selected shortcut cards in their original order, FAQ/footer structure, colors, spacing and two language buttons.
- Removed the replacement `src/catalog` frontend. No hero, sidebar, search/filter controls or alternate category-home layout is introduced.

## Retained

All previously committed tool implementation fixes and fail-closed protections remain. All 1,186 tool routes still build. The 218 known-unavailable pages remain blocked, and the remaining 968 are not certified. The supplementary generated static catalog remains available separately and does not replace the original homepage.

Availability/accessibility styles moved to `src/styles/tool-safety.css`, loaded by tool pages only. This preserves their safety notices without altering the category homepage's global stylesheet.

The original HTML is a visual template. `scripts/homepage.mjs` patches only factual text and metadata during Vite development/build, including no-JavaScript output. Its body elements, classes and link ordering are unchanged. Shared `src/i18n/site-copy.js` keeps rendered text consistent with language switching. The old claims about full offline operation and completed-tool counts are not restored to the served site. Always serve the built `dist` directory in production.

## Verification

- Original template and CSS blob-identity checks.
- Structural comparison before/after factual copy repair.
- Static metadata/JSON-LD/Chinese copy consistency, portable links and idempotence.
- Existing algorithm, image conversion, spreadsheet, syntax and full-route gates retained.
- Browser tests updated to cover the original homepage, category/card order, root/subpath child navigation, language switching without storage, no-JavaScript navigation and desktop/mobile presentation.

Prepared working-copy non-browser checks passed: 39 Node tests, TypeScript, complete production build and 1,188 emitted HTML pages with zero missing local href/src targets.

The local Chromium environment denies HTTP navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. That attempt is not a product pass. Review the new PR Actions run and its artifacts for browser results on the committed revision. Older audit screenshots depict the withdrawn design and are not evidence for this correction.
