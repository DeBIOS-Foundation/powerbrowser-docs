# Add a telemetry event

> Verified against PB 0f27a5c on 2026-10-25. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-logger.ts`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-error-report.ts`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-preferences.ts`
- `$PB_REPO/theia/extensions/telemetry/test/telemetry-sender.test.mjs`

PB core edits: 1

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

## Goal

A new usage event goes through the logger's usage method and leaves the sender only at level `all`, carrying no user content.

## Before you start

- Stop and ask first. An event at level `all` leaves the app once a downstream sets an endpoint. Changing the level or the endpoint is a preference decision, and a new host needs an allowlist row. The question lists each data key the event carries.
- No ladder row names an edit to an existing extension. Name the rung in the question; the nearest is rung 3.
- [Telemetry APIs](../subsystems/telemetry-and-crash.md#apis-by-layer) and [telemetry limits](../subsystems/telemetry-and-crash.md#limits-and-rules).

## Confirm before coding

- `grep -n 'logUsage' "$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-logger.ts"`
- `grep -n 'levelAllowsEvent' "$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts"`
- `grep -n 'sendEventData' "$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts"`
- `grep -n 'TELEMETRY_LEVELS' "$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts"`

## Steps

1. **PB core edit** In the frontend class that owns the event, inject the logger `PowerBrowserTelemetryLogger` from `telemetry-logger.ts` and call its `logUsage` method once, where the event happens, with a fixed dotted event name. Pass data only for keys named in the question; each value is a scalar, and no key carries a URL, title, path or message. Do not change the sender: `levelAllowsEvent` and `sendEventData` are the admission gate, and a sender change is outside this recipe.

## Verify

- `node "$PB_REPO"/theia/extensions/telemetry/test/telemetry-sender.test.mjs` exits 0 (plain node, no build).
- `"$PB_REPO"/scripts/verify-platform.sh --only telemetry` prints `telemetry: PASS`.
- `"$PB_REPO"/scripts/verify-platform.sh --only telemetry-self-test` prints `telemetry-self-test: PASS`.
- Manual: the review lists each data key, and no key can hold a URL, title, path or message.

UNVERIFIED: no sanitiser runs on usage data. The rule that usage data carries no URL, title, path or message is a convention. The error path has an enforced sanitiser (`typeOf` and `baseName` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-error-report.ts`). Verify: read `logUsage` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-logger.ts` at PB HEAD before choosing the data fields.

## Done when

- The suite exits 0 and both rows print PASS.
- At level `off` the event is not sent, because `levelAllowsEvent` returns false for `off`.

## Rollback

- Step 1: remove the injection and the `logUsage` call. Nothing else changed.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
