# Tab-store MCP server

> Verified against PB 8843936 on 2026-10-21. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-sql.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-relay.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-backend-module.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-relay-contribution.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-frontend-module.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`
- `$PB_REPO/theia/extensions/tab-uris/package.json`
- `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`
- `$PB_REPO/powerbrowser/INTERNAL-APIS.md`
- `$PB_REPO/scripts/check-internals-boundary.sh`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/scripts/verify-ng-025-store-read-endpoint.mjs`
- `$PB_REPO/scripts/verify-ng-026-store-write-endpoint.mjs`
- `$PB_REPO/scripts/lib/ng-b-live.mjs`
- `$PB_REPO/docs/tab-store-access.md`
- `$PB_REPO/docs/TAB-STORE.md`
- `$PB_REPO/CLAUDE.md`

Status: working. Starts automatically in every supervised PowerBrowser launch; nothing to enable. It stays off only when the backend has no `POWERBROWSER_PROFILE_DIR` (an unsupervised dev backend).

## What it is

A loopback HTTP server inside the Theia Node backend that speaks MCP (JSON-RPC 2.0, single JSON response per POST, protocol version `2025-06-18`, `MCP_VERSION` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`). It is the only PowerBrowser API reachable by a process outside the browser. It exposes the tools listed in `TAB_STORE_TOOL_NAMES` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts` (7 at the stamp commit; count with `git -C "$PB_REPO" show HEAD:theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts | sed -n '/TAB_STORE_TOOL_NAMES = \[/,/\]/p' | grep -c "^ *'"`) over:

- `tabs.sqlite` (PowerBrowser's tab and group store), read-only SQL, executed in the backend.
- Firefox history, bookmarks and sessionstore, read by chrome (the Firefox parent process) and relayed through an open Theia window.
- Tab and group writes, executed by chrome's own writer (the same one Panorama uses) and relayed the same way.

Server identity returned by `initialize`: `serverInfo: { name: 'powerbrowser-tab-store', version: '1.0.0' }`, `capabilities: { tools: {} }`. No resources, prompts or sampling.

It is a separate `http.createServer` listener on its own random port, not a route on the Theia backend port. The Theia port is gated by a per-launch cookie that never leaves the supervisor (see the header comment of `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`). Chrome also removes that cookie from the `Cookie` header of every browser request to any other `127.0.0.1` port, this endpoint's port included: `tokenCookieStrip` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, an `http-on-modify-request` observer that `installTokenCookieStrip` registers when `setGroupSenderPort` records the sidecar port. The endpoint never uses that cookie; it has its own bearer token (below).

## Use it when / Do not use it when

Use it when:

- An external process (Claude Code, a script, a CLI tool, another MCP-capable agent) needs to read open/closed tabs, groups, history or bookmarks, or reorganise tabs and groups.
- You want SQL over `tabs.sqlite` while PowerBrowser runs. This endpoint is the only supported way: nothing else may open `tabs.sqlite` for writing, and opening it directly while the browser runs is unsupported.

Do not use it when:

- You are writing code that runs inside the Theia frontend. Call `ChromeStoreClient` (`$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`) or the group actor client directly instead of looping out to HTTP. See [Theia extensions](01-theia-extensions.md) and [the PowerBrowserGroup bridge](02-powerbrowser-api-bridge.md).
- You need page content, navigation, opening tabs, or closing tabs. No tool does this. `closeGroup` is deliberately excluded from `tab_store_write`. The web-tab actions and the address-bar resolution kind `resolveTypedAddress` are not relayed either (see [The tab-store-relay JSON-RPC path](#the-tab-store-relay-json-rpc-path)).
- You want Theia AI to call tools. Theia AI (`@theia/ai-mcp`, version pinned in `$PB_REPO/theia/applications/browser/package.json`) is an MCP client with no servers configured; this endpoint could be added to it as an HTTP server, but that wiring does not exist. UNVERIFIED: `@theia/ai-mcp` 1.76.0 supports HTTP transport with a bearer header; not read in the package source and not run. Verify: read the MCP server configuration types of the installed package under `$PB_REPO/theia/node_modules/@theia/ai-mcp/`, then see [Theia plugins and AI](06-theia-plugins-and-ai.md).
- You need a new HTTP or JSON-RPC route for code you own inside the backend. See [Theia backend RPC and HTTP](04-theia-backend-rpc-http.md).
- You need a stable URL or token. Both change on every start; a static client config goes stale after each restart.

## How to use

1. Find the profile directory. The backend reads it from `POWERBROWSER_PROFILE_DIR` (through `POWERBROWSER_ENV` in `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts`), which the supervisor sets to Firefox's `ProfD` (`PowerBrowserAPI.getProfileDir` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, passed as `POWERBROWSER_PROFILE_DIR` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`). If you do not know the path: `find "$HOME" -name store-access.json 2>/dev/null`.
2. Read `<profile>/store-access.json` (mode 0600, rewritten atomically on every backend start, removed on normal quit):

   ILLUSTRATIVE: the shape of the access file; the port and token differ on every start.

   ```json
   {"url": "http://127.0.0.1:43127/mcp", "token": "<64 lowercase hex chars>"}
   ```

3. POST one JSON-RPC 2.0 message per request to `url` with headers `Content-Type: application/json` and `Authorization: Bearer <token>`. Send no `Origin` header. `Host` must be `127.0.0.1:<port>` or `localhost:<port>` (any normal HTTP client sets this from the URL).
4. Optional handshake: `initialize`, then the `notifications/initialized` notification (answered with HTTP 202, empty body). The server keeps no session state, so `tools/list` and `tools/call` also work without it.
5. Call a tool: `tools/call` with `{ name, arguments }`. Read `result.structuredContent` (object) or `result.content[0].text` (the same object as a JSON string). On tool failure, `result.isError` is `true` and `content[0].text` is the reason.

curl (from `$PB_REPO/docs/tab-store-access.md`):

```sh
ACCESS="$PROFILE_DIR/store-access.json"
URL=$(jq -r .url "$ACCESS")
TOKEN=$(jq -r .token "$ACCESS")
curl -s "$URL" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tabs_sql","arguments":{"sql":"SELECT url, title FROM tabs ORDER BY last_active DESC LIMIT 10"}}}'
```

Write example (move a tab into a group):

```sh
curl -s "$URL" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"tab_store_write","arguments":{"op":"setTabGroup","uri":"web:...","groupId":"<group id>"}}}'
```

Node client, same shape as the PB test helper `mcp` in `$PB_REPO/scripts/lib/ng-b-live.mjs`:

ILLUSTRATIVE: assembled from PB source; not compiled or run.

```js
import { readFileSync } from 'node:fs';
const access = JSON.parse(readFileSync(`${profileDir}/store-access.json`, 'utf8'));
async function callTool(name, args) {
    const res = await fetch(access.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access.token}` },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
    });
    const { result, error } = await res.json();
    if (error) throw new Error(error.message);
    if (result.isError) throw new Error(result.content[0].text);
    return result.structuredContent;
}
```

Node's `fetch` sends no `Origin` header. A browser `fetch` always does, and is always refused.

### Claude Code client config

`.mcp.json` in the project root (Claude Code expands `${VAR}` in `url` and `headers`):

ILLUSTRATIVE: Claude Code client configuration, not PB code; not run.

```json
{
  "mcpServers": {
    "powerbrowser-tab-store": {
      "type": "http",
      "url": "${PB_STORE_URL}",
      "headers": { "Authorization": "Bearer ${PB_STORE_TOKEN}" }
    }
  }
}
```

Launch Claude Code with the values from the current access file:

```sh
ACCESS="$PROFILE_DIR/store-access.json"
PB_STORE_URL=$(jq -r .url "$ACCESS") PB_STORE_TOKEN=$(jq -r .token "$ACCESS") claude
```

Or register it once per browser start: `claude mcp add --transport http powerbrowser-tab-store "$(jq -r .url "$ACCESS")" --header "Authorization: Bearer $(jq -r .token "$ACCESS")"`.

UNVERIFIED: end-to-end use from Claude Code was not run. Points to check if it fails: Claude Code's HTTP transport may issue `GET /mcp` for a server-sent-event stream (this server answers 405, which the MCP spec allows), and it sends `Accept: application/json, text/event-stream` (ignored here; responses are always `application/json`). No `Mcp-Session-Id` is issued. Verify: register the server with the `claude mcp add` command above while PB runs, then call `tools/list` and one `tools/call` from Claude Code.

## Reference

### Transport and access

Symbols in the Source column are in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts` unless the row names `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts` (protocol).

