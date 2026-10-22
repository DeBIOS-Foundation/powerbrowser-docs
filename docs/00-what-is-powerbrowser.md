# What PowerBrowser is

> Verified against PB 8843936 on 2026-10-21. Level: source-read

Source files:
- `$PB_REPO/README.md`
- `$PB_REPO/CLAUDE.md`
- `$PB_REPO/configuration.toml`
- `$PB_REPO/brand/`
- `$PB_REPO/patches/`
- `$PB_REPO/powerbrowser/shell/`
- `$PB_REPO/powerbrowser/INTERNAL-APIS.md`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/powerbrowser/distribution/policies.json`
- `$PB_REPO/powerbrowser/packaging/node-runtime.json`
- `$PB_REPO/powerbrowser/packaging/package-linux.sh`
- `$PB_REPO/theia/package.json`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/theia/extensions/`
- `$PB_REPO/inventory/brand-tokens.json`
- `$PB_REPO/flake.nix`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/scripts/check-internals-boundary.sh`
- `$PB_REPO/scripts/verify-endpoints.sh`
- `$PB_REPO/scripts/scan-brand-residue.mjs`
- `$PB_REPO/scripts/fetch-upstream.sh`
- `$PB_REPO/scripts/apply-patches.sh`
- `$PB_REPO/scripts/rebase-upstream.sh`
- `$PB_REPO/scripts/check-patch-surface.sh`
- `$PB_REPO/scripts/diff-theia-core.sh`
- `$PB_REPO/scripts/download-plugins.mjs`
- `$PB_REPO/scripts/crash-collector.mjs`
- `$PB_REPO/scripts/smoke-theia.sh`
- `$PB_REPO/docs/BUILD.md`
- `$PB_REPO/docs/URI-SCHEMES.md`
- `$PB_REPO/docs/TAB-STORE.md`
- `$PB_REPO/docs/CUSTOMIZE.md`
- `$PB_REPO/docs/REBRANDING.md`
- `$PB_REPO/docs/RELEASING.md`
- `$PB_REPO/docs/CRASH-POLICY.md`
- `$PB_REPO/.github/workflows/`

`$PB_REPO` is the root of a PB core checkout; set it with the export line in [Paths and links](CONVENTIONS.md#paths-and-links). Treat PB core as read-only. Facts about the gitignored trees (`$PB_REPO/upstream/`, `$PB_REPO/theia/node_modules/`, `$PB_REPO/generated/`, `$PB_REPO/objdir/`) come from the pinned on-disk checkout and are not drift-checked; the tracked pins are `firefox_esr_tag` in `$PB_REPO/configuration.toml` and the `@theia/*` versions in `$PB_REPO/theia/applications/browser/package.json`.

## Summary

- PowerBrowser (PB) is a rebrandable browser platform: a Firefox ESR browser (the Gecko "shell") whose default GUI is an Eclipse Theia application (the "sidecar").
- At launch, Firefox chrome code starts the Theia Node backend on `127.0.0.1`, supervises it, and loads the Theia frontend full-window in its shell window.
- Web pages open as in-shell web tabs inside Theia, rendered by Firefox. A stock Firefox window is still reachable.
- PB is a patch-set repo, not a Firefox fork: an unmodified `$PB_REPO/upstream/` ESR checkout, 4 patches in `$PB_REPO/patches/`, and PB's own tree. Theia is consumed as `@theia/*` npm packages and never edited.
- Rebranding is set in `$PB_REPO/configuration.toml` and `$PB_REPO/brand/`. `$PB_REPO/scripts/generate.mjs` derives the build inputs under `$PB_REPO/generated/`; some generated keys must then be copied by hand into tracked files ([CF-10](CONFLICTS.md#cf-10)).

## Stream model and why Firefox instead of Electron

Stream model (`$PB_REPO/README.md`, section "What this repo is"):

ILLUSTRATIVE: adapted from the diagram in section "What this repo is" of `$PB_REPO/README.md`; the labels are reworded.

```text
Firefox ESR + Eclipse Theia     upstream: consumed, never modified
            |
      PowerBrowser              midstream: this platform
            |
       distributions            downstream: add, never patch
```

- Upstreams are adopted by re-pinning: the ESR tag and the Theia release are single values in table `[upstreams]` of `$PB_REPO/configuration.toml` (`firefox_esr_tag`, `theia_release`).
- A downstream is a branded distribution built on PB. It supplies its own manifest overlay (merged over `$PB_REPO/configuration.toml`) and its own brand directory, and adds extensions. If a downstream must edit a PB file, PB is missing an extension point (`$PB_REPO/README.md`, section "Rules we hold ourselves to", rule "Downstreams add, never patch").
- PB ships no opinions of its own: no bundled database, no curated extension set, no workflow, and only a neutral default brand (`$PB_REPO/README.md`, section "What this repo is").

Why Firefox and not Electron (`$PB_REPO/README.md`, first paragraphs): the goal is a complete browser, not an editor with a browser view. Firefox provides DRM and streaming, the full WebExtensions API, per-site process isolation, and Mozilla's security patch stream. The README says: "An Electron app can imitate none of that." Keeping the patch stack small keeps ESR rebases cheap (the README states roughly every four weeks; see [Unsettled items](#unsettled-items)), and a Theia upgrade is a version change.

## Components

| Component | What it is | Where in repo | Version |
|---|---|---|---|
| Firefox ESR | Browser engine and process host. Fetched, never hand-edited | `$PB_REPO/upstream/` (via `$PB_REPO/scripts/fetch-upstream.sh`) | `firefox_esr_tag` in `$PB_REPO/configuration.toml` (`FIREFOX_153_5_0esr_BUILD1` at the stamp commit) |
| Patch stack | `010` identity, `020` shell, `030` MAR certificates, `040` NSIS | `$PB_REPO/patches/` | 4 patches |
| Shell chrome | Shell window, sidecar supervisor, the single Firefox-internals boundary | `$PB_REPO/powerbrowser/shell/` | n/a |
| `PowerBrowserAPI.sys.mjs` | Only file allowed to touch Firefox internals. Serves the actor bridge, the tab-store writer, the single-instance handler, the web-tab overlays and page-key relay (`PowerBrowserWebTabs`), typed-address resolution and search, and the token-cookie strip. Its three frozen exports are `PowerBrowserAPI`, `PowerBrowserWebTabs` and `PowerBrowserTokenCookie` | `$PB_REPO/powerbrowser/shell/` | n/a |
| `TheiaService.sys.mjs` | Sidecar supervisor (spawn, token, health, restart, shutdown). Imports only `PowerBrowserAPI` | `$PB_REPO/powerbrowser/shell/` | n/a |
| Theia application | Browser-target Theia app that composes the extensions | `$PB_REPO/theia/applications/browser/` | `powerbrowser-theia-browser-app` 1.76.0 |
| Eclipse Theia | `@theia/*` npm packages | `$PB_REPO/theia/node_modules/` | 1.76.0, pinned in `$PB_REPO/theia/applications/browser/package.json` |
| Node | Runtime for the Theia backend | `$PB_REPO/flake.nix` (dev), `$PB_REPO/powerbrowser/packaging/node-runtime.json` (packaged) | `nodejs_24`, engines `node >= 24` |
| `@powerbrowser/branding` | Welcome page, About dialog, favicon, mark | `$PB_REPO/theia/extensions/branding/` | 0.1.0 |
| `@powerbrowser/chrome-bar` | Theia-rendered address/command bar, tab strip, suggestions, page-key actions (`ChromeBarShortcutRelay`), address-bar settings | `$PB_REPO/theia/extensions/chrome-bar/` | 0.1.0 |
| `@powerbrowser/customize` | `customize.css` layer and dev-only `customize.js` | `$PB_REPO/theia/extensions/customize/` | 0.1.0 |
| `@powerbrowser/modes` | Modes, setups, groups, Panorama, actor client | `$PB_REPO/theia/extensions/modes/` | 0.1.0 |
| `@powerbrowser/tab-uris` | Tab URI registry, web tabs, stock-window command, tab-store reader, MCP endpoint | `$PB_REPO/theia/extensions/tab-uris/` | 0.1.0 |
| `@powerbrowser/telemetry` | Telemetry logger and sender | `$PB_REPO/theia/extensions/telemetry/` | 0.1.0 |
| `@powerbrowser/token-gate` | Backend cookie gate, `POWERBROWSER_ENV`, parent watchdog | `$PB_REPO/theia/extensions/token-gate/` | 0.1.0 |
| Generator | Turns `$PB_REPO/configuration.toml` + `$PB_REPO/brand/` into build inputs | `$PB_REPO/scripts/generate.mjs` -> `$PB_REPO/generated/` | n/a |
| Verification driver | One registry of checks, one `"label\|command"` row per check. Count them with `git -C "$PB_REPO" show HEAD:scripts/verify-platform.sh \| grep -cE '^\s+"[A-Za-z0-9._-]+\|'` | `$PB_REPO/scripts/verify-platform.sh` | n/a |

Bundled stock Theia packages (`$PB_REPO/theia/applications/browser/package.json`, all 1.76.0, unmodified): the IDE base (`core`, `monaco`, `editor`, `filesystem`, `workspace`, `navigator`, `terminal`, `task`, `debug`, `scm`, `search-in-workspace`, `preferences`, `keymaps`, `notebook`, and others), VS Code plugin support (`plugin-ext`, `plugin-ext-vscode`, `vsx-registry`, `ovsx-client`), and Theia AI (`ai-core`, `ai-core-ui`, `ai-chat`, `ai-chat-ui`, `ai-ide`, `ai-mcp`, `ai-mcp-ui`, `ai-anthropic`, `ai-openai`, `ai-terminal`, `ai-code-completion`, `ai-editor`). React 19.2.8. A new feature usually composes with these instead of re-implementing them; see [06-theia-plugins-and-ai.md](06-theia-plugins-and-ai.md).

Shell files (`$PB_REPO/powerbrowser/shell/`, packaged by `$PB_REPO/powerbrowser/shell/jar.mn` and `$PB_REPO/powerbrowser/shell/moz.build`):

- `powerbrowser.xhtml`, `powerbrowser.css`, `powerbrowser.js`: the shell window document, its styles, and its bootstrap. `powerbrowser.js` builds the loading and error layers, the window controls and quit-on-close. It also creates the page-scoped `<key>` rows (`PAGE_KEYS` in `$PB_REPO/powerbrowser/shell/powerbrowser.js`), which are disabled and are enabled only while a web-tab overlay has focus, relays F6 and Shift+F6 from a page through a reply listener, and relays mouse buttons 4 and 5 (`AppCommand` Back and Forward) to the page under the pointer. Each relay calls `PowerBrowserWebTabs.relayShortcut`. Details: [Commands and keybindings touching tabs](09-tabs-reference.md#commands-and-keybindings-touching-tabs).
- `powerbrowser-sidecar.js`: default `powerbrowser.sidecar.*` prefs (Node path, backend entry, timeouts).
- `TheiaService.sys.mjs`: the sidecar supervisor.
- `PowerBrowserAPI.sys.mjs`: the Firefox-internals boundary, actor parent, tab-store writer, web-tab overlays and token-cookie strip.
- `GroupActorChild.sys.mjs`: the content half of the actor bridge.
- `components.conf`: registers the single-instance command-line handler.

## How it runs

1. The user starts the binary (`$PB_REPO/objdir/dist/bin/powerbrowser` in a dev build). `PowerBrowserSingleInstanceHandler` (in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, registered by `$PB_REPO/powerbrowser/shell/components.conf` as command-line handler `a-powerbrowser`) runs before the stock browser handler and opens the shell window. Upstream closes its early blank window, which causes a brief startup flicker (`$PB_REPO/docs/URI-SCHEMES.md`). If a shell window already exists, the handler focuses it and ignores all launch arguments (no new window opens).
2. The shell window is `chrome://powerbrowser/content/powerbrowser.xhtml` (window type `powerbrowser:main`). It holds a chrome-rendered loading layer, error and diagnostics layers, custom window controls, and one remote `<browser id="powerbrowser-content" remoteType="web">` on `about:blank`. `powerbrowser.js` writes the `POWERBROWSER_SHELL_READY` sentinel and calls `TheiaService.start()`.
3. `TheiaService.start()` mints a per-launch token (`crypto.randomUUID()`), reaps a leftover sidecar recorded in the state file from a previous crashed launch, then runs these steps in order, each best-effort (a failure is logged and startup continues): opens or migrates `tabs.sqlite` and attaches tab-event triggers, loads saved web-tab histories, and registers the `PowerBrowserGroup` JSWindowActor.
4. It spawns Node with `<backendMain> --hostname 127.0.0.1 --port 0`. Environment: `THEIA_CONFIG_DIR`, `POWERBROWSER_SUPERVISED=1`, `POWERBROWSER_PROFILE_DIR`, and an empty `POWERBROWSER_TOKEN_DISABLE`. The token is written as one line on the child's stdin, not in the environment. In the backend, `powerbrowser-env.ts` captures every `POWERBROWSER_*` value into `POWERBROWSER_ENV` and deletes it from `process.env`.
5. The backend prints `POWERBROWSER_BACKEND_READY` with its port. The supervisor pins that port for the rest of the session, writes `sidecar-state-<profile>.json`, and polls `GET /powerbrowser/health` (250 ms interval, 4000 ms probe timeout, 90000 ms startup timeout).
6. Token cookie: chrome sets session cookie `POWERBROWSER_TOKEN=<token>` for host `127.0.0.1`, path `/`. The token gate (`PowerBrowserTokenGateContribution` in `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`) runs as Express early middleware ahead of Theia's own and rejects any HTTP request without that cookie (403). WebSocket upgrades are gated indirectly; see [Gotchas](04-theia-backend-rpc-http.md#gotchas) in doc 04. It fails closed: if no token arrives, the backend does not start. Because cookies are not port-scoped, chrome removes the cookie from every other `127.0.0.1` request (`tokenCookieStrip` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, installed by `setGroupSenderPort`); details in [04-theia-backend-rpc-http.md](04-theia-backend-rpc-http.md).
7. Swap: chrome navigates `powerbrowser-content` to `http://127.0.0.1:<port>/` and hides the loading layer (`POWERBROWSER_SHELL_SWAP`). The Theia frontend now runs as unprivileged web content in a Firefox content process.
8. Actor bridge: the frontend posts `PowerBrowserGroupRequest` DOM events `{requestId, msg: {kind, ...}}`. `GroupActorChild.sys.mjs` forwards them to the parent half, `PowerBrowserGroupParent` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`. It routes each `kind` to one of four dispatchers (`handleShellMessage`, `handleStoreRequest`, `handleWebTabAction`, `handleGroupMutation`), each of which checks the sender (host `127.0.0.1`/`localhost`, the shell's own content browser, the live port), and replies with a `PowerBrowserGroupResponse` DOM event. The frontend client's ack timeout is 5 s to 120 s depending on the client and kind; see [The raw wire](02-powerbrowser-api-bridge.md#2-the-raw-wire-what-every-client-does) step 5 in doc 02. Chrome also pushes to the frontend on `PowerBrowserWebTabState`, with push kinds `state`, `pageFocus`, `shortcut` and `flushShellState`; the frontend subscribes per kind through `WebTabChannel.onPush`. Message kinds and pushes: [Routing](02-powerbrowser-api-bridge.md#routing-powerbrowsergroupparentreceivemessage) and [Push messages](02-powerbrowser-api-bridge.md#push-messages-powerbrowserwebtabstate) in [02-powerbrowser-api-bridge.md](02-powerbrowser-api-bridge.md).
9. Steady state: a health loop runs every 5000 ms. On failure it restarts the backend on the same pinned port with backoff from 500 ms doubling to a 5000 ms cap. Recoverable failures stop retrying after 6 attempts or 45000 ms, whichever comes first. Unrecoverable failures (backend entry file missing, Node not found, `spawn()` throws, pinned port taken) give up immediately. Every respawn receives the same token, so the cookie stays valid. After give-up, the shell shows a Retry/Details screen, and a probe every 15000 ms detects a backend that recovered. The intervals, timeouts and give-up limits are `powerbrowser.sidecar.*` prefs in `$PB_REPO/powerbrowser/shell/powerbrowser-sidecar.js`; the 500 ms / 5000 ms backoff values are constants in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` (`RESTART_BACKOFF_INITIAL_MS`, `RESTART_BACKOFF_CAP_MS`).
10. If Firefox dies, even by SIGKILL, the backend's stdin pipe reaches EOF. `PowerBrowserParentWatchdogContribution` (armed only when `POWERBROWSER_SUPERVISED=1`) sends SIGTERM to its own process so Theia shuts down gracefully.
11. Shutdown: closing the shell window quits the whole application, including stock windows (`powerbrowser.js`, NG-037). On `quit-application-granted`, `TheiaService.stop()` runs a synchronous frontend flush (bounded by `powerbrowser.shell.quitFlushTimeoutMs`, 3000 ms), stops the health loop, kills the backend with a 3000 ms grace period, detaches the tab-store triggers, and deletes the state file.

## Process and trust boundaries

| Code | Runs in | May access | May not |
|---|---|---|---|
| Firefox chrome (`$PB_REPO/powerbrowser/shell/`) | Firefox parent process, privileged | Everything. Firefox internals only through `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (catalogued in `$PB_REPO/powerbrowser/INTERNAL-APIS.md`) | Import internals from any other file (`$PB_REPO/scripts/check-internals-boundary.sh`) |
| Theia frontend (extension `browser/` code) | Firefox content process, as web content from `http://127.0.0.1:<port>/` | Theia DI container; backend over the cookie-authenticated WebSocket; Firefox data and actions only through actor `kind`s | Firefox internals directly; open `tabs.sqlite` |
| Web tab and stock tab pages | Firefox content processes | Normal web platform; WebExtensions content scripts | The actor (registration `matches` is the Theia origin, and the parent checks the sender per message); the Theia token cookie (stripped by chrome) |
| Theia backend (extension `node/` code) | Node child process of Firefox | File system, child processes, read-only `tabs.sqlite` (`better-sqlite3`), `POWERBROWSER_ENV` | Chrome directly. It reaches chrome only by relaying through an open frontend window (`tab-store-relay`) |
| External clients (scripts, AI agents) | Separate OS processes | Tab-store MCP endpoint only: own loopback listener, bearer token from `<profile>/store-access.json` (mode 0600), requests carrying `Origin` refused, `Host` checked | The Theia port (the cookie never leaves the supervisor and chrome); any non-loopback access |
| Firefox WebExtensions | Firefox extension process | Stock WebExtensions APIs | PB tab or group data (no bridge exists) |

All PB listeners bind to loopback only (SIDE-01). Every outbound host needs a row in `$PB_REPO/powerbrowser/endpoint-allowlist.json` (`$PB_REPO/scripts/verify-endpoints.sh`).

## Data stores

| Store | Location | Writer | Readers |
|---|---|---|---|
| `tabs.sqlite` (schema head `TAB_STORE_SCHEMA_HEAD` (6): `tabs`, `groups`, `settings`, `saved_pages`) | Profile dir | Chrome only (`PowerBrowserAPI.sys.mjs`, mozStorage, WAL) | Backend `TabQueryService` (read-only), MCP `tabs_sql`, offline checks on copies. Contract: `$PB_REPO/docs/TAB-STORE.md` |
| Places (history, bookmarks) | Profile dir (Firefox's own) | Firefox | Frontend via actor kinds (`ChromeStoreClient`); MCP tools via relay |
| Sessionstore | Profile dir (Firefox's own) | Firefox | Chrome. It is authoritative for restoring stock tabs; `tabs.sqlite` is rebuilt from it, never the reverse |
| `powerbrowser-shell-state.json` | Profile dir | Chrome, on the frontend's request (`shellStateSave` kind) | Frontend `profile-storage.ts`. Replaces localStorage, whose origin changes with the port. Holds active mode, layouts, quit session |
| `powerbrowser-web-tab-history.json` | Profile dir | Chrome | Chrome at startup (web-tab back/forward history) |
| `saved-pages/` | Profile dir | Chrome (`savePageCopy`) | User; indexed in `saved_pages` table |
| `store-access.json` | Profile dir, mode 0600 | Backend, on every backend start; removed on normal quit | External MCP clients |
| `modes.json`, `setups.json` | Theia user storage (`UserStorageUri`) | Frontend (`ModeService`, `SetupsService`) | Frontend |
| `customize.css`, `customize.js` | `$THEIA_CONFIG_DIR` = `${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser` | User only. PB never creates them | Frontend (`@powerbrowser/customize`) |
| `settings.json`, `keymaps.json` | `$THEIA_CONFIG_DIR` | Theia | Theia |
| `sidecar-state-<profile>.json` | `$THEIA_CONFIG_DIR` | Supervisor | Supervisor (leftover reap on next launch) |

The profile dir is the Firefox profile; chrome passes it to the backend as `POWERBROWSER_PROFILE_DIR`. Never open `tabs.sqlite` for writing. Writes go through `GroupModel` / actor kinds or the MCP `tab_store_write` tool. Full tab-data reference: [09-tabs-reference.md](09-tabs-reference.md).

## Tabs and URIs

Contract: `$PB_REPO/docs/URI-SCHEMES.md`. Every tab has a typeable `scheme:path` address. Parsing accepts `scheme:x`, `scheme:/x`, `scheme://x`, `scheme:///x`; emission is always `scheme:path`.

- Theia tab addresses: `view:<name>`, `settings:`, `terminal:<name>`, `output:`, `preference:`, `vscode-extension:`, `webview:` (session-scoped). `TabUriRegistry` in `@powerbrowser/tab-uris` resolves them (API: [01-theia-extensions.md](01-theia-extensions.md)).
- Web tab: opening any `http:`/`https:` URI through Theia's opener service creates an in-shell web tab. It is a main-area Theia tab; the page is rendered by a chrome-owned overlay browser kept aligned with the tab's DOM node. Its address is the current page URL. While an overlay page has focus it receives every key, so Theia keybindings do not fire; the page-scoped key rows described under "Shell files" above carry browser keys (Ctrl+L, Alt+D, F6, reload, back, tab switching and others) to the frontend instead.
- Store row keys are identities, not addresses: `stock:<stamp>-<n>` for a stock tab, `web:<id>` for a web tab, and the Theia address (or `widget:<id>`) for editors, terminals and views. Two tabs on one URL are two rows. Typing a `stock:` or `web:` key opens nothing.
- Stock window: command `powerbrowser.open-browser-window` ("Open Browser Window", command palette only) takes an optional `http:`/`https:` URL. When the actor channel answered a startup probe (`probeChannel` kind), it sends the `openStockTab` kind: chrome (`PowerBrowserAPI.openStockTab`) adds a tab to the most recently focused stock window, or opens a new stock window if none exists (no URL means `about:newtab`). Without a chrome host (plain Theia in a dev browser) it falls back to `window.open(url, '_blank')`. The stock window is unmodified upstream `browser.xhtml`. Closing a stock window does not quit PB. `$PB_REPO/docs/URI-SCHEMES.md` still describes only the `window.open` path; the source (`$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts`) is authoritative.
- Modes reshape the shell and never change which tabs are open. Shipped modes: `coding` (Explorer open on the left, bottom panel open, right area as the user left it; the only shipped mode that keeps the menubar, the status bar and the icon rails, and a rail shows only while its side area is open; `SHIPPED_MODE_RULES` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`), `browsing` (launch default; left, right and bottom areas collapsed, no menubar, icon rail or status bar), `organising` (same collapsed shell, plus opens Panorama). The active mode is published as `body[data-pb-mode="<id>"]`; a custom mode gets the browsing-style shell unless its CSS opts in. Users can save custom modes to `modes.json`.
- Setups are named snapshots of windows and their mode, stored in `setups.json`. The unnamed session saved at quit is stored in profile storage under `powerbrowser.setups.session`.
- Groups are rows in the `groups` table. Panorama is the organising canvas (freeform canvas plus tree view) that shows groups and loose tab cards with thumbnails.

## Configuration and branding

Tables of `$PB_REPO/configuration.toml` at the stamp commit:

- `[product]`: `vendor_machine`, `vendor_display`, `description`, `homepage`.
- `[identity]`: `display_name`, `app_basename`, `binary_name`, `remoting_name`, `distribution_id`. All keys are required, so a downstream that omits one fails the generate.
- `[legal]`: license, copyright holder, trademark notice.
- `[theia]`: `default_theme`.
- `[[variants]]`: `dev` (name suffix " Dev", `objdir`) and `release` (no suffix, `objdir-release`).
- `[installer]`: `support_url`.
- `[urls]`: `update` (update descriptor URL; its host becomes `MOZ_APPUPDATE_HOST`).
- `[telemetry]`: `level` (`off`/`crash`/`error`/`all`, default `off`) and `endpoint` (unset here). An enabled level without an endpoint fails the generate.
- `[[extensions]]` (`source` is one of `openvsx`, `url`, `npm`, `local-path`; `id`, `source`, `sha256` required) and `[[webextensions]]`: none declared by PB. See [05-webextensions.md](05-webextensions.md) and [06-theia-plugins-and-ai.md](06-theia-plugins-and-ai.md).
- `[[search_engines]]` (`name` and `url` required, `suggest_url` optional; `url` and `suggest_url` are `https` templates holding `{searchTerms}`): the address-bar search engines. PB ships DuckDuckGo Lite (the first entry, so the default) and Wikipedia. The table reaches the `SearchEngines` key of `$PB_REPO/powerbrowser/distribution/policies.json`, and every `url` and `suggest_url` host needs an allowlist row. With no table the bar keeps Firefox's own engines (`$PB_REPO/docs/REBRANDING.md`, section "`[[search_engines]]` — search engines (absent table means Firefox's own engines)").
- `[upstreams]`: `firefox_esr_tag`, `theia_release`.

`$PB_REPO/brand/mark.svg` is the single brand image. `node scripts/generate.mjs`, run from `$PB_REPO` inside `nix develop .#theia` (it needs the pinned `inkscape` 1.4.4), writes every row of its `TARGETS` table: branding directories per variant, icon rasters and `.ico`/`.icns`, `.mozconfig`, `.desktop` files, installer fragments, `$PB_REPO/generated/identity.configure`, and Theia fragments (`theia-frontend-config.json`, `theia-branding.json`, `theia-telemetry.json`, `theia-plugins.json`), `endpoint-hosts.json`, `webextensions-settings.json`, `search-engines.json`, `upstream-pins.env`. `$PB_REPO/generated/` is gitignored. Never hand-edit generated output.

Dev and release variants differ in display name, `brand.ftl`/`brand.properties`, icon badge, and the dev-only `browser.tabs.inTitlebar = 0` default (dev shows a real title bar). Build release with `POWERBROWSER_OBJDIR=objdir-release POWERBROWSER_BRANDING=powerbrowser/branding/release MOZCONFIG=../.mozconfig ./mach build` from `$PB_REPO/upstream/` (`$PB_REPO/docs/BUILD.md`).

Telemetry: the shipped level is `off` and `endpoint` is left unset in `$PB_REPO/configuration.toml`, so nothing is sent. The Theia-side sender is `@powerbrowser/telemetry`. Firefox health report and Normandy are compiled off (`$PB_REPO/generated/identity.configure`), and the native crash reporter is compiled out (`--disable-crashreporter`). A downstream can run `$PB_REPO/scripts/crash-collector.mjs` (`$PB_REPO/docs/CRASH-POLICY.md`). Full rebrand procedure: `$PB_REPO/docs/REBRANDING.md`.

## Repo layout

- `$PB_REPO/brand/`: brand inputs (`mark.svg`).
- `$PB_REPO/configuration.toml`: the rebrand manifest.
- `$PB_REPO/docs/`: user and maintainer docs (BUILD, RELEASING, REBRANDING, CUSTOMIZE, URI-SCHEMES, TAB-STORE, CRASH-POLICY, tab-store-access). `$PB_REPO/docs/non-gui/` holds work-wave records.
- `$PB_REPO/generated/`: generator output, gitignored.
- `$PB_REPO/inventory/brand-tokens.json`: brand-token classification. The only file allowed to name the originating product.
- `$PB_REPO/ledger/`: requirements ledger and checksums.
- `$PB_REPO/patches/`: the Gecko patch stack.
- `$PB_REPO/powerbrowser/`: PB's Gecko-side tree: `shell/` (chrome code), `branding/` and `branding-generated/` (per variant), `distribution/policies.json`, `packaging/`, `endpoint-allowlist.json`, `INTERNAL-APIS.md`, `.desktop` files.
- `$PB_REPO/scripts/`: generator, verify driver and `verify-*` checks, smoke tests, crash collector, `lib/` helpers. Upstream tooling: `$PB_REPO/scripts/fetch-upstream.sh`, `$PB_REPO/scripts/apply-patches.sh` (replays the patches in order), `$PB_REPO/scripts/rebase-upstream.sh` (moves to a new ESR tag), `$PB_REPO/scripts/check-patch-surface.sh`. Theia tooling: `$PB_REPO/scripts/diff-theia-core.sh` (proves `node_modules/@theia/*` is unmodified), `$PB_REPO/scripts/download-plugins.mjs` (installs declared `[[extensions]]` during `yarn build`). Python scripts (`ledger-*`, `phase-gate.py`, `plan-gate.py`) serve the planning workflow, not the product.
- `$PB_REPO/theia/`: Yarn workspace: `applications/browser/` and `extensions/*`.
- `$PB_REPO/upstream/`: Firefox ESR checkout, fetched, never edited, not tracked.
- `$PB_REPO/objdir/`, `$PB_REPO/objdir-release/`, `$PB_REPO/objdir-nplus1/`: build outputs (dev, release, update-hop test build).
- `$PB_REPO/flake.nix`: the two Nix dev shells.
- `$PB_REPO/defs.mk`, `$PB_REPO/.mozconfig`, `$PB_REPO/toolchain-baseline.txt`: build glue and recorded toolchain.
- `$PB_REPO/.github/workflows/`: `verify.yml`, `rebase-upstream.yml`.
- `$PB_REPO/.planning/`: project, roadmap, requirements and phase records.

## Build, test and release

Exact commands and timings: `$PB_REPO/docs/BUILD.md`. The repo path must contain no space. Every command below runs from `$PB_REPO`.

- Theia half: `nix develop .#theia`, then `cd theia && yarn install --ignore-scripts --frozen-lockfile`, then `(cd node_modules/drivelist && node-gyp rebuild)`, `yarn build`, `POWERBROWSER_TOKEN=<random value> yarn start` (serves on `127.0.0.1:3000`, unsupervised, token-gated; send the cookie `POWERBROWSER_TOKEN=<same value>` for `127.0.0.1` with every request). `POWERBROWSER_TOKEN_DISABLE=1 yarn start` turns the gate off instead: it is the legacy-dev bypass for `$PB_REPO/scripts/smoke-theia.sh` and `$PB_REPO/scripts/verify-platform.sh` only, and the header comment of `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts` describes an ungated backend as a loopback server with arbitrary file access and terminal spawn. Use it only for a smoke-style run, stop that backend afterwards, and never set it in shipped code or a supervised launch ([CF-02](CONFLICTS.md#cf-02)). A bare `yarn start`, as `$PB_REPO/docs/BUILD.md` section "Theia half" still gives it, has no token and exits 78 (`initialize` in `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`); the source wins. `yarn` does not work outside the shell.
- Firefox half: `nix develop .#theia --command node scripts/generate.mjs` first, because on a fresh clone `bash scripts/fetch-upstream.sh` reads its ESR tag from the generated `upstream-pins.env` and fails without it ([CF-06](CONFLICTS.md#cf-06)); then `bash scripts/fetch-upstream.sh` (host shell), then `nix develop .#firefox`, `cd upstream`, `MOZCONFIG=../.mozconfig ./mach build`, `./mach run`. A full build after `./mach clobber` measured 2388 s (about 40 min) dev and 2620 s (about 44 min) release on the reference host (`$PB_REPO/docs/BUILD.md`; an older estimate there says about 54 minutes). `./mach build faster` and `./mach run` are the cheaper tiers.
- Verification: `bash scripts/verify-platform.sh --quick` (no build, no browser, no display; the commit gate), `--only <label>`, no flag (everything), `--gate` (everything plus known-open exclusions). Add a check by appending one row to its registry.
- Also run `node scripts/scan-brand-residue.mjs` (it reads `git ls-files`, so stage new files first).
- Linux package: `nix develop .#firefox --command bash powerbrowser/packaging/package-linux.sh` produces `$PB_REPO/objdir/dist/<app>-<Version>.en-US.linux-x86_64.tar.xz` with a staged Theia application, a pinned Node in `node/`, and `distribution/policies.json`.
- Updates: self-hosted MAR updates signed with PB's own key (patch `030`). Windows NSIS installer builds on Nix. MSIX and DMG need real Windows and macOS hosts and are not yet executed. Release process: `$PB_REPO/docs/RELEASING.md`, which is written ahead of most of the pipeline.

## Hard rules

Full text: `$PB_REPO/CLAUDE.md`, summarized in this repo's `AGENTS.md`.

1. Never fork or patch Theia core.
2. Never modify Gecko outside the patch stack; Firefox internals only through `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`.
3. Design for the bridge: nothing may weld Theia to full-window presentation.
4. The repo path must contain no space.
5. Theia is the default GUI, a stock browser window stays reachable, and no custom browser chrome (tab strip, toolbar, address bar or menu) is authored outside Theia ([CF-08](CONFLICTS.md#cf-08)).

Also: only chrome writes `tabs.sqlite`; patches are regenerated, never hand-edited; user-facing text contains no internal identifiers.

## Where to go next

- [00-choosing-a-surface.md](00-choosing-a-surface.md): pick the surface for your task.
- [01-theia-extensions.md](01-theia-extensions.md): shell UI, commands, PB DI services, `customize.css`.
- [02-powerbrowser-api-bridge.md](02-powerbrowser-api-bridge.md): actor message kinds, chrome pushes, adding a kind.
- [03-tab-store-mcp-server.md](03-tab-store-mcp-server.md): the external MCP endpoint and its tools.
- [04-theia-backend-rpc-http.md](04-theia-backend-rpc-http.md): backend services, relay, `POWERBROWSER_ENV`, egress allowlist, token cookie.
- [05-webextensions.md](05-webextensions.md): Firefox add-ons by policy.
- [06-theia-plugins-and-ai.md](06-theia-plugins-and-ai.md): `.vsix` plugins and Theia AI.
- [07-automation-and-disabled-surfaces.md](07-automation-and-disabled-surfaces.md): WebDriver BiDi, the live-probe harness, DevTools, disabled surfaces.
- [08-building-an-extension.md](08-building-an-extension.md): extension types, delivery, development loop, end-to-end checklist.
- [09-tabs-reference.md](09-tabs-reference.md): tab model, `tabs.sqlite`, access matrix, events, keys.

## Glossary

- **chrome**: Firefox's privileged UI code (`chrome://` documents and `.sys.mjs` modules in the parent process). Not Google Chrome.
- **shell window**: `powerbrowser.xhtml`, the window that hosts the Theia frontend.
- **sidecar**: the Theia Node backend process launched by Firefox.
- **supervisor**: `TheiaService.sys.mjs`, which spawns, health-checks, restarts and stops the sidecar.
- **token gate**: `@powerbrowser/token-gate`, the backend middleware that requires the `POWERBROWSER_TOKEN` cookie.
- **bridge / actor**: the `PowerBrowserGroup` JSWindowActor pair (`GroupActorChild.sys.mjs` in content, `PowerBrowserGroupParent` in chrome), the frontend's only channel to Firefox. "Mirror/proxy bridge" (`@powerbrowser/browser-bridge`) is a planned, not yet built, chrome-owned tab model.
- **kind**: the `kind` string of an actor message, which selects the chrome-side handler; also the `kind` of a chrome push.
- **page-scoped key**: a browser key row (`PAGE_KEYS`) that chrome enables only while a web-tab page has focus and relays to the frontend as a `shortcut` push.
- **mode**: a named panel and furniture layout (`coding`, `browsing`, `organising`, or custom). It never changes the open tabs.
- **setup**: a named snapshot of windows and mode in `setups.json`.
- **group**: a named set of tabs, a row in `tabs.sqlite` `groups`.
- **Panorama**: the organising canvas and tree that shows groups and tab cards.
- **stock tab**: a tab in a stock Firefox window; store key `stock:...`.
- **web tab**: an in-shell Theia tab showing a web page; store key `web:...`.
- **stock window**: an unmodified Firefox `browser.xhtml` window.
- **chrome bar**: PB's Theia-rendered address and command bar (`@powerbrowser/chrome-bar`). It is Theia UI, not Firefox chrome.
- **ESR**: Firefox Extended Support Release, the upstream branch PB pins.
- **patch stack**: the patch files in `$PB_REPO/patches/`, the only allowed changes to `$PB_REPO/upstream/`.
- **downstream**: a branded distribution built on PB that adds and never patches.

## Unsettled items

- UNVERIFIED: the on-disk directory of `modes.json` and `setups.json`. Source says Theia user storage "beside" each other; that it equals `$THEIA_CONFIG_DIR` is inferred from Theia's user-storage convention and `$PB_REPO/docs/CUSTOMIZE.md` placing `settings.json` there. Verify: read `ModeService` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts` and `SetupsService` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`, then save a custom mode in a PB build and find the file on disk.
- UNVERIFIED: the default profile directory path on disk; not read in PB source. Verify: start a PB build and read `POWERBROWSER_PROFILE_DIR` from the sidecar environment, or open `about:profiles` in a stock window.
- UNVERIFIED: whether `browser.tabs` in a WebExtension sees in-shell web tabs (also open in [Capability gaps](00-choosing-a-surface.md#capability-gaps-no-surface-supports-these-yet)). Verify: load a temporary add-on in a PB build that logs `browser.tabs.query({})` while web tabs are open.
- UNVERIFIED: the ESR rebase cadence ("roughly every four weeks") is a statement in `$PB_REPO/README.md`, section "Rules we hold ourselves to", not checked against release history. Verify: compare `git -C "$PB_REPO" log --format='%ad %s' -- configuration.toml` with Mozilla's ESR release calendar.
- Each doc in docs/ carries its own line-3 stamp. Run `node scripts/check-drift.mjs docs/<file>.md` to list the cited PB files that changed since that doc's stamp before relying on it.
- Release pipeline, MSIX and DMG are documented ahead of implementation (`$PB_REPO/docs/RELEASING.md`).

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
