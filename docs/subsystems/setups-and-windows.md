# Setups and dependent windows

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/setups-commands.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/dependent-windows.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/docs/URI-SCHEMES.md`

Not read:
- NOT COVERED: `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`
- NOT COVERED: `$PB_REPO/theia/extensions/modes/src/browser/organising-widget.ts`
- NOT COVERED: `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` group dispatch internals beyond `handleGroupMutation`
- NOT COVERED: live-build restore behaviour

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

- A setup is a named layout saved in user storage: a name, a mode id, a windows array of verbatim rects with tab-URI lists and an active tab, plus a saved timestamp. Restoring a setup re-applies geometry, tabs and mode.
- Snapshots record opaque tab URIs so the bridge stays landable; tabs with no URI are skipped, never guessed. Unresolvable URIs drop with the contracted explanation while geometry plus mode still complete.
- The unnamed session snapshot is what a quit saves and the next launch restores when no named setup is current; it rides the profile store, not `setups.json`.
- A dependent window hosts one extractable tab-content widget in a secondary window through the stock secondary-window handler. The tab stays a core-model tab; closing the dependent returns focus to the core window and destroys nothing; a blocked popup reuses the existing throw path.
- Delete Setup is the only destructive action (contracted confirmation, no undo). Core-close carries no confirmation and the quit flush saves the session.

## Where its data lives

- `user-storage:/user/setups.json`, resolved by `setupsUri` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`. Holds a numeric `version`, a `setups` array and a `lastSession` pointer naming the setup to auto-restore or null. Absence is the default and is never created.
- `SESSION_STORAGE_KEY` in the profile store: the unnamed session snapshot the quit flush writes and the launch restore reads. Setups are app-wide user data; a session belongs to one profile.
- `SETUPS_STORE_VERSION` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: accepted store versions; newer writers read leniently with unknown fields dropped.

## Access matrix

| Frontend | Backend | Bridge | MCP | .vsix | WebExt |
| --- | --- | --- | --- | --- | --- |
| `SetupsService.saveCurrentAsSetup`, `restoreSetup`, `deleteSetup`, `openDependent`, `listRows`, `restoreWebTab` | none | none | none | none | none |

