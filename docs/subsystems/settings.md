# Settings

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/powerbrowser/shell/powerbrowser-sidecar.js`
- `$PB_REPO/powerbrowser/shell/powerbrowser.js`
- `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`
- `$PB_REPO/powerbrowser/branding/release/pref/firefox-branding.js`
- `$PB_REPO/powerbrowser/branding/dev/pref/firefox-branding.js`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/powerbrowser/distribution/policies.json`
- `$PB_REPO/powerbrowser/INTERNAL-APIS.md`
- `$PB_REPO/docs/TAB-STORE.md`
- `$PB_REPO/docs/REBRANDING.md`
- `$PB_REPO/configuration.toml`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/scripts/lib/config-schema.json`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/scripts/verify-endpoints.sh`
- `$PB_REPO/scripts/verify-theia-endpoints.mjs`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/address-bar/address-bar.tsx`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-preferences.ts`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`
- `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/group-query-service.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-service.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`
- `$PB_REPO/theia/extensions/customize/src/browser/customize-frontend-module.ts`

Not read:
- NOT COVERED: `$PB_REPO/upstream/` Firefox default prefs
- NOT COVERED: `$PB_REPO/theia/node_modules/` stock Theia preference schemas
- NOT COVERED: `$PB_REPO/.planning/` decision logs
- NOT COVERED: a live PB run

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

PB keeps settings in five layers. Each layer has one writer and its own read path:

- The `tabs.sqlite` settings table holds the tab store's own settings (retention, integrity schedule, launch restore). Chrome is the single writer; every other layer reads through a bridge kind, an MCP op, or the backend reader.
- Firefox prefs hold the sidecar supervisor config and the shipped branding defaults. They are Gecko defaults with unlocked overrides; chrome reads them with never-throwing accessors, and a user value wins where the code asks.
- Theia preferences hold the chrome-bar and telemetry settings. Each is a `PreferenceSchema` contribution read live from the user scope.
- Frontend config holds build-time flags and defaults (`theia.frontend.config` in the browser app manifest). Generated fragments supply some keys; the copy-over is surgical per key.
- `$PB_REPO/configuration.toml` is the rebrand manifest. It is a validated build input only: no PB code reads it at runtime, and the generator emits the shipped values from it.

## Where its data lives

- `<profile>/tabs.sqlite`, `settings` table: the five store keys below. Writer: chrome only (`PowerBrowserAPI` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`). Readers: the bridge kind, the MCP write op, the sweep, the integrity schedule, the launch restore, the backend reader.
- `<profile>/prefs.js` and `<profile>/user.js`: Firefox pref user values. Writer: Firefox and the user. Readers: the three accessors in APIs by layer.
- Theia user settings (under the config dir). Writer: the user through the Settings UI. Readers: `PreferenceService` in the chrome-bar and telemetry extensions.
- Staged or packaged `theia.frontend.config` block: build-time flags and defaults. Writer: the generator copy-over and the yarn-managed manifest. Readers: `FrontendApplicationConfigProvider.get()` call sites.
- `$PB_REPO/configuration.toml`: manifest inputs. Writer: the downstream rebrand author. Reader: the generator in `$PB_REPO/scripts/generate.mjs` (validated by `keys` in `$PB_REPO/scripts/lib/config-schema.json`).

## Access matrix

| Setting family | Read | Write | API |
| --- | --- | --- | --- |
| Store settings (5 keys) | `GroupQueryService.getSettings`, bridge kind `setSetting` reply, `tabs_sql` on `settings` | Bridge kind `setSetting`, MCP `tab_store_write` op `setSetting` | `setSetting` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (served by `handleStoreRequest`) |
| Sidecar prefs (`powerbrowser.sidecar.*`) | `PowerBrowserAPI.getStringPref`, `PowerBrowserAPI.getIntPref`, `PowerBrowserAPI.prefHasUserValue` | User value in `user.js` or `prefs.js`; shipped default in `$PB_REPO/powerbrowser/shell/powerbrowser-sidecar.js` | The three accessors in APIs by layer |
| Shell pref (`powerbrowser.shell.quitFlushTimeoutMs`) | `TheiaService` quit path with the 3000 fallback | User value in `user.js` or `prefs.js` (no shipped `pref()` default) | `getIntPref` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` |
| Chrome-bar preferences (4 keys) | `PreferenceService` through the `userPreference` helper (User scope only) | Settings UI, user scope | `ChromeBarPreferenceSchema` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts` |
| Telemetry preference | `PreferenceService.get` per event with the manifest level as default | Settings UI | `TELEMETRY_LEVEL_PREFERENCE` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-preferences.ts` |
| Frontend config flags | `FrontendApplicationConfigProvider.get()` at module load | Generator copy-over or manifest edit (**PB core edit**) | `readTelemetryConfig` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts` |
| Manifest inputs | Generator only; never read at runtime | `$PB_REPO/configuration.toml` edit (**PB core edit**) then regenerate | `validateTelemetry`, `emitTheiaTelemetry`, `emitSearchEngines` in `$PB_REPO/scripts/generate.mjs` |

