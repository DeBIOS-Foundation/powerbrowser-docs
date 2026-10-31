# Shell window and sidecar supervisor

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`
- `$PB_REPO/powerbrowser/shell/powerbrowser-sidecar.js`
- `$PB_REPO/powerbrowser/shell/powerbrowser.js`
- `$PB_REPO/powerbrowser/shell/powerbrowser.xhtml`
- `$PB_REPO/powerbrowser/shell/jar.mn`
- `$PB_REPO/powerbrowser/shell/moz.build`
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/scripts/verify-shell-gbrowser-standin.mjs`

Not read:
- NOT COVERED: `$PB_REPO/upstream/` and `$PB_REPO/patches/`
- NOT COVERED: the Theia backend JavaScript internals (token gate, parent watchdog)
- NOT COVERED: full-tier runtime proof (no live build was run)

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

- The shell window is the whole application window: one branded loading layer, one remote content browser (the Theia frame), and any number of overlay browsers. `webTabOpen` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` appends each overlay to the same shell document (`doc.body.appendChild`), beside the Theia frame. There is no visible tab strip, toolbar, address bar or menu of PB's own outside Theia.
- `powerbrowser.xhtml` in `$PB_REPO/powerbrowser/shell/powerbrowser.xhtml` is the deck: `#powerbrowser-loading`, `#powerbrowser-error` with `#powerbrowser-error-message` plus Retry and Details controls, `#powerbrowser-diagnostics` with fields plus log plus Close, and one `xul:browser` named `#powerbrowser-content` starting at `about:blank`.
- `powerbrowser.js` in `$PB_REPO/powerbrowser/shell/powerbrowser.js` is the chrome bootstrap. It writes the ready sentinel first, installs the tab host with `PowerBrowserTabHost.install` (`$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`), builds the `window.gBrowser` stand-in, exposes window globals for swap, error and diagnostics, then hands off to the supervisor. The stand-in delegates `tabs`, `selectedTab`, `getTabForBrowser` and the other members to that host. `tabs` lists only overlays; `webDriverTabs` adds the Theia frame. `addTab`, `removeTab` and a switch to another tab are refused.
- `TheiaService` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` supervises the Theia backend sidecar for the life of the browser session: resolve the sidecar, spawn it, wait for the ready sentinel and a passing health probe, set the token cookie, then swap the browser element onto the backend URL.
- The supervisor is a consumer of the PowerBrowserAPI boundary, not a second one: it imports nothing else. All Firefox internals go through `PowerBrowserAPI` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`.
- All supervisor state is per-launch and in memory. The one exception is the sidecar state file, which exists only so the next startup can reap a leftover backend after a crash.

## Where its data lives

