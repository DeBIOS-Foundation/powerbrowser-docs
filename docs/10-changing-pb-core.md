# Changing PowerBrowser core

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/CLAUDE.md`
- `$PB_REPO/configuration.toml`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/theia/extensions/`
- `$PB_REPO/theia/extensions/customize/src/browser/customize-frontend-module.ts`
- `$PB_REPO/theia/extensions/customize/src/browser/customize-css-contribution.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/powerbrowser/shell/powerbrowser.xhtml`
- `$PB_REPO/powerbrowser/shell/powerbrowser.js`
- `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/patches/`
- `$PB_REPO/inventory/brand-tokens.json`
- `$PB_REPO/powerbrowser/distribution/policies.json`
- `$PB_REPO/powerbrowser/INTERNAL-APIS.md`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/theia/package.json`
- `$PB_REPO/flake.nix`
- `$PB_REPO/docs/BUILD.md`
- `$PB_REPO/docs/TAB-STORE.md`
- `$PB_REPO/.github/workflows/verify.yml`
- `$PB_REPO/.planning/WINDOWS.md`
- `$PB_REPO/scripts/apply-patches.sh`
- `$PB_REPO/scripts/check-internals-boundary.sh`
- `$PB_REPO/scripts/check-patch-surface.sh`
- `$PB_REPO/scripts/diff-theia-core.sh`
- `$PB_REPO/scripts/download-plugins.mjs`
- `$PB_REPO/scripts/verify-extension-pins.mjs`
- `$PB_REPO/scripts/verify-ng-064-update-url.mjs`
- `$PB_REPO/scripts/fetch-upstream.sh`
- `$PB_REPO/scripts/scan-brand-residue.mjs`
- `$PB_REPO/scripts/verify-endpoints.sh`
- `$PB_REPO/scripts/verify-ng-039-internals-waivers.mjs`
- `$PB_REPO/scripts/verify-ng-040-internals-catalogue-lines.mjs`
- `$PB_REPO/scripts/verify-ng-069-sidecar-egress.mjs`
- `$PB_REPO/scripts/verify-ng-070-no-spaced-name.mjs`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/scripts/verify-registry-shape.mjs`
- `$PB_REPO/scripts/verify-shell-error-copy.mjs`
- `$PB_REPO/scripts/verify-sql-store-second-writer.mjs`
- `$PB_REPO/scripts/verify-tab-store-offline.mjs`
- `$PB_REPO/scripts/verify-theia-build-order.mjs`
- `$PB_REPO/scripts/verify-theia-endpoints.mjs`
- `$PB_REPO/scripts/verify-upstream-pins.mjs`
- `$PB_REPO/scripts/verify-web-tab-bridge.mjs`

<!-- BEGIN pb-rules:stop-and-ask -->
> **Stop and ask the user before you:**
>
> - edit any file in PB core (`$PB_REPO`);
> - add AI tools, agents, model providers or MCP config to PB core;
> - ship a pref change, enable `powerbrowserPrivilegedJs`, use experiment APIs, ship an unsigned XPI or enable any remote protocol;
> - add an outbound host (it needs a row in `$PB_REPO/powerbrowser/endpoint-allowlist.json`);
> - file more than 3 doc-gap issues in one session.
<!-- END pb-rules:stop-and-ask -->