## APIs by layer

**Store table (chrome):**
- `STORE_SETTING_RULES` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`: the five validators with their `says` strings; unknowns and out-of-range values are refused.
- `setStoreSetting` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`: validates, then updates the existing row only; a key the store does not hold is refused, never inserted.
- `readTabStoreSetting` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`: one row or null when absent, blank or unreadable; every caller carries a default.
- `TAB_STORE_SCHEMA_HEAD` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`: the schema head the store migrates to; the settings table is seeded at v5.

**Theia backend (read-only):**
- `GroupQueryService` in `$PB_REPO/theia/extensions/tab-uris/src/browser/group-query-service.ts`: the frontend contract (`listGroups`, `getGroupTabs`, `listUngroupedTabs`, `getSettings`).
- `TabQueryService` in `$PB_REPO/theia/extensions/tab-uris/src/node/tab-query-service.ts`: the only read-only handle; `getSettings` returns the table as key to value.

**Bridge (frontend to chrome):**
- `setSetting` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`: the store kind (dispatched by `handleStoreRequest` in the same file); fields `key` and `value` (text); valid keys are the five store keys (ranges in the Commands, settings and ids table). Call it through the `request` method of `ChromeStoreClient` in `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`, which has no typed method for this kind.
- Sender and window rules apply as for every store kind: see [02-powerbrowser-api-bridge.md](../02-powerbrowser-api-bridge.md).

**MCP (external agents):**
- `tab_store_write` op `setSetting` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`: fields `key` and `value` (`TAB_STORE_WRITE_FIELDS`); admitted to the relay (`TAB_STORE_RELAY_KINDS`) and to the write ops (`TAB_STORE_WRITE_OPS`); chrome validation still applies behind it. No other MCP tool writes settings; `tabs_sql` reads the table.

**Firefox prefs (chrome):**
- `getStringPref` and `getIntPref` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`: the pref or the caller fallback, never throwing.
- `prefHasUserValue` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`: true when the user (`user.js` or `prefs.js`) set the pref, never throwing; staged copies lose to an explicit user value. The three are the local-config-read rows of `$PB_REPO/powerbrowser/INTERNAL-APIS.md`.

**Theia preferences (frontend):**
- `ChromeBarPreferenceSchema` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts`: four `browser.*` keys, all `PreferenceScope.User`, with defaults off, empty, empty and on.
- `bindChromeBarPreferences` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts`: registers the schema contribution.
- `TelemetryPreferenceSchema` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-preferences.ts`: `telemetry.telemetryLevel` with the four-level enum and default off; its `initSchema` awaits one microtask so PB text wins over the stock registration.
- `readTelemetryConfig` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts`: reads the manifest fragment once with a fail-closed off-and-no-endpoint fallback.

**Generator (build time):**
- `emitFirefoxBrandingJs` in `$PB_REPO/scripts/generate.mjs`: emits the tracked branding pref files.
- `emitTheiaTelemetry` in `$PB_REPO/scripts/generate.mjs`: emits the telemetry fragment from `[telemetry]`; unset level resolves to off with the default echo; enabled level without endpoint fails the generate.
- `emitTheiaFrontendConfig` in `$PB_REPO/scripts/generate.mjs`: emits the frontend-config fragment from `[identity]` and `[theia]`.
- The schema keys `telemetry.level`, `telemetry.endpoint`, `search_engines[].name` and `search_engines[].url` in `$PB_REPO/scripts/lib/config-schema.json` validate the manifest inputs (dotted-path `keys`).

## Events and change signals