- In-memory supervisor fields (`_token`, `_port`, `_pid`, `_proc`, `_swapped`, `_healthy`, `_restartCount`, `_errorShown`, `_failureDetails`, `_log`) in `TheiaService` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`. Writer: `TheiaService` itself, per launch. Nothing persists them.
- This subsystem paints no product naming of its own.
- Config directory backing the Theia config dir. Writer: `_resolveConfigDir` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` (OS config base plus `/powerbrowser`). The state-file name suffix comes from `_profileStateKey` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` through `getProfileDir` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`.
- Log ring `_log`, capped by the `logBufferLines` pref, token-redacted on write. Writer: `_pushLog` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`. Readers: `getRecentLog` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` and the diagnostics layer; a second unredacted mirror goes to the browser stdout through `PowerBrowserAPI` log calls.
- Failure rows `_failureDetails`. Writer: `_showError` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`. Reader: `getFailureDetails` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`, read by both the diagnostics sentinel and the diagnostics layer.
- Session cookie for the per-launch token. Writer: `setSessionCookie` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`. Installed as the token-cookie strip by `setGroupSenderPort` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` at swap time.
- Tab-store rows and session sweep state live chrome-side only. Writers: `ensureTabStore` and `startTabStoreTriggers` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`. Read the row model in [the tabs reference](../09-tabs-reference.md#the-tab-model) instead of restating it here.

## Access matrix

| Layer | Read | Write | API |
| --- | --- | --- | --- |
| Chrome bootstrap | Prefs through `getStringPref` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`; supervisor state through `getState` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`; identity through `getAppIdentity` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` | Navigate through `loadURIInBrowser` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`; paint error and diagnostics layers | `powerbrowserSwapToUrl` in `$PB_REPO/powerbrowser/shell/powerbrowser.js`, `powerbrowserShowError` in `$PB_REPO/powerbrowser/shell/powerbrowser.js`, `powerbrowserShowDiagnostics` in `$PB_REPO/powerbrowser/shell/powerbrowser.js` |
| Supervisor | Prefs through `getStringPref` and `getIntPref` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`; user-value check through `prefHasUserValue` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` | Spawn through `spawnProcess` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`; token over the stdin pipe through `writeStdinLine` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`; cookie through `setSessionCookie` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` | `start` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`, `stop` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`, `retry` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` |
| Backend process | Its own launch environment (supervised flag, config dir, plugins dir) | Announces readiness on stdout; serves the health route | The health probe in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` polls through `probeHealth` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` |
| Theia frontend (after swap) | Token cookie on requests | Sends bridge kinds; reports activation pushes | The `PowerBrowserGroup` actor registered by `registerGroupActor` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`; sender wall pinned by `setGroupSenderPort` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (see [the bridge doc](../02-powerbrowser-api-bridge.md#what-it-is)) |
| Quit path | Flush window through `runQuitFlushSync` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` | Kill backend within the grace period; remove state file | `quitApplication` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (the entry point; a veto returns `false`); `stop` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` on the granted observer wired by `onQuitGranted` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` |

## APIs by layer

- `start` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`: one-shot launch. Mints the token, resolves the sidecar, reaps a leftover, wires the tab store and the group actor, then enters the bounded restart loop. Guarded against re-entry by `_started`.
- `_resolveSidecar` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`: prefers the staged entry and node beside the binary unless a user value is set (`prefHasUserValue` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`), else the pref (`getStringPref` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`), else the path search in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` on `PATH`. Unresolvable entry or node is unrecoverable by construction.
- This subsystem paints no product naming of its own.
- One spawn attempt: `_spawnAndGate` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` runs one attempt. Port `0` before the first swap, else the pinned port. It parses the backend readiness line from stdout, races the startup timeout, then health-gates before the one-time cookie plus swap.
- `_restart` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`: every later spawn goes through here, first launch included. Total-attempts plus wall-clock budget; unrecoverable results give up immediately; recoverable results back off exponentially.
- `_healthLoop` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`: steady-state supervision. Probes every steady interval; two consecutive failures trigger `_restart` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`.
- `retry` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`: the Retry control path. Refuses when the on-screen failure is unrecoverable; otherwise clears the error and re-enters `_restart` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`.
- `reportUnexpectedFailure` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`: the backstop for escaped rejections. Paints the generic sentence and records the rejection text as diagnostics rows.
- `quitApplication` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`: the one quit entry point. It notifies `quit-application-requested`; an observer that sets the cancel flag makes it return `false` with no quit. Otherwise it sets the default branch of `toolkit.shutdown.fastShutdownStage` to `0` and calls `Services.startup.quit` with `eAttemptQuit`. When a window's CanClose vetoes the quit (`attemptingQuit` stays false), it restores the previous stage default and returns `false`. Returns `true` when the quit is attempted.
- `stop` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`: granted-path quit. Runs the frontend flush first, stops the loops, kills the backend within the grace period, detaches the store triggers, removes the state file.
- `_swap` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`: pins the sender wall (`setGroupSenderPort` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`), navigates once through `powerbrowserSwapToUrl` in `$PB_REPO/powerbrowser/shell/powerbrowser.js`, then marks `_swapped`.
- `_pushLog` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`: token-redacting ring write. `getState` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`, `getRecentLog` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` and `getFailureDetails` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` are the read sites the bootstrap renders.
- `registerGroupActor` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` and `setGroupSenderPort` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`: actor registration and sender-wall pinning. Both are called from the supervisor path only, and nowhere else in this subsystem.
- The sidecar state file has one writer and one reader path in this subsystem: the writer is `_spawnAndGate` through `writeStateFile` and the only reader is `_reapLeftover` through `readStateFile`, both in the files named above.

## Events and change signals

| Signal | Writer | Meaning |
| --- | --- | --- |
| Ready row | `powerbrowser.js` bootstrap in `$PB_REPO/powerbrowser/shell/powerbrowser.js` | Chrome painted, before any backend work |
| Backend readiness line | Sidecar stdout, parsed by the output pump in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` | Backend ready with its port and pid; never dumped by the bootstrap |
| Swap row | `powerbrowserSwapToUrl` in `$PB_REPO/powerbrowser/shell/powerbrowser.js` | Navigated to the backend URL; loading layer hidden |
| Error row | `powerbrowserShowError` in `$PB_REPO/powerbrowser/shell/powerbrowser.js` | Error painted; the reason is always a `USER_MESSAGE` value and `recoverable` decides Retry |
| Error-diagnostics row | Same site, rows from `getFailureDetails` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` | Identifiers the sentence drops, as `[label, value]` rows |
| Error-cleared row | `powerbrowserHideError` in `$PB_REPO/powerbrowser/shell/powerbrowser.js` | Error cleared |
| Diagnostics row | `powerbrowserShowDiagnostics` in `$PB_REPO/powerbrowser/shell/powerbrowser.js` | Snapshot of port, pid, health, restart count, identity and log length; snapshot-on-open only |
| Deck state row | `dumpDeckState` in `$PB_REPO/powerbrowser/shell/powerbrowser.js` | Resolved deck visibility at swap and at error |
| Sidecar prefs row | Bootstrap proof-of-resolution in `$PB_REPO/powerbrowser/shell/powerbrowser.js` | Resolved entry path and node path, read back from prefs |
| App identity row | Bootstrap through `getAppIdentity` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` | Product name, vendor and version for the diagnostics layer |

- Error flow: `_showError` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` calls `powerbrowserShowError` in `$PB_REPO/powerbrowser/shell/powerbrowser.js`; clearing flows through `_hideError` into `powerbrowserHideError` in `$PB_REPO/powerbrowser/shell/powerbrowser.js`. Repeated calls for the same state paint once.
- Recovery flow: `_recoveryProbeLoop` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` re-enters `_restart` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` on the probe interval while the error state stands; a recovered backend auto-dismisses the layer.
- Quit flow: every quit request enters `quitApplication` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`. Its callers are the Ctrl+Q key `powerbrowser-quit-key`, the window close control `powerbrowser-window-close` and `window.onclose`, all in `$PB_REPO/powerbrowser/shell/powerbrowser.js`, and the `quitRequest` store kind in `handleStoreRequest` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`. A veto ends the flow there, with no backend stop. Once the quit is granted, the granted observer calls `stop` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`; the flush runs first through `runQuitFlushSync` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`.

## Commands, settings and ids

- The `backendMain` sidecar setting: backend entry path. Default is the development-tree main entry; a staged copy beside the binary wins unless a user value is set.
- The `nodePath` sidecar setting: node executable. Default empty (resolve `node` on `PATH`); a staged copy beside the binary wins unless a user value is set.
- The `healthIntervalStartupMs` sidecar setting: 250. Startup health poll interval.
- The `healthIntervalSteadyMs` sidecar setting: 5000. Steady health poll interval.
- The `startupTimeoutMs` sidecar setting: 90000. Bound for one spawn attempt's readiness plus health gate.
- The `healthTimeoutMs` sidecar setting: 4000. Bound for one probe.
- The `killGraceMs` sidecar setting: 3000. Bound for the backend kill at `stop` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`.
- The `logBufferLines` sidecar setting: 500. Log ring capacity.
- The `giveUpAttempts` sidecar setting: 6. Total spawn attempts per `_restart` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` call, first attempt included.
- The `giveUpWallclockMs` sidecar setting: 45000. Wall-clock give-up budget; whichever budget trips first ends the loop.
- The `recoveryProbeIntervalMs` sidecar setting: 15000. Background recovery probe interval while the error state stands.
- The `browser.dom.window.dump.enabled` setting: true. Lets the `dump` sentinel channel reach stdout.
- The diagnostics key in the bootstrap: the reserved chord that toggles the diagnostics layer.

## Limits and rules

- Give-up budget is attempts-or-wall-clock, whichever trips first: `giveUpAttempts` and `giveUpWallclockMs` in `$PB_REPO/powerbrowser/shell/powerbrowser-sidecar.js`, enforced by `_restart` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`.
- Backoff between recoverable attempts doubles from `RESTART_BACKOFF_INITIAL_MS` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` to `RESTART_BACKOFF_CAP_MS` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`.
- Unrecoverable classes give up immediately with no retry: missing entry or node at resolve time, `spawnProcess` throwing, and the pinned-port conflict. Enforced by `_spawnAndGate` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` returning `recoverable: false` and `_restart` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` not waiting.
- Steady health needs two consecutive failures before a restart: `CONSECUTIVE_FAILURES_THRESHOLD` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`, enforced by `_healthLoop` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`.
- Port pinning: before the first swap every attempt requests port `0`; after a completed swap every attempt reuses the pinned port. Enforced by `_spawnAndGate` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` keyed on `_swapped`.
- One spawn at a time: `_restartInFlight` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` is shared by `_restart`, `retry` and `_recoveryProbeLoop` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`.
- The token never travels in the environment. It is written over the stdin pipe through `writeStdinLine` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` and returns as the session cookie. Enforced by the token-not-in-environment row in `$PB_REPO/scripts/verify-platform.sh` (`side04-token-not-in-environment`).
- One boundary file only: TheiaService imports nothing except the API object through `PowerBrowserAPI` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`. Enforced by the boundary row in `$PB_REPO/scripts/verify-platform.sh` (`internals-boundary`).
- The quit flush default lives in code: the `quitFlushTimeoutMs` setting has no default row in `$PB_REPO/powerbrowser/shell/powerbrowser-sidecar.js`; the `3000` default is inline in `stop` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`.
- User-facing sentences never carry identifiers: `USER_MESSAGE` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` holds the only paintable strings. Enforced by the copy row in `$PB_REPO/scripts/verify-platform.sh` (`shell-error-copy-no-internals`).

## Verification

- `shell-csp-inline-attrs` in `$PB_REPO/scripts/verify-platform.sh` (quick): the shipped deck keeps no inline state the content policy drops.
- `shell-gbrowser-standin` in `$PB_REPO/scripts/verify-platform.sh` (quick): the `window.gBrowser` stand-in members equal the set that upstream actor and extension callers need, derived by `$PB_REPO/scripts/verify-shell-gbrowser-standin.mjs`.
- `shell-gbrowser-standin-self-test` in `$PB_REPO/scripts/verify-platform.sh` (quick): the stand-in gate goes red on a planted member change.
- `shell04-log-redacts-token` in `$PB_REPO/scripts/verify-platform.sh` (quick): the log ring redacts the per-launch token.
- `shell-error-copy-no-internals` in `$PB_REPO/scripts/verify-platform.sh` (quick): painted sentences carry no internal identifiers.
- `shell-error-copy-no-internals-self-test` in `$PB_REPO/scripts/verify-platform.sh` (quick): the copy gate goes red on a planted leak.
- `start-path-recovery` in `$PB_REPO/scripts/verify-platform.sh` (quick): the start path recovers through the terminal handler shape.
- `start-path-recovery-self-test` in `$PB_REPO/scripts/verify-platform.sh` (quick): the recovery gate goes red on a planted break.
- `shell-error-contract` in `$PB_REPO/scripts/verify-platform.sh` (quick): the error contract shape holds statically.
- `shell-error-contract-self-test` in `$PB_REPO/scripts/verify-platform.sh` (quick): the contract gate goes red on a planted break.
- `side04-token-not-in-environment` in `$PB_REPO/scripts/verify-platform.sh` (full): the backend environment carries no token after a supervised launch.
- `shell01-theia-is-the-window` in `$PB_REPO/scripts/verify-platform.sh` (full): the shell window hosts Theia with no custom chrome.
- `shell05-paint-before-backend` in `$PB_REPO/scripts/verify-platform.sh` (full): the shell paints before backend work starts.
- `side01-bind-scope` in `$PB_REPO/scripts/verify-platform.sh` (full): the backend binds loopback only.
- `side02-token-negative` in `$PB_REPO/scripts/verify-platform.sh` (full): requests without a token are refused.
- `side02-token-positive` in `$PB_REPO/scripts/verify-platform.sh` (full): requests with the token succeed.
- `side02-index-gated` in `$PB_REPO/scripts/verify-platform.sh` (full): the index route stays gated.
- `side03-kill-and-recover` in `$PB_REPO/scripts/verify-platform.sh` (full): killing the backend recovers on the pinned port.
- `side04-sigkill-no-orphan` in `$PB_REPO/scripts/verify-platform.sh` (full): killing the browser leaves no orphan backend.
- `side04-unsupervised-backend-survives` in `$PB_REPO/scripts/verify-platform.sh` (full): an unsupervised backend survives on its own.
- `side04-leftover-reaped` in `$PB_REPO/scripts/verify-platform.sh` (full): a verified leftover from a crashed launch is reaped.
- `side04-stale-identity-not-signalled` in `$PB_REPO/scripts/verify-platform.sh` (full): a stale identity is never signalled.
- `shell03-unrecoverable-immediate-error` in `$PB_REPO/scripts/verify-platform.sh` (full): unrecoverable failures error immediately with no spawn.
- `shell03-budget-exhausted-error` in `$PB_REPO/scripts/verify-platform.sh` (full): exhausted budgets paint the recoverable error with the attempt count.
- `shell03-auto-dismiss-on-selfheal` in `$PB_REPO/scripts/verify-platform.sh` (full): a self-healed backend auto-dismisses the error.
- `shell04-diagnostics-with-backend-down` in `$PB_REPO/scripts/verify-platform.sh` (full): diagnostics render with no backend.
- `health-gate-recovery-swaps` in `$PB_REPO/scripts/verify-platform.sh` (full): a health-gate failure recovers to a swap.
- `start-failure-shows-error` in `$PB_REPO/scripts/verify-platform.sh` (full): a start-path throw still shows the error state.
- `shell-diagnostics-rows-populated` in `$PB_REPO/scripts/verify-platform.sh` (full): each failure path announces its own diagnostics rows.
- `side05-second-launch-focuses` in `$PB_REPO/scripts/verify-platform.sh` (full): a second launch focuses instead of forking.
- `side05-no-second-backend` in `$PB_REPO/scripts/verify-platform.sh` (full): a second launch starts no second backend.
- `cr01-different-profile-backend-survives` in `$PB_REPO/scripts/verify-platform.sh` (full): a second profile leaves the first backend alive.

## PB docs and deltas

- `$PB_REPO/docs/BUILD.md` section "Endpoints and the one carve-out": agrees, the allowlist governs browser and sidecar egress.
- `$PB_REPO/docs/BUILD.md` section "Theia half": agrees, the supervisor takes over both watch and start permanently on spawn.
- `$PB_REPO/docs/BUILD.md` section "Linux package (NG-063, NG-072)": agrees, a packaged install carries its own Theia and node beside the binary unless a user value is set.
- `$PB_REPO/docs/BUILD.md` has no TheiaService section and no shell-startup reference; this doc is the startup reference.
- `$PB_REPO/docs/CUSTOMIZE.md` covers the CSS and JS layers only; it states no shell fact this doc depends on.

## Gaps

- GAP: no supervisor settings UI exists in PB. Checked: `powerbrowser.js` in `$PB_REPO/powerbrowser/shell/powerbrowser.js` and `powerbrowser.xhtml` in `$PB_REPO/powerbrowser/shell/powerbrowser.xhtml` expose only Retry, Details and the diagnostics chord.
- GAP: no second reader of the sidecar state file exists in PB. Checked: `readStateFile` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` is called only by `_reapLeftover` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`.

## Unsettled items

- UNVERIFIED: the diagnostics key chord works on every platform build. Verify: open a PB build, press the chord, and read the diagnostics sentinel line.
- UNVERIFIED: the quit flush bound is honoured on a hung frontend. Verify: read `runQuitFlushSync` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` and run the quit path in a PB build with a hung page.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
