# Telemetry and crash pipeline

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-logger.ts`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-preferences.ts`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-error-capture.ts`
- `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-error-report.ts`
- `$PB_REPO/theia/extensions/telemetry/test/telemetry-sender.test.mjs`
- `$PB_REPO/theia/extensions/telemetry/package.json`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/configuration.toml`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/scripts/crash-collector.mjs`
- `$PB_REPO/docs/CRASH-POLICY.md`
- `$PB_REPO/docs/RELEASING.md`
- `$PB_REPO/scripts/verify-telemetry.mjs`
- `$PB_REPO/scripts/verify-crash-collector.mjs`
- `$PB_REPO/scripts/verify-ng-067-frontend-errors.mjs`
- `$PB_REPO/scripts/verify-ng-068-crash-extra-part.mjs`
- `$PB_REPO/scripts/verify-platform.sh`

Not read:
- NOT COVERED: `$PB_REPO/upstream/` (the Gecko telemetry and crash-reporter code compiled out of this build)
- NOT COVERED: `$PB_REPO/theia/node_modules/` (the Theia telemetry packages this extension composes with)
- NOT COVERED: `$PB_REPO/generated/` (generator output, gitignored)
- NOT COVERED: live loopback POST traffic from a running sidecar
- NOT COVERED: the events-origin Cloudflare Worker that receives frontend error reports in production

Status: partly working

The pipeline is implemented and gated, but no telemetry endpoint is configured at PB 5571d3d (`$PB_REPO/configuration.toml` leaves `endpoint` unset and the tracked `powerbrowserTelemetry` endpoint is `null`), and a live POST from a running sidecar has not been run (see Unsettled items).

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

- Telemetry in PowerBrowser is a Theia-side pipeline. A level preference gates what may leave, a batching sender POSTs events as JSON, and uncaught frontend errors are translated into sanitised payloads that ride the same sender.
- The shipped posture is off. `level` in `$PB_REPO/configuration.toml` is `off`, and `endpoint` is deliberately unset there. The frontend module falls back to level `off` with no endpoint, and the sender drops events when no endpoint is set. Nothing leaves the application until a downstream sets a level and its own endpoint.
- Pings and reports travel different paths and never mix. Error events ride the telemetry sender to the telemetry endpoint. Minidumps are submitted as multipart POSTs to the crash collector.
- The crash collector, `startCollector` in `$PB_REPO/scripts/crash-collector.mjs`, is downstream operations tooling. It binds loopback only, and it speaks the Antenna submit contract while the native crash reporter stays compiled out.
- What this doc does not own: native Gecko telemetry or crash reporting (compiled out, not configured here), and the downstream release endpoint or worker that receives events in production.

## Where its data lives

- In-memory batch queue in the sender: queued events, one in-flight batch and retry timers. Written by `PowerBrowserTelemetrySender` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`. The queue is capped, and events past the cap are dropped.
- Telemetry endpoint: the downstream's own https URL, unset in this tree. The frontend module reads it once, at construction, from the `powerbrowserTelemetry` block through `readTelemetryConfig` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts`.
- Level preference `telemetry.telemetryLevel`: the user value, with the manifest level as the default. Contributed by `bindTelemetryPreferences` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-preferences.ts`. The sender reads it live for each event.
- Collector store directory: the default is `.mozbuild/crash-store`, which is gitignored (`DEFAULT_STORE_DIR` in `$PB_REPO/scripts/crash-collector.mjs`). It holds one `<uuid>.dmp` and one `<uuid>.json` per accepted submit. Written by `handleSubmit` in `$PB_REPO/scripts/crash-collector.mjs`. Filenames are generated UUIDs, never submitter input.
- Throttle state: accepted-submit timestamps in the owning process. Written by `recordAccept` in `$PB_REPO/scripts/crash-collector.mjs`, only after a durable store write.
- Suppress list: the error keys admitted in this session. Written by `ErrorReporter` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-error-report.ts`.

## Access matrix

| Layer | Read | Write | API |
| --- | --- | --- | --- |
| Theia frontend extension | Injects `PowerBrowserTelemetryLogger` and calls `logUsage` or `logError` | Never touches the sender queue or the collector store directly | `PowerBrowserTelemetryLogger` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-logger.ts` |
| Uncaught-error hooks | `window` error and unhandled-rejection events | Hand them to the reporter, and never throw out of the listener | `TelemetryErrorCapture` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-error-capture.ts` |
| Downstream operator | Reads the collector store directory | Starts the collector with `--port` and `--store`; never exposes it past loopback | `startCollector` in `$PB_REPO/scripts/crash-collector.mjs` |
| External process | None over the telemetry path | Submits a multipart POST to `/submit` on loopback | `SUBMIT_PATH` in `$PB_REPO/scripts/crash-collector.mjs` |