Tabs restore through the contribution open path (the opener, which delegates to each contribution's own options), not through chrome writes. See the tab restore policy in [the tab model](../09-tabs-reference.md#the-tab-model) and the bridge kinds in [the bridge](../02-powerbrowser-api-bridge.md).

## APIs by layer

- `SetupsService.saveCurrentAsSetup` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: opens the name prompt; stores the row in `setups.json` and marks it current.
- `SetupsService.restoreSetup` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: no name opens a picker; validates the row before touching the session; applies geometry verbatim with reachability clamping, places tabs, then applies the mode through `ModeService`.
- `SetupsService.deleteSetup` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: picker plus contracted confirmation; clears the current marker; changes nothing on screen; writes the store without the row.
- `SetupsService.openDependent` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: moves an extractable widget to a secondary window; defaults to the active widget; throws for non-extractable content.
- `SetupsService.listRows` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: rows for the list surface.
- `SetupsService.restoreWebTab` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: reopens one of the last session's web tabs on its own row key with optional armed history; used by the launch restore.
- `setupsUri` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: resolves the store filename.
- `SETUPS_STORE_FILENAME` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: the store file beside `modes.json`, never SQLite.
- `SESSION_STORAGE_KEY` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: the saved-session key in the profile store.
- `SetupSnapshot` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: one named setup (name, mode id, windows, saved time).
- `SetupWindowSnapshot` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: one window (verbatim rect, tab URIs, active tab, per-window mode, dock tree).
- `SetupStoreShape` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: the store (version, setups, last-session pointer).
- `SetupDock` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: main and bottom dock trees; see `SetupDockNode`.
- `SetupDockNode` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: a tabs node or a split node with orientation, sizes and children, down to the max dock depth.
- `SETUP_NAME_MAX` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: name cap while typing and at commit.
- `clampRectForDisplay` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: pulls a stored rect into view so dependents never strand off-screen; a fully reachable rect passes through untouched.
- `setupRowMeta` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: the contracted row meta line with exact singular and plural words.
- `setupSavedConfirmation` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: the contracted saved confirmation shape.
- `setupDeleteBody` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: the contracted delete confirmation body.
- `SETUP_DIALOG_TITLE` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: the save-dialog title.
- `SETUP_NAME_PLACEHOLDER` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: the save-dialog name placeholder.
- `SETUP_EMPTY_NAME_ERROR` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: contracted empty-name error; writes nothing.
- `SETUP_DUPLICATE_NAME_ERROR` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: contracted duplicate-name error; no overwrite offer.
- `SETUPS_EMPTY_HEADING` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: contracted empty-list heading.
- `SETUPS_EMPTY_BODY` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: contracted empty-list body pointing at Save Setup.
- `SETUP_RESTORE_FAILURE` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: contracted restore-failure error; the session stays untouched.
- `SETUP_SAVE_FAILURE` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: contracted save-failure error; the saved setups stay as they were.
- `SETUP_DELETE_FAILURE` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: contracted delete-failure error; the setup stays listed.
- `SETUP_GONE_TABS_NOTICE` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: contracted gone-tabs variant; geometry plus mode apply with this explanation.
- `SETUP_DEPENDENT_UNSUPPORTED` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: contracted dependent-window refusal; names no command id.
- `SETUP_MODE_FALLBACK_NOTICE` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`: contracted unknown-mode fallback notice; the shipped default shows instead.
- `SETUPS_SAVE_COMMAND_ID` in `$PB_REPO/theia/extensions/modes/src/browser/setups-commands.ts`: save-setup command with its label.
- `SETUPS_DELETE_COMMAND_ID` in `$PB_REPO/theia/extensions/modes/src/browser/setups-commands.ts`: delete-setup command with its label.
- `SETUPS_RESTORE_COMMAND_ID` in `$PB_REPO/theia/extensions/modes/src/browser/setups-commands.ts`: restore-setup command with its label; restores the named setup; no name opens a picker; View menu entry.
- `SETUPS_OPEN_DEPENDENT_COMMAND_ID` in `$PB_REPO/theia/extensions/modes/src/browser/setups-commands.ts`: open-dependent command with its label; View menu entry.
- `SETUPS_MENU` in `$PB_REPO/theia/extensions/modes/src/browser/setups-commands.ts`: the View menu group both entries live in.
- `DependentWindowsContribution` in `$PB_REPO/theia/extensions/modes/src/browser/dependent-windows.ts`: pins IDE chrome non-extractable, renders the contracted closed state on orphaned windows, returns focus to the core window on close.
- `NON_EXTRACTABLE_WIDGET_IDS` in `$PB_REPO/theia/extensions/modes/src/browser/dependent-windows.ts`: IDE-frame widget ids pinned non-extractable, so a second IDE frame stays unreachable.
- `DEPENDENT_TAB_CLOSED_HEADING` in `$PB_REPO/theia/extensions/modes/src/browser/dependent-windows.ts`: contracted tab-closed heading.
- `DEPENDENT_TAB_CLOSED_BODY` in `$PB_REPO/theia/extensions/modes/src/browser/dependent-windows.ts`: contracted tab-closed body with its window-only close.
- `DEPENDENT_CLOSE_WINDOW_LABEL` in `$PB_REPO/theia/extensions/modes/src/browser/dependent-windows.ts`: contracted window-only close label.
- Static DI binds live in `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`: `SetupsService`, `SetupsCommandContribution` (command and menu), `DependentWindowsContribution` bound statically at module load.

## Events and change signals

- The setups file loads fire-and-forget after startup; later read failures keep last good; `DELETED` resets immediately; other changes reload through a 150 ms debounce.
- The quit flush collects the session snapshot and the last-session pointer while the backend still runs; the launch restore re-applies them after core layout restore at `ready`.
- A web tab access records its last-current time on main-area change and on active-widget change for the restore plan.
- Dependent adjustments land on window loaded, never on opened; an orphaned loaded window renders the contracted closed state instead of a blank frame.
- Closing a dependent returns focus to the core window; core-close kills the session through the stock cascade with relaunch restoring via the last-session applicator.
- The mode applies through `activateMode` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`, so the panel map, Explorer dock, Organising slot, furniture and mode attribute all apply.

## Commands, settings and ids

- `powerbrowser.setups.save-setup`: opens the save name prompt; names cut at the cap; duplicates refused.
- `powerbrowser.setups.restore-setup`: restores the named setup; picker when omitted; failures leave current windows and tabs untouched.
- `powerbrowser.setups.delete-setup`: contracted confirmation; no undo.
- `powerbrowser.setups.open-dependent`: moves the current or named extractable tab to its own window; throws for page-less or non-extractable content.
- The store holds the version in `SETUPS_STORE_VERSION` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`. `activateMode` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts` applies the saved mode on restore.
- `user-storage:/user/setups.json`: the store file `SETUPS_STORE_FILENAME`.
- `powerbrowser.setups.session`: `SESSION_STORAGE_KEY` in the profile store for the unnamed session.

## Limits and rules

- Delete is the only destructive action; it carries the contracted confirmation and no undo; clearing the current marker changes nothing on screen.
- Restore validates geometry numbers before any move call; a row that cannot restore leaves the session untouched with the contracted restore-failure error.
- Gone tabs never half-apply a row: restore completes on geometry plus mode with the contracted variant explanation.
- Unknown modes resolve to Browsing with the contracted fallback notice; the stored id is never interpolated.
- Dependent windows host tab-content kinds only; IDE chrome stays pinned non-extractable, so a second IDE frame is structurally unreachable.
- One file-service write per save; the reader never sees a truncate-then-read-your-own-write.
- Theia DI binds are static at module load: a contribution bound after first enumeration is never seen.
- User-facing copy is the contracted literals only; the caught error is never interpolated into them.

## Verification

- `$PB_REPO/scripts/verify-platform.sh --only gui09-setup-roundtrip` proves the setups schema, the roundtrip and the copy contract derive from the setups sources.
- `$PB_REPO/scripts/verify-platform.sh --only gui09-setups-copy` proves the setups copy strings and the delete-confirmation danger scope derive from both sides.
- `$PB_REPO/scripts/verify-platform.sh --only ng-029-setup-restore-activates-mode` proves restoring a setup activates its mode through `ModeService`, applying panels, dock, slot, furniture and the mode attribute.
- `$PB_REPO/scripts/verify-platform.sh --only ng-030-setup-restore-opens-tabs-once` proves restoring a setup opens each tab once and never duplicates tabs already open.
- `$PB_REPO/scripts/verify-platform.sh --only ng-031-setup-commands-reachable` proves restore and dependent-open stay reachable from the palette and the View menu.
- `$PB_REPO/scripts/verify-platform.sh --only ng-036-setup-records-dock-layout` proves a setup records dock and split positions, tab order and per-window modes.

## PB docs and deltas

- `$PB_REPO/docs/URI-SCHEMES.md`: agrees that named-setup restore, Panorama and a Theia link open all resolve through the opener.
- NOT COVERED: `$PB_REPO/docs/BUILD.md`, `$PB_REPO/docs/TAB-STORE.md`, `$PB_REPO/docs/RELEASING.md`, `$PB_REPO/docs/CRASH-POLICY.md` and `$PB_REPO/.planning/` files on setups behaviour.

## Unsettled items

- UNVERIFIED: clamped geometry on a display the stored rect cannot fit. Verify: restore a setup whose rect targets a removed display in a live PB build and read the applied rect.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
