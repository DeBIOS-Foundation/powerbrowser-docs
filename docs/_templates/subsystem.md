# {Subsystem name}

> Verified against PB {sha} on {YYYY-MM-DD}. Level: {source-read|run}

Source files:
- `$PB_REPO/{path}`

Not read:
- NOT COVERED: {area or $PB_REPO path you did not read}

Status: {working | partly working | documented ahead of implementation}

<!-- template: copy to docs/subsystems/{name}.md; replace every {placeholder}; delete every template comment; keep the shared blocks and the hard-rules pointer line unchanged; omit a section that does not apply instead of inventing rows; stay within 25600 bytes (wc -c); rules in ../CONVENTIONS.md#templates -->

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

- {What the subsystem does, what it owns, what it does not own.}
<!-- template: 5-8 bullets -->

## Where its data lives

- {File, table, pref or profile store, and who writes it.}
<!-- template: one bullet per store; name the writer -->

## Access matrix

| {Extension type or layer} | {Read} | {Write} | {API} |
| --- | --- | --- | --- |
| {row} | {how} | {how} | {symbol in `$PB_REPO/{path}`} |
<!-- template: same shape as the Access matrix in 09-tabs-reference.md -->

## APIs by layer

- {Symbol} in `$PB_REPO/{path}`: {what it does}.
<!-- template: cite symbol plus path; link to the surface doc for payloads instead of restating them -->

## Events and change signals

- {Event or signal, who emits it, who listens.}
<!-- template: one bullet per event -->

## Commands, settings and ids

- {Command, setting or id}: {meaning}.
<!-- template: exact identifiers only -->

## Limits and rules

- {Rule}: enforced by {hard rule or verify row}.
<!-- template: each rule names the hard rule or verify row that enforces it -->

## Verification

- `$PB_REPO/scripts/verify-platform.sh --only {label}` proves {what}.
<!-- template: exact verify rows and what each proves -->

## PB docs and deltas

- `$PB_REPO/{path}`: {where it disagrees with source, or "agrees"}.
<!-- template: PB's own docs on this subsystem; record disagreements in docs/CONFLICTS.md -->

## Gaps

- GAP: {capability} does not exist in PB. Checked: {search command or files read}.
<!-- template: GAP: entries only for capabilities you searched for and did not find -->

## Unsettled items

- UNVERIFIED: {claim}. Verify: {command or file to read}.
<!-- template: UNVERIFIED: entries for claims you could not confirm -->

## Recipes that touch this

{recipe link, recipe link: relative links to ../recipes/{name}.md}
<!-- template: one line of relative links to recipes -->

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