- `PreferenceService.onPreferenceChanged` fires on a chrome-bar key change: the address bar refreshes its engine list and the widget repaints Home visibility.
- The telemetry sender reads `telemetry.telemetryLevel` per event, with the manifest level as default, so a change applies without restart (`levelAllowsEvent` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`).
- The integrity schedule reads `integrity_check_minutes` before each wait (`startTabStoreTriggers` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`); a change applies from the next run.
- The sweep reads `closed_retention_days` (`sweepTabStoreFromSessionStore` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`) and the launch restore reads `restore_behaviour`, `restore_live_minutes` and `restore_url_days` (`planWebTabRestore` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`) on each run or launch.
- There is no change event for a `tabs.sqlite` row write. Backends and MCP clients poll with `getSettings` or `tabs_sql`.

## Commands, settings and ids

Store keys (written through `setSetting`; valid values enforced by `STORE_SETTING_RULES`):

- `closed_retention_days`: a number from 0 to 3650, decimals allowed. Default `7`. Reader: the sweep prune (`sweepTabStoreFromSessionStore` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`). Closed-tab history older than this many days is deleted.
- `integrity_check_minutes`: a number greater than 0 and at most 525600, decimals allowed. Default `1440`. Reader: the scheduled integrity check (`startTabStoreTriggers` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`). Minutes between full integrity checks.
- `restore_behaviour`: `session` or `none`. Default `session`. Reader: `planWebTabRestore` in `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`. `session` reopens the last session's web tabs; `none` reopens nothing (see [the launch restore policy](../09-tabs-reference.md#access-matrix)).
- `restore_live_minutes`: a number from 0 to 10080, decimals allowed. Default `5`. Reader: `planWebTabRestore` (the reader of `restore_behaviour`). A tab looked at within this many minutes of the quit reopens with its back and forward history; 0 means URL-only, never history.
- `restore_url_days`: a number from 0 to 3650, decimals allowed. Default `30`. Reader: `planWebTabRestore` (the reader of `restore_behaviour`). A tab looked at within this many days reopens at its URL.

