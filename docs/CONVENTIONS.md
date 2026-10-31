# Doc conventions

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`

These rules apply to every file under docs/ and to the five entry files: AGENTS.md, CLAUDE.md (it imports AGENTS.md with `@AGENTS.md` and carries no block copy of its own), `.agents/skills/powerbrowser-extensions/SKILL.md`, `.prompts/project-info.prompttemplate` and `.agents/agents/pb-extension-builder/agent.md`. A new doc starts from a template: [subsystem](_templates/subsystem.md) for a subsystem reference, [recipe](_templates/recipe.md) for a recipe. The shared rule text lives in [the shared rules file](_shared/RULES.md).

## Doc header

Every doc under docs/ starts with this layout. Line numbers are exact.

1. Line 1: `# <Title>`.
2. Line 2: empty.
3. Line 3: the stamp, `> Verified against PB <sha> on <YYYY-MM-DD>. Level: <source-read|run>`.
4. Line 4: empty.
5. Line 5: `Source files:`.
6. Line 6 onward: one bullet per PB path, then an empty line. The list ends at the first empty line.
7. Subsystem references only, after that empty line: `Not read:` followed by bullets that start `- NOT COVERED: `, an empty line, then one line `Status: <working | partly working | documented ahead of implementation>`.
8. Recipes only, after that empty line: one line `PB core edits: <N>`, where N is the number of steps labelled `**PB core edit**`.

Scripts match line 3 against this regex:

```text
^> Verified against PB [0-9a-f]{7,40} on [0-9]{4}-[0-9]{2}-[0-9]{2}\. Level: (source-read|run)$
```

Each bullet in the `Source files:` list matches this regex:

