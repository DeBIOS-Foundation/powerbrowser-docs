# Restyle the shell

> Verified against PB d911f55 on 2026-10-22. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/customize/src/browser/customize-css-contribution.ts`
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

The shell looks different with no PB edit, no rebuild, and no restart.

## Before you start

- [Restyle the shell with customize.css](../01-theia-extensions.md#c-restyle-the-shell-with-customizecss).
- [customize.css and customize.js](../01-theia-extensions.md#customizecss-and-customizejs).

## Confirm before coding

- `grep -n 'customize.css' "$PB_REPO/theia/extensions/customize/src/browser/customize-css-contribution.ts"`
- `grep -n 'THEIA_CONFIG_DIR' "$PB_REPO/theia/applications/browser/package.json"`

## Steps

1. Create the folder and the file on the machine that runs PB: `mkdir -p "${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser"`, then create `customize.css` in it. That folder is `$THEIA_CONFIG_DIR`, which the app `start` script sets. PB never creates the file.
2. Add ordinary CSS rules. The file text is injected as one `<style>` element.
3. Save the file. The shell applies the change live, with no rebuild or restart.

## Verify

Run:

`test -s "${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser/customize.css" && echo "customize.css present"`

It prints `customize.css present`. Then open the shell and check that a rule from the file applies.

## Done when

- The rule appears in the shell without a rebuild.
- Deleting the file restores the stock look at once. A deleted-file event resets the style element.

## Rollback

- Undo step 1: `rm "${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser/customize.css"`.
- Reload the shell and check that the stock look is back.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
