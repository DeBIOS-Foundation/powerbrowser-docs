# PowerBrowserGroup Actor Bridge (Theia frontend to Firefox chrome)

> Verified against PB 8843936 on 2026-10-21. Level: source-read

Source files:
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/powerbrowser/shell/GroupActorChild.sys.mjs`
- `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`
- `$PB_REPO/powerbrowser/shell/powerbrowser.js`
- `$PB_REPO/powerbrowser/INTERNAL-APIS.md`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-frontend-module.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/profile-storage.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/group-query-service.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-service.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`
- `$PB_REPO/theia/extensions/chrome-bar/package.json`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-places-suggestions.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-shortcuts.ts`
- `$PB_REPO/scripts/check-internals-boundary.sh`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/scripts/verify-ng-040-internals-catalogue-lines.mjs`
- `$PB_REPO/scripts/verify-ng-038-actor-sender-wall.mjs`
- `$PB_REPO/scripts/verify-ng-021-places-reads.mjs`
- `$PB_REPO/scripts/verify-ng-025-store-read-endpoint.mjs`
- `$PB_REPO/scripts/verify-ng-026-store-write-endpoint.mjs`
- `$PB_REPO/scripts/verify-web-tab-bridge.mjs`
- `$PB_REPO/scripts/verify-registry-shape.mjs`
- `$PB_REPO/docs/tab-store-access.md`
- `$PB_REPO/CLAUDE.md`

Status: working. Nothing needs enabling. The actor is registered by `TheiaService.start` through `PowerBrowserAPI.registerGroupActor()` (`registerGroupActor` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`). Senders are accepted once `TheiaService._swap` calls `PowerBrowserAPI.setGroupSenderPort(port)` (`setGroupSenderPort` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`). A valid port also installs the token-cookie strip (`installTokenCookieStrip` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`).

Unless a sentence names another file, every symbol in this doc is in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`.

## What it is

This is the only channel that carries a request from the Theia frontend (unprivileged web content at `http://127.0.0.1:<sidecar port>/`) to Firefox chrome code that holds privileges. It has these parts:

| Layer | Where | Role |
|---|---|---|
| Frontend client | Theia browser code (`ChromeStoreClient`, `GroupActorClient`, `WebTabChannel`, `ProfileStorageService`, `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts`) | Dispatches a `PowerBrowserGroupRequest` DOM `CustomEvent` with `detail: { requestId, msg }`. It listens on `window` for `PowerBrowserGroupResponse` with `detail: { requestId, reply }`. |
| Actor child | `$PB_REPO/powerbrowser/shell/GroupActorChild.sys.mjs`, class `PowerBrowserGroupChild` | Has no privileges. It forwards `msg` to the parent with `sendQuery("PowerBrowserGroupMutation", msg)` and re-dispatches the reply as a DOM event. It also re-dispatches the parent's `PowerBrowserWebTabState` pushes as DOM events. |
| Actor parent | `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, class `PowerBrowserGroupParent` | Routes the message by `msg.kind` to one of four dispatchers: `handleShellMessage`, `handleStoreRequest`, `handleWebTabAction`, `handleGroupMutation`. |
| Boundary | the file `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` | The only code permitted to touch Firefox internals (Places, SessionStore, Sqlite, IOUtils, tabbrowser and so on). The file's own comment says "the boundary is one file, not one object". It exports the frozen objects `PowerBrowserAPI`, `PowerBrowserWebTabs` (`tabIdOfBrowser`, `activeTabIdOf`, `pushPageFocus`, `relayShortcut`) and `PowerBrowserTokenCookie` (used only by the token-cookie live check's self-test). `$PB_REPO/powerbrowser/shell/powerbrowser.js` imports `PowerBrowserAPI` and `PowerBrowserWebTabs`. |

Actor name: `PowerBrowserGroup` (`GROUP_ACTOR_NAME`). Child module: `resource://powerbrowser/GroupActorChild.sys.mjs` (`GROUP_ACTOR_CHILD_MODULE`). Parent module: `chrome://powerbrowser/content/PowerBrowserAPI.sys.mjs` (`GROUP_ACTOR_PARENT_MODULE`). `matches: ["http://127.0.0.1/*"]`. The child event is `PowerBrowserGroupRequest: { capture: true, wantUntrusted: true }`.

The channel works in both directions:
- Request and reply: frontend to chrome to frontend, correlated by `requestId`.
- Push: chrome to frontend, with no request. The `PowerBrowserWebTabState` event carries `{ kind: "state" | "pageFocus" | "shortcut" | "flushShellState", ... }`.

## Use it when / Do not use it when

Use it when:
- Theia frontend code needs something only Firefox chrome holds, and one of the existing kinds already provides it: history, bookmarks, sessionstore tabs, the tab/Places join, address-bar Places search, typed-address resolution, the address bar's search engine list, search-engine suggestions for typed text, `tabs.sqlite` group and tab writes, store settings, a saved page copy, opening a stock browser tab, in-shell web-tab overlays and their session history, window drag regions, or the profile-scoped shell state file.
- You are adding a new Firefox capability for Theia. The only allowed way is a new `kind` on this channel. See "Adding a new message kind".

Do not use it when:
- The code runs in the Theia Node backend or in an external process. The actor reaches only the frontend page. For backend or agent access to the tab store, use the tab-store MCP endpoint (`/mcp`, tools `tabs_sql`, `history_entry`, `bookmark_by_url`, `bookmark_folder`, `sessionstore_tabs`, `tabs_with_places`, `tab_store_write`). The endpoint relays a fixed subset of these same kinds through a frontend window (`TAB_STORE_RELAY_KINDS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`). See [03-tab-store-mcp-server.md](03-tab-store-mcp-server.md).
- You only need data the Theia backend already has (tab rows through `GroupQueryService` in `$PB_REPO/theia/extensions/tab-uris/src/browser/group-query-service.ts` or `TabQueryService` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-service.ts`, the JSON-RPC services). Use Theia JSON-RPC and skip the round trip to chrome.
- The code runs in a stock Firefox window or in a WebExtension. The actor does not load there, and the sender gate refuses it anyway.
- You want a second actor, a second channel, or privileged code outside `PowerBrowserAPI.sys.mjs`. All three are forbidden (hard rule 2, D-96).

## How to use

### 1. Call an existing store kind from a Theia extension (preferred: reuse `ChromeStoreClient`)

`ChromeStoreClient` is bound as a singleton in `@powerbrowser/tab-uris` (`bind(ChromeStoreClient)` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-frontend-module.ts`). Add `"@powerbrowser/tab-uris": "0.1.0"` to your extension's `package.json` dependencies, as `$PB_REPO/theia/extensions/chrome-bar/package.json` does, then inject the client.

ILLUSTRATIVE: adapted from `ChromeBarPlacesSuggestions` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-places-suggestions.ts` (class name and limit simplified); not compiled.

```ts
import { inject, injectable } from '@theia/core/shared/inversify';
import { ChromeStoreClient, PlaceMatch } from '@powerbrowser/tab-uris/lib/browser/chrome-store-client';

@injectable()
export class MyThing {
    @inject(ChromeStoreClient)
    protected readonly store: ChromeStoreClient;

    async suggest(prefix: string): Promise<PlaceMatch[]> {
        // field() throws Error(reply.message) on ok:false or timeout
        return this.store.searchPlaces(prefix, 8).catch((): PlaceMatch[] => []);
    }
}
```

Typed methods on `ChromeStoreClient` (in `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`): `readHistoryEntry(url)`, `readBookmarkByUrl(url)`, `listBookmarkFolder(folderGuid)`, `projectSessionStoreTabs()`, `searchPlaces(text, limit)`, `resolveTypedAddress(text, engineName = '', canonize = false)`, `listSearchEngines()`, `placesFavicons(urls)`, `searchSuggestions(text, engineName = '')`, `autofillOrigin(text)`, `removeHistoryEntry(url)` (privileged: only `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx` may call it), `queryTabsWithPlaces(query)`, `queryTabsWithPlacesResult(query)`, `savePageCopy(uri)`. For any other kind (for example `setSetting`, which has no typed method), call `request(msg, timeoutMs)`. It never rejects and resolves to a `StoreReply`. The typed methods do reject: they throw `Error(reply.message)` on `ok:false` or timeout.

Other existing clients (inject them; do not write a new wire client):
- Group and tab-row kinds: `GroupActorClient` from `@powerbrowser/modes` (`$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts`), bound as a singleton (`bind(GroupActorClient)` in `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`). Call `mutate(msg: GroupMutation): Promise<GroupReply>`. It rejects with `GroupWriteError` on `ok:false` or after `GROUP_ACTOR_ACK_TIMEOUT_MS` (5000 ms).
- Web-tab and window kinds: `WebTabChannel` from `@powerbrowser/tab-uris` (`WebTabChannel` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`), bound as a singleton (`bind(WebTabChannel)` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`). `send(msg: ShellMessage)` is fire-and-forget; `request(msg: ShellMessage): Promise<WebTabReply>` awaits the reply (`{ ok, where?, reason?, message?, width?, index?, entries? }`) or `WEB_TAB_ACK_TIMEOUT_MS` (5000 ms). `ShellMessage` is the union `WebTabMessage | WindowMessage | TabRowMessage` (`ShellMessage` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`). `onPush(kind, handler)` subscribes to one push kind and returns a `Disposable`; `widgetOf(tabId)` returns the registered `WebTabWidget` for a pushed tab id.

