# Audit verification evidence — 2026-09-24

[Pull request #6](https://github.com/stephen-taipei/awesome-wasm-tools-1000/pull/6) · [Findings and limits](AUDIT-2026-09-24.md)

## Completed remote verification

[Actions run 35937050766](https://github.com/stephen-taipei/awesome-wasm-tools-1000/actions/runs/35937050766) passed all steps on Ubuntu with Node 22.23.2 and Playwright Chromium 153.0.8010.12.

The run started from the migration commit and then tested the completed source at **d9f578b401d525d81fd606dbb3ad4aea7627c691**. `audit-results/commit.txt` identifies this exact tested revision; it is distinct from the run's trigger SHA. The subsequent commit 8444fa5 replaces temporary write-enabled migration with permanent **read-only CI**. Check the PR's latest checks for later revisions.

| Gate | Observed result |
| --- | --- |
| Node regression tests | 35 passed, 0 failed |
| First-party syntax scan | 1,193 JavaScript files and 1 inline script parsed |
| Classic-script inventory | 358 scripts preserved and parsed as classic JavaScript |
| TypeScript | Passed |
| Production build | Passed; all 1,186 tool routes emitted |
| HTML route/asset validation | 1,188 pages, 0 missing local href/src targets |
| Availability | 218 unavailable; remaining 968 labeled unverified |
| Playwright browser tests | 12 passed, 0 failed |
| npm audit | 0 known vulnerabilities at the recorded run |

The browser suite checked root/subdirectory navigation, real JPEG download signatures, stale-result invalidation, reset races, unsupported encoder rejection, corrupt files, object URL cleanup, search/filter/retry states, storage denial, mobile overflow, static no-JavaScript navigation, spreadsheet dependencies/cycles, and representative startup in all nine categories. Two additional presentation regressions were subsequently added to cover Chinese controls and top-of-page desktop/mobile captures.

## Archived evidence

[Artifact 10782984755](https://github.com/stephen-taipei/awesome-wasm-tools-1000/actions/runs/35937050766/artifacts/10782984755), `codebase-audit-verification`, contains the source snapshot, check log, emitted-route report, npm audit JSON, desktop/mobile screenshots and Playwright HTML report. GitHub retention is seven days; the recorded results in this document remain after artifact expiry.

Artifact ZIP SHA-256: `cb91e8236c35fdd16d5ee93956d0956e9dc5e05bbe129458d3cbce3803084ca1`.

## What these results do not establish

Passing these gates is not exhaustive functional verification of 1,186 tools, cryptographic certification, complete offline support, CDN supply-chain assurance, or cross-browser/accessibility certification. The 187 incomplete implementations were disabled rather than implemented. Missing-library pages remain unavailable. The audit report lists the remaining work explicitly.
