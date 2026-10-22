# Theia Backend: JSON-RPC Services, HTTP Routes, Token Gate

> Verified against PB 8843936 on 2026-10-21. Level: source-read

Source files:
- `$PB_REPO/CLAUDE.md`
- `$PB_REPO/configuration.toml`
- `$PB_REPO/docs/BUILD.md`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`
- `$PB_REPO/scripts/smoke-theia.sh`
- `$PB_REPO/scripts/verify-endpoints.sh`
- `$PB_REPO/scripts/verify-ng-069-sidecar-egress.mjs`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/scripts/verify-sql-store-second-writer.mjs`
- `$PB_REPO/scripts/verify-theia-endpoints.mjs`
- `$PB_REPO/scripts/verify-token-cookie-strip.mjs`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/theia/package.json`
- `$PB_REPO/theia/extensions/chrome-bar/package.json`
- `$PB_REPO/theia/extensions/chrome-bar/tsconfig.json`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/node/chrome-bar-suggestion-service-impl.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`
- `$PB_REPO/theia/extensions/tab-uris/package.json`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/group-query-service.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-relay-contribution.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-backend-module.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-service.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-backend-module.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-relay.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-sql.ts`
- `$PB_REPO/theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts`
- `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts`
- `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`
- `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-module.ts`

Status: working (token gate, `GET /powerbrowser/health`, three `/services/powerbrowser/*` JSON-RPC services). A general REST API and any external (non-loopback or non-PB-frontend) access to the Theia backend are absent by design; adding one requires a new loopback listener with its own auth (see [Adding an external REST/HTTP endpoint (what it requires)](#adding-an-external-resthttp-endpoint-what-it-requires)).

Commands in this doc assume `export PB_REPO="$(cd "${PB_REPO:-../Power-Browser}" && pwd)"` was run once from the root of this repo. One fact comes from the gitignored on-disk Theia install under `$PB_REPO/theia/node_modules/`; it is written as path plus symbol, rests on the `@theia/*` pins in `$PB_REPO/theia/applications/browser/package.json`, and is not drift-checked.

## What it is

PowerBrowser (PB) runs an Eclipse Theia browser-target backend as a Node sidecar process; the Theia release is the `@theia/core` pin (1.76.0) in `$PB_REPO/theia/applications/browser/package.json`. Firefox chrome (`$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`) supervises it and shows its frontend full-window at `http://127.0.0.1:<port>/`.

Connection surfaces on that backend:

1. **Token gate** (`@powerbrowser/token-gate`): Express early middleware. Every HTTP request to the backend port must carry the cookie `POWERBROWSER_TOKEN=<per-launch token>`, otherwise `403`. The backend refuses to start without a token (exit 78) and refuses to announce readiness on a non-loopback bind (exit 78).
2. **`GET /powerbrowser/health`**: the only custom plain-HTTP route. Returns `{ ok: true, pid, port }`. The supervisor polls it.
3. **Theia JSON-RPC services** over Theia's existing authenticated WebSocket connection. PB registers three:
   - `/services/powerbrowser/groups` (`GroupQueryService`, read-only `tabs.sqlite` group reads)
   - `/services/powerbrowser/chrome-suggestions` (`ChromeBarSuggestionService`, address-bar tab suggestions)
   - `/services/powerbrowser/tab-store-relay` (backend-to-window relay hub, reverse direction: the backend calls the frontend)
4. **Outbound egress allowlist** (`$PB_REPO/powerbrowser/endpoint-allowlist.json`): every host the browser or the sidecar resolves must have a row. Checked by `$PB_REPO/scripts/verify-endpoints.sh`.

A fourth listener exists in the same Node process but is NOT on the Theia port: the tab-store MCP endpoint (`POST /mcp`, own random loopback port, bearer token). It is the precedent for any external access; it is documented in [the tab-store MCP server doc](03-tab-store-mcp-server.md), and summarized here only as the pattern to copy.

## Use it when / Do not use it when

Use a backend JSON-RPC service when:
- Your Theia frontend extension needs Node-only capability: file system, `better-sqlite3`, child processes, Node crypto.
- You need a read path over `tabs.sqlite`: reuse `TabQueryService` (inject it, as chrome-bar does), never open a second handle.
- The backend must call into a Theia window (use the client-proxy pattern of `tab-store-relay`).

Do not use it when:
- The caller is outside PB (a CLI, an MCP client, another app). The Theia port only admits the per-launch cookie, which never leaves the supervisor and the Firefox cookie jar; chrome also strips it from requests to every other loopback port (see [Backend handshake (supervisor -> backend)](#backend-handshake-supervisor---backend)). Use or copy the MCP endpoint pattern ([the tab-store MCP server doc](03-tab-store-mcp-server.md); source `TabStoreAccessEndpoint` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`).
- You need Firefox internals, Places (history/bookmarks), sessionstore, or writes to `tabs.sqlite`. Only chrome reads Places and writes `tabs.sqlite`. Go through the PowerBrowserGroup actor via `ChromeStoreClient` (frontend), see [the Firefox actor bridge doc](02-powerbrowser-api-bridge.md).
- Frontend-only logic suffices (commands, widgets, keybindings). No backend module needed; see [the Theia frontend extension doc](01-theia-extensions.md).
- You want a plain HTTP route for your own frontend. Prefer JSON-RPC. The chrome-bar and groups services chose JSON-RPC explicitly to avoid "no new channel, no HTTP route, so no application-contribution binding and no token-gate re-review" (header comment of `$PB_REPO/theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts`).

## How to use

### A. Call an existing service from a frontend extension

1. Import the path constant and interface from the owning package's protocol file.
2. Bind a proxy in your frontend `ContainerModule` with `WebSocketConnectionProvider.createProxy`.
3. Inject the Symbol and `await` methods. Errors thrown in the backend reject the promise.

ILLUSTRATIVE: the bind has the shape of the `GroupQueryService` bind in `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`; not compiled.

```ts
// your-extension/src/browser/your-frontend-module.ts
// Generic pattern, the shape of the GroupQueryService bind in modes-frontend-module.ts.
// For GroupQueryService itself, skip this bind when @powerbrowser/modes is composed -- see below.
import { ContainerModule } from '@theia/core/shared/inversify';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser';
import { GROUP_PATH, GroupQueryService } from '@powerbrowser/tab-uris/lib/browser/group-query-service';

export default new ContainerModule(bind => {
    bind(GroupQueryService).toDynamicValue(ctx =>
        WebSocketConnectionProvider.createProxy<GroupQueryService>(ctx.container, GROUP_PATH)
    ).inSingletonScope();
});
```

ILLUSTRATIVE: injection and call; not compiled.

```ts
@inject(GroupQueryService) protected readonly groups: GroupQueryService;
// ...
const rows = await this.groups.listGroups(); // rejects when tabs.sqlite cannot be read
```

Add `"@powerbrowser/tab-uris": "0.1.0"` to your extension's `package.json` `dependencies` (chrome-bar does this: `@powerbrowser/tab-uris` in `$PB_REPO/theia/extensions/chrome-bar/package.json`).

`GroupQueryService` is already bound in the frontend container by `@powerbrowser/modes` (`GroupQueryService` in `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`), not by tab-uris. If modes is composed (it is, in the app), inject `GroupQueryService` directly and do not bind it again: a second `bind(GroupQueryService)` makes inversify resolution ambiguous. If you need your own proxy, bind it under your own Symbol (as chrome-bar does with `ChromeBarTabSuggestions` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts`, which binds that Symbol to the `CHROME_SUGGESTION_PATH` proxy and binds `ChromeBarSuggestionService` to `ChromeBarPlacesSuggestions`, a frontend class that merges the backend's open-tab rows with history and bookmark matches from chrome).

### B. Add a new backend JSON-RPC service (copy the chrome-bar pattern)

The service lives in a `@powerbrowser/*` extension under `$PB_REPO/theia/extensions/<name>/`. Steps marked **PB core edit** change tracked files in `$PB_REPO`; stop and ask the user before each one ([Stop and ask](_shared/RULES.md#stop-and-ask)).

1. **PB core edit**: **Protocol file** in `src/browser/` (imported by both sides, so it must import nothing browser-only). Holds the path constant, the interface, and a Symbol with the same name.

ILLUSTRATIVE: the shape of `CHROME_SUGGESTION_PATH` and `ChromeBarSuggestionService` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts`, renamed; not compiled.

```ts
// src/browser/my-service.ts  (shape of chrome-bar-suggestion-service.ts)
/** JSON-RPC path the backend handler serves on. */
export const MY_SERVICE_PATH = '/services/powerbrowser/my-service';

