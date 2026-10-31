# Build system

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/flake.nix`
- `$PB_REPO/theia/package.json`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/scripts/smoke-theia.sh`
- `$PB_REPO/scripts/smoke-firefox.sh`
- `$PB_REPO/scripts/toolchain-baseline.sh`
- `$PB_REPO/scripts/download-plugins.mjs`
- `$PB_REPO/toolchain-baseline.txt`
- `$PB_REPO/docs/BUILD.md`
- `$PB_REPO/powerbrowser/packaging/package-linux.sh`

Not read:
- NOT COVERED: `$PB_REPO/upstream/`
- NOT COVERED: `$PB_REPO/generated/`
- NOT COVERED: `$PB_REPO/objdir/`
- NOT COVERED: `$PB_REPO/objdir-release/`
- NOT COVERED: `$PB_REPO/theia/node_modules/`
- NOT COVERED: `$PB_REPO/.mozbuild/`

Status: working

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

PB files read for this doc: `$PB_REPO/flake.nix` (`theia` and `firefox` devShells, `nodejs`, inkscape pin), `$PB_REPO/theia/package.json` (`build:extensions`, `build`, `start`), `$PB_REPO/theia/applications/browser/package.json` (`build`, `start`, `download:plugins`), `scripts/download-plugins.mjs`, `scripts/smoke-theia.sh`, `scripts/smoke-firefox.sh`, `scripts/toolchain-baseline.sh`, `$PB_REPO/toolchain-baseline.txt`, `scripts/verify-platform.sh` (`smoke-theia`, `smoke-firefox`, `diff-theia-core`, `theia-build-order` rows), `docs/BUILD.md` (full procedure, tiers, timings), `$PB_REPO/powerbrowser/packaging/package-linux.sh`. Not read: the gitignored checkouts, outputs, and installs above; no build was run.

## What it is