| Item | Value | Source |
|---|---|---|
| Bind | `server.listen(0, '127.0.0.1')`: random free port, IPv4 loopback only | `TabStoreAccessEndpoint.onStart` |
| Route | `POST /mcp` (`STORE_ACCESS_ROUTE`) | protocol: `STORE_ACCESS_ROUTE` |
| Port/token discovery | `<profile>/store-access.json` = `{"url":"http://127.0.0.1:<port>/mcp","token":"<hex>"}` + newline | `announce`; protocol: `STORE_ACCESS_FILE_NAME` |
| Access file write | staged as `store-access.json.<pid>.tmp` with `flag: 'wx'`, mode 0600, `chmodSync(0o600)`, then `renameSync` | `announce` |
| Access file removal | `onStop()` deletes it; a crash leaves a stale file whose port/token no longer work | `onStop` |
| Token | `crypto.randomBytes(32).toString('hex')`, new per backend start; compared with `crypto.timingSafeEqual` | `onStart`, `tokenMatches` |
| Auth header format | exactly `Bearer ` + 64 chars `[0-9a-f]`; uppercase hex or extra whitespace fails | `tokenMatches` |
| Body limit | 1 MiB (`MAX_BODY_BYTES`) -> HTTP 413 | `MAX_BODY_BYTES`, `handle` |
| Response | HTTP 200, `Content-Type: application/json`, one JSON-RPC object; no batching, no SSE | `json` |
| Theia token cookie | never arrives at this port from the browser: chrome strips it from requests to every `127.0.0.1` port except the sidecar's | `tokenCookieStrip` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` |