export interface MyService {
    doThing(input: string, limit: number): Promise<MyRow[]>;
}

export const MyService = Symbol('MyService');
```

2. **PB core edit**: **Backend impl** in `src/node/`. Validate and clamp every argument at the RPC boundary; any frontend code that holds the connection can call it (UNVERIFIED: whether VS Code plugins running in the plugin host can reach a `/services/powerbrowser/*` path; not tested. Verify: call the path from a test `.vsix` plugin in a running PB, or read the plugin-host RPC setup under `$PB_REPO/theia/node_modules/@theia/plugin-ext/`).

ILLUSTRATIVE: the shape of `ChromeBarSuggestionServiceImpl` in `$PB_REPO/theia/extensions/chrome-bar/src/node/chrome-bar-suggestion-service-impl.ts`, renamed; not compiled.

```ts
// src/node/my-service-impl.ts  (shape of chrome-bar-suggestion-service-impl.ts)
import { inject, injectable } from '@theia/core/shared/inversify';
import { TabQueryService } from '@powerbrowser/tab-uris/lib/node/tab-query-service';
import { MyService } from '../browser/my-service';

@injectable()
export class MyServiceImpl implements MyService {
    constructor(@inject(TabQueryService) private readonly tabs: TabQueryService) {}

    async doThing(input: string, limit: number): Promise<MyRow[]> {
        const safe = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 8) : 8;
        return /* ... */ this.tabs.searchByPrefix(String(input ?? '').slice(0, 256), safe);
    }
}
```

3. **PB core edit**: **Backend module** in `src/node/`. Static binds only (D-50).

ILLUSTRATIVE: the shape of the default export of `$PB_REPO/theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts`, renamed; not compiled.

```ts
// src/node/my-backend-module.ts  (shape of chrome-bar-backend-module.ts)
import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { MY_SERVICE_PATH, MyService } from '../browser/my-service';
import { MyServiceImpl } from './my-service-impl';