**PB hard rules apply.** Read them in [docs/_shared/RULES.md](_shared/RULES.md#hard-rules) before you change anything.

## What this guide covers

- A PB core change is any create, edit or delete of a file under `$PB_REPO`, tracked or ignored. Generated and build output written by a named command is never hand-edited: `$PB_REPO/generated/` is written only by `scripts/generate.mjs`, and `objdir*/` is Gecko build output (see `.gitignore`). `$PB_REPO/upstream/` is never hand-edited: changes reach it only through the patch stack, which is regenerated and never text-edited (hard rule 2; section "Patches are regenerated, never text-edited" of `$PB_REPO/CLAUDE.md`).
- This guide ranks the kinds of change from least to most invasive and states when to ask the user first.
- It maps each hard rule to its guard, lists the companion changes a core change needs, and lists the gates to run before the change is done.
- Step-by-step tasks for specific core changes are in [Recipes](recipes/README.md) and are not repeated here.
- PB facts are cited by path and symbol, and the hard rules are reached through the pointer line, not copied.

## The ladder

Rungs run from least to most invasive. Use the lowest rung that can make the change.

| Rung | Change kind | Edits a PB file | Ask the user first | Recipes |
| --- | --- | --- | --- | --- |
| 1 | Runtime CSS in `customize.css` under `$THEIA_CONFIG_DIR`. The user creates the file; PB never creates it. | No | No, unless a stop-and-ask item applies | [Restyle the shell](recipes/restyle-shell.md) |
| 2 | Config key or pin in `$PB_REPO/configuration.toml`, then the generator run. The same rung covers the endpoint allowlist row that a new host needs. | Yes | Yes | [Add a configuration key](recipes/add-configuration-key.md), [Install a WebExtension](recipes/install-webextension.md), [Pin a VS Code extension](recipes/pin-vscode-extension.md), [Add an outbound host](recipes/add-outbound-host.md) |
| 3 | New `@powerbrowser/*` Theia extension under `$PB_REPO/theia/extensions/`, registered in the app and the build chain. Covers shell commands, panels, backend services, MCP tools and Theia AI tools. An MCP tool that reads or writes Firefox data also needs rung 4 (see [Add an MCP tool](recipes/add-mcp-tool.md)). | Yes | Yes | [Add a shell command](recipes/add-command.md), [Add a shell panel](recipes/add-panel.md), [Add a backend service](recipes/add-backend-service.md), [Add an MCP tool](recipes/add-mcp-tool.md), [Add a Theia AI tool](recipes/add-theia-ai-tool.md) |
| 4 | New bridge message `kind` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`. | Yes | Yes | [Add a bridge kind](recipes/add-bridge-kind.md) |
| 5 | Gecko patch in `$PB_REPO/patches/`, regenerated from a patched tree. Last resort. | Yes | Yes, and say why rungs 1 to 4 cannot do the change | [Change a patch](recipes/change-a-patch.md) |

- Rung 1 edits no file under `$PB_REPO`, so the approval rule does not apply to it. customize.js is not rung 1: it is bound only when the build-time flag `powerbrowserPrivilegedJs` is true (cite it as `powerbrowserPrivilegedJs` in `$PB_REPO/theia/extensions/customize/src/browser/customize-frontend-module.ts`), so turning it on is a PB core change.
- Rung 2 recipes that change a configuration key run the generator after the edit: `nix develop .#theia --command node scripts/generate.mjs`, run from `$PB_REPO`. Never run it with bare node on the host.
- Rung 3 and rung 4 each need the same registration and verify companions. The companion changes are listed in the coupling checklist of this guide.
- Rung 4 is the only rung that adds a bridge capability to the Theia frontend. Rung 5 adds Gecko behavior through the patch stack. Its steps are PB core edits and are labelled as such in the recipe [Add a bridge kind](recipes/add-bridge-kind.md).
- Rung 5 changes the Gecko tree through the patch stack only. The hard rule that Gecko is never hand-edited applies (see the hard-rules pointer line above).
- The shell window is not a rung. `$PB_REPO/powerbrowser/shell/powerbrowser.xhtml`, `powerbrowser.js` and `TheiaService.sys.mjs` are not covered by any rung above. Stop and ask the user before you edit any of them. Hard rule 5 refuses a new tab strip, toolbar, address bar or menu of PB's own in the shell window. Before you change `getTabForBrowser` in `powerbrowser.js`, read [CF-07](CONFLICTS.md#cf-07). The stock-popup clarification in [CF-08](CONFLICTS.md#cf-08) is UNVERIFIED: it does not permit new shell-window chrome. Guard: `shell01-theia-is-the-window` (full tier), whose static check covers four tokens only (see [Gaps](#gaps)).

## Approval rules

- Before the first edit to any file under `$PB_REPO`, tracked or ignored, ask the user. Rungs 2 to 5 always edit one. The question names the rung, the files to change, and the companion changes from the coupling checklist of this guide.
- Rung 1 edits no tracked PB file. The approval rule does not apply to it. The [stop-and-ask items](_shared/RULES.md#stop-and-ask) still apply: a pref change, enabling `powerbrowserPrivilegedJs`, experiment APIs, an unsigned XPI, any remote protocol, an outbound host, or a fourth doc-gap issue in one session.
- Use the lowest rung that can make the change. When the change needs a higher rung, the question says why the rung below cannot do it.
- AI tools, agents, model providers and MCP configuration go into PB core only with the user's approval, at any rung.
- A new outbound host needs the user's approval and an allowlist row in `$PB_REPO/powerbrowser/endpoint-allowlist.json`.
- Rung 5 is the last resort. The question names the Gecko behavior that rungs 1 to 4 cannot reach.
- Without approval, stop. Report the rung and the change you would make. Do not edit any file under `$PB_REPO`.
- The stop-and-ask items are this repo's policy. PB defines none of them.
- When this guide and PB source disagree, PB source wins (see [Source precedence](CONVENTIONS.md#source-precedence)). Record the disagreement as described in the [PowerBrowser conflicts register](CONFLICTS.md).
- The coupling checklist for each kind of change is in [Change X, also change Y](#change-x-also-change-y), and the gates to run before a change is done are in [Gate list](#gate-list).

## Hard-rule guard map

The rows name the registry labels that enforce each rule. The labels are the ones in `$PB_REPO/scripts/verify-platform.sh` at the stamp commit, and the tier in parentheses is the tier of the row at that commit.

| Rule | Registry rows | Rule script | Verdict |
| --- | --- | --- | --- |
| Hard rule 1: never fork or patch Theia core | `diff-theia-core` (full) | `$PB_REPO/scripts/diff-theia-core.sh` | Guarded; no self-test row |
| Hard rule 2, patch stack: Gecko changes only as patches in the patch stack | `check-patch-surface` (quick), `check-patch-surface-brand-values` (quick), `fetch-upstream-self-test` (quick), `verify-upstream-pins` (quick), `apply-patches-self-test` (full) | `$PB_REPO/scripts/check-patch-surface.sh`, `$PB_REPO/scripts/apply-patches.sh`, `$PB_REPO/scripts/verify-upstream-pins.mjs` | Partly guarded: the surface and the mechanism are guarded; regeneration is GAP: see Gaps |
| Hard rule 2, Firefox internals: reached only through the bridge boundary and catalogued | `internals-boundary` (quick), `internals-boundary-self-test` (quick), `internals-catalogue` (quick), `ng-039-internals-detects-waivers` (quick), `ng-040-internals-catalogue-lines` (quick), `ng-040-internals-catalogue-lines-self-test` (quick) | `$PB_REPO/scripts/check-internals-boundary.sh`, `$PB_REPO/scripts/verify-ng-039-internals-waivers.mjs`, `$PB_REPO/scripts/verify-ng-040-internals-catalogue-lines.mjs` | Guarded; `ng-039-internals-detects-waivers` has no self-test row |
| Hard rule 3: design for the bridge, TabUriRegistry shape | `gui04-registry-shape` (quick), `gui04-registry-shape-self-test` (quick) | `$PB_REPO/scripts/verify-registry-shape.mjs` | Guarded |
| Hard rule 4: the repo path has no space character | `ng070-no-spaced-name` (quick), `ng070-no-spaced-name-self-test` (quick) | `$PB_REPO/scripts/verify-ng-070-no-spaced-name.mjs` | Guarded |
| Hard rule 5: Theia is the default GUI; no authored browser chrome | `shell01-theia-is-the-window` (full) | `$PB_REPO/scripts/verify-platform.sh` (generated SHELL-01 runner) | Partly guarded: the static check covers four tokens only; see Gaps |
| Binding: brand residue is named only in the inventory | `scan-brand-residue` (quick), `scan-brand-residue-self-test` (quick), `branding-preflight` (quick), `verify-manifest-literals` (quick), `verify-trademark-surface` (quick), `verify-rebranding-docs` (quick), `verify-branding-identity-dev` (full) | `$PB_REPO/scripts/scan-brand-residue.mjs` | Guarded |
| Binding: each outbound host has an allowlist row | `verify-endpoints` (full), `theia-endpoints` (quick), `ng069-sidecar-egress` (full) | `$PB_REPO/scripts/verify-endpoints.sh`, `$PB_REPO/scripts/verify-theia-endpoints.mjs`, `$PB_REPO/scripts/verify-ng-069-sidecar-egress.mjs` | Guarded; `verify-endpoints` and `ng069-sidecar-egress` are full tier only, and neither has a self-test row (`verify-endpoints` has `verify-endpoints-interrupt-self-test`) |
| Binding: user-facing text carries no internal identifiers | `shell-error-copy-no-internals` (quick), `shell-error-contract` (quick), `gui08-panorama-copy` (quick), `gui09-setups-copy` (quick), `shell-diagnostics-rows-populated` (full) | `$PB_REPO/scripts/verify-shell-error-copy.mjs` | Guarded |
| Binding: tabs.sqlite has one writer, the chrome side | `sql-store-second-writer` (quick), `tab-store-offline` (quick), `sql-store-soak` (quick), `sql-store-roundtrip` (full), `sql-store-absence` (full), `ng-001-one-key-rule` (full), `ng-018-scheduled-integrity-check` (full), `ng-085-quit-closes-store` (full) | `$PB_REPO/scripts/verify-sql-store-second-writer.mjs`, `$PB_REPO/scripts/verify-tab-store-offline.mjs` | Guarded; `tab-store-offline` has no self-test row |
| Binding: Theia extensions build in dependency order | `theia-build-order` (quick), `smoke-theia` (full), `theia-fresh-clone-build` (full) | `$PB_REPO/scripts/verify-theia-build-order.mjs` | Partly guarded: checks the extension build order only |
| Binding: patches are regenerated, never text-edited | `check-patch-surface` (quick), `apply-patches-self-test` (full) | `$PB_REPO/scripts/check-patch-surface.sh`, `$PB_REPO/scripts/apply-patches.sh` | Partly guarded: regeneration is GAP: see Gaps |
| Binding: builds run inside the Nix dev shells | none | none | GAP: a build-shell check does not exist in PB. See Gaps |
| Binding: one verification driver, rows appended, no sibling driver | none | none | GAP: a second-driver check does not exist in PB. See Gaps |
| Binding: Theia DI binds are static at module load | none | none | GAP: a DI bind check does not exist in PB. See Gaps |

## Change X, also change Y

Each bullet names the companion changes for one kind of change. The steps are in the linked subsystem doc or recipe, not copied here.

- New bridge kind (rung 4). Companions: one row in the Touchpoints table of `$PB_REPO/powerbrowser/INTERNAL-APIS.md` for each source line that carries a forbidden pattern from `FORBIDDEN_PATTERNS` in `$PB_REPO/scripts/check-internals-boundary.sh` (one row per occurrence; `--catalogue` looks for a `basename:line` row); a typed method on the frontend client, `ChromeStoreClient` in `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts` for store kinds or `WebTabMessage` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts` for web-tab kinds; after a line moves, `node $PB_REPO/scripts/verify-ng-040-internals-catalogue-lines.mjs --fix` rewrites the stale File:Line cells; one check row in the registry of `$PB_REPO/scripts/verify-platform.sh` with its `--self-test` row, appended in the quick block when the check is text-only; the kind classified in `KIND_CLASSES` or `STORE_KIND_CLASSES` in `$PB_REPO/scripts/verify-web-tab-bridge.mjs`; an allowlist row if the kind contacts a host. Gates: `internals-boundary`, `internals-catalogue`, `ng-040-internals-catalogue-lines`, and the new row's label. See [Adding a new message kind](02-powerbrowser-api-bridge.md#adding-a-new-message-kind) and [Add a bridge kind](recipes/add-bridge-kind.md).
- New outbound host (any rung; needs the user's approval first). Companions: one object in the `hosts` array of `$PB_REPO/powerbrowser/endpoint-allowlist.json` with `host` (the exact host name), `disposition` (`allow` or `deny`) and `reason` (a sentence naming the caller and when it contacts the host), which the `allowlist-schema` check in `$PB_REPO/scripts/verify-platform.sh` requires; a host named by an `install_url` or a search-engine URL also needs its row (see [CF-10](CONFLICTS.md#cf-10)). Gates: `allowlist-schema` (quick), `verify-endpoints` (full tier) and `theia-endpoints` (quick). See [Add an outbound host](recipes/add-outbound-host.md).
- New `@powerbrowser/*` extension (rung 3). Companions: the dependency `"@powerbrowser/<name>"` in the `dependencies` of `$PB_REPO/theia/applications/browser/package.json`; the build step `yarn --cwd extensions/<name> build` appended to `build:extensions` in `$PB_REPO/theia/package.json`, after every extension it imports (`theia-build-order` derives the order from the imports); a build run in the Theia dev shell. Gates: `theia-build-order` (quick) and `smoke-theia` (full) for a running build. See [Add a shell command](recipes/add-command.md) and [Build system commands](subsystems/build-system.md#commands-settings-and-ids).
  - Theia DI binds are static at module load: a contribution bound after first enumeration is never seen. GAP: a DI bind check does not exist in PB. Bind in the frontend module at load, as the header of `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts` describes.
  - Only the chrome side writes `tabs.sqlite`, so a backend service never opens it for writing (`$PB_REPO/docs/TAB-STORE.md`). Guards: `sql-store-second-writer` and `tab-store-offline` (quick).
  - User-facing text carries no internal identifiers (pref key, port, sentinel, raw exception). Guards: `shell-error-copy-no-internals` and `shell-error-contract` (quick).
- Configuration key or pin (rung 2). Companions: change the generator input `$PB_REPO/configuration.toml`, then run the generator inside the Theia dev shell, from `$PB_REPO`, as `nix develop .#theia --command node scripts/generate.mjs`. A generator run alone does not update the tracked targets `$PB_REPO/powerbrowser/distribution/policies.json` (keys `AppUpdateURL`, `ExtensionSettings` and `SearchEngines`) and the `theiaPlugins` block of `$PB_REPO/theia/applications/browser/package.json`. The generator subsystem doc names both as hand-copy targets. The `theiaPlugins` block is a hand-copy target only when `$PB_REPO/configuration.toml` declares one or more `[[extensions]]`. At the stamp commit `$PB_REPO/configuration.toml` declares none and the block is absent, and `extension-pins` (`$PB_REPO/scripts/verify-extension-pins.mjs`) fails when a block is present with no entries. Re-check both before a configuration change. That hand copy is a known conflict ([CF-10](CONFLICTS.md#cf-10)), so after any copy, re-check the target against the `generate.mjs` output. Gates: `generate-check`, `webextensions`, `search-engines`, `extension-pins`, and `ng064-update-url-from-manifest` (full tier). See [Procedure: add a configuration key](subsystems/generator.md#procedure-add-a-configuration-key).
- Brand text (any surface). Companions: the originating product name appears only in `$PB_REPO/inventory/brand-tokens.json`; new text carries no internal identifier; new files are staged before the scan, because it reads the git index. Gates: `scan-brand-residue` (must exit 0) and `scan-brand-residue-self-test`. See [Branding limits and rules](subsystems/branding.md#limits-and-rules).
- Gecko patch (rung 5). Companions: regenerate the patch from a patched tree and never text-edit a hunk, because a hand-edited hunk that does not recompute its blob hashes applies as a silent no-op; the patch touches no compiled-file path and carries no brand value. Gates: `check-patch-surface` (quick) and `apply-patches-self-test` (full); `verify-upstream-pins` when the ESR pin moves. See [Patches and upstream limits and rules](subsystems/patches-and-upstream.md#limits-and-rules).
- Fresh clone build (any rung). Companion: run the generator before `$PB_REPO/scripts/fetch-upstream.sh`, because the fetch reads its ESR tag from the generated fragment and fails without it. See [CF-06](CONFLICTS.md#cf-06).
- New registry check (any rung that adds one). Companions: one `"label|command"` row added to the `CHECKS` array in `$PB_REPO/scripts/verify-platform.sh` (the quick block or the full block), never a sibling driver; a `--self-test` row for the rule script; a wrapper function when the check takes arguments. Gates: `--only <label>` for the new row, then the quick tier. See [Verification](subsystems/verification.md#verification).

## Gate list

Run these from `$PB_REPO` before a core change is declared done. The guard map names the rows for each rule the change touches.

- `$PB_REPO/scripts/verify-platform.sh --quick`: the quick tier, which gates each commit. Then `$PB_REPO/scripts/verify-platform.sh --only <label>` for each row added or changed. Full-tier rows named in this guide need a full tree, not `--quick`. The quick rows are listed under [Quick tier](subsystems/verification.md#quick-tier).
- `node $PB_REPO/scripts/scan-brand-residue.mjs` (label `scan-brand-residue`) must exit 0. Stage new files first. Its self-test row is `scan-brand-residue-self-test`.
- `bash $PB_REPO/scripts/check-internals-boundary.sh` and `bash $PB_REPO/scripts/check-internals-boundary.sh --catalogue` (labels `internals-boundary` and `internals-catalogue`): every Firefox touchpoint has a catalogue row.
- From `$PB_REPO`: `nix develop .#theia --command node scripts/generate.mjs --check` (label `generate-check`) after any change to `$PB_REPO/configuration.toml`, a generated target or a pin. The registry row runs bare `node`, but `docs/BUILD.md` requires the generator to run inside the Theia dev shell, so this command uses the shell.
- `node $PB_REPO/scripts/verify-ng-040-internals-catalogue-lines.mjs` (label `ng-040-internals-catalogue-lines`, quick): every catalogue File:Line cell names the line it points at. Run `--fix` only after a line moved.
- The `--self-test` row of each rule script the change touched or added, run with `--only <name>-self-test` where the registry has that row. Five rule scripts have no self-test row: `diff-theia-core`, `ng-039-internals-detects-waivers`, `tab-store-offline`, `ng069-sidecar-egress` and `ng064-update-url-from-manifest`. `verify-endpoints` has `verify-endpoints-interrupt-self-test` only. For those scripts, the row named in the guard map is the gate.

## Gaps

- GAP: a single verification driver check beyond the registry does not exist in PB. Checked: the scripts directory at PB HEAD for file names matching `driver` or `sibling`, and the files other than `$PB_REPO/scripts/verify-platform.sh` that hold a quoted `label|command` row.
- GAP: a check that builds run inside the Nix dev shells does not exist in PB. Checked: registry labels at PB HEAD matched on `nix`, `flake`, `devshell` and `shell-dev`.
- GAP: a check for Theia DI bindings that are static at module load does not exist in PB. Checked: registry labels at PB HEAD matched on `bind`, `inversify`, and `di` or `dis` as a whole hyphen-delimited token; the only match is `side01-bind-scope`, a backend bind-address check, which is not a DI check.
- GAP: a `--self-test` row does not exist in PB for `diff-theia-core`, `ng-039-internals-detects-waivers`, `tab-store-offline`, `ng069-sidecar-egress` or `ng064-update-url-from-manifest`. Checked: the registry rows of `$PB_REPO/scripts/verify-platform.sh` at HEAD `5571d3d` for a label `<name>-self-test` for each script. `verify-endpoints` has only `verify-endpoints-interrupt-self-test`.
- GAP: a shell-window check beyond four tokens does not exist in PB. Checked: the SHELL-01 block of `$PB_REPO/scripts/verify-platform.sh` at HEAD, whose forbidden list is `tabbrowser`, `nav-bar`, `toolbarbutton` and `urlbar`, applied to `$PB_REPO/powerbrowser/shell/powerbrowser.xhtml` only. Elements such as `menubar`, `menupopup`, `toolbar` and `tabs` are not checked.
- GAP: a patch regeneration script does not exist in PB. Checked: `scripts/` at PB HEAD filtered for `patch` and `regen`, and a case-insensitive search for `regenerat` in `docs`, `patches`, `scripts`, `CLAUDE.md` and `README.md`. The regeneration procedure is written in PB CLAUDE.md and in [Patches and upstream](subsystems/patches-and-upstream.md).

## Unsettled items

Run `export PB_REPO=<path to the PB checkout>` once before the commands in this section.

- UNVERIFIED: the runtime half of the SHELL-01 check (`shell01-theia-is-the-window`, which checks the top-level context URL) was not run. Verify: run `--only shell01-theia-is-the-window` only on a full tree that the user approves.
- PB-side inconsistency: the registry row `generate-check` runs bare `node`, while `docs/BUILD.md` says `scripts/generate.mjs` must run inside `nix develop .#theia`, and `.github/workflows/verify.yml` runs the driver inside that shell. Checked at `5571d3d`. This guide uses the shell form.
- PB-side inconsistency: at `5571d3d` ledger entries 5 and 10 in `$PB_REPO/.planning/WINDOWS.md` are `fixed`, so the three `GATE_KNOWN_OPEN_EXCLUSIONS` rows in `$PB_REPO/scripts/verify-platform.sh` (`verify-endpoints`, `verify-branding-identity-release` and `branding-variant-divergence`) no longer excuse a failure under `--gate`. A failing row then fails with "exclusion no longer applies". The `verify-endpoints` row is keyed to entry 5, which records `scripts/verify-dev-flag-off.mjs`, not the three hosts named in its reason.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
