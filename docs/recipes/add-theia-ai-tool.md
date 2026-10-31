# Add a Theia AI tool

> Verified against PB d911f55 on 2026-10-22. Level: source-read

Source files:
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/theia/extensions/telemetry/package.json`
- `$PB_REPO/theia/extensions/telemetry/tsconfig.json`
- `$PB_REPO/theia/package.json`

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

**Ask the user first:** the [scope warning](../06-theia-plugins-and-ai.md#what-it-is) records that PB planning lists customising Theia AI and AI-assistant integration as Out of Scope. UNVERIFIED: the Out of Scope status rests on PB planning files, which can lag. Verify: read the "Out of Scope" section of `$PB_REPO/.planning/PROJECT.md` at PB HEAD, then confirm with the user before any step below. After that, a Theia AI agent calls a new tool in chat.

## Before you start

- [Give Theia AI agents a tool](../06-theia-plugins-and-ai.md#b-give-theia-ai-agents-a-tool-from-a-powerbrowser-theia-extension).
- [Use it when and do not use it when](../06-theia-plugins-and-ai.md#use-it-when--do-not-use-it-when).
- [Scope warning](../06-theia-plugins-and-ai.md#what-it-is).

## Confirm before coding

- `grep -n '"@theia/ai-core"' "$PB_REPO/theia/applications/browser/package.json"`
- `grep -n 'extensions/\*' "$PB_REPO/theia/package.json"`
- `grep -n 'build:extensions' "$PB_REPO/theia/package.json"`

## Steps

1. **PB core edit** Create `$PB_REPO/theia/extensions/<name>/`. Copy `package.json` and `tsconfig.json` from `$PB_REPO/theia/extensions/telemetry/`, rename the package to `@powerbrowser/<name>`, and add `"@theia/ai-core": "1.76.0"` to `dependencies`. The workspace glob `extensions/*` picks the new folder up.
2. **PB core edit** In `src/browser/<name>-tool.ts`, write a class that implements `ToolProvider` from `@theia/ai-core/lib/common`. Give it a static `ID` and a `getTool()` method that returns `id`, `name`, `providerName`, `description`, `parameters` (JSON Schema) and a `handler(arg_string)` that returns a string. In `src/browser/<name>-frontend-module.ts`, call `bindToolProvider(<Class>, bind)`. UNVERIFIED: `bindToolProvider` and `ToolProvider` come from `@theia/ai-core`, which sits in gitignored `node_modules`, so no tracked file shows them. Verify: after the step 3 install, run `grep -rln 'bindToolProvider' "$PB_REPO/theia/node_modules/@theia/ai-core/lib"`. To reach backend code, use a JSON-RPC service ([add a backend service](add-backend-service.md)).
3. **PB core edit** Register the extension and its build as in [add a shell command](add-command.md), steps 2 and 3.

## Verify

From the root of this repo, run:

- `"$PB_REPO"/scripts/verify-platform.sh --quick`
- `"$PB_REPO"/scripts/verify-platform.sh --only theia-build-order`

Both must pass. Then open chat, add `~{<tool id>}` to an agent prompt, and check that the tool runs.

## Done when

- You confirmed AI core work with the user before step 1.
- The tool id resolves in a chat prompt as `~{<tool id>}`.

## Rollback

- Undo step 3: remove the app `dependencies` entry and the `build:extensions` segment.
- Remove the prompt reference from any agent prompt.
- Undo step 2 and step 1: delete `$PB_REPO/theia/extensions/<name>/`.
- Rebuild with the step 3 build command, `cd "$PB_REPO/theia" && yarn build`.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
