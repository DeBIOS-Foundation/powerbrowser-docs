# Add a verify check

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/CLAUDE.md`
- `$PB_REPO/scripts/scan-brand-residue.mjs`

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

One new rule script runs under the one verification driver as a registry row, with its self-test row, and both rows pass.

## Before you start

- A registry row has no ladder rung of its own. Name the rung that needs the check in the question.
- Stop and ask first: a new registry row is a PB core edit ([approval rules](../10-changing-pb-core.md#approval-rules)).
- The tier is set by the registration site ([tiers](../subsystems/verification.md#apis-by-layer)). Rule-script rules: [table rules](../subsystems/verification-rule-scripts.md#table-rules).
- Companion changes are listed in [new registry check](../10-changing-pb-core.md#change-x-also-change-y) and not copied here: the rule script with its self-test mode, the two rows, the staged file for the brand scan, and the quick-tier run.

## Confirm before coding

- `grep -n 'run_own_checks' "$PB_REPO/scripts/verify-platform.sh"`
- `grep -n 'local -a CHECKS=(' "$PB_REPO/scripts/verify-platform.sh"`
- `grep -n 'CHECKS+=(' "$PB_REPO/scripts/verify-platform.sh"`
- `grep -n 'QUICK" -eq 0' "$PB_REPO/scripts/verify-platform.sh"`

## Steps

The labels and file names below are placeholders, because a new label does not exist in PB yet.

1. **PB core edit** Write the rule script in the scripts folder of `$PB_REPO`, named for the check (placeholder `<script>.mjs`), with a `--self-test` mode. The self-test plants one fault in a temporary copy and requires the check to go red, naming the fault. Derive expectations from the tree, never from a kept list. Stage the file with `git -C "$PB_REPO" add -- <path>` and do not commit: the brand scan reads the git index.
2. **PB core edit** In `$PB_REPO/scripts/verify-platform.sh`, add two rows: `"<label>|node $REPO_ROOT/scripts/<script>.mjs"` and `"<label>-self-test|node $REPO_ROOT/scripts/<script>.mjs --self-test"`. Put them in the quick array that `run_own_checks` opens with `local -a CHECKS=(` when the check needs no build, browser, display or network. Put a row that needs a build in the `CHECKS+=(` block after the `QUICK" -eq 0` test. Never create a second driver.

## Verify

- `"$PB_REPO"/scripts/verify-platform.sh --only <label>` prints `<label>: PASS`.
- `"$PB_REPO"/scripts/verify-platform.sh --only <label>-self-test` prints `<label>-self-test: PASS`.
- `"$PB_REPO"/scripts/verify-platform.sh --only scan-brand-residue` prints PASS and exits 0.
- `"$PB_REPO"/scripts/verify-platform.sh --quick` lists `<label>` in its summary block when the row is quick.

## Done when

- The self-test row goes red on the planted fault, and the check row passes on the tree.
- The quick-tier summary lists the new label, when the row is in the quick array.
- The brand scan exits 0.

## Rollback

- Step 2: delete the two rows.
- Step 1: delete the rule script, then run `git -C "$PB_REPO" restore --staged -- <path>`.
- Stop and ask before any commit in PB.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
