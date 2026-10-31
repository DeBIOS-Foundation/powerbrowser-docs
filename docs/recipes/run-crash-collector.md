# Run the crash collector

> Verified against PB 0f27a5c on 2026-10-25. Level: source-read

Source files:
- `$PB_REPO/scripts/crash-collector.mjs`
- `$PB_REPO/scripts/verify-crash-collector.mjs`
- `$PB_REPO/docs/CRASH-POLICY.md`
- `$PB_REPO/theia/applications/browser/package.json`

PB core edits: 0

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

The loopback collector runs against a store directory outside the PB checkout, accepts one synthetic submit, and its two gate rows pass.

## Before you start

- No PB core edit here, so no ladder rung applies. The collector is downstream operations tooling. It binds loopback only, and no flag changes the host: only `--port` and `--store` exist. Serving past loopback needs token auth, which is out of scope ([limits and rules](../subsystems/telemetry-and-crash.md#limits-and-rules)).
- [Operator runbook](../subsystems/telemetry-and-crash.md#operator-runbook) and [rejection vocabulary](../subsystems/telemetry-and-crash.md#rejection-vocabulary).
- Stop and ask before you send a real report anywhere, set a telemetry endpoint (it needs an allowlist row), or enable a level.

## Confirm before coding

- `grep -n 'LOOPBACK_HOST' "$PB_REPO/scripts/crash-collector.mjs"`
- `grep -n 'SUBMIT_PATH' "$PB_REPO/scripts/crash-collector.mjs"`
- `grep -n 'DEFAULT_STORE_DIR' "$PB_REPO/scripts/crash-collector.mjs"`
- `grep -n 'startCollector' "$PB_REPO/scripts/crash-collector.mjs"`

## Steps

1. Choose a store directory outside the PB checkout, with no space in its path. Always pass `--store`: the default store is the `.mozbuild/crash-store` folder inside the PB checkout.
2. In its own terminal, run `node "$PB_REPO"/scripts/crash-collector.mjs --port <port> --store <dir>`. It binds loopback only. The port defaults to 8123 (`DEFAULT_PORT`).
3. Post one multipart submit with the minidump in the part named `upload_file_minidump`: `curl -s -F "upload_file_minidump=@<file>" http://127.0.0.1:<port>/submit`. UNVERIFIED: whether the collector rejects a body that is not a real minidump. Verify: read `handleSubmit` in `$PB_REPO/scripts/crash-collector.mjs` at PB HEAD. The part-name check is the only minidump check in the parser read at HEAD.
4. Expect the body `CrashID=<uuid>` and two files in the store directory, `<uuid>.dmp` and `<uuid>.json`. A throttled submit answers with HTTP 200 and a `Discarded=` line (see the rejection vocabulary).
5. Stop the collector with Ctrl-C.

## Verify

- `"$PB_REPO"/scripts/verify-platform.sh --only crash-collector` prints `crash-collector: PASS`.
- `"$PB_REPO"/scripts/verify-platform.sh --only crash-collector-self-test` prints `crash-collector-self-test: PASS`.

Source: the self-test writes only into a `mkdtemp` directory under `tmpdir()` in `scripts/verify-crash-collector.mjs`, so it does not write into the PB checkout. To confirm, run `git --no-optional-locks -C "$PB_REPO" status --porcelain` before and after the row and compare the two outputs.

## Done when

- The submit body starts with `CrashID=`, and the store directory holds the `.dmp` and `.json` pair for that id.
- Both gate rows print PASS.

## Rollback

- Steps 2 and 5: stop the process with Ctrl-C.
- Steps 1 and 3: delete the store directory only after the user agrees, because it holds crash records.
- Step 4 writes nothing to undo.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