### 2. The raw wire (what every client does)

This is `ChromeStoreClient.request` and the two event-name constants (`GROUP_REQUEST_EVENT`, `GROUP_RESPONSE_EVENT`), verbatim, from `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`:

```ts
const GROUP_REQUEST_EVENT = 'PowerBrowserGroupRequest';
const GROUP_RESPONSE_EVENT = 'PowerBrowserGroupResponse';

request(msg: StoreMessage, timeoutMs = STORE_ACK_TIMEOUT_MS): Promise<StoreReply> {
    const requestId = `store-${msg.kind}-${Date.now().toString(36)}-${(this.seq += 1)}`;
    return new Promise<StoreReply>(resolve => {
        const settle = (reply: StoreReply): void => {
            window.removeEventListener(GROUP_RESPONSE_EVENT, onResponse);
            window.clearTimeout(timer);
            resolve(reply);
        };
        const onResponse = (event: Event): void => {
            const detail = (event as CustomEvent).detail as { requestId?: unknown; reply?: unknown } | undefined;
            if (!detail || detail.requestId !== requestId) {
                return;
            }
            settle(detail.reply && typeof detail.reply === 'object'
                ? detail.reply as StoreReply
                : { ok: false, reason: 'validation', message: 'malformed reply' });
        };
        const timer = window.setTimeout(() => settle({ ok: false, reason: 'timeout', message: `no reply to ${msg.kind}` }), timeoutMs);
        window.addEventListener(GROUP_RESPONSE_EVENT, onResponse);
        // document + bubbles: the actor child listens on the window root (GroupActorClient records why).
        document.dispatchEvent(new CustomEvent(GROUP_REQUEST_EVENT, { bubbles: true, detail: { requestId, msg } }));
    });
}
```

Steps:
1. Build `msg = { kind: '<kind>', ...fields }`. Every field must be JSON-safe primitives, arrays, or plain objects.
2. Make a unique `requestId` string. The existing clients use the pattern `<prefix>-<kind>-<base36 time>-<seq>`.
3. Add a `window` listener for `PowerBrowserGroupResponse` before you dispatch, and filter on `detail.requestId`.
4. Dispatch on `document` with `bubbles: true`. Dispatching on `window`, or without `bubbles`, never reaches the actor (see Gotchas).
5. Start a timeout. The existing values are 5000 ms for group, web-tab and shell kinds (`GROUP_ACTOR_ACK_TIMEOUT_MS`, `WEB_TAB_ACK_TIMEOUT_MS`, `SHELL_STATE_ACK_TIMEOUT_MS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/profile-storage.ts`), 8000 ms for store reads (`STORE_ACK_TIMEOUT_MS`), and 120000 ms for `savePageCopy` (`SAVE_PAGE_ACK_TIMEOUT_MS`).
6. Branch on `reply.ok`. On `false`, read `reply.reason` (`"validation"`, `"store"`, or the client-made `"timeout"`) and `reply.message`.

### 3. Listen for chrome pushes

