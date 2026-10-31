# PowerBrowser conflicts register

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/CLAUDE.md`
- `$PB_REPO/README.md`
- `$PB_REPO/docs/BUILD.md`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`
- `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts`
- `$PB_REPO/theia/package.json`
- `$PB_REPO/flake.nix`
- `$PB_REPO/scripts/fetch-upstream.sh`
- `$PB_REPO/docs/REBRANDING.md`
- `$PB_REPO/powerbrowser/shell/powerbrowser.js`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx`
- `$PB_REPO/scripts/lib/config-schema.json`
- `$PB_REPO/scripts/verify-webextensions.mjs`
- `$PB_REPO/scripts/verify-search-engines.mjs`
- `$PB_REPO/scripts/verify-extension-pins.mjs`
- `$PB_REPO/scripts/verify-ng-064-update-url.mjs`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/powerbrowser/distribution/policies.json`
- `$PB_REPO/docs/URI-SCHEMES.md`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts`
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/patches/050-extension-tab-host.patch`
- `$PB_REPO/scripts/check-patch-surface.sh`
- `$PB_REPO/.gitignore`

This file lists the places where a PowerBrowser (PB) doc or planning file disagrees with PB source or with a higher-ranked PB file, in a way that changes what an agent does. Each entry names the side these docs follow.