```text
^- `\$PB_REPO/[^` ]+`$
```

List rules:

- A doc that depends on no PB file writes the single bullet `- none`.
- The list ends at the first empty line.
- A bullet names a file, or a directory ending in `/`.
- No globs, symbols or line numbers in the list.
- List every PB file whose content the doc states facts about.
- The drift check diffs only these paths.
- A `$PB_REPO/.planning/` path may appear in the list. The drift check diffs it like any other path, and a fact taken only from it is marked `UNVERIFIED:` (source precedence level 5). No doc in this repo links or cites this repo's `.planning/`.

The regex is the minimum. `node scripts/check-docs.mjs` also rejects a bullet whose path contains `*`, `?`, `[`, `{`, `}`, `:` or a `..` segment, a bullet whose path does not exist in `$PB_REPO`, and a directory bullet without the trailing `/` or a file bullet with one.

Further check-docs rules:

- `template-var`: AGENTS.md, CLAUDE.md and SKILL.md contain no `{{` or `~{`. Theia 1.76 leaves them literal, so they belong in agent.md or a prompttemplate file.
- `registry-count`: the number of `UNVERIFIED: ` markers in docs/ equals the number of U-### rows in docs/UNVERIFIED.md.
- `index-reach`: docs/INDEX.md links every top-level doc and both directory READMEs, and each directory README links every file in its directory.
- `recipe-count`: docs/recipes/README.md lists each recipe once, with that recipe's own PB core edits count.
- `bare-pb-path`: a backticked PB path in docs/ or an entry file starts with `$PB_REPO/`. Paths under `scripts/`, `docs/` and `.planning/` are not checked, because this repo has the same directory names.

Levels:

- `source-read` means the facts were read in PB source at the stamped commit and nothing was executed.
- `run` means the doc's commands and verify steps were also executed against a PB build at the stamped commit and behaved as written.

Stamping rules:

- Get the sha with `git -C "$PB_REPO" rev-parse --short HEAD` when you verify.
- Each doc carries its own stamp. Different docs may name different commits.
- Advance a stamp only after reading `git -C "$PB_REPO" diff <old-sha> HEAD --` followed by the doc's Source files paths, and re-checking every fact that diff touches.
- Never move stamps in bulk.
- The stamp date is the UTC date of the verification run (`date -u +%F`). Every doc in one wave uses that rule.
- `docs/INDEX.md` and `docs/UNVERIFIED.md` hold no PB fact of their own: they link to docs or copy their markers. Their line 3 stamp is not advanced when the docs they point to are restamped.
- When the PB working tree has uncommitted changes in a Source file, verify against `git -C "$PB_REPO" show HEAD:<path>`, not the working copy.

Entry files carry no commit sha. To check freshness they tell the reader to run the drift check, `node scripts/check-drift.mjs`.

Files in `docs/_templates/` carry the placeholder stamp `> Verified against PB {sha} on {YYYY-MM-DD}. Level: {source-read|run}`. It fails the regex on purpose, so a copy whose stamp was not filled in fails the doc check.

## Markers

- `UNVERIFIED:` — prefixes a statement that was read in PB source or docs but not confirmed (not run, or the source is ambiguous). Written form: `UNVERIFIED: <claim>. Verify: <command or file to read>.` An agent does not build on it without checking PB source or asking the user.
- `GAP:` — prefixes a statement that PB lacks a capability, after a search. Written form: `GAP: <capability> does not exist in PB. Checked: <search command or files read>.` An agent stops and tells the user what PB core would need, and does not work around it.
- `NOT COVERED:` — labels an area the author did not read; the doc makes no claim about it. Written form: `NOT COVERED: <area or $PB_REPO path>`, mainly in the `Not read:` header list. An agent reads PB source before relying on anything in that area.
- `ILLUSTRATIVE:` — labels example code that is not PB code and was never compiled or run. Written as a one-line paragraph starting `ILLUSTRATIVE:` directly before the code block. Every code block that is not a verbatim PB source quote or a command to run carries it. An agent confirms each API in it against PB source before copying it.

The canonical token of each marker is the backticked text above, colon included; checks match it exactly.

The recipe step label `**PB core edit**` marks a step that changes a file in `$PB_REPO`; that step needs the user's explicit approval first. Other docs use these markers and this label without redefining them.

## Citing PB code

Cite PB code by symbol plus path. Example: `PowerBrowserAPI.openStockTab` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`.

A symbol is one of:

- a class or object member
- a function
- an exported constant
- an actor message `kind` string
- a pref name
- a verify row label
- a command id
- a CSS class

For a non-code file, cite the path plus the key, table, row label or heading.

Never cite a line number, a line range, or a line anchor in a URL. PB changes daily and those references go stale.

Rules:

- The reader confirms a citation with `grep -n '<symbol>' "$PB_REPO/<path>"`.
- A negative claim (`GAP:`) records the search that was run.
- A short verbatim quote of PB source carries its path and symbol.

## Paths and links

- `$PB_REPO` is the root of a PB core checkout. Tools read it from the environment variable `PB_REPO`; when that is unset they use `../Power-Browser` relative to the root of this repo.
- Shell commands in docs use `"$PB_REPO"` directly and have no fallback. Run this line once from the root of this repo before you run any of them:

```sh
export PB_REPO="$(cd "${PB_REPO:-../Power-Browser}" && pwd)"
```

- Every PB path is written `$PB_REPO/<path>` in prose, lists and commands.
- Paths in this repo are repo-relative with no prefix, for example `docs/09-tabs-reference.md` and `extensions/<name>/`.
- No absolute home-directory path and no tilde-relative path appears in any doc or entry file. Find violations with this command:

```sh
grep -rnE '/(home|Users)/|[~]/' docs AGENTS.md CLAUDE.md .agents .prompts
```

- Links between docs are relative to the linking file and use heading anchors; for example `[Access matrix](09-tabs-reference.md#access-matrix)`.
- Links stay inside docs/ (no link to AGENTS.md, `.planning/` or any file outside docs/), so docs/ can be copied as one directory into a bundle.
- PB files are never linked; name them as backticked `$PB_REPO/` paths.
- A file that does not exist yet is named as a backticked path, not linked.
- Shared rule blocks contain no relative links, because they are copied into files at different directory depths.

## Source precedence

1. PB source code at PB HEAD (`$PB_REPO`)
2. PB `CLAUDE.md` (`$PB_REPO/CLAUDE.md`)
3. PB docs (`$PB_REPO/docs/`)
4. PB `README.md` (`$PB_REPO/README.md`)
5. PB planning files (`$PB_REPO/.planning/`)
6. These docs (this repo's `docs/` and entry files)

Rules:

- When two sources disagree, trust the higher one. Record the disagreement in [CONFLICTS.md](CONFLICTS.md) and report the doc fact as described in [FEEDBACK.md](FEEDBACK.md).
- PB `.planning/` files are reading aids that can lag. A fact taken only from them is marked `UNVERIFIED:`.

## Shared rule blocks

[The shared rules file](_shared/RULES.md) is the only source of three blocks: `stop-and-ask`, `hard-rules` and `footer`. Every carrier copies them verbatim.

- A block sits between a start line `<!-- BEGIN pb-rules:<name> -->` and an end line `<!-- END pb-rules:<name> -->`, each alone on its own line. `<name>` is `stop-and-ask`, `hard-rules` or `footer`.
- A copy is the lines strictly between the two markers and is byte-identical to the source.
- `stop-and-ask` goes in every doc made from a template in `docs/_templates/` and in the entry files except CLAUDE.md, which gets it through its `@AGENTS.md` import.
- The full `hard-rules` block goes only in `docs/_shared/RULES.md` (the source), AGENTS.md, SKILL.md, agent.md and this file.
- `footer` is the last three lines of every doc under docs/ and of `.prompts/project-info.prompttemplate`.
- Recipes, subsystem references, `docs/10-changing-pb-core.md` and `.prompts/project-info.prompttemplate` carry a one-line hard-rules pointer instead of the full block, to keep the recipe budget for steps. In docs, copy the pointer line from the template unchanged. Outside docs/, name `docs/_shared/RULES.md` as a backticked path. The pointer line is not quoted here, because its relative link would not resolve from docs/.
- A file that carries a block copy does not list the block's PB files in its own `Source files:`. The stamp and `Source files:` of `_shared/RULES.md` cover every copy.
- Blocks contain no headings and no relative links.
- To change a block, edit `docs/_shared/RULES.md` first, then copy the new block into every file that carries it, in the same commit.

Extract a block with this command (`n` is the block name):

```sh
awk -v n=stop-and-ask '$0 == "<!-- END pb-rules:" n " -->" {f=0} f {print} $0 == "<!-- BEGIN pb-rules:" n " -->" {f=1}' FILE
```

`node scripts/check-docs.mjs` compares every copy with the source.

This file carries the full `hard-rules` block:

<!-- BEGIN pb-rules:hard-rules -->
**PB hard rules (binding).** They summarize `$PB_REPO/CLAUDE.md` and the PB files and checks named below; read `$PB_REPO/CLAUDE.md` for the full text. Run the commands named here from `$PB_REPO`.

1. **Never fork or patch Theia core.** Theia additions are `@powerbrowser/*` extensions. Consume `@theia/*` as npm dependencies pinned to the release named in `$PB_REPO/theia/applications/browser/package.json`. Never vendor or edit them. `$PB_REPO/scripts/diff-theia-core.sh` is the check.
2. **Never modify Gecko outside the patch stack.** Never hand-edit `$PB_REPO/upstream/`. Firefox internals are reached only through `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, and every touchpoint is catalogued in `$PB_REPO/powerbrowser/INTERNAL-APIS.md` (`$PB_REPO/scripts/check-internals-boundary.sh`).
3. **Design for the bridge.** Nothing may weld Theia to full-window presentation. `TabUriRegistry`'s exported shape is asserted (`$PB_REPO/scripts/verify-registry-shape.mjs`).
4. **The repo path must contain no space character.** A space breaks every native link step.
5. **Theia is the default GUI, and stock browser chrome stays reachable.** No custom browser chrome is authored: no tab strip, toolbar, address bar or menu of our own outside Theia.

Also binding:

- Verification has one driver, `$PB_REPO/scripts/verify-platform.sh`. To add a check, append one `"label|command"` row. Never create a sibling driver. Never assert on the absence of a log line you emit yourself. Derive expectations from the tree, and give each check a `--self-test`.
- `node scripts/scan-brand-residue.mjs` must exit 0. It reads `git ls-files`, so stage new files first. Name the originating product only in `$PB_REPO/inventory/brand-tokens.json`.
- Patches are regenerated, never text-edited.
- User-facing text contains no internal identifiers (pref key, port, sentinel, raw exception). Name the product "PowerBrowser" and end every error with an on-screen next step.
- Builds run in Nix dev shells: `nix develop .#theia` for `$PB_REPO/theia/` (yarn fails in the host shell) and `nix develop .#firefox` for `$PB_REPO/upstream/`.
- Every new outbound host needs a row in `$PB_REPO/powerbrowser/endpoint-allowlist.json` (`$PB_REPO/scripts/verify-endpoints.sh`).
- Theia DI binds are static at module load: a contribution bound after first enumeration is never seen (header comment of `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts`). Only chrome writes `tabs.sqlite`: the single writer is `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (`$PB_REPO/docs/TAB-STORE.md`). Never open it for writing.
<!-- END pb-rules:hard-rules -->

## Size budgets

1 KB is 1024 bytes. A budget counts the whole file, shared blocks included. Recipes and subsystem references carry the hard-rules pointer instead of the full block, so the recipe budget leaves room for steps.

- AGENTS.md: 8192 bytes
- `.prompts/project-info.prompttemplate`: 3072 bytes
- `.agents/skills/powerbrowser-extensions/SKILL.md`: body 500 lines, `description` 600 characters
- each recipe in docs/recipes/: 6144 bytes
- each subsystem reference in docs/subsystems/: 25600 bytes
- `docs/INDEX.md`: 4096 bytes

`.claude/CLAUDE.md` (generated by GSD, about 24 KB) is exempt because it is Claude-only and never bundled. A file not in this list has no byte budget.

Measuring commands:

```sh
wc -c < AGENTS.md
awk '/^---$/ && f<2 {f++; next} f==2 {n++} END {print n+0}' .agents/skills/powerbrowser-extensions/SKILL.md
sed -n 's/^description: *//p' .agents/skills/powerbrowser-extensions/SKILL.md | tr -d '\n' | LC_ALL=C.UTF-8 wc -m
```

The first prints bytes (use the same form for any file), the second the body lines of SKILL.md, the third the characters of its `description`. The `description` value is written on the `description:` line itself, on one line; a folded or block value (`>`, `|`, `>-`, `|-`) is not allowed, because the third command measures only that line. `node scripts/check-docs.mjs` enforces the budgets and fails such a value.

## Templates

Two templates exist: [the subsystem template](_templates/subsystem.md) and [the recipe template](_templates/recipe.md). To start a doc:

1. Copy the template to `docs/subsystems/<name>.md` or `docs/recipes/<name>.md`. Use a lowercase hyphenated name with no number prefix.
2. Fill the stamp as described in `## Doc header`.
3. Replace every `{placeholder}`.
4. Delete every comment that starts with `<!-- template:`.
5. Keep the section order. Omit a section that does not apply instead of filling it with invented rows.
6. Keep the shared blocks and the hard-rules pointer line unchanged.

## Style

- Plain direct technical English; no metaphors, idioms or figurative phrases.
- Flat lists, one item per line; tables only for matrices.
- Exact identifiers in backticks: symbols, paths, commands, pref names, message kinds.
- One fact lives in one file; other docs link to it instead of restating it.
- Write "PowerBrowser" on first use, then "PB".
- State a pinned version only next to the PB file that pins it.
- Keep headings stable, because other docs link to their anchors; rename a heading only together with every link to it.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
