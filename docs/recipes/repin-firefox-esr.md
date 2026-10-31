# Re-pin Firefox ESR

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/configuration.toml`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/scripts/rebase-upstream.sh`
- `$PB_REPO/scripts/fetch-upstream.sh`
- `$PB_REPO/scripts/apply-patches.sh`
- `$PB_REPO/scripts/check-patch-surface.sh`
- `$PB_REPO/scripts/verify-upstream-pins.mjs`
- `$PB_REPO/scripts/toolchain-baseline.sh`
- `$PB_REPO/toolchain-baseline.txt`
- `$PB_REPO/.github/workflows/rebase-upstream.yml`
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

The manifest pin, the rebase workflow default and the fetch default name one new ESR tag, and the patch stack replays on it non-vacuously.

## Before you start

- Rung 2 of the [ladder](../10-changing-pb-core.md#the-ladder) (a pin). Stop and ask first. An ESR re-pin is a PB core change that needs approval, a full verify pass and the toolchain-baseline diff ([limits](../subsystems/patches-and-upstream.md#limits-and-rules)).
- [Commands, settings and ids](../subsystems/patches-and-upstream.md#commands-settings-and-ids): the rebase and fetch commands. The tag is a plain tag name, never a range.
- Companion changes, from [Change X, also change Y](../10-changing-pb-core.md#change-x-also-change-y): the manifest pin, the workflow mirror, the generator fragment, the rebase replay, the surface scan and the toolchain baseline. Generate before fetch ([CF-06](../CONFLICTS.md#cf-06)).

## Confirm before coding

- `grep -n 'firefox_esr_tag' "$PB_REPO/configuration.toml"`
- `grep -n 'emitUpstreamPins' "$PB_REPO/scripts/generate.mjs"`
- `grep -n 'ls-remote' "$PB_REPO/scripts/rebase-upstream.sh"`
- `grep -n 'default: FIREFOX_' "$PB_REPO/.github/workflows/rebase-upstream.yml"`

## Steps

1. **PB core edit** Set `upstreams.firefox_esr_tag` in `$PB_REPO/configuration.toml` to the new plain tag name.
2. **PB core edit** Set the default input of the rebase-upstream workflow in `$PB_REPO/.github/workflows/rebase-upstream.yml` to the same tag. `verify-upstream-pins` requires the manifest tag, this default and the fetch default to agree.
3. Not labelled (writes the gitignored `$PB_REPO/generated/` folder): from the PB root, run `nix develop .#theia --command node scripts/generate.mjs`, so the fetch reads the new tag ([CF-06](../CONFLICTS.md#cf-06)).
4. Not labelled: dry run with `scripts/rebase-upstream.sh --tag NEW_TAG --dry-run`. It prints the plan and writes no file. It does make a network read: `git ls-remote` contacts `https://github.com/mozilla-firefox/firefox.git`, and `$PB_REPO/powerbrowser/endpoint-allowlist.json` has no row for that host. Stop and ask before this step, and name the host in the question.
5. Not labelled: stop and ask before the real run. Then run `scripts/rebase-upstream.sh --tag NEW_TAG`. It removes and re-materializes the ignored `$PB_REPO/upstream/` checkout and replays the stack.
6. Not labelled: inside `nix develop .#firefox`, run `scripts/toolchain-baseline.sh` and diff its output against `$PB_REPO/toolchain-baseline.txt`. Regenerate the baseline only on purpose.

## Verify

- `"$PB_REPO"/scripts/verify-platform.sh --only verify-upstream-pins` (quick) prints PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only check-patch-surface` (quick) prints PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only apply-patches-self-test` (full) prints PASS.
- `node scripts/scan-brand-residue.mjs --extra-root "$PB_REPO/upstream"` exits 0 (the dry run's step 4b, run after step 5).
- `readlink -f "$PB_REPO/upstream/powerbrowser"` resolves to `$PB_REPO/powerbrowser` (the dry run's step 5b).
- `"$PB_REPO"/scripts/verify-platform.sh --only smoke-firefox` (full, manual, takes hours) proves the full compile.
- `"$PB_REPO"/scripts/verify-platform.sh --gate` is the full pass.

## Done when

- The rebase reports PASS.
- The toolchain diff is empty.
- The step 4b brand scan exits 0, and the step 5b symlink resolves.
- `verify-upstream-pins` prints PASS.

GAP: no gate compares the commit a tag resolves to with the commit recorded at adoption. It does not exist in PB. Checked: `$PB_REPO/scripts/fetch-upstream.sh` compares an existing `$PB_REPO/upstream/` HEAD with `refs/tags/$TAG^{commit}`, but a fresh clone runs `git clone --branch` with no commit check; `$PB_REPO/scripts/rebase-upstream.sh` runs `git ls-remote` for tag presence only; `$PB_REPO/configuration.toml` pins only the tag; and the rebase section of `$PB_REPO/docs/BUILD.md` states that the recorded commit is not gated.

UNVERIFIED: a re-pin to a tag newer than the one recorded in `$PB_REPO/docs/BUILD.md` has not run on this tree. Verify: run step 4 and the Verify commands on that tag.

## Rollback

- Steps 1 and 2: after the user agrees, restore each file with `git --no-optional-locks -C "$PB_REPO" restore -- <file>`, then run step 3 again.
- Step 3: run the generator again after the restore.
- Step 4: nothing to undo, because the dry run writes no file.
- Step 5 (real rebase): run `scripts/rebase-upstream.sh --tag OLD_TAG` only after the user agrees, because it removes `$PB_REPO/upstream/`.
- Step 6: nothing to undo unless the baseline file changed; restore it from HEAD if it did.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
