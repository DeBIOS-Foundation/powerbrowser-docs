# Verification subsystem

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/scripts/scan-brand-residue.mjs`
- `$PB_REPO/scripts/check-internals-boundary.sh`
- `$PB_REPO/scripts/verify-registry-shape.mjs`
- `$PB_REPO/scripts/verify-endpoints.sh`
- `$PB_REPO/scripts/verify-telemetry.mjs`
- `$PB_REPO/.planning/WINDOWS.md`

Not read:
- NOT COVERED: the other rule scripts named by registry rows. Only the six script files above were read, and `WINDOWS.md` only for ledger entries 5 and 10. The rest are described from their registry comments and row labels, in [Verification rule scripts](verification-rule-scripts.md).
- NOT COVERED: the Theia tree, the upstream checkout, and the build and generated output that checks read. Gitignored output is not named here.
- NOT COVERED: live behavior. No build, browser, display or network run was made for this doc, and no `--quick` or `--only` output was sampled.

Status: working

<!-- BEGIN pb-rules:stop-and-ask -->
> **Stop and ask the user before you:**
>
> - edit any file in PB core (`$PB_REPO`);
> - add AI tools, agents, model providers or MCP config to PB core;
> - ship a pref change, enable `powerbrowserPrivilegedJs`, use experiment APIs, ship an unsigned XPI or enable any remote protocol;
> - add an outbound host (it needs a row in `$PB_REPO/powerbrowser/endpoint-allowlist.json`);
> - file more than 3 doc-gap issues in one session.
<!-- END pb-rules:stop-and-ask -->

**PB hard rules apply.** Read them in [docs/_shared/RULES.md](../_shared/RULES.md#hard-rules) before you change anything.

## What it is

- One driver runs every verification check for PowerBrowser (PB): `$PB_REPO/scripts/verify-platform.sh`.
- One registry lists every check: the `CHECKS` array in the `run_own_checks` function of that driver. Each row is a quoted `"label|command"` string. The registry holds 272 rows: 154 quick and 118 full.
- A command is either a `node` or `bash` invocation of a script under `$PB_REPO/scripts/`, or a bare wrapper function defined in the driver. The one exception is the generated SHELL-01 runner, a temporary file that the driver writes at run time.
- Two tiers: quick and full. The split is described under [APIs by layer](#apis-by-layer).
- Self-tests: 85 of the 181 distinct command targets have a self-test row. The other 96 have none. Per-target status is in [Verification rule scripts](verification-rule-scripts.md).
- To add a check, append one row to the registry. Never create a sibling driver.

## Where its data lives

- Registry rows: the `CHECKS` array in `run_own_checks`. The quick array closes before the `if` line that opens the full-only `CHECKS+=` block.
- Known-open exclusions: the `GATE_KNOWN_OPEN_EXCLUSIONS` array, read only by `--gate`. Each entry is keyed on a broken-windows ledger id in `$PB_REPO/.planning/WINDOWS.md`. An exclusion applies only while that entry's status is `open`. At 5571d3d, entries 5 and 10 are `fixed` (and were `fixed` at dfe3b6c), so no exclusion applies; see [Commands, settings and ids](#commands-settings-and-ids).
- Rule scripts: `$PB_REPO/scripts/`. Each of the five spot-read scripts takes its expectation from the tree or from a tracked file at check time. See each script header.
- The generated Theia runner for the SHELL-01 row: a `mktemp` file written only when the full tier runs. The driver tracks it for removal.

## APIs by layer

The registry is the only API. It holds 272 rows: 154 in the quick tier and 118 in the full tier. Each label below appears once, in its tier.

Tier equals registration site. The quick tier is the first array in `run_own_checks`. The full tier is the `CHECKS+=` block that runs only when `--quick` is not given. A comment that says "honestly --quick" does not move a row. The registration site decides.

### Quick tier

The driver header defines the quick set as checks that need no build, no browser launch and no display.

- Brand residue and preflight: `scan-brand-residue`, `scan-brand-residue-self-test`, `branding-preflight`, `branding-preflight-self-test`
- Manifest and trademark: `verify-manifest-literals`, `verify-manifest-literals-self-test`, `verify-trademark-surface`, `verify-trademark-surface-self-test`, `verify-rebranding-docs`, `verify-rebranding-docs-self-test`
- Patch surface and pins: `check-patch-surface`, `check-patch-surface-self-test`, `check-patch-surface-brand-values`, `check-patch-surface-brand-values-self-test`, `ext-tab-host-patch-guards`, `ext-tab-host-patch-guards-self-test`, `ext-tab-host-scope`, `ext-tab-host-scope-self-test`, `fetch-upstream-self-test`, `verify-upstream-pins`, `verify-upstream-pins-self-test`
- Allowlist and internals: `allowlist-schema`, `allowlist-doc-consistency`, `allowlist-doc-consistency-self-test`, `branding-variant-divergence-self-test`, `internals-boundary-self-test`, `internals-boundary`, `internals-catalogue`, `ng-039-internals-detects-waivers`, `ng-040-internals-catalogue-lines`, `ng-040-internals-catalogue-lines-self-test`
- Shell static: `shell-csp-inline-attrs`, `shell04-log-redacts-token`, `shell-gbrowser-standin`, `shell-gbrowser-standin-self-test`
- Bridge and chrome bar: `gui04-registry-shape`, `gui04-registry-shape-self-test`, `gui06-chrome-bar-commands`, `gui06-chrome-bar-commands-self-test`, `shortcut-relay`, `shortcut-relay-self-test`, `gui06-chrome-bar-suggestions`, `gui06-chrome-bar-suggestions-self-test`, `address-bar-rows`, `address-bar-rows-self-test`, `address-bar-modes`, `address-bar-modes-self-test`, `site-identity`, `site-identity-self-test`, `gui06-chrome-bar-placement`, `gui06-chrome-bar-placement-self-test`, `gui02-web-tab-bridge`, `gui02-web-tab-bridge-self-test`, `token-cookie-strip`, `token-cookie-strip-self-test`, `group-channel`, `group-channel-self-test`
- Modes, setups and store static: `gui07-strip-spike-verdict`, `gui07-strip-spike-verdict-self-test`, `gui07-mode-toggle-commands`, `gui07-mode-toggle-commands-self-test`, `gui07-mode-switch-tabs-invariant`, `gui07-mode-switch-tabs-invariant-self-test`, `modes-panel-motion`, `modes-panel-motion-self-test`, `gui09-setup-roundtrip`, `gui09-setup-roundtrip-self-test`, `modes-name-cap-at-input`, `modes-name-cap-at-input-self-test`, `gui09-dependent-window-content`, `gui09-dependent-window-content-self-test`, `gui08-persistence-roundtrip`, `gui08-persistence-roundtrip-self-test`, `ng-016-gui08-persistence-at-head`, `ng-019-tab-store-doc`, `ng-020-absence-wiring-by-call`, `ng-087-loose-position-across-restart`, `ng-087-loose-position-across-restart-self-test`, `ng-088-group-order-across-restart`, `ng-088-group-order-across-restart-self-test`, `tab-store-offline`
- Canvas, view and copy: `gui08-canvas-geometry`, `gui08-canvas-geometry-self-test`, `gui08-view-parity`, `gui08-view-parity-self-test`, `gui08-close-exactness`, `gui08-close-exactness-self-test`, `gui08-panorama-copy`, `gui08-panorama-copy-self-test`, `gui09-setups-copy`, `gui09-setups-copy-self-test`, `theia-build-order`, `theia-build-order-self-test`
- Shell error and generator: `shell-error-copy-no-internals`, `shell-error-copy-no-internals-self-test`, `start-path-recovery`, `start-path-recovery-self-test`, `shell-error-contract`, `shell-error-contract-self-test`, `about-dialog-suppression-self-test`, `generated-byte-identity`, `generated-byte-identity-self-test`, `generate-check`, `generate-self-test`
- Branding outputs: `branding-dir-agreement`, `branding-dir-agreement-self-test`, `icon-ihdr`, `icon-ihdr-self-test`, `installer-schema`, `installer-schema-self-test`, `vendored-parser-digest`, `vendored-parser-digest-self-test`
- Extensions and telemetry: `extension-pins`, `extension-pins-self-test`, `telemetry`, `telemetry-self-test`, `theia-branding`, `theia-branding-self-test`, `theia-endpoints`, `theia-endpoints-self-test`, `verify-downstream-fixtures`, `verify-downstream-fixtures-self-test`, `mar-update-hop-self-test`, `installer-build-proof-self-test`
- Crash and policy: `crash-collector`, `crash-collector-self-test`, `ng068-crash-extra-part`, `ng070-no-spaced-name`, `ng070-no-spaced-name-self-test`, `ng074-ci-green-on-main-self-test`, `ng089-uat-sheets-self-test`, `webextensions`, `webextensions-self-test`, `search-engines`, `search-engines-self-test`
- Store, env and deps: `sql-store-second-writer`, `sql-store-second-writer-self-test`, `sql-store-soak`, `sql-store-soak-self-test`, `backend-env-readers`, `backend-env-readers-self-test`, `ng-027-reader-callers`, `ng-027-reader-callers-self-test`, `tab-uris-typecheck`, `chrome-bar-typecheck`, `first-boot-surface-self-test`, `single-copy-deps`, `single-copy-deps-self-test`, `ng086-theia-react-node`, `ng086-theia-react-node-self-test`, `node-major-agreement`, `node-major-agreement-self-test`, `planning-paths`, `planning-paths-self-test`

### Full tier

The full-only block holds the rows that the quick set excludes. The driver header does not list their prerequisites. The row comments state them where they give a reason.

- Theia app and branding identity: `smoke-theia`, `diff-theia-core`, `verify-branding`, `verify-customize-inert`, `verify-dev-flag-off`, `verify-uri-roundtrip`, `desktop-entry-quick`, `apply-patches-self-test`, `about-dialog-suppression`, `branding-variant-divergence`, `verify-branding-identity-dev`, `verify-branding-identity-release`, `verify-branding-identity-brand-ftl-control`, `verify-branding-identity-runtime-control`
- Gecko, endpoints and packaging: `smoke-firefox`, `verify-endpoints`, `verify-endpoints-interrupt-self-test`, `mar-update-hop`, `installer-build-proof`, `ng063-packaged-launch`, `ng064-update-url-from-manifest`, `ng065-mar-signature-enforced`, `ng066-nsis-branding-no-ping`, `ng067-frontend-errors-reach-telemetry`, `ng069-sidecar-egress`, `ng071-tarball-extensions-build`, `ng072-policies-packaged-webextension`, `search-engines-packaged`, `ng073-declared-extension-loads`, `ng074-ci-green-on-main`, `ng089-uat-sheets`
- Sidecar and shell lifecycle: `side02-token-negative`, `side02-token-positive`, `side02-index-gated`, `side01-bind-scope`, `shell01-theia-is-the-window`, `shell05-paint-before-backend`, `side03-kill-and-recover`, `side04-sigkill-no-orphan`, `side04-unsupervised-backend-survives`, `side04-leftover-reaped`, `side04-stale-identity-not-signalled`, `harness-display-available`, `shell03-unrecoverable-immediate-error`, `shell03-budget-exhausted-error`, `shell03-auto-dismiss-on-selfheal`, `shell04-diagnostics-with-backend-down`, `health-gate-recovery-swaps`, `start-failure-shows-error`, `shell-diagnostics-rows-populated`, `side05-second-launch-focuses`, `side05-no-second-backend`, `cr01-different-profile-backend-survives`, `side04-token-not-in-environment`
- Window: `gui01-single-shell-window`, `gui01-browser-close-does-not-quit`, `gui01-command-registered`
- Store and tab live: `sql-store-soak-live`, `sql-store-roundtrip`, `sql-store-roundtrip-self-test`, `sql-store-absence`, `sql-store-absence-self-test`, `ng-001-one-key-rule`, `ng-002-navigation-keeps-row`, `ng-003-same-url-two-rows`, `ng-004-new-tab-row-unknown-uri-error`, `ng-005-prune-keeps-open-rows`, `ng-006-close-group-closes-web-tabs`, `ng-007-shell-tabs-keep-group-across-restart`, `ng-008-panorama-card-reopens-through-opener`, `gui08-loose-cards-live`, `pan03-strip-group-live`, `pan04-undo-close-group-live`, `pan05-card-close-live`, `ng-009-content-age-columns`, `ng-010-closed-tab-history`, `ng-011-settings-table-read`, `ng-012-reader-reports-schema-errors`, `ng-013-unopenable-store-quarantined`, `ng-014-rebuild-at-head`, `ng-015-real-migration-from-every-version`, `ng-017-sql05-restarts-real-browser`, `ng-018-scheduled-integrity-check`, `ng-085-quit-closes-store`
- Modes, tabs and boot live: `gui07-mode-switch-tabs-live`, `gui07-mode-switch-tabs-live-self-test`, `ng-021-places-reads-via-actor`, `ng-022-sessionstore-projection-via-actor`, `ng-023-suggestions-history-bookmarks`, `ng-024-tabs-places-join`, `ng-025-store-read-endpoint`, `ng-026-store-write-endpoint`, `ng-028-saved-page-copy`, `gui02-web-tab-live`, `gui02-web-tab-live-self-test`, `ext-tab-host-live`, `ext-tab-host-live-self-test`, `nav-keys-live`, `nav-keys-live-self-test`, `address-bar-live`, `address-bar-live-self-test`, `site-identity-live`, `site-identity-live-self-test`, `ng-029-setup-restore-activates-mode`, `ng-030-setup-restore-opens-tabs-once`, `ng-031-setup-commands-reachable`, `ng-032-quit-restores-session`, `ng-033-layout-survives-relaunch`, `ng-034-web-tab-history-survives-restart`, `ng-035-custom-mode-saves-layout`, `ng-036-setup-records-dock-layout`, `modes-name-cap-at-input-live`, `ng-037-core-close-quits`, `ng-038-actor-refuses-hostile-senders`, `first-boot-surface-fresh`, `first-boot-surface-carried`, `theia-fresh-clone-build`, `theia-fresh-clone-build-self-test`

## Commands, settings and ids

- `--quick`: runs only the quick tier. The driver header names it as the set that gates a commit.
- `--only <label>`: runs exactly one registry row. An unknown label prints a FAIL line to stderr and exits 1.
- `--gate`: runs the full tier, then applies the known-open exclusions. It cannot be combined with `--quick` or `--only`; the combination exits 1 before any check runs. A red check whose exclusion is keyed on a ledger entry that is not `open` fails `--gate` with `exclusion no longer applies`. At 5571d3d that is the case for all three exclusions (entries 5 and 10 are `fixed`).
- `--build`: runs the Theia build command, `yarn build`, with `$PB_REPO/theia/` as the working directory, inside the Theia Nix dev shell before any check. A failed build exits 1.
- Identifiers: row labels, as listed above, and wrapper function names. A row with arguments must be a `node` or `bash` command, because a bare function name takes none.
- The rule-script table, with purpose and self-test status per command target, is in [Verification rule scripts](verification-rule-scripts.md).

## Limits and rules

Each bullet names the hard rule or shared rule, then the exact registry rows that enforce it, with the tier in parentheses.

- Theia core (hard rule 1). Enforced by: `diff-theia-core` (full).
- Gecko and patch surface (hard rule 2). Enforced by: `check-patch-surface` (quick), `check-patch-surface-brand-values` (quick), `fetch-upstream-self-test` (quick), `verify-upstream-pins` (quick), `ext-tab-host-patch-guards` (quick), `ext-tab-host-patch-guards-self-test` (quick), `apply-patches-self-test` (full).
- Bridge shape (hard rule 3). Enforced by: `gui04-registry-shape` (quick), `gui04-registry-shape-self-test` (quick), `internals-boundary` (quick), `internals-boundary-self-test` (quick), `internals-catalogue` (quick), `ng-039-internals-detects-waivers` (quick), `ng-040-internals-catalogue-lines` (quick), `ng-040-internals-catalogue-lines-self-test` (quick).
- Brand residue (also binding: residual brand scan). Enforced by: `scan-brand-residue` (quick), `scan-brand-residue-self-test` (quick), `branding-preflight` (quick), `verify-manifest-literals` (quick), `verify-trademark-surface` (quick), `verify-rebranding-docs` (quick), `verify-branding-identity-dev` (full), `branding-variant-divergence` (full; its `--gate` exclusion keyed on ledger entry 10 does not apply, because entry 10 is `fixed`).
- Endpoints (also binding: outbound host allowlist). Enforced by: `verify-endpoints` (full; its `--gate` exclusion keyed on ledger entry 5 does not apply, because entry 5 is `fixed`), `theia-endpoints` (quick), `ng069-sidecar-egress` (full).
- User-facing copy (also binding: no internal identifiers). Enforced by: `shell-error-copy-no-internals` (quick), `shell-error-contract` (quick), `shell-diagnostics-rows-populated` (full), `gui08-panorama-copy` (quick), `gui09-setups-copy` (quick).
- Build order (also binding: Theia build). Enforced by: `theia-build-order` (quick), `smoke-theia` (full), `theia-fresh-clone-build` (full).
- Tab store (also binding: single writer of tabs.sqlite). Enforced by: `tab-store-offline` (quick), `sql-store-second-writer` (quick), `sql-store-soak` (quick), `sql-store-roundtrip` (full), `sql-store-absence` (full), `ng-001-one-key-rule` (full), `ng-018-scheduled-integrity-check` (full), `ng-085-quit-closes-store` (full).
- Repo path has no space (hard rule 4). Enforced by: `ng070-no-spaced-name` (quick).
- Stock chrome (hard rule 5). Enforced by: `shell01-theia-is-the-window` (full).

The Theia core row is full-tier, so the quick commit gate does not run it. Three shared rules have no row of their own. They are listed under [Gaps](#gaps).

## Verification

- `$PB_REPO/scripts/verify-platform.sh --quick` runs the quick tier and prints a `verify-platform: summary` block with one `  <label>: PASS` or `  <label>: FAIL` line per row.
- `$PB_REPO/scripts/verify-platform.sh --only gui04-registry-shape` runs one row. Its summary block holds one line, `  gui04-registry-shape: PASS` or `  gui04-registry-shape: FAIL`.
- `$PB_REPO/scripts/verify-platform.sh --only scan-brand-residue` runs one row with the same output form.
- `$PB_REPO/scripts/verify-platform.sh --gate` runs the full tier and applies the known-open exclusions. It prints the commit it ran against first.
- To add a check, append one `"label|command"` row to the registry. A check that needs arguments gets a wrapper function. Give it a self-test row and derive its expectations from the tree.
- The shared rules also require: never assert on the absence of a log line the check emits itself.

## PB docs and deltas

- `$PB_REPO/CLAUDE.md`, `$PB_REPO/README.md`, `$PB_REPO/docs/BUILD.md`, `$PB_REPO/docs/RELEASING.md`, `$PB_REPO/docs/REBRANDING.md` and the files under `$PB_REPO/docs/non-gui/` each name the driver. They were not compared with the registry in this pass (see Unsettled items).
- The driver header names four deleted per-phase drivers as provenance. They are not live and have no rows.

## Gaps

- GAP: Theia DI bindings that are static at module load have no check in PB. Checked: registry labels matched on `bind`, `inversify`, `di-` and `-di`; the only match is `side01-bind-scope`, a backend bind-address check.
- GAP: builds that run inside the Nix dev shells have no check in PB. Checked: registry labels matched on `nix`, `flake`, `devshell` and `shell-dev`; no match.
- GAP: a check that PB has one verification driver has no row in PB. Checked: registry labels matched on `driver`, `sibling` and `registry`; no match. The only `registry` matches are the bridge-shape rows.

## Unsettled items

- UNVERIFIED: the live tier outputs were not sampled. Verify: run `"$PB_REPO"/scripts/verify-platform.sh --quick` on a clean checkout and compare each summary line with the labels above.
- UNVERIFIED: the CI workflow runs the quick tier on push and pull request. Its file is not in Source files, so drift does not watch it. Verify: `git --no-optional-locks -C "$PB_REPO" show HEAD:.github/workflows/verify.yml` and read the step that runs the driver with `--quick`.
- UNVERIFIED: the PB docs that name the driver were not compared with the registry. Verify: `git --no-optional-locks -C "$PB_REPO" grep -n verify-platform HEAD -- docs` and compare each named row with the labels above.
- UNVERIFIED: the hard rule 5 row relies on a static forbidden-element list in the SHELL-01 generator block, and its runtime half was not run. Verify: `grep -n forbidden "$PB_REPO/scripts/verify-platform.sh"` and `"$PB_REPO"/scripts/verify-platform.sh --only shell01-theia-is-the-window` on a full tree.
- UNVERIFIED: ledger entries 5 and 10 are `fixed` at 5571d3d, as in the JSON block of `$PB_REPO/.planning/WINDOWS.md`. That status comes from a planning file only. Verify: `git --no-optional-locks -C "$PB_REPO" show 5571d3d:.planning/WINDOWS.md` and read the JSON block.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