Sidecar prefs (defaults in `$PB_REPO/powerbrowser/shell/powerbrowser-sidecar.js`; a bare method name below is in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`):

- `powerbrowser.sidecar.nodePath` (default empty): `node` resolved on PATH at spawn time. Reader: the sidecar resolver; a launch-profile value is also read by the shell bootstrap in `$PB_REPO/powerbrowser/shell/powerbrowser.js` through `getStringPref` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`.
- `powerbrowser.sidecar.backendMain` (default the dev-tree backend path): the Theia backend entry file. Reader: the sidecar resolver (`_resolveSidecar` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`) with staged-copy preference unless the user set a value.
- `powerbrowser.sidecar.healthIntervalStartupMs` (250): startup health poll interval. Reader: `_spawnAndGate`.
- `powerbrowser.sidecar.healthIntervalSteadyMs` (5000): steady health interval. Reader: `_healthLoop`.
- `powerbrowser.sidecar.startupTimeoutMs` (90000): startup deadline. Reader: `_spawnAndGate`.
- `powerbrowser.sidecar.healthTimeoutMs` (4000): health probe timeout. Reader: `_spawnAndGate` and `_healthLoop`.
- `powerbrowser.sidecar.killGraceMs` (3000): process-stop grace. Reader: `stop` and `_reap`.
- `powerbrowser.sidecar.logBufferLines` (500): diagnostics log buffer size. Reader: `_pushLog`.
- `powerbrowser.sidecar.giveUpAttempts` (6): total spawn attempts before give-up. Reader: `_restart`.
- `powerbrowser.sidecar.giveUpWallclockMs` (45000): give-up deadline; either limit trips first. Reader: `_restart`.
- `powerbrowser.sidecar.recoveryProbeIntervalMs` (15000): probe interval for a backend that healed on its own. Reader: `_recoveryProbeLoop`.
- `powerbrowser.shell.quitFlushTimeoutMs` (no shipped default; reads fall back to 3000): bounds the quit flush so a hung frontend cannot hold the quit past it. Reader: the quit path.
- `browser.dom.window.dump.enabled` (true): lets the shell sentinels reach stdout. Reader: none in PB code (the only match in `powerbrowser`, `theia` and `scripts` is the `pref()` line).

Shipped branding prefs (`$PB_REPO/powerbrowser/branding/release/pref/firefox-branding.js`, 34 keys, plain `pref()`, never the locking variant, so a developer can flip them while debugging). Writer for all 34: `emitFirefoxBrandingJs` in `$PB_REPO/scripts/generate.mjs` (base lines: `FIREFOX_BRANDING_BASE_LINES`; the two manifest keys splice in at `DYNAMIC_PREF_ANCHOR`).

- Startup and update URLs, blank: `startup.homepage_override_url`, `startup.homepage_welcome_url`, `startup.homepage_welcome_url.additional`, `app.update.url.manual`, `app.update.url.details`.
- GMP and system add-ons: `media.gmp-manager.url` and `extensions.systemAddon.update.url` blank; `media.gmp-gmpopenh264.enabled` and `extensions.systemAddon.update.enabled` false.
- Telemetry and crash reporting: `toolkit.telemetry.unified`, `datareporting.healthreport.uploadEnabled` and `datareporting.policy.dataSubmissionEnabled` false; `toolkit.telemetry.server` takes the `[telemetry]` endpoint when a level is set; `breakpad.reportURL` takes `[urls].crash_report` when stated; both blank otherwise.
- Captive portal, Normandy and Shield: `network.captive-portal-service.enabled`, `app.normandy.enabled` and `app.shield.optoutstudies.enabled` false; `captivedetect.canonicalURL` blank.
- New Tab and sponsored content: `browser.newtabpage.activity-stream.discoverystream.enabled`, `browser.newtabpage.activity-stream.showSponsored`, `browser.newtabpage.activity-stream.showSponsoredTopSites` and `browser.topsites.contile.enabled` false.
- Region and Web Push: `browser.region.network.url` and `dom.push.serverURL` blank.
- Add-ons (AMO): `extensions.getAddons.cache.enabled` false; `extensions.getAddons.get.url`, `extensions.getAddons.langpacks.url`, `extensions.getAddons.discovery.api_url`, `extensions.getAddons.browserMappings.url` and `extensions.addonAbuseReport.url` blank.
- Connectivity, prefetch and update: `network.connectivity-service.enabled` and `extensions.update.autoUpdateDefault` false; `network.dns.disablePrefetch` true.
- DevTools: `devtools.selfxss.count` 5.

Reader for all 34: Gecko's default-branch pref service (consumers in `$PB_REPO/upstream/`, which is not read). PB code reads 28: `$PB_REPO/scripts/verify-endpoints.sh` layer 1 checks each allowlist `prefs` row's installed value against its `expect`, and `$PB_REPO/scripts/verify-theia-endpoints.mjs` derives the `expect` of the two manifest keys. The other six (`startup.*`, `app.update.url.*`, `devtools.selfxss.count`) have no allowlist row or PB reader.

Chrome-bar preferences (schema in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts`; all User scope only):

- `browser.showHomeButton` (default false): shows the Home button (`SHOW_HOME_BUTTON_PREFERENCE` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts`; read in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx`).
- `browser.homePage` (default empty): the Home page (`HOME_PAGE_PREFERENCE` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts`; read by `goHome` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/address-bar/address-bar.tsx`); empty opens the empty page.
- `browser.defaultSearchEngine` (default empty, meaning chrome's configured default): the engine the address bar searches with (`DEFAULT_SEARCH_ENGINE_PREFERENCE` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts`); options are filled at runtime from chrome's engine list (`refreshEngines` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/address-bar/address-bar.tsx`), and the placeholder, pill label and search rows follow `engineNameForRequest` in the same file.
- `browser.searchSuggestions` (default true): engine suggestions while typing (`SEARCH_SUGGESTIONS_PREFERENCE` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts`); read by `suggestionsOn` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/address-bar/address-bar.tsx`.

Other settings:

- `telemetry.telemetryLevel` (default off): `telemetry.telemetryLevel` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-preferences.ts`; levels off, crash, error, all. Shipped `off` with a null endpoint in `$PB_REPO/theia/applications/browser/package.json`.
- `powerbrowserPrivilegedJs` (build flag, false): enables the privileged JS layer only when true at build time; a restart is not enough (`FrontendApplicationConfigProvider` in `$PB_REPO/theia/extensions/customize/src/browser/customize-frontend-module.ts`).
- `theia.frontend.config` manifest keys `applicationName`, `defaultTheme`, `powerbrowserTelemetry`, `preferences` (workspace trust off, startup editor none) in `$PB_REPO/theia/applications/browser/package.json`.
- Manifest inputs `[telemetry]`, `[[search_engines]]`, `[urls]`, `[theia]`, branding and installer tables in `$PB_REPO/configuration.toml`.
- Policy keys `AppUpdateURL`, `SearchEngines`, `ExtensionSettings` in `$PB_REPO/powerbrowser/distribution/policies.json`: shipped engine and update values copied from generator fragments (**PB core edit** to change).

## Limits and rules

- **Single writer.** Only chrome writes `tabs.sqlite`. The backend opens it read-only; every settings write goes through the bridge kind, the relay, or the MCP op.
- **Validation.** `setSetting` refuses unknown keys, non-text values, out-of-range values, and keys the store does not hold; it never inserts. Enforced by `setStoreSetting` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` and pinned by the `ng-026-store-write-endpoint` row.
- **Absence falls back.** An absent, blank or unreadable store value resolves null and each reader applies its default. Enforced by `readTabStoreSetting` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` and the reader fallbacks.
- **Theia preference scope.** Chrome-bar keys are User scope only: a workspace settings file cannot change them. Enforced by `ChromeBarPreferenceSchema` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-preferences.ts`.
- **Shipping a new default engine.** Setting `browser.defaultSearchEngine` as a shipped default goes through the tracked manifest preferences map (**PB core edit**); a per-user change stays in user settings.
- **Privileged JS is a rebuild.** Enabling `powerbrowserPrivilegedJs` needs the flag true at build time (**PB core edit**), not a pref flip.
- **Shipped prefs are generated.** Hand-editing the branding pref files fails the byte-identity gate. A new shipped pref goes through `FIREFOX_BRANDING_BASE_LINES` (**PB core edit**); enforced by the `branding-preflight` row.
- **New outbound hosts need an allowlist row.** A manifest endpoint or engine host with no `hosts` row fails the endpoints check (**PB core edit**). Enforced by the `verify-endpoints` row.
- **Telemetry is fail-closed.** An unreadable manifest fragment resolves to off with no endpoint, and an enabled level without endpoint fails the generate. Enforced by `readTelemetryConfig` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts` and the `telemetry` row.

## Verification

Run `node scripts/verify-platform.sh --only <label>` for each row:

- `telemetry` proves the manifest `[telemetry]` reaches the sidecar as the `powerbrowserTelemetry` block and that the sender honours `telemetry.telemetryLevel`.
- `search-engines` proves the configured engines reach the policy `SearchEngines` key and the address-bar list.
- `verify-endpoints` proves the shipped pref values match the allowlist `prefs` expectations and no unlisted host is contacted.
- `ng-010-closed-tab-history` proves `closed_retention_days` prunes closed rows on the sweep.
- `ng-011-settings-table-read` proves the backend reader serves all five keys and the launch restore honours `restore_behaviour`, `restore_live_minutes` and the history tiers.
- `ng-026-store-write-endpoint` proves the `setSetting` writer validates exactly the documented keys and ranges.

## PB docs and deltas

- `$PB_REPO/docs/TAB-STORE.md`, section "Settings": agrees with `STORE_SETTING_RULES`; the defaults, valid values and readers match.
- `$PB_REPO/docs/REBRANDING.md`, field reference: documents every `$PB_REPO/configuration.toml` key and its generated target.
- `$PB_REPO/powerbrowser/distribution/policies.json`: carries the shipped engine and update values this doc names; the generator fragments are the source of each copied key.
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`: the authority for exact shipped pref values; this doc states the mechanism and points there instead of copying all rows.
- `docs/CONFLICTS.md`: no CF entry covers settings (CF-01..CF-11 address fork naming, start commands, scope rows, watch scripts, generator shell, fetch order, tab keys, rule 5, planned sections, rebrand copies and stock-window opening); nothing here contradicts a registered conflict.

## Gaps

- GAP: no Settings UI exists for the `tabs.sqlite` settings table. Checked: `setSetting` reaches only the bridge client call site, the relay field list and the MCP tool schema; no preference schema, settings page or command writes these keys. An agent changes them through the `setSetting` bridge kind, the `tab_store_write` op, or offline SQL with PB closed.

## Unsettled items

- UNVERIFIED: the allowlist `prefs` array holds 28 rows. Verify: count the `name` entries in `$PB_REPO/powerbrowser/endpoint-allowlist.json` at your PB HEAD.
- UNVERIFIED: the dev title bar paints from `browser.tabs.inTitlebar` 0 while release carries no such default. Verify: launch a dev build and a release build and compare the window chrome.
- UNVERIFIED: level `all` delivers events to the manifest endpoint and level `off` sends nothing. Verify: run `node scripts/verify-platform.sh --only telemetry` against a build with a loopback endpoint and confirm delivery and silence.
- UNVERIFIED: a shipped `powerbrowser.shell.quitFlushTimeoutMs` value would be honoured. Verify: set the pref in a launch profile `user.js` and quit with a hung frontend; the quit proceeds past the deadline.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