export default new ContainerModule(bind => {
    bind(MyServiceImpl).toSelf().inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler<MyService>(MY_SERVICE_PATH, () =>
            ctx.container.get(MyServiceImpl)
        )
    );
});
```

If an existing class already satisfies the interface structurally, you can return it directly (`JsonRpcConnectionHandler<GroupQueryService>` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-backend-module.ts` returns `TabQueryService` for `GroupQueryService`), but then every public method of that class is callable over the path, not only the interface's (see Gotchas). Prefer a narrow impl class.

4. **PB core edit**: **Frontend proxy** in your frontend module (see section A, with `MY_SERVICE_PATH`).

5. **PB core edit**: **package.json** of the extension: register both modules.

ILLUSTRATIVE: `theiaExtensions` entries for a new extension; not copied from a PB file.

```json
"theiaExtensions": [
  { "frontend": "lib/browser/my-frontend-module" },
  { "backend": "lib/node/my-backend-module" }
]
```

6. **PB core edit**: **Compose into the app**: add `"@powerbrowser/<name>": "0.1.0"` to `dependencies` in `$PB_REPO/theia/applications/browser/package.json` (every `@powerbrowser/*` extension is listed in its `dependencies`). The `workspaces` key of `$PB_REPO/theia/package.json` already includes `extensions/*`, but its `build:extensions` script (`build:extensions` in `$PB_REPO/theia/package.json`) is a hard-coded `yarn --cwd extensions/<name> build` chain over the existing extensions: append `&& yarn --cwd extensions/<name> build` or your extension is never compiled by `yarn build`.

7. **Build** inside `nix develop .#theia` (yarn does not work outside it). Each extension builds with `tsc -b` (`"build": "tsc -b"`); copy `$PB_REPO/theia/extensions/chrome-bar/tsconfig.json`. From `$PB_REPO/theia/`, `yarn build` runs `build:extensions` then `applications/browser`'s `build` (`theia rebuild:browser`, plugin download, `theia build --app-target=browser --mode development`), which regenerates `src-gen` and bundles the app (`$PB_REPO/docs/BUILD.md`, section "Theia half").

### C. Backend calls the frontend (reverse direction, relay pattern)

