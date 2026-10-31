# Add an outbound host

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/scripts/verify-endpoints.sh`
- `$PB_REPO/scripts/verify-platform.sh`

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

The browser or sidecar reaches a new network host without failing the egress gate.

## Before you start

- [The allowlist](../04-theia-backend-rpc-http.md#reference).
- [Why there is no REST API and no external access](../04-theia-backend-rpc-http.md#why-there-is-no-rest-api-and-no-external-access).
- [Gotchas](../04-theia-backend-rpc-http.md#gotchas), including exact host matching.

## Confirm before coding

- `grep -n 'allowlist_host_allowed' "$PB_REPO/scripts/verify-endpoints.sh"`
- `grep -n '"hosts"' "$PB_REPO/powerbrowser/endpoint-allowlist.json"`

## Steps

1. **PB core edit** Add one object to the `hosts` array of `$PB_REPO/powerbrowser/endpoint-allowlist.json`. Set `host` to the exact host name (a leading `.` matches a suffix), `disposition` to `allow` or `deny`, and `reason` to a hand-written sentence that names the caller and when it contacts the host. Add `manifest` only when a key in `$PB_REPO/configuration.toml` owns the host.
2. Run the verify row below. Do not edit `verify-endpoints.sh` in this recipe. If the gate observes a host that the allowlist does not list, the gate fails. Stop and ask the user, because a change to the gate itself is a second PB core edit.

## Verify

From the root of this repo, run `"$PB_REPO"/scripts/verify-platform.sh --only verify-endpoints`. It must pass on a built browser.

## Done when

- The host resolves, and no unlisted host resolves with it.
- The `reason` states who initiates the call and when.

## Rollback

- Undo step 1: remove the object from `hosts`.
- Undo step 2: nothing is changed, so no action is needed.
- Re-run the verify command.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
