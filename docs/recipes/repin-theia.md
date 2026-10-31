# Re-pin Theia

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/configuration.toml`
- `$PB_REPO/scripts/verify-upstream-pins.mjs`
- `$PB_REPO/scripts/diff-theia-core.sh`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/theia/package.json`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/theia/yarn.lock`
- `$PB_REPO/docs/BUILD.md`

PB core edits: 2

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

Every `@theia/*` pin and the lockfile name the one Theia release declared in the manifest, with no edit to Theia core.

## Before you start

- Rung 2 of the [ladder](../10-changing-pb-core.md#the-ladder) (a pin). Stop and ask first. The runbook rewrites the lockfile and reinstalls `node_modules`, which needs network access and time. `$PB_REPO/docs/BUILD.md` says not to run it speculatively.
- Never edit `@theia/*` packages ([build system limits](../subsystems/build-system.md#limits-and-rules)).
- The gate list is in [Gate list](../10-changing-pb-core.md#gate-list).
- Companion changes, from [Change X, also change Y](../10-changing-pb-core.md#change-x-also-change-y): the manifest pin, the package.json pins, the lockfile, the generator run, the core-untouched check and the token-gate proof.

## Confirm before coding

- `grep -n 'theia_release' "$PB_REPO/configuration.toml"`
- `grep -n 'theia_release' "$PB_REPO/scripts/verify-upstream-pins.mjs"`
- `grep -n 'build:extensions' "$PB_REPO/theia/package.json"`
- `grep -n '@theia/' "$PB_REPO/scripts/diff-theia-core.sh"`

## Steps

1. **PB core edit** Set the existing `theia_release` key under `[upstreams]` in `$PB_REPO/configuration.toml` to the exact new triple, never a range. The key is already declared at PB HEAD. Do not add a second key: a duplicate key is invalid TOML.
2. **PB core edit** Move every `@theia/*` pin in the package.json files under `$PB_REPO/theia/` to the manifest triple, then re-resolve `$PB_REPO/theia/yarn.lock` without `--frozen-lockfile`. Run the paragraph "One-pin Theia re-pin procedure (CFG-06, UPD-02)" in `$PB_REPO/docs/BUILD.md` inside `nix develop .#theia` from the PB root, and follow its exclusions. Do not edit a `@theia/*` file by hand.
3. Not labelled (writes build and generator output into the PB checkout: `node_modules/`, `lib/` and the gitignored `$PB_REPO/generated/` folder): inside `nix develop .#theia`, run `node scripts/generate.mjs`, then `node scripts/verify-upstream-pins.mjs` and `node scripts/verify-upstream-pins.mjs --self-test`.
4. Not labelled: run `bash scripts/diff-theia-core.sh`, which must pass. Then, inside `nix develop .#theia` from the PB root, run the two commands of the runbook's step 6: `node theia/node_modules/typescript/bin/tsc -b theia/extensions/token-gate` and `node theia/extensions/telemetry/test/telemetry-sender.test.mjs`. Both must exit 0. A re-pin that silences the credential gate is a failed re-pin.

## Verify

- `"$PB_REPO"/scripts/verify-platform.sh --only verify-upstream-pins` and `--only verify-upstream-pins-self-test` (quick) print PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only generate-check` and `--only extension-pins` (quick) print PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only theia-build-order` (quick) prints PASS.
- The two step 4 commands exit 0.
- `"$PB_REPO"/scripts/verify-platform.sh --only diff-theia-core` and `--only smoke-theia` (full) print PASS.

## Done when

- `diff-theia-core` prints PASS, so no `@theia/*` file changed.
- The lockfile diff holds the `@theia` moves and their transitive lines only. `docs/BUILD.md` says unrelated-looking lines that move with them are normal.
- The token-gate backend compiles and `telemetry-sender.test.mjs` exits 0.
- `smoke-theia` prints PASS.

UNVERIFIED: the runbook exclusion list and its step numbering were read from `$PB_REPO/docs/BUILD.md` at PB HEAD and have not been run for a newer release. Verify: read that paragraph at the PB HEAD of the day before step 2.

## Rollback

- Steps 1 and 2: after the user agrees, restore `$PB_REPO/configuration.toml`, `$PB_REPO/theia/yarn.lock` and every package.json that step 2 moved. List the moved files with `git --no-optional-locks -C "$PB_REPO" diff --name-only`, and restore each with `git --no-optional-locks -C "$PB_REPO" restore -- <file>`.
- Then run `yarn install --ignore-scripts` inside `nix develop .#theia` to resync `node_modules`, which is ignored build output.
- Step 3: run the generator again after the restore.
- Step 4: nothing tracked to undo.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
