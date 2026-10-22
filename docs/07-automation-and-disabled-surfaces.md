# Automation, Remote Protocols and Disabled Firefox Surfaces

> Verified against PB 8843936 on 2026-10-21. Level: source-read

Source files:
- `$PB_REPO/scripts/lib/firefox-bidi.mjs`
- `$PB_REPO/scripts/lib/pb-live-probe.mjs`
- `$PB_REPO/scripts/lib/pb-relaunch.mjs`
- `$PB_REPO/scripts/verify-uri-roundtrip.mjs`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/configuration.toml`
- `$PB_REPO/powerbrowser/shell/components.conf`
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/powerbrowser/shell/powerbrowser.js`
- `$PB_REPO/powerbrowser/INTERNAL-APIS.md`
- `$PB_REPO/scripts/check-internals-boundary.sh`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/powerbrowser/branding/release/pref/firefox-branding.js`
- `$PB_REPO/powerbrowser/branding/dev/pref/firefox-branding.js`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/powerbrowser/distribution/policies.json`
- `$PB_REPO/powerbrowser/powerbrowser.desktop`
- `$PB_REPO/.mozconfig`
- `$PB_REPO/CLAUDE.md`
- `$PB_REPO/.planning/PROJECT.md`

Status: mixed. WebDriver BiDi = working, off unless the `--remote-debugging-port` launch flag is passed. Marionette = present-but-disabled (needs `--marionette` or `MOZ_MARIONETTE`). CDP = absent. DevTools RDP server and Browser Toolbox = present, and their gating prefs default to **true** in PB builds (see Gotchas). geckodriver = built but not packaged. WebMCP `navigator.modelContext` = present-but-disabled (`dom.modelcontext.enabled=false`). Firefox ML/chatbot = prefs on, UI only in stock `browser.xhtml` windows. `PowerBrowserSingleInstanceHandler` = working (focus/open shell only).

Facts cited from `$PB_REPO/upstream/` (the Gecko checkout) and from `$PB_REPO/objdir*/` build output (for example `$PB_REPO/objdir-release/`) come from the on-disk tree of the ESR tag pinned by `firefox_esr_tag` in `$PB_REPO/configuration.toml` and from the last local build. Both trees are gitignored, so those facts are not drift-checked; the drift check sees only a change of the pin.

## What it is

This file covers every way to drive or inspect PowerBrowser from outside the page, plus the Firefox surfaces that are compiled in but not used by PB:

1. **WebDriver BiDi (Remote Agent)** — W3C WebDriver BiDi over a WebSocket on 127.0.0.1. Started by a launch flag. PB's own live tests use it through `$PB_REPO/scripts/lib/firefox-bidi.mjs`, and the key-input live checks through `$PB_REPO/scripts/lib/pb-live-probe.mjs`.
2. **Marionette** — Mozilla's older WebDriver-classic backend (TCP, default port 2828). Compiled in, never started by PB.
3. **CDP (Chrome DevTools Protocol)** — not present in this ESR tree.
4. **DevTools Remote Debugging Protocol (RDP) / Browser Toolbox** — Firefox's own devtools server and chrome debugger.
5. **geckodriver** — Rust WebDriver-classic proxy to Marionette. Compiled, not shipped.
6. **WebMCP (`navigator.modelContext`)** — upstream implementation of the W3C WebMCP draft: pages register tools; chrome code lists and invokes them through `nsIModelContextService`. Disabled by pref.
7. **Firefox ML / AI chatbot** — inference engine (`browser.ml.*`), trialML WebExtension API (`extensions.ml.enabled`), GenAI chatbot sidebar and link preview. Lives in stock `browser.xhtml`.
8. **`PowerBrowserSingleInstanceHandler`** — PB's `nsICommandLineHandler`. On a second launch it focuses the existing shell window; on first launch it opens the shell window.

## Use it when / Do not use it when

