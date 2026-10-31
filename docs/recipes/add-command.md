# Add a shell command

> Verified against PB d911f55 on 2026-10-22. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts`
- `$PB_REPO/theia/extensions/telemetry/package.json`
- `$PB_REPO/theia/extensions/telemetry/tsconfig.json`
- `$PB_REPO/theia/package.json`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/scripts/verify-theia-build-order.mjs`

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

A new command id runs from the command palette and from `CommandService.executeCommand`.

## Before you start

- [How to use a Theia extension](../01-theia-extensions.md#how-to-use).
- [Command ids of PB extensions](../01-theia-extensions.md#command-ids-registered-by-pb-extensions-run-with-commandserviceexecutecommand).
- [Theia extension delivery](../08-building-an-extension.md#theia-extension-powerbrowsername).

## Confirm before coding

- `grep -n 'CHROME_BAR_NEW_TAB_COMMAND_ID' "$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts"`
- `grep -n 'registerCommands' "$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts"`
- `grep -n 'CommandContribution' "$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts"`
- `grep -n 'build:extensions' "$PB_REPO/theia/package.json"`

## Steps

1. **PB core edit** Create `$PB_REPO/theia/extensions/<name>/` with `package.json` and `tsconfig.json` copied from `$PB_REPO/theia/extensions/telemetry/` and renamed to `@powerbrowser/<name>`. In `src/browser/`, write `<name>-commands.ts`: an exported id constant such as `powerbrowser.<name>.<action>`, a `Command` object (`id`, `category`, `label`), and a class that implements `CommandContribution` and registers the command with its handler in `registerCommands`. Write `<name>-frontend-module.ts` with `bind(<Class>).toSelf().inSingletonScope()` and `bind(CommandContribution).toService(<Class>)`. The model is `chrome-bar-commands.ts` and `chrome-bar-frontend-module.ts`.
2. **PB core edit** Register the extension. In `$PB_REPO/theia/applications/browser/package.json`, add `"@powerbrowser/<name>": "0.1.0"` to `dependencies`. In `$PB_REPO/theia/package.json`, append `&& yarn --cwd extensions/<name> build` to the `build:extensions` script. An extension that imports another one builds after it: `$PB_REPO/scripts/verify-theia-build-order.mjs` derives the order from the imports.
3. **PB core edit** Build inside `nix develop .#theia`: `cd "$PB_REPO/theia" && yarn install --ignore-scripts --frozen-lockfile && yarn build`. This writes generated build output (gitignored `node_modules/` and `lib/`) into the PB checkout and changes no tracked PB source.

## Verify

From the root of this repo, run:

- `"$PB_REPO"/scripts/verify-platform.sh --quick`
- `"$PB_REPO"/scripts/verify-platform.sh --only theia-build-order`

Both must pass.

## Done when

- The command appears in the command palette under its category and label.
- `CommandService.executeCommand` with the exported id runs the same handler.
- The contribution is bound at module load. A binding added after the first enumeration is never seen (header of `chrome-bar-frontend-module.ts`).

## Rollback

- Undo step 2: remove the `dependencies` entry and the `build:extensions` segment.
- Undo step 1: delete `$PB_REPO/theia/extensions/<name>/`.
- Rebuild with the step 3 command.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
