# Verification rule scripts

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/scripts/scan-brand-residue.mjs`
- `$PB_REPO/scripts/check-internals-boundary.sh`
- `$PB_REPO/scripts/verify-registry-shape.mjs`
- `$PB_REPO/scripts/verify-endpoints.sh`
- `$PB_REPO/scripts/verify-telemetry.mjs`
- `$PB_REPO/scripts/verify-site-identity.mjs`
- `$PB_REPO/scripts/verify-ext-tab-host-patch-guards.mjs`
- `$PB_REPO/scripts/verify-ext-tab-host-scope.mjs`
- `$PB_REPO/scripts/verify-ext-tab-host-live.mjs`
- `$PB_REPO/scripts/verify-site-identity-live.mjs`

Not read:
- NOT COVERED: the rule scripts in `$PB_REPO/scripts/` other than the scripts named above. Their rows below come from the registry comment or the row label only. The four `verify-ext-tab-host-*` and `verify-site-identity-live` scripts were read at their header comments only.
- NOT COVERED: live behavior. No row was run, so no self-test was run and no purpose was checked against a run.

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

This file is the rule-script table for [Verification](verification.md). The driver, its flags, the tier split and the label enumeration are in that file.

## Table rules

- Each row is one distinct command target: the script path that follows `node` or `bash` in a registry command, or a bare wrapper function name.
- A wrapper function and its `_self_test` twin share one row.
- The Script cell names the script path under `$PB_REPO`, or a wrapper function defined in `$PB_REPO/scripts/verify-platform.sh`. The generated Theia runner has no tracked path, so its row names the driver.
- The `--self-test` cell is `yes` when a registry row runs the same target with a self-test flag (`--self-test`, `--self-test-brand` or `--interrupt-self-test`) or the wrapper has a `_self_test` twin. Otherwise it is `no`. The value comes from the registry only. No self-test was run.
- The Purpose cell is the registry comment above the target's first row. The spot-read scripts take their purpose from their own header. A target with no comment takes a short paraphrase of its row label, which restates the label and adds no claim.
- The table holds 181 targets: 85 with `yes` and 96 with `no`. Three bare `_self_test` wrappers (`check_allowlist_doc_consistency_self_test`, `check_branding_variant_divergence_self_test`, `check_verify_downstream_fixtures_self_test`) are the twins of their base wrappers and add no row.

## Rule-script table

| Script | Purpose | --self-test |
| --- | --- | --- |
| `$PB_REPO/scripts/scan-brand-residue.mjs` | residual brand token scan over tracked files | yes |
| `$PB_REPO/scripts/verify-branding-preflight.mjs` | branding values preflight | yes |
| `$PB_REPO/scripts/verify-manifest-literals.mjs` | manifest display strings guard | yes |
| `$PB_REPO/scripts/verify-trademark-surface.mjs` | trademark surface over tracked assets | yes |
| `$PB_REPO/scripts/verify-rebranding-docs.mjs` | rebranding doc coverage | yes |
| `$PB_REPO/scripts/check-patch-surface.sh` | patch surface and brand-value guard | yes |
| `$PB_REPO/scripts/verify-ext-tab-host-patch-guards.mjs` | patch 050 guard shape and logic-patch list (EXT-05) | yes |
| `$PB_REPO/scripts/verify-ext-tab-host-scope.mjs` | extension tab host scope: consumers, Theia-frame exclusion, scheme wall, window type (EXT-05) | yes |
| `$PB_REPO/scripts/fetch-upstream.sh` | upstream fetch script self-test | yes |
| `$PB_REPO/scripts/verify-upstream-pins.mjs` | ESR pin agreement across configuration and scripts | yes |
| `check_allowlist_schema` | endpoint allowlist schema | no |
| `check_allowlist_doc_consistency` | allowlist doc agreement | yes |
| `check_branding_variant_divergence` | branding variant divergence probe | yes |
| `$PB_REPO/scripts/check-internals-boundary.sh` | Firefox internals boundary guard, plus catalogue mode | yes |
| `$PB_REPO/scripts/verify-ng-039-internals-waivers.mjs` | uncatalogued internals detection | no |
| `$PB_REPO/scripts/verify-ng-040-internals-catalogue-lines.mjs` | INTERNAL-APIS.md line references | yes |
| `check_shell_csp_inline_attrs` | shell CSP inline attributes | no |
| `check_shell04_log_redacts_token` | shell log token redaction | no |
| `$PB_REPO/scripts/verify-shell-gbrowser-standin.mjs` | gBrowser stand-in shape | yes |
| `$PB_REPO/scripts/verify-registry-shape.mjs` | TabUriRegistry exported shape | yes |
| `$PB_REPO/scripts/verify-chrome-bar-commands.mjs` | chrome bar command set equality | yes |
| `$PB_REPO/scripts/verify-shortcut-relay.mjs` | page-key table and relay agreement | yes |
| `$PB_REPO/scripts/verify-chrome-bar-suggestions.mjs` | chrome bar suggestion search | yes |
| `$PB_REPO/scripts/verify-address-bar-rows.mjs` | address bar rows module | yes |
| `$PB_REPO/scripts/verify-address-bar-modes.mjs` | address bar mode table | yes |
| `$PB_REPO/scripts/verify-site-identity.mjs` | site-identity static gate: table compared with the tree | yes |
| `$PB_REPO/scripts/verify-chrome-bar-placement.mjs` | chrome bar placement order | yes |
| `$PB_REPO/scripts/verify-web-tab-bridge.mjs` | web tab bridge contract | yes |
| `$PB_REPO/scripts/verify-token-cookie-strip.mjs` | token cookie stripped on other loopback ports | yes |
| `$PB_REPO/scripts/verify-group-channel.mjs` | PowerBrowserGroup channel static contract | yes |
| `$PB_REPO/scripts/verify-strip-spike-verdict.mjs` | strip spike verdict record | yes |
| `$PB_REPO/scripts/verify-mode-toggle-commands.mjs` | shipped mode defaults and commands | yes |
| `$PB_REPO/scripts/verify-mode-switch-tabs-invariant.mjs` | mode switch tabs invariant (text) | yes |
| `$PB_REPO/scripts/verify-panel-motion.mjs` | side panel motion against UI spec | yes |
| `$PB_REPO/scripts/verify-setup-roundtrip.mjs` | setups schema and command roundtrip | yes |
| `$PB_REPO/scripts/verify-name-cap-at-input.mjs` | name field cap at input | yes |
| `$PB_REPO/scripts/verify-dependent-window-content.mjs` | dependent window content and copy | yes |
| `$PB_REPO/scripts/verify-gui08-persistence-roundtrip.mjs` | groups persistence roundtrip | yes |
| `$PB_REPO/scripts/verify-ng-016-gui08-persistence-at-head.mjs` | persistence roundtrip green at head | no |
| `$PB_REPO/scripts/verify-ng-019-tab-store-doc.mjs` | tab store doc agreement | no |
| `$PB_REPO/scripts/verify-ng-020-absence-wiring-by-call.mjs` | absence wiring by call | no |
| `$PB_REPO/scripts/verify-ng-087-loose-position-across-restart.mjs` | loose card position across restart | yes |
| `$PB_REPO/scripts/verify-ng-088-group-order-across-restart.mjs` | group order across restart | yes |
| `$PB_REPO/scripts/verify-tab-store-offline.mjs` | tab store writer offline under node:sqlite | no |
| `$PB_REPO/scripts/verify-gui08-canvas-geometry.mjs` | canvas geometry against UI spec | yes |
| `$PB_REPO/scripts/verify-gui08-view-parity.mjs` | single-model view parity | yes |
| `$PB_REPO/scripts/verify-gui08-close-exactness.mjs` | deferred close exactness | yes |
| `$PB_REPO/scripts/verify-gui08-panorama-copy.mjs` | panorama copy against UI spec | yes |
| `$PB_REPO/scripts/verify-gui09-setups-copy.mjs` | setups copy and failure strings | yes |
| `$PB_REPO/scripts/verify-theia-build-order.mjs` | Theia extension build order | yes |
| `$PB_REPO/scripts/verify-shell-error-copy.mjs` | user-facing error copy has no internals | yes |
| `$PB_REPO/scripts/verify-start-path-recovery.mjs` | start path recovery contract, static half | yes |
| `$PB_REPO/scripts/verify-shell-error-contract.mjs` | error state repaint contract | yes |
| `$PB_REPO/scripts/verify-about-dialog-suppression.mjs` | About dialog suppression selector | yes |
| `$PB_REPO/scripts/verify-generated-identity.mjs` | generated output byte identity | yes |
| `$PB_REPO/scripts/generate.mjs` | generator check and self-test | yes |
| `$PB_REPO/scripts/verify-branding-agreement.mjs` | generated branding directory completeness | yes |
| `$PB_REPO/scripts/verify-icon-ihdr.mjs` | icon raster and container structure | yes |
| `$PB_REPO/scripts/verify-installer-schema.mjs` | installer fragment schema | yes |
| `$PB_REPO/scripts/verify-vendored-parser.mjs` | vendored settings parser digest | yes |
| `$PB_REPO/scripts/verify-extension-pins.mjs` | declared extension pins reach sidecar | yes |
| `$PB_REPO/scripts/verify-telemetry.mjs` | telemetry block and sender suite | yes |
| `$PB_REPO/scripts/verify-theia-branding.mjs` | Theia branding values and mark | yes |
| `$PB_REPO/scripts/verify-theia-endpoints.mjs` | endpoint allowlist coverage for manifest hosts | yes |
| `check_verify_downstream_fixtures` | downstream fixture proof | yes |
| `$PB_REPO/scripts/verify-mar-update-hop.mjs` | self-hosted MAR update hop proof | yes |
| `$PB_REPO/scripts/verify-installer-build-proof.mjs` | installer build proof inputs | yes |
| `$PB_REPO/scripts/verify-crash-collector.mjs` | crash collector protocol contract | yes |
| `$PB_REPO/scripts/verify-ng-068-crash-extra-part.mjs` | crash extra part | no |
| `$PB_REPO/scripts/verify-ng-070-no-spaced-name.mjs` | repo path contains no space | yes |
| `$PB_REPO/scripts/verify-ng-074-ci-main.mjs` | main branch CI green | yes |
| `$PB_REPO/scripts/verify-ng-089-uat-sheets.mjs` | UAT sheet result check | yes |
| `$PB_REPO/scripts/verify-webextensions.mjs` | WebExtensions declarations reach policy engine | yes |
| `$PB_REPO/scripts/verify-search-engines.mjs` | search engines reach policy engine | yes |
| `$PB_REPO/scripts/verify-sql-store-second-writer.mjs` | second writer scan, static half | yes |
| `$PB_REPO/scripts/verify-sql-store-soak.mjs` | tab store soak, static half | yes |
| `$PB_REPO/scripts/verify-backend-env-readers.mjs` | backend environment readers | yes |
| `$PB_REPO/scripts/verify-ng-027-reader-callers.mjs` | every reader has a runtime caller | yes |
| `check_tab_uris_typecheck` | tab-uris typecheck | no |
| `check_chrome_bar_typecheck` | chrome-bar typecheck | no |
| `$PB_REPO/scripts/verify-first-boot-surface.mjs` | first-boot check against planted faults | yes |
| `$PB_REPO/scripts/verify-single-copy-deps.mjs` | one installed copy of React and Inversify | yes |
| `$PB_REPO/scripts/verify-ng-086-theia-react-node.mjs` | installed Theia closure equals pinned release | yes |
| `$PB_REPO/scripts/verify-node-major-agreement.mjs` | Node major agreement across pins | yes |
| `$PB_REPO/scripts/verify-planning-paths.mjs` | planning-path literals resolve in tracked files | yes |
| `$PB_REPO/scripts/smoke-theia.sh` | Theia smoke boot | no |
| `check_diff_theia_core` | Theia core diff | no |
| `check_verify_branding` | live branding check | no |
| `check_verify_customize_inert` | customize CSS inert check | no |
| `check_verify_dev_flag_off` | dev flag off check | no |
| `check_verify_uri_roundtrip` | tab URI roundtrip in built app | no |
| `check_desktop_entry_quick` | desktop entry check | no |
| `$PB_REPO/scripts/apply-patches.sh` | patch apply self-test | yes |
| `$PB_REPO/scripts/verify-branding-identity.mjs` | branding identity across build variants | no |
| `$PB_REPO/scripts/smoke-firefox.sh` | Gecko smoke boot | no |
| `$PB_REPO/scripts/verify-endpoints.sh` | endpoint egress layers | yes |
| `$PB_REPO/scripts/verify-ng-063-packaged-launch.mjs` | packaged launch | no |
| `$PB_REPO/scripts/verify-ng-064-update-url.mjs` | update URL from manifest | no |
| `$PB_REPO/scripts/verify-ng-065-mar-signature.mjs` | MAR signature enforcement | no |
| `$PB_REPO/scripts/verify-ng-066-nsis-branding.mjs` | installer branding without ping | no |
| `$PB_REPO/scripts/verify-ng-067-frontend-errors.mjs` | frontend errors reach telemetry | no |
| `$PB_REPO/scripts/verify-ng-069-sidecar-egress.mjs` | sidecar egress | no |
| `$PB_REPO/scripts/verify-ng-071-tarball-extensions.mjs` | tarball extension build | no |
| `$PB_REPO/scripts/verify-ng-072-policies-webextension.mjs` | packaged policy WebExtension | no |
| `$PB_REPO/scripts/verify-search-engines-packaged.mjs` | packaged search engines match config | no |
| `$PB_REPO/scripts/verify-ng-073-declared-extension-loads.mjs` | declared extension loads | no |
| `check_side02_token_negative` | token negative path | no |
| `check_side02_token_positive` | token positive path | no |
| `check_side02_index_gated` | index gated path | no |
| `check_side01_bind_scope` | backend bind scope | no |
| `$PB_REPO/scripts/verify-platform.sh` | generated Theia shell runner, SHELL-01 block | no |
| `check_shell05_paint_before_backend` | shell paints before backend | no |
| `check_side03_kill_and_recover` | sidecar kill and recover | no |
| `check_side04_sigkill_no_orphan` | no orphan after SIGKILL | no |
| `check_side04_unsupervised_backend_survives` | unsupervised backend survives | no |
| `check_side04_leftover_reaped` | leftover backend reaped | no |
| `check_side04_stale_identity_not_signalled` | stale identity not signalled | no |
| `check_harness_display_available` | display available to harness | no |
| `check_shell03_unrecoverable_immediate_error` | unrecoverable error shown at once | no |
| `check_shell03_budget_exhausted_error` | error after restart budget exhausted | no |
| `check_shell03_auto_dismiss_on_selfheal` | error dismissed on self-heal | no |
| `check_shell04_diagnostics_with_backend_down` | diagnostics with backend down | no |
| `check_health_gate_recovery_swaps` | recovery swaps on failing branch | no |
| `check_start_failure_shows_error` | start failure shows error | no |
| `check_shell_diagnostics_rows_populated` | diagnostics rows populated | no |
| `check_side05_second_launch_focuses` | second launch focuses existing window | no |
| `check_side05_no_second_backend` | no second backend on second launch | no |
| `check_cr01_different_profile_backend_survives` | backend survives profile change | no |
| `check_side04_token_not_in_environment` | token not in environment | no |
| `check_gui01_single_shell_window` | single shell window, three checks | no |
| `$PB_REPO/scripts/verify-gui01-window.mjs` | window composition and browser close | no |
| `check_gui01_command_registered` | window command registered | no |
| `$PB_REPO/scripts/verify-sql-store-roundtrip.mjs` | tab store roundtrip | yes |
| `$PB_REPO/scripts/verify-sql-store-absence.mjs` | tab store absence | yes |
| `$PB_REPO/scripts/verify-ng-001-one-key-rule.mjs` | one key rule, live | no |
| `$PB_REPO/scripts/verify-ng-002-navigation-keeps-row.mjs` | navigation keeps row, live | no |
| `$PB_REPO/scripts/verify-ng-003-same-url-two-rows.mjs` | same URL in two rows, live | no |
| `$PB_REPO/scripts/verify-ng-004-new-tab-row-unknown-uri-error.mjs` | unknown URI error on new tab, live | no |
| `$PB_REPO/scripts/verify-ng-005-prune-keeps-open-rows.mjs` | prune keeps open rows, live | no |
| `$PB_REPO/scripts/verify-ng-006-close-group-closes-web-tabs.mjs` | close group closes web tabs, live | no |
| `$PB_REPO/scripts/verify-ng-007-shell-tabs-keep-group-across-restart.mjs` | group kept across restart, live | no |
| `$PB_REPO/scripts/verify-ng-008-panorama-card-reopens-through-opener.mjs` | card reopen through opener, live | no |
| `$PB_REPO/scripts/verify-gui08-loose-cards-live.mjs` | loose cards on Organising canvas, live | no |
| `$PB_REPO/scripts/verify-pan03-strip-group-live.mjs` | strip group filter, live | no |
| `$PB_REPO/scripts/verify-pan04-undo-close-group-live.mjs` | undo close of group, live | no |
| `$PB_REPO/scripts/verify-pan05-card-close-live.mjs` | card close, live | no |
| `$PB_REPO/scripts/verify-ng-009-content-age-columns.mjs` | content age columns, live | no |
| `$PB_REPO/scripts/verify-ng-010-closed-tab-history.mjs` | closed tab history, live | no |
| `$PB_REPO/scripts/verify-ng-011-settings-table-read.mjs` | settings table read, live | no |
| `$PB_REPO/scripts/verify-ng-012-reader-reports-schema-errors.mjs` | reader schema error report, live | no |
| `$PB_REPO/scripts/verify-ng-013-unopenable-store-quarantined.mjs` | unopenable store quarantine, live | no |
| `$PB_REPO/scripts/verify-ng-014-rebuild-at-head.mjs` | store rebuild at head, live | no |
| `$PB_REPO/scripts/verify-ng-015-real-migration-from-every-version.mjs` | migration from every version, live | no |
| `$PB_REPO/scripts/verify-ng-017-sql05-restarts-real-browser.mjs` | store restart in real browser, live | no |
| `$PB_REPO/scripts/verify-ng-018-scheduled-integrity-check.mjs` | scheduled integrity check, live | no |
| `$PB_REPO/scripts/verify-ng-085-quit-closes-store.mjs` | quit closes store, live | no |
| `$PB_REPO/scripts/verify-mode-switch-tabs-live.mjs` | mode switch tabs invariant, behavioural | yes |
| `$PB_REPO/scripts/verify-ng-021-places-reads.mjs` | places reads through actor, live | no |
| `$PB_REPO/scripts/verify-ng-022-sessionstore-projection.mjs` | session store projection through actor, live | no |
| `$PB_REPO/scripts/verify-ng-023-suggestions-places.mjs` | suggestions from history and bookmarks, live | no |
| `$PB_REPO/scripts/verify-ng-024-tabs-places-join.mjs` | tabs and places join, live | no |
| `$PB_REPO/scripts/verify-ng-025-store-read-endpoint.mjs` | store read endpoint, live | no |
| `$PB_REPO/scripts/verify-ng-026-store-write-endpoint.mjs` | store write endpoint, live | no |
| `$PB_REPO/scripts/verify-ng-028-saved-page.mjs` | saved page copy, live | no |
| `$PB_REPO/scripts/verify-web-tab-live.mjs` | web tab behaviour, live | yes |
| `$PB_REPO/scripts/verify-ext-tab-host-live.mjs` | extension sees web tabs as real tabs, live (EXT-05) | yes |
| `$PB_REPO/scripts/verify-nav-keys-live.mjs` | navigation buttons and page keys, live | yes |
| `$PB_REPO/scripts/verify-address-bar-live.mjs` | address bar search and URI fixup, live | yes |
| `$PB_REPO/scripts/verify-site-identity-live.mjs` | site-identity live gate: TLS, panel, clear data, shield, app menu, quit (SITE-01..08), live | yes |
| `$PB_REPO/scripts/verify-ng-029-setup-restore-mode.mjs` | setup restore activates mode, live | no |
| `$PB_REPO/scripts/verify-ng-030-setup-restore-dedup.mjs` | setup restore opens tabs once, live | no |
| `$PB_REPO/scripts/verify-ng-031-setup-commands-reachable.mjs` | setup commands reachable, live | no |
| `$PB_REPO/scripts/verify-ng-032-quit-restores-session.mjs` | quit restores session, live | no |
| `$PB_REPO/scripts/verify-ng-033-layout-survives-relaunch.mjs` | layout survives relaunch, live | no |
| `$PB_REPO/scripts/verify-ng-034-web-tab-history-restart.mjs` | web tab history survives restart, live | no |
| `$PB_REPO/scripts/verify-ng-035-custom-mode-layout.mjs` | custom mode saves layout, live | no |
| `$PB_REPO/scripts/verify-ng-036-setup-dock-layout.mjs` | setup records dock layout, live | no |
| `$PB_REPO/scripts/verify-name-cap-at-input-live.mjs` | name field cap while typing, live | no |
| `$PB_REPO/scripts/verify-ng-037-core-close-quits.mjs` | core window close quits, live | no |
| `$PB_REPO/scripts/verify-ng-038-actor-sender-wall.mjs` | actor refuses hostile senders, live | no |
| `$PB_REPO/scripts/verify-theia-fresh-clone-build.sh` | build from a clean checkout | yes |

## Re-deriving the counts

- Registry rows at 5571d3d: `git --no-optional-locks -C "$PB_REPO" show 5571d3d:scripts/verify-platform.sh | awk '/^run_own_checks\(\) \{/{f=1} f && /^\}/{exit} f' | grep -cE '^ *"[A-Za-z0-9_.-]+\|'` prints 272.
- Quick rows: the same pipeline with `/^  \)$/{exit}` in place of the function-end pattern prints 154. The full-only rows are the rest, 118.
- Distinct targets and self-test status: collapse the rows by command target as described under Table rules. A target is `yes` when one of its rows carries a self-test flag or its wrapper has a `_self_test` twin.

## Unsettled items

- UNVERIFIED: the purposes taken from registry comments were checked against the comment text only, not against a run of the rule. Verify: read the comment above the named row in `$PB_REPO/scripts/verify-platform.sh` at HEAD.
- UNVERIFIED: no self-test row was run, so the claim that a self-test goes red on a planted fault is not confirmed for any row. Verify: `"$PB_REPO"/scripts/verify-platform.sh --only <self-test label>` on a clean checkout, then read the summary line.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
