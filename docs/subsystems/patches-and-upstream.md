# Patches and upstream

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/patches/`
- `$PB_REPO/scripts/fetch-upstream.sh`
- `$PB_REPO/scripts/apply-patches.sh`
- `$PB_REPO/scripts/rebase-upstream.sh`
- `$PB_REPO/scripts/check-patch-surface.sh`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/scripts/verify-upstream-pins.mjs`
- `$PB_REPO/scripts/verify-ext-tab-host-patch-guards.mjs`
- `$PB_REPO/configuration.toml`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/docs/BUILD.md`
- `$PB_REPO/powerbrowser/INTERNAL-APIS.md`
- `$PB_REPO/.gitignore`

Not read:
- NOT COVERED: `$PB_REPO/upstream/`
- NOT COVERED: `$PB_REPO/generated/`
- NOT COVERED: `$PB_REPO/objdir/`
- NOT COVERED: `$PB_REPO/objdir-release/`
- NOT COVERED: `$PB_REPO/.mozbuild/`

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

PB files read for this doc: `$PB_REPO/patches/` (all five patches), `$PB_REPO/scripts/verify-ext-tab-host-patch-guards.mjs` (the logic-patch set rule), `scripts/fetch-upstream.sh` (`TAG`, `PINS_FRAGMENT`, `classify_upstream_dirt`, `patch_touched_paths`), `scripts/apply-patches.sh` (`apply_patch_with_assertion`), `scripts/rebase-upstream.sh`, `scripts/check-patch-surface.sh` (`scan_patch_surface`, `scan_brand_values`), `scripts/verify-platform.sh` (patch/upstream rows), `scripts/verify-upstream-pins.mjs`, `$PB_REPO/configuration.toml` (`upstreams` table), `scripts/generate.mjs` (`emitUpstreamPins`), `docs/BUILD.md` (Firefox half, rebase procedure), `$PB_REPO/powerbrowser/INTERNAL-APIS.md` (touchpoint catalogue boundary), `.gitignore` (`$PB_REPO/upstream/`, `$PB_REPO/generated/` ignored). Not read: the gitignored `$PB_REPO/upstream/` checkout, `$PB_REPO/generated/` contents, and build outputs; no live fetch, apply, or rebase was run.

## What it is

- PB is a patch-set repo, not a Firefox fork: an unmodified `$PB_REPO/upstream/` ESR checkout, five patches in `$PB_REPO/patches/`, and PB's own tree. See [PowerBrowser conflicts register](../CONFLICTS.md#cf-01).
- `$PB_REPO/upstream/` is fully disposable. `$PB_REPO/patches/` is the single source of truth for every Gecko change.
- Patches carry hooks, never values: patches `010` to `040` each add an include, a `DIRS` entry, or a certificate path, and the brand and config values live under `$PB_REPO/generated/`.
- The one exception is the logic patch. A logic patch changes JavaScript behaviour that chrome code cannot reach. Its rule is in `$PB_REPO/docs/BUILD.md`, section "Logic patches (D-74 as amended 2026-10-21)". The logic-patch set is every patch whose `+++ b/` target ends in `.js` or `.mjs`, derived by `$PB_REPO/scripts/verify-ext-tab-host-patch-guards.mjs` and compared with the bullets under that BUILD.md heading. The brand-value scan (`scan_brand_values`) still applies to logic patches.
- Patches are regenerated, never text-edited. To change a patch, change the patched tree and regenerate the patch file.

## Where its data lives

- `$PB_REPO/patches/`: `010-powerbrowser-identity.patch` (identity.configure include hook, fixed telemetry-policy lines, stock app-ID context), `020-powerbrowser-shell.patch` (`DIRS` hook for `$PB_REPO/powerbrowser/shell/`), `030-powerbrowser-mar-certificates.patch` (MAR primary certificate fork key), `040-powerbrowser-nsis.patch` (installer defines and no-ping change).
- `$PB_REPO/patches/050-extension-tab-host.patch` (logic patch, JavaScript only, no brand values): opens the extension window tracker to tab host windows, adds null and zero-tab checks where the code expects a tabbrowser window, and skips toolbar, page-action and menu wiring for tab host windows. `WindowTrackerBase.isTabHostWindow` admits a window whose document element carries the `extensiontabhost` attribute. The patch touches the parent-process extension scripts `ext-browser.js`, `ext-tabs.js`, `ext-tabs-base.js`, `ext-browserAction.js`, `ext-pageAction.js`, `ext-menus.js`, `ext-sessions.js` and `ext-sidebarAction.js`, plus `remote/shared/TabManager.sys.mjs` and `ExtensionShortcuts.sys.mjs`.
- `$PB_REPO/upstream/`: the gitignored ESR checkout at the pinned tag (the upstream/ line in `$PB_REPO/.gitignore`). Never hand-edited.
- Setup symlinks: `$PB_REPO/upstream/powerbrowser` resolves to `$PB_REPO/powerbrowser`, and `$PB_REPO/upstream/identity.configure` resolves to the generated carrier. Both are git-excluded setup state, created by `ensure_branding_overlay` in `$PB_REPO/scripts/fetch-upstream.sh`.
- `$PB_REPO/generated/upstream-pins.env`: the gitignored pin fragment (`FIREFOX_ESR_TAG=<tag>`), emitted by `emitUpstreamPins` in `$PB_REPO/scripts/generate.mjs`. The fetch script sources it as its default tag.
- `$PB_REPO/configuration.toml`: the `[upstreams]` table declares `firefox_esr_tag` once; every consumer reads that declaration.

## Access matrix

| Layer | Read | Write | API |
| --- | --- | --- | --- |
| Agent reader | `$PB_REPO/patches/`, fetch/apply/rebase scripts | none | `patch_touched_paths`, `apply_patch_with_assertion` in `$PB_REPO/scripts/apply-patches.sh` |
| Fetch | pin fragment or `TAG` export | `$PB_REPO/upstream/` (clone or verify) | `classify_upstream_dirt` in `$PB_REPO/scripts/fetch-upstream.sh` |
| Apply | `$PB_REPO/patches/` | `$PB_REPO/upstream/` (3-way replay) | `apply_patch_with_assertion` in `$PB_REPO/scripts/apply-patches.sh` |
| Rebase | remote tags, patch stack | `$PB_REPO/upstream/` (remove and re-materialize) | `scripts/rebase-upstream.sh --tag <TAG> [--dry-run]` |
| Verifier | `$PB_REPO/patches/`, manifest, fragment | none | `fetch-upstream-self-test`, `apply-patches-self-test`, `check-patch-surface`, `verify-upstream-pins` rows in `$PB_REPO/scripts/verify-platform.sh` |

## APIs by layer

- `patch_touched_paths` in `$PB_REPO/scripts/fetch-upstream.sh`: the sorted set of paths every patch's `+++ b/` header names. The dirt classifier derives its expectation from the patches themselves, never from a kept list.
- `classify_upstream_dirt` in `$PB_REPO/scripts/fetch-upstream.sh`: gates on unexpected changes only. Pristine (nothing dirty) and fully-applied (dirty in exactly the patch-touched set) pass; unaccounted dirt and clean patch targets fail naming the path and the remediation.
- `PINS_FRAGMENT` in `$PB_REPO/scripts/fetch-upstream.sh`: the `$PB_REPO/generated/upstream-pins.env` default. With no `TAG` export and no fragment, the fetch fails naming `node scripts/generate.mjs`. An explicit `TAG` export overrides the pin read from `FIREFOX_ESR_TAG`, which is how the rebase drives a tag that is not the pin.
- `apply_patch_with_assertion` in `$PB_REPO/scripts/apply-patches.sh`: replays one patch with `git apply --3way`, then compares before/after blob hashes over every path the patch touches. A real conflict and a silent no-op both fail naming the patch; only a non-vacuous apply passes.
- `scripts/rebase-upstream.sh --tag <TAG> [--dry-run]`: the one documented command that moves the checkout onto a new ESR tag. It validates the tag name, confirms it on the remote, re-materializes, replays, checks the surface, scans brand residue, re-checks fully-applied state, and asserts the overlays. `--dry-run` prints the plan without touching `$PB_REPO/upstream/`.
- `scan_patch_surface` in `$PB_REPO/scripts/check-patch-surface.sh`: the compiled-suffix scan. Any patch target with a compiled suffix from the mozbuild emitter set fails; an empty patch stack fails.
- `scan_brand_values` in `$PB_REPO/scripts/check-patch-surface.sh`: the brand-value scan. Added lines carrying a required `[identity]`, `[product]`, or `[legal]` string (derived from `$PB_REPO/configuration.toml` through `keys` in `$PB_REPO/scripts/lib/config-schema.json`) fail naming the patch and the value. Context lines and `+++` headers are never read.
- `verify-upstream-pins` rows in `$PB_REPO/scripts/verify-platform.sh`: the pin-agreement gate. The manifest tag must equal the fragment, the rebase workflow mirror, and the fetch default, with no second tag literal in scope; every `@theia/*` pin and lockfile stanza must equal the manifest Theia triple.

## Events and change signals

- `fetch-upstream: pristine` means the checkout needs no work; `fully-applied` means the dirt matches the patch stack exactly. Any other result names the unaccounted path or the clean patch and the fix.
- `apply-patches: all <N> patches applied and verified non-vacuous` means the replay landed. A `FAIL` names the patch and whether it conflicted or changed nothing.
- `rebase-upstream: PASS` means the checkout was re-materialized at the new tag, the stack replayed non-vacuously, the surface scans passed, and the overlays resolve. The operator follow-up is `scripts/toolchain-baseline.sh` under `nix develop .#firefox`, diffed against `$PB_REPO/toolchain-baseline.txt`.
- A patch that upstream silently adopted fails the replay instead of passing silently: the before/after hash comparison catches the no-op.

## Commands, settings and ids

- Materialize upstream: `scripts/fetch-upstream.sh` from the repo root (needs only `git`). Safely re-runnable: an existing checkout at the pinned tag is verified instead of re-cloned.
- Replay the stack: `scripts/apply-patches.sh`. Re-runnable by rejection: a second run over an applied stack fails by patch name.
- Move to a new tag: `scripts/rebase-upstream.sh --tag <TAG> [--dry-run]`. The tag must be a plain tag name; existence is checked on the remote before anything is removed.
- Override the pin for one run: `TAG=<tag> scripts/fetch-upstream.sh`. With no override, the fragment default applies.
- The pin declaration: `upstreams.firefox_esr_tag` in `$PB_REPO/configuration.toml`. Edit the value, run `node scripts/generate.mjs`, and the fragment, the fetch default, and the rebase mirror follow.
- `$PB_REPO/upstream/` is never hand-edited; Gecko changes go only through `$PB_REPO/patches/`.

## Limits and rules

- Never hand-edit `$PB_REPO/upstream/`. Firefox internals are reached only through `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, and every touchpoint is catalogued in `$PB_REPO/powerbrowser/INTERNAL-APIS.md`. The classifier fails any dirt no patch accounts for.
- Never text-edit a patch: regenerate it from a patched tree. The surface scan fails any patch that targets a compiled path or carries a brand value.
- The rebase always runs the residual-brand scan with no exception: a patch that replays cleanly can still reintroduce a stale brand string, and `$PB_REPO/upstream/` is invisible to `git ls-files`.
- `$PB_REPO/upstream/`, `$PB_REPO/generated/`, and `objdir/` are gitignored. Verify rows read `$PB_REPO/patches/` and the manifest, not the ignored trees, except where a row explicitly reaches the replayed tree from the filesystem.
- ESR re-pin is a PB core change: it needs the user's approval first, a full `verify-platform.sh` pass, and the toolchain-baseline diff.

## Verification

- `scripts/verify-platform.sh --only fetch-upstream-self-test` proves the classifier passes pristine and fully-applied trees and fails unaccounted dirt and missing patches naming the file.
- `scripts/verify-platform.sh --only apply-patches-self-test` proves the replay assertion goes red on an already-applied patch and on conflict-drifted content, naming the patch.
- `scripts/verify-platform.sh --only check-patch-surface` and `--only check-patch-surface-brand-values` prove the compiled-suffix and brand-value scans discriminate, with the shipped stack as the clean control.
- `scripts/verify-platform.sh --only verify-upstream-pins` proves the manifest-to-fragment, workflow-mirror, fetch-default, and no-second-literal agreement in both directions.
- `scripts/verify-platform.sh --only ext-tab-host-patch-guards` (and its `ext-tab-host-patch-guards-self-test` row) checks that each guard of patch `050` is present in its exact shape at its site, and that the logic-patch set equals the BUILD.md bullets.
- `scripts/rebase-upstream.sh --tag <TAG> --dry-run` prints the rebase plan without touching the checkout; its printed text is the artifact under local test.

## PB docs and deltas

- `$PB_REPO/docs/BUILD.md`: agrees. The Firefox half (fetch, generate, configure, build, run), the rebase runbook, and the tiered rebuild loop are the full procedures; this doc links to them instead of restating them.
- `$PB_REPO/powerbrowser/INTERNAL-APIS.md`: the touchpoint catalogue the bridge boundary owns; this doc cites it for the never-hand-edit rule and does not restate it.
- `$PB_REPO/configuration.toml` is the single pin declaration; `$PB_REPO/scripts/generate.mjs` is the single fragment emitter. No second copy lives anywhere else in the tree.
- The patch-set rule and the schema-key rule live in [PowerBrowser conflicts register](../CONFLICTS.md#cf-01) and [PowerBrowser conflicts register](../CONFLICTS.md#cf-09); this doc follows them and does not restate them.

## Gaps

- No known gaps: every patch-stack capability this phase searched for exists in the fetch, apply, rebase, and surface-scan scripts above. Checked: the `--3way` replay path, the classifier states, the `--dry-run` plan, the `--brand-values` scan, and the `--self-test` controls.

## Unsettled items

- None: every patch-stack claim above was read in the five patch files, the scripts, `$PB_REPO/configuration.toml`, or `$PB_REPO/docs/BUILD.md` at the stamp.

## Recipes that touch this

No recipes yet; the change-a-patch and re-pin ESR core recipes land in Phase 17.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
