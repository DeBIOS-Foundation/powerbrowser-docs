# Tabs reference

> Verified against PB 8843936 on 2026-10-21. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/tab-uris/`
- `$PB_REPO/theia/extensions/modes/`
- `$PB_REPO/theia/extensions/chrome-bar/`
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/powerbrowser/shell/powerbrowser.js`
- `$PB_REPO/docs/TAB-STORE.md`
- `$PB_REPO/docs/URI-SCHEMES.md`
- `$PB_REPO/configuration.toml`
- `$PB_REPO/theia/applications/browser/package.json`

Statements with the `UNVERIFIED:` marker were read in source but not tested in a running build. Facts about Firefox's `ext-tabs-base.js` (in the gitignored `$PB_REPO/upstream/` checkout, pinned by `firefox_esr_tag` in `$PB_REPO/configuration.toml`) and Theia's `tabs-main.ts` (package `@theia/plugin-ext` in the gitignored `$PB_REPO/theia/node_modules/`, pinned by `$PB_REPO/theia/applications/browser/package.json`) come from the pinned on-disk checkout and are not drift-checked.

This page lists every tab-related API, data store, event, command and setting in PowerBrowser (PB). It also states which extension type can reach each one. Use it to design a tab-management extension. Full payload tables live in docs 01-04, and this page links to them instead of copying them.

PB has **no REST API**. External processes reach tabs only through the tab-store MCP endpoint (doc 03). The reasons are in [04 "Why there is no REST API"](04-theia-backend-rpc-http.md).

Paths used below: the Firefox boundary file is `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`; the Theia extensions are `$PB_REPO/theia/extensions/tab-uris/`, `$PB_REPO/theia/extensions/modes/` and `$PB_REPO/theia/extensions/chrome-bar/`.

## The tab model

PB has three kinds of tab. All three are recorded in one table, `tabs.sqlite` `tabs`, with one row per tab.

| Kind | What it is | Where it is drawn | Row key (`tabs.uri`) |
|---|---|---|---|
| Theia widget tab | An editor, terminal, view, settings page or plugin panel in the Theia main area | Theia `ApplicationShell.mainPanel` | Its address from `TabUriRegistry.uriOf` (`view:welcome`, `terminal:t1`, `settings:`), else an editor's `NavigatableWidget.getResourceUri()` (`file:///...`). If it has neither, or the address is `webview:`/`http(s):`, the key is `widget:<widget id>`. |
| In-shell web tab | A `WebTabWidget` in the Theia main area. Chrome renders the page in a `<browser>` overlay positioned over the widget | Theia main area, with a chrome overlay | `web:<id>`, where `<id>` is `wt-<session>-<n>`, or the key a Panorama card passed when it reopened the tab |
| Stock tab | A normal Firefox tab in a `navigator:browser` window, opened by `powerbrowser.open-browser-window` or `openStockTab` | Stock Firefox window (`gBrowser`) | `stock:<stamp>-<n>`, stored on the tab as the sessionstore custom value `powerbrowser-tab-key` |

The key is always the tab's identity, never its page URL. Two tabs on the same page are two rows, and a navigation updates the row in place. The single rule is `tabKeyOf` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`. Rows from before v5 were rewritten to `stock:legacy-<rowid>` and `web:legacy-<rowid>`. The `webview:` scheme is a plugin-panel address and is never a row key. URI schemes are listed in `$PB_REPO/docs/URI-SCHEMES.md`. Row keys are specified in `$PB_REPO/docs/TAB-STORE.md`, section "Row keys".

**Groups (Panorama).** A group is a row in `groups`, drawn as a box on the Organising canvas. A tab belongs to at most one group (`tabs.group_id`). Its order within the group is `tabs.ord`. Ungrouped tabs can be placed on the canvas at `tabs.x`/`tabs.y`. Exactly one group is active (`is_active`). These tabs join it through `GroupModel.joinActiveGroup`:

- a tab opened by `powerbrowser.chrome-bar.new-tab` ("+");
- a background tab the chrome bar opens on a middle-click or Ctrl+click of Back, Forward or Reload (`openInNewTab` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx`);
- a tab opened by dropping an http(s) link on the New Tab button (`onNewTabDrop` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx`);
- an address-bar row, or the typed text, opened in a new tab directly after the current one: in the foreground with Alt+Enter, in the background with Ctrl+click or middle-click (`openRowInNewTab` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx`);
- a search from the address bar's one-off engine strip opened in a new tab (`runOneOff` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx`).

Tabs opened any other way stay ungrouped. The frontend model is `GroupModel` (doc 01).

**Modes.** A mode is a Theia perspective (Coding, Browsing, Organising, or a custom mode). A mode switch never closes, moves or unmounts main-area tabs, because `MainAreaExemption` in `$PB_REPO/theia/extensions/modes/src/browser/main-area-exemption.ts` strips the main area from saved perspective layouts. **Setups** are named layouts saved in `user-storage:/user/setups.json` and restored with `SetupsService`.

**Open and closed.** A row with `closed_at IS NULL` is open, or it is restorable (a grouped card from an earlier session). A row is closed (`closed_at` set) when:
- the user closes the tab;
- a stock tab disappears from sessionstore;
- at startup, an ungrouped web tab from the previous session is not restored.

A quit or a frontend reload never closes a row. Closed rows are closed-tab history and are pruned after `closed_retention_days`.

**Active.** There are three separate notions:
- The active widget is Theia's `shell.activeWidget` / `currentWidget`. It is not stored.
- The selected web tab: the frontend reports it to chrome with the bridge kind `webTabActivated` on every change of the main area's current title (`WebTabActivationContribution` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`). Chrome keeps it per Theia frame in memory (`PowerBrowserWebTabs.activeTabIdOf` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`). It is not stored.
- `tabs.last_accessed` records when the user last looked at a tab (set by `touchTab` and by chrome on `TabSelect`).