Use when the backend needs something only a Theia window can reach (the window's PowerBrowserGroup actor channel to chrome). Copy `tab-store-relay`:

ILLUSTRATIVE: the `TAB_STORE_RELAY_PATH` handler of `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-backend-module.ts` with a comment added; not compiled.

```ts
// backend module (tab-store-access-backend-module.ts)
bind(ConnectionHandler).toDynamicValue(ctx =>
    new JsonRpcConnectionHandler<TabStoreRelayClient>(TAB_STORE_RELAY_PATH, client => {
        ctx.container.get(TabStoreRelayHub).add(client);    // keep the client proxy
        const server: TabStoreRelayServer = { register: async () => true };
        return server;
    })
).inSingletonScope();
```

ILLUSTRATIVE: abridged from `TabStoreRelayContribution.onStart` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-relay-contribution.ts` (the warning text is shortened); not compiled.

```ts
// frontend FrontendApplicationContribution.onStart (tab-store-relay-contribution.ts)
const target: TabStoreRelayClient = { relay: msg => this.relay(msg) }; // separate object: only relay() is callable
const hub = this.connections.createProxy<TabStoreRelayServer>(TAB_STORE_RELAY_PATH, target);
hub.register().catch(err => console.warn('relay registration failed:', err));
```

The hub keeps a list of `RpcProxy<TabStoreRelayClient>`, removes each on `client.onDidCloseConnection`, calls the newest window first and falls back to older windows if a call throws, and throws `'no PowerBrowser window is connected; open one and retry'` when none are connected (`TabStoreRelayHub` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-relay.ts`). The frontend re-checks every message kind against an allowlist (`TAB_STORE_RELAY_KINDS`) before forwarding.

### D. Add a plain HTTP route on the Theia port (rarely the right choice)

