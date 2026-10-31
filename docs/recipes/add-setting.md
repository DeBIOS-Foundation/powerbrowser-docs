# Add a setting

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/address-bar/address-bar.tsx`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-preferences.ts`

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

A user-scope Theia preference with a default is contributed by a PB extension and read through the Theia preference service.

## Before you start

- Model keys: [chrome-bar and telemetry preference keys](../subsystems/settings.md#commands-settings-and-ids).
- A key stored in `tabs.sqlite` is a different route. A store key needs a seeded row ([settings APIs by layer](../subsystems/settings.md#apis-by-layer)). For a store column, use [add-tab-store-column.md](add-tab-store-column.md).
- The extension contribution (command and frontend module) follows [add-command.md](add-command.md).
- A new extension is rung 3 of [the ladder](../10-changing-pb-core.md#the-ladder). Its companion changes are in [Change X, also change Y](../10-changing-pb-core.md#change-x-also-change-y).
- A telemetry-owned key follows `telemetry-preferences.ts` instead of the chrome-bar schema.
- Adding a shipped default is the stop item "ship a pref change". Ask first and name the rung in the question. No ladder row names an edit to an existing extension; the nearest is rung 3.

## Confirm before coding

- `grep -n 'ChromeBarPreferenceSchema' "$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts"`
- `grep -n 'PreferenceScope.User' "$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts"`
- `grep -n 'bindChromeBarPreferences' "$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts"`
- `grep -n 'inspectInScope' "$PB_REPO/theia/extensions/chrome-bar/src/browser/address-bar/address-bar.tsx"`

## Steps

1. **PB core edit** In `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts`, add a property for the key to `ChromeBarPreferenceSchema`. Give it a type, a default, `scope: PreferenceScope.User` and a description. Use the shape of `DEFAULT_SEARCH_ENGINE_PROPERTY` in the same file. Prefix the key with the owner, such as `browser.` for chrome-bar keys.
2. **PB core edit** In the same file, export a bind function that binds `PreferenceContribution` to a constant holding the schema, as `bindChromeBarPreferences` does. Call it at module load from `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts`. A contribution bound after first enumeration is never seen.

## Verify

Run from `$PB_REPO`:

- `scripts/verify-platform.sh --only chrome-bar-typecheck` prints `chrome-bar-typecheck: PASS`.
- `scripts/verify-platform.sh --only theia-build-order` prints `theia-build-order: PASS`.
- For a telemetry-owned key, `scripts/verify-platform.sh --only telemetry-self-test` prints `telemetry-self-test: PASS`.
- `scripts/verify-platform.sh --quick` prints no FAIL line.
- `scripts/verify-platform.sh --only scan-brand-residue` exits 0.

UNVERIFIED: the key appears in the settings editor with its default. Verify: launch a build, open the settings editor and find the key. This has not been run.

## Done when

- The chrome-bar typecheck and build-order rows pass.
- A read through the preference service returns the default when the user has no value.
- A workspace settings file cannot change the key, because its scope is User.

## Rollback

- Undo step 2: remove the bind call and the bind function.
- Undo step 1: remove the property from the schema. A user value left in user settings stays in the file, and the code no longer reads it.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