## Where tab data lives

| Store | Location | Contents | Writer | Readers |
|---|---|---|---|---|
| `tabs.sqlite` (WAL, `user_version` 6) | `<profile>/tabs.sqlite` | Tab rows, groups, settings, saved-page index | Chrome only (`PowerBrowserAPI`) | `TabQueryService` (backend, read-only), `tabs_sql` (read-only child process), chrome store kinds |
| Places | `<profile>/places.sqlite` | History, bookmarks, frecency | Firefox | Chrome store kinds (`readHistoryEntry`, `searchPlaces`, ...) |
| Sessionstore | `<profile>/sessionstore*` | Stock-window tabs and closed tabs | Firefox | `projectSessionStoreTabs`, plus the chrome sweep into `tabs.sqlite` |
| Shell state | `<profile>/powerbrowser-shell-state.json` (`SHELL_STATE_MAX_CHARS`, 16 Mi characters) | Theia layout and local storage (`ProfileStorageService`) | Chrome, on `shellStateSave` | `shellStateLoad` |
| Web-tab history | `<profile>/powerbrowser-web-tab-history.json` | Back/forward history of web tabs, saved at quit | Chrome | Chrome, armed by `shellArmWebTabHistory` |
| Saved pages | `<profile>/saved-pages/<dir>` | Full-page copies | Chrome (`savePageCopy`) | Files on disk |
| Modes / setups | `user-storage:/user/modes.json`, `setups.json` | Custom modes and named layouts | `ModeService`, `SetupsService` | Same |

### `tabs.sqlite` schema (head = v6)

The head version is `TAB_STORE_SCHEMA_HEAD` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`. The DDL is the constants `TABS_STORE_V1_DDL`, `GROUPS_STORE_V2_DDL`, `TAB_POSITION_V3_DDL`, `TAB_ORDER_V4_DDL`, `TAB_STORE_V5_DDL` and `TAB_STORE_V6_DDL` in the same file. `$PB_REPO/docs/TAB-STORE.md` has the same schema in its section "Schema at head".

`tabs`:

| Column | Type | Since | Meaning |
|---|---|---|---|
| `uri` | TEXT PK, length > 0 | v1 | Row key (see the tab model) |
| `url` | TEXT NOT NULL | v1 | Current address; `''` when the tab has no page |
| `title` | TEXT NOT NULL DEFAULT '' | v1 | Title |
| `last_active` | INTEGER NOT NULL >= 0 | v1 | Last time the tab was seen open (ms) |
| `group_id` | TEXT NULL | v2 | `groups.id` |
| `thumbnail` | TEXT NULL | v2 | PNG data URL, at most `TAB_STORE_THUMBNAIL_MAX_CHARS` (200000) characters |
| `x`, `y` | INTEGER NULL | v3 | Canvas position of an ungrouped card |
| `ord` | INTEGER NULL | v4 | Position within the group; NULL sorts last |
| `created_at` | INTEGER NULL | v5 | Set once, on insert; NULL for rows from before v5 |
| `last_accessed` | INTEGER NULL | v5 | Last time the user looked at the tab |
| `closed_at` | INTEGER NULL | v5 | NULL = open or restorable |

`groups` (v2): `id` TEXT PK, `title` DEFAULT 'Untitled group' (at most `GROUP_TITLE_MAX`, 60 characters), `x`/`y` >= 0, `w` >= 200 (default 400), `h` >= 144 (default 300), `is_active` 0/1.

`settings` (v5): `key` TEXT PK, `value` TEXT. Seeded keys: `closed_retention_days`=7, `integrity_check_minutes`=1440, `restore_behaviour`=`session`, `restore_live_minutes`=5, `restore_url_days`=30. Valid ranges are in [02 store kinds](02-powerbrowser-api-bridge.md) (`setSetting`).

`saved_pages` (v6): `tab_uri` PK, `dir`, `url`, `title`, `saved_at`, `bytes`.

Indexes: `idx_tabs_last_active`, `idx_tabs_group`, `idx_tabs_closed_at`, `idx_groups_active`. The schema has no triggers and no virtual tables. Each migration step (`migrateTabStoreToV1` to `migrateTabStoreToV6` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`) runs in its own transaction. Chrome refuses to open a file whose `user_version` is newer than the build.

## Access matrix

Column meanings:
- **Frontend** = a Theia extension frontend, using in-process DI.
- **Backend** = a Theia extension backend.
- **Bridge** = a `PowerBrowserGroupRequest` kind, which only Theia frontend code can send.
- **MCP** = an external process or agent using `/mcp`.
- **.vsix** = a VS Code plugin.
- **WebExt** = `browser.*` in an add-on.
- **REST** is "none" everywhere.

