# Change a Gecko patch

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/CLAUDE.md`
- `$PB_REPO/patches/`
- `$PB_REPO/scripts/apply-patches.sh`
- `$PB_REPO/scripts/check-patch-surface.sh`
- `$PB_REPO/scripts/fetch-upstream.sh`
- `$PB_REPO/docs/BUILD.md`

PB core edits: 1

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

One patch file in `$PB_REPO/patches/` carries the changed hunk, regenerated from a patched tree and replayed non-vacuously.

## Before you start

- Rung 5 is the last resort. Say which rungs 1 to 4 cannot make the change, and stop and ask first ([the ladder](../10-changing-pb-core.md#the-ladder), [approval rules](../10-changing-pb-core.md#approval-rules)).
- [Patches and upstream limits](../subsystems/patches-and-upstream.md#limits-and-rules): a patch is regenerated, never text-edited.
- Companion changes, from [Change X, also change Y](../10-changing-pb-core.md#change-x-also-change-y): the regenerated patch, the surface scan with its self-test, the brand-value scan, and the replay assertion. Each is a verify row below.

## Confirm before coding

- `grep -n 'apply_patch_with_assertion' "$PB_REPO/scripts/apply-patches.sh"`
- `grep -n 'scan_patch_surface' "$PB_REPO/scripts/check-patch-surface.sh"`
- `grep -n 'patch_touched_paths' "$PB_REPO/scripts/fetch-upstream.sh"`

## Steps

1. Not labelled. Ask the user which patched tree to edit, then make the hunk edit in that tree, outside the PB checkout. UNVERIFIED: PB names no location for the patched tree, and hard rule 2 forbids hand edits to `$PB_REPO/upstream/`. Verify: ask the user, then read the section "Patches are regenerated, never text-edited" in `$PB_REPO/CLAUDE.md` at PB HEAD.
2. **PB core edit** Stop and ask the user for the regeneration procedure. GAP: no patch regeneration script exists in PB. Checked: the file names in `scripts/` at PB HEAD, and a case-insensitive search for regenerat in docs, patches, scripts, CLAUDE.md and README.md ([gaps](../10-changing-pb-core.md#gaps)). After the user answers, regenerate the one changed file in `$PB_REPO/patches/` with that procedure. Never edit a hunk body by hand: a hunk with stale blob hashes applies as a silent no-op. UNVERIFIED: the diff options PB uses to regenerate. Verify: compare the `diff --git` and `+++ b/` header lines of `$PB_REPO/patches/010-powerbrowser-identity.patch` with the regenerated file.
3. Not labelled. The patch scripts are the only writers of `$PB_REPO/upstream/`, which is ignored build input. Hard rule 2 forbids hand edits, not these scripts. From the PB root, replay the stack with `scripts/apply-patches.sh`. If the patch changes a compiled define, run the tier-3 rebuild that `$PB_REPO/docs/BUILD.md` names for a compiled-define change.

## Verify

- `"$PB_REPO"/scripts/verify-platform.sh --only check-patch-surface` prints PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only check-patch-surface-brand-values` prints PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only check-patch-surface-self-test` prints PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only fetch-upstream-self-test` prints PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only apply-patches-self-test` (full tier) prints PASS and proves the replay assertion.

## Done when

- The quick rows above pass on the changed stack.
- The replay reports that every patch applied and was verified non-vacuous.

## Rollback

- Step 2: after the user agrees, restore the file with `git --no-optional-locks -C "$PB_REPO" restore -- patches/<file>`, then run step 3 again.
- Step 1: discard the scratch edit. Nothing in PB changes.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
