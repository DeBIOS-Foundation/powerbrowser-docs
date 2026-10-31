# Add a shell panel

> Verified against PB d911f55 on 2026-10-22. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts`
- `$PB_REPO/theia/extensions/telemetry/package.json`
- `$PB_REPO/theia/extensions/telemetry/tsconfig.json`
- `$PB_REPO/theia/package.json`
- `$PB_REPO/theia/applications/browser/package.json`

PB core edits: 4

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

A new view opens with `openView` and shows its widget in the shell.

## Before you start

- [How to use a Theia extension](../01-theia-extensions.md#how-to-use).
- [The contribution points PB uses](../01-theia-extensions.md#theia-contribution-points-pb-extensions-use-copy-these-patterns).
- [Public DI services](../01-theia-extensions.md#public-di-services).
- [Theia extension delivery](../08-building-an-extension.md#theia-extension-powerbrowsername).

## Confirm before coding

- `grep -n 'bindViewContribution' "$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts"`
- `grep -n 'WidgetFactory' "$PB_REPO/theia/extensions/modes/src/browser/modes-frontend-module.ts"`
- `grep -n 'build:extensions' "$PB_REPO/theia/package.json"`

## Steps

1. **PB core edit** Create `$PB_REPO/theia/extensions/<name>/` with `package.json` and `tsconfig.json` copied from `$PB_REPO/theia/extensions/telemetry/` and renamed to `@powerbrowser/<name>`. In `src/browser/`, write the widget class with a static `ID` string, and a view contribution class that extends `AbstractViewContribution` for that widget.
2. **PB core edit** In `src/browser/<name>-frontend-module.ts`, follow `modes-frontend-module.ts`. Bind the widget to itself. Bind a `WidgetFactory` with `id` equal to the widget's static `ID`, in singleton scope. Then call `bindViewContribution(bind, <Contribution>)`. Without the factory, `openView` rejects, and its callers swallow the rejection (the comment above the bind in `modes-frontend-module.ts`).
3. **PB core edit** Register the extension and its build as in [add a shell command](add-command.md), steps 2 and the build-chain edit. The app file is `$PB_REPO/theia/applications/browser/package.json`, and the chain is in `$PB_REPO/theia/package.json`.
4. **PB core edit** Build inside `nix develop .#theia`: `cd "$PB_REPO/theia" && yarn install --ignore-scripts --frozen-lockfile && yarn build`. This writes generated build output (gitignored `node_modules/` and `lib/`) into the PB checkout and changes no tracked PB source.

## Verify

From the root of this repo, run:

- `"$PB_REPO"/scripts/verify-platform.sh --quick`
- `"$PB_REPO"/scripts/verify-platform.sh --only theia-build-order`

Both must pass.

## Done when

- `openView` with the widget `ID` opens the widget in the shell.
- A `WidgetFactory` id that differs from the widget `ID` makes `openView` reject. Check the factory id first when the panel does not open.

## Rollback

- Undo step 3: remove the app `dependencies` entry and the `build:extensions` segment.
- Undo step 2: remove the `bindViewContribution` call and the `WidgetFactory` bind from the frontend module.
- Undo step 1: delete `$PB_REPO/theia/extensions/<name>/`.
- Rebuild with the step 4 command.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