### Request checks, in order

The checks run in `TabStoreAccessEndpoint.handle` (`handle` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`).

| # | Check | Failure |
|---|---|---|
| 1 | `Origin` header present (any value) | 403, empty body |
| 2 | `Host` not `127.0.0.1:<port>` or `localhost:<port>` (DNS rebinding) | 403 |
| 3 | Bearer token mismatch or missing | 401 |
| 4 | path not exactly `/mcp` (a query string fails too) | 404 |
| 5 | method not `POST` | 405 |
| 6 | body over 1 MiB | 413 |
| 7 | body not JSON | 200 with JSON-RPC error `-32700` `invalid JSON`, `id: null` |

### JSON-RPC methods

The methods are dispatched in `dispatch` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`.

| Method | Params | Result |
|---|---|---|
| `initialize` | `{ protocolVersion?: string, ... }` | `{ protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'powerbrowser-tab-store', version: '1.0.0' } }`. `protocolVersion` echoes the client's value if it is a string, else `'2025-06-18'`. No version negotiation. |
| `notifications/initialized` | none | `{}`; sent as a notification (no `id`) it gets HTTP 202 with no body |
| `ping` | none | `{}` |
| `tools/list` | none | `{ tools: ToolDef[] }` (name, description, inputSchema) |
| `tools/call` | `{ name: string, arguments?: object }` | `{ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value }` or `{ isError: true, content: [{ type: 'text', text: message }] }` |
| anything else | | JSON-RPC error `-32601` `unknown method <m>` (returned with a body even when sent as a notification) |

Any request without `id` that succeeds gets HTTP 202 and no body. Uncaught non-tool errors return code `-32603`.

### Tools

All tools are always listed; there is no per-tool gating beyond the token. "Relayed" tools need at least one open PowerBrowser (Theia) window, otherwise they return `isError: true` with `no PowerBrowser window is connected; open one and retry`. Tool definitions are `TOOLS` and tool bodies are `runTool` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`.

| Tool | Input schema | Output (`structuredContent`) | Runs in | Limits / validation |
|---|---|---|---|---|
| `tabs_sql` | `{ sql: string (required), params?: (string\|number\|null)[] }` | `{ columns: string[], rows: object[], truncated: boolean }` | backend, child process (`node -e`), `better-sqlite3` opened `readonly: true, fileMustExist: true` on `<profile>/tabs.sqlite` | sql 1-10000 chars (`SQL_MAX_CHARS`); must be one statement where `stmt.reader && stmt.readonly`; regex `\b(attach\|detach\|vacuum\|pragma\|load_extension)\b` (case-insensitive, `REFUSED_WORDS`) refused anywhere in the text, comments included; params max 100; 5 s timeout (child SIGKILLed); row cap `SQL_MAX_ROWS` (1000); 8 MiB row JSON; max 2 concurrent statements, the third is refused (not queued). `pragma_table_info('tabs')` is accepted (no word boundary before `_`); bare `PRAGMA` is refused. |
| `history_entry` | `{ url: string (required) }` | `{ entry: { url, title } \| null }` | relayed, kind `readHistoryEntry` | url non-empty, <= 8192 chars; exact URL match |
| `bookmark_by_url` | `{ url: string (required) }` | `{ bookmark: { guid, title, url } \| null }` | relayed, kind `readBookmarkByUrl` | url non-empty, <= 8192 chars |
| `bookmark_folder` | `{ guid: string (required) }` | `{ rows: { guid, title, url }[] \| null }` | relayed, kind `listBookmarkFolder` (field renamed to `folderGuid`) | guid must match `^[A-Za-z0-9_-]{12}$` |
| `sessionstore_tabs` | `{}` | `{ rows: { uri, url, title, last_active, last_accessed: number \| null }[] \| null }` | relayed, kind `projectSessionStoreTabs` | private windows excluded. Chrome always returns an array (empty on error); `null` appears only if the relay reply has no `rows` field (`reply[field] ?? null` in `TabStoreAccessEndpoint.chrome`). |
| `tabs_with_places` | `{ bookmarked?: boolean, open?: boolean, limit?: integer 1-1000 }` | `{ rows: TabPlacesRow[] \| null, truncated: boolean }` | relayed, kind `queryTabsWithPlaces` | default limit 200; only the 5000 most recently active tab rows are scanned (`truncated: true` when older rows were skipped); non-boolean filters and non-integer limit are dropped silently |
| `tab_store_write` | `{ op: enum (required), id?, title?, x?, y?, w?, h?, uri?, groupId?: string\|null, uris?: string[], key?, value? }` | chrome writer reply, e.g. `{ ok: true, kind, id }` | relayed, kind = `op` | see write ops below |

`TabPlacesRow` (`TabPlacesRow` in `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`): `uri, url, title, group_id (string|null), last_active (number), closed_at (number|null), open (boolean), visited (boolean), frecency (number|null), visit_count (number), last_visit (epoch ms|null), bookmark_guid (string|null), bookmark_title (string|null)`.

`tabs_sql` limit constants, exported from `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-sql.ts`: `SQL_TIME_LIMIT_MS = 5000`, `SQL_MAX_ROWS = 1000`, `SQL_MAX_BYTES = 8 MiB`, `SQL_MAX_RUNNING = 2`.

`tabs` table key facts: one row per tab keyed by `uri` (`stock:...`, `web:...`, or a Theia URI such as `terminal:build`); `url` is `''` for a tab with no page; `closed_at IS NULL` means open. Full schema: `$PB_REPO/docs/TAB-STORE.md`.

### `tab_store_write` ops

Source of the op list and forwarded fields: `TAB_STORE_WRITE_FIELDS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`. Only the listed fields are forwarded; any other argument is dropped. Fields left `undefined` are not sent. The chrome handlers named below are in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`.

| `op` | Forwarded fields | Chrome handler | Success reply |
|---|---|---|---|
| `createGroup` | `id, title, x, y, w, h` | `handleGroupMutation` -> `writeGroupRow` (upsert: creates or replaces every column of the row with that `id`). The caller mints `id`, which must match `^[A-Za-z0-9_-]{1,128}$`. Defaults via `normalizeGroupRow`: title `Untitled group`, x/y 0, w 200, h 144; geometry floored, clamped to `GROUP_BOUNDS_MAX` (10000) | `{ ok, kind, id }` |
| `renameGroup` | `id, title` | `handleGroupMutation` (read row, rewrite title; `normalizeGroupRow` trims the title and cuts it to 60 chars, `GROUP_TITLE_MAX`) | `{ ok, kind, id }` |
| `moveGroup` | `id, x, y` | `handleGroupMutation` | `{ ok, kind, id }` |
| `resizeGroup` | `id, w, h` | `handleGroupMutation` | `{ ok, kind, id }` |
| `dissolveGroup` | `id` | `removeGroupRow`; tabs stay open, become ungrouped. An unknown `id` is not an error (the DELETE matches nothing) | `{ ok, kind, id }` |
| `setActiveGroup` | `id` | `setActiveGroup` | `{ ok, kind, id }` |
| `setTabGroup` | `uri, groupId` (`null` or omitted ungroups) | `setTabGroupId`; `uri` must be an existing `tabs` row, a non-null `groupId` an existing group | `{ ok, kind, uri }` |
| `setTabPosition` | `uri, x, y` | `setTabPosition` (ungrouped tab position on Panorama canvas); `uri` must be an existing row; omitting `x` or `y` clears the position to NULL; values floored and clamped to 0..10000 | `{ ok, kind, uri }` |
| `setGroupOrder` | `groupId, uris` | `setGroupOrder`; every URI in `uris` must already be in that group; writes `tabs.ord` = array index in one transaction; unlisted members keep their `ord` | `{ ok, kind, id }` (id = groupId) |
| `setSetting` | `key, value` (`value` must be a JSON string, e.g. `"14"`; a JSON number is refused) | `handleStoreRequest` -> `setStoreSetting` | `{ ok, kind, key }` |

Write semantics:

- One op per call. No transaction across calls, no batch op.
- Every write is executed by chrome's writer (`$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`), never by the backend. The backend only opens `tabs.sqlite` read-only.
- Validation is two-layer: the endpoint checks only that `op` is a known key; chrome validates ids, tab keys, values and setting ranges. A chrome refusal (`{ ok: false, reason, message }`) becomes `isError: true` with `message`, or `<op> failed (<reason>)`.
- Unknown group in rename/move/resize -> error `handleGroupMutation: unknown group <id>`; in `setTabGroup` -> `setTabGroupId: unknown group <groupId> for <uri>`; in `setGroupOrder` -> `setGroupOrder: unknown group <groupId>`; in `setActiveGroup` -> `setActiveGroup: unknown group <id>`. Unknown tab URIs give `<function>: unknown tab URI <uri>`. Chrome classifies messages matching `refusing|unknown` as `reason: 'validation'` and returns them verbatim; any other failure becomes `handleGroupMutation: the tab store write failed` (reason `store`).
- `createGroup` on an existing `id` overwrites title and geometry and resets `is_active` to 0 (`isActive` is not forwarded). Use `renameGroup` / `moveGroup` / `resizeGroup` to change one aspect of an existing group.
- Valid `setSetting` keys (from `$PB_REPO/docs/TAB-STORE.md`, section "Settings"): `closed_retention_days` (0-3650), `integrity_check_minutes` (>0, <= 525600), `restore_behaviour` (`session` | `none`), `restore_live_minutes` (0-10080), `restore_url_days` (0-3650).
- Visibility: Panorama shows a change the next time it loads its groups; a setting takes effect the next time its reader runs (e.g. restore settings at next launch). No change event is pushed to any client.
- Excluded on purpose: `closeGroup` (closes the user's tabs) and `isActive` on `createGroup` (chrome accepts it, the endpoint does not forward it; use `setActiveGroup`).
- Each relayed call times out after 8 s in the window (`STORE_ACK_TIMEOUT_MS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`) and returns `reason: 'timeout'`, `no reply to <kind>`.

### The tab-store-relay JSON-RPC path

The backend has no channel to chrome. Relayed tools travel (all paths under `$PB_REPO/theia/extensions/tab-uris/`):

ILLUSTRATIVE: call path assembled from PB source; a diagram, not code.

```text
MCP client --HTTP--> TabStoreAccessEndpoint (Node)
  -> TabStoreRelayHub.relay(msg)                       src/node/tab-store-relay.ts
  -> JSON-RPC over Theia WebSocket, path /services/powerbrowser/tab-store-relay
  -> TabStoreRelayContribution.relay(msg) (newest window first)   src/browser/tab-store-relay-contribution.ts
       refuses any kind not in TAB_STORE_RELAY_KINDS
  -> ChromeStoreClient.request(msg)  PowerBrowserGroupRequest DOM event -> PowerBrowserGroup actor
  -> chrome: handleStoreRequest (reads, setSetting) or handleGroupMutation (group/tab ops)
  <- PowerBrowserGroupResponse { ok, kind, ... } | { ok:false, reason, message }
```

Chrome-side routing: `PowerBrowserGroupParent.receiveMessage` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` has four dispatchers: `handleShellMessage` (kinds in `SHELL_MESSAGE_KINDS`), `handleStoreRequest` (kinds in `STORE_REQUEST_KINDS`), `handleWebTabAction` (kinds in `WEB_TAB_ACTION_KINDS`), and `handleGroupMutation` for every other kind. The relay only ever reaches `handleStoreRequest` and `handleGroupMutation`.

Not relayed: `TAB_STORE_RELAY_KINDS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts` holds the five read kinds and the write ops, nothing else. MCP clients therefore cannot reach:

- the web-tab action kinds that go to `handleWebTabAction` (`webTabStop`, `webTabHistory`, `webTabGotoIndex`, `webTabActivated`) or the `webTab*` kinds that `handleGroupMutation` serves;
- the other `STORE_REQUEST_KINDS` entries, including `resolveTypedAddress` (chrome-side resolution of typed address-bar text) `listSearchEngines` (the address bar's engine list) `placesFavicons` (cached favicons for address-bar rows), `searchSuggestions` (search-engine suggestions for typed text, classed `network`), `autofillOrigin` (inline autofill of a typed origin) and `removeHistoryEntry` (removes a page from history, classed `privileged`); their callers are `ChromeStoreClient.resolveTypedAddress`, `ChromeStoreClient.listSearchEngines`, `ChromeStoreClient.placesFavicons`, `ChromeStoreClient.searchSuggestions`, `ChromeStoreClient.autofillOrigin` and `ChromeStoreClient.removeHistoryEntry` in `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`.

`TAB_STORE_RELAY_KINDS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-relay-contribution.ts` is the check that refuses every other kind in the window.

| Item | Value |
|---|---|
| Path constant | `TAB_STORE_RELAY_PATH = '/services/powerbrowser/tab-store-relay'` |
| Server interface (backend) | `TabStoreRelayServer { register(): Promise<boolean> }`, always returns `true`; the connection handler adds the client proxy to the hub on connect |
| Client interface (each window) | `TabStoreRelayClient { relay(msg: StoreMessage): Promise<StoreReply> }` |
| Message | `StoreMessage { kind: string; [field: string]: unknown }` |
| Reply | `StoreReply { ok: boolean; reason?: string; message?: string; [field: string]: unknown }` |
| Forwarded kinds | `TAB_STORE_RELAY_KINDS` = `readHistoryEntry, readBookmarkByUrl, listBookmarkFolder, projectSessionStoreTabs, queryTabsWithPlaces` + all `TAB_STORE_WRITE_OPS` |
| Window choice | newest registered window first; if its call throws (connection dropped) the next is tried; a refusal reply is returned as-is, not retried |
| Wiring | backend: `tab-store-access-backend-module.ts`; frontend: `tab-store-access-frontend-module.ts`; both from one entry of key `theiaExtensions` in `$PB_REPO/theia/extensions/tab-uris/package.json` |

The relay is internal plumbing. An extension does not call it directly; it is listed here because adding a relayed MCP tool means extending it.

## How to add a new MCP tool

All edits are inside `@powerbrowser/tab-uris` (PB hard rule 1: never patch Theia core), which is PB core. Steps marked **PB core edit** change tracked files in `$PB_REPO`; stop and ask the user before each one ([Stop and ask](_shared/RULES.md#stop-and-ask)). Steps:

1. **PB core edit**: Add the name to `TAB_STORE_TOOL_NAMES` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`. `TabStoreToolName` is derived from it, so the `TOOLS` array will not type-check with an unlisted name.
2. **PB core edit**: Add a `ToolDef` to `TOOLS` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts` (`name`, plain-language `description` stating the returned shape, JSON Schema `inputSchema` with `required`).
3. **PB core edit**: Add a `case` in `runTool()` returning a plain object (it becomes `structuredContent`). Validate every argument at this boundary (reuse `requireString` / `requireGuid`; throw `Error` with a message saying what is allowed; thrown errors become `isError: true`).
4. **PB core edit**: Pick where it executes:
   - Backend-only (e.g. another read-only query on `tabs.sqlite`): call a helper in `$PB_REPO/theia/extensions/tab-uris/src/node/`. Any `new Database(` under `$PB_REPO/theia/` must carry a `readonly: true` literal on the same line (the second-writer gate, per the header comment of `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-sql.ts`). Keep long work off the event loop (`runReadOnlySql` in that file uses a child process for this reason).
   - Needs chrome (Places, sessionstore, any write): add the actor kind to `TAB_STORE_RELAY_KINDS` (reads) or to `TAB_STORE_WRITE_FIELDS` (writes become `tab_store_write` ops automatically: add the op and its forwarded fields, no new tool needed). Call `this.chrome(msg, field)` or `this.chromeReply(msg)`. Chrome must already handle that kind in `handleStoreRequest` (listed in `STORE_REQUEST_KINDS`) or `handleGroupMutation` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`; adding a chrome kind is a change to the anti-corruption layer (hard rule 2: Firefox internals only through that file, catalogued in `$PB_REPO/powerbrowser/INTERNAL-APIS.md`, enforced by `$PB_REPO/scripts/check-internals-boundary.sh`). Two rules in the header of `$PB_REPO/powerbrowser/INTERNAL-APIS.md` apply: the `Append-only rule` (new boundary code goes in an end-of-file section of `PowerBrowserAPI.sys.mjs`, new touchpoints are appended rows) and the `Privileged-kind rule` (every store kind is classified in `$PB_REPO/scripts/verify-web-tab-bridge.mjs` rule 12; a store kind classed privileged, such as a Places write or a clipboard read, or classed network, sending user input off the machine, never enters `TAB_STORE_RELAY_KINDS`).
5. **PB core edit**: Document the tool in `$PB_REPO/docs/tab-store-access.md` with the name in backticks. `$PB_REPO/scripts/verify-ng-025-store-read-endpoint.mjs` derives the tool list from `TAB_STORE_TOOL_NAMES` and fails if `tools/list` or the doc does not match; `$PB_REPO/scripts/verify-ng-026-store-write-endpoint.mjs` does the same for write ops.
6. Run `"$PB_REPO"/scripts/verify-platform.sh --quick`, then `--only ng-025-store-read-endpoint` / `--only ng-026-store-write-endpoint` (row labels in `$PB_REPO/scripts/verify-platform.sh`; live checks need a built browser). Extend those scripts rather than adding a new driver (verification rule: one driver, one registry).

ILLUSTRATIVE: minimal backend-only example shape, assembled from PB source; not existing code, not compiled.

```ts
// protocol.ts
export const TAB_STORE_TOOL_NAMES = [ /* ...existing... */, 'group_count' ] as const;
// endpoint.ts TOOLS
{ name: 'group_count', description: 'Count groups. Returns {count}.', inputSchema: { type: 'object', properties: {} } },
// endpoint.ts runTool
case 'group_count': {
    const r = await runReadOnlySql(join(this.profileDir, TAB_QUERY_FILE_NAME), 'SELECT COUNT(*) AS n FROM groups', []);
    return { count: r.rows[0]?.n ?? 0 };
}
```

The `groups` table (`id, title, x, y, w, h, is_active`) is listed in `$PB_REPO/docs/TAB-STORE.md`.

## Rules and constraints

From `$PB_REPO/CLAUDE.md` and the endpoint sources:

- Never fork or patch Theia core; the endpoint and any new tool live in `@powerbrowser/tab-uris`.
- Firefox internals are reached only through `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`. New chrome-side kinds go there.
- Only chrome writes `tabs.sqlite`. Backend code opens it read-only.
- Verification: add checks as rows in the registry of `$PB_REPO/scripts/verify-platform.sh`; derive expectations from the tree (the tool list is derived from `TAB_STORE_TOOL_NAMES`), never hand-keep a list; no absence-of-log-line assertions.
- No internal identifier in user-facing text. Tool error messages are returned to MCP clients, not shown in PB's GUI, but chrome-side errors are already scrubbed of URLs/titles/paths (for non-validation errors `handleStoreRequest` returns `handleStoreRequest: <kind> failed in the store` and `handleGroupMutation` returns `handleGroupMutation: the tab store write failed`); keep that property.
- Do not loosen the three walls (Origin, Host, token). The Origin wall is what blocks a hostile `127.0.0.1` web page holding a leaked token.
- Do not add a web-tab kind, `resolveTypedAddress`, or a store kind classed privileged or network to `TAB_STORE_RELAY_KINDS`; the relay set is what limits what an MCP client can do in chrome.
- Composition is static `ContainerModule` binds only (decision D-50 in the module headers).
- Builds run in `nix develop .#theia`; the repo path must contain no space.

## Gotchas

- Port and token change on every backend start (including a backend respawn). Re-read `store-access.json` after any 401 or connection refused.
- A crashed browser leaves a stale `store-access.json`; connection refused means re-read after the next start.
- Any `Origin` header, even `Origin: null`, gets 403. Browser-side JavaScript cannot use this endpoint by design.
- `Authorization` must be exactly `Bearer <64 lowercase hex>`.
- Read the schema with `SELECT name, type FROM pragma_table_info('tabs')`. The refusal regex `/\b(attach|detach|vacuum|pragma|load_extension)\b/i` does not match `pragma_table_info` (`_` is a word character), so it is accepted; bare `PRAGMA` is refused. (Regex behavior tested in node.)
- The refusal regex also matches those words inside string literals, e.g. `WHERE title = 'attach'` is refused. Pass such text through `params`.
- `tabs_sql` reads committed data only via a separate read-only handle; a write just made with `tab_store_write` is visible once chrome's writer has committed it.
- Relayed tools fail when no Theia window is open (e.g. only stock browser windows). `tabs_sql` still works.
- `tabs` includes closed tabs (history) until `closed_retention_days` prunes them. Filter `closed_at IS NULL` or use `tabs_with_places` with `open: true`.
- Private-window tabs are never in the store or in any relayed result.
- Non-boolean `bookmarked`/`open` and non-integer `limit` are silently ignored by `tabs_with_places`, not rejected.
- `initialize` echoes whatever `protocolVersion` the client sends; it does not prove the server supports that version. The server implements the 2025-06-18 request/response subset only (no SSE, no sessions, no list-changed notifications).
- No rate limiting beyond the 2-concurrent cap on `tabs_sql`.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