**PB core edit**: register it in a `BackendApplicationContribution.configure(app)` in a `@powerbrowser/*` extension under `$PB_REPO/theia/extensions/` (stop and ask the user first; [Stop and ask](_shared/RULES.md#stop-and-ask)). It runs after early middleware, so it is cookie-gated automatically (`configure` in `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`). Only PB's own frontend (which holds the cookie) can call it. Bind the contribution with `bind(BackendApplicationContribution).toService(...)`, as `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-module.ts` does for `PowerBrowserTokenGateContribution`.

## Reference

### HTTP routes on the Theia backend port

Both rows cite `PowerBrowserTokenGateContribution` in `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`.

| Method | Path | Auth | Response | Source |
|---|---|---|---|---|
| any | any | Cookie `POWERBROWSER_TOKEN` must equal the per-launch token (timing-safe compare), else `403` with no headers | passes to Theia | `gate`, `getTokenFromCookie`, `isTokenValid` |
| GET | `/powerbrowser/health` | cookie gate | `200 {"ok":true,"pid":<number>,"port":<number or null>}` | `configure` |

The supervisor probes health with an XHR that sets `Cookie: POWERBROWSER_TOKEN=<token>` and treats `status === 200` as healthy (`PowerBrowserAPI.probeHealth` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, called from `_probeHealth` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`).

### JSON-RPC services

| Path constant | Path | Interface / methods | Returns | Direction | Server binding |
|---|---|---|---|---|---|
| `GROUP_PATH` | `/services/powerbrowser/groups` | `GroupQueryService.listGroups()` | `GroupRow[]` (`id,title,x,y,w,h,is_active` 0/1), insertion order | frontend -> backend | `tab-query-backend-module.ts` -> `TabQueryService` |
| | | `getGroupTabs(groupId: string)` | `GroupTabRow[]`, open tabs in group, by `ord` then `uri` | | |
| | | `listUngroupedTabs()` | `GroupTabRow[]`, open tabs with no group, newest first | | |
| | | `getSettings()` | `Record<string,string>` from `settings` table | | |
| `CHROME_SUGGESTION_PATH` | `/services/powerbrowser/chrome-suggestions` | `ChromeBarSuggestionService.searchByPrefix(prefix: string, limit: number)` | `TabQueryRow[]` (`uri,url,title,last_active`); open (`closed_at IS NULL`) `http*` tabs whose url or title contains prefix (LIKE `%prefix%`, `%`/`_`/`\` escaped so they match literally), newest first. Server clamps `limit` to 1..`CHROME_SUGGESTION_LIMIT` (8) and prefix to 256 chars | frontend -> backend | `chrome-bar-backend-module.ts` -> `ChromeBarSuggestionServiceImpl` |
| `TAB_STORE_RELAY_PATH` | `/services/powerbrowser/tab-store-relay` | server: `TabStoreRelayServer.register(): Promise<boolean>`; client (frontend-implemented): `TabStoreRelayClient.relay(msg: StoreMessage): Promise<StoreReply>` | `StoreReply` = `{ ok: true, kind, ...fields }` or `{ ok: false, reason, message }` | backend -> frontend (via client proxy) | `tab-store-access-backend-module.ts` -> `TabStoreRelayHub` |

`GroupTabRow` = `TabQueryRow` + `group_id: string|null`, `thumbnail: string|null`, `x,y: number|null`, `ord: number|null` (`GroupTabRow` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-service.ts`). `listUngroupedTabs()` does not select `ord`, so its rows have no `ord` field. All `TabQueryService` reads throw when no profile dir is known, when `tabs.sqlite` cannot be opened read-only, or when its `PRAGMA user_version` is not `TAB_STORE_SCHEMA_HEAD` (6); the frontend receives a rejected promise (`openIfNeeded` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-service.ts`).

Because `GROUP_PATH` serves the `TabQueryService` instance itself, the RPC dispatcher (`$PB_REPO/theia/node_modules/@theia/core/lib/common/messaging/proxy-factory.js` (`onRequest`: `this.target[method](...args)`)) also accepts `searchByPrefix` and `setProfileDir` on that path, although `GroupQueryService` does not declare them. Do not rely on this; call only the interface methods.

`TAB_STORE_RELAY_KINDS` (only kinds the relay forwards): `readHistoryEntry`, `readBookmarkByUrl`, `listBookmarkFolder`, `projectSessionStoreTabs`, `queryTabsWithPlaces`, plus write ops `createGroup`, `renameGroup`, `moveGroup`, `resizeGroup`, `dissolveGroup`, `setActiveGroup`, `setTabGroup`, `setTabPosition`, `setGroupOrder`, `setSetting` (`TAB_STORE_RELAY_KINDS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`). Not intended for new extensions to call directly; it exists for the MCP endpoint. The window side answers a kind outside this list with `{ ok: false, reason: 'validation', message }` instead of rejecting (`TabStoreRelayContribution.relay` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-relay-contribution.ts`).

`TAB_STORE_WRITE_FIELDS` (`TAB_STORE_WRITE_FIELDS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`) lists the fields each write op forwards: `createGroup` `id,title,x,y,w,h`; `renameGroup` `id,title`; `moveGroup` `id,x,y`; `resizeGroup` `id,w,h`; `dissolveGroup` `id`; `setActiveGroup` `id`; `setTabGroup` `uri,groupId`; `setTabPosition` `uri,x,y`; `setGroupOrder` `groupId,uris`; `setSetting` `key,value`. `closeGroup` is deliberately excluded.

### Backend handshake (supervisor -> backend)

| Item | Value | Source |
|---|---|---|
| Launch | `node <app>/lib/backend/main.js --hostname 127.0.0.1 --port <0 before the first completed swap, the pinned port on respawns after it>` | `_spawnAndGate` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` |
| Token | `crypto.randomUUID()` per browser launch; written as first stdin line, never in env | `crypto.randomUUID` and `writeStdinLine` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`; `readTokenFromStdin` in `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts` |
| Cookie | `POWERBROWSER_TOKEN` on host `127.0.0.1`, path `/`, HttpOnly, not Secure, session, SameSite=Lax | `PowerBrowserAPI.setSessionCookie` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`; its caller `_spawnAndGate` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` |
| Cookie strip | The cookie is host-only and cookies are not port-scoped, so chrome removes `POWERBROWSER_TOKEN` from the `Cookie` header of every `127.0.0.1` request on the `http-on-modify-request` topic unless the request goes to the sidecar's own port and comes from the Theia frame, chrome or a Theia-origin worker. An overlay web tab loses it even on the sidecar port. The cookie stays in the store; nothing logs its value. Installed by `setGroupSenderPort`, which `_swap` calls with the live port | `tokenCookieStrip`, `tokenCookieAllowed`, `installTokenCookieStrip` and `setGroupSenderPort` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`; verify row `token-cookie-strip` in `$PB_REPO/scripts/verify-platform.sh` (`$PB_REPO/scripts/verify-token-cookie-strip.mjs`) |
| Env `POWERBROWSER_SUPERVISED` | `"1"`: read token from stdin, arm parent-death watchdog | `POWERBROWSER_SUPERVISED` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` (set in `_spawnAndGate`) |
| Env `POWERBROWSER_PROFILE_DIR` | Firefox profile dir; read via `POWERBROWSER_ENV`, used by `TabQueryService` and the MCP endpoint | `POWERBROWSER_PROFILE_DIR` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` (set in `_spawnAndGate`) |
| Env `POWERBROWSER_TOKEN_DISABLE` | `"1"` disables the gate (dev/smoke scripts only); supervisor sets `""` | `PowerBrowserTokenGateContribution.initialize` in `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts` |
| Readiness | stdout line `POWERBROWSER_BACKEND_READY {"port":N,"pid":N}` | `PowerBrowserTokenGateContribution.announce` in `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts` |
| Exit 78 | no token; unknown bound address; non-loopback bind (anything but `127.0.0.1`/`::1`) | `initialize` (no token) and `announce` (address checks) in `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts` |
| Parent death | stdin EOF/close/error -> `SIGTERM` to self (only when supervised) | `PowerBrowserParentWatchdogContribution` in `$PB_REPO/theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts` |
| Frontend URL | `http://127.0.0.1:<port>/` loaded into the shell browser element by `_swap()` | `_swap` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` |

### `POWERBROWSER_ENV` (backend code that needs supervisor values)

ILLUSTRATIVE: the import and read as `TabQueryService` does them; not compiled.

```ts
import { POWERBROWSER_ENV } from '@powerbrowser/token-gate/lib/node/powerbrowser-env';
const profileDir = POWERBROWSER_ENV['POWERBROWSER_PROFILE_DIR'] ?? '';
```

Add `"@powerbrowser/token-gate": "0.1.0"` to your extension's `dependencies` (tab-uris does: `@powerbrowser/token-gate` in `$PB_REPO/theia/extensions/tab-uris/package.json`). The import itself guarantees the capture ran before your module body, regardless of extension load order (comment on `profileDir` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-service.ts`).

`process.env.POWERBROWSER_*` is always empty in the backend: the module-level `captured` loop deletes every `POWERBROWSER_*` key at module load so terminals, tasks and the plugin host do not inherit them (`captured` in `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts`).

### `$PB_REPO/powerbrowser/endpoint-allowlist.json` (outbound egress)

Top-level keys: `$comment`, `hosts`, `prefs`. At the stamped PB commit `hosts` has 31 rows and `prefs` 28 rows; re-count at your PB HEAD with `git -C "$PB_REPO" show HEAD:powerbrowser/endpoint-allowlist.json | node -pe 'const j = JSON.parse(require("fs").readFileSync(0, "utf8")); j.hosts.length + " " + j.prefs.length'`.

| Key | Row shape | Semantics |
|---|---|---|
| `hosts[]` | `{ "host": string, "disposition": "allow" \| "deny", "reason": string }`, plus an optional `"manifest": string` naming the dotted `$PB_REPO/configuration.toml` key the host was added for (for example `search_engines[0].url`) | Match is exact string, or suffix match only when `host` begins with a literal `.`. Layer 3 (Gecko DNS log): a resolved host passes only if it matches a row with `disposition: "allow"`; a missing row or a `deny` row fails (`allowlist_host_allowed` in `$PB_REPO/scripts/verify-endpoints.sh`). Layer 4 (sidecar Node DNS, `covered` in `$PB_REPO/scripts/verify-ng-069-sidecar-egress.mjs`): a host passes if any row matches, regardless of disposition; it also derives hosts statically from `VSX_REGISTRY_URL` and the `@theia/ai-*` SDKs' `https://api.*` URLs and requires a row for each. A row with `manifest` must name the host that key currently derives, or verify row `theia-endpoints` fails as stale coverage (`$PB_REPO/scripts/verify-theia-endpoints.mjs`). |
| `prefs[]` | `{ "name": string, "expect": string, "reason": string }` | Layer 1: the installed default-pref value must equal `expect`; a pref that cannot be found fails. |

Relevant rows: `127.0.0.1` allow (sidecar loopback; exact match, so `localhost` is not covered); `open-vsx.org`, `openvsx.eclipsecontent.org`, `api.anthropic.com`, `api.openai.com` allow (user-initiated only); `lite.duckduckgo.com`, `ac.duckduckgo.com`, `en.wikipedia.org` allow (configured search engines from table `[[search_engines]]` of `$PB_REPO/configuration.toml`, each row carrying `manifest`). Run: `"$PB_REPO"/scripts/verify-endpoints.sh [--layer 1|2|3|4] [--positive-control]` (needs the built binary at `$PB_REPO/objdir/dist/bin/powerbrowser`).

The allowlist governs outbound traffic only. It does not gate, authorize, or document inbound APIs.

## Why there is no REST API and no external access

- The Theia backend has arbitrary file access and spawns terminals. Its only credential is the per-launch cookie, which lives in Firefox's cookie jar (HttpOnly) and on the backend's stdin pipe. It is never in an environment variable or a file, specifically so co-resident processes cannot read it from `/proc/<pid>/environ` (header comment of `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts`, item 2, "EXPOSURE").
- Chrome strips the cookie from requests to any other loopback port, so a local server opened in PB never receives it (`tokenCookieStrip` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`).
- The backend binds only to loopback and exits 78 otherwise.
- Widening the cookie gate to admit another credential would widen Theia's arbitrary-execution surface (header comment of `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`). This is why the MCP endpoint is a separate listener.
- PB's own frontend uses JSON-RPC over the existing WebSocket, so it needs no REST layer.

## Adding an external REST/HTTP endpoint (what it requires)

Do not add routes to the Theia port. Copy `TabStoreAccessEndpoint` (`TabStoreAccessEndpoint` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`):

1. A `BackendApplicationContribution` whose `onStart()` creates its own `http.createServer` and calls `server.listen(0, '127.0.0.1', ...)` (random port, loopback only). `onStop()` closes it and deletes the access file.
2. A per-launch secret: `crypto.randomBytes(32).toString('hex')`, checked as `Authorization: Bearer <64 hex>` with a timing-safe compare -> `401` on mismatch.
3. Reject any request with an `Origin` header -> `403` (stops browser pages on 127.0.0.1, including ones that obtained the token).
4. Require `Host` to be exactly `127.0.0.1:<port>` or `localhost:<port>` -> `403` (DNS rebinding).
5. Exact route match -> `404` otherwise; non-`POST` -> `405`; body over the cap -> `413` (the endpoint uses `MAX_BODY_BYTES = 1024 * 1024`).
6. Publish URL and token in a file in the profile dir, created at mode `0600` via exclusive create of a staging file, `chmodSync(0o600)`, then atomic `renameSync`. Rewrite it on every backend start; clients must re-read it after a restart.
7. Stay off when `POWERBROWSER_PROFILE_DIR` is empty (dev backend).
8. If the endpoint needs chrome data (Places, sessionstore, `tabs.sqlite` writes), route through `TabStoreRelayHub`; the backend has no chrome channel of its own.
9. Allowlist: inbound loopback needs no new row (`127.0.0.1` is already allowed). Any new OUTBOUND host your code contacts needs a `hosts` row in `$PB_REPO/powerbrowser/endpoint-allowlist.json`, or `$PB_REPO/scripts/verify-endpoints.sh` fails.

Remote (non-loopback) access: absent and not supported. It would require dropping the loopback-only assertions, which are hard startup failures (SIDE-01, `announce` in `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`). UNVERIFIED: no project decision record allowing it was found; the search covered `$PB_REPO/CLAUDE.md` and the token-gate sources. Verify: search `$PB_REPO/docs/` and `$PB_REPO/.planning/` for `SIDE-01` and any decision that permits a non-loopback bind.

## Rules and constraints

From `$PB_REPO/CLAUDE.md`:
- Never fork or patch Theia core. Additions are `@powerbrowser/*` extensions; `@theia/*` are npm deps pinned to the release in `$PB_REPO/theia/applications/browser/package.json` (1.76.0). `$PB_REPO/scripts/diff-theia-core.sh` is the check. If a change seems to need a core edit, reshape the change.
- Never modify Gecko outside the patch stack; Firefox internals only through `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`. A Theia backend service must not reach Firefox internals; use the actor relay.
- Design for the bridge: do not change `TabUriRegistry`'s exported shape (`$PB_REPO/scripts/verify-registry-shape.mjs`).
- Repo path contains no space (native node-gyp modules such as `better-sqlite3` fail to link otherwise).
- User-facing text: no internal identifiers (no paths like `/services/...`, ports, pref keys, raw exception messages). Errors name "PowerBrowser", state the problem plainly, end with an on-screen next step.
- Builds run inside `nix develop .#theia`.

From the extension sources:
- D-50: all DI binds are static at module load. A contribution or proxy bound later is never seen.
- Never put a secret in a `POWERBROWSER_*` env key or expect a child process to read one.
- Do not open `tabs.sqlite` yourself; reuse `TabQueryService`'s read-only handle. The one other opener, the MCP SQL tool, opens its own read-only handle in a child process (`runReadOnlySql` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-sql.ts`); `$PB_REPO/scripts/verify-sql-store-second-writer.mjs` fails any `new Database(` under `$PB_REPO/theia/` that lacks a literal `readonly: true`. Writes go through chrome.

## Gotchas

- Reading `process.env.POWERBROWSER_PROFILE_DIR` returns nothing. Use `POWERBROWSER_ENV`. This bug shipped once: `TabQueryService` served `[]` on every launch (comment on `profileDir` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-service.ts`).
- `TabQueryService.searchByPrefix` is synchronous; the group methods are `async`. Wrap sync methods in an `async` impl before exposing them via JSON-RPC (as `ChromeBarSuggestionServiceImpl` does).
- The JSON-RPC proxy object exposes every method of the bound server object. Bind a narrow impl class or a separate object literal, not a class with internal helpers (see `TabStoreRelayContribution.onStart` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-relay-contribution.ts`). `GROUP_PATH` is an existing violation: it serves `TabQueryService`, so `setProfileDir` and `searchByPrefix` are reachable there.
- Clamp and coerce all RPC arguments server-side; a negative `LIMIT` in SQLite is unbounded (`ChromeBarSuggestionServiceImpl.searchByPrefix` in `$PB_REPO/theia/extensions/chrome-bar/src/node/chrome-bar-suggestion-service-impl.ts`).
- WebSocket gating is indirect: the PB gate runs before Theia's stock `BrowserConnectionTokenBackendContribution`, so the stock `theia-connection-token` cookie is only issued to requests that passed the PB cookie check, and the stock contribution validates WebSocket upgrades (header comment and `initialize` in `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`). UNVERIFIED: that the WebSocket upgrade request itself is checked against `POWERBROWSER_TOKEN` directly; Express early middleware was read, the upgrade path was not. Verify: open a WebSocket to the backend port without the `POWERBROWSER_TOKEN` cookie in a running PB and check whether the upgrade is refused.
- `/powerbrowser/health` returns `"port": null` if called before the server's `listening` event.
- A local dev server on another `127.0.0.1` port, opened in a web tab, never receives `POWERBROWSER_TOKEN`, and a web tab pointed at the sidecar's own port gets `403` because the cookie is stripped there too (`tokenCookieAllowed` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`).
- Dev backends started by `$PB_REPO/scripts/smoke-theia.sh` or `theia_app_up` in `$PB_REPO/scripts/verify-platform.sh` run with `POWERBROWSER_TOKEN_DISABLE=1` and no profile dir: the gate is off, `TabQueryService` reads throw, and the MCP endpoint stays off. A bare `yarn start` does not set `POWERBROWSER_TOKEN_DISABLE`, so it has no token and exits 78; prefix it with `POWERBROWSER_TOKEN_DISABLE=1` (as `POWERBROWSER_TOKEN_DISABLE=1` in `$PB_REPO/scripts/smoke-theia.sh` does), or set `POWERBROWSER_TOKEN=<value>` in the environment (accepted only when `POWERBROWSER_SUPERVISED` is not `1`; `POWERBROWSER_SUPERVISED` in `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts`).
- Allowlist host matching is exact. `localhost` is not covered by the `127.0.0.1` row. Use a leading `.` for suffix rows.
- Layer 4 accepts a `deny` row as coverage; layer 3 does not. A host you intend to block for the sidecar is not enforced by layer 4's disposition.
- The relay hub tries windows newest-first and rejects when no Theia window is open; backend-to-chrome calls fail in a windowless state.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