- Two shells build two halves: `nix develop .#theia` builds the Theia sidecar and runs the generator; `nix develop .#firefox` builds the Gecko shell. Using the wrong shell means the tool needed is absent.
- The Theia half compiles `@powerbrowser/*` extensions and the browser app into `$PB_REPO/theia/applications/browser/lib/`. The Gecko half compiles `$PB_REPO/upstream/` into `objdir/` (and `objdir-release/` for the release variant).
- The full procedure, costs, and tiered rebuild loop live in `$PB_REPO/docs/BUILD.md`. Read it before a full Gecko compile, which BUILD.md recorded at 2388 s to 2830 s on the reference host (see [Build timings](#build-timings-carried-attributions)). This doc maps the surface, it does not replace that procedure.
- Packaging (`$PB_REPO/powerbrowser/packaging/package-linux.sh`) stages the sidecar, the pinned Node runtime, and the distribution policies into the packaged app dir after both builds.

## Where its data lives

- `$PB_REPO/theia/`: the tracked workspace (`$PB_REPO/theia/package.json` workspaces, resolutions, `build:extensions` chain; member `package.json` files; `$PB_REPO/theia/yarn.lock`). `$PB_REPO/theia/node_modules/` is gitignored install output.
- `$PB_REPO/upstream/`: the gitignored ESR checkout the Gecko build consumes. Never hand-edited.
- `$PB_REPO/objdir/` and `$PB_REPO/objdir-release/`: gitignored build outputs (dev and release variants). Siblings of `$PB_REPO/upstream/`, never inside it.
- `$PB_REPO/.mozconfig`: the tracked Gecko build inputs, generated from the manifest. Sourced by every `./mach` invocation.
- `$PB_REPO/generated/`: gitignored generator output consumed by both builds (branding tree, identity carrier, fragments).
- `$PB_REPO/toolchain-baseline.txt`: the pinned Gecko toolchain record `scripts/toolchain-baseline.sh` regenerates and the rebase procedure diffs against.

## Access matrix

| Layer | Read | Write | API |
| --- | --- | --- | --- |
| Theia builder | `$PB_REPO/theia/`, `$PB_REPO/generated/` | sidecar bundle | `build:extensions`, `build`, `start` in `$PB_REPO/theia/package.json` |
| Gecko builder | `$PB_REPO/upstream/`, `$PB_REPO/.mozconfig` | `$PB_REPO/objdir/`, `$PB_REPO/objdir-release/` | `nix develop .#firefox`, `./mach build` run from the `$PB_REPO/upstream/` checkout (see `$PB_REPO/docs/BUILD.md`) |
| Verifier | both halves, tracked files | none | `smoke-theia`, `smoke-firefox`, `diff-theia-core`, `theia-build-order` rows in `$PB_REPO/scripts/verify-platform.sh` |
| Downstream reader | `$PB_REPO/docs/BUILD.md` | none | tier selection: file kind decides the rebuild cost |

## APIs by layer

- `theia` devShell in `$PB_REPO/flake.nix`: Node 24, yarn, Python, inkscape at the pinned version (the generator rasterises through the system inkscape, and only the pinned version reproduces the tracked PNG bytes), plus the `drivelist` node-gyp path. `yarn` works only here; plain `node` works outside, except the generator.
- `firefox` devShell in `$PB_REPO/flake.nix`: the full Gecko toolchain (clang, rustc, cargo, cbindgen, sccache) matched to the Firefox version nixpkgs builds. Sets `MOZBUILD_STATE_PATH` repo-local, unsets bare assembler env vars, and exports `RUSTC_WRAPPER=sccache`.
- `build:extensions` in `$PB_REPO/theia/package.json`: the hand-ordered extension build chain (branding, token-gate, tab-uris, customize, telemetry, modes, chrome-bar). A new extension appends its `yarn --cwd extensions/<name> build` to the end of this string.
- `build` in `$PB_REPO/theia/package.json`: `build:extensions` plus the app build (`theia rebuild:browser`, `download:plugins`, `theia build`).
- `download:plugins` in `$PB_REPO/theia/applications/browser/package.json`: `node ../../../scripts/download-plugins.mjs`, which installs every declared `[[extensions]]` entry at its sha256 pin and unpacks it beside its archive. The tracked `theiaPlugins` block is the declaration the pin gate hashes.
- `start` in `$PB_REPO/theia/applications/browser/package.json`: sets `VSX_REGISTRY_URL` and `THEIA_CONFIG_DIR`, then runs `theia start`. A bare start without a token exits 78 outside the supervisor; see [PowerBrowser conflicts register](../CONFLICTS.md#cf-02).
- `scripts/smoke-theia.sh`: the sidecar gate. Installs with `--ignore-scripts --frozen-lockfile`, rebuilds `drivelist`, builds the app, proves `node-pty` spawns, and boots the backend on its port.
- `scripts/smoke-firefox.sh`: the Gecko gate. Proves `$PB_REPO/upstream/` is at the pin, runs the full compile, and proves `./mach run --version` reports the tree's version. Manual-only: it takes hours, never a per-commit gate.

## Events and change signals

- `smoke-theia: PASS` means the sidecar installs, builds, and boots at the pinned toolchain. A `FAIL` names the missing artifact or the skipped constraint.
- `smoke-firefox: PASS` means the full Gecko compile finished and reports the tree's version. The build log lands under `$PB_REPO/.mozbuild/`.
- `scripts/toolchain-baseline.sh` prints the rustc, cargo, and cbindgen versions; the rebase diffs them against `$PB_REPO/toolchain-baseline.txt`.
- `diff-theia-core` passing means no file under `@theia/*` was edited; `theia-build-order` passing means the extension chain order holds.

## Commands, settings and ids

- Theia shell: `nix develop .#theia` from `$PB_REPO`. Inside it: `cd theia`, `yarn install --ignore-scripts --frozen-lockfile`, `(cd node_modules/drivelist && node-gyp rebuild)`, `yarn build`, `POWERBROWSER_TOKEN=<random value> yarn start` (a bare `yarn start` exits 78; see [PowerBrowser conflicts register](../CONFLICTS.md#cf-02)).
- Generator: `nix develop .#theia --command node scripts/generate.mjs` from `$PB_REPO`, before `./mach configure`. See [PowerBrowser conflicts register](../CONFLICTS.md#cf-05).
- Gecko shell: `nix develop .#firefox` from `$PB_REPO`. Inside it, from `$PB_REPO/upstream/`: `MOZCONFIG=../.mozconfig ./mach build`, `MOZCONFIG=../.mozconfig ./mach run`. Release variant: `POWERBROWSER_OBJDIR=objdir-release POWERBROWSER_BRANDING=powerbrowser/branding/release MOZCONFIG=../.mozconfig ./mach build`.
- Fetch first: `scripts/fetch-upstream.sh` runs from the repo root with only `git`; it is not run inside either shell. Generate before fetching; see [PowerBrowser conflicts register](../CONFLICTS.md#cf-06).
- Packaging: `nix develop .#firefox --command bash powerbrowser/packaging/package-linux.sh` from the repo root, after a Gecko build and a Theia `yarn build`.
- Commit gate: `scripts/verify-platform.sh --quick` (static checks only, no build). Full tier adds the build-backed rows.

## Limits and rules

- `yarn` does not work outside the Theia shell. Plain `node` does, except the generator, which needs the shell's inkscape.
- Never hand-edit `$PB_REPO/upstream/`, never edit `@theia/*` packages, and never hand-edit `$PB_REPO/generated/`. The `diff-theia-core`, patch-surface, and byte-identity gates each fail their own violation.
- The repo path must contain no space character: a space breaks every native link step in both halves.
- `objdir/` is a sibling of `$PB_REPO/upstream/`, never inside it. `.mozbuild/` holds repo-local build state (`MOZBUILD_STATE_PATH`).
- A full Gecko compile takes on the order of an hour on the reference host; select the rebuild tier by what changed instead of recompiling.

## Verification

- `scripts/verify-platform.sh --only smoke-theia` boots the sidecar gate (install, build, spawn proof, boot check).
- `scripts/verify-platform.sh --only smoke-firefox` runs the full Gecko gate (pin proof, compile, version proof). Manual-only.
- `scripts/verify-platform.sh --only diff-theia-core` proves Theia core is untouched.
- `scripts/verify-platform.sh --only theia-build-order` proves the extension chain order.
- `scripts/verify-platform.sh --quick` is the commit gate: static checks only, no build, no browser, no display.

## PB docs and deltas

- `$PB_REPO/docs/BUILD.md`: the full procedure. Prerequisites, the Theia half (install flags, drivelist rebuild, extension chain, re-pin runbook), the Firefox half (fetch, generate, configure, build, run), the tiered rebuild loop with measured timings, and the re-verify record. This doc maps to its sections instead of restating them.
- Timings are carried attributions from `$PB_REPO/docs/BUILD.md`, never fresh measurements here. They are listed in [Build timings](#build-timings-carried-attributions) with the tree, host and date that BUILD.md states for each. Carried numbers are not re-measured on this runner.
- `$PB_REPO/docs/REBRANDING.md`: the branded-build sequence (generate, fetch, edit, build, verify) and the per-field reference. Branding is build-time only: there is no hot rebrand.
- Disagreements that touch the build live in [PowerBrowser conflicts register](../CONFLICTS.md#cf-02) (token gate vs bare start), [PowerBrowser conflicts register](../CONFLICTS.md#cf-05) (generator shell), and [PowerBrowser conflicts register](../CONFLICTS.md#cf-06) (generate before fetch); this doc follows them.

## Build timings (carried attributions)

Every figure in this section is copied from `$PB_REPO/docs/BUILD.md`. At PB `5571d3d` the figures are unchanged from `3e8d991`: the only later BUILD.md change, in `9f26863`, adds a logic-patch section and edits no timing row. None was measured for this doc, and no build ran on this runner. BUILD.md states the tree, host and date for each figure, and the table keeps them. A new measurement is comparable only to a figure with the same tree, host and toolchain (`$PB_REPO/toolchain-baseline.txt`), as BUILD.md says.

| Step | Tree, host and date (as BUILD.md states) | Command | Carried figure | Source in BUILD.md |
| --- | --- | --- | --- | --- |
| Tier 1, no build | `legion`, 2026-08-22; tree not named | `MOZCONFIG=../.mozconfig ./mach run --version` inside `nix develop .#firefox` from `$PB_REPO/upstream/`, on a symlinked file | 1.05 s wall (mach's own timer 0.73 s) | "Tier 1" |
| Tier 2, `faster` | `legion`, 2026-08-22; tree not named | `MOZCONFIG=../.mozconfig ./mach build faster`, on a touched preprocessed file | 1.84 s warm (the cold first run took 20 s) | "Tier 2" |
| Tier 3, full build, dev | Power Browser tree, `legion`, 2026-08-30 | `scripts/smoke-firefox.sh` (runs `./mach build`) | 2830 s (about 47 min) | Tier-3 table, row #3 |
| Tier 3, full build, dev | Power Browser tree at `FIREFOX_153_5_0esr_BUILD1`, `legion`, 2026-10-16, after `./mach clobber` | `scripts/smoke-firefox.sh` | 2388 s (about 40 min) | Tier-3 table, row #4 |
| Tier 3, full build, release | Power Browser tree at `FIREFOX_153_5_0esr_BUILD1`, `legion`, 2026-10-16, after `./mach clobber` | `POWERBROWSER_OBJDIR=objdir-release POWERBROWSER_BRANDING=powerbrowser/branding/release MOZCONFIG=../.mozconfig ./mach build` | 2620 s (about 44 min) | Tier-3 table, row #5 |
| Fetch the upstream checkout | `legion`, 2026-08-30; 5.6 G `$PB_REPO/upstream/` | `scripts/fetch-upstream.sh` | 677 s (network-bound) | Firefox half |

BUILD.md also records two tier-3 builds of the upstream project tree, before the rename, on `legion` on 2026-08-21: 2368 s (dev) and 2822 s (release). Their tree differs from the rows above, so BUILD.md says not to read them as the same measurement.

Tier-3 triggers, as BUILD.md states them: a change to a compiled define (`$PB_REPO/patches/010-powerbrowser-identity.patch`, or a `--with-*` or `--enable-*` option in `$PB_REPO/.mozconfig`), any `$PB_REPO/.mozconfig` change, and any file that is neither symlinked into `objdir/dist/bin` nor preprocessed. Symlinked files (`.js`, `.ftl`, branding PNG) are tier 1. Preprocessed frontend files are tier 2.

## Gaps

- The build timings are carried from BUILD.md and were not re-measured for this doc. The newest tier-3 row is dated 2026-10-16.
- No other gaps: every build-system capability this phase searched for exists in the two shells, the yarn and mach chains, the smoke gates, or the packaging script above. Checked: shell contents in `$PB_REPO/flake.nix`, the `build:extensions` chain, the `download:plugins` step, both smoke scripts, and the packaging script.

## Unsettled items

- None: every build-system claim above was read in `$PB_REPO/flake.nix`, the Theia package.json files, the smoke and packaging scripts, or `$PB_REPO/docs/BUILD.md` at the stamp.

## Recipes that touch this

No recipes yet; the build-and-release core recipes land in Phase 17.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
