# PowerBrowser Theia extensions (`@powerbrowser/*`)

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/CLAUDE.md`
- `$PB_REPO/theia/package.json`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/theia/extensions/telemetry/tsconfig.json`
- `$PB_REPO/theia/extensions/chrome-bar/package.json`
- `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts`
- `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-branding-config.ts`
- `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-welcome-contribution.ts`
- `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-module.ts`
- `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`
- `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/group-query-service.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-frontend-module.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/save-page-copy-command.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-backend-module.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-service.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-backend-module.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`
- `$PB_REPO/theia/extensions/customize/src/browser/customize-frontend-module.ts`
- `$PB_REPO/theia/extensions/customize/src/browser/customize-css-contribution.ts`
- `$PB_REPO/theia/extensions/customize/src/browser/customize-privileged-js-contribution.ts`
- `$PB_REPO/theia/extensions/customize/src/browser/powerbrowser-privileged-js.ts`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-logger.ts`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-preferences.ts`
- `$PB_REPO/theia/extensions/telemetry/test/telemetry-sender.test.mjs`
- `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/main-area-exemption.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/modes-commands.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/setups-commands.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-keybindings.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-shortcuts.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-places-suggestions.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/address-bar/`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/site-identity/`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx`
- `$PB_REPO/theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts`
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/powerbrowser/shell/powerbrowser.js`
- `$PB_REPO/powerbrowser/INTERNAL-APIS.md`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/scripts/check-internals-boundary.sh`
- `$PB_REPO/scripts/verify-registry-shape.mjs`
- `$PB_REPO/scripts/verify-dev-flag-off.mjs`
- `$PB_REPO/scripts/verify-branding.mjs`
- `$PB_REPO/scripts/diff-theia-core.sh`
- `$PB_REPO/scripts/verify-theia-fresh-clone-build.sh`
- `$PB_REPO/scripts/verify-theia-build-order.mjs`
- `$PB_REPO/scripts/scan-brand-residue.mjs`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/scripts/verify-endpoints.sh`
- `$PB_REPO/scripts/verify-theia-endpoints.mjs`
- `$PB_REPO/inventory/brand-tokens.json`
- `$PB_REPO/docs/CUSTOMIZE.md`
- `$PB_REPO/docs/BUILD.md`
- `$PB_REPO/.github/workflows/verify.yml`

Status: working. Every extension under `$PB_REPO/theia/extensions/` ships in every build (list them with `git -C "$PB_REPO" ls-tree --name-only HEAD theia/extensions/`). The `customize.js` privileged layer is present-but-disabled; enabling it requires setting `theia.frontend.config.powerbrowserPrivilegedJs` to `true` in `$PB_REPO/theia/applications/browser/package.json` and rebuilding (a restart is not enough).

## What it is

PowerBrowser (PB) runs an Eclipse Theia browser app as its default GUI inside a Gecko shell; the Theia release is the `@theia/*` version pinned in `$PB_REPO/theia/applications/browser/package.json` (1.76.0 at the stamp commit). All PB-specific Theia behaviour lives in compile-time Theia extensions under `$PB_REPO/theia/extensions/` (7 extensions at the stamp commit: `git -C "$PB_REPO" ls-tree --name-only HEAD theia/extensions/ | wc -l`). Each one is a yarn workspace package that declares `theiaExtensions` in its `package.json`, compiles with `tsc -b` into `lib/`, and is bundled when the app at `$PB_REPO/theia/applications/browser/` is rebuilt. There is no runtime install path for Theia-native extensions: a new extension only exists after it is added to the app's `dependencies` and the app is rebuilt.

| Package | Side | Purpose |
|---|---|---|
| `@powerbrowser/branding` | frontend | Favicon, `welcome` widget (`view:welcome`), About dialog (rebinds `AboutDialog`). Reads `theia.frontend.config.powerbrowserBranding`. No public API. |
| `@powerbrowser/token-gate` | backend | Rejects backend HTTP/WebSocket requests without the supervisor token cookie; serves `GET /powerbrowser/health`; parent-process watchdog. Exports `POWERBROWSER_ENV` (`lib/node/powerbrowser-env`). |
| `@powerbrowser/tab-uris` | frontend + backend | URI addressing of every tab (`view:`, `settings:`, `terminal:`, output, webview, http(s) web tabs), `TabUriRegistry`, web-tab widget and its chrome channel (`WebTabChannel`), profile-backed `LocalStorageService`, readonly `tabs.sqlite` reader (`TabQueryService`), chrome-store reader (`ChromeStoreClient`), the tab-store MCP endpoint, "Open Browser Window" and "Save Page Copy" commands. |
| `@powerbrowser/customize` | frontend | Loads user `customize.css`; optional privileged `customize.js` (off). |
| `@powerbrowser/telemetry` | frontend | `telemetry.telemetryLevel` preference, batching sender, `PowerBrowserTelemetryLogger`, uncaught-error capture. |
| `@powerbrowser/modes` | frontend | Modes (Coding / Browsing / Organising perspectives + custom modes in `modes.json`), Setups (`setups.json`), dependent windows, Panorama tab-group model and widget. |
| `@powerbrowser/chrome-bar` | frontend + backend | The address pill is the `AddressBar` class (`address-bar/address-bar.tsx`), rendered by the bar widget between Home and New Tab. Typed text resolves chrome-side through `ChromeStoreClient.resolveTypedAddress`; inline origin autofill, Ctrl+Enter completion of a bare name, Alt+Enter and Ctrl+click or middle-click to open a row in a new tab, switch-to-tab rows for open tabs, and Shift+Delete to remove a history row. Address modes (`address-bar/address-bar-mode-table.ts`): Address, Command centre, Tabs, Bookmarks, History, Actions, and one mode per search engine. The default is Command centre in Coding, Address in Browsing and Tabs in Organising. `?` enters the default engine's mode, `@alias` an engine's mode, and `*` (Bookmarks), `%` (Tabs), `^` (History) and `>` (Actions) enter those modes. Command centre sends nothing to chrome. The identity box and site panel show the connection state pushed with the web tab. The hamburger (`site-identity/app-menu.ts`) opens a per-request menu of New Tab, Settings, Passwords, Add-ons, Help and Quit: the stock-page rows call `ChromeStoreClient.openStockPage`, Quit calls `ChromeStoreClient.quitRequest`, and the History row stays out of the menu until its `minPhase` (33) is reached. The chrome bar also owns the tab strip, layout controls, back/forward/reload/new-tab commands and their buttons (the Reload button becomes a Stop button while a page loads; Stop has no command id), the Back/Forward session-history menu, the Home button, suggestion service (JSON-RPC backend), top-tabs side panels, the page-focus shortcut relay (`ChromeBarShortcutRelay`), and the settings `browser.showHomeButton`, `browser.homePage`, `browser.defaultSearchEngine` and `browser.searchSuggestions` (search-engine suggestions while typing; default `true`, User scope). |

Dependency order between them (from each `package.json`): `token-gate` <- `tab-uris` <- `customize`, `modes` <- `chrome-bar`. `branding` and `telemetry` are standalone.

## Use it when / Do not use it when

Use a new `@powerbrowser/*` Theia extension when:
- You need UI inside the PB shell: a widget, view, command, keybinding, menu, preference, status-bar item, or open handler for a URI scheme.
- You need to read PB state that is already exposed through a DI service listed below (tabs, groups, modes, setups, history/bookmarks through `ChromeStoreClient`).
- You need a backend (Node) service reachable from the frontend over Theia JSON-RPC (pattern: `chrome-bar` backend module).

Do not use it when:
- You only want to restyle the shell: write `customize.css` (no build needed). See "customize.css" below.
- You need a new Firefox/Gecko capability (prefs, places writes, window control). A Theia extension cannot reach Firefox internals directly; that requires a new message `kind` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` plus a row in `$PB_REPO/powerbrowser/INTERNAL-APIS.md`. See [02-powerbrowser-api-bridge.md](02-powerbrowser-api-bridge.md).
- You need a web-content extension (content scripts, page APIs): use a Firefox WebExtension. Note WebExtension toolbar/popup UI is not rendered in the Theia shell; see [05-webextensions.md](05-webextensions.md).
- You need an external process (an AI agent, a script) to query tabs/history/bookmarks: use the existing tab-store MCP endpoint (`$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`); see [03-tab-store-mcp-server.md](03-tab-store-mcp-server.md).
- You need UI or AI tools that require no PB rebuild and no PB DI services: use a Theia/VS Code plugin; see [06-theia-plugins-and-ai.md](06-theia-plugins-and-ai.md).
- You need a new backend HTTP route or JSON-RPC detail beyond the pattern in step B.4: see [04-theia-backend-rpc-http.md](04-theia-backend-rpc-http.md).
- You want to change Theia core behaviour by editing `node_modules/@theia/*`: forbidden (rule 1 below). Rebind the DI token from your extension instead.

## How to use

### A. Inject an existing PB service

All PB services are bound in singleton scope in their owner's frontend module. Inject them with inversify `@inject`. Import from the package's compiled `lib/` path (that is how PB's own extensions import each other).

ILLUSTRATIVE: assembled from the import paths and DI tokens listed in "Public DI services"; not compiled.

```ts
import { injectable, inject } from '@theia/core/shared/inversify';
import { TabUriRegistry } from '@powerbrowser/tab-uris/lib/browser/tab-uri-registry';
import { ChromeStoreClient } from '@powerbrowser/tab-uris/lib/browser/chrome-store-client';
import { GroupQueryService } from '@powerbrowser/tab-uris/lib/browser/group-query-service';
import { ModeService } from '@powerbrowser/modes/lib/browser/mode-service';
import { SetupsService } from '@powerbrowser/modes/lib/browser/setups-service';
import { GroupModel } from '@powerbrowser/modes/lib/browser/group-model';
import { PowerBrowserTelemetryLogger } from '@powerbrowser/telemetry/lib/browser/telemetry-logger';

@injectable()
export class MyService {
    @inject(TabUriRegistry) protected readonly tabUris: TabUriRegistry;
    @inject(ChromeStoreClient) protected readonly store: ChromeStoreClient;
    @inject(GroupQueryService) protected readonly groups: GroupQueryService; // Symbol token + interface of the same name
    @inject(ModeService) protected readonly modes: ModeService;
}
```

Declare every `@powerbrowser/*` package you import in your own `package.json` `dependencies` (`"@powerbrowser/tab-uris": "0.1.0"`). The `theia-build-order` check fails on an undeclared import.

### B. Create a new `@powerbrowser/<name>` extension

The extension lives in `$PB_REPO/theia/extensions/<name>/`. Steps marked **PB core edit** change tracked files in `$PB_REPO`; stop and ask the user before each one ([Stop and ask](_shared/RULES.md#stop-and-ask)).

1. **PB core edit**: Create `$PB_REPO/theia/extensions/<name>/` with `package.json`, `tsconfig.json`, `src/browser/` (and `src/node/` if you need a backend). Copy `tsconfig.json` from `$PB_REPO/theia/extensions/telemetry/tsconfig.json` (`rootDir: src`, `outDir: lib`, `composite: true`, `experimentalDecorators`, `emitDecoratorMetadata`, `jsx: react`, `module: commonjs`, `target: ES2017`). Five extensions (branding, chrome-bar, modes, tab-uris, telemetry) use this file byte-identically; `customize` adds `"references": [{ "path": "../tab-uris" }]`, and `token-gate` (Node-only) drops `jsx` and the `dom` lib.

2. **PB core edit**: `package.json`, shape copied from `$PB_REPO/theia/extensions/chrome-bar/package.json`.

ILLUSTRATIVE: the shape of `$PB_REPO/theia/extensions/chrome-bar/package.json` with placeholder names; not a PB file.

```json
{
  "private": true,
  "name": "@powerbrowser/<name>",
  "version": "0.1.0",
  "license": "MIT",
  "dependencies": {
    "@powerbrowser/tab-uris": "0.1.0",
    "@theia/core": "1.76.0"
  },
  "theiaExtensions": [
    { "frontend": "lib/browser/<name>-frontend-module" },
    { "backend": "lib/node/<name>-backend-module" }
  ],
  "files": ["lib", "src"],
  "scripts": {
    "clean": "rm -rf lib *.tsbuildinfo",
    "build": "tsc -b"
  }
}
```

Pin every `@theia/*` dependency to exactly the release `$PB_REPO/theia/applications/browser/package.json` pins (1.76.0 at the stamp commit); the root `$PB_REPO/theia/package.json` key `resolutions` pins them all. Drop the `backend` entry if you have no Node side. One entry may carry both keys (`tab-uris` does this for its tab-store pair).

1. **PB core edit**: Frontend module `src/browser/<name>-frontend-module.ts`. Default-export a `ContainerModule`; bind every contribution statically at module load.

ILLUSTRATIVE: the pattern of the PB frontend modules (for example `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts`); not compiled.

```ts
import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution } from '@theia/core/lib/common';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { MyContribution } from './my-contribution';

export default new ContainerModule(bind => {
    bind(MyContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(MyContribution);
    bind(CommandContribution).toService(MyContribution);
});
```

1. **PB core edit**: Optional backend JSON-RPC service. Put the path constant and interface in `src/browser/` (shared by both sides), the implementation in `src/node/`. The pattern is the one `chrome-bar` uses (`CHROME_SUGGESTION_PATH` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts`, `bind(ChromeBarTabSuggestions)` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts`).

ILLUSTRATIVE: assembled from the `chrome-bar` JSON-RPC pattern; not compiled.

```ts
// src/browser/my-service.ts
export const MY_SERVICE_PATH = '/services/powerbrowser/my-service';
export interface MyService { doThing(arg: string): Promise<string>; }
export const MyService = Symbol('MyService');

// src/node/<name>-backend-module.ts
import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { MY_SERVICE_PATH, MyService } from '../browser/my-service';
import { MyServiceImpl } from './my-service-impl';

export default new ContainerModule(bind => {
    bind(MyServiceImpl).toSelf().inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler<MyService>(MY_SERVICE_PATH, () => ctx.container.get(MyServiceImpl))
    );
});

// in the frontend module
import { WebSocketConnectionProvider } from '@theia/core/lib/browser';
bind(MyService).toDynamicValue(ctx =>
    WebSocketConnectionProvider.createProxy<MyService>(ctx.container, MY_SERVICE_PATH)
).inSingletonScope();
```

This rides the existing token-gated WebSocket; it adds no HTTP route, so it needs no token-gate change. A new Express HTTP route needs a `BackendApplicationContribution.configure(app)` (pattern: `configure` in `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`) and is reachable only with the gate cookie.

1. **PB core edit**: Add the extension to the app: in `$PB_REPO/theia/applications/browser/package.json` `dependencies`, add `"@powerbrowser/<name>": "0.1.0"` (keep the alphabetical order the file uses).

2. **PB core edit**: Add it to the build chain: in `$PB_REPO/theia/package.json`, append `&& yarn --cwd extensions/<name> build` to the `build:extensions` script, positioned after every `@powerbrowser/*` package it imports. The chain is hand-ordered and `tsc -b` does not build sibling workspaces for you.

3. Build inside the Nix dev shell (yarn does not work in the host shell). Run these commands from the root of this repo:

```sh
export PB_REPO="$(cd "${PB_REPO:-../Power-Browser}" && pwd)"
cd "$PB_REPO"
nix develop .#theia --command bash -c 'cd theia && yarn install --ignore-scripts --frozen-lockfile && (cd node_modules/drivelist && node-gyp rebuild) && yarn build'
```

`yarn build` = `yarn build:extensions && yarn --cwd applications/browser build` (script `build` in `$PB_REPO/theia/package.json`). This is the install form `$PB_REPO/docs/BUILD.md` prescribes (section "Theia half") and CI runs (step "Install and build the Theia workspace" in `$PB_REPO/.github/workflows/verify.yml`). Do not use a bare `yarn install`: it runs the dependency install scripts that PB deliberately skips; `drivelist` is the one native module rebuilt by hand. Drop `--frozen-lockfile` (keep `--ignore-scripts`) only when the extension adds a third-party dependency that is not in `$PB_REPO/theia/yarn.lock`; then commit the `yarn.lock` change with the extension. UNVERIFIED: whether adding a workspace that only depends on already-locked `@theia/*` versions changes `yarn.lock` (and so fails `--frozen-lockfile`). Verify: in a scratch clone of `$PB_REPO`, add an empty workspace, run `yarn install --ignore-scripts` in `nix develop .#theia`, then run `git diff --stat` in the clone to see whether the lock file changed.

1. Run the commit gate: `"$PB_REPO"/scripts/verify-platform.sh --quick`. Relevant rows: `theia-build-order` (+ `-self-test`), `chrome-bar-typecheck` (if you import `@powerbrowser/chrome-bar`), `scan-brand-residue`, `gui04-registry-shape`. Stage new files first: `scan-brand-residue` iterates `git ls-files`, so unstaged files are invisible to it.

2. **PB core edit**: Add a check for your extension: append one `"label|command"` row to the `CHECKS` array in `$PB_REPO/scripts/verify-platform.sh` (the array `local -a CHECKS=(` under the comment header "THE REGISTRY"). Never create a sibling driver script. These example rows are quoted verbatim from that array (rows `tab-uris-typecheck`, `telemetry`, `telemetry-self-test`):

```sh
"tab-uris-typecheck|check_tab_uris_typecheck"
"telemetry|node $REPO_ROOT/scripts/verify-telemetry.mjs"
"telemetry-self-test|node $REPO_ROOT/scripts/verify-telemetry.mjs --self-test"
```

Give the check a `--self-test` that plants a fault and must go red. A plain-Node unit test can import `src/*.ts` directly (node type-stripping; see `$PB_REPO/theia/extensions/telemetry/test/telemetry-sender.test.mjs`) if the source uses erasable TypeScript syntax only.

### C. Restyle the shell with `customize.css`

1. Create `${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser/customize.css` (that is `$THEIA_CONFIG_DIR`, set by the app `start` script). PB never creates it.
2. Write ordinary CSS. It is injected as the last `<style>` in `document.head` and re-appended after each change, so it wins source-order ties against Monaco and terminal styles.
3. Save. Changes apply live (150 ms debounce). Deleting the file removes the styling immediately.

## Reference

### Public DI services

In the "Bound by" column, the `bind(...)` expression is the symbol to grep in the named module.

| Symbol | Import path | Kind / token | Bound by | Scope |
|---|---|---|---|---|
| `TabUriRegistry` | `@powerbrowser/tab-uris/lib/browser/tab-uri-registry` | class | `bind(TabUriRegistry)` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts` | singleton |
| `ChromeStoreClient` | `@powerbrowser/tab-uris/lib/browser/chrome-store-client` | class | `bind(ChromeStoreClient)` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-frontend-module.ts` | singleton |
| `GroupQueryService` | `@powerbrowser/tab-uris/lib/browser/group-query-service` | `Symbol('GroupQueryService')` + interface; JSON-RPC proxy | `bind(GroupQueryService)` in `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts` (frontend proxy); `JsonRpcConnectionHandler<GroupQueryService>` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-backend-module.ts` (backend) | singleton |
| `ModeService` | `@powerbrowser/modes/lib/browser/mode-service` | class | `bind(ModeService)` in `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts` | singleton |
| `SetupsService` | `@powerbrowser/modes/lib/browser/setups-service` | class | `bind(SetupsService)` in `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts` | singleton |
| `GroupModel` | `@powerbrowser/modes/lib/browser/group-model` | class | `bind(GroupModel)` in `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts` | singleton |
| `GroupActorClient` | `@powerbrowser/modes/lib/browser/group-actor-client` | class (needed as argument to `GroupModel` mutators) | `bind(GroupActorClient)` in `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts` | singleton |
| `PowerBrowserTelemetryLogger` | `@powerbrowser/telemetry/lib/browser/telemetry-logger` | class, implements `@theia/core` `TelemetryLogger` | `bind(PowerBrowserTelemetryLogger)` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts` | singleton |
| `ChromeBarSuggestionService` | `@powerbrowser/chrome-bar/lib/browser/chrome-bar-suggestion-service` | `Symbol('ChromeBarSuggestionService')` + interface `searchByPrefix(prefix: string, limit: number): Promise<TabQueryRow[]>`; frontend impl `ChromeBarPlacesSuggestions` merges open-tab rows (backend proxy token `ChromeBarTabSuggestions`), kept only while a web tab in the shell shows that address, with history/bookmark matches; each row carries its `source` (`SourcedRow`) | `bind(ChromeBarSuggestionService)` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts` (proxy: `bind(ChromeBarTabSuggestions)` in the same file) | singleton |
| `AddressBar` | `@powerbrowser/chrome-bar/lib/browser/address-bar/address-bar` | class; the address pill, not a widget. `ChromeBarWidget` calls `attach(host)` and `render()`. Public: `goHome(tab)`, `focusAddress()`, `joinActiveGroup(widget)`, `syncAddressFromWidget(widget)`, `onCurrentWidgetChanged(widget)`, `uiModeChanged(id)`, `defaultMode()`, `repositionDropdown()`. Protected: `openRowInNewTab` and `runOneOff` | `bind(AddressBar)` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts` | singleton |
| `AddressBarModeContribution`, `AddressBarMode` | `@powerbrowser/chrome-bar/lib/browser/address-bar/address-bar-modes` | `Symbol('AddressBarModeContribution')` + interface `{id, label, iconClass, restrictToken?, provide?(text, token)}`. A contribution whose `id` is not in `LOCAL_MODES` (`address-bar-mode-table.ts`) is ignored. Built-in: `TabsAddressBarMode`, `BookmarksAddressBarMode`, `HistoryAddressBarMode`, `ActionsAddressBarMode`, `CommandCentreAddressBarMode` (`command-centre.ts`) | `bindContributionProvider(bind, AddressBarModeContribution)` and one `bind(AddressBarModeContribution).toService(...)` per mode, in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts` | contribution point and each mode singleton |
| `registerLateOpenHandler(openerService, handler): Disposable` | `@powerbrowser/tab-uris/lib/browser/tab-uris-frontend-module` | function | n/a | n/a |
| `WebTabOpenHandler` | `@powerbrowser/tab-uris/lib/browser/web-tab` | class, `OpenHandler` priority 1000 for http(s) and `about:blank` (`EMPTY_PAGE_URL`); `open(uri, {rowKey?})`, `openUrl(url, rowKey?): Promise<WebTabWidget>` (opens and activates), `openInBackground(url, ref): Promise<WebTabWidget>` (opens a new web tab directly after the widget `ref` with `mode: 'tab-after'`; the current tab stays current; http(s) URLs only, otherwise it throws `Error('@powerbrowser/tab-uris: openInBackground takes an http(s) URL only')`). Factory id `WEB_TAB_FACTORY_ID = 'powerbrowser.web-tab'`; the factory refuses ids failing `isCurrentSessionTabId` | `bind(WebTabOpenHandler)` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts` | singleton |
| `WebTabChannel` | `@powerbrowser/tab-uris/lib/browser/web-tab` | class; `send(msg)` (fire-and-forget), `request(msg): Promise<WebTabReply>`, `onPush(kind, handler): Disposable` (subscribe to one chrome push kind: `state`, `pageFocus`, `shortcut` or `flushShellState`), `widgetOf(tabId): WebTabWidget \| undefined`. Message kinds and payloads: [02-powerbrowser-api-bridge.md](02-powerbrowser-api-bridge.md#push-messages-powerbrowserwebtabstate) | `bind(WebTabChannel)` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts` | singleton |
| `WebTabActivationContribution` | `@powerbrowser/tab-uris/lib/browser/web-tab` | `FrontendApplicationContribution`: sends `webTabActivated` with the selected web tab id (or null) on each change of the main area's current title | `bind(WebTabActivationContribution)` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts` | singleton |
| `ChromeBarShortcutRelay` | `@powerbrowser/chrome-bar/lib/browser/chrome-bar-shortcuts` | `FrontendApplicationContribution`: subscribes to the `pageFocus` and `shortcut` pushes and runs the action of each `PAGE_SHORTCUTS` row on the pushed tab (the `home` row calls `AddressBar.goHome`) | `bind(ChromeBarShortcutRelay)` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts` | singleton |
| `tabKeyOf(widget, registry): string`, `LiveTab {uri,url,title}` | `@powerbrowser/modes/lib/browser/group-model` | function / type: the one `tabs.uri` row-key rule (`tabKeyOf` and `LiveTab` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`) | n/a | n/a |
| `planWebTabRestore(settings, tabs: SavedWebTab[], quitAt): WebTabRestore[]` | `@powerbrowser/modes/lib/browser/group-model` | function: launch-restore policy from `restore_*` settings (`planWebTabRestore` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`) | n/a | n/a |
| `MainAreaExemption`, `TabStripWidget` | `@powerbrowser/modes/lib/browser/main-area-exemption`, `@powerbrowser/chrome-bar/lib/browser/tab-strip-widget` | internal classes (keeps main-area tabs across mode switches; the tab strip). `MainAreaExemption` has no public API. `TabStripWidget` is internal and not a documented extension API; its public methods are `primaryBar()`, `hasStack()`, `dissolve()` and `switchOrder(anchor): Widget[]` (as in [doc 09](09-tabs-reference.md#apis-by-layer)). `switchOrder` returns the order the tab-switching keys walk (the strip's tabs in Browsing mode when the strip lists `anchor`, otherwise the main-area tab bar holding `anchor`) | `bind(MainAreaExemption)` in `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`, `bind(TabStripWidget)` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts` | singleton |

Note: `GroupQueryService` is bound in the `modes` module, not in `tab-uris`. Injecting it requires `@powerbrowser/modes` in the app (it always is).

### `TabUriRegistry` (shape asserted; treat as a stable API)

`$PB_REPO/scripts/verify-registry-shape.mjs` asserts the exported member set of `TabUriRegistry` (row `gui04-registry-shape`).

| Method | Params | Returns | Notes |
|---|---|---|---|
| `getViewContribution(name)` | `string` | `AbstractViewContribution<Widget> \| undefined` | Index of all view contributions by `effectiveWidgetId`, built lazily on first call. |
| `parseName(uri)` | `URI` (`@theia/core/lib/common/uri`) | `string` | `scheme:x`, `scheme:/x`, `scheme:///x`, `scheme://x` all yield `x`. |
| `createWidgetOptions(name)` | `string` | `ViewContainerIdentifier \| undefined` | `undefined` (never `{}`) for factories without options. |
| `uriOf(widget)` | `Widget` | `URI \| undefined` | `settings:`, `terminal:<name>`, output URI, extension-detail/webview URIs, live page URL for web tabs, `view:<factoryId>`; `undefined` for unowned widgets. |

### `ChromeStoreClient` (reads Firefox-owned stores through the `PowerBrowserGroup` JSWindowActor)

Request fields, reply fields and refusal messages of each kind are in [02-powerbrowser-api-bridge.md](02-powerbrowser-api-bridge.md#store-kinds-handlestorerequest-extra-shell-window-gate).

| Method | Params | Returns | Errors |
|---|---|---|---|
| `request(msg, timeoutMs = STORE_ACK_TIMEOUT_MS)` | `StoreMessage {kind, ...}`; `STORE_ACK_TIMEOUT_MS` is 8000 ms | `Promise<StoreReply>` | Never rejects; timeout gives `{ok:false, reason:'timeout'}`. |
| `readHistoryEntry(url)` | `string` | `Promise<{url,title} \| null>` | Rejects on `ok:false`. |
| `readBookmarkByUrl(url)` | `string` | `Promise<{guid,title,url} \| null>` | same |
| `listBookmarkFolder(folderGuid)` | `string` | `Promise<BookmarkEntry[]>` | same |
| `projectSessionStoreTabs()` | none | `Promise<{uri,url,title,last_active}[]>` | same |
| `savePageCopy(uri)` | tab `uri` | `Promise<{dir, bytes}>` (under `<profile>/saved-pages/`) | 120 s timeout; rejects with chrome's message. |
| `searchPlaces(text, limit, restrict?)` | `string, number, 'bookmark' \| 'history'` (optional) | `Promise<{url,title,frecency,bookmarked}[]>` | http(s) only, bookmarks first. With `restrict`, lists that one source alone, newest first, empty text included (`searchPlacesRestricted` in `PowerBrowserAPI.sys.mjs`). |
| `resolveTypedAddress(text, engineName = '', canonize = false, forceSearch = false)` | `string, string, boolean, boolean` | `Promise<ResolvedAddress>`; `ResolvedAddress = {kind: 'visit' \| 'search' \| 'refused' \| 'no-engine', url?, engineName?}` | Rejects on `ok:false` (empty or oversized text, malformed engine name). Only chrome mints a search URL. `canonize: true` (the chrome bar's Ctrl+Enter) first completes a bare name such as `example` to `www.example.com`. `forceSearch: true` (a one-off engine, and an engine mode's commit) skips fixup and searches the text with the engine. |
| `listSearchEngines()` | none | `Promise<SearchEngineList>`; `{engines: {name, icon: string \| null, aliases: string[]}[], defaultName: string}`; `aliases` are Gecko's engine aliases, at most 8 of at most 64 characters each | Rejects on `ok:false`. |
| `placesFavicons(urls)` | `string[]` | `Promise<Record<string, string>>`; cached favicon `data:image/` URIs keyed by URL, first 10 URLs only; a URL with no cached icon is absent | Rejects on `ok:false`. |
| `searchSuggestions(text, engineName = '')` | `string, string` | `Promise<string[]>`; up to 4 search-engine suggestions; `[]` when chrome resolves the text as an address, finds no engine, or the fetch fails | Rejects on `ok:false` (empty or oversized text, malformed engine name). Sends the typed text to the search engine. |
| `autofillOrigin(text)` | `string` | `Promise<{text, url} \| null>`; the visited http(s) origin with the highest frecency whose host starts with the text, for inline autofill; null on no match or text that is not a host prefix | Rejects on `ok:false`. |
| `removeHistoryEntry(url)` | `string` (http(s)) | `Promise<boolean>`; true when Places held the page | Rejects on `ok:false`. Privileged Places write: only an event handler in `$PB_REPO/theia/extensions/chrome-bar/src/browser/address-bar/address-bar.tsx` may call it, never a command, a key row or another extension. |
| `readClipboardText()` | none | `Promise<string>`; the global clipboard's text, at most 8192 characters; `""` when empty | Rejects on `ok:false`. Privileged: only the address pill's Paste and Paste & Go call it. |
| `openStockPage(page)` | `string`: `settings`, `addons`, `passwords`, `processes` or `support` | `Promise<string>`; chrome's outcome word, `opened` or `opened-window` | Rejects on `ok:false` (an unknown page name is refused). Chrome holds the URL, so the frontend sends only the name. Store-write kind, sent only from the app menu's row handler; never relayed to MCP. |
| `quitRequest()` | none | `Promise<string>`; `applied`, or `cancelled` when a page's leave prompt declined the quit (an answer, not an error) | Rejects on `ok:false` for any other failure. Lifecycle kind, sent only from the chrome bar widget's Quit row. |
| `queryTabsWithPlaces(query = {})` | `{bookmarked?, open?, limit?}` | `Promise<TabPlacesRow[]>` | |
| `queryTabsWithPlacesResult(query = {})` | same | `Promise<{rows, truncated}>` | |

Wire: `document.dispatchEvent(new CustomEvent('PowerBrowserGroupRequest', {bubbles:true, detail:{requestId, msg}}))`, reply on `window` event `PowerBrowserGroupResponse`. Only kinds the chrome side implements answer; you cannot add one from Theia.

### `GroupQueryService` (JSON-RPC at `/services/powerbrowser/groups`, backed by the readonly `tabs.sqlite` handle in `TabQueryService`)

| Method | Returns |
|---|---|
| `listGroups()` | `Promise<GroupRow[]>`; `GroupRow = {id, title, x, y, w, h, is_active: 0\|1}` |
| `getGroupTabs(groupId)` | `Promise<GroupTabRow[]>`; `{uri, url, title, last_active, group_id, thumbnail, x, y, ord}` |
| `listUngroupedTabs()` | `Promise<GroupTabRow[]>` |
| `getSettings()` | `Promise<Record<string,string>>` (the `settings` table) |

Read-only. Writes go through `GroupActorClient.mutate` to chrome.

### `ModeService`

| Member | Signature | Notes |
|---|---|---|
| `activateMode` | `(id: string) => Promise<void>` | Shipped ids `coding`, `browsing`, `organising`; custom ids `custom-<slug>`. Unknown id falls back to `browsing`. |
| `getCustomModes` | `() => Array<{id, name}>` | From `user-storage:/user/modes.json`. |
| `whenCustomModesLoaded` | `() => Promise<void>` | Never rejects. Await before `hasCustomMode` at startup. |
| `hasCustomMode` | `(id: string) => boolean` | |
| `saveCurrentAsMode` | `() => Promise<void>` | Opens a QuickInput name prompt (UI). |
| `customModeIdFor` (exported function) | `(name: string) => string` | `custom-` + lowercase slug. |

### `SetupsService` (store: `user-storage:/user/setups.json`)

| Member | Signature | Notes |
|---|---|---|
| `saveCurrentAsSetup` | `() => Promise<void>` | QuickInput prompt. |
| `restoreSetup` | `(name?: string) => Promise<void>` | No name opens a picker. |
| `deleteSetup` | `() => Promise<void>` | Picker plus confirmation; no undo. |
| `openDependent` | `(widgetId?: string) => Promise<void>` | Moves an extractable widget to a secondary window; defaults to active widget. |
| `listRows` | `() => Array<{name, meta, current}>` | |
| `restoreWebTab` | `(tab: {rowKey, url, withHistory}) => Promise<Widget \| undefined>` | Session-restore internals. |

### `GroupModel` (Panorama in-memory model; loads at layout init)

Reads: `onDidChange: Event<void>`, `isLoaded`, `hasLoadFailed`, `hasPendingWrite`, `listGroups(): readonly PanoramaGroup[]`, `getTabs(groupId)`, `listUngrouped()`, `getActiveGroupId()`, `keyOf(widget)`, `liveTabs(widgets)`, `showsInStrip(widget, current)`, `isClosing(id)`, `isClosingKey(key)`, `canCloseGroup(id)`, `listClosing()`, `reload()`, `load(reader: GroupQueryService, live?)`.
Writes (each takes a `GroupActorClient` first): `createGroup(client, at?)`, `commitTitle(client, id, raw)`, `moveGroup(client, id, x, y)`, `resizeGroup(client, id, w, h)`, `moveCard(client, uri, toGroupId, index?)`, `placeCard(client, uri, x, y)`, `dissolveGroup(client, id)`, `closeGroup(client, id)`, `commitClose(client, id)`, `commitAllClosing(client)`, `closeCard(client, tab)`, `setActiveGroup(client, id)`, `retryPending(client)`. Also `joinActiveGroup(widget)`, `undoCloseGroup(id)`, `reopen(tab)`, `rememberThumbnail(uri, png)`.
Types: `PanoramaGroup {id,title,x,y,w,h,isActive}`, `PanoramaTab {uri,url,title,thumbnail?,x?,y?,open?}`.

### `GroupActorClient.mutate(msg: GroupMutation): Promise<GroupReply>`

Rejects with `GroupWriteError` (`reason: 'validation'|'store'|'timeout'`), 5 s ack timeout (`GROUP_ACTOR_ACK_TIMEOUT_MS`). `GroupMutation.kind` values: `createGroup`, `setTabGroup`, `setTabPosition`, `setGroupOrder`, `captureShellRegion`, `moveGroup`, `resizeGroup`, `renameGroup`, `dissolveGroup`, `closeGroup`, `setActiveGroup`, `trackTab`, `closeTab`, `touchTab` (field shapes in `GroupMutation` in `$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts`). Prefer the `GroupModel` methods; they keep the model and store in sync.

### `PowerBrowserTelemetryLogger`

| Method | Gating |
|---|---|
| `logUsage(eventName, data?)` | Sent only at level `all`. |
| `logError(eventNameOrError, data?)` | Sent at every level except `off`. |
| `dispose()` | |

Never throws. Levels: `off`, `crash`, `error`, `all` (preference `telemetry.telemetryLevel`, default from `theia.frontend.config.powerbrowserTelemetry.level`, shipped `off`, endpoint `null`).

### Command ids registered by PB extensions (run with `CommandService.executeCommand`)

`powerbrowser.open-browser-window`, `powerbrowser.tab.savePageCopy`, `powerbrowser.welcome:toggle`, `powerbrowser.chrome-bar.back`, `.forward`, `.reload`, `.new-tab`, `.focus-address`, `powerbrowser.modes.activate` (arg: mode id; default `browsing`), `powerbrowser.modes.save-as-mode`, `powerbrowser.setups.save-setup`, `.restore-setup`, `.delete-setup`, `.open-dependent`, `powerbrowser.panorama.new-group`, `.close-group`, `.show-canvas`, `.show-tree`, `.retry-save`, `.undo-close-group`.

Each id is exported as a constant next to its `Command` object: `OPEN_BROWSER_WINDOW_COMMAND_ID` (`@powerbrowser/tab-uris/lib/browser/browser-window-command`), `SAVE_PAGE_COPY_COMMAND` (`@powerbrowser/tab-uris/lib/browser/save-page-copy-command`), `PowerBrowserWelcomeCommand` (`powerbrowser.welcome:toggle`, `@powerbrowser/branding/lib/browser/powerbrowser-welcome-contribution`), `CHROME_BAR_*_COMMAND_ID` (`@powerbrowser/chrome-bar/lib/browser/chrome-bar-commands`), `MODES_*_COMMAND_ID` (`@powerbrowser/modes/lib/browser/modes-commands`), `SETUPS_*_COMMAND_ID` (`@powerbrowser/modes/lib/browser/setups-commands`), `PANORAMA_*_COMMAND_ID` (`@powerbrowser/modes/lib/browser/panorama-commands`). Import the constant instead of retyping the string. `CHROME_BAR_BACK`, `CHROME_BAR_FORWARD`, `CHROME_BAR_RELOAD` and `CHROME_BAR_NEW_TAB` carry `category: CHROME_BAR_COMMAND_CATEGORY` (`'Browser'`, in `chrome-bar-commands.ts`). The focus command has no label or category and stays out of the palette.

Keybindings PB registers in Theia (`ChromeBarKeybindingContribution.registerKeybindings` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-keybindings.ts`):
- `ctrlcmd+l` and `alt+d` run `powerbrowser.chrome-bar.focus-address` with `when: '!editorFocus && !terminalFocus'`, so Monaco and the terminal keep Ctrl+L.
- `f6`, `shift+f6`, `ctrlcmd+up`, `ctrlcmd+down`, `alt+up` and `alt+down` are bound to `KeybindingRegistry.PASSTHROUGH_PSEUDO_COMMAND` with `when` set to `ADDRESS_FOCUSED_CONTEXT_KEY` (`'powerbrowser.addressFocused'`); Ctrl/Cmd+Up/Down and Alt+Up/Down cycle and open the pill's modes. The chrome-bar widget sets that context key on the address pill's input element only, so in the pill F6 and Shift+F6 pass through to the pill's own handler (which returns focus to the page) instead of a global F6 binding; F6 elsewhere in Theia is unchanged.

Ctrl+Q in the shell window is not a Theia keybinding either: `powerbrowser.js` adds a chrome `<key>` (`powerbrowser-quit-key`) that calls the one quit path, so no page and no Theia binding can swallow it. Browser keys pressed while a web page has focus are not Theia keybindings. A focused overlay page owns the keyboard, so chrome catches each key with a page-scoped `<key>` row and pushes a `shortcut` message; `ChromeBarShortcutRelay` runs the action of the matching `PAGE_SHORTCUTS` row (`PAGE_SHORTCUTS` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-shortcuts.ts`) on the pushed tab, and sets the context key `powerbrowser.webPageFocused` (`PAGE_FOCUS_CONTEXT_KEY`) from the `pageFocus` push. The key list is in [Commands and keybindings touching tabs](09-tabs-reference.md#commands-and-keybindings-touching-tabs).

### JSON-RPC / HTTP paths (all behind the token-gate cookie)

| Path | Interface | Defined at |
|---|---|---|
| `/services/powerbrowser/groups` | `GroupQueryService` | `GROUP_PATH` in `$PB_REPO/theia/extensions/tab-uris/src/browser/group-query-service.ts` |
| `/services/powerbrowser/chrome-suggestions` | `ChromeBarSuggestionService` | `CHROME_SUGGESTION_PATH` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts` |
| `/services/powerbrowser/tab-store-relay` | `TabStoreRelayClient` / `TabStoreRelayServer` (internal relay for the MCP endpoint) | `TAB_STORE_RELAY_PATH` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts` |
| `GET /powerbrowser/health` | HTTP | `/powerbrowser/health` in `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts` |

### Theia contribution points PB extensions use (copy these patterns)

| Contribution point | Example in PB |
|---|---|
| `FrontendApplicationContribution` (`onStart`, `onDidInitializeLayout`, `onStop`) | 18 bindings at the stamp commit (`git -C "$PB_REPO" grep -h 'bind(FrontendApplicationContribution)' HEAD -- 'theia/extensions/*/src/browser/*.ts' \| wc -l`); e.g. `CustomizeCssContribution` in `$PB_REPO/theia/extensions/customize/src/browser/customize-css-contribution.ts`, `ModeService` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`, `ChromeBarShortcutRelay` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-shortcuts.ts`, `WebTabActivationContribution` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts` |
| `CommandContribution`, `MenuContribution`, `KeybindingContribution` | `$PB_REPO/theia/extensions/modes/src/browser/setups-commands.ts`, `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-keybindings.ts` |
| `WidgetFactory` + `bindViewContribution` | `branding` welcome widget, `modes` OrganisingWidget (also bind the view contribution as `FrontendApplicationContribution` if it needs `onStart`) |
| `OpenHandler` | `ViewUriOpenHandler`, `TerminalUriOpenHandler`, `WebTabOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts` |
| `PreferenceContribution` | `bindTelemetryPreferences` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-preferences.ts`; `bindChromeBarPreferences` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts` (a static schema with the keys `browser.showHomeButton` (boolean, default `false`), `browser.homePage` (string, default empty) and `browser.defaultSearchEngine` (string, default empty, options filled at runtime from chrome's engine list), each `PreferenceScope.User` only) |
| `PerspectiveService.registerPerspective` | `ModesContribution.onStart` in `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts` |
| `rebind` of a core token | Guarded with `isBound`: `AboutDialog` (branding), `TerminalFrontendContribution`, `TerminalWidget`, `LocalStorageService` (tab-uris). Unguarded: `rebind(SidePanelHandler)` and `rebind(ApplicationShellOptions)` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts` |
| `ConnectionHandler` + `JsonRpcConnectionHandler` (backend) | `$PB_REPO/theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts`, `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-backend-module.ts` |
| `BackendApplicationContribution` (backend) | `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-module.ts`, `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-backend-module.ts` |

### Frontend config keys (`theia.frontend.config`)

These keys live in the `theia.frontend.config` block of `$PB_REPO/theia/applications/browser/package.json`.

| Key | Shipped value | Read by |
|---|---|---|
| `powerbrowserPrivilegedJs` | `false` | `powerbrowserPrivilegedJs` in `$PB_REPO/theia/extensions/customize/src/browser/customize-frontend-module.ts` (only `=== true` enables) |
| `powerbrowserTelemetry` | `{level:"off", endpoint:null}` | `powerbrowserTelemetry` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts` (fail-closed) |
| `powerbrowserBranding` | `{welcomeText, aboutText, repoUrl, markSvg, legalNotices}` | `powerbrowserBranding` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-branding-config.ts` |

Read a custom key the same way: `FrontendApplicationConfigProvider.get()['myKey']` inside the `ContainerModule` callback, wrapped in try/catch with a safe default. `$PB_REPO/scripts/generate.mjs` rewrites only the brand-owned keys of this block and leaves sibling keys untouched.

### `customize.css` and `customize.js`

| File | Path | State | Mechanism |
|---|---|---|---|
| `customize.css` | `$THEIA_CONFIG_DIR/customize.css` = `user-storage:/user/customize.css` | working | `CustomizeCssContribution`: `<style>` with file text, hot reload via `fileService.onDidFilesChange`, keeps last good content on transient read failure. |
| `customize.js` | `$THEIA_CONFIG_DIR/customize.js` | present-but-disabled | `CustomizePrivilegedJsContribution`: bound only when `powerbrowserPrivilegedJs === true` at build time; runs `new Function('powerbrowser', source)(surface)` in `onDidInitializeLayout`. |

`customize.js` receives `powerbrowser: PowerBrowserPrivilegedJsSurface = { container: interfaces.Container, shell: ApplicationShell, tabUriRegistry: TabUriRegistry | undefined }`. Token: `PowerBrowserPrivilegedJs = Symbol.for('PowerBrowserPrivilegedJs')`. Example script (only runs in a build with the flag on):

ILLUSTRATIVE: a user script written against `PowerBrowserPrivilegedJsSurface` in `$PB_REPO/theia/extensions/customize/src/browser/powerbrowser-privileged-js.ts`; not run.

```js
// customize.js -- `powerbrowser` is the injected surface
const { container, shell, tabUriRegistry } = powerbrowser;
console.log('active tab URI', tabUriRegistry && shell.activeWidget && String(tabUriRegistry.uriOf(shell.activeWidget)));
```

## Rules and constraints

From `$PB_REPO/CLAUDE.md`:
- Never fork or patch Theia core. All Theia changes are `@powerbrowser/*` extensions; `@theia/*` is consumed as npm deps pinned to the release in `$PB_REPO/theia/applications/browser/package.json` (1.76.0 at the stamp commit). `$PB_REPO/scripts/diff-theia-core.sh` (row `diff-theia-core`) fails on any change inside `$PB_REPO/theia/node_modules/@theia`.
- Never modify Gecko outside `$PB_REPO/patches/`. Firefox internals are reached only through `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (checked by `$PB_REPO/scripts/check-internals-boundary.sh`). A Theia extension talks to chrome only via existing actor message kinds.
- Design for the bridge: nothing may weld Theia to full-window presentation. `TabUriRegistry`'s exported member set is asserted by `$PB_REPO/scripts/verify-registry-shape.mjs`; adding or removing a public member there fails `gui04-registry-shape`.
- The repo path must contain no space (native link steps break).
- Theia is the default GUI; stock browser chrome must stay reachable.
- One verification driver: add checks as rows in `$PB_REPO/scripts/verify-platform.sh`, never a new driver. Never assert on the absence of a log line you emit yourself. Derive expectations from the tree; give checks a `--self-test`.
- Builds run in `nix develop .#theia`; `yarn` does not work in the host shell.
- `node scripts/scan-brand-residue.mjs` (run from `$PB_REPO`; the script is `$PB_REPO/scripts/scan-brand-residue.mjs`) must exit 0; do not spell the upstream product's brand token in any file outside `$PB_REPO/inventory/brand-tokens.json`.
- User-facing text must not contain internal identifiers (pref keys, ports, ids, raw exception text); name the product "PowerBrowser" and end errors with an on-screen next step.
- Any new network egress host needs a row in `$PB_REPO/powerbrowser/endpoint-allowlist.json`. This rule is not in `CLAUDE.md`; it is enforced by checks that read the allowlist, including rows `verify-endpoints` (`$PB_REPO/scripts/verify-endpoints.sh`) and `theia-endpoints` (`$PB_REPO/scripts/verify-theia-endpoints.mjs`).

## Gotchas

- Static binding only (PB decision D-50). `ContributionProvider.getContributions()` caches its array on first call. A `CommandContribution`, `OpenHandler`, etc. bound later (e.g. from `customize.js` or a lazily loaded module) is never seen. For a late URI handler use `registerLateOpenHandler(openerService, handler)` / `OpenerService.addHandler`.
- Boot-chain deadlock: never `await` a `user-storage:` / FileService read inside `onStart()`. `startContributions()` awaits `onStart`, and the read needs the RPC connection that comes up after it. Fire and forget (`void this.load()`) or use `onDidInitializeLayout`. See the header of `$PB_REPO/theia/extensions/customize/src/browser/customize-css-contribution.ts`.
- `bindViewContribution` does not bind `FrontendApplicationContribution`. If your view contribution needs `onStart`, bind it again: `bind(FrontendApplicationContribution).toService(MyViewContribution)`. It also does not register a `WidgetFactory`; `openView()` silently fails without one (see `bind(WidgetFactory)` and `bindViewContribution(bind, OrganisingContribution)` in `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`).
- Use guarded rebinds: `if (isBound(X)) rebind(X).to(Y) else bind(X).to(Y)`.
- `build:extensions` is hand-ordered; `$PB_REPO/theia/**/lib/` and `*.tsbuildinfo` are gitignored, so a wrong order passes locally and fails on a clean clone. `theia-build-order` checks order and declared deps; `theia-fresh-clone-build` runs the real CI build in a clean clone.
- Under `composite`, `tsc -b` trusts `tsconfig.tsbuildinfo`; `rm -rf lib` alone does not force a rebuild. Use `yarn clean` in the extension.
- Changing `theia.frontend.config` requires `theia build`; `theia start` does not re-read it.
- Enabling `powerbrowserPrivilegedJs` makes the `verify-branding` check fail (it asserts the value is boolean `false`: `powerbrowserPrivilegedJs` in `$PB_REPO/scripts/verify-branding.mjs`, message "expected boolean false") and inverts `verify-dev-flag-off`. Do not ship it enabled. For prototyping without the flag, `window.theia.container` is already exposed in every build (per `$PB_REPO/docs/CUSTOMIZE.md`) and can be used from devtools.
- The flag is not a security boundary: any script already running in the Theia page has the DI container via `window.theia.container`.
- `ChromeStoreClient`/`GroupActorClient` events must be dispatched on `document` with `bubbles: true`; dispatching on `window` never reaches the actor.
- Web tabs restored from a persisted layout are refused by design (the `WebTabWidget` factory throws for non-current-session ids).
- `GroupQueryService` is read-only; `TabQueryService` holds the only `tabs.sqlite` handle. Opening `tabs.sqlite` from another extension fails the second-writer gate.
- A Theia keybinding never fires while a web page has focus: the overlay page owns the keyboard. Page-focused keys go through chrome's page-scoped rows and `ChromeBarShortcutRelay`, not through `KeybindingContribution`.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
