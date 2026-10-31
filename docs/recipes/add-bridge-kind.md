# Add a bridge kind

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/powerbrowser/INTERNAL-APIS.md`
- `$PB_REPO/scripts/check-internals-boundary.sh`
- `$PB_REPO/scripts/verify-web-tab-bridge.mjs`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`

PB core edits: 5

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

**PB core edit.** Every step below changes PB core, because a bridge kind exists only through `PowerBrowserAPI.sys.mjs`. Get approval before step 1.

## Goal

Theia frontend code calls a new Firefox capability through one new actor message `kind`.

## Before you start

- [Adding a new message kind](../02-powerbrowser-api-bridge.md#adding-a-new-message-kind), the ten-step sequence this recipe condenses.
- [Routing](../02-powerbrowser-api-bridge.md#routing-powerbrowsergroupparentreceivemessage).

## Confirm before coding

- `grep -n 'STORE_REQUEST_KINDS' "$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs"`
- `grep -n 'handleStoreRequest' "$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs"`
- `grep -n 'WEB_TAB_ACTION_KINDS' "$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs"`
- `grep -n 'FORBIDDEN_PATTERNS' "$PB_REPO/scripts/check-internals-boundary.sh"`
- `grep -n 'Touchpoints' "$PB_REPO/powerbrowser/INTERNAL-APIS.md"`
- `grep -n 'STORE_KIND_CLASSES' "$PB_REPO/scripts/verify-web-tab-bridge.mjs"`

## Steps

1. **PB core edit** Choose the dispatcher, then add the `kind` and its `case` arm at the end of `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, in that dispatcher's end-of-file section. Store reads go in `STORE_REQUEST_KINDS` with a `case` in `handleStoreRequest`. Web-tab actions that write no `tabs.sqlite` row go in `WEB_TAB_ACTION_KINDS` with a `case` in `handleWebTabAction`. Group, tab-row and window changes get a `case` in `handleGroupMutation`. In the arm, check every field (type, length, shape) before any Firefox call. Reply with `{ ok: true, kind, ... }` using JSON-safe primitives: convert a `URL` with `String(...)`. Do not add a second actor or a second boundary file.
2. **PB core edit** Classify the kind. Add a web-tab kind to `KIND_CLASSES` in `$PB_REPO/scripts/verify-web-tab-bridge.mjs`, or a store kind to `STORE_KIND_CLASSES` in the same file. The script fails a kind it cannot classify. A privileged kind (Places writes, clipboard reads) and a network kind stay out of `TAB_STORE_RELAY_KINDS`, and a privileged kind runs only from `$PB_REPO/theia/extensions/chrome-bar/src/browser/address-bar/address-bar.tsx`.
3. **PB core edit** Catalogue each forbidden pattern the kind adds. The patterns are the `FORBIDDEN_PATTERNS` array in `$PB_REPO/scripts/check-internals-boundary.sh`. Append one row per occurrence to the Touchpoints table of `$PB_REPO/powerbrowser/INTERNAL-APIS.md`. Then run `bash "$PB_REPO"/scripts/check-internals-boundary.sh` and `bash "$PB_REPO"/scripts/check-internals-boundary.sh --catalogue`, and `node "$PB_REPO"/scripts/verify-ng-040-internals-catalogue-lines.mjs`. If a line moved, run that last script once with `--fix`: it rewrites stale File:Line cells and never writes a row. A kind that adds no forbidden pattern needs no row.
4. **PB core edit** Make the frontend side match. For a store kind, add a typed method to `ChromeStoreClient` in `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`. For a web-tab kind, add its member to the `WebTabMessage` union type alias in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts` (a type alias, not a class, so there is no method to add) and send it with `WebTabChannel.send` or `WebTabChannel.request`. Read pushes with `WebTabChannel.onPush`, not a second `window` listener. Two further changes stay behind a stop: an MCP relay entry in `TAB_STORE_RELAY_KINDS` (see [add an MCP tool](add-mcp-tool.md)) and an allowlist row for a new host (see [add an outbound host](add-outbound-host.md)).
5. **PB core edit** Append one check row to `$PB_REPO/scripts/verify-platform.sh` in the quick block, next to `internals-boundary`. The row form is `"<label>|node $REPO_ROOT/scripts/<check>.mjs"`. Model the check on `verify-ng-021-places-reads.mjs`. It drives the kind from the Theia frame, includes a hostile-sender case as in `verify-ng-038-actor-sender-wall.mjs`, takes its expectations from the tree, and has `--self-test`.

## Verify

From the root of this repo, run:

- `"$PB_REPO"/scripts/verify-platform.sh --only internals-boundary`
- `"$PB_REPO"/scripts/verify-platform.sh --quick`

Both must pass, and so must `--only <your label>` for the step 5 row.

## Done when

- The new kind answers from the Theia frame, and the step 5 check covers a hostile sender.
- Every new touchpoint has a catalogue row, and `--only internals-catalogue` passes.

## Rollback

- Undo step 5: remove the check row and its script.
- Undo step 4: remove the client method and any relay entry.
- Undo step 3: remove the appended catalogue rows, then re-run the step 3 commands.
- Undo step 2: remove the classification entry.
- Undo step 1: remove the `kind`, its set entry and its `case` arm.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