## APIs by layer

- `PowerBrowserTelemetrySender` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`: the batching sender. It flushes on size and on interval, retries with backoff, then drops. It never throws out of a telemetry path.
- `levelAllowsEvent` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`: the level gate. `off` drops everything. `crash` and `error` admit the error path only. `all` admits usage plus error. An unrecognised level fails closed to `off`.
- `TELEMETRY_LEVELS` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`: exactly `off`, `crash`, `error` and `all`.
- `sendEventData` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`: the usage path. It is dropped unless the live level is `all`.
- `sendErrorData` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`: the error path. It is sent at every level except `off`.
- `admits` and `dispose` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`: the per-kind admission check, and the shutdown call that the logger forwards to.
- `PowerBrowserTelemetryLogger` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-logger.ts`: the thin logger over the sender. It translates the logger shape onto the usage and error paths. Its `dispose` calls the sender's `dispose`.
- `logUsage` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-logger.ts`: usage events onto the usage path.
- `logError` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-logger.ts`: both the event-name form and the exception form, onto the error path.
- `TELEMETRY_LEVEL_PREFERENCE` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-preferences.ts`: the `telemetry.telemetryLevel` key.
- `TelemetryPreferenceSchema` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-preferences.ts`: the preference schema, with the four levels and the `off` default.
- `bindTelemetryPreferences` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-preferences.ts`: contributes the schema after the synchronous contributions, so the PowerBrowser text and default win in any module order.
- `powerbrowserTelemetry` in `$PB_REPO/theia/applications/browser/package.json`: the manifest-owned half, `level` and `endpoint`, under `theia.frontend.config`.
- `readTelemetryConfig` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts`: reads that block once, with a fail-closed fallback to level `off` and no endpoint.
- `TelemetryErrorCapture` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-error-capture.ts`: adds the `window` error and unhandled-rejection listeners on start, and removes them on stop.
- `ErrorReporter` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-error-report.ts`: shapes the sanitised payload and skips repeats.
- `UNCAUGHT_ERROR_EVENT` and `UNHANDLED_REJECTION_EVENT` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-error-report.ts`: the two event names, `frontend.uncaught-error` and `frontend.unhandled-rejection`.
- `typeOf` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-error-report.ts`: the thrown value's constructor name, or `unknown` when it could carry a path.
- `baseName` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-error-report.ts`: the script base name, or nothing when the source is not a script URL.
- `SUBMIT_PATH` in `$PB_REPO/scripts/crash-collector.mjs`: the only submit path, `/submit`. Every other path answers 404.
- `MINIDUMP_PART_NAME` and `EXTRA_PART_NAME` in `$PB_REPO/scripts/crash-collector.mjs`: the minidump part name, `upload_file_minidump`, and the JSON annotation part name, `extra`.
- `ANNOTATION_ALLOWLIST` in `$PB_REPO/scripts/crash-collector.mjs`: the only submitter-supplied fields that are ever stored.
- `handleSubmit` in `$PB_REPO/scripts/crash-collector.mjs`: the whole submit verdict (parse, throttle, store, respond) with no sockets.
- `startCollector` in `$PB_REPO/scripts/crash-collector.mjs`: the loopback HTTP wrapper around `handleSubmit`.
- `LOOPBACK_HOST` in `$PB_REPO/scripts/crash-collector.mjs`: the bind address constant. There is no flag to change it.
- `THROTTLE_RULE` and `THROTTLE_MAX_SUBMITS` in `$PB_REPO/scripts/crash-collector.mjs`: the soft-reject rule name, and the per-window accept cap.
- `RETENTION_DAYS` in `$PB_REPO/scripts/crash-collector.mjs`: the retention window, swept on every accept.
- Theia-side logger API details (payload shapes, injection points) live in the `PowerBrowserTelemetryLogger` section of [01 Theia extensions](../01-theia-extensions.md#powerbrowsertelemetrylogger). This doc states the pipeline behaviour, not the API table.

## Events and change signals

- `frontend.uncaught-error`: an uncaught error, translated to its type, script base name, line and column. It never carries the message or the stack.
- `frontend.unhandled-rejection`: an unhandled rejection, translated to its type only.
- Admission per level: `off` passes nothing. The two middle levels pass error events only. `all` passes usage plus error.
- Admission check: the sender asks, for each event, whether the live level covers the kind. The check never throws. An unreadable level reads as `off`.
- Repeat suppression: an error is sent once per (event, type, source, line) key per session. The key is recorded only when error events are admitted at the live level, so an error first seen at `off` is still sent once the level is raised.
- Shutdown: `dispose` on the sender, reached through `dispose` on the logger. Neither throws out of a telemetry path.
- Retry: a failing batch retries with doubling delay for a bounded number of attempts, then drops with a console diagnostic.
- Collector verdicts: see the rejection vocabulary below.

## Rejection vocabulary

The collector answers each submit with one of these verdicts. The table mirrors the rejection section of `$PB_REPO/docs/CRASH-POLICY.md`. The `REASON_` constants in `$PB_REPO/scripts/crash-collector.mjs` are the code side of the same names.

| Input | Status | Body |
| --- | --- | --- |
| Well-formed submit | 200 | `CrashID=<uuid>` |
| Not multipart, or no boundary | 400 | `Discarded=malformed_wrong_content_type` |
| No part named `upload_file_minidump` | 400 | `Discarded=malformed_no_minidump` |
| Over the part-count, part-size or total-body cap | 413 | `Discarded=oversized_body` |
| Past the throttle cap | 200 | `Discarded=throttled_per_minute_cap` |
| Store directory unwritable, or the injected clock is not finite | 500 | `Discarded=store_unavailable` |

Rejected submits write nothing. A throttled submit answers on the success status on purpose, so the client treats it as a soft refusal and may retry.

## Commands, settings and ids

- `telemetry.telemetryLevel`: `off` (send nothing), `crash` and `error` (error events only), or `all` (usage plus error). The default comes from the manifest. A runtime change takes effect without a restart.
- `[telemetry]` in `$PB_REPO/configuration.toml`: `level` plus `endpoint`. `$PB_REPO/scripts/generate.mjs` refuses an enabled level with no endpoint, so a sender that can never deliver never builds.
- `powerbrowserTelemetry` in `$PB_REPO/theia/applications/browser/package.json`: the level and endpoint that the frontend reads. The tracked value is level `off` with endpoint `null`.
- Collector start, from the PB checkout: `node scripts/crash-collector.mjs --port 8123 --store <dir>`. It binds `LOOPBACK_HOST` only.
- Collector submit: a multipart POST to `/submit`, with the minidump in the part named `upload_file_minidump`. The answer is `CrashID=<uuid>` or `Discarded=<rule>`.
- Compiled-out telemetry and crash prefs in `$PB_REPO/powerbrowser/endpoint-allowlist.json`: `toolkit.telemetry.unified`, `toolkit.telemetry.server`, `datareporting.healthreport.uploadEnabled`, `datareporting.policy.dataSubmissionEnabled`, `breakpad.reportURL` and the Normandy prefs. These are defence in depth behind the compile flags.

## Limits and rules

- The queue is capped (`maxQueueEvents` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`). Events past the cap are dropped with a diagnostic, and never queued without bound.
- Batches flush on size (`maxBatchSize`) and on interval (`flushIntervalMs`), both in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`. A zero or negative interval disables the timer.
- An unrecognised level fails closed to `off`. A hand-edited config silences the sender and never arms it. Enforced by `levelAllowsEvent` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`.
- A batch is tried a bounded number of times (`maxAttempts` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-sender.ts`) with doubling delay from `baseDelayMs` in the same file, then dropped.
- No message text, stack or path beyond a base name enters a payload. Enforced by `typeOf` and `baseName` in `$PB_REPO/theia/extensions/telemetry/src/browser/telemetry-error-report.ts`, and by the telemetry self-test.
- Annotation values are allowlisted scalars of at most 4096 bytes (`MAX_ANNOTATION_BYTES` in `$PB_REPO/scripts/crash-collector.mjs`). Anything else is dropped before the write. Nested values are dropped as well.
- Retention is 30 days (`RETENTION_DAYS` in `$PB_REPO/scripts/crash-collector.mjs`). Every accept sweeps older records, so deletion needs no second job.
- Throttle: 60 accepts per rolling 60 seconds (`THROTTLE_MAX_SUBMITS` and `THROTTLE_WINDOW_MS` in `$PB_REPO/scripts/crash-collector.mjs`). Only accepted submits consume budget.
- Ingestion caps: `MAX_PARTS` parts per submit, `MAX_PART_BYTES` per part and `MAX_BODY_BYTES` per body, in `$PB_REPO/scripts/crash-collector.mjs`. Over-cap input gets the oversized rejection.
- The collector binds loopback only (`LOOPBACK_HOST`). Serving collection past loopback needs token auth, which is out of scope.
- A new outbound telemetry host needs a row in `$PB_REPO/powerbrowser/endpoint-allowlist.json`. This is the outbound-host rule in the "Also binding" list of [Shared rule blocks](../_shared/RULES.md#hard-rules).

## Verification

Each row is run with `$PB_REPO/scripts/verify-platform.sh --only <label>`.

- `telemetry`: proves the manifest emission reaches the sidecar block and that the sender unit suite is green.
- `telemetry-self-test`: proves the gate reddens for a drifted block, a drifted fragment and the always-send stub, and drives the error reporter into the real sender.
- `crash-collector`: proves the collector contract. The policy states every contract literal, the builders emit their shapes, and the submit matrix holds.
- `crash-collector-self-test`: proves each contract direction goes red, naming its rule, on planted faults.
- `ng068-crash-extra-part`: proves the collector accepts Gecko's `extra` annotation part. Allowlisted keys are stored, a malformed extra part keeps the report, and per-part annotations still work.
- `ng067-frontend-errors-reach-telemetry`: proves that uncaught frontend errors and unhandled rejections reach the telemetry logger at the error level, stay silent at `off`, and carry sanitised payloads.
- The sender unit suite runs with plain Node only: no build, no browser and no install. The test file is `$PB_REPO/theia/extensions/telemetry/test/telemetry-sender.test.mjs`. Its shell form is one relative path from the PB checkout:

  ```sh
  node theia/extensions/telemetry/test/telemetry-sender.test.mjs
  ```

  Setting `TELEMETRY_TEST_STUB` to `always-send` makes the run fail on the off-sends-nothing assertion. That is the discrimination proof.

## PB docs and deltas

- `$PB_REPO/docs/CRASH-POLICY.md` agrees with the collector code. It is the reviewable source. The contract gate derives its expectations from the code exports, so a policy edit that drops a literal fails naming it. If the page and the code disagree, the page is the reference.
- `$PB_REPO/docs/RELEASING.md` says the shipped level is `off` "with the endpoint stated", so that the existing preference is a working opt-in. At 5571d3d this does not hold: `$PB_REPO/configuration.toml` leaves `endpoint` deliberately unset, and the tracked `powerbrowserTelemetry` block has endpoint `null`. A user who raises the level in this tree gets no delivery until a downstream sets an endpoint. This doc states the tree, not the RELEASING wording.
- `$PB_REPO/docs/RELEASING.md` describes the events-origin Cloudflare Worker as written ahead of its stage. No Worker source exists in the tree.
- Theia-side logger details live in the `PowerBrowserTelemetryLogger` section of [01 Theia extensions](../01-theia-extensions.md#powerbrowsertelemetrylogger). This doc links there instead of restating the payload tables.

## Operator runbook

1. Start the collector from the PB checkout: `node scripts/crash-collector.mjs --port 8123 --store <dir>`. Records land in `<dir>`. Stop it with Ctrl-C.
2. Prove the loop: post one synthetic multipart submit to `http://127.0.0.1:8123/submit`. Expect `CrashID=` in the body, a matching `<uuid>.json` record and a matching `<uuid>.dmp` minidump in the store directory.
3. Prove the gate: `node scripts/verify-crash-collector.mjs --self-test`. A red row names its rule. Fix the named cause, not the gate.
4. Check the posture: the level in `$PB_REPO/configuration.toml` is `off` and no endpoint is set. Setting an endpoint is a downstream decision, and it requires a row in `$PB_REPO/powerbrowser/endpoint-allowlist.json`.

## Gaps

- GAP: no Socorro self-host and no archived mini-breakpad-server adoption exist. Checked: `$PB_REPO/docs/CRASH-POLICY.md` states that the collector speaks the Antenna submit contract and nothing else.
- GAP: no network exposure mode for the collector exists. Checked: `startCollector` in `$PB_REPO/scripts/crash-collector.mjs` binds `LOOPBACK_HOST` with no host flag, and serving past loopback needs token auth, which is out of scope.

## Unsettled items

- UNVERIFIED: one real POST from a running sidecar reaches a loopback endpoint. Verify: run the live error-delivery drill against a running sidecar.
- UNVERIFIED: the events-origin Worker accepts frontend error reports in production exactly as the sender emits them. Verify: read the Worker contract where the downstream hosts it. No such Worker is tracked in this tree.

## Recipes that touch this

No recipe references this subsystem yet; telemetry and collector recipes land in a later phase.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