Subscribe through `WebTabChannel.onPush(kind, handler)`. The channel adds the one `window` listener for `PowerBrowserWebTabState` and routes each push to the handlers registered for its `kind` (`onState` and `pushHandlers` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`). A handler that throws is logged and does not stop the other handlers.

ILLUSTRATIVE: assembled from `WebTabChannel.onPush` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`; not compiled.

```ts
import { inject, injectable } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { WebTabChannel } from '@powerbrowser/tab-uris/lib/browser/web-tab';

@injectable()
export class MyPushListener implements FrontendApplicationContribution {
    @inject(WebTabChannel)
    protected readonly channel: WebTabChannel;

    onStart(): void {
        // detail.kind is one of 'state' | 'pageFocus' | 'shortcut' | 'flushShellState'
        this.channel.onPush('pageFocus', detail => {
            const tabId = typeof detail.tabId === 'string' ? detail.tabId : null;
            // ...
        });
    }
}
```

`ShellStateFlushContribution.onStart` in `$PB_REPO/theia/extensions/tab-uris/src/browser/profile-storage.ts` subscribes the same way, with `this.channel.onPush(SHELL_FLUSH_KIND, ...)`. Treat every field of `detail` as untrusted and check its type.

## Reference

### Envelope

| Direction | Event (DOM) | `detail` |
|---|---|---|
| frontend to child | `PowerBrowserGroupRequest` (dispatched on `document`, `bubbles: true`) | `{ requestId: string (non-empty), msg: { kind: string, ...fields } }` |
| child to parent | actor query `PowerBrowserGroupMutation` | `msg` unchanged |
| child to frontend | `PowerBrowserGroupResponse` (dispatched on `window`) | `{ requestId, reply }` |
| parent to child to frontend | actor message `PowerBrowserWebTabState`, re-dispatched as the DOM event of the same name | push payload (below) |

Reply shape. Success is `{ ok: true, kind, ...fields }`. Failure is `{ ok: false, reason: "validation" | "store", message: string }`.

The child (`PowerBrowserGroupChild.handleEvent` in `$PB_REPO/powerbrowser/shell/GroupActorChild.sys.mjs`) drops a request silently, with no reply, when `requestId` is not a non-empty string, `msg` is missing, or `msg.kind` is not a string. The client then times out. If `sendQuery` throws synchronously, or its promise rejects, the child replies `{ ok:false, reason:"store", message }`, where `message` is the error's message text.

### Routing (`PowerBrowserGroupParent.receiveMessage`)

The checks run in this order:

1. `kind` in `SHELL_MESSAGE_KINDS` goes to `PowerBrowserAPI.handleShellMessage`.
2. `kind` in `STORE_REQUEST_KINDS` (`isStoreRequestKind`) goes to `handleStoreRequest`, a module function.
3. `kind` in `WEB_TAB_ACTION_KINDS` goes to `handleWebTabAction`, a module function in the file's Phase 27 end-of-file section.
4. Any other kind goes to `PowerBrowserAPI.handleGroupMutation`. An unknown kind replies `{ok:false, reason:"validation", message:"handleGroupMutation: unknown kind <kind>"}`.

### Sender gating

| Gate | Applies to | Rule |
|---|---|---|
| `matches` pin | all | The child loads only in documents on `http://127.0.0.1/*`. Host only; a match pattern cannot carry a port. |
| `groupSenderIsTheia(actorRef)` | all four dispatchers | All of these must hold: the top browsing context's embedder element has `primary="true"`; that embedder has `id === "powerbrowser-content"` (`SHELL_CONTENT_BROWSER_ID`) and its `ownerDocument.documentURI === "chrome://powerbrowser/content/powerbrowser.xhtml"` (`SHELL_DOCUMENT_URL`); `groupSenderPort !== null`; the sender document's port equals `groupSenderPort`; and the spec is `http:` on host `127.0.0.1` or `localhost` (`groupSenderSpecIsTheia`). |
| `setGroupSenderPort(port)` | all | Called only from `TheiaService._swap` (`setGroupSenderPort` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`) before the Theia frame navigates. Until it runs, or after a non-positive or non-integer port, every sender is refused. |
| `storeSenderInShellWindow(actorRef)` | store kinds only | The top embedder's `ownerDocument.documentElement` must have `windowtype="powerbrowser:main"`. |

If a gate refuses the sender, the reply is `{ok:false, reason:"validation"}` with message `"handleShellMessage: rejecting non-Theia-origin sender"`, `"handleGroupMutation: rejecting non-Theia-origin sender"`, `"handleWebTabAction: rejecting non-Theia-origin sender"`, or `"handleStoreRequest: refusing a sender outside the shell's Theia frame"`.

Consequences:
- A loopback page in a stock tab or in a web-tab overlay is refused, because its embedder has no `primary`, or its embedder is not `powerbrowser-content`.
- Only the shell's own Theia frame can use this channel.
- UNVERIFIED: an iframe inside the Theia frame would plausibly pass the gate, because `groupSenderIsTheia` checks the top context's embedder plus the sender document's own URI and port, and a same-origin iframe has the same top embedder. Verify: read `groupSenderIsTheia` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` and send a request from a same-origin iframe in the built shell.

### Error classification

- `handleGroupMutation` catch: if the thrown message matches `/refusing|unknown/`, the reason is `"validation"` and the raw message is returned. That message can echo the uri or id you sent. Any other error gives `reason:"store"` with the fixed message `"handleGroupMutation: the tab store write failed"`.
- `handleStoreRequest` catch: a message matching `/^\w+: (refusing|unknown)\b/` is returned as `"validation"`. Any other error gives `reason:"store"` with `"handleStoreRequest: <kind> failed in the store"`.
- `handleShellMessage` catch: `reason:"store"` with `"handleShellMessage: <kind> failed (store <err.name>)"`.
- `handleWebTabAction` has no catch of its own. Its refusals are returned directly as `reason:"validation"` (messages in the web-tab action table below). An exception thrown inside it rejects the promise that `PowerBrowserGroupParent.receiveMessage` returns; the child's rejection handler then replies `{ ok:false, reason:"store", message }` with `message` taken from the rejection. UNVERIFIED: the exact message text the child receives when a parent `receiveMessage` promise rejects (Gecko's JSActor query rejection may pass the raw error text or a generic one). Verify: read the JSActor query-rejection path in the pinned checkout under `$PB_REPO/upstream/dom/ipc/jsactor/`, or plant a throw in a `handleWebTabAction` arm and read the reply in the built shell.

### Shell kinds (`handleShellMessage`)

These are profile-scoped JSON state (`<profile>/powerbrowser-shell-state.json`, `SHELL_STATE_FILE_NAME`) and quit-flush acknowledgements. They are used by `ProfileStorageService` (`ProfileStorageService` in `$PB_REPO/theia/extensions/tab-uris/src/browser/profile-storage.ts`).

| kind | Request fields | Success reply | Validation / errors |
|---|---|---|---|
| `shellStateLoad` | none | `{ok, kind, state: string}`. `state` is `"{}"` when the file is absent. | `store` if the file is longer than 16 MiB (`SHELL_STATE_MAX_CHARS`). |
| `shellStateSave` | `state: string` (JSON object text) | `{ok, kind}` | `validation` if `state` is not a string, is over 16 MiB, or does not parse to a non-array object. The write is atomic (`tmpPath`). The frontend sends the whole map; there is no merge. |
| `shellFlushed` | `flushId: string` | `{ok, kind}` | Resolves the pending `flushShellState` wait. An unknown id still returns ok. |
| `shellArmWebTabHistory` | `key: string` matching `/^web:[A-Za-z0-9_-]{1,64}$/` | `{ok, kind}` | `validation` on a malformed key. Arms a one-time restore of the saved back/forward history for that web-tab row. |

### Group and tab mutation kinds (`handleGroupMutation`)

These write `tabs.sqlite` through the single chrome writer. Typed in `GroupMutation` (`GroupMutation` in `$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts`). Client: `GroupActorClient.mutate(msg)` (5 s timeout; rejects `GroupWriteError` with `.reason` `'validation' | 'store' | 'timeout'`).

| kind | Request fields | Success reply | Validation / errors |
|---|---|---|---|
| `createGroup` | `id`, `title?`, `x?`, `y?`, `w?`, `h?`, `isActive?` | `{ok, kind, id}` | `id` must match `/^[A-Za-z0-9_-]{1,128}$/` ("refusing malformed group id"). `title` must be a string or absent. It is trimmed and cut to 60 chars (`GROUP_TITLE_MAX`); an empty title becomes `"Untitled group"`. Bounds must be finite. They are floored and clamped to `[floor, GROUP_BOUNDS_MAX]`, where the floor is x/y 0, w 200, h 144. This is an upsert: an existing id is overwritten. |
| `moveGroup` | `id`, `x`, `y` | `{ok, kind, id}` | "unknown group <id>" if the row is missing. Keeps the other columns. |
| `resizeGroup` | `id`, `w`, `h` | `{ok, kind, id}` | Same as `moveGroup`. |
| `renameGroup` | `id`, `title` | `{ok, kind, id}` | Same as `moveGroup`, plus the title rules. |
| `dissolveGroup` | `id` | `{ok, kind, id}` | Empty id is refused. Ungroups the members and deletes the group in one transaction. Tabs survive. |
| `closeGroup` | `id` | `{ok, kind, id}` | Empty id is refused. Closes the group's stock tabs (`closeGroupRows` -> `closeStockTabByUri`), marks every member row closed (`closed_at`, `group_id` cleared) and deletes the group. It does not close web-tab or Theia widgets; `GroupModel.commitClose` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts` does that after the mutate. Call `GroupModel.closeGroup` / `commitClose`, not the raw kind. An unknown id succeeds (it is idempotent and returns `"already-closed"` internally). It is deliberately not exposed to the MCP write tool. |
| `setActiveGroup` | `id` | `{ok, kind, id}` | Unknown or empty id is refused. Exactly one group ends up active. |
| `setTabGroup` | `uri`, `groupId: string \| null` (undefined is treated as null) | `{ok, kind, uri}` | "unknown tab URI" or "unknown group". Private-window tabs have no rows, so they are refused. |
| `setTabPosition` | `uri`, `x: number \| null`, `y: number \| null` | `{ok, kind, uri}` | Unknown uri is refused. An empty or non-string uri replies `store`, not `validation` (its error text has no `refusing`/`unknown`). A null or undefined in either coordinate clears both. Values are floored and clamped to 0..10000. |
| `setGroupOrder` | `groupId`, `uris: string[]` | `{ok, kind, id: groupId}` | Unknown group is refused, and so is any uri that is not a member of the group. A non-string or empty `groupId` or a non-array `uris` replies `store`, not `validation` (their error texts have no `refusing`/`unknown`). The order is written in one transaction. |
| `trackTab` | `uri`, `url`, `title` | `{ok, kind, uri}` | `uri` must be a non-empty string of at most 2048 chars and must not start with `stock:`, `web:`, `webview:`, `http:` or `https:`, case-insensitive (it is a Theia widget address). `url` is cut to 2048, `title` to 512. |
| `closeTab` | `uri` | `{ok, kind, uri}` | Non-empty, at most 2048 chars, no `stock:` prefix ("refusing malformed tab key"). Sets `closed_at`. |
| `touchTab` | `uri` | `{ok, kind, uri}` | Same as `closeTab`. Sets `last_accessed`. |
| `captureShellRegion` | `rect: {x,y,w,h}` | `{ok, kind, png: string \| null}` (data URL) | Never fails. Returns null when w or h is under 8, when the capture fails, or when the result is over the size cap. It captures the sender's own Theia `<browser>` element. |

### Navigation, web-tab and window kinds (also `handleGroupMutation`)

Clients: `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts` (`openStockTab`, `probeChannel`) and `WebTabChannel` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts` (`webTab*`). Each `webTab*` kind in this table first checks `tabId` against `/^[A-Za-z0-9_-]{1,64}$/` (`webTabIdIsValid`) and replies `validation` with "refusing malformed tabId" if it fails. Each reply carries a `where` outcome word. `ok:true` does not mean the action happened; read `where`.

| kind | Request fields | Success reply | Validation / `where` values |
|---|---|---|---|
| `openStockTab` | `url?: string` | `{ok, kind, where}` | `url` must be `about:newtab`, or `http(s)://`, or empty (which becomes `about:newtab`). `where`: `"opened-tab"`, `"opened-window"`, `"refused-scheme"`. Uses the most recent `navigator:browser` window. |
| `webTabOpen` | `tabId`, `url`, `key?` | `{ok, kind, where}` | `key`, if present, must match `/^web:[A-Za-z0-9_-]{1,64}$/`. `url` must be `about:blank` or `http(s)://`; empty or missing becomes `about:blank`. `where`: `"opened"`, `"already-open"`, `"refused-scheme"`. Creates a `<browser>` overlay in the sender's window. The load uses a null principal. |
| `webTabGeometry` | `tabId`, `x`, `y`, `w`, `h`, `visible` | `{ok, kind, where}` | All four numbers must be finite ("refusing non-finite geometry"). `where`: `"applied"`, `"unknown-tab"`. |
| `webTabNavigate` | `tabId`, `url` | `{ok, kind, where}` | Same `url` rule as `webTabOpen`. `where`: `"loading"`, `"refused-scheme"`, `"unknown-tab"`. |
| `webTabClose` | `tabId` | `{ok, kind, where}` | `where`: `"closed"`, `"unknown-tab"`. |
| `webTabBack` / `webTabForward` / `webTabFocus` | `tabId` | `{ok, kind, where}` | `where`: `"done"`, `"unknown-tab"`. |
| `webTabReload` | `tabId`, `bypassCache?: boolean` | `{ok, kind, where}` | `where`: `"done"`, `"unknown-tab"`. Only `bypassCache === true` counts; it reloads with `LOAD_FLAGS_BYPASS_PROXY \| LOAD_FLAGS_BYPASS_CACHE` (Firefox's hard reload). Any other value is a normal reload. |
| `probeChannel` | none | `{ok, kind}` | No side effects. Use it once, off the click path, to learn whether the channel is live. |
| `windowChrome` | none | `{ok, kind, width: number}` | The width of chrome's window buttons in the sender's window. |
| `windowDragRegions` | `rects: {x,y,w,h}[]`, `height: number` | `{ok, kind}` | `rects` must be an array of finite rects and `height` must be finite ("refusing malformed drag regions"). Sets the window-drag handles on the sender's window. |

Overlays are destroyed when the frontend WindowGlobal that opened them goes away (`PowerBrowserGroupParent.didDestroy` calls `webTabDropOwnedBy`).

### Web-tab action kinds (`handleWebTabAction`)

`WEB_TAB_ACTION_KINDS` routes these kinds to `handleWebTabAction`. They need no `tabs.sqlite` write. Client: `WebTabChannel` (`WebTabWidget.stop`, `WebTabWidget.history`, `WebTabWidget.gotoIndex` and `WebTabActivationContribution` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`). Each kind except `webTabActivated` checks `tabId` with `webTabIdIsValid` and refuses with `"handleWebTabAction: refusing malformed tabId"`. `webTabActivated` also accepts `tabId: null`. An unknown kind in this dispatcher replies `"handleWebTabAction: unknown kind"`.

| kind | Request fields | Success reply | Validation / `where` values |
|---|---|---|---|
| `webTabStop` | `tabId` | `{ok, kind, where}` | Stops the overlay's load. `where`: `"done"`, `"unknown-tab"`. |
| `webTabHistory` | `tabId` | `{ok, kind, where, index, entries}` | `where`: `"done"`, `"empty"` (with `index: -1`, `entries: []`), `"unknown-tab"` (no `index` or `entries`). `index` is the current session-history index. `entries` is `{index, title, url}[]` in ascending order, a window of at most 15 around the current entry (Firefox's `FillHistoryMenu` window). `title` and `url` are strings. |
| `webTabGotoIndex` | `tabId`, `index: integer` | `{ok, kind, where}` | `where`: `"done"`, `"unknown-tab"`. An index that is not an integer, is negative, or is at or past the history count is refused with `"handleWebTabAction: refusing an out-of-range history index"`. |
| `webTabActivated` | `tabId: string \| null` | `{ok, kind, where: "applied"}` | Records which web tab is selected in the sender's Theia frame (`null`: a non-web widget is current). The answer is keyed by the sender's own embedder element, never by an id the frame supplies. `PowerBrowserWebTabs.activeTabIdOf(theiaBrowser)` reads it. |

### Store kinds (`handleStoreRequest`, extra shell-window gate)

Client: `ChromeStoreClient`. Every URL in a reply is a string.

| kind | Request fields | Success reply | Validation / errors |
|---|---|---|---|
| `readHistoryEntry` | `url` (non-empty string, at most 8192 chars) | `{ok, kind, entry: {url, title} \| null}` | "refusing a missing or oversized url". Returns null if the page is unknown or Places fails. |
| `readBookmarkByUrl` | `url` (same rule) | `{ok, kind, bookmark: {guid, title, url} \| null}` | Same as above. Takes the first match. |
| `listBookmarkFolder` | `folderGuid` matching `/^[A-Za-z0-9_-]{12}$/` | `{ok, kind, rows: {guid,title,url}[]}` | "refusing a malformed folderGuid". Returns `[]` on any Places failure. |
| `projectSessionStoreTabs` | none | `{ok, kind, rows: {uri, url, title, last_active, last_accessed: number \| null}[]}` | Covers stock tabs keyed `stock:` that have a history entry. `last_active` is the read time. Private windows are skipped (`parseSessionStoreTabRows`). The TS type `SessionTabRow` omits `last_accessed`. |
| `queryTabsWithPlaces` | `bookmarked?: boolean`, `open?: boolean`, `limit?: integer` (clamped to 1..1000, default 200) | `{ok, kind, rows: TabPlacesRow[], truncated: boolean}` | Scans the most recent `tabs.sqlite` rows up to `TAB_PLACES_SCAN_CAP` (5000) and sorts by frecency, highest first. Fields of type `TabPlacesRow`: `uri, url, title, group_id, last_active, closed_at, open, visited, frecency, visit_count, last_visit, bookmark_guid, bookmark_title`. |
| `searchPlaces` | `text: string` (cut to 256), `limit?: integer` (1..50, default 8) | `{ok, kind, rows: {url, title, frecency, bookmarked}[]}` | Empty or blank text returns `[]`. Only http(s) URLs are returned. Bookmarks come first, then the rest by frecency. LIKE wildcards are escaped. |
| `setSetting` | `key`, `value: string` | `{ok, kind, key}` | `key` must be one of `closed_retention_days` (0..3650), `integrity_check_minutes` (>0..525600), `restore_behaviour` (`session` or `none`), `restore_live_minutes` (0..10080), `restore_url_days` (0..3650) (`STORE_SETTING_RULES`). Numbers are decimal strings. It only updates an existing row and never inserts. |
| `savePageCopy` | `uri` (a tab row key, at most 8192 chars) | `{ok, kind, dir: string (absolute path under <profile>/saved-pages/), bytes: number}` | Errors: "unknown tab", "refusing a private tab", "refusing a page that is not http or https", "unknown profile directory". Upserts the `saved_pages` row and deletes the previous copy. Use a 120 s timeout. |
| `resolveTypedAddress` | `text: string` (non-blank, at most 2048 chars), `engineName?: string` (at most 256 chars; empty or absent means the default engine), `canonize?: boolean` (only `true` counts; the chrome bar sends it for Ctrl+Enter) | `{ok, kind, resolved: {kind, url?, engineName?}}` | Refusals: `"resolveTypedAddress: refusing empty or oversized text"` and `"resolveTypedAddress: refusing a malformed engine name"`; both match the `/^\w+: (refusing\|unknown)\b/` classifier, so they arrive as `validation`. `resolved.kind` is `"visit"` (URI fixup gave an http(s) URL; a schemeless dotted host is upgraded to `https://` by `upgradeSchemeless`, except `localhost` and `*.localhost` hosts, IP literals and hosts with an explicit port, which keep fixup's `http://`), `"search"` (keyword text; `url` is the bar engine's submission URL and `engineName` the engine used), `"refused"` (fixup failed, the result is not http(s), or the engine's submission is a POST or not http(s)), or `"no-engine"` (a named engine is not in the bar's set, or there is no engine). With `canonize: true` and trimmed text that has no dot, colon or whitespace before its first slash, chrome first completes a bare name to `www.<name><locale suffix>` (`Services.locale.urlFixupSuffix`, `.com` in en-US) through `Services.uriFixup.getFixupURIInfo` with `FIXUP_FLAGS_MAKE_ALTERNATE_URI`, as Firefox's `UrlbarInput._maybeCanonizeURL` does (`example` becomes `https://www.example.com/` with the default `browser.fixup.alternate.protocol`); a fixup throw leaves the text as typed, and the result then takes the ordinary resolve path and its http(s) wall. Typed text is never logged. Typed client: `ChromeStoreClient.resolveTypedAddress(text, engineName = '', canonize = false)` returning `Promise<ResolvedAddress>`. |
| `listSearchEngines` | none | `{ok, kind, engines: {name, icon: string \| null}[], defaultName: string}` | The engines the address bar offers (`barEngines`), in order: Gecko's visible engines, minus the app-provided ones when `$PB_REPO/configuration.toml` supplied engines through the `SearchEngines` policy (`configuredEnginesActive`). `icon` is a `data:image/` string of at most 65536 chars, otherwise null. `defaultName` is the default bar engine's name, or `""`. Typed client: `ChromeStoreClient.listSearchEngines()` returning `Promise<SearchEngineList>`. |
| `placesFavicons` | `urls: string[]` (only the first 10 are read; each must be an http(s) URL of at most 8192 chars, others are skipped) | `{ok, kind, icons: Record<string, string>}` | "refusing a malformed url list" when `urls` is not an array. Reads only the Places favicon cache (16 px), so it never fetches. Each value is a `data:image/` string of at most 65536 chars; a URL with no cached icon is left out. Typed client: `ChromeStoreClient.placesFavicons(urls)`. |
| `searchSuggestions` | `text: string` (non-blank, at most 2048 chars), `engineName?: string` (at most 256 chars; empty or absent means the default engine) | `{ok, kind, rows: string[]}` | Refusal: `"searchSuggestions: refusing empty or oversized text or a malformed engine name"` (arrives as `validation`). Chrome re-resolves the text with `resolveTypedAddress` and fetches only when it resolves as `"search"`, so URL-shaped text never reaches an engine. It fetches through Gecko's `SearchSuggestionController` from the bar engine (at most 4 remote suggestions, each a string of at most 512 chars). One controller per Theia frame: a newer request stops the one in flight. Text that is not a search, no bar engine, or a failed fetch gives `rows: []`. This kind sends typed text off the machine. Typed client: `ChromeStoreClient.searchSuggestions(text, engineName = '')` returning `Promise<string[]>`. |
| `autofillOrigin` | `text: string` | `{ok, kind, completion: {text, url} \| null}` | No refusal: text that is not a string, is empty, is longer than 253 chars, or contains whitespace, `/`, `:`, `?` or `#` gives `completion: null` before any query. Chrome lowercases the text and runs one read-only, parameter-bound `SELECT prefix, host FROM moz_origins` on the Places reader connection: the visited `http://` or `https://` origin with frecency above 0 and the highest frecency whose host, or `www.` plus host, starts with the text. `completion.url` is `<prefix><host>/`; `completion.text` is `<host>/`, with a leading `www.` removed when the typed text does not start with `www.`. No match gives null. It depends on the Places internal `moz_origins` schema (`prefix`, `host`, `frecency`). Typed client: `ChromeStoreClient.autofillOrigin(text)` returning `Promise<{text, url} \| null>`. |
| `removeHistoryEntry` | `url` (non-empty string, at most 8192 chars, http(s) only) | `{ok, kind, removed: boolean}` | Refusals: "handleStoreRequest: refusing a missing or oversized url" and "removeHistoryEntry: refusing a non-http(s) url" (both arrive as `validation`). Calls `PlacesUtils.history.remove(url)`, which, per the comment above `removeHistoryEntry` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, also clears the page's visits, frecency and `moz_origins` row; `removed` is true when Places held the page. This is a Places write and the first store kind classed `privileged`: the privileged-kind rule lets only an event handler in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx` (the address bar's Shift+Delete on a history row) send it, through `ChromeStoreClient.removeHistoryEntry(url)`, never a command or a key row. The URL is never logged, and a Places error crosses back only as the fixed `store` text. Typed client: `ChromeStoreClient.removeHistoryEntry(url)` returning `Promise<boolean>`. |

None of `resolveTypedAddress`, `listSearchEngines`, `placesFavicons`, `searchSuggestions`, `autofillOrigin` and `removeHistoryEntry` is relayed to the MCP endpoint: `TAB_STORE_RELAY_KINDS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts` does not list them. `STORE_KIND_CLASSES` in `$PB_REPO/scripts/verify-web-tab-bridge.mjs` classes `resolveTypedAddress`, `listSearchEngines`, `placesFavicons` and `autofillOrigin` as `read`, `searchSuggestions` as `network` (the first network kind) and `removeHistoryEntry` as `privileged` (the first privileged kind); neither a network nor a privileged kind ever enters `TAB_STORE_RELAY_KINDS`. Rule 12 of that script fails a call to a privileged kind's `ChromeStoreClient` method from any file other than `chrome-store-client.ts` and `chrome-bar-widget.tsx`, but it scans only the `chrome-bar` and `tab-uris` extension sources; the rule itself binds every extension.

### Push messages (`PowerBrowserWebTabState`)

All pushes ride the one actor message `PowerBrowserWebTabState`. `sendWebTabPush` sends `pageFocus` and `shortcut`; `webTabPush` sends `state`; `flushShellState` sends its own.

| `kind` | Payload | Sent by | Consumer |
|---|---|---|---|
| `state` | `{kind, tabId, url, title, loading: boolean, canGoBack: boolean, canGoForward: boolean}` | `PowerBrowserAPI.webTabPush`, flushed by `scheduleWebTabState`: navigation and title events of an overlay are coalesced to at most one push per tab per animation frame of the shell window (the latest event wins; a tab whose overlay is gone or was replaced is skipped). URL, title and history flags are read at flush time. | `WebTabChannel` subscribes `onPush('state', ...)` in its `init` and calls `WebTabWidget.applyState`. |
| `pageFocus` | `{kind, tabId: string \| null}` | `PowerBrowserWebTabs.pushPageFocus(theiaBrowser, tabId)`, called by the focus tracker in `$PB_REPO/powerbrowser/shell/powerbrowser.js` on every focus and blur in the shell window. `tabId` is the focused overlay's tab id, or null when no page has focus. A repeat of the last answer to the same frontend WindowGlobal is not sent. | `ChromeBarShortcutRelay` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-shortcuts.ts`: sets the context key `powerbrowser.webPageFocused` (`PAGE_FOCUS_CONTEXT_KEY`) and marks the focused page's tab current without activating it. |
| `shortcut` | `{kind, id, tabId}` | `PowerBrowserWebTabs.relayShortcut(theiaBrowser, overlay, id, landsInTheia)`, called by the page-scoped key rows (`PAGE_KEYS` in `$PB_REPO/powerbrowser/shell/powerbrowser.js`), the F6 reply listener and the mouse back and forward buttons. `id` must match `^[A-Za-z0-9]{1,32}$` (otherwise `"refused-id"`, no push). `tabId` is derived from the overlay that had focus, never from Theia's current widget (no overlay: `"no-page"`, no push). When `landsInTheia` is true the Theia frame is focused first. | `ChromeBarShortcutRelay`: runs the action for `id` (`ChromeBarShortcutRelay.actions`) on `WebTabChannel.widgetOf(tabId)` only. |
| `flushShellState` | `{kind, flushId}` | `PowerBrowserAPI.flushShellState` at quit | `ShellStateFlushContribution`. It must answer with the `shellFlushed` request carrying the same `flushId`, or chrome stops waiting at its timeout. |

## Adding a new message kind

Only do this when no existing kind covers the need. Steps marked **PB core edit** change tracked files in `$PB_REPO`; stop and ask the user before each one ([Stop and ask](_shared/RULES.md#stop-and-ask)). The steps:

1. **PB core edit**: **Pick the dispatcher.** Reads of user stores (history, bookmarks, sessions, files) go in `STORE_REQUEST_KINDS` plus a `case` in `handleStoreRequest`. These get the extra shell-window gate. Web-tab actions that write no `tabs.sqlite` row go in `WEB_TAB_ACTION_KINDS` plus a `case` in `handleWebTabAction`. Group, tab-row and window actions get a `case` in `handleGroupMutation`. Profile state goes in `SHELL_MESSAGE_KINDS` plus `handleShellMessage`. Never add a second actor, a second `registerWindowActor`, or a second boundary file.
2. **PB core edit**: **Put new code in an end-of-file section of `PowerBrowserAPI.sys.mjs`.** The file ends in several such sections on purpose (the store request channel, the Phase 27 web-tab action section, the Phase 29 search area), so the `File:Line` references in `$PB_REPO/powerbrowser/INTERNAL-APIS.md` do not move. That file's header rule "Append-only rule (Phase 27)" states: a new touchpoint is a new row appended at the end of the Touchpoints table; new boundary code goes in an end-of-file section; an existing line changes in place; `$PB_REPO/scripts/verify-ng-040-internals-catalogue-lines.mjs` with `--fix` runs after every edit of the boundary file, and it never writes a row.
3. **PB core edit**: **Classify the kind.** The header rule "Privileged-kind rule (Phase 27; store kinds, Phase 29)" in `$PB_REPO/powerbrowser/INTERNAL-APIS.md` states: a `webTab*` kind that changes state outside a tab's own navigation, lifecycle or selection (permissions, site data, Places writes, clipboard, stock pages) runs only from a widget event handler and never gets a command id or a key-relay row. Every `case "webTab…"` arm is classified in `KIND_CLASSES` in `$PB_REPO/scripts/verify-web-tab-bridge.mjs`, so an unclassified kind fails there. Store kinds are classified the same way in `STORE_KIND_CLASSES` (rule 12 of that script): a privileged store kind (Places writes or clipboard reads) runs only from a `chrome-bar-widget.tsx` event handler through its same-named `ChromeStoreClient` method, and neither a privileged nor a network kind (one that sends user input off the machine) enters `TAB_STORE_RELAY_KINDS`. The same script also requires `WEB_TAB_ACTION_KINDS` to equal the `case` arms of `handleWebTabAction`, `STORE_REQUEST_KINDS` to equal the arms of `handleStoreRequest`, and every pushed kind to have an `onPush` subscriber.
4. **PB core edit**: **Validate every field in chrome.** Check type, length, and regex shape before any store or Firefox call. Throw `new Error("<function>: refusing ...")` or `"<function>: unknown ..."` so the catch classifies the error as `validation` (`handleWebTabAction` has no catch: return the refusal reply directly, as its arms do). Any other error is reported as `store` with a fixed text. Never put a URL, title or path from an internal error into a reply or a log.
5. **PB core edit**: **Reply with structured-clone-safe primitives**, `{ ok: true, kind, ...fields }`. Convert Places `URL` objects with `String(...)`. They do not clone.
6. **PB core edit**: **Catalogue every new forbidden-pattern occurrence.** The exact list is the `FORBIDDEN_PATTERNS` array in `$PB_REPO/scripts/check-internals-boundary.sh`: `Services.`, `Cc[`, `Cc.`, `Ci.`, `Cr.`, `Cu.`, `Components.classes`, `Components.interfaces`, `AppConstants`, `ChromeUtils.import`, `ChromeUtils.defineESModuleGetters`, `ChromeUtils.registerWindowActor`, `nodePrincipal`, `fixupAndLoadURIString`, `wrappedJSObject`, `drawSnapshot`, `IOUtils`, `SessionStoreUtils`, `ChromeUtils.generateQI`, `JSWindowActorParent`, `JSWindowActorChild`, `gBrowser`, `PopupNotifications`, `nsContextMenu`, `browserDOMWindow`, `openLinkIn`, `FullScreen`, `XULBrowserWindow`. Read the array before you rely on this list. Each occurrence gets one row in the Touchpoints table of `$PB_REPO/powerbrowser/INTERNAL-APIS.md`, with the columns Internal, File:Line, `PowerBrowserAPI` Method, Purpose and Threat Notes. Then run these commands from the root of this repo:

   ```sh
   export PB_REPO="$(cd "${PB_REPO:-../Power-Browser}" && pwd)"
   cd "$PB_REPO"
   bash scripts/check-internals-boundary.sh              # no internals outside the boundary
   bash scripts/check-internals-boundary.sh --catalogue  # every occurrence has a row (names the uncatalogued location)
   node scripts/verify-ng-040-internals-catalogue-lines.mjs --fix  # rewrites each stale File:Line cell; never writes a row
   node scripts/verify-ng-040-internals-catalogue-lines.mjs  # every row's line still matches
   ```

   A kind that only calls existing `PowerBrowserAPI` methods adds no forbidden pattern and needs no new catalogue row. Still run the four commands.
7. **PB core edit**: **Add a check row to `$PB_REPO/scripts/verify-platform.sh`.** It is the only verification registry; never create a sibling driver. Rows are strings of the form `"<label>|<command>"`. A live actor check that needs the built binary goes in the non-`--quick` block next to the rows `ng-028-saved-page-copy` and `ng-038-actor-refuses-hostile-senders` (the same block holds the live rows `nav-keys-live` and `address-bar-live`). A text-only check goes in the quick block near the rows `internals-boundary`, `internals-catalogue` and `gui02-web-tab-bridge`. Model the check on `$PB_REPO/scripts/verify-ng-021-places-reads.mjs`, which drives the kind from the Theia frame. Include the hostile-sender case, as in `$PB_REPO/scripts/verify-ng-038-actor-sender-wall.mjs`. Give it `--self-test`. Derive expectations from the tree rather than from a hand-kept list.
8. **PB core edit**: **Frontend.** Add a typed method to the existing client: `ChromeStoreClient` for store kinds, the `GroupMutation` union for group kinds, `WebTabMessage` (part of `ShellMessage`) in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts` for web-tab kinds. A new push kind is consumed with `WebTabChannel.onPush(kind, handler)`; do not add a second `window` listener. If the MCP endpoint should expose the kind, add it to `TAB_STORE_RELAY_KINDS` / `TAB_STORE_WRITE_FIELDS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`. `$PB_REPO/scripts/verify-ng-025-store-read-endpoint.mjs` and `$PB_REPO/scripts/verify-ng-026-store-write-endpoint.mjs` derive their lists from there, and `$PB_REPO/docs/tab-store-access.md` must match.
9. **PB core edit**: If the kind contacts a new network host, add it to `$PB_REPO/powerbrowser/endpoint-allowlist.json`.
10. Run `"$PB_REPO"/scripts/verify-platform.sh --quick`, then `--only <your label>`.

## Rules and constraints

From `$PB_REPO/CLAUDE.md`:
- Hard rule 2: Firefox internals are reached only through `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, and every touchpoint is catalogued in `$PB_REPO/powerbrowser/INTERNAL-APIS.md`. `$PB_REPO/scripts/check-internals-boundary.sh` enforces this. `GroupActorChild.sys.mjs` may contain only `wrappedJSObject` and `JSWindowActorChild` (`ACTOR_CHILD_PATTERNS` in `$PB_REPO/scripts/check-internals-boundary.sh`), and each of those is catalogued too.
- Hard rule 2: `$PB_REPO/upstream/` is never hand-edited. Gecko changes go through `$PB_REPO/patches/`, and patches are regenerated, never text-edited.
- Hard rule 1: never patch Theia core. Bridge clients live in `@powerbrowser/*` extensions.
- Hard rule 3: do not tie Theia to full-window presentation. The `TabUriRegistry` shape is asserted by `$PB_REPO/scripts/verify-registry-shape.mjs`.
- Verification: `$PB_REPO/scripts/verify-platform.sh` is the one registry. Adding a check means appending one row. Never assert on the absence of a log line you emit yourself. Derive expectations from the tree.

## Gotchas

- **Dispatch on `document` with `bubbles: true`.** The actor's event listener sits on the window root. If you dispatch on `window`, or without bubbles, the child is never created and every request times out. The failure looks like a store error.
- **Listen for the reply on `window`.** The child dispatches `PowerBrowserGroupResponse` on `contentWindow`.
- **Filter on `requestId`.** Every client on the page receives every reply.
- **A malformed request gets no reply.** A non-string or empty `requestId`, a missing `msg`, or a non-string `kind` is dropped silently, so the request only ends at your timeout.
- **`ok: true` with a `where` of `"refused-scheme"` or `"unknown-tab"` is a refusal.** Check `where`.
- **`defaultPrevented` is not a reliable "chrome handled it" signal.** The child calls `event.preventDefault()`, but `probeChannel`'s comment records that, measured live, `dispatchEvent` still returned true. Call `probeChannel` once, ahead of time, instead. `window.open` fallbacks need the click's user activation, and an `await` uses it up.
- **The sender gate fails until the port is set.** During the first launch, before `TheiaService._swap`, and in any page other than the shell's own Theia frame, every request is refused with `validation`.
- **A `validation` message can echo the input you sent**, for example the uri. A `store` message is always fixed text, except the child's own `store` reply for a rejected query, which carries the rejection's message.
- **Replies cross a structured clone and then a JSON round trip** through the content window's JSON. Only JSON-safe data survives: no `URL`, `Map`, `Date` or functions.
- **`closeGroup` closes stock tabs only.** Chrome closes the group's stock tabs and marks every member row closed; web-tab and Theia widgets stay open until `GroupModel.commitClose` closes them. A direct `GroupActorClient.mutate({kind:'closeGroup', id})` leaves those widgets open with closed rows; call `GroupModel.closeGroup` / `commitClose` instead. Use `dissolveGroup` to ungroup only.
- **`createGroup` is an upsert.** Calling it with an existing id overwrites the title and bounds.
- **The `kind` namespace is shared across all four dispatchers.** A new kind's name must not collide with any existing kind.
- **Pushes are not per-tab streams.** A `state` push is coalesced per animation frame, so a consumer sees the latest state, not every navigation event.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