To use an entry, act on the side named in its Follow field. Before acting, run the export line in [Paths and links](CONVENTIONS.md#paths-and-links) from the root of this repo, so that `PB_REPO` names a PB checkout; with `PB_REPO` empty, `git -C` reads the current directory instead. Then run every command in the entry's Check field and judge each one by its exit status, not by its output:

- 0 from every command: the cited PB text still stands at your PB HEAD. Act on the Follow field.
- 1 from any command: PB changed that side since the stamp. Re-read the entry's PB files before acting.
- Any other status, or an error message such as `fatal:`: the command failed. Correct `PB_REPO` and run it again; a failed command says nothing about PB.

The Check commands do not re-test every source side. `node scripts/check-drift.mjs docs/CONFLICTS.md` lists the files in `Source files:` that changed since the stamp.

Fields of an entry:

- Side fields: one PB file each, its precedence step, the section heading or symbol cited, and what that file says.
- Follow: the side these docs follow, and what an agent does.
- Rule: the precedence step that decided it, and the step it ranks above.
- Used by: the docs and entry files of this repo that state the followed side.
- Check: one or more commands. Each exits 0 while the PB text it tests stands and 1 once PB changes that text. They test the side whose change would resolve the conflict: the side these docs do not follow or, when that side is a decision record that PB keeps after the change, the followed source side. They also test every side under `$PB_REPO/.planning/`.

The order of sources is [Source precedence](CONVENTIONS.md#source-precedence). Files under `$PB_REPO/.planning/` are named in entries but not in `Source files:`, because PB edits them several times a day and the drift check would flag this file on almost every PB commit; the Check commands re-test each planning side instead.

An entry id `CF-NN` is never reused or renumbered, so links to `#cf-nn` stay valid.

Survey scope: `$PB_REPO/README.md`, `$PB_REPO/CLAUDE.md`, every top-level `.md` file in `$PB_REPO/docs/`, and `$PB_REPO/.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md` and `STATE.md`, all read at PB 7da3e4d. At the later stamp commit each entry was re-checked against its cited files and its Check commands; the survey was not repeated. Not surveyed: `$PB_REPO/.planning/milestones/` and the subdirectories of `$PB_REPO/docs/`.

## CF-01

PB's planning file calls PB a Firefox fork; PB's instructions and README say it is a patch-set repo and not a fork.

- Side 1: `$PB_REPO/CLAUDE.md` (step 2), section "Power Browser — project instructions": PB is "a Gecko shell (patch-set repo, never a Firefox fork)"; section "2. Never modify Gecko outside the patch stack" says the upstream checkout "is never hand-edited".
- Side 2: `$PB_REPO/README.md` (step 4), section "What this repo is": "This is not a Firefox fork. It is a patch-set repo", made of an upstream checkout pinned to an ESR tag, a small stack of patches, and PB's own tree.
- Side 3: `$PB_REPO/.planning/PROJECT.md` (step 5), section "What This Is": PB is "a Firefox-ESR fork hosting Eclipse Theia IDE"; section "Context" calls the source tree "a Zen-style fork".
- Follow: side 1 and side 2. Treat `$PB_REPO/upstream/` as an unmodified ESR checkout and never hand-edit it; make a Gecko change only as a patch in `$PB_REPO/patches/`, regenerated from a patched tree (hard rule 2 and "Patches are regenerated, never text-edited" in [Shared rule blocks](_shared/RULES.md#hard-rules)). `$PB_REPO/scripts/check-patch-surface.sh` fails any patch that targets a compiled file (`COMPILED_SUFFIXES`, for example `.cpp`, `.h` and `.rs`) or adds a brand value; a Gecko change that needs compiled code does not pass it.
- Rule: step 2 (PB `CLAUDE.md`) ranks above step 5 (PB planning files) in [Source precedence](CONVENTIONS.md#source-precedence); step 4 (PB `README.md`) agrees with step 2.
- Used by: [What PowerBrowser is](00-what-is-powerbrowser.md#summary), `AGENTS.md`, `.prompts/project-info.prompttemplate`.
- Check: `git -C "$PB_REPO" grep -n -F -e 'a Firefox-ESR fork hosting Eclipse Theia IDE' HEAD -- .planning/PROJECT.md` tests side 3.

## CF-02

PB's build doc starts the Theia backend with a bare `yarn start`, and the token gate stops that backend with exit code 78.

- Side 1: `$PB_REPO/docs/BUILD.md` (step 3), section "Theia half": the command block ends with a bare `yarn start` line, and the paragraph on the variables the `start` script sets names only `VSX_REGISTRY_URL` and `THEIA_CONFIG_DIR`.
- Side 2: `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts` (step 1), `PowerBrowserTokenGateContribution`: `initialize()` reads `TOKEN_DISABLE_ENV_VAR` (`POWERBROWSER_TOKEN_DISABLE`) and `TOKEN_ENV_VAR` (`POWERBROWSER_TOKEN`) from `POWERBROWSER_ENV`; when the first is not `"1"` and the second is unset or empty, it writes a FATAL line to stderr and calls `process.exit(78)` before the HTTP server binds.
- Side 3: `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts` (step 1), `POWERBROWSER_ENV`: at module load it copies every `POWERBROWSER_*` variable out of `process.env` and deletes it there; only on a supervised launch (`POWERBROWSER_SUPERVISED=1`) does it replace `POWERBROWSER_TOKEN` with the first line read from stdin.
- Side 4: `$PB_REPO/theia/applications/browser/package.json` (step 1), `start`: sets `VSX_REGISTRY_URL` and `THEIA_CONFIG_DIR`, then runs `theia start`; it sets no `POWERBROWSER_*` variable.
- Follow: side 2, side 3 and side 4. To run a Theia backend outside PB's supervisor for local development, give it a token: run `POWERBROWSER_TOKEN=<random value> yarn start` from `$PB_REPO/theia/` inside `nix develop .#theia`, and send the cookie `POWERBROWSER_TOKEN=<same value>` for `127.0.0.1` with every request (`POWERBROWSER_TOKEN_COOKIE_NAME` in `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`; `POWERBROWSER_ENV` in `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts` copies the variable on an unsupervised launch). `POWERBROWSER_TOKEN_DISABLE=1 yarn start` turns the gate off instead: `PowerBrowserTokenGateContribution.initialize` calls it a legacy-dev bypass for `$PB_REPO/scripts/smoke-theia.sh` and `$PB_REPO/scripts/verify-platform.sh` only, and the header comment of `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts` describes an ungated backend as a loopback server with arbitrary file access and terminal spawn. Use the bypass only for a smoke-style run, stop that backend afterwards, and never set it in shipped code or a supervised launch.
- Rule: step 1 (PB source code) ranks above step 3 (PB docs) in [Source precedence](CONVENTIONS.md#source-precedence).
- Used by: [What PowerBrowser is](00-what-is-powerbrowser.md#build-test-and-release), [Theia backend](04-theia-backend-rpc-http.md#backend-handshake-supervisor---backend), [Building a PowerBrowser extension](08-building-an-extension.md#development-loop).
- Check: `git -C "$PB_REPO" grep -n -E -e '^yarn start$' HEAD -- docs/BUILD.md` tests side 1.

## CF-03

PB's instructions send the reader to the requirements file for scope and say four hard rules bind through its Out of Scope section, but that section lists one hard rule and no AI rows; the AI scope rows are in the project file.

- Side 1: `$PB_REPO/CLAUDE.md` (step 2), section "Hard rules": "Four of them are also binding through" the *Out of Scope* section of `REQUIREMENTS.md`; the title paragraph says to read `.planning/REQUIREMENTS.md` "for what is in and out of scope".
- Side 2: `$PB_REPO/.planning/REQUIREMENTS.md` (step 5), section "Out of Scope": the table holds one hard-rule row, "Patching Theia core" (hard rule 1), and no row on AI assistants or on Theia's AI framework.
- Side 3: `$PB_REPO/.planning/PROJECT.md` (step 5), section "Out of Scope": lists "DSH (DeepSeek Harness) and any AI assistant integration" and "Customising Theia's AI framework" (RM-02).
- Follow: side 1 for the hard rules and side 3 for the AI scope. All five hard rules bind as [Shared rule blocks](_shared/RULES.md#hard-rules) states them, with rule 5 read as in [CF-08](#cf-08), whatever the requirements table lists. UNVERIFIED: PB keeps AI assistant integration and changes to Theia's AI framework out of PB core. Verify: read `$PB_REPO/.planning/PROJECT.md` section "Out of Scope" at your PB HEAD. Ask the user before adding AI tools, agents, model providers or MCP configuration to PB core (stop-and-ask in [Shared rule blocks](_shared/RULES.md#stop-and-ask)).
- Rule: step 2 (PB `CLAUDE.md`) ranks above step 5 (PB planning files) in [Source precedence](CONVENTIONS.md#source-precedence) for the hard rules; for the AI rows it is step 5 on both sides; precedence does not rank them, so the planning-only fact is followed as `UNVERIFIED:`.
- Used by: [Choosing a surface](00-choosing-a-surface.md#capability-gaps-no-surface-supports-these-yet), [Theia plugins and Theia AI](06-theia-plugins-and-ai.md#what-it-is), [Automation and disabled surfaces](07-automation-and-disabled-surfaces.md#rules-and-constraints).
- Check: `git -C "$PB_REPO" grep -n -F -e 'Four of them are also binding through' HEAD -- CLAUDE.md` and `test "$(git -C "$PB_REPO" show HEAD:.planning/REQUIREMENTS.md | awk '/^## Out of Scope/{f=1;next} /^#/{f=0} f' | grep -c -w -E 'Hard rule|AI')" = 1`, `git -C "$PB_REPO" grep -n -F -e 'DSH (DeepSeek Harness) and any AI assistant integration' HEAD -- .planning/PROJECT.md` and `git -C "$PB_REPO" grep -n -F -e "Customising Theia's AI framework" HEAD -- .planning/PROJECT.md` test side 1, side 2 and side 3. The second command counts the rows of the Out of Scope table that name a hard rule or AI, and exits 1 once PB adds such a row.

## CF-04

PB's build doc names a `yarn watch` command, and no PB Theia package defines a `watch` script.

- Side 1: `$PB_REPO/docs/BUILD.md` (step 3), section "Theia half": "Phase 2 owns both only for `yarn watch`/`yarn start`", which presents `yarn watch` as a command that runs.
- Side 2: `$PB_REPO/theia/package.json` (step 1), `scripts`: defines `build:extensions`, `build` and `start`, and no `watch`.
- Side 3: `$PB_REPO/theia/applications/browser/package.json` (step 1), `scripts`: defines `rebuild`, `download:plugins`, `build` and `start`, and no `watch`.
- Follow: side 2 and side 3. Do not run `yarn watch`; it fails because no `watch` script exists (`build:extensions` in `$PB_REPO/theia/package.json` lists the extension builds). After a Theia change, run `yarn build` from `$PB_REPO/theia/` inside `nix develop .#theia`.
- Rule: step 1 (PB source code) ranks above step 3 (PB docs) in [Source precedence](CONVENTIONS.md#source-precedence).
- Used by: [Building a PowerBrowser extension](08-building-an-extension.md#development-loop).
- Check: `git -C "$PB_REPO" grep -n -F -e 'yarn watch' HEAD -- docs/BUILD.md` and `! git -C "$PB_REPO" grep -q -F -e '"watch":' HEAD -- theia/package.json theia/applications/browser/package.json` test side 1, and side 2 and side 3.

## CF-05

PB's README tells the reader to run the generator with bare `node`, and PB's flake and build doc require the Theia dev shell for it.

- Side 1: `$PB_REPO/README.md` (step 4), section "Rebranding": "Edit a value, run `node scripts/generate.mjs`", with no dev shell named.
- Side 2: `$PB_REPO/flake.nix` (step 1), `pkgs.inkscape`: the `theia` dev shell adds `pkgs.inkscape`; its comment says `$PB_REPO/scripts/generate.mjs` rasterises the brand mark SVG through the system `inkscape`, and only the pinned version reproduces the tracked PNG bytes.
- Side 3: `$PB_REPO/docs/BUILD.md` (step 3), section "Prerequisites": `$PB_REPO/scripts/generate.mjs` "must run inside" `nix develop .#theia`; bare `node` fails at the 16-pixel icon on a host without `inkscape`, and a different `inkscape` version fails the byte-identity check.
- Side 4: `$PB_REPO/CLAUDE.md` (step 2), section "Environment": `node` and the built binary "work outside a dev shell; `yarn` does not". This is a general statement that supports the bare `node` of side 1.
- Follow: side 2 and side 3. Run the generator as `nix develop .#theia --command node scripts/generate.mjs` from `$PB_REPO`, never as bare `node` on the host (`pkgs.inkscape` in `$PB_REPO/flake.nix`).
- Rule: step 1 (PB source code) ranks above step 2 (PB `CLAUDE.md`) and step 4 (PB `README.md`) in [Source precedence](CONVENTIONS.md#source-precedence); side 4 is general, and the generator is the exception that side 2 names; step 3 (PB docs) agrees with step 1.
- Used by: [What PowerBrowser is](00-what-is-powerbrowser.md#configuration-and-branding), [Firefox WebExtensions](05-webextensions.md#how-to-use), [Building a PowerBrowser extension](08-building-an-extension.md#vs-code-plugin-build-time-pinned-extensions).
- Check: `git -C "$PB_REPO" grep -n -E -e 'run .node scripts/generate\.mjs.' HEAD -- README.md` tests side 1.

## CF-06

PB's build doc runs the upstream fetch first on a fresh clone, and the fetch script fails until the generator has run.

- Side 1: `$PB_REPO/docs/BUILD.md` (step 3), section "Firefox half": the command block starts with `./scripts/fetch-upstream.sh`; section "Verifying a fresh clone" runs `./scripts/fetch-upstream.sh` directly after `git clone`, with no generate step before it.
- Side 2: `$PB_REPO/scripts/fetch-upstream.sh` (step 1), `PINS_FRAGMENT`: with no `TAG` export it reads the ESR tag from the generator's `upstream-pins.env` fragment; when that file is absent it prints a FAIL line naming `node scripts/generate.mjs` and exits 1. The generated directory is ignored by git (`/generated/` in `$PB_REPO/.gitignore`), so a fresh clone has no such file.
- Side 3: `$PB_REPO/docs/REBRANDING.md` (step 3), section "2. Generate first, before anything else": run the generator before `$PB_REPO/scripts/fetch-upstream.sh`, because the fetch reads its default tag from the `upstream-pins.env` fragment.
- Follow: side 2 and side 3. On a fresh clone, run `nix develop .#theia --command node scripts/generate.mjs` from `$PB_REPO` first, then `./scripts/fetch-upstream.sh` (`PINS_FRAGMENT` in `$PB_REPO/scripts/fetch-upstream.sh`).
- Rule: step 1 (PB source code) ranks above step 3 (PB docs) in [Source precedence](CONVENTIONS.md#source-precedence); side 1 and side 3 are both step 3, and the source decides between them.
- Used by: [What PowerBrowser is](00-what-is-powerbrowser.md#build-test-and-release).
- Check: `git -C "$PB_REPO" grep -n -F -e 'generated/upstream-pins.env' HEAD -- scripts/fetch-upstream.sh` and `git -C "$PB_REPO" grep -n -B1 -F -e './scripts/fetch-upstream.sh' HEAD -- docs/BUILD.md | grep -E -e '-([^[:alnum:]]{3}|cd <fresh-space-free-path>)$'` test side 2 and side 1. The second command prints each fetch line of side 1 that directly follows a code-fence line or the `cd` after `git clone`, so it exits 1 once PB puts a generate step before every fetch.

## CF-07

PB's planning files say the shell's `getTabForBrowser` stays null, or that a planned phase reverses that rule. PB source at the stamp has landed the reversal: the shell's `getTabForBrowser` delegates to a tab host and returns a tab node for each web-tab overlay.

- Side 1: `$PB_REPO/powerbrowser/shell/powerbrowser.js` (step 1), `getTabForBrowser`: the `window.gBrowser` stand-in delegates it to `host.getTabForBrowser`, the accessor of `PowerBrowserTabHost` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (step 1). The host returns the tab node of a browser it created for a live web-tab overlay, and `null` for any other browser, including the Theia frame.
- Side 2: `$PB_REPO/.planning/REQUIREMENTS.md` (step 5), section "Requirements — Power Browser v1.5 Chrome Bar Firefox Parity": the technical rulings say `getTabForBrowser` "keeps returning null".
- Side 3: `$PB_REPO/.planning/PROJECT.md` (step 5), section "Key Decisions": "Extensions see web tabs via patch 050 (tracker gate) + a chrome-side tab host, new Phase 31.1", which "reverses the getTabForBrowser-null / no-synthesised-tab rule"; its outcome reads "Pending — v1.5".
- Side 4: `$PB_REPO/.planning/ROADMAP.md` (step 5), section "Phase 31.1: Extension Tab Host (INSERTED)": "the getTabForBrowser-null ruling is reversed".
- Follow: side 1. `getTabForBrowser(browser)` in the shell's `window.gBrowser` stand-in (`getTabForBrowser` in `$PB_REPO/powerbrowser/shell/powerbrowser.js`) returns the `PowerBrowserTabHost` node of a web-tab overlay and `null` otherwise. Patch `$PB_REPO/patches/050-extension-tab-host.patch` opens the extension tracker gate for the tab host window. The Theia frame never gets a node, so it is absent from `tabs`, which extensions read. UNVERIFIED: installed extensions see the shell's web tabs at runtime. Verify: run the `ext-tab-host-live` row of `$PB_REPO/scripts/verify-platform.sh` on a build with patch 050, or load a temporary add-on in that build with a web tab open and call `browser.tabs.query({})` ([Firefox WebExtensions](05-webextensions.md)).
- Rule: step 1 (PB source code) ranks above step 5 (PB planning files) in [Source precedence](CONVENTIONS.md#source-precedence). Sides 2 to 4 are step 5 statements that describe the reversal as planned or pending; the source shows it landed, so they are not followed.
- Used by: [Automation and disabled surfaces](07-automation-and-disabled-surfaces.md#gotchas), [Tabs reference](09-tabs-reference.md#gaps-for-a-tab-management-extension).
- Check: `git -C "$PB_REPO" grep -n -F -e 'reverses the getTabForBrowser-null' HEAD -- .planning/PROJECT.md`, `git -C "$PB_REPO" grep -n -E -e 'getTabForBrowser. keeps' HEAD -- .planning/REQUIREMENTS.md` and `git -C "$PB_REPO" grep -n -F -e 'the getTabForBrowser-null ruling is reversed' HEAD -- .planning/ROADMAP.md` test sides 3, 2 and 4; `git -C "$PB_REPO" grep -n -A1 -F -e 'getTabForBrowser(browser) {' HEAD -- powerbrowser/shell/powerbrowser.js | grep -F -e 'return host.getTabForBrowser(browser);'`, `git -C "$PB_REPO" grep -n -F -e 'getTabForBrowser: browser => host.byBrowser.get(browser) ?? null' HEAD -- powerbrowser/shell/PowerBrowserAPI.sys.mjs` and `git -C "$PB_REPO" ls-tree --name-only HEAD patches/ | grep -q -x -F -e 'patches/050-extension-tab-host.patch'` test side 1 and the landed patch. The planning-file commands stay green until PB edits those files; the last three commands fail if PB reverts the landed delegation or the patch.

## CF-08

PB's instructions forbid a tab strip, toolbar, address bar or menu of PB's own, while PB source ships a Theia chrome bar with an address pill and navigation commands and a Theia tab strip, and a PB planning file allows stock popups in the shell window.

- Side 1: `$PB_REPO/CLAUDE.md` (step 2), section "5. Theia is the *default* GUI; stock browser chrome is reachable": "No custom browser chrome is authored. No tab strip, no toolbar, no address bar, no menu of our own. That remains true and is the Milestone 2 boundary."
- Side 2: `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts` (step 1), `CHROME_BAR_INPUT_CLASS`: the `@powerbrowser/chrome-bar` Theia extension defines back, forward, reload, new-tab and focus-address commands (`CHROME_BAR_BACK_COMMAND_ID` to `CHROME_BAR_FOCUS_ADDRESS_COMMAND_ID`) and the class of its address pill, all Theia UI.
- Side 3: `$PB_REPO/.planning/REQUIREMENTS.md` (step 5), section "Requirements — Power Browser v1.5 Chrome Bar Firefox Parity": "Rule 5 clarified: stock Firefox toolkit popups with stock strings in" the shell document "are shell furniture, not authored browser chrome"; the same file plans a hamburger menu (MENU-01) and a bookmarks toolbar (BMK-04) in the chrome bar, and new features (TAB-01 to TAB-09) for the Theia tab strip of side 4, which exists at the stamp commit.
- Side 4: `$PB_REPO/theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx` (step 1), `TabStripWidget`: a Theia `ReactWidget` that is the tab strip's Browsing home (GUI-07), "the very top of the window, above the URL row".
- Follow: side 2 and side 4, with side 1 read as hard rule 5 of these docs states it: browser UI that PB authors lives inside Theia (`TabStripWidget` in `$PB_REPO/theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx`; the chrome-bar commands in `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts`), and no tab strip, toolbar, address bar or menu of PB's own is added outside Theia, in `$PB_REPO/powerbrowser/shell/powerbrowser.xhtml` or in the stock browser window. UNVERIFIED: stock Firefox toolkit popups with stock strings may be added to the shell document as shell furniture. Verify: read `$PB_REPO/.planning/REQUIREMENTS.md` at your PB HEAD and ask the user before adding any element to `$PB_REPO/powerbrowser/shell/powerbrowser.xhtml`.
- Rule: step 1 (PB source code) ranks above step 2 (PB `CLAUDE.md`) in [Source precedence](CONVENTIONS.md#source-precedence) for the Theia chrome bar; the popup clarification rests only on step 5, so it is followed as `UNVERIFIED:` and step 2 binds until the user confirms.
- Used by: [What PowerBrowser is](00-what-is-powerbrowser.md#hard-rules), [Shared rule blocks](_shared/RULES.md#hard-rules), `AGENTS.md`.
- Check: `git -C "$PB_REPO" grep -n -F -e 'our own. That remains true and is the Milestone 2 boundary.' HEAD -- CLAUDE.md` and `git -C "$PB_REPO" grep -n -F -e 'Rule 5 clarified: stock Firefox toolkit popups' HEAD -- .planning/REQUIREMENTS.md` test side 1 and side 3; a qualifier such as "outside Theia" added after "our own" makes the first exit 1.

## CF-09

PB's project file lists `$PB_REPO/configuration.toml` sections and keys that the generator's schema does not have.

- Side 1: `$PB_REPO/.planning/PROJECT.md` (step 5), section "$PB_REPO/configuration.toml planned sections": lists `[assets]` (logo, icon source, wordmark), `[build]` (channel, release and debug defaults), a support URL under `[urls]`, a logo under `[theia]`, a display name and a version scheme under `[product]`, and an installer name under `[identity]`.
- Side 2: `$PB_REPO/scripts/lib/config-schema.json` (step 1), `keys`: its `$comment` calls it the one schema table for the generator's unknown-key check; it has no `assets.*` or `build.*` key, no `urls.support`, no `theia.logo`, no `product.display_name` or `product.version_scheme` (the display name is `identity.display_name`) and no `identity.installer_name`.
- Side 3: `$PB_REPO/docs/REBRANDING.md` (step 3), section "Reference: every `$PB_REPO/configuration.toml` field": one row per setting the schema knows; the logo is `mark.svg` in the brand directory (section "6. Drop in the logo"), and the support URL is `installer.support_url`.
- Follow: side 2 and side 3. Take every `$PB_REPO/configuration.toml` key from `$PB_REPO/docs/REBRANDING.md` or from `keys` in `$PB_REPO/scripts/lib/config-schema.json`; change the logo by replacing `$PB_REPO/brand/mark.svg`; never add an `[assets]` or `[build]` table, which the generator refuses as an unknown setting.
- Rule: step 1 (PB source code) ranks above step 5 (PB planning files) in [Source precedence](CONVENTIONS.md#source-precedence); step 3 (PB docs) agrees with step 1.
- Used by: [What PowerBrowser is](00-what-is-powerbrowser.md#configuration-and-branding).
- Check: `git -C "$PB_REPO" grep -n -F -e '[assets] logo' HEAD -- .planning/PROJECT.md` and `git -C "$PB_REPO" grep -n -F -e '[build] channel' HEAD -- .planning/PROJECT.md` test side 1.

## CF-10

PB's README and rebranding doc say a rebrand edits only `$PB_REPO/configuration.toml` and `$PB_REPO/brand/`, while PB's checks require keys that the generator does not write to be copied by hand into tracked files.

- Side 1: `$PB_REPO/README.md` (step 4), section "Rebranding": rebranding happens "through two inputs and nothing else"; "Edit a value, run `node scripts/generate.mjs`, and every derived build surface follows".
- Side 2: `$PB_REPO/docs/REBRANDING.md` (step 3), section "Rebranding Power Browser": a downstream rebrand "touches nothing else in the tree", and the companion file of section "6. Drop in the logo" is "the single exception to the two-input rule".
- Side 3: `$PB_REPO/scripts/verify-webextensions.mjs` (step 1), header comment: the `ExtensionSettings` key of the tracked `$PB_REPO/powerbrowser/distribution/policies.json` must equal the generator's `webextensions-settings.json` fragment, and "The copy-over is surgical"; `emitWebExtensionSettings` in `$PB_REPO/scripts/generate.mjs` writes only the fragment.
- Side 4: `$PB_REPO/scripts/verify-search-engines.mjs` (step 1), header comment: the `SearchEngines` key of `$PB_REPO/powerbrowser/distribution/policies.json` must deep-equal the emission from `[[search_engines]]`, which the generator writes only to its `search-engines.json` fragment.
- Side 5: `$PB_REPO/scripts/verify-extension-pins.mjs` (step 1), header comment: the `theiaPlugins` block of `$PB_REPO/theia/applications/browser/package.json` must equal the generator's `theia-plugins.json` fragment; its failure message says to "copy the theiaPlugins block over".
- Side 6: `$PB_REPO/scripts/verify-ng-064-update-url.mjs` (step 1), `NAME` (`ng064-update-url-from-manifest`): `AppUpdateURL` in `$PB_REPO/powerbrowser/distribution/policies.json` must equal `[urls] update`; the header says the browser prefers that file over `application.ini` and marks the check "Tier: full (needs the Gecko build)".
- Follow: side 3 to side 6. After changing `[urls] update`, `[[webextensions]]`, `[[search_engines]]` or `[[extensions]]` in `$PB_REPO/configuration.toml`, run `nix develop .#theia --command node scripts/generate.mjs` from `$PB_REPO`, then copy by hand (a PB core edit): `AppUpdateURL`, `ExtensionSettings` and `SearchEngines` into `$PB_REPO/powerbrowser/distribution/policies.json`, changing only those keys, and the `theiaPlugins` block into `$PB_REPO/theia/applications/browser/package.json`. Add a row to `$PB_REPO/powerbrowser/endpoint-allowlist.json` for each new `https` host of an `install_url` or a search-engine URL (header comment of `$PB_REPO/scripts/verify-webextensions.mjs`; the `search_engines[].url` row of `$PB_REPO/docs/REBRANDING.md`). Then run, from `$PB_REPO`, `node scripts/verify-webextensions.mjs`, `node scripts/verify-search-engines.mjs`, `node scripts/verify-extension-pins.mjs` and, after a Gecko build, `node scripts/verify-ng-064-update-url.mjs`.
- Rule: step 1 (PB source code) ranks above step 3 (PB docs) and step 4 (PB `README.md`) in [Source precedence](CONVENTIONS.md#source-precedence).
- Used by: [What PowerBrowser is](00-what-is-powerbrowser.md#summary), [Choosing a surface](00-choosing-a-surface.md), [Firefox WebExtensions](05-webextensions.md#how-to-use), [Theia/VS Code plugins and Theia AI](06-theia-plugins-and-ai.md#a-ship-a-pinned-vs-code-extension-with-the-build), [Building a PowerBrowser extension](08-building-an-extension.md#vs-code-plugin-build-time-pinned-extensions).
- Check: `git -C "$PB_REPO" grep -n -F -e 'derived build surface follows' HEAD -- README.md`, `git -C "$PB_REPO" grep -n -F -e 'and touches nothing else in' HEAD -- docs/REBRANDING.md` and `git -C "$PB_REPO" grep -n -F -e 'single exception to the two-input rule' HEAD -- docs/REBRANDING.md` test side 1 and side 2.

## CF-11

PB's instructions and URI-schemes doc say the stock browser window opens through `window.open` with no chrome-side handler, while PB source sends the request to chrome, which adds a tab to an existing stock window.

- Side 1: `$PB_REPO/CLAUDE.md` (step 2), section "5. Theia is the *default* GUI; stock browser chrome is reachable": the stock window "opens via `window.open(url, '_blank')` from the Theia frontend", and "No chrome-side command is registered, and that absence is the ratified design, not an omission."
- Side 2: `$PB_REPO/docs/URI-SCHEMES.md` (step 3), section "The browser-window destination (not a scheme)": with no URL "the window opens on `about:blank`", and "Invoking the command twice opens two such windows".
- Side 3: `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts` (step 1), `openBrowserWindow`: when chrome answered the `probeChannel` kind at startup and the URL is empty or `http(s)`, the command sends the `openStockTab` kind to chrome, with `about:newtab` for an empty URL; `window.open(target, '_blank')` runs only otherwise, for example with no chrome host.
- Side 4: `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (step 1), `PowerBrowserAPI.openStockTab`: adds the URL as a tab to the most recently focused stock window and selects it; it opens a new stock window only when none exists.
- Follow: side 3 and side 4. Expect command `powerbrowser.open-browser-window` and the `openStockTab` kind to add a tab to the most recently focused stock window, to open a window only when none exists, and to load `about:newtab` when no URL is given. The chrome-side `openStockTab` handler is the normal path, not a forbidden addition; `window.open` is the fallback without a chrome host.
- Rule: step 1 (PB source code) ranks above step 2 (PB `CLAUDE.md`) and step 3 (PB docs) in [Source precedence](CONVENTIONS.md#source-precedence).
- Used by: [What PowerBrowser is](00-what-is-powerbrowser.md#tabs-and-uris), [Choosing a surface](00-choosing-a-surface.md), [PowerBrowserGroup Actor Bridge](02-powerbrowser-api-bridge.md#navigation-web-tab-and-window-kinds-also-handlegroupmutation), [Firefox WebExtensions](05-webextensions.md#stock-tab-bridge-kind-relevant-to-add-ons).
- Check: `git -C "$PB_REPO" grep -n -F -e 'chrome-side command is registered, and that absence is the ratified design' HEAD -- CLAUDE.md`, `git -C "$PB_REPO" grep -n -F -e 'opens two such windows' HEAD -- docs/URI-SCHEMES.md` and `git -C "$PB_REPO" grep -n -E -e 'the window opens on .about:blank.' HEAD -- docs/URI-SCHEMES.md` test side 1 and side 2.

## CF-12

PB's release document names a `release.yml` workflow that starts the release, while PB source has no such workflow at PB HEAD.

- Side 1: `$PB_REPO/docs/RELEASING.md` (step 3), section "Architecture in one paragraph": a signed tag matching `v<ESR>-<revision>` "triggers `.github/workflows/release.yml`". The same document refers to `release.yml` in its job and gate tables.
- Side 2: `$PB_REPO/.github/workflows/` (step 1), the files tracked at PB HEAD: `rebase-upstream.yml` and `verify.yml`. No `release.yml` is tracked.
- Follow: side 2. These docs state that no release workflow is tracked at PB HEAD. A tag push does not start a release build until `release.yml` is authored. Tracked PB workflows are the only source for trigger and job facts.
- Rule: step 1 (PB source code) ranks above step 3 (PB docs) in [Source precedence](CONVENTIONS.md#source-precedence).
- Used by: [What PowerBrowser is](00-what-is-powerbrowser.md), [Building a PowerBrowser extension](08-building-an-extension.md).
- Check: `git -C "$PB_REPO" grep -n -F -e 'triggers `.github/workflows/release.yml`' HEAD -- docs/RELEASING.md` and `git -C "$PB_REPO" ls-tree -r --name-only HEAD -- .github/workflows` (no `release.yml` listed) test side 1 and side 2.

## CF-13

PB's release document says the telemetry endpoint is stated at the shipped level, while `$PB_REPO/configuration.toml` at PB HEAD leaves `telemetry.endpoint` unset.

- Side 1: `$PB_REPO/docs/RELEASING.md` (step 3), section "Architecture in one paragraph": the Theia frontend error hooks "post to a Cloudflare Worker at the events origin, shipped at telemetry level `off` with the endpoint stated so the existing preference is a working opt-in".
- Side 2: `$PB_REPO/configuration.toml` (step 1), section `[telemetry]`: `level = "off"`, and the comment above the `[telemetry]` table says that `endpoint` "is deliberately UNSET here" (the phrase is split across two comment lines, so a single-line grep does not match). No `endpoint` key is present in the file at PB HEAD.
- Follow: side 2. The shipped configuration has no telemetry endpoint. Telemetry sends nothing until a downstream sets `telemetry.endpoint` and an enabled level, and an enabled level without an endpoint fails the generate.
- Rule: step 1 (PB source code) ranks above step 3 (PB docs) in [Source precedence](CONVENTIONS.md#source-precedence).
- Used by: [What PowerBrowser is](00-what-is-powerbrowser.md), [Theia extensions](01-theia-extensions.md).
- Check: `git -C "$PB_REPO" grep -n -F -e 'with the endpoint stated so the existing' HEAD -- docs/RELEASING.md` and `git -C "$PB_REPO" grep -n -F -e 'UNSET here' HEAD -- :/configuration.toml` test side 1 and side 2.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
