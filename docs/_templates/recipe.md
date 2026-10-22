# {Task in imperative form}

> Verified against PB {sha} on {YYYY-MM-DD}. Level: {source-read|run}

Source files:
- `$PB_REPO/{path}`

PB core edits: {N}

<!-- template: copy to docs/recipes/{name}.md; replace every {placeholder}; delete every template comment; keep the shared blocks and the hard-rules pointer line unchanged; stay within 6144 bytes (wc -c); set PB core edits to the number of **PB core edit** steps; rules in ../CONVENTIONS.md#templates -->

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

{Result the user can see when done.}
<!-- template: one sentence -->

## Before you start

- {Reference section: relative link to ../subsystems/{name}.md#{anchor}}
<!-- template: link to reference sections, add prerequisites such as the dev shell and the PB_REPO export line from ../CONVENTIONS.md#paths-and-links; do not restate -->

## Confirm before coding

- `grep -n '{symbol}' "$PB_REPO/{path}"`
<!-- template: one bullet per PB symbol the steps rely on; if one is missing, stop and tell the user -->

## Steps

1. **PB core edit** {Step that changes a file in `$PB_REPO`.}
2. {Step with exact path and command.}
<!-- template: numbered; start a step that changes a file in $PB_REPO with the label **PB core edit** -->

## Verify

`$PB_REPO/scripts/verify-platform.sh --only {label}` prints {expected output}.
<!-- template: exact commands and expected output -->

## Done when

- {Observable check.}
<!-- template: observable checks only -->

## Rollback

- {Undo for each step, PB core edits included.}
<!-- template: one undo per step -->

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