| Operation | Frontend | Backend | Bridge | MCP | .vsix | WebExt |
|---|---|---|---|---|---|---|
| List open tabs (live) | `shell.mainPanel.widgets()`, `GroupModel.liveTabs(widgets)` | none | none | none | UNVERIFIED: `window.tabGroups.all` lists the main panel only, web tabs as `UnknownInput`, see [Unsettled items](#unsettled-items) | UNVERIFIED: `browser.tabs.query` sees stock windows only, see [Unsettled items](#unsettled-items) |
| List open tab rows (store) | `GroupQueryService.getGroupTabs` / `listUngroupedTabs`, `GroupModel.getTabs` / `listUngrouped` | `TabQueryService` (same methods) | `queryTabsWithPlaces {open:true}` | `tabs_sql`, `tabs_with_places {open:true}` | none | none |
| List closed tabs | `ChromeStoreClient.queryTabsWithPlaces({open:false})` (`closed_at` field) | relay `queryTabsWithPlaces {open:false}` (`TabQueryService` serves open rows only) | `queryTabsWithPlaces` | `tabs_sql` (`WHERE closed_at IS NOT NULL`) | none | UNVERIFIED: `browser.sessions` covers stock windows only, see [Unsettled items](#unsettled-items) |
| Stock-window tabs | `ChromeStoreClient.projectSessionStoreTabs()` | relay only | `projectSessionStoreTabs` | `sessionstore_tabs` | none | `browser.tabs.query` |
| Read tab metadata | `TabUriRegistry.uriOf`, `tabKeyOf`, `WebTabWidget.url` / `pageTitle` / `loading` | `TabQueryService` rows | none | `tabs_sql` | `Tab.label` only | stock only |
| Open a tab | `open(openerService, uri)` (`@theia/core/lib/browser/opener-service`; the `OpenerService` interface itself has no `open`); web: `WebTabOpenHandler.openUrl(url, rowKey?)`, or `WebTabOpenHandler.openInBackground(url, ref)` for a background tab directly after `ref` (http(s) URLs only; the current tab stays current); command `powerbrowser.chrome-bar.new-tab` | none | `openStockTab {url}` (stock window); `webTabOpen` (internal to `WebTabWidget`) | none | UNVERIFIED: `vscode.commands.executeCommand` of a PB command id, see [Unsettled items](#unsettled-items) | `browser.tabs.create` (stock only) |
| Close a tab | `shell.closeWidget(id)` / `widget.close()` | none | `closeTab {uri}` marks the row only and does not close the widget; `closeGroup {id}` closes the group's stock tabs (`closeGroupRows` -> `closeStockTabByUri`) | none | UNVERIFIED: `tabGroups.close(tab)`, see [Unsettled items](#unsettled-items) | `browser.tabs.remove` (stock only) |
| Activate a tab | `shell.activateWidget(id)` | none | `touchTab {uri}` sets `last_accessed` only; `webTabActivated {tabId}` only reports the selected web tab to chrome and activates nothing | none | none (`Tab` is read-only) | `browser.tabs.update({active})` (stock) |
| Move or reorder | `shell.mainPanel` / `addWidget(w,{mode:'tab-after',ref})`; in group: `GroupModel.moveCard`, `placeCard` | none | `setGroupOrder`, `setTabPosition` | `tab_store_write` op `setGroupOrder` / `setTabPosition` | `$moveTab` does nothing | `browser.tabs.move` (stock) |
| Create / rename / delete group | `GroupModel.createGroup` / `commitTitle` / `dissolveGroup` / `closeGroup` (`commitClose`) | `TabStoreRelayHub.relay({kind})` (not `closeGroup`) | `createGroup`, `renameGroup`, `dissolveGroup`, `closeGroup` | `tab_store_write` ops `createGroup` / `renameGroup` / `dissolveGroup` (no `closeGroup`) | none | none |
| Move or resize a group box | `GroupModel.moveGroup` / `resizeGroup` | relay | `moveGroup`, `resizeGroup` | `tab_store_write` | none | none |
| Assign a tab to a group | `GroupModel.moveCard(client, uri, groupId\|null, index?)` | relay | `setTabGroup {uri, groupId}` | `tab_store_write` op `setTabGroup` | none | none |
| Set the active group | `GroupModel.setActiveGroup` | relay | `setActiveGroup` | `tab_store_write` op `setActiveGroup` | none | none |
| Navigate a web tab | `WebTabWidget.navigate(url)` / `back()` / `forward()` / `reload(bypassCache)` / `stop()` / `history()` / `gotoIndex(index)` | none | `webTabNavigate`, `webTabBack`, `webTabForward`, `webTabReload` (with `bypassCache: true` for a hard reload), `webTabStop`, `webTabHistory`, `webTabGotoIndex` (sent by `WebTabChannel`) | none | none | none |
| Observe changes | `shell.onDidAddWidget` / `onDidRemoveWidget` / `onDidChangeCurrentWidget`, `GroupModel.onDidChange`, `WebTabWidget.onDidChangeState`, `WebTabChannel.onPush(kind, handler)` | none | push `PowerBrowserWebTabState` with kinds `state`, `pageFocus`, `shortcut`, `flushShellState` | none (poll) | UNVERIFIED: `tabGroups.onDidChangeTabs`, see [Unsettled items](#unsettled-items) | `browser.tabs.onUpdated` (stock) |
| History / bookmarks for a tab | `ChromeStoreClient.readHistoryEntry` / `readBookmarkByUrl` / `listBookmarkFolder`, `queryTabsWithPlaces`; a web tab's back/forward list: `WebTabWidget.history()` | relay | same kind names; `webTabHistory` | `history_entry`, `bookmark_by_url`, `bookmark_folder`, `tabs_with_places` | none | UNVERIFIED: `browser.history`, `browser.bookmarks` read the whole profile, see [Unsettled items](#unsettled-items) |
| Search | `ChromeStoreClient.searchPlaces(text, limit)`, `ChromeBarSuggestionService.searchByPrefix` | `TabQueryService.searchByPrefix` | `searchPlaces` | `tabs_sql` (LIKE) | none | none |
| Thumbnail | `GroupModel.rememberThumbnail` (in-memory session cache of at most `SESSION_THUMBS_MAX`, 40, never stored); `captureShellRegion` | none | `captureShellRegion {rect}` (returns a PNG, stores nothing; chrome writes `tabs.thumbnail` for stock tabs only) | `tabs_sql` (`thumbnail` column) | none | `browser.tabs.captureTab` (stock) |
| Save a page copy | `ChromeStoreClient.savePageCopy(uri)`, command `powerbrowser.tab.savePageCopy` | none | `savePageCopy` | none | none | none |
| Tab settings | `GroupQueryService.getSettings()`; write `ChromeStoreClient.request({kind:'setSetting',key,value})` | `TabQueryService.getSettings`; relay `setSetting` | `setSetting` | `tabs_sql` on `settings`; `tab_store_write` op `setSetting` | none | none |

"relay" means a backend extension can inject `TabStoreRelayHub` and call `relay(msg)` with any kind in `TAB_STORE_RELAY_KINDS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts` (doc 04): `readHistoryEntry`, `readBookmarkByUrl`, `listBookmarkFolder`, `projectSessionStoreTabs`, `queryTabsWithPlaces` and the `tab_store_write` ops (`TAB_STORE_WRITE_OPS`). `searchPlaces`, `savePageCopy`, `resolveTypedAddress`, `listSearchEngines`, `placesFavicons`, `closeGroup` and the web-tab kinds are not relayed; the window-side `TabStoreRelayContribution` refuses them. This works only while a Theia window is open. The REST column is omitted because every cell would be "none".

## APIs by layer

**Frontend DI** (doc 01 has the full tables):
- `TabUriRegistry.uriOf(widget): URI|undefined`, `parseName(uri)`: `TabUriRegistry` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`
- `tabKeyOf(widget, registry): string`, `LiveTab {uri,url,title}`: `tabKeyOf` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`
- `GroupModel`, reads and writes: `GroupModel` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`. Writes take a `GroupActorClient` first. Members: `listGroups`, `getTabs`, `listUngrouped`, `createGroup`, `commitTitle`, `moveCard`, `placeCard`, `dissolveGroup`, `commitClose`, `closeCard`, `setActiveGroup`, `reopen`, `joinActiveGroup`.
- `planWebTabRestore(settings, tabs, quitAt): WebTabRestore[]`, the launch restore policy: `planWebTabRestore` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`
- `GroupActorClient.mutate(msg): Promise<GroupReply>`, ack timeout `GROUP_ACTOR_ACK_TIMEOUT_MS` (5000 ms): `GroupActorClient` in `$PB_REPO/theia/extensions/modes/src/browser/group-actor-client.ts`
- `ChromeStoreClient.request(msg, timeoutMs)` with default `STORE_ACK_TIMEOUT_MS` (8000 ms), and its wrappers, including `resolveTypedAddress(text, engineName, canonize)`, `listSearchEngines()`, `autofillOrigin(text)` and `removeHistoryEntry(url)` (privileged; only `chrome-bar-widget.tsx` may call it): `ChromeStoreClient` in `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`
- `GroupQueryService` (JSON-RPC proxy, read-only): `GroupQueryService` in `$PB_REPO/theia/extensions/tab-uris/src/browser/group-query-service.ts`
- `WebTabWidget` (`tabId`, `rowKey`, `url`, `pageTitle`, `loading`, `canGoBack`, `canGoForward`, `navigate`, `back`, `forward`, `reload(bypassCache)`, `stop`, `history`, `gotoIndex`, `focusPage`, `onDidChangeState`): `WebTabWidget` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`. `history()` resolves to the reply's `index` (the current entry, -1 when empty) and `entries` (`{index,title,url}`, at most 15 around the current one).
- `WebTabOpenHandler.open(uri,{rowKey?})` / `openUrl(url, rowKey?)` / `openInBackground(url, ref)`, priority 1000 for http(s) and `about:blank`: `WebTabOpenHandler` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`. `openInBackground` adds the tab with `mode: 'tab-after'` next to `ref`, does not activate it, and throws for a non-http(s) URL. The factory id is `WEB_TAB_FACTORY_ID` (`powerbrowser.web-tab`). The factory refuses ids from an earlier session (`isCurrentSessionTabId`).
- `WebTabChannel` (`send`, `request`, `onPush(kind, handler)`, `widgetOf(tabId)`): `WebTabChannel` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`. `onPush` subscribes to one push kind of `WEB_TAB_STATE_EVENT` and returns a `Disposable`; `widgetOf` maps a chrome-pushed tab id to this frontend's `WebTabWidget`.
- `SetupsService.restoreWebTab` / `saveCurrentAsSetup` / `restoreSetup`: `SetupsService` in `$PB_REPO/theia/extensions/modes/src/browser/setups-service.ts`
- `ModeService.activateMode(id)`: `activateMode` in `$PB_REPO/theia/extensions/modes/src/browser/mode-service.ts`
- `TabStripWidget` (`powerbrowser.tab-strip`): `TabStripWidget` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx`. It is bound inside chrome-bar and is not a documented extension API. Its public methods are `primaryBar()`, `hasStack()`, `dissolve()` and `switchOrder(anchor)`. `switchOrder` returns the order the tab-switching keys walk: the strip's tabs in Browsing mode when the strip lists `anchor`, otherwise the main-area tab bar that holds `anchor`.
- Stock `ApplicationShell`: `mainPanel`, `addWidget`, `activateWidget`, `closeWidget`, `getWidgets('main')`, `currentWidget`, `activeWidget`, `onDidAddWidget`, `onDidRemoveWidget`, `onDidChangeCurrentWidget`, `onDidChangeActiveWidget`. These are documented by the Theia release pinned in `$PB_REPO/theia/applications/browser/package.json`, not by PB.

**Backend:**
- `TabQueryService` (`listGroups`, `getGroupTabs`, `listUngroupedTabs`, `getSettings`, `searchByPrefix`): `TabQueryService` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-service.ts`. It holds the only read-only handle and serves open rows only.
- `TabStoreRelayHub.relay(msg): Promise<StoreReply>`: `TabStoreRelayHub` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-relay.ts`
- JSON-RPC paths: `/services/powerbrowser/groups`, `/chrome-suggestions`, `/tab-store-relay` ([04 JSON-RPC services](04-theia-backend-rpc-http.md))

**Bridge kinds** (full fields and errors in [02](02-powerbrowser-api-bridge.md)). All are served in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`; the actor's `receiveMessage` routes shell kinds, then store kinds, then web-tab action kinds, then everything else to `handleGroupMutation`:
- Group and tab writes, served by `handleGroupMutation` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`: `createGroup`, `renameGroup`, `moveGroup`, `resizeGroup`, `dissolveGroup`, `closeGroup`, `setActiveGroup`, `setTabGroup`, `setTabPosition`, `setGroupOrder`, `trackTab`, `closeTab`, `touchTab`, `captureShellRegion`
- Stock tabs and web tabs, also served by `handleGroupMutation`: `openStockTab`, `webTabOpen`, `webTabGeometry`, `webTabNavigate`, `webTabBack`, `webTabForward`, `webTabReload` (optional `bypassCache: true`: a hard reload that bypasses the cache and proxy), `webTabClose`, `webTabFocus`
- Web-tab actions, served by `handleWebTabAction` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (the set `WEB_TAB_ACTION_KINDS`): `webTabStop`, `webTabHistory`, `webTabGotoIndex` (field `index`; an out-of-range index is refused), `webTabActivated` (field `tabId`, or null when a non-web widget is current)
- Store, served by `handleStoreRequest` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (the set `STORE_REQUEST_KINDS`): `readHistoryEntry`, `readBookmarkByUrl`, `listBookmarkFolder`, `projectSessionStoreTabs`, `queryTabsWithPlaces`, `searchPlaces`, `setSetting`, `savePageCopy`, `resolveTypedAddress` (fields `text`, optional `engineName` and optional `canonize`; reply field `resolved` with kind `visit`, `search`, `refused` or `no-engine`; the chrome bar uses it to turn typed text into a URL), `listSearchEngines` (reply `engines` of `{name, icon}` and `defaultName`; the chrome bar's search engines), `placesFavicons` (field `urls`; reply `icons`, cached favicons keyed by URL; the address-bar rows' icons), `searchSuggestions` (fields `text` and optional `engineName`; reply `rows`, up to 4 search-engine suggestion strings; the address bar's engine suggestions), `autofillOrigin` (field `text`; reply `completion`, `{text, url}` or null; the address bar's inline autofill of a visited origin), `removeHistoryEntry` (field `url`; reply `removed`; a privileged Places write sent only by the address bar's Shift+Delete on a history row)
- Shell, served by `handleShellMessage` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (the set `SHELL_MESSAGE_KINDS`): `shellStateLoad`, `shellStateSave`, `shellFlushed`, `shellArmWebTabHistory`

**MCP tools** (full schemas in [03](03-tab-store-mcp-server.md)):
- Read: `tabs_sql`, `history_entry`, `bookmark_by_url`, `bookmark_folder`, `sessionstore_tabs`, `tabs_with_places`
- Write: `tab_store_write`, with ops `createGroup`, `renameGroup`, `moveGroup`, `resizeGroup`, `dissolveGroup`, `setActiveGroup`, `setTabGroup`, `setTabPosition`, `setGroupOrder`, `setSetting`
- Source: `TabStoreAccessEndpoint` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`, and `TAB_STORE_TOOL_NAMES` and `TAB_STORE_WRITE_FIELDS` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`

**Chrome-internal writers.** No extension can call these. They are listed so you know what the store does by itself. All are members of `PowerBrowserAPI` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`:
- Row writes: `writeTabRow` (upsert that reopens a closed row), `closeTabRow`, `touchTabRow`, `writeClosedTabRow`, `closeAbsentStockRows`, `closeEndedWebRows`, `trackShellTab`, `writeThumbnail`
- Maintenance and lookup: `sweepTabStoreFromSessionStore` (at most `TAB_STORE_SWEEP_MAX_WRITES`, 500, writes per sweep), `pruneClosedTabRows`, `findStockTabBrowser` / `closeStockTabByUri`

## Events and change signals

| Signal | Source | Reach | Payload |
|---|---|---|---|
| `ApplicationShell.onDidAddWidget` / `onDidRemoveWidget` | Theia | frontend | widget |
| `onDidChangeCurrentWidget` / `onDidChangeActiveWidget` | Theia | frontend | `{oldValue,newValue}` |
| `GroupModel.onDidChange: Event<void>` | `GroupModel` | frontend | none; re-read the model |
| `WebTabWidget.onDidChangeState: Event<WebTabState>` | `WebTabWidget` | frontend | `{url,title,loading,canGoBack,canGoForward}` |
| `WebTabChannel.onPush(kind, handler)` | `WebTabChannel` | frontend | the push detail of one kind (`state`, `pageFocus`, `shortcut`, `flushShellState`) |
| DOM `PowerBrowserWebTabState` (`WEB_TAB_STATE_EVENT`) | chrome, `webTabPush`, `flushShellState` and `PowerBrowserWebTabs` | frontend | kind `state` (`tabId`, `url`, `title`, `loading`, `canGoBack`, `canGoForward`), `pageFocus` (`tabId` or null), `shortcut` (`id`, `tabId`), `flushShellState` (`flushId`) |
| Chrome `TabOpen` / `TabClose` / `TabSelect` / `TabAttrModified` | `startTabStoreTriggers` | chrome only | write `tabs.sqlite` rows for stock tabs |
| `sessionstore-state-write-complete` | `startTabStoreTriggers` | chrome only | runs the sweep |

`GroupModel` is in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`. `WebTabWidget` and `WebTabChannel` are in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`. `webTabPush`, `flushShellState`, `PowerBrowserWebTabs` and `startTabStoreTriggers` are in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`. Chrome coalesces `state` pushes to one per tab per animation frame of the shell window (`scheduleWebTabState` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`). The `pageFocus` push sets the context key `powerbrowser.webPageFocused` (`PAGE_FOCUS_CONTEXT_KEY` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-shortcuts.ts`), which is true while a web page has keyboard focus.

No signal exists for "a `tabs.sqlite` row changed". MCP clients and backends must poll. A Panorama change made through MCP appears in the UI only on the next load (`GroupModel.reload()`). Moving a stock tab to another window (`adoptedTab`) keeps its key and is not a close (`startTabStoreTriggers` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`).

## Commands and keybindings touching tabs

All ids are exported as constants (doc 01, "Command ids"). Run them with `CommandService.executeCommand`.

- `powerbrowser.chrome-bar.new-tab`: opens `about:blank` as a web tab and joins the active group (`CHROME_BAR_NEW_TAB_COMMAND_ID` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts`)
- `powerbrowser.chrome-bar.back` / `.forward` / `.reload` / `.focus-address`: act on the current web tab
- `powerbrowser.open-browser-window`: when chrome answered the `probeChannel` kind at startup and the URL is empty or http(s), sends `openStockTab`, which adds the URL (`about:newtab` when none is given) as a tab to the most recently focused stock Firefox window and opens a new stock window only when none exists; otherwise, for example with no chrome host, it falls back to `window.open(target, '_blank')` (`OPEN_BROWSER_WINDOW_COMMAND_ID` and `openBrowserWindow` in `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts`; `PowerBrowserAPI.openStockTab` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`; [CF-11](CONFLICTS.md#cf-11))
- `powerbrowser.tab.savePageCopy`: saves the current tab's page (`SAVE_PAGE_COPY_COMMAND` in `$PB_REPO/theia/extensions/tab-uris/src/browser/save-page-copy-command.ts`)
- `powerbrowser.panorama.new-group` / `.close-group(id)` / `.show-canvas` / `.show-tree` / `.retry-save` / `.undo-close-group(id)` (`PANORAMA_NEW_GROUP_COMMAND_ID` and its siblings, and the handler interface `PanoramaCommandHandler`, in `$PB_REPO/theia/extensions/modes/src/browser/panorama-commands.ts`)
- `powerbrowser.modes.activate(id)` / `.save-as-mode`; `powerbrowser.setups.save-setup` / `.restore-setup` / `.delete-setup` / `.open-dependent`

Theia keybindings, registered by `ChromeBarKeybindingContribution` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-keybindings.ts`:

- `ctrlcmd+l` -> `powerbrowser.chrome-bar.focus-address`, with `when` `!editorFocus && !terminalFocus`, so the editor and the terminal keep Ctrl+L.
- `f6` and `shift+f6` -> the passthrough pseudo-command, with `when` `powerbrowser.addressFocused` (`ADDRESS_FOCUSED_CONTEXT_KEY`, set only on the address pill's input). In the pill these keys return focus to the page instead of running another F6 binding.

Page-scoped keys. A focused web-tab overlay page receives every key, so Theia never sees keys pressed inside a page. Chrome no longer holds a reserved `<key>` for Ctrl+L (the comment above `PAGE_KEYS` in `$PB_REPO/powerbrowser/shell/powerbrowser.js` says so); Ctrl+L inside a page is the page-scoped row `focusAddressL`. The page-scoped keys work like this:

- The rows are `PAGE_SHORTCUTS` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-shortcuts.ts`, mirrored row for row by `PAGE_KEYS` in `$PB_REPO/powerbrowser/shell/powerbrowser.js`.
- Chrome creates one `<key>` per row, disabled, and enables the rows only while an overlay `<browser>` has focus. With the Theia frame focused every key goes to Theia.
- When a row fires, chrome pushes `shortcut` with the row `id` and the focused page's `tabId` (`PowerBrowserWebTabs.relayShortcut` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`). `ChromeBarShortcutRelay` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-shortcuts.ts` runs the row's action on that tab only.
- Row ids and keys: `stop` (Esc), `newTab` (Ctrl+T), `closeTab` (Ctrl+W), `reload` (Ctrl+R), `reloadF5` (F5), `hardReload` (Ctrl+Shift+R), `hardReloadF5` (Ctrl+F5), `back` (Alt+Left), `forward` (Alt+Right), `home` (Alt+Home), `focusAddress` (Alt+D), `focusAddressL` (Ctrl+L), `nextTab` (Ctrl+Tab), `prevTab` (Ctrl+Shift+Tab), `nextTabPage` (Ctrl+Page Down), `prevTabPage` (Ctrl+Page Up), `selectTab1` to `selectTab8` (Alt+1 to Alt+8), `selectLastTab` (Alt+9), `focusAddressF6` (F6), `focusAddressShiftF6` (Shift+F6).
- Reserved rows (chrome handles them before the page sees the key, as Firefox does): `newTab`, `closeTab`, `nextTab`, `prevTab`, `nextTabPage`, `prevTabPage`.
- `focusAddressF6` and `focusAddressShiftF6` have no `<key>`: chrome acts on the F6 reply from the content process, and only when the page did not call `preventDefault()`.
- Mouse buttons 4 and 5 are relayed as the `back` and `forward` rows for the page under the pointer.
- The tab-switching rows (`nextTab`, `prevTab`, `nextTabPage`, `prevTabPage`, `selectTab1` to `selectTab8`, `selectLastTab`) walk `TabStripWidget.switchOrder`.

PB has no Theia `PreferenceSchema` for tabs. Tab settings are the `settings` table rows. The chrome bar's own preferences `browser.showHomeButton`, `browser.homePage`, `browser.defaultSearchEngine` and `browser.searchSuggestions` (`ChromeBarPreferenceSchema` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts`) control the Home button, the address-bar search engine and its suggestions while typing, and are not tab settings.

## Limits and rules

- **Single writer.** Only chrome writes `tabs.sqlite`. The backend opens it read-only. A second writer fails the second-writer gate. Every write goes through a bridge kind, `GroupActorClient`, or the relay.
- **Sender gate.** Bridge kinds are accepted only from the shell's own Theia frame (`groupSenderIsTheia`, origin `http://127.0.0.1`/`localhost` on the live port, and the top frame must be embedded by the shell window's own content browser). Store kinds also require `windowtype="powerbrowser:main"`. WebExtensions, stock-tab pages and web-tab overlays are refused.
- **Private windows.** They get no row key, no row and no thumbnail (`writeTabRow`, `scheduleSettleCapture`, `captureTabThumbnail` and `parseSessionStoreTabRows` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` each skip them). `setTabGroup` and `savePageCopy` refuse them.
- **`closeGroup` closes the user's tabs.** It is deliberately not exposed over MCP.
- **Timeouts:**
  - `GroupActorClient`: `GROUP_ACTOR_ACK_TIMEOUT_MS` (5000 ms)
  - `WebTabChannel`: `WEB_TAB_ACK_TIMEOUT_MS` (5000 ms)
  - `ChromeStoreClient` and relay: `STORE_ACK_TIMEOUT_MS` (8000 ms)
  - `savePageCopy`: `SAVE_PAGE_ACK_TIMEOUT_MS` (120000 ms)
  - quit flush: `powerbrowser.shell.quitFlushTimeoutMs`, 3000 ms
- **`tabs_sql` limits** (`SQL_TIME_LIMIT_MS`, `SQL_MAX_ROWS`, `SQL_MAX_BYTES`, `SQL_MAX_RUNNING` and `SQL_MAX_CHARS` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-sql.ts`):
  - one read-only statement, at most 10000 chars, at most 100 params
  - `ATTACH`/`DETACH`/`VACUUM`/`PRAGMA`/`load_extension` refused
  - `SQL_TIME_LIMIT_MS` 5000 (child is SIGKILLed)
  - `SQL_MAX_ROWS` 1000
  - `SQL_MAX_BYTES` 8 MiB
  - `SQL_MAX_RUNNING` 2 (a third statement is refused)
- **`tabs_with_places` / `queryTabsWithPlaces`** scan only the most recently active rows, up to `TAB_PLACES_SCAN_CAP` (5000) (`truncated` reports this). The limit is 1-1000, default 200.
- **Relayed calls** need an open Theia window. Otherwise the error is "no PowerBrowser window is connected".
- **Validation:**
  - group id `^[A-Za-z0-9_-]{1,128}$`
  - title `GROUP_TITLE_MAX` (60) characters
  - group bounds clamped to 0..`GROUP_BOUNDS_MAX` (10000), with minimum w 200 and h 144
  - `trackTab` refuses `stock:`/`web:`/`webview:`/`http(s):` keys
  - `closeTab`/`touchTab` refuse `stock:` keys
  - web-tab ids must match `^[A-Za-z0-9_-]{1,64}$` (`webTabIdIsValid`)
- **Web tabs from a persisted layout are refused** (`isCurrentSessionTabId`). They are restored through `planWebTabRestore` and `SetupsService.restoreWebTab`.
- **Static DI.** Contributions bound late are never seen. Use `registerLateOpenHandler` for a late opener (doc 01 "Gotchas").
- **Integrity.** A corrupt store is copied to `tabs.sqlite.corrupt-<N>` and rebuilt from sessionstore. Groups come back empty and settings return to their defaults (`$PB_REPO/docs/TAB-STORE.md`, section "Integrity and quarantine").

## Feature map for a tab manager

Each common tab-manager feature, with the API to use from a Theia frontend extension (the only surface that reaches every tab kind) and the gap number below where one applies.

- **Search open tabs**: filter `GroupModel.liveTabs(shell.mainPanel.widgets())` by `title`/`url` in memory. For closed or not-open rows, use `queryTabsWithPlaces` or `tabs_sql` (`LIKE` on `title`/`url`). For history and bookmarks, use `searchPlaces`.
- **Find and close duplicates**: group `liveTabs` by `url` and close the extras with `shell.closeWidget(id)`. The key is identity, not URL, so duplicates are separate rows (see the tab model). Stock tabs cannot be closed from the shell (gap 4).
- **Sort the strip**: no PB API. The strip paints the primary main-area `TabBar` titles in order (`homeWidgets` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx`). Reorder with stock Theia/Lumino `shell.getTabBarFor(widget)` and `TabBar.insertTab(index, title)`. UNVERIFIED: this reorder was not tested in PB. Verify: call it from a test Theia extension in a PB build and check that the strip and `TabStripWidget.switchOrder` follow the new order. Sorting cards inside a group uses `GroupModel.moveCard(..., index)` or `setGroupOrder`.
- **Group and ungroup**: `GroupModel.createGroup` / `moveCard` / `dissolveGroup`, or bridge kinds and the MCP `tab_store_write` op. The strip shows only the current tab, loose tabs and the active group's tabs (`GroupModel.showsInStrip`, used by `stripTabs` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx`), so switching the active group changes what the strip shows.
- **Suspend or discard a tab**: no API. PB has no discard, unload or hibernate path for web tabs (gap 10). Closing the widget and later reopening it with `WebTabOpenHandler.openUrl(url, rowKey)` keeps the row but loses back/forward history and page state.
- **Pin or mute**: no PB API (gap 10). Theia keeps its own `theia-mod-pinned` title class for editors. PB adds no web-tab pin, and there is no audio or mute state.
- **Restore a closed tab**: read the closed rows with `queryTabsWithPlaces({open:false})`, then call `WebTabOpenHandler.openUrl(row.url, row.uri)` for a `web:` row or `open(openerService, new URI(row.uri))` for a Theia tab. `writeTabRow` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` upserts and clears `closed_at` for every key kind. A `web:` or `stock:` row revives with its group and position. A Theia-tab row is written through `trackShellTab` in the same file, which first resets `group_id`, `x`, `y` and `ord` on a closed row, so a reopened Theia tab comes back ungrouped. For a grouped card use `GroupModel.reopen(tab)`. Panorama never builds a card for a closed `stock:` row (`GroupModel.load` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts` drops them), so the UI never passes one to `reopen`. `reopen` itself does not filter `stock:` rows, and no opener handles that scheme, so an extension that passes one gets a rejected promise. Nothing reopens a closed stock tab (gap 6).
- **Save and restore sessions**: `SetupsService.saveCurrentAsSetup` / `restoreSetup`. A setup (`SetupSnapshot`: `name`, `modeId`, `windows[]` of `{x,y,width,height,tabs: string[], activeTab, modeId, dock?}`, `savedAt`) stores tab addresses, not URLs or groups. Groups live only in `tabs.sqlite`. The restore policy for launches is the `restore_behaviour` setting (`session` or `none`).
- **Export**: read `tabs_sql` or `tabs_with_places` over MCP, or `queryTabsWithPlaces` / `GroupModel` in the frontend, and write the file yourself. PB has no export or import API for tabs or groups, and no bookmark-write kind (gap 11).
- **Cross-window**: there is one Theia core window. `SetupsService.openDependent(widgetId)` (command `powerbrowser.setups.open-dependent`) moves a tab into a secondary window, and the tab stays in the core model and keeps its row. A second IDE frame is blocked: the IDE-frame widgets are pinned non-extractable (`NON_EXTRACTABLE_WIDGET_IDS` in `$PB_REPO/theia/extensions/modes/src/browser/dependent-windows.ts`). Stock Firefox windows are reachable read-only (`projectSessionStoreTabs`), plus `openStockTab`.

## Gaps for a tab-management extension

Each item below names an operation with no API today and the PB core change that would add it.

1. **Close or activate a tab from outside the frontend.** No MCP tool, backend method or bridge kind closes or focuses a Theia widget (`webTabActivated` only reports the selection to chrome). Fix: a frontend relay handler for new kinds such as `closeTabWidget` / `activateTab`, added to `TAB_STORE_RELAY_KINDS` and `TAB_STORE_WRITE_FIELDS` (doc 03 "How to add a new MCP tool").
2. **Open a tab from MCP or a backend.** Fix: a relayed kind that calls `open(openerService, uri)` in the newest window.
3. **Store change notifications.** There is no event when a row changes. The `PowerBrowserWebTabState` push channel now routes several kinds (`state`, `pageFocus`, `shortcut`, `flushShellState`) through `WebTabChannel.onPush`, but none of them reports a `tabs.sqlite` row change. Fix: chrome sends a new push kind after each store write, and `GroupModel` subscribes to it with `WebTabChannel.onPush` and re-dispatches it. For MCP, use a notification channel or keep polling.
4. **Close stock tabs or reorder the main-area strip by key.** Only bridge `closeGroup` closes stock tabs today, and only all of one group's. Fix: new `handleGroupMutation` kinds wrapping `closeStockTabByUri` and `shell.mainPanel` moves.
5. **Batch writes.** Every op is a separate transaction. Only `setGroupOrder` is atomic. Fix: a `batch` op in `handleGroupMutation`.
6. **Closed-tab restore by key.** `GroupModel.reopen(tab)` exists only in the frontend. MCP has no "reopen". Fix: a relayed `reopenTab {uri}`.
7. **Thumbnails for non-Panorama consumers.** These are read-only through `tabs_sql`. There is no on-demand capture outside `captureShellRegion`.
8. **`.vsix` access.** `vscode.window.tabGroups` exposes no URL, row key or group for web tabs. Fix: a PB-specific plugin API, or a Theia extension that exposes commands.
9. **WebExtension access to shell tabs.** None. UNVERIFIED: `browser.tabs` sees only `navigator:browser` windows (see [Unsettled items](#unsettled-items)). A fix would need an `ext-*` API in chrome, which is out of scope.
10. **Discard, pin and mute.** There is no kind for these. Fix: chrome kinds that call `gBrowser.discardBrowser`-style unloading or set `muted` on the web-tab `<browser>` overlay, plus a `pinned` column or setting.
11. **Bookmark writes and session import.** The store kinds read Places only. Fix: a `createBookmark`-style store kind. For import, a relayed batch open (see gaps 2 and 5).

## Unsettled items

- UNVERIFIED: `.vsix` `vscode.window.tabGroups` behaviour (main panel only, web tabs as `UnknownInput`, `tabGroups.close`, `tabGroups.onDidChangeTabs`, `$moveTab` doing nothing, and `vscode.commands.executeCommand` of a PB command id) was read in Theia's `tabs-main.ts` (package `@theia/plugin-ext`) and not tested in a running build. Verify: install a test `.vsix` in a PB build with a web tab open, log `vscode.window.tabGroups.all`, and call each API in the access matrix. [08 "Pick the extension type"](08-building-an-extension.md#pick-the-extension-type) also marks this `UNVERIFIED:`.
- UNVERIFIED: WebExtension `browser.tabs`, `browser.sessions`, `browser.history` and `browser.bookmarks` behaviour (stock windows only for tabs and sessions, the whole profile for history and bookmarks) was read in Firefox's `ext-tabs-base.js` and not tested in a running build. Verify: load a temporary add-on in a PB build (doc 05) with a web tab open and call `browser.tabs.query({})`, `browser.sessions.getRecentlyClosed()` and `browser.history.search({text: ''})`. [00-choosing "Capability gaps"](00-choosing-a-surface.md#capability-gaps-no-surface-supports-these-yet) and [05 "Gotchas"](05-webextensions.md#gotchas) also mark the `browser.tabs` part `UNVERIFIED:`.
- UNVERIFIED: whether a same-origin iframe inside the Theia frame passes `groupSenderIsTheia` (doc 02). Verify: read `groupSenderIsTheia` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, then send a bridge kind from such an iframe in a PB build.
- `GROUP_PATH` also dispatches `searchByPrefix` and `setProfileDir`, because the proxy targets `TabQueryService` itself. This is undocumented behaviour, so do not rely on it (doc 04).
- `projectSessionStoreTabs` returns `last_accessed`, but the TS type `SessionTabRow` in `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts` omits it.
- The `created_at` semantics come from the comment above `writeTabRow` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` and from `$PB_REPO/docs/TAB-STORE.md`. No reader in `$PB_REPO/theia/extensions/` uses the column yet.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