| Surface | Use it when | Do not use it when / use instead |
|---|---|---|
| WebDriver BiDi via `firefox-bidi.mjs` | Writing a live verify check that must launch the real binary, evaluate JS in the Theia frontend or a web-tab context, take screenshots, or send trusted input to page content (`input.performActions`). For keys that must reach a chrome `<key>`, use `pb-live-probe.mjs` (see [1. WebDriver BiDi in a live check (the supported path)](#1-webdriver-bidi-in-a-live-check-the-supported-path)). | A runtime feature for end users. Shipped builds never pass the flag. For runtime access to tabs/history/bookmarks from an agent, use the tab-store MCP endpoint (`$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`; see [the tab-store MCP server](03-tab-store-mcp-server.md), and `$PB_REPO/docs/tab-store-access.md`). For Firefox internals from a Theia extension, use the `PowerBrowserGroup` actor / `PowerBrowserAPI` boundary (see [the PowerBrowserGroup bridge](02-powerbrowser-api-bridge.md)). |
| Marionette | Running an off-the-shelf Selenium/WebDriver-classic client through geckodriver during local experiments. | Any PB check. No PB helper exists. Chrome-context Marionette is recorded as platform-blocked on Linux (code comment, see Gotchas). Use BiDi. |
| CDP | Never. | It does not exist. Puppeteer/Playwright in CDP mode will not connect. Use BiDi. |
| DevTools / Browser Toolbox | Interactive debugging of the chrome document (`powerbrowser.xhtml`), `PowerBrowserAPI.sys.mjs`, or the Theia frontend during development. | Automated checks (use BiDi). |
| geckodriver | Local experiments with WebDriver-classic clients. | PB checks. `firefox-bidi.mjs` deliberately does not use it (D-69, header comment of `$PB_REPO/scripts/lib/firefox-bidi.mjs`). |
| WebMCP | Prototyping an "agent calls page-registered tools" feature on a dev profile. | Anything shipped. No PB or upstream chrome code consumes it, and the agent-facing feature set is out of scope (UNVERIFIED: still out of scope, see [Rules and constraints](#rules-and-constraints)). Use the tab-store MCP endpoint for agent access. |
| Firefox ML / chatbot | Only inside a stock browser window opened with `PowerBrowserAPI.openBrowserWindow(url)`. | Theia-shell features. The shell window has no sidebar, and AI-assistant integration is out of scope (UNVERIFIED: still out of scope, see [Rules and constraints](#rules-and-constraints)). Use Theia's own AI framework (stock, not customised) per [Theia plugins and AI](06-theia-plugins-and-ai.md). |
| `PowerBrowserSingleInstanceHandler` | Understanding what happens on a second launch. | Passing a URL to a running instance. It ignores all arguments when a shell window exists. |

## How to use

### 1. WebDriver BiDi in a live check (the supported path)

1. Build the binary first. `FIREFOX_BIN` defaults to `$PB_REPO/objdir/dist/bin/powerbrowser`; override with env `PB_FIREFOX_BIN`. `PB_BACKEND_MAIN` appends `user_pref("powerbrowser.sidecar.backendMain", …)` to the temp profile's `user.js`.
2. Import from `$PB_REPO/scripts/lib/firefox-bidi.mjs` and call `withFirefoxPage(url, callback, options)`. It always kills Firefox and removes the temp profile in `finally`, including on SIGINT.
3. Pass `''` as `url` to get only the shell context. A non-empty URL opens a **second**, stock browser window and `evaluate` is pinned to the context whose `url` equals the requested URL exactly.
4. Wait for Theia before reading it: `waitFor('window.theia && window.theia.container ? true : false')`.
5. Register the check as one row in `$PB_REPO/scripts/verify-platform.sh` (do not create a new driver). Row format is `"<check-id>|<command>"`, e.g. the row `gui02-web-tab-live`: `"gui02-web-tab-live|node $REPO_ROOT/scripts/verify-web-tab-live.mjs"`.

Key input that must reach chrome: `$PB_REPO/scripts/lib/pb-live-probe.mjs` is the live-probe harness for page-focus keys and the chrome-bar navigation buttons, built on `withShell` of `$PB_REPO/scripts/lib/pb-relaunch.mjs`. Its header comment states why it exists: key synthesis happens at the parent process, through `nsITextInputProcessor` in a chrome-scope evaluate, because "BiDi input on a content context would synthesise inside the content process and never reach a chrome `<key>`"; BiDi input on the chrome context is its fallback. Entry points: `withProbeShell` in `$PB_REPO/scripts/lib/pb-live-probe.mjs` (fresh profile, launch with `MOZ_PURGE_CACHES=1`, push recorder installed, profile disposed afterwards) and `pressKey` (modifier keydowns, the key, keyups; `keyRoute.last` reports `tip` or `bidi-chrome`). The rows `nav-keys-live` and `address-bar-live` in `$PB_REPO/scripts/verify-platform.sh` run checks built on it. The chrome keys it targets are the page-scoped `<key>` rows of `PAGE_KEYS` in `$PB_REPO/powerbrowser/shell/powerbrowser.js`: each is created `disabled` and enabled only while an overlay `<browser>` has focus, so a BiDi `input.performActions` into page content never fires them.

Real caller (the `withFirefoxPage('', ...)` call in `$PB_REPO/scripts/verify-uri-roundtrip.mjs`):

ILLUSTRATIVE: shortened from PB source; the assertions are elided.

```js
import { withFirefoxPage } from './lib/firefox-bidi.mjs';

await withFirefoxPage('', async ({ evaluate, waitFor }) => {
    await waitFor('window.theia && window.theia.container ? true : false');
    const href = await evaluate('location.href');
    // ...assertions...
});
```

Raw BiDi command: verbatim quote of the launch call inside `withFirefoxPage` in `$PB_REPO/scripts/lib/firefox-bidi.mjs` (the `spawn(binPath, ...)` statement):

```js
const child = spawn(binPath, [
    '--headless',
    '--profile', profileDir,
    `--remote-debugging-port=${port}`,
    '--remote-allow-hosts', '127.0.0.1',
    '--remote-allow-system-access',
    ...(url ? [url] : []),
], { stdio: ['ignore', stdoutSink ? 'pipe' : 'ignore', 'pipe'] });
```

Trusted input or any command the helper does not wrap:

ILLUSTRATIVE: assembled from the callback members of `withFirefoxPage`; not run.

```js
await withFirefoxPage('', async ({ send, topLevelContexts }) => {
    const tree = await send('browsingContext.getTree', {});   // returns msg.result
    // send('input.performActions', { context, actions: [...] })
});
```

Self-test of the helper: `(cd "$PB_REPO" && node scripts/lib/firefox-bidi.mjs --self-test)` (4 cases, needs the built binary, not registered in `$PB_REPO/scripts/verify-platform.sh`).

Manual BiDi session without the helper:

```sh
export PB_REPO="$(cd "${PB_REPO:-../Power-Browser}" && pwd)"
"$PB_REPO"/objdir/dist/bin/powerbrowser --profile /tmp/pbprof --remote-debugging-port=9222 --remote-allow-hosts 127.0.0.1
# stderr prints: WebDriver BiDi listening on ws://127.0.0.1:9222
# connect a WebSocket to ws://127.0.0.1:9222/session and send {"id":1,"method":"session.new","params":{"capabilities":{}}}
```

### 2. Marionette (development only)

1. Launch with `--marionette` (or set env `MOZ_MARIONETTE=1`); the flag and the variable are read by `$PB_REPO/upstream/remote/components/Marionette.sys.mjs` (constant `ENV_ENABLED`). Port comes from pref `marionette.port` (default 2828; `$PB_REPO/upstream/modules/libpref/init/all.js`, pref `marionette.port`).
2. Connect a WebDriver-classic client directly, or through geckodriver (step 5).

### 3. DevTools / Browser Toolbox (development)

1. In PB builds `devtools.chrome.enabled` and `devtools.debugger.remote-enabled` already default to `true` (sticky) because `MOZILLA_OFFICIAL` is not set (`$PB_REPO/.mozconfig` does not set it). If a profile has them false, set both to `true` in `about:config` or `user.js`.
2. Browser Toolbox: launch with `--jsdebugger` (`--wait-for-jsdebugger` pauses startup). A connection prompt appears because `devtools.debugger.prompt-connection` is `true`.
3. Remote RDP server: `--start-debugger-server` (port pref `devtools.debugger.remote-port`, default 6000; `devtools.debugger.force-local=true` binds loopback only). These flags are handled in `$PB_REPO/upstream/devtools/startup/DevToolsStartup.sys.mjs` (`--jsconsole`, `--devtools`, `--start-debugger-server`, `--jsdebugger`, `--wait-for-jsdebugger`).
4. `devtools.selfxss.count` is set to 5 in PB branding prefs (`devtools.selfxss.count` in `$PB_REPO/powerbrowser/branding/release/pref/firefox-branding.js`, same in the dev variant), so pasting into the web console is already allowed.

### 4. geckodriver (development only)

The binary is built at `$PB_REPO/objdir/x86_64-unknown-linux-gnu/release/geckodriver` (and the same path under `$PB_REPO/objdir-release/`). It is not copied to `dist/bin`. Run it with `--binary "$PB_REPO"/objdir/dist/bin/powerbrowser`. UNVERIFIED: this geckodriver build starts a PB session successfully; no PB script runs it. Verify: start that geckodriver with the `--binary` flag above and send a WebDriver-classic `POST /session` with any client.

### 5. WebMCP (development only)

1. On a dev profile set `dom.modelcontext.enabled=true` (and `dom.modelcontext.testing.enabled=true` for `getTools()` / `invokeTool()` on the page side). Both are `mirror: always` static prefs (`$PB_REPO/upstream/modules/libpref/init/StaticPrefList.yaml`, prefs `dom.modelcontext.enabled` and `dom.modelcontext.testing.enabled`), so a `user.js` entry works.
2. Page side (secure context only):

   ILLUSTRATIVE: page-side example of the upstream WebIDL API; not run in PB.

   ```js
   navigator.modelContext.registerTool({
     name: "reverse",
     description: "Reverses a string",
     inputSchema: { type: "object", properties: { text: { type: "string" } } },
     execute: (input, _client) => Promise.resolve(input.text.split("").reverse().join("")),
   });
   ```

3. Chrome side (from the upstream test `$PB_REPO/upstream/dom/modelcontext/tests/browser/browser_modelContext_xpcom.js`). In PB this call would have to live in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, because `Services.` is forbidden elsewhere:

   ILLUSTRATIVE: adapted from the upstream test; not run in PB.

   ```js
   const innerWindowId = browser.browsingContext.currentWindowGlobal.innerWindowId;
   const tools = await Services.modelContext.getToolsForWindow(innerWindowId);
   const result = await Services.modelContext.invokeTool(innerWindowId, "reverse", { text: "hello" });
   ```

### 6. Firefox ML / chatbot

1. Open a stock window: `PowerBrowserAPI.openBrowserWindow` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, or `window.open(url, '_blank')` from the Theia frontend.
2. The chatbot sidebar needs `browser.ml.chat.provider` set to a provider URL (default `""`). Model downloads use `browser.ml.modelHubRootUrl` = `https://model-hub.mozilla.org/`.

## Reference

### WebDriver BiDi launch flags

Source: `$PB_REPO/upstream/remote/components/RemoteAgent.sys.mjs` (its command-line handling), plus `$PB_REPO/upstream/remote/moz.build` (`DIRS`: components, marionette, shared, webdriver-bidi; no cdp).

| Flag / env | Param | Effect |
|---|---|---|
| `--remote-debugging-port [<port>]` | optional port, default 9222 | Starts the Remote Agent (WebDriver BiDi only in this tree). |
| `--remote-allow-hosts <hosts>` | comma list | Allowed `Host` header values. |
| `--remote-allow-origins <origins>` | comma list | Allowed `Origin` header values. |
| `--remote-allow-system-access` | none | Allows `script.evaluate`/`script.callFunction` in parent-process contexts (e.g. `about:support`). Without it: `UnsupportedOperationError` (`$PB_REPO/upstream/remote/webdriver-bidi/modules/root/script.sys.mjs`). |
| env `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS` | presence | Same as the flag above (`$PB_REPO/upstream/remote/components/RemoteAgent.sys.mjs`, `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS`). |

### `$PB_REPO/scripts/lib/firefox-bidi.mjs` exports

| Export | Signature | Returns / notes |
|---|---|---|
| `FIREFOX_BIN` | const | `process.env.PB_FIREFOX_BIN` or `<repo>/objdir/dist/bin/powerbrowser`. |
| `withFirefoxPage` | `(url, callback, { binPath = FIREFOX_BIN, stdoutPath, profileDir } = {})` | Result of `callback`. Headless launch, BiDi session, guaranteed cleanup. `stdoutPath` tees stdout (for `POWERBROWSER_*` dump sentinels). `profileDir` = caller-owned profile kept across launches. |
| `waitFor` | `(evaluate, expression, { timeoutMs = 15000, intervalMs = 100 } = {})` | First truthy value; throws on timeout. |
| `captureScreenshot` | `(url, outputPath, { windowSize = '800,600', timeoutMs = 15000, binPath } = {})` | `outputPath`. Uses `--headless --screenshot`, no BiDi; fires on early `load`, so it captures a blank Theia loading screen. |

Callback argument members:

| Member | Signature | Notes |
|---|---|---|
| `evaluate` | `(expression) => value` | `script.evaluate` with `awaitPromise: true` in the launch-time context; returns `result.result.result.value` (serialised primitives only). |
| `evaluateIn` | `(context, expression) => value` | Same, in a context id from `topLevelContexts()`. Unknown id rejects. |
| `send` | `(method, params) => result` | Raw BiDi command; returns the response `result`. 20 s default timeout. |
| `waitFor` | `(expression, opts)` | Bound to `evaluate`. |
| `screenshot` | `() => Buffer` | `browsingContext.captureScreenshot` of the launch-time context (PNG). |
| `topLevelContexts` | `() => [{ context, url }]` | `browsingContext.getTree`, re-queried each call. |

Consumers (scripts under `$PB_REPO/scripts/` naming it at the stamp commit; list them at your HEAD with `git -C "$PB_REPO" grep -l firefox-bidi HEAD -- scripts`): lib/ng-a-live.mjs, lib/ng-b-live.mjs, lib/pb-relaunch.mjs, verify-branding-identity.mjs, verify-branding.mjs, verify-customize-inert.mjs, verify-dev-flag-off.mjs, verify-first-boot-surface.mjs, verify-gui01-command.mjs, verify-gui01-window.mjs, verify-mode-switch-tabs-live.mjs, verify-ng-017-sql05-restarts-real-browser.mjs, verify-ng-028-saved-page.mjs (a comment about its request timeout), verify-ng-063-packaged-launch.mjs, verify-ng-067-frontend-errors.mjs, verify-ng-069-sidecar-egress.mjs, verify-ng-073-declared-extension-loads.mjs, verify-search-engines-packaged.mjs, verify-sql-store-absence.mjs, verify-uri-roundtrip.mjs, verify-web-tab-live.mjs, plus verify-platform.sh. `lib/pb-live-probe.mjs` reaches it through `lib/pb-relaunch.mjs`.

### Prefs and flags per surface

Built values were read from `$PB_REPO/objdir-release/dist/bin/greprefs.js` and from `browser/defaults/preferences/firefox.js` of the same build output; source defaults are in `$PB_REPO/upstream/modules/libpref/init/all.js` and `$PB_REPO/upstream/browser/app/profile/firefox.js` (prefs `browser.ml.chat.*`, `browser.ml.linkPreview.enabled`, `browser.ml.pageAssist.enabled`).

| Surface | Pref / flag | Built default | Enable for development | Shipping enabled breaks a PB rule? |
|---|---|---|---|---|
| BiDi | `--remote-debugging-port` | not passed | pass the flag | No `$PB_REPO/CLAUDE.md` hard rule names it. It would add an unauthenticated local control port to every user launch; the shipped `.desktop` `Exec=` line of `$PB_REPO/powerbrowser/powerbrowser.desktop` has no such flag. Treat as not allowed in shipped launchers. |
| BiDi | `remote.experimental.enabled` | `false` (non-Nightly) | `true` for experimental BiDi commands | Same as above. |
| BiDi | `remote.log.level` | `"Info"` | `"Trace"` | No. |
| Marionette | `--marionette` / env `MOZ_MARIONETTE` (`$PB_REPO/upstream/remote/components/Marionette.sys.mjs`, constant `ENV_ENABLED`) | off | pass flag or set env | Same exposure as BiDi; not allowed in shipped launchers. |
| Marionette | `marionette.port` | `2828` (`$PB_REPO/upstream/modules/libpref/init/all.js`) | any free port | — |
| DevTools | `devtools.chrome.enabled` | **`true`, sticky** | already on | Already shipped on. Not a `$PB_REPO/CLAUDE.md` hard-rule violation; Firefox official builds ship it false. |
| DevTools | `devtools.debugger.remote-enabled` | **`true`, sticky** | already on | Same. |
| DevTools | `devtools.debugger.prompt-connection` | `true`, sticky | leave on | Turning it off in a shipped build would allow silent chrome debugger connections. |
| DevTools | `devtools.debugger.remote-port` / `force-local` | `6000` / `true` | — | — |
| DevTools | `devtools.policy.disabled` | `false` | — | Enterprise policy `DisableDeveloperTools` is not in `$PB_REPO/powerbrowser/distribution/policies.json` (keys: `AppUpdateURL`, `DisableTelemetry`, `DisableFirefoxStudies`, `ExtensionSettings`, `SearchEngines`). |
| geckodriver | build flag `MOZ_GECKODRIVER=1` | built, not packaged | run from objdir path | Packaging it is a packaging change only; no rule names it. |
| WebMCP | `dom.modelcontext.enabled` | `false` (`StaticPrefList.yaml`) | `true` | Exposes a new web API to every site. UNVERIFIED: agent/AI integration is out of scope, see [Rules and constraints](#rules-and-constraints). Do not ship enabled. |
| WebMCP | `dom.modelcontext.testing.enabled` | `false` (`StaticPrefList.yaml`) | `true` | Test-only API; never ship. |
| ML | `browser.ml.enable` | `true` | — | Already on. Any model download contacts `model-hub.mozilla.org`, which is not in `$PB_REPO/powerbrowser/endpoint-allowlist.json`, so `verify-endpoints.sh` layer 3 would fail if a download happens during the check. |
| ML | `extensions.ml.enabled` | `true` | — | trialML WebExtension API. Same egress caveat. |
| ML | `browser.ml.chat.enabled` / `.sidebar` / `.provider` | `true` / `true` / `""` | set `.provider` | Setting a provider in shipped prefs adds an egress host (needs an allowlist row) and is AI-assistant integration (UNVERIFIED: out of scope, see [Rules and constraints](#rules-and-constraints)). |
| ML | `browser.ml.linkPreview.enabled` / `browser.ml.pageAssist.enabled` | `true` / `false` | — | — |
| ML | `browser.ai.control.*` (`default`="available", `translations`, `pdfjsAltText`, `smartTabGroups`, `linkPreviewKeyPoints`, `sidebarChatbot`, `smartWindow` = "default") | as listed (`all.js`, prefs `browser.ai.control.*`) | — | — |

### WebMCP API

Source: `$PB_REPO/upstream/dom/webidl/ModelContext.webidl` and `$PB_REPO/upstream/dom/webidl/Navigator.webidl` (the `modelContext` attribute).

| Member | Signature | Gating |
|---|---|---|
| `navigator.modelContext` | `readonly attribute ModelContext` `[SameObject]` | `[SecureContext]`, `dom.modelcontext.enabled` |
| `ModelContext.registerTool` | `undefined registerTool(ModelContextTool tool)` throws | `dom.modelcontext.enabled` |
| `ModelContext.unregisterTool` | `undefined unregisterTool(DOMString toolName)` throws | `dom.modelcontext.enabled` |
| `ModelContext.getTools` | `sequence<ModelContextTool> getTools()` | `dom.modelcontext.testing.enabled` |
| `ModelContext.invokeTool` | `Promise<any> invokeTool(DOMString toolName, optional any input, optional InvokeToolOptions options = {})` | `dom.modelcontext.testing.enabled` |
| `ModelContextClient.requestUserInteraction` | `Promise<any> requestUserInteraction(UserInteractionCallback callback)` | `dom.modelcontext.enabled`. Rejects with `NotSupportedError` ("not yet supported") unless `dom.modelcontext.testing.enabled` is true, in which case it just calls the callback (`ModelContextClient.cpp` under `$PB_REPO/upstream/dom/modelcontext/`, `requestUserInteraction`). |

Dictionaries: `ModelContextTool { required DOMString name; required DOMString description; object inputSchema; required ToolExecuteCallback execute; ToolAnnotations annotations; }`, `ModelContextToolDefinition { required DOMString name; required DOMString description; object? inputSchema; ToolAnnotations annotations; }` (`[GenerateConversionToJS]`, the shape `getToolsForWindow` returns), `ToolAnnotations { boolean readOnlyHint; }`, `InvokeToolOptions { AbortSignal signal; }`. Callback: `ToolExecuteCallback = Promise<any> (object input, ModelContextClient client)`.

Chrome side, `nsIModelContextService` (`$PB_REPO/upstream/dom/modelcontext/nsIModelContextService.idl`), contract `@mozilla.org/dom/model-context-service;1`, `Services.modelContext` (`$PB_REPO/upstream/dom/modelcontext/components.conf`, `js_name`):

| Method | Params | Returns | Notes |
|---|---|---|---|
| `getToolsForWindow` | `unsigned long long innerWindowId` | `Promise` of tool definitions (`name`, `description`, `inputSchema`, `annotations`) | Rejects if the pref is false; `NotFoundError` for unknown window. |
| `invokeTool` | `innerWindowId`, `ACString toolName`, optional `jsval input` | `Promise` of the page's return value (structured clone) | Rejects if the pref is false. Value is content-supplied and untrusted (IDL comment). `NotFoundError` for unknown tool. |

### `PowerBrowserSingleInstanceHandler`

Source: `PowerBrowserSingleInstanceHandler` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (with `findShellWindow`, `focusWindow`, `openShellWindow` and `isInitialLaunch` on `PowerBrowserAPI`), registered by `$PB_REPO/powerbrowser/shell/components.conf`.

| Field | Value |
|---|---|
| CID | `{7539c85c-f1f6-43a3-9a45-48fd27140596}` |
| Contract | `@powerbrowser.org/single-instance-clh;1` |
| Category entry | `command-line-handler` / `a-powerbrowser` (sorts before stock `m-browser` and `x-default`) |
| `helpInfo` | `""` |
| `handle(cmdLine)` | Shell window exists → `focusWindow(win)`, `preventDefault = true`, return (all arguments ignored). Else if not `STATE_INITIAL_LAUNCH` → do nothing. Else `openShellWindow()`, `preventDefault = true`. Errors are logged, never thrown. |

## Rules and constraints

From `$PB_REPO/CLAUDE.md` and the files it binds:

1. **Never modify Gecko outside the patch stack** (hard rule 2). Enabling any surface must be done with prefs, launch flags, or a regenerated patch in `$PB_REPO/patches/`, never by editing `$PB_REPO/upstream/`. `git -C "$PB_REPO/upstream" diff` must stay empty.
2. **One boundary file.** Any chrome code calling `Services.modelContext`, `Services.prefs`, or `Ci.*` goes in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` and is catalogued in `$PB_REPO/powerbrowser/INTERNAL-APIS.md`; under its `Append-only rule`, new boundary code goes in an end-of-file section of that file and each new touchpoint is an appended row. `$PB_REPO/scripts/check-internals-boundary.sh` fails on `Services.`/`Ci.` elsewhere (`FORBIDDEN_PATTERNS`).
3. **Never fork or patch Theia core** (hard rule 1). A Theia-side consumer of any of these surfaces is an `@powerbrowser/*` extension.
4. **Shipped prefs are generated.** `$PB_REPO/powerbrowser/branding/<variant>/pref/firefox-branding.js` (variants `dev` and `release`) is emitted by `emitFirefoxBrandingJs` in `$PB_REPO/scripts/generate.mjs` (its `firefox-branding.js` rows in `TARGETS`) and compared with the tracked copy. The pref lines themselves are hard-coded in `FIREFOX_BRANDING_BASE_LINES` (both variants) and `FIREFOX_BRANDING_DEV_TAIL_LINES` (dev only) in `$PB_REPO/scripts/generate.mjs`; a new shipped pref is added there, then the tracked files regenerated.
5. **Egress allowlist.** Every host the running build contacts must be an `allow` row in `$PB_REPO/powerbrowser/endpoint-allowlist.json`; `verify-endpoints.sh` fails otherwise. Loopback is allowed only as the literal `127.0.0.1`. Use `--remote-allow-hosts 127.0.0.1`, not `localhost`.
6. **Out of scope.** PB's planning files list "DSH (DeepSeek Harness) and any AI assistant integration" and "Customising Theia's AI framework" (RM-02) as Out of Scope, which blocks shipping WebMCP or the ML chatbot as product features. At the stamped PB commit they sit in `$PB_REPO/.planning/PROJECT.md`, section "Out of Scope". UNVERIFIED: this scope decision rests only on PB planning files, which can lag. Verify: read `$PB_REPO/.planning/PROJECT.md` section "Out of Scope" at your PB HEAD and ask the user before shipping either surface.
7. **Verification.** A new live check is one row in `$PB_REPO/scripts/verify-platform.sh`, reuses `firefox-bidi.mjs` (or `pb-live-probe.mjs` for chrome key input), never asserts on absence of a log line it also emits, and derives expectations from the tree.
8. **No internal identifiers in user-facing text** (pref keys, ports, sentinel names). Applies to any UI that tells a user how to enable these surfaces.

## Gotchas

1. **DevTools prefs are on in PB builds.** `$PB_REPO/upstream/modules/libpref/init/all.js` (prefs `devtools.chrome.enabled` and `devtools.debugger.remote-enabled`) sets both to `false` only `#ifdef MOZILLA_OFFICIAL`. Neither `$PB_REPO/objdir/config.status` nor `$PB_REPO/objdir-release/config.status` defines `MOZILLA_OFFICIAL`, and the built `$PB_REPO/objdir-release/dist/bin/greprefs.js` (prefs `devtools.chrome.enabled`, `devtools.debugger.remote-enabled`) has both `true`. The earlier survey said "false on release/ESR"; that is wrong for PB.
2. **A URL argument opens a second, stock window.** The handler sets `preventDefault`, but upstream `nsDefaultCommandLineHandler` only checks it on its no-URI branch (the comment above the `spawn` call in `withFirefoxPage` in `$PB_REPO/scripts/lib/firefox-bidi.mjs` says the same). Pass `''` to `withFirefoxPage` when you want the shell alone.
3. **BiDi cannot see the chrome document.** `browsingContext.getTree` contains only content `<browser>` elements. The shell supports this by exposing a `window.gBrowser` stand-in (the `window.gBrowser = {` object in `$PB_REPO/powerbrowser/shell/powerbrowser.js`) with `tabs: [{ linkedBrowser }]`, `getTabForBrowser()` (returns null), `getBrowserForTab(tab)`, a no-op `setIcon()`, and a `permanentKey` on the browser element (`PowerBrowserAPI.createPermanentKey`). The comment above it says five more members upstream calls (`getNotificationBox`, `getTabDialogBox`, `refreshBlocked`, `removeTab`, `setTabLabelForAuthPrompts`) are deliberately absent, with `refreshBlocked` a known gap. The stand-in may be defined only in `powerbrowser.js`: `gBrowser` and the browser.xhtml globals `PopupNotifications`, `nsContextMenu`, `browserDOMWindow`, `openLinkIn`, `FullScreen` and `XULBrowserWindow` are in `FORBIDDEN_PATTERNS` of `$PB_REPO/scripts/check-internals-boundary.sh`. To observe chrome state, PB checks read `dump()` sentinels (`POWERBROWSER_DECK_STATE`, `POWERBROWSER_SHELL_READY`) via `stdoutPath`.
4. **Chrome-context Marionette.** The comment above `dumpDeckState` in `$PB_REPO/powerbrowser/shell/powerbrowser.js` says "chrome-context Marionette is platform-blocked (WINDOWS.md #7)", and several entries of `$PB_REPO/.planning/WINDOWS.md` say chrome-context Marionette is "platform-blocked on Linux (ledger item 7)". UNVERIFIED: the cause; WINDOWS.md row 7 itself is about unrun checks, not Marionette, so the cited source does not state why. Verify: read row 7 of `$PB_REPO/.planning/WINDOWS.md`, then launch PB with `--marionette` and request a chrome-context session from a WebDriver-classic client.
5. **`evaluate` returns only serialised primitives.** It returns `result.result.result.value`; objects come back as BiDi remote values without `.value`. Return `JSON.stringify(...)` from the expression and parse it.
6. **Parent-process contexts need `--remote-allow-system-access`.** Without it, evaluating in `about:` pages that run in the parent process throws `UnsupportedOperationError`.
7. **`captureScreenshot` (the export) captures the Theia loading screen.** Use the callback's `screenshot()` after `waitFor('#theia-app-shell' ...)`.
8. **WebMCP `invokeTool` results are untrusted page data.** Validate them in chrome before use, as with any actor message.
9. **No URL handoff to a running instance.** A second launch with a URL focuses the shell and drops the URL.
10. **ML downloads are not on the allowlist.** `model-hub.mozilla.org` is absent from `$PB_REPO/powerbrowser/endpoint-allowlist.json`. UNVERIFIED: whether any ML feature downloads a model during a default PB session; not run. Verify: run the `verify-endpoints.sh` egress capture (layer 3) of `$PB_REPO/scripts/verify-endpoints.sh` on a default profile and look for `model-hub.mozilla.org`.
11. **BiDi key input does not reach chrome keys.** `input.performActions` on a content context synthesises the key inside the content process, so the page-scoped `<key>` rows (`PAGE_KEYS` in `$PB_REPO/powerbrowser/shell/powerbrowser.js`) never fire. Use `pressKey` in `$PB_REPO/scripts/lib/pb-live-probe.mjs`, which synthesises at the parent through `nsITextInputProcessor`.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
