# Tab URI registry

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/view-open-handler.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/terminal-open-handler.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/view-factory-table.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/terminal-naming-contribution.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-frontend-module.ts`
- `$PB_REPO/scripts/verify-registry-shape.mjs`
- `$PB_REPO/scripts/verify-uri-roundtrip.mjs`
- `$PB_REPO/scripts/scan-brand-residue.mjs`
- `$PB_REPO/docs/URI-SCHEMES.md`
- `$PB_REPO/docs/TAB-STORE.md`

Not read:
- NOT COVERED: `group-model.ts` internals (row keys, GroupModel; owned by docs/09-tabs-reference.md)
- NOT COVERED: the chrome bar and web-tab overlay internals
- NOT COVERED: upstream Firefox and Theia sources (ext-tabs-base.js, tabs-main.ts)
- NOT COVERED: live round-trip proof (no live build was run)

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

- The tab URI registry maps typeable addresses to Theia tabs and back. It owns schemes, registration and resolution; nothing else in PB opens a Theia tab by address.
- The registry is `TabUriRegistry` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`. Its exported shape is the bridge contract: the future unified tab strip consumes it as an API, not an implementation detail.
- Row keys are not addresses. `stock:` and `web:` name chrome-store rows; typing one opens nothing. Read the tab model in [the tabs reference](../09-tabs-reference.md#the-tab-model) and the store's row rules in [its row-keys section](../09-tabs-reference.md#where-tab-data-lives); this doc does not restate them.
- Discovery is runtime, never import-time: `TabUriRegistry.index` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uri-registry.ts` indexes live `AbstractViewContribution` instances on first use. `POWERBROWSER_VIEW_FACTORY_IDS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/view-factory-table.ts` is a coverage contract cross-checked against that discovery, never the lookup.
- Binds are static at module load. A contribution bound after first enumeration is never seen; the escape hatch is `registerLateOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`.

## Where its data lives

- No store. The forward direction discovers targets in the running container each launch; the reverse direction reads `WidgetManager` descriptions of live widgets.
- The coverage contract `POWERBROWSER_VIEW_FACTORY_IDS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/view-factory-table.ts` lists the 21 shipped `view:` targets with their container flags. Writer: the PB tree (hand-kept, cross-checked at startup).
- Opened widgets live in Theia's `WidgetManager`. Writer: the `WidgetFactory` bindings in `tab-uris-frontend-module.ts` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`.

## Access matrix

| Layer | Read | Write | API |
| --- | --- | --- | --- |
| Theia frontend (opener) | `open` through `OpenerService`; reverse address through `uriOf` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uri-registry.ts` | Opens the widget the winning handler returns | `TabUriRegistry` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uri-registry.ts` |
| Theia backend | None for URIs | None | No backend API |
| Bridge | `openStockTab` from the window command only | Stock-window tabs | `openStockTab` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (see [the bridge doc](../02-powerbrowser-api-bridge.md#navigation-web-tab-and-window-kinds-also-handlegroupmutation)) |
| MCP / `.vsix` / WebExtension / REST | None | None | No surface |

## APIs by layer

- `getViewContribution` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`: the `AbstractViewContribution` a `view:` or `settings:` name resolves to, or `undefined`.
- `parseName` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`: lenient parse; `scheme:x`, `scheme:/x`, `scheme:///x` and `scheme://x` all yield the identical name.
- `createWidgetOptions` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`: pure total function of a plugin-container `view:` name to the widget-manager identifier; `undefined`, never `{}`, for every other target.
- `uriOf` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`: widget to address. Reads `WidgetManager` descriptions only; never walks the shell guessing id schemes.
- This subsystem paints no product naming of its own.
- The origin project's name appears only in `$PB_REPO/inventory/brand-tokens.json`. `$PB_REPO/scripts/scan-brand-residue.mjs` reads `git ls-files` and fails any other tracked file that spells a token.
- `POWERBROWSER_VIEW_FACTORY_IDS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/view-factory-table.ts`: the coverage list of the 21 shipped `view:` targets, cross-checked against live discovery; never the lookup.
- `registerLateOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`: registers an `OpenHandler` after first enumeration. Used by late surfaces such as privileged `customize.js`.
- `ViewUriOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/view-open-handler.ts`: `canHandle` 1000 or 0 on `view:`/`settings:`; delegates to the contribution's own `openView`, so a URI open lands exactly where the menu path lands.
- `TerminalUriOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/terminal-open-handler.ts`: `canHandle` 1000 or 0 on `terminal:`; empty means the active terminal, a stale name mints through `terminalIdentityOptions` in `$PB_REPO/theia/extensions/tab-uris/src/browser/terminal-naming-contribution.ts`.
- `PowerBrowserOutputOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts`: `canHandle` 1000 or 0 on `output:`; selects the channel first, then delegates to Theia's own output contribution.
- `PowerBrowserWebviewOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts`: `canHandle` 1000 or 0 on `webview:`; a bare `webview:<id>` resolves against open panels or throws.
- `WebTabOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`: `canHandle` 1000 or 0 on `http:`/`https:` plus the empty page; `openUrl` and `openInBackground` mint session-scoped `wt-<session>-<n>` ids and refuse older sessions through `isCurrentSessionTabId` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`.
- `WebTabChannel` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`: per-frontend channel; `onPush` subscribes to one push kind and `widgetOf` maps a chrome-pushed tab id to the live widget.
- `extensionDetailUriOf` and `webviewUriOf` in `$PB_REPO/theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts`: reverse lookups for extension detail editors and webview panels.
- `OPEN_BROWSER_WINDOW_COMMAND_ID` in `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts`: `powerbrowser.open-browser-window`, label `Open Browser Window`. Palette-only.
- `openBrowserWindow` in `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts`: sends `requestStockTab` when the channel answered the probe and the target is empty or http(s); otherwise the `window.open` fallback. Bare target opens `NEW_TAB_URL` in `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts`.
- `registerCommands` sites in this subsystem: `BrowserWindowCommandContribution` in `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts` and `SavePageCopyCommandContribution` (bound in `tab-store-access-frontend-module.ts` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-frontend-module.ts`).

## Events and change signals

- Opener poll: `DefaultOpenerService` asks each `OpenHandler` for `canHandle`; the winner's `open` runs. Priorities are 1000 or 0 on scheme alone, clearing every in-tree bidder while staying under `defaultHandlerPriority`.
- Reverse emission: `uriOf` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uri-registry.ts` emits the canonical opaque `scheme:path` form.
- Unknown `view:` path throws `powerbrowser.view-uri-open-handler: no view registered` from `ViewUriOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/view-open-handler.ts`; an unknown bare `webview:<id>` throws from `PowerBrowserWebviewOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts`. A silent no-op never stands in for an error.
- The window command probes once off the click path: `probeChannel` in `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts` settles `channelAlive` with `PROBE_TIMEOUT_MS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts` (5000); a click then takes exactly one path.

## Commands, settings and ids

- The window command id in the browser-window command file: `powerbrowser.open-browser-window`.
- The window command label in the browser-window command file: `Open Browser Window`.
- `NEW_TAB_URL` in `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts`: `about:newtab`.
- `WEB_TAB_FACTORY_ID` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`: `powerbrowser.web-tab`.
- `EMPTY_PAGE_URL` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`: `about:blank`.
- `WEB_TAB_OPEN_HANDLER_ID` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`: `powerbrowser.web-tab-open-handler`.

## Schemes

- `view:` through `ViewUriOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/view-open-handler.ts`: `view:welcome`, `view:explorer-view-container`. Empty is invalid; unknown throws.
- `settings:` through `ViewUriOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/view-open-handler.ts`: `settings:`, `settings:editor.fontSize`. Empty opens the widget; non-empty delegates to the preference handler.
- `terminal:` through `TerminalUriOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/terminal-open-handler.ts`: `terminal:t1`, `terminal:build`. Empty means the active terminal.
- `output:` through `PowerBrowserOutputOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts`: `output:Tasks`. Singleton: two channels share one tab.
- `webview:` through `PowerBrowserWebviewOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts`: `webview:viewType/panelId`. Session-scoped; bare ids resolve against open panels only.
- `preference:` through Theia's own handler: `preference:editor.fontSize`. No PB handler claims it.
- `vscode-extension:` through Theia's own editor: versioned extension detail. Keeps the authority form Theia emits.
- `http:`/`https:` through `WebTabOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`: `https://example.com/`. The address is the live page URL; a fresh tab shows the empty page.
- `stock:` and `web:` are not opener schemes. They are store row keys; typing one opens nothing. See [the tab model](../09-tabs-reference.md#the-tab-model) and [where rows live](../09-tabs-reference.md#where-tab-data-lives).

## Limits and rules

- Static binds at module load; dynamic registration goes through `registerLateOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`. A late static bind is never seen.
- `canHandle` returns 1000 or 0, synchronously, on scheme alone. No negative numbers, no async probing.
- First container opens go through `PluginViewRegistry.openViewContainer`; a bare widget fetch plus activate no-ops on a never-attached container.
- Web tabs from another session are refused by `isCurrentSessionTabId` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`; restores go through the launch policy, not the factory.
- `options: {}` is never passed where no options exist; `createWidgetOptions` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uri-registry.ts` returns `undefined` there, so the dedup key never forks.
- `preference:` has no competing PB handler; all scheme-gated `canHandle` checks exclude it.

## Verification

- `gui04-registry-shape` in `$PB_REPO/scripts/verify-platform.sh` (quick): the exported shape (`EXPECTED` plus `EXPECTED_MEMBERS` in `$PB_REPO/scripts/verify-registry-shape.mjs`) matches as set equality.
- `gui04-registry-shape-self-test` in `$PB_REPO/scripts/verify-platform.sh` (quick): the shape gate goes red on a planted addition and on a planted removal.
- `gui01-command-registered` in `$PB_REPO/scripts/verify-platform.sh` (full): the window command id and label resolve in the live command registry.
- `tab-uris-typecheck` in `$PB_REPO/scripts/verify-platform.sh` (quick): the tab-uris extension compiles.
- `chrome-bar-typecheck` in `$PB_REPO/scripts/verify-platform.sh` (quick): the chrome-bar extension compiles against the tab-uris declarations.
- `verify-uri-roundtrip` in `$PB_REPO/scripts/verify-platform.sh` (full): each shipped address round-trips through the live registry.

## PB docs and deltas

- `$PB_REPO/docs/URI-SCHEMES.md` general rules: agrees, canonical opaque form, lenient parse, identity-only, no non-user discriminators. The carve-out list matches `CARVE_OUTS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts` verbatim.
- `$PB_REPO/docs/URI-SCHEMES.md` section "The browser-window destination (not a scheme)": agrees, the command id and label match `OPEN_BROWSER_WINDOW_COMMAND_ID` in `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts`.
- `$PB_REPO/docs/TAB-STORE.md` section "Row keys": agrees, store keys are identities, not addresses; `webview:` is never a key.
- [CF-11](../CONFLICTS.md#cf-11): the `openStockTab` path replaced the `window.open`-only design; this doc follows the source side.

## Gaps

- GAP: no opener claims `stock:` or `web:`. Checked: every `canHandle` in `$PB_REPO/theia/extensions/tab-uris/src/browser/`.
- GAP: `webview:` addresses do not survive a restart. Checked: `PowerBrowserWebviewOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts`.
- GAP: `output:` channels share one tab. Checked: `CARVE_OUTS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts`.

## Unsettled items

- UNVERIFIED: a user `workbench.editorAssociations` entry overrides the 1000-priority handlers. Verify: set an association in a PB build and open the matching `view:` address.
- UNVERIFIED: the channel probe settles before the first command invoke. Verify: read `probeChannel` in `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts` and click the command on a cold start.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
