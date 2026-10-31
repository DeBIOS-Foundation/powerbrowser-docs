# Add a mode

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/modes/src/browser/mode-descriptors.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/modes-commands.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`
- `$PB_REPO/scripts/verify-platform.sh`

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

A new shipped mode appears in the mode switch after Organising and activates through the `powerbrowser.modes.activate` command.

## Before you start

- A shipped mode changes the default set that every user sees, so ask first. A custom mode needs no PB edit: the user saves one with `powerbrowser.modes.save-as-mode`.
- No ladder row names an edit to an existing extension. Name the rung in the question; the nearest is rung 3.
- [Modes APIs by layer](../subsystems/modes.md#apis-by-layer) and [limits and rules](../subsystems/modes.md#limits-and-rules). A switch never closes a main-area tab, and a custom mode never opens the Organising slot.
- [Modes verification list](../subsystems/modes.md#verification).

## Confirm before coding

- `grep -n 'SHIPPED_MODES' "$PB_REPO/theia/extensions/modes/src/browser/mode-descriptors.ts"`
- `grep -n 'SHIPPED_MODE_RULES' "$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts"`
- `grep -n 'activateMode' "$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts"`
- `grep -n 'MODES_ACTIVATE_COMMAND_ID' "$PB_REPO/theia/extensions/modes/src/browser/modes-commands.ts"`

## Steps

1. **PB core edit** Append one descriptor to `SHIPPED_MODES` in `$PB_REPO/theia/extensions/modes/src/browser/mode-descriptors.ts`, with a new lower-case id (never prefixed `custom-`) and a label. Keep the three existing entries in their order. That order is part of the contract.
2. **PB core edit** Add one row keyed by the same id to `SHIPPED_MODE_RULES` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`. The row sets `left`, `right` and `bottom` (each `open`, `closed` or `keep`), `furniture`, `organising` (false for any mode other than the Organising row) and `views`. The record is frozen, and a shipped id with no row does not resolve to shipped rules.

## Verify

Run from `$PB_REPO`, quick tier:

- `scripts/verify-platform.sh --only gui07-mode-toggle-commands` prints `gui07-mode-toggle-commands: PASS`.
- `scripts/verify-platform.sh --only gui07-mode-switch-tabs-invariant` prints `gui07-mode-switch-tabs-invariant: PASS`.
- `scripts/verify-platform.sh --only modes-name-cap-at-input` prints `modes-name-cap-at-input: PASS`.
- `scripts/verify-platform.sh --only scan-brand-residue` exits 0.
- `scripts/verify-platform.sh --quick` prints no FAIL line.

On a built tree, full tier:

- `scripts/verify-platform.sh --only gui07-mode-switch-tabs-live` prints `gui07-mode-switch-tabs-live: PASS`.
- `scripts/verify-platform.sh --only ng-035-custom-mode-saves-layout` prints `ng-035-custom-mode-saves-layout: PASS`.

The toggle row derives its expectations from the mode sources. If it fails, stop and ask. Do not edit the checker.

UNVERIFIED: per-pixel furniture geometry after a switch is not confirmed. Verify: measure the main area in a live build across the three shipped modes, as the modes reference lists under Unsettled items.

## Done when

- The mode appears in the switch in its order.
- `powerbrowser.modes.activate` with the new id switches to it.
- An unknown id still resolves to Browsing (`activateMode` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`).

## Rollback

- Undo step 2: remove the row from `SHIPPED_MODE_RULES`.
- Undo step 1: remove the descriptor from `SHIPPED_MODES`. A persisted id for the removed mode resolves to Browsing, so the shell stays usable.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
