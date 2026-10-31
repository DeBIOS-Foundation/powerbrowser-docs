# Add an MCP tool

> Verified against PB d911f55 on 2026-10-22. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`
- `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-sql.ts`
- `$PB_REPO/docs/tab-store-access.md`
- `$PB_REPO/scripts/verify-ng-025-store-read-endpoint.mjs`

PB core edits: 3

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

An external agent calls a new tool on the tab-store MCP endpoint.

## Before you start

- [How to add a new MCP tool](../03-tab-store-mcp-server.md#how-to-add-a-new-mcp-tool).
- [Tools](../03-tab-store-mcp-server.md#tools).
- [The relay path](../03-tab-store-mcp-server.md#the-tab-store-relay-json-rpc-path).
- [Rules and constraints](../03-tab-store-mcp-server.md#rules-and-constraints).

## Confirm before coding

- `grep -n 'TAB_STORE_TOOL_NAMES' "$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts"`
- `grep -n 'runTool' "$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts"`
- `grep -n 'runReadOnlySql' "$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-sql.ts"`

## Steps

1. **PB core edit** Append the tool name to `TAB_STORE_TOOL_NAMES` in `$PB_REPO/theia/extensions/tab-uris/src/browser/tab-store-access-protocol.ts`. `TabStoreToolName` is derived from that list, so `TOOLS` does not type-check with an unlisted name.
2. **PB core edit** In `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-access-endpoint.ts`, add a `ToolDef` to `TOOLS`: `name`, a `description` that states the returned shape, and an `inputSchema` with `required`. Add a `case` in `runTool()` that validates each argument (`requireString` or `requireGuid`, or a thrown `Error` that says what is allowed) and returns a plain object. For a read that needs only `tabs.sqlite`, call `runReadOnlySql` from `$PB_REPO/theia/extensions/tab-uris/src/node/tab-store-sql.ts`.
3. **PB core edit** Document the tool, with its name in backticks, in `$PB_REPO/docs/tab-store-access.md`. `verify-ng-025-store-read-endpoint.mjs` fails when `tools/list` and that document disagree.

This recipe covers a backend-only read. A tool that needs Firefox data (Places, sessionstore, any write) also needs a relay kind or a write field and a chrome handler. Stop and ask the user, then follow [How to add a new MCP tool](../03-tab-store-mcp-server.md#how-to-add-a-new-mcp-tool), step 4.

## Verify

From the root of this repo, run:

- `"$PB_REPO"/scripts/verify-platform.sh --quick`
- `"$PB_REPO"/scripts/verify-platform.sh --only ng-025-store-read-endpoint`

Both must pass. The live half of the second check needs a built browser.

## Done when

- `tools/list` names the new tool.
- A `tools/call` for it returns `structuredContent`, or a validation error with `isError: true`.

## Rollback

- Undo step 3: remove the tool's line from `docs/tab-store-access.md`.
- Undo step 2: remove the `ToolDef` and the `runTool()` case.
- Undo step 1: remove the name from `TAB_STORE_TOOL_NAMES`.
- Re-run the step 1 verify command.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
