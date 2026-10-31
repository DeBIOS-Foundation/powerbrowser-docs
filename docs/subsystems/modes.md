# Modes

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/mode-descriptors.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/modes-commands.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/main-area-exemption.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/mode-attribute.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/capped-name-input.ts`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/docs/URI-SCHEMES.md`

Not read:
- NOT COVERED: `$PB_REPO/theia/extensions/modes/src/browser/modes.css`
- NOT COVERED: `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`
- NOT COVERED: `$PB_REPO/theia/extensions/modes/src/browser/dependent-windows.ts`
- NOT COVERED: `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`
- NOT COVERED: `$PB_REPO/theia/extensions/modes/src/browser/organising-widget.ts`
- NOT COVERED: live-build switch behaviour

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

## What it is

- A mode is a Theia perspective: Coding, Browsing, Organising, or a custom mode saved in user storage. Only one perspective is active.
- Modes are data with shipped defaults. `SHIPPED_MODES` in `$PB_REPO/theia/extensions/modes/src/browser/mode-descriptors.ts` holds the three shipped descriptors; custom modes register as additional descriptors built from user storage.
- A mode reshapes the shell: which side areas are open or closed, which singleton views sit in each side area, whether IDE furniture shows, and whether the Organising slot opens. A mode switch never closes, moves, unmounts or detaches main-area tabs.
- Custom modes carry a name, three side-panel visibility flags, a furniture flag and the views per side area. A custom mode never mutates a shipped entry in place.
- The launch default is Browsing. A persisted custom id re-applies after registration so a custom mode survives relaunch.

## Where its data lives

