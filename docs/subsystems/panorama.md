# Panorama

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/organising-widget.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/organising-tree.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/organising-geometry.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/organising-tiling.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/docs/URI-SCHEMES.md`
- `$PB_REPO/docs/TAB-STORE.md`

Not read:
- NOT COVERED: `$PB_REPO/theia/extensions/modes/src/browser/organising-widget.ts` drag internals beyond the named symbols
- NOT COVERED: `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`
- NOT COVERED: `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`
- NOT COVERED: `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` group dispatch internals beyond `handleGroupMutation`
- NOT COVERED: live-build canvas behaviour

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

- Panorama is the Organising canvas and tree over one in-memory `GroupModel`: one ordered group list, one membership map, one active group. The toggle flips visibility only, never reloads and never loses selection.
- A group is a row drawn as a box on the canvas; a tab belongs to at most one group; ungrouped tabs sit on the canvas at their loose positions. Groups and cards never overlap: a moved or grown box pushes its neighbours away.
- Every mutation paints optimistically, persists through one actor message, and on nack or timeout keeps the painted change behind the contracted save-error bar with Retry. Retry replays the write once and reverts only if the replay fails again.
- Closing a group hides it into the undo window and writes nothing; undo restores it with no write; the timer or a quit commits the close. The last visible group never closes.
- The Browsing strip follows the active group through the same model, which loads at layout init before Organising ever opens.

## Where its data lives

- `tabs.sqlite` groups and tabs rows through chrome: group rows, membership, order, loose positions and the active group. Chrome is the single writer; the model persists through `GroupActorClient`.
- `GroupModel` in memory in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: groups, members, ungrouped list, closing groups in their undo window, active id and a bounded pending-write map.
- Session thumbnail cache inside `GroupModel` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: bounded session entries, never stored; chrome writes stock-tab thumbnails.
- Zoom is a pure view transform on the widget; bounds and card data stay untouched and nothing persists.

## Access matrix

| Frontend | Backend | Bridge | MCP | .vsix | WebExt |
| --- | --- | --- | --- | --- | --- |
| `GroupModel.createGroup`, `commitTitle`, `moveCard`, `placeCard`, `dissolveGroup`, `closeGroup`, `setActiveGroup` (writes take a `GroupActorClient` first; `reopen` and `joinActiveGroup` take none) | none | `createGroup`, `renameGroup`, `moveGroup`, `resizeGroup`, `dissolveGroup`, `closeGroup`, `setActiveGroup`, `setTabGroup`, `setTabPosition`, `setGroupOrder`, `captureShellRegion`, `trackTab`, `closeTab`, `touchTab` | `tabs_sql`, `tabs_with_places`, `tab_store_write` ops `createGroup`, `renameGroup`, `moveGroup`, `resizeGroup`, `dissolveGroup`, `setActiveGroup`, `setTabGroup`, `setTabPosition`, `setGroupOrder`, `setSetting` (no `closeGroup`) | none | none |

A group joins through `GroupModel.joinActiveGroup` (see [the tab model](../09-tabs-reference.md#the-tab-model) for which tabs join). Relay and history rules are in [the access matrix](../09-tabs-reference.md#access-matrix). Closing a group closes the group's stock tabs and is deliberately not exposed over MCP.

## APIs by layer

- `GroupModel` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: the single in-memory store behind both roots.
- `GroupModel.listGroups` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: the ordered group list.
- `GroupModel.getTabs` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: one group's cards in order.
- `GroupModel.listUngrouped` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: loose tabs.
- `GroupModel.getActiveGroupId` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: the active group id or undefined.
- `GroupModel.keyOf` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: the row key of a shell tab.
- `GroupModel.liveTabs` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: the shell's open tabs in the shape load joins on; the Organising widget is skipped by id.
- `GroupModel.showsInStrip` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: whether the Browsing strip paints a tab.
- `GroupModel.isClosing` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: whether a group is in its undo window.
- `GroupModel.isClosingKey` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: whether a row key belongs to a group in its undo window.
- `GroupModel.canCloseGroup` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: whether a group may close.
- `GroupModel.listClosing` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: groups in their undo window, in group order.
- `GroupModel.reload` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: re-reads the store against the shell's open tabs; never throws.
- `GroupModel.load` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: total parse of groups, membership and loose tabs; failures resolve with load failure set, never throw.
- `GroupModel.createGroup` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: creates an `Untitled group` box at a position. The widget `createNewGroup` in `$PB_REPO/theia/extensions/modes/src/browser/organising-widget.ts` moves captured loose tabs in with it, then focuses rename.
- `GroupModel.commitTitle` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: commits a title edit; empty reverts, over-long cuts at the cap, duplicates allowed.
- `GroupModel.moveGroup` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: moves a box; floors at zero.
- `GroupModel.resizeGroup` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: resizes a box; floors at the contracted minimum.
- `GroupModel.moveCard` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: moves a card into a group, optionally at a place; a move within one group is a pure reorder.
- `GroupModel.placeCard` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: places a loose card at a canvas position.
- `GroupModel.dissolveGroup` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: removes the box with last-card-out; any remaining tabs survive ungrouped.
- `GroupModel.closeGroup` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: closes one group into its undo window; returns its name and tab count. The widget `closeGroupById` in `$PB_REPO/theia/extensions/modes/src/browser/organising-widget.ts` refuses the last group and focuses Undo after.
- `GroupModel.commitClose` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: writes one pending close through the chrome close path, then closes the members' shell widgets. Committed by the undo timer or the quit flush via `commitAllClosing` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`.
- `GroupModel.closeCard` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: closes the tab a card stands for through Theia's own close; no membership write.
- `GroupModel.commitAllClosing` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: commits every pending close; used by the quit flush before the layout stores.
- `GroupModel.setActiveGroup` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: sets the active group.
- `GroupModel.retryPending` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: replays the pending write behind the save-error bar.
- `GroupModel.joinActiveGroup` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: appends a shell tab to the active group through the same writer; no active group leaves it loose.
- `GroupModel.undoCloseGroup` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: restores a group in its undo window with no write. The widget `undoCloseGroupById` in `$PB_REPO/theia/extensions/modes/src/browser/organising-widget.ts` pushes overlapping boxes clear and focuses the title.
- `GroupModel.reopen` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: reopens a card whose tab is not open through the opener.
- `GroupModel.rememberThumbnail` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: keeps one captured preview in the bounded session cache.
- `tabKeyOf` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: the one row-key rule for every kind of tab.
- `LiveTab` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: uri, url and title of one shell tab the shell has open.
- `PanoramaGroup` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: group id, title, bounds, active flag.
- `PanoramaTab` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: tab uri, url, title, optional thumbnail, position and open flag.
- `GROUP_TITLE_MAX_CHARS` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: the rename cap.
- `GROUP_BOX_MIN_W` and `GROUP_BOX_MIN_H` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: the group-box minimum geometry.
- `UNDO_CLOSE_MS` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: how long a closed group stays restorable.
- `planWebTabRestore` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: the launch-restore policy from the tab store settings.
- `GroupActorClient.mutate` in `$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts`: sends one mutation and resolves with the parent ack; rejects with `GroupWriteError` on nack or ack timeout.
- `GroupMutation` in `$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts`: the message kinds the parent dispatch serves for groups and tab rows.
- `GroupReply` in `$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts`: the parent ack shape.
- `GroupWriteError` in `$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts`: the nack or timeout rejection.
- `GROUP_REQUEST_EVENT` in `$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts`: the wire event carrying the request id and message, dispatched on `document` with bubbling.
- `GROUP_RESPONSE_EVENT` in `$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts`: the wire event carrying the request id and reply on `window`.
- `GROUP_ACTOR_ACK_TIMEOUT_MS` in `$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts`: the ack timeout per mutation.
- `OrganisingWidget` in `$PB_REPO/theia/extensions/modes/src/browser/organising-widget.ts`: the Panorama widget with the organising id; plain Widget owning the organising slot; canvas and tree are two render roots over the one model. Widget surface: `createNewGroup`, `closeGroupById`, `undoCloseGroupById`, `showCanvasView`, `showTreeView`, `retrySave`.
- `OrganisingContribution` in `$PB_REPO/theia/extensions/modes/src/browser/organising-widget.ts`: the view contribution registering the organising slot and opening it without activation.
- `OrganisingCommandHandler` in `$PB_REPO/theia/extensions/modes/src/browser/organising-widget.ts`: the `PanoramaCommandHandler` wired in the module.
- `buildTreeSection` in `$PB_REPO/theia/extensions/modes/src/browser/organising-tree.ts`: one group section (header with title, count and close over stacked tab rows).
- `buildTreeRow` in `$PB_REPO/theia/extensions/modes/src/browser/organising-tree.ts`: one stacked tab row (title plus mono caption, text only).
- The callbacks the widget supplies per render live in `$PB_REPO/theia/extensions/modes/src/browser/organising-tree.ts`: title, close command, activate, close, dive.
- `pushAway` in `$PB_REPO/theia/extensions/modes/src/browser/organising-geometry.ts`: separates every box from the anchor and each other, returning only the boxes that moved; the anchor never moves.
- `overlaps` in `$PB_REPO/theia/extensions/modes/src/browser/organising-geometry.ts`: whether two boxes overlap.
- `PUSH_GAP` in `$PB_REPO/theia/extensions/modes/src/browser/organising-geometry.ts`: space left between two separated boxes.
- `Box` in `$PB_REPO/theia/extensions/modes/src/browser/organising-geometry.ts`: one box (id and bounds).
- `fitTiles` in `$PB_REPO/theia/extensions/modes/src/browser/organising-tiling.ts`: the largest uniform tile at which all cards fit, or undefined when even the floor size will not fit.
- `TILE_GAP` in `$PB_REPO/theia/extensions/modes/src/browser/organising-tiling.ts`: gap between tiles on both axes.
- `TILE_ASPECT` in `$PB_REPO/theia/extensions/modes/src/browser/organising-tiling.ts`: tile height as a fraction of its width.
- `TILE_MIN_W` in `$PB_REPO/theia/extensions/modes/src/browser/organising-tiling.ts`: the smallest tile still worth rendering.
- `TileCell` in `$PB_REPO/theia/extensions/modes/src/browser/organising-tiling.ts`: column count and tile size.
- `PANORAMA_NEW_GROUP_COMMAND_ID` in `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`: new-group command with the toolbar label.
- `PANORAMA_CLOSE_GROUP_COMMAND_ID` in `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`: close-group command.
- `PANORAMA_SHOW_CANVAS_COMMAND_ID` in `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`: show-canvas command.
- `PANORAMA_SHOW_TREE_COMMAND_ID` in `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`: show-tree command.
- `PANORAMA_RETRY_SAVE_COMMAND_ID` in `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`: retry-save command.
- `PANORAMA_UNDO_CLOSE_GROUP_COMMAND_ID` in `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`: undo-close-group command.
- The handler methods wired in the module live in `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`: new group, close group, show canvas, show tree, retry save, undo close group.
- Chrome `handleGroupMutation` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`: the parent-side dispatch for the group kinds (sender wall, validation, then the store write). Prefer the `GroupModel` methods; they keep the model and store in sync.

## Events and change signals

- The model change event fires on every painted change in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`; the widget re-renders canvas and tree from it.
- Reload coalescing and the total-parse load live in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`: shell add and remove events land in one reload; load never throws.
- A quit inside an undo window commits the close for good before the layout stores.
- A hidden tab of a closing group is never the current tab of a bar.
- New tabs join the active group; the widget paints the slot Retry and replays the write on click. Joining lives in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`.
- Cards render thumbnails from the session cache or the store column; a blank capture renders the tab name, never a hatch alone.
- Drags ride pointer events with Esc cancelling the gesture and reverting its paint; nothing persists until the debounced persist lands. Drag handling lives in the organising widget in `$PB_REPO/theia/extensions/modes/src/browser/organising-widget.ts`.
- Hide events steer bars away from closing tabs in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`; the quit flush commits pending closes.

## Commands, settings and ids

- `powerbrowser.panorama.new-group`: creates an `Untitled group` box; only this command carries a label. See the new-group command id in `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`.
- `powerbrowser.panorama.close-group`: closes one group into its undo window; refused for the last visible group. See the close-group command id in `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`.
- `powerbrowser.panorama.show-canvas` and `powerbrowser.panorama.show-tree`: flip the two render roots; selection never moves. See the show-canvas and show-tree command ids in `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`.
- `powerbrowser.panorama.retry-save`: replays the pending write behind the save-error bar. See the retry-save command id in `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`.
- `powerbrowser.panorama.undo-close-group`: restores a group in its undo window with no write. See the undo-close-group command id in `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`.
- Group id pattern, bounds clamp and title cap are in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts` and enforced chrome-side: group ids, non-negative bounds, minimum box size, title cap.
- The tab store live and URL settings behind restore live in `tabs.sqlite` in `$PB_REPO/docs/TAB-STORE.md` (see [the tab model](../09-tabs-reference.md#the-tab-model)); `planWebTabRestore` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts` reads the live-minutes and URL-days values.

## Limits and rules

- The model is single: the widget is the single reader and the tree module holds no fetch, no cache and no model query of its own.
- A card's key is its identity, never its page URL; a navigation updates the row in place.
- Only chrome writes `tabs.sqlite`; the backend opens it read-only; every write goes through a bridge kind, `GroupActorClient` or the relay.
- `trackTab` refuses shell-tab key kinds that chrome writes itself; `closeTab` and `touchTab` refuse stock keys; web-tab ids match the id pattern in `$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts` and `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`.
- Rename cuts at the cap; empty reverts; duplicates are allowed. Rename runs through the model title commit in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`.
- A mode switch never ends an undo window; the closing state lives on the model, not the widget.
- Static DI binds at module load; the widget factory registers under `powerbrowser.modes.organising` and the contribution also binds as a `FrontendApplicationContribution`.
- Zoom never persists; Esc reverts a geometry gesture with its paint reverted and nothing persisted.

## Verification

- `$PB_REPO/scripts/verify-platform.sh --only gui08-panorama-copy` proves the contracted copy strings derive from both spec and source.
- `$PB_REPO/scripts/verify-platform.sh --only ng-088-group-order-across-restart` proves a hand-set group order survives a restart.
- `$PB_REPO/scripts/verify-platform.sh --only pan04-undo-close-group-live` proves the undo window hides, undoes, commits on its timer and survives mode switches in a live build.
- `$PB_REPO/scripts/verify-platform.sh --only ng-006-close-group-closes-web-tabs` proves closing a group closes its in-shell web tabs as well as its stock tabs.
- `$PB_REPO/scripts/verify-platform.sh --only ng-007-shell-tabs-keep-group-across-restart` proves shell tabs keep their group and canvas position across a restart.
- `$PB_REPO/scripts/verify-platform.sh --only ng-008-panorama-card-reopens-through-opener` proves a card for a tab that is not open reopens through the opener and a card for an open tab activates it.
- `$PB_REPO/scripts/verify-platform.sh --only pan03-strip-group-live` proves the Browsing strip follows the active group in a live build.

## PB docs and deltas

- `$PB_REPO/docs/URI-SCHEMES.md`: agrees that named-setup restore, Panorama and a Theia link open all resolve through the opener.
- `$PB_REPO/docs/TAB-STORE.md`: the tab store live and URL settings behind `planWebTabRestore` and the row-key rule.
- NOT COVERED: `$PB_REPO/docs/BUILD.md`, `$PB_REPO/docs/RELEASING.md`, `$PB_REPO/docs/CRASH-POLICY.md` and `$PB_REPO/.planning/` files on Panorama behaviour.

## Unsettled items

- UNVERIFIED: drag hit-testing on a crowded canvas. Verify: drag a card across overlapping boxes in a live PB build and read the drop target.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
