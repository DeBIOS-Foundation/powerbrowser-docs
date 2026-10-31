# Add a Theia extension to the app

> Verified against PB 0f27a5c on 2026-10-25. Level: source-read

Source files:
- `$PB_REPO/theia/package.json`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/theia/extensions/telemetry/package.json`
- `$PB_REPO/theia/extensions/telemetry/tsconfig.json`
- `$PB_REPO/scripts/verify-theia-build-order.mjs`
- `$PB_REPO/scripts/diff-theia-core.sh`

PB core edits: 4

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

## Goal

A new `@powerbrowser/*` extension folder builds in the Theia chain and is bundled into the app. Its contributions come from the command and panel recipes.

## Before you start

- A new `@powerbrowser/*` extension is rung 3 of [the ladder](../10-changing-pb-core.md#the-ladder). Stop and ask first.
- What the extension contributes: [add-command.md](add-command.md) and [add-panel.md](add-panel.md).
- The build chain: [build-system APIs by layer](../subsystems/build-system.md#apis-by-layer) and [build commands](../subsystems/build-system.md#commands-settings-and-ids).
- Companion changes: [Change X, also change Y](../10-changing-pb-core.md#change-x-also-change-y).
- The Theia build steps are in the Theia half section of `$PB_REPO/docs/BUILD.md`.

## Confirm before coding

- `grep -n 'build:extensions' "$PB_REPO/theia/package.json"`
- `grep -n '@powerbrowser/' "$PB_REPO/theia/applications/browser/package.json"`
- `grep -n '"name"' "$PB_REPO/theia/extensions/telemetry/package.json"`

## Steps

1. **PB core edit** Create `$PB_REPO/theia/extensions/<name>/` with a `package.json` (name `@powerbrowser/<name>`, version 0.1.0) and a `tsconfig.json`, both in the shape of the telemetry extension's files. Add `src/browser/` with the frontend module that binds the contributions.
2. **PB core edit** In `$PB_REPO/theia/applications/browser/package.json`, add `"@powerbrowser/<name>": "0.1.0"` to `dependencies`, in the form of the existing `@powerbrowser/telemetry` entry.
3. **PB core edit** In `$PB_REPO/theia/package.json`, append `&& yarn --cwd extensions/<name> build` to the `build:extensions` script, after every extension this one imports. `$PB_REPO/scripts/verify-theia-build-order.mjs` derives the order from the imports, so a dependency must come earlier in the chain.
4. Build inside `nix develop .#theia`, from `$PB_REPO/theia`, as the Theia half of `$PB_REPO/docs/BUILD.md` describes. This writes build output (`node_modules/` and `lib/`) into the PB checkout. If the lockfile changes, stop and ask: that is a PB core edit outside this recipe.
5. **PB core edit** Stage the new extension folder (this writes PB's git index) so the brand scan reads it: `git -C "$PB_REPO" add -- theia/extensions/<name>`. Stage only; do not commit.

## Verify

Run from `$PB_REPO`, quick tier:

- `scripts/verify-platform.sh --only theia-build-order` prints `theia-build-order: PASS`.
- `scripts/verify-platform.sh --only theia-build-order-self-test` prints `theia-build-order-self-test: PASS`.
- `scripts/verify-platform.sh --only scan-brand-residue` exits 0.
- `scripts/verify-platform.sh --quick` prints no FAIL line.

On a built tree, full tier:

- `scripts/verify-platform.sh --only diff-theia-core` prints `diff-theia-core: PASS`.
- `scripts/verify-platform.sh --only smoke-theia` prints `smoke-theia: PASS`.

## Done when

- The build-order row passes.
- `smoke-theia` proves the sidecar builds and boots.
- The new extension folder has a `lib/` folder after the build.

## Rollback

- Undo step 3: remove the appended segment from `build:extensions`.
- Undo step 2: remove the dependency entry.
- Undo step 1: delete the new folder, then rebuild with step 4.
- Stop and ask before you restore a lockfile.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