- `user-storage:/user/modes.json`, read through `modesUri` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`. Holds a numeric `version` plus a `customs` array of custom rows. Absence is the untouched default and is never created. Unknown fields drop; corrupt content degrades to the contracted empty state.
- Shipped defaults live in code: `SHIPPED_MODES` in `$PB_REPO/theia/extensions/modes/src/browser/mode-descriptors.ts` and `SHIPPED_MODE_RULES` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`.
- The active perspective id lives in Theia local storage under `perspective-layouts` (read by `ModeService` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`). `ModeService` exposes no stored active-custom id of its own; persistence is re-applied from storage at startup.

## Access matrix

| Frontend | Backend | Bridge | MCP | .vsix | WebExt |
| --- | --- | --- | --- | --- | --- |
| `ModeService.activateMode` and the mode commands | none | none | none | none | none |

Modes are a frontend-only concern. Group membership and tab rows belong to [Panorama](panorama.md) and [the tab model](../09-tabs-reference.md#the-tab-model); setups belong to [Setups and dependent windows](setups-and-windows.md). `activateMode` runs from the command `powerbrowser.modes.activate` and from `SetupsService.restoreSetup`.

## APIs by layer

- `ModeService.activateMode` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`: the mode switch path (stock switch, panel flags, placeholder slot, furniture, mode attribute). Unknown ids resolve to the shipped Browsing id.
- `ModeService.getCustomModes` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`: customs listed beside the shipped defaults; returns id and name rows.
- `ModeService.whenCustomModesLoaded` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`: resolves when the launch-time custom load settles; never rejects. Await before the custom check at startup.
- `ModeService.hasCustomMode` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`: whether a custom id is registered and not dropped.
- `ModeService.saveCurrentAsMode` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`: opens a name prompt, stores the row in `modes.json`, registers it and activates it.
- `customModeIdFor` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`: custom descriptor ids in their own namespace.
- `SHIPPED_MODE_RULES` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`: one row per shipped id with panel rules, furniture flag, organising flag and views.
- `ModeRules` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`: one mode's rules as data.
- `PanelRule` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`: `open`, `closed` or `keep` per side area.
- `ModeViews` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`: the singleton views docked in each side area, in tab order.
- `MODES_STORE_VERSION` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`: accepted store version; newer writers read leniently.
- `MODE_NAME_MAX` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`: the mode name cap.
- `SHIPPED_MODES` in `$PB_REPO/theia/extensions/modes/src/browser/mode-descriptors.ts`: the three shipped defaults in contracted order (Coding, Browsing, Organising).
- `openOrganisingSlot` in `$PB_REPO/theia/extensions/modes/src/browser/mode-descriptors.ts`: show the organising placeholder through the registered contribution; silent no-op before registration.
- `closeOrganisingSlot` in `$PB_REPO/theia/extensions/modes/src/browser/mode-descriptors.ts`: hide the organising placeholder; silent no-op before registration.
- `registerOrganisingSlot` in `$PB_REPO/theia/extensions/modes/src/browser/mode-descriptors.ts`: called once by the placeholder contribution at startup; never by anyone else.
- `MODES_ACTIVATE_COMMAND_ID` in `$PB_REPO/theia/extensions/modes/src/browser/modes-commands.ts`: activate command with no label; takes a mode id, defaults to the shipped Browsing id.
- `MODES_SAVE_AS_MODE_COMMAND_ID` in `$PB_REPO/theia/extensions/modes/src/browser/modes-commands.ts`: save-as-mode command with its label.
- `ModesContribution` in `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`: registers the shipped descriptors synchronously in `onStart` and returns immediately.
- `MainAreaExemption` in `$PB_REPO/theia/extensions/modes/src/browser/main-area-exemption.ts`: strips the main and bottom areas out of every saved layout so a mode switch restores side panels only and the live main area stays attached.
- `MODE_ATTRIBUTE` in `$PB_REPO/theia/extensions/modes/src/browser/mode-attribute.ts`: the DOM attribute on `document.body` carrying the active mode id.
- `publishModeAttribute` in `$PB_REPO/theia/extensions/modes/src/browser/mode-attribute.ts`: publishes the active mode id; custom modes publish their own id.
- `inputCappedName` in `$PB_REPO/theia/extensions/modes/src/browser/capped-name-input.ts`: a name field that never holds more than the max characters, typed or pasted.
- Static DI binds live in `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`: `ModeService`, `MainAreaExemption`, `ModesCommandContribution` bound statically at module load; a contribution bound after first enumeration is never seen.

## Events and change signals

- `activateMode` performs one stock `switchPerspective`, then docks the mode's views, sets panel open or closed flags, opens or closes the organising slot, and sets furniture visibility before publishing `data-pb-mode`.
- Custom modes load fire-and-forget after startup; later read failures keep last-good content; `DELETED` resets immediately; other changes reload through a 150 ms debounce and re-applied after registration.
- `onDidInitializeLayout` runs the launch switch after the shell attaches; the persisted shipped id activates, otherwise `browsing`.
- A corrupt custom store falls back to shipped Browsing with the contracted notice naming the last-good active custom when one is known.
- Deleting `modes.json` drops every custom; the service falls back to Browsing when stuck on a dropped id; the stale toggle row clears on relaunch.
- The Browsing strip follows the active group through `GroupModel`; the group model loads at layout init, not at mode switch. See [Panorama](panorama.md).

## Commands, settings and ids

- `powerbrowser.modes.activate`: switches mode; argument is a mode id (shipped ids, or a `custom-` slug); unknown ids resolve to the shipped Browsing id; run with `CommandService.executeCommand`. Constant `MODES_ACTIVATE_COMMAND_ID` in `$PB_REPO/theia/extensions/modes/src/browser/modes-commands.ts`.
- `powerbrowser.modes.save-as-mode`: opens the name prompt; empty names and duplicate names write nothing. Constant `MODES_SAVE_AS_MODE_COMMAND_ID` in `$PB_REPO/theia/extensions/modes/src/browser/modes-commands.ts`.
- `custom-` slug ids: custom mode ids from `customModeIdFor` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`; never collide with a shipped id in normal use.
- `user-storage:/user/modes.json`: the customs file (version and customs rows).
- `data-pb-mode`: the `MODE_ATTRIBUTE` value on `document.body` in `$PB_REPO/theia/extensions/modes/src/browser/mode-attribute.ts`; values are mode ids. Custom modes publish their own id, so the sheet reads it the same way for every mode.
- `MODE_NAME_MAX`: the mode name cap in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`; cut while typing and backstopped at commit; duplicate names (including shipped-colliding names) are refused.

## Limits and rules

- A mode switch never closes, moves, unmounts or detaches a main-area tab; `MainAreaExemption` strips the main area from saved layouts at the deactivate seam and stock restores side panels only.
- A custom never alters a shipped default in place; shipped-colliding names are duplicates.
- Unknown mode ids resolve to Browsing, so a switch never blanks the shell.
- Only the Coding shipped row keeps IDE furniture (the icon rails and the status bar). Browsing and Organising hide them; Browsing collapses all three side areas while Coding leaves the Explorer visible.
- Custom modes never open the Organising slot; only the Organising shipped row sets `organising: true` in `SHIPPED_MODE_RULES` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`.
- Theia DI binds are static at module load: a contribution bound after first enumeration is never seen.
- Stock `PerspectiveService` exposes no unregister, so a custom deleted mid-session keeps its descriptor until relaunch; it drops from every listing and falls back to Browsing when stuck on it.

## Verification

- `$PB_REPO/scripts/verify-platform.sh --only gui07-mode-toggle-commands` proves the shipped mode ids, labels, order and placements derive from the mode sources and that modes ship as data.
- `$PB_REPO/scripts/verify-platform.sh --only gui07-mode-switch-tabs-invariant` proves a mode switch keeps main-area tabs attached through the allowlisted switch path.
- `$PB_REPO/scripts/verify-platform.sh --only gui07-mode-switch-tabs-live` proves the same invariant in a live build across a mode route where every measured hop is a second visit.
- `$PB_REPO/scripts/verify-platform.sh --only modes-name-cap-at-input` proves the name field cuts typed and pasted overflow at the cap.
- `$PB_REPO/scripts/verify-platform.sh --only ng-035-custom-mode-saves-layout` proves a custom mode saves its layout and a row written before the flags still loads.

## PB docs and deltas

- `$PB_REPO/docs/URI-SCHEMES.md`: agrees that named-setup restore, Panorama and a Theia link open all resolve through the opener.
- NOT COVERED: `$PB_REPO/docs/BUILD.md`, `$PB_REPO/docs/TAB-STORE.md`, `$PB_REPO/docs/RELEASING.md`, `$PB_REPO/docs/CRASH-POLICY.md` and `$PB_REPO/.planning/` files on modes behaviour.

## Unsettled items

- UNVERIFIED: per-pixel furniture geometry after a mode switch. Verify: measure the main area rect in a live PB build across the three shipped modes.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
