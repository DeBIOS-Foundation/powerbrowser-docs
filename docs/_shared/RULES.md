# Shared rule blocks

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/CLAUDE.md`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/scripts/diff-theia-core.sh`
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/powerbrowser/INTERNAL-APIS.md`
- `$PB_REPO/scripts/check-internals-boundary.sh`
- `$PB_REPO/scripts/verify-registry-shape.mjs`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/inventory/brand-tokens.json`
- `$PB_REPO/scripts/verify-endpoints.sh`
- `$PB_REPO/scripts/scan-brand-residue.mjs`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts`
- `$PB_REPO/docs/TAB-STORE.md`
- `$PB_REPO/theia/extensions/customize/src/browser/customize-privileged-js-contribution.ts`
- `$PB_REPO/docs/CUSTOMIZE.md`

This file is the only source of the shared rule blocks. Copy a block verbatim, both marker lines included, into every file that carries it. To change a block, edit it here first, then recopy it everywhere in the same commit. The rules for the blocks are in [docs/CONVENTIONS.md](../CONVENTIONS.md#shared-rule-blocks).

The stop-and-ask items on experiment APIs, unsigned XPIs and remote protocols are this repo's policy, not PB facts. No PB file defines them, so the drift check does not watch them. The `powerbrowserPrivilegedJs` key is a PB fact; its reader and its documentation are in `Source files:`.

## Stop and ask

<!-- BEGIN pb-rules:stop-and-ask -->
> **Stop and ask the user before you:**
>
> - edit any file in PB core (`$PB_REPO`);
> - add AI tools, agents, model providers or MCP config to PB core;
> - ship a pref change, enable `powerbrowserPrivilegedJs`, use experiment APIs, ship an unsigned XPI or enable any remote protocol;
> - add an outbound host (it needs a row in `$PB_REPO/powerbrowser/endpoint-allowlist.json`);
> - file more than 3 doc-gap issues in one session.
<!-- END pb-rules:stop-and-ask -->

## Hard rules

<!-- BEGIN pb-rules:hard-rules -->
**PB hard rules (binding).** They summarize `$PB_REPO/CLAUDE.md` and the PB files and checks named below; read `$PB_REPO/CLAUDE.md` for the full text. Run the commands named here from `$PB_REPO`.

1. **Never fork or patch Theia core.** Theia additions are `@powerbrowser/*` extensions. Consume `@theia/*` as npm dependencies pinned to the release named in `$PB_REPO/theia/applications/browser/package.json`. Never vendor or edit them. `$PB_REPO/scripts/diff-theia-core.sh` is the check.
2. **Never modify Gecko outside the patch stack.** Never hand-edit `$PB_REPO/upstream/`. Firefox internals are reached only through `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, and every touchpoint is catalogued in `$PB_REPO/powerbrowser/INTERNAL-APIS.md` (`$PB_REPO/scripts/check-internals-boundary.sh`).
3. **Design for the bridge.** Nothing may weld Theia to full-window presentation. `TabUriRegistry`'s exported shape is asserted (`$PB_REPO/scripts/verify-registry-shape.mjs`).
4. **The repo path must contain no space character.** A space breaks every native link step.
5. **Theia is the default GUI, and stock browser chrome stays reachable.** No custom browser chrome is authored: no tab strip, toolbar, address bar or menu of our own outside Theia.

Also binding:

- Verification has one driver, `$PB_REPO/scripts/verify-platform.sh`. To add a check, append one `"label|command"` row. Never create a sibling driver. Never assert on the absence of a log line you emit yourself. Derive expectations from the tree, and give each check a `--self-test`.
- `node scripts/scan-brand-residue.mjs` must exit 0. It reads `git ls-files`, so stage new files first. Name the originating product only in `$PB_REPO/inventory/brand-tokens.json`.
- Patches are regenerated, never text-edited.
- User-facing text contains no internal identifiers (pref key, port, sentinel, raw exception). Name the product "PowerBrowser" and end every error with an on-screen next step.
- Builds run in Nix dev shells: `nix develop .#theia` for `$PB_REPO/theia/` (yarn fails in the host shell) and `nix develop .#firefox` for `$PB_REPO/upstream/`.
- Every new outbound host needs a row in `$PB_REPO/powerbrowser/endpoint-allowlist.json` (`$PB_REPO/scripts/verify-endpoints.sh`).
- Theia DI binds are static at module load: a contribution bound after first enumeration is never seen (header comment of `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts`). Only chrome writes `tabs.sqlite`: the single writer is `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (`$PB_REPO/docs/TAB-STORE.md`). Never open it for writing.
<!-- END pb-rules:hard-rules -->

## Footer

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
