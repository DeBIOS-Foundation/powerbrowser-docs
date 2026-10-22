# Building a PowerBrowser extension

> Verified against PB 8843936 on 2026-10-21. Level: source-read

Source files:
- `$PB_REPO/CLAUDE.md`
- `$PB_REPO/theia/package.json`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/theia/extensions/telemetry/`
- `$PB_REPO/theia/extensions/chrome-bar/`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/`
- `$PB_REPO/theia/extensions/modes/src/browser/group-model.ts`
- `$PB_REPO/theia/extensions/branding/src/browser/`
- `$PB_REPO/theia/extensions/customize/src/browser/`
- `$PB_REPO/theia/extensions/token-gate/src/node/`
- `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`
- `$PB_REPO/powerbrowser/shell/powerbrowser-sidecar.js`
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/powerbrowser/shell/powerbrowser.js`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/powerbrowser/distribution/policies.json`
- `$PB_REPO/powerbrowser/packaging/package-linux.sh`
- `$PB_REPO/configuration.toml`
- `$PB_REPO/docs/BUILD.md`
- `$PB_REPO/docs/CUSTOMIZE.md`
- `$PB_REPO/docs/REBRANDING.md`
- `$PB_REPO/scripts/download-plugins.mjs`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/scripts/lib/config-schema.json`
- `$PB_REPO/scripts/lib/firefox-bidi.mjs`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/scripts/verify-extension-pins.mjs`
- `$PB_REPO/scripts/verify-webextensions.mjs`
- `$PB_REPO/scripts/smoke-theia.sh`

`$PB_REPO` is the root of the PB core checkout (see [Paths and links](CONVENTIONS.md#paths-and-links)). Treat PB core as read-only. Any step marked **PB core edit** changes a tracked PB file and needs the user's explicit approval first. To see which facts here may be stale, run `node scripts/check-drift.mjs docs/08-building-an-extension.md` from the root of this repo.

Facts about gitignored PB paths (`$PB_REPO/theia/node_modules/`, `$PB_REPO/objdir/`, `$PB_REPO/generated/`, `$PB_REPO/theia/applications/browser/lib/`) come from the on-disk checkout and build output and are not drift-checked.

## How to understand PB

Read in this order:

1. [00-what-is-powerbrowser.md](00-what-is-powerbrowser.md): what PB is (Firefox ESR shell + Theia sidecar), components, boot sequence, trust boundaries, glossary. Every later doc assumes this vocabulary.
2. `AGENTS.md` (this repo) and `$PB_REPO/CLAUDE.md`: the five hard rules. They decide which designs are allowed at all.
3. [00-choosing-a-surface.md](00-choosing-a-surface.md): maps a goal to one surface and lists capability gaps. Read it before choosing a design, not after.
4. The doc for the chosen surface (01-07). It holds the API tables; this file does not repeat them.
5. `$PB_REPO/theia/package.json` and `$PB_REPO/theia/applications/browser/package.json`: the workspace list, the hand-ordered `build:extensions` chain, the app dependency list, the `theiaPlugins` block (absent while no `[[extensions]]` entry is declared), and the `build`/`start` scripts. These define how anything gets into a build.
6. `$PB_REPO/theia/extensions/telemetry/`: the smallest complete extension. It has `package.json`, `tsconfig.json`, a frontend module, and the only unit test under `$PB_REPO/theia/extensions/` (`$PB_REPO/theia/extensions/telemetry/test/telemetry-sender.test.mjs`). Copy its shape.
7. `$PB_REPO/theia/extensions/chrome-bar/`: frontend + backend JSON-RPC service in one package. Copy it when you need Node code.
8. `$PB_REPO/theia/extensions/tab-uris/src/browser/`: the main PB DI services (`TabUriRegistry`, `ChromeStoreClient`) that other extensions inject.
9. `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`: how the sidecar is spawned, which env vars it gets (`THEIA_CONFIG_DIR` from `_resolveConfigDir`, `THEIA_DEFAULT_PLUGINS` from `_resolveSidecar`, both passed in `_spawnAndGate`), and where backend logs go (`_pumpOutput`).
10. `$PB_REPO/docs/BUILD.md`: exact build commands and measured timings.

## Pick the extension type

Pick by goal (full mapping: [00-choosing-a-surface.md](00-choosing-a-surface.md)):

- **Shell UI, commands, or use of PB DI services** (`TabUriRegistry`, `GroupModel`, `ChromeStoreClient`): Theia extension `@powerbrowser/<name>`. Code lives in `extensions/<name>/` here, copied into `$PB_REPO/theia/extensions/<name>/`. PB core edit: yes, always. Rebuild: Theia half only (`yarn build`), no Gecko rebuild.
- **Command, view or AI tool that needs no PB DI service**: VS Code plugin (`.vsix`). Code lives here. Reaches PB at runtime through the drop-in folder (no PB edit, no rebuild) or at build time through `[[extensions]]` (PB core edit, Theia rebuild).
- **Page DOM, content scripts, `webRequest`**: Firefox WebExtension. Code lives here. Tested through a temporary profile (no PB edit); shipped through `[[webextensions]]` + `policies.json` (PB core edit). Unsigned XPIs in a shipped build also need a `generate.mjs` change (PB core edit).
- **Restyle the shell**: `customize.css`. One CSS file here, copied to `${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser/customize.css`. No PB edit, no rebuild, reloads live.
- **New Firefox capability** (new actor `kind`): not an extension. It is a PB core change in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` ([Adding a new message kind](02-powerbrowser-api-bridge.md#adding-a-new-message-kind)).

For a first test extension, the cheapest end-to-end paths are `customize.css` and a `.vsix` in the drop-in folder. Use a Theia extension only when the feature needs PB DI services. Any feature that reads open tabs, groups, history or bookmarks needs a Theia extension. CSS cannot read data, and a `.vsix` cannot inject PB services. UNVERIFIED: whether `vscode.window.tabGroups` lists in-shell web tabs. Verify: see [Unsettled items](09-tabs-reference.md#unsettled-items) in the tabs reference. Example: "show my open tabs grouped by domain" is a Theia extension; the Worked example below builds exactly that.

## Where code lives in this repo

One folder per extension: `extensions/<name>/`, with a `README.md` stating type, goal, delivery path and the PB commit tested against. Files per type:

- Theia extension: `package.json` (name `@powerbrowser/<name>`, version `0.1.0`, `theiaExtensions`, `@theia/*` at exactly the version `$PB_REPO/theia/applications/browser/package.json` pins, `1.76.0` at the stamp commit), `tsconfig.json` (copy of `$PB_REPO/theia/extensions/telemetry/tsconfig.json`), `src/browser/<name>-frontend-module.ts`, optional `src/node/<name>-backend-module.ts`, optional `test/*.test.mjs`. Shape: [01 §B](01-theia-extensions.md#b-create-a-new-powerbrowsername-extension).
- VS Code plugin: `package.json` (VS Code manifest: `name`, `publisher`, `version`, `engines.vscode`, `main`, `contributes`), `src/extension.ts`, `tsconfig.json`, built output in `out/` or `dist/`.
- WebExtension: `manifest.json`, scripts, a fixed `browser_specific_settings.gecko.id` (`name@host`), built `.xpi` in `dist/`.
- CSS: `customize.css`.

Do not commit `lib/`, `out/`, `node_modules/` or packed archives. This repo has no `node_modules` and no Theia install. For a Theia extension, `tsc` and `yarn` work only on the copy inside `$PB_REPO/theia/extensions/<name>/`; edit here, copy, build there. Pure-logic tests (`node test/*.test.mjs`, no Theia imports) run here with the host Node 24.

## Delivery: getting an extension into PB

### Theia extension (`@powerbrowser/<name>`)

There is no overlay mechanism. Yarn workspaces cover only `applications/*` and `extensions/*` under `$PB_REPO/theia/` (key `workspaces` of `$PB_REPO/theia/package.json`); `PB_CONFIG_DIR` overlays only `$PB_CONFIG_DIR/configuration.toml` and `$PB_CONFIG_DIR/brand/`. Theia extensions are compiled into `src-gen` by `theia build` and cannot be installed at runtime.

The shell commands in this file use `$PB_REPO`. Run this line once from the root of this repo first:

```sh
export PB_REPO="$(cd "${PB_REPO:-../Power-Browser}" && pwd)"
```

1. **PB core edit**: copy `extensions/<name>/` to `$PB_REPO/theia/extensions/<name>/`. Repeat after every edit here:

```sh
mkdir -p "$PB_REPO"/theia/extensions/<name>
cp -r extensions/<name>/. "$PB_REPO"/theia/extensions/<name>/
```

2. **PB core edit**: add `"@powerbrowser/<name>": "0.1.0"` to `dependencies` in `$PB_REPO/theia/applications/browser/package.json`, in alphabetical position.
3. **PB core edit**: append `&& yarn --cwd extensions/<name> build` to the end of the `build:extensions` string in `$PB_REPO/theia/package.json`. The end is after every `@powerbrowser/*` package, so it satisfies the ordering rule.
4. Build:

```sh
cd "$PB_REPO"
nix develop .#theia --command bash -c 'cd theia && yarn install --ignore-scripts --frozen-lockfile && yarn build'
```

   This is the install form `$PB_REPO/docs/BUILD.md` prescribes (section "Theia half"); do not use a bare `yarn install` (it runs unaudited install scripts). On a fresh `node_modules` also run `(cd node_modules/drivelist && node-gyp rebuild)` before `yarn build` (same section). `yarn build` = `build:extensions` + the app build, which runs `theia rebuild:browser`, `download-plugins.mjs` (reuses archives already at their pin) and `theia build`.
5. `--frozen-lockfile` fails if the extension adds a third-party dependency not in `$PB_REPO/theia/yarn.lock`. Then drop the flag; the resulting `$PB_REPO/theia/yarn.lock` change is also a PB core edit.

UNVERIFIED: whether a symlink at `$PB_REPO/theia/extensions/<name>` (instead of a copy) passes yarn v1 workspaces and the `theia-build-order` / fresh-clone gates. Verify: create the symlink in a scratch PB clone and run `"$PB_REPO"/scripts/verify-platform.sh --only theia-build-order`. Use a copy until tested.

### VS Code plugin (`.vsix`), runtime, no PB edit

Fastest test path. Not in [06-theia-plugins-and-ai.md](06-theia-plugins-and-ai.md).

1. Build and package the plugin in this repo. UNVERIFIED: packaging tool; `npx @vscode/vsce package` is the standard one and needs network on first use. Verify: run it on a sample plugin and install the result through the drop-in folder below.
2. Copy the `.vsix` into the user extensions folder:

```sh
mkdir -p "${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser/extensions"
cp extensions/<name>/<name>-<version>.vsix "${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser/extensions/"
```

3. Quit and relaunch PB (the folder is scanned once, at plugin deployment start).

Source: `PluginVSCodeDeployerParticipant.onWillStart` loads every `*.vsix` in `<configDir>/extensions` as `local-file:` (`$PB_REPO/theia/node_modules/@theia/plugin-ext-vscode/lib/node/plugin-vscode-deployer-participant.js`, method `onWillStart`); `configDir` is `THEIA_CONFIG_DIR`, which PB sets to `${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser` (`_resolveConfigDir` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`). Unpacked deployments land in `${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser/deployedPlugins`.

Alternative: Extensions view, "Install from VSIX" (`vsxExtensions.installFromVSIX`, registered by `@theia/vsx-registry`, not removed by PB). UNVERIFIED: that the menu entry is visible in PB's shell. Verify: open the Extensions view in a PB build and look for the entry.

None of these paths checks a pin. Use them for development and testing, not shipping. UNVERIFIED: both paths were confirmed from Theia code only, not with a live PB run. Verify: drop a `.vsix` into the folder, relaunch PB and run one of its commands. Do not declare `extensionDependencies` or `extensionPack` in a drop-in plugin: per PB's own analysis (the I-2 comment in `$PB_REPO/scripts/download-plugins.mjs`), Theia's deployer resolves those ids through the registry, and the sidecar sets `VSX_REGISTRY_URL=https://open-vsx.org` (`_spawnAndGate` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`), so they would be fetched unpinned from Open VSX.

### VS Code plugin, build-time, pinned (`[[extensions]]`)

Keys and the `download-plugins.mjs` behaviour are in [06 Reference](06-theia-plugins-and-ai.md#reference). Additions:

- **PB core edit**: the `[[extensions]]` entry goes in PB's tracked `$PB_REPO/configuration.toml`.
- For a local plugin use `source = "local-path"` with a relative `path` (no leading `/`, no `..`; the `extensions[].path` rule of `$PB_REPO/scripts/lib/config-schema.json`). It resolves against `PB_CONFIG_DIR` when set, otherwise the PB repo root (`configDir` in `$PB_REPO/scripts/download-plugins.mjs`). Without `PB_CONFIG_DIR` the plugin folder must therefore be copied inside the PB tree; a folder in this repo cannot be referenced. That copy is a **PB core edit** (it adds files to the PB checkout).
- The folder is packed with `npm pack --ignore-scripts --script-shell true` (`pack` in `$PB_REPO/scripts/download-plugins.mjs`), so no `prepare`/`prepack` script runs. Nothing is compiled, so build first. `sha256` is over the packed `.tgz`. A local-path entry is repacked on every build.
- `extensionDependencies` / `extensionPack` ids must each have their own `[[extensions]]` entry, or `download-plugins.mjs` fails the build.
- Pointing `PB_CONFIG_DIR` at this repo makes it a full downstream brand: its `$PB_CONFIG_DIR/configuration.toml` must state every `[identity]` and `[legal]` key, its own `urls.update` on a non-PB host, and provide `$PB_CONFIG_DIR/brand/mark.svg`; arrays replace, so `[[extensions]]` must list every entry (`$PB_REPO/docs/REBRANDING.md`, section "Rebranding from an external config directory"). Do not do this for a test extension.
- **PB core edit** in every case: `generate.mjs` only writes `$PB_REPO/generated/theia-plugins.json`; its contents must be copied into the `theiaPlugins` block of `$PB_REPO/theia/applications/browser/package.json`, which the tracked file does not have while no `[[extensions]]` entry is declared (`$PB_REPO/scripts/verify-extension-pins.mjs` enforces the copy).

```sh
cd "$PB_REPO"
node scripts/generate.mjs                     # in nix develop .#theia
# copy generated/theia-plugins.json -> "theiaPlugins" in theia/applications/browser/package.json
nix develop .#theia --command bash -c 'cd theia && yarn build'
node scripts/verify-extension-pins.mjs
```

The plugin is unpacked to `$PB_REPO/theia/applications/browser/plugins/<id>/` and loaded through `THEIA_DEFAULT_PLUGINS=local-dir:<app>/plugins`, which PB sets (`_resolveSidecar` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`).

### WebExtension

- Test, no PB edit: build an unsigned `.xpi`, launch PB with a throwaway profile whose `user.js` sets `xpinstall.signatures.required=false`, and install by policy as described in [05 How to use](05-webextensions.md#how-to-use) and its [worked example](05-webextensions.md#worked-example-verify-ng-072-policies-webextensionmjs).
- Test policy entry: in that test the policy `install_url` may be a `file:///` URL of the `.xpi` on your machine. Put it only in an untracked copy of `policies.json` for a local dev profile: the extracted package copy, as NG-072 does ([worked example](05-webextensions.md#worked-example-verify-ng-072-policies-webextensionmjs) step 4), or `$PB_REPO/objdir/dist/bin/distribution/policies.json` from [Development loop](#development-loop) step 4. Never commit a `file://` URL to PB's tracked `$PB_REPO/configuration.toml` or `$PB_REPO/powerbrowser/distribution/policies.json`: it names a path on one machine, and a packaged build elsewhere cannot resolve it (`$PB_REPO/powerbrowser/packaging/package-linux.sh` copies `policies.json` verbatim), so the add-on does not install.
- Ship: host the `.xpi` at an `https://` URL outside the PB tree (no add-on binary is vendored into PB; `$PB_REPO/docs/REBRANDING.md`, section "`[[webextensions]]` — declared WebExtensions (absent table means none)"). **PB core edit** to `$PB_REPO/configuration.toml`: a `[[webextensions]]` entry with that `https://` `install_url`. **PB core edit**: add the host to `hosts` in `$PB_REPO/powerbrowser/endpoint-allowlist.json` with a `reason`, or `verify-webextensions` fails naming the host. **PB core edit**: copy `$PB_REPO/generated/webextensions-settings.json` into `ExtensionSettings` of `$PB_REPO/powerbrowser/distribution/policies.json` (`$PB_REPO/scripts/verify-webextensions.mjs` enforces it).
- Unsigned XPIs in a shipped build need a **PB core edit** to `FIREFOX_BRANDING_BASE_LINES` in `$PB_REPO/scripts/generate.mjs` ([05 Gotchas](05-webextensions.md#gotchas)).
- Sideloading into the profile does not work: the add-on stays disabled and `about:addons` is unreachable from Theia.

### `customize.css`

```sh
mkdir -p "${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser"
cp extensions/<name>/customize.css "${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser/customize.css"
```

Reloads live. `customize.js` needs `powerbrowserPrivilegedJs: true` at build time (shipped `false` in `$PB_REPO/theia/applications/browser/package.json`), which is a **PB core edit**; prototype in devtools with `window.theia.container` instead.

## Development loop

Fastest first:

1. **CSS**: edit `${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser/customize.css`; it applies within about 150 ms (`debouncedApply` in `$PB_REPO/theia/extensions/customize/src/browser/customize-css-contribution.ts`).
2. **Theia UI work without the bridge**: run the Theia app standalone in a normal browser:

```sh
cd "$PB_REPO"
POWERBROWSER_TOKEN_DISABLE=1 nix develop .#theia --command yarn --cwd theia/applications/browser start --port 3000
# open http://localhost:3000
```

   Without `POWERBROWSER_TOKEN` or `POWERBROWSER_TOKEN_DISABLE=1` the backend exits 78 (`$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`). Standalone has no Gecko actor, so bridge calls time out: after `WEB_TAB_ACK_TIMEOUT_MS` (5000 ms, in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`) for web-tab acks, after `SHELL_STATE_ACK_TIMEOUT_MS` (5000 ms, in `$PB_REPO/theia/extensions/tab-uris/src/browser/profile-storage.ts`) for shell-state acks, and after `STORE_ACK_TIMEOUT_MS` (8000 ms, in `$PB_REPO/theia/extensions/tab-uris/src/browser/chrome-store-client.ts`) for `ChromeStoreClient.request`. Standalone also loads no build-time plugins (`THEIA_DEFAULT_PLUGINS` is set only by the PB supervisor) and no profile dir (`TabQueryService`, store endpoints fail). Use it for widgets, commands and CSS only.
3. **Rebuild one Theia extension** (inside PB, after the copy step):

```sh
cd "$PB_REPO"
nix develop .#theia --command bash -c 'cd theia && yarn --cwd extensions/<name> build && yarn --cwd applications/browser build'
```

   `$PB_REPO/docs/BUILD.md` (section "Theia half") measured 23.4 s cold / 18.1 s warm for the whole sequence install + drivelist rebuild + build + boot (via `$PB_REPO/scripts/smoke-theia.sh`), not for `yarn build` alone. The single-extension form skips the other extensions' `tsc` but still runs the full app build (`rebuild`, `download:plugins`, `theia build`). UNVERIFIED: its time. Verify: time the command above on a warm tree.
4. **Run the real PB**. A Theia-only change needs no Gecko rebuild: the dev binary loads `$PB_REPO/theia/applications/browser/lib/backend/main.js` from the PB tree (pref `powerbrowser.sidecar.backendMain` in `$PB_REPO/powerbrowser/shell/powerbrowser-sidecar.js`). This holds only while no staged copy exists at `$PB_REPO/objdir/dist/bin/theia/lib/backend/main.js`; a staged copy (packaged layout) wins unless the pref has a user value (`_resolveSidecar` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`).

```sh
cd "$PB_REPO"
mkdir -p objdir/dist/bin/distribution
cp powerbrowser/distribution/policies.json objdir/dist/bin/distribution/policies.json   # dev runs have none otherwise
TMP=$(mktemp -d)
env XDG_CONFIG_HOME=$TMP/config objdir/dist/bin/powerbrowser --profile $TMP/profile 2>&1 | tee $TMP/pb.log
```

   Note: the `cp` writes into `$PB_REPO/objdir/` (build output, untracked), not a tracked file. A throwaway `XDG_CONFIG_HOME` gives an empty PB config folder; put the `.vsix` or `customize.css` under `$TMP/config/powerbrowser/` instead. The sidecar runs `node` from PATH (pref `powerbrowser.sidecar.nodePath` in `$PB_REPO/powerbrowser/shell/powerbrowser-sidecar.js` is empty); it needs Node >= 24. On NixOS a system Node 24 is at `/run/current-system/sw/bin/node` when installed; elsewhere launch from inside `nix develop .#theia`.
5. **Reload after a change**:
   - Frontend change: Theia "Reload Window" command (or browser reload when standalone). UNVERIFIED: that Reload Window inside PB loads the new frontend bundle. Verify: change a visible label, rebuild, run Reload Window in PB and check the label.
   - Backend change: quit and relaunch PB. Killing the backend pid should make the supervisor respawn it: the health loop calls `_restart()` after consecutive probe failures (`_healthLoop` and `_restart` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`), with a give-up budget of prefs `powerbrowser.sidecar.giveUpAttempts` (6) and `powerbrowser.sidecar.giveUpWallclockMs` (45000) in `$PB_REPO/powerbrowser/shell/powerbrowser-sidecar.js`. UNVERIFIED: kill-to-respawn as a dev workflow. Verify: kill the backend pid from the PB log and watch for a new `POWERBROWSER_BACKEND_READY` line.
   - Chrome-side change under `$PB_REPO/powerbrowser/shell/` (PB core only): purge the startup cache: `rm -rf objdir/tmp/profile-default/startupCache` (run in `$PB_REPO`) and run with `MOZ_PURGE_CACHES=1 ... -purgecaches`.
6. **Watch mode**: no `watch` script exists (`$PB_REPO/docs/BUILD.md` mentions `yarn watch` in section "Theia half", but `$PB_REPO/theia/package.json` does not define it). UNVERIFIED: the candidate below. Verify: run both commands, edit a source file, and check that the app bundle rebuilds.

```sh
cd "$PB_REPO"/theia/extensions/<name> && npx tsc -b -w                                      # terminal 1
cd "$PB_REPO"/theia/applications/browser && npx theia build --mode development --watch      # terminal 2
```

Logs and debugging:

- Backend `console.log` goes to PB's stdout, one line each, prefixed `[PowerBrowserAPI] log: ` (`_pumpOutput` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs` passes each line to `PowerBrowserAPI.log` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`). Run PB from a terminal and tee stdout.
- Readiness sentinels in that output: `POWERBROWSER_SHELL_READY` (`$PB_REPO/powerbrowser/shell/powerbrowser.js`), `POWERBROWSER_BACKEND_READY {"port":..,"pid":..}` (`$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`).
- Frontend: browser devtools when standalone; Browser Toolbox (`powerbrowser --jsdebugger`) inside PB ([07 DevTools / Browser Toolbox](07-automation-and-disabled-surfaces.md#3-devtools--browser-toolbox-development)).
- `window.theia.container` is set on every build; use it from the console to inspect DI bindings (`$PB_REPO/docs/CUSTOMIZE.md`, section "Security posture, stated plainly").
- Backend code reads supervisor values from `POWERBROWSER_ENV` (`@powerbrowser/token-gate`, `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts`), never `process.env.POWERBROWSER_*`, which is deleted at load.

## Testing and verification

- **Unit tests**: copy the pattern of `$PB_REPO/theia/extensions/telemetry/test/telemetry-sender.test.mjs`. Plain Node 24, no framework, no build: it imports `../src/browser/*.ts` directly through type-stripping, so the source must use erasable TypeScript only (no `enum`, no parameter properties, no `namespace`). Define a local `assert(cond, msg)`, stub `fetch`, use a fake clock. Run with `node test/<x>.test.mjs`.
- **Self-test**: the test must go red when a known-broken implementation is substituted (telemetry uses `TELEMETRY_TEST_STUB=always-send`). A check that cannot fail proves nothing.
- **PB gate** (after the copy into PB, files staged):

```sh
cd "$PB_REPO"
git add theia/extensions/<name>          # scan-brand-residue reads git ls-files
scripts/verify-platform.sh --quick
scripts/verify-platform.sh --only theia-build-order
scripts/verify-platform.sh --only smoke-theia
```

  Rows that matter for an extension (row labels in `CHECKS` of `$PB_REPO/scripts/verify-platform.sh`):
  `theia-build-order`, `theia-build-order-self-test`, `scan-brand-residue`, `gui04-registry-shape`, `smoke-theia`, and `chrome-bar-typecheck` when the extension imports chrome-bar.
  `--quick` needs no build, browser or network; `chrome-bar-typecheck` (in the quick tier) runs `tsc` from `$PB_REPO/theia/node_modules/`, so it needs a `yarn install --ignore-scripts --frozen-lockfile` there first (inside `nix develop .#theia`). To add a check, append one `"label|command"` row to `CHECKS` in `$PB_REPO/scripts/verify-platform.sh` (**PB core edit**; see [01 §B](01-theia-extensions.md#b-create-a-new-powerbrowsername-extension) step 9).
- **Live tests**: WebDriver BiDi through `$PB_REPO/scripts/lib/firefox-bidi.mjs` against `$PB_REPO/objdir/dist/bin/powerbrowser --headless` ([07 WebDriver BiDi in a live check](07-automation-and-disabled-surfaces.md#1-webdriver-bidi-in-a-live-check-the-supported-path)).
- **Manual check**: launch PB with a throwaway profile, run the command from the command palette, open the view, confirm the expected output in the UI and in stdout. Record the PB commit in the extension's `README.md`.

## End-to-end checklist

1. From the root of this repo, run `node scripts/check-drift.mjs docs/08-building-an-extension.md` and the same for the surface doc you will use. It lists every cited PB file changed since the doc's stamp commit; re-verify the facts that cite a listed file against `$PB_REPO` before you rely on them.
2. Write the goal in one sentence. Find the row in [00-choosing-a-surface.md](00-choosing-a-surface.md). If it is a capability gap, stop and tell the user.
3. Pick the least invasive type that meets the goal (CSS < drop-in `.vsix` < WebExtension < Theia extension).
4. Read the surface doc. Note every API you will call and its source file.
5. Create `extensions/<name>/` with `README.md` stating type, goal and delivery path.
6. Write the code. Bind DI statically; pin `@theia/*` to the version `$PB_REPO/theia/applications/browser/package.json` pins; declare every `@powerbrowser/*` import in `package.json`.
7. Write a unit test for any non-trivial logic, with a self-test that goes red.
8. List every PB core edit the delivery path needs. Get the user's approval before making any of them.
9. Deliver (section above). Build inside `nix develop .#theia`.
10. Run the standalone app for UI, then the real PB binary for anything using the bridge or the tab store.
11. Run `"$PB_REPO"/scripts/verify-platform.sh --quick` and the relevant `--only` rows.
12. Check user-facing text: no internal identifiers, product named "PowerBrowser", errors end with an on-screen next step.
13. Record the result and the PB commit in `extensions/<name>/README.md`. Mark anything not tested live as `UNVERIFIED:`.

## Worked example: open tabs grouped by domain

Goal: a view "Tabs by Domain" listing the open shell tabs under their host name. Shapes copied from PB `branding` (welcome view, `$PB_REPO/theia/extensions/branding/src/browser/`) and `chrome-bar` (`$PB_REPO/theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx`). UNVERIFIED: this code was assembled from PB source, not compiled. Verify: create the files below, copy them into `$PB_REPO/theia/extensions/<name>/` (name `tabs-by-domain`) in a scratch PB clone, and run the build command from Delivery step 4.

Where open tabs come from (there is no "list tabs" API):

- Open shell tabs are the widgets in `ApplicationShell.mainPanel.widgets()` (how `GroupModel.liveTabs` and the tab strip enumerate them).
- A web tab is a `WebTabWidget` (`@powerbrowser/tab-uris/lib/browser/web-tab`); `widget.url` is the live page URL, `about:blank` when empty (`hasPage` false).
- Other tabs: `TabUriRegistry.uriOf(widget)` gives `settings:`, `terminal:<n>`, `view:<id>` and so on, or `undefined`.
- Change signals: `shell.onDidAddWidget` / `onDidRemoveWidget` for open/close. `TabUriRegistry` has no change event. Navigation inside a web tab arrives as chrome's `state` push. Subscribe to that one kind with `WebTabChannel.onPush('state', handler)`, or to `WebTabWidget.onDidChangeState` per web tab (`onPush` and `onDidChangeState` in `$PB_REPO/theia/extensions/tab-uris/src/browser/web-tab.ts`). Do not add a `window` listener for `WEB_TAB_STATE_EVENT`: that event also carries the `pageFocus`, `shortcut` and `flushShellState` pushes, and `WebTabChannel` already holds the one listener.
- Not covered: tabs in stock Firefox windows (not shell widgets), and widgets moved to secondary windows. `GroupQueryService` returns stored `tabs.sqlite` rows, which is not the same as open tabs.

Files in `extensions/tabs-by-domain/`:

- `package.json`: the [01 §B](01-theia-extensions.md#b-create-a-new-powerbrowsername-extension) step 2 shape, name `@powerbrowser/tabs-by-domain`, `dependencies` `@powerbrowser/tab-uris` `0.1.0` and `@theia/core` at the pinned version (`1.76.0` at the stamp commit), one entry `{ "frontend": "lib/browser/tabs-by-domain-frontend-module" }`.
- `tsconfig.json`: copy of `$PB_REPO/theia/extensions/telemetry/tsconfig.json` plus `"references": [{ "path": "../tab-uris" }]`.
- `src/browser/group-by-domain.ts` (pure, erasable TS, no imports, so a plain Node test can load it):

ILLUSTRATIVE: assembled from PB source; not compiled.

```ts
export interface TabEntry { label: string; url: string }
export function domainOf(url: string): string {
    try { const u = new URL(url); return u.hostname || u.protocol.replace(':', ''); } catch { return '(other)'; }
}
export function groupByDomain(tabs: readonly TabEntry[]): Array<[string, TabEntry[]]> {
    const groups = new Map<string, TabEntry[]>();
    for (const tab of tabs) { const key = domainOf(tab.url); groups.set(key, [...(groups.get(key) ?? []), tab]); }
    return [...groups].sort(([a], [b]) => a.localeCompare(b));
}
```

- `src/browser/tabs-by-domain-widget.tsx`:

ILLUSTRATIVE: assembled from PB source; not compiled.

```tsx
import * as React from '@theia/core/shared/react';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { ApplicationShell, ReactWidget } from '@theia/core/lib/browser';
import { TabUriRegistry } from '@powerbrowser/tab-uris/lib/browser/tab-uri-registry';
import { WebTabChannel, WebTabWidget } from '@powerbrowser/tab-uris/lib/browser/web-tab';
import { groupByDomain, TabEntry } from './group-by-domain';

@injectable()
export class TabsByDomainWidget extends ReactWidget {
    static readonly ID = 'tabs-by-domain';
    @inject(ApplicationShell) protected readonly shell: ApplicationShell;
    @inject(TabUriRegistry) protected readonly tabUris: TabUriRegistry;
    @inject(WebTabChannel) protected readonly channel: WebTabChannel;

    @postConstruct()
    protected init(): void {
        this.id = TabsByDomainWidget.ID;
        this.title.label = 'Tabs by Domain'; this.title.closable = true;
        const refresh = () => this.update(); // update() renders later, after the web tab applied its state
        this.toDispose.pushAll([
            this.shell.onDidAddWidget(refresh),
            this.shell.onDidRemoveWidget(refresh),
            this.channel.onPush('state', refresh), // navigation and title changes of web tabs only
        ]);
        this.update();
    }

    protected tabs(): TabEntry[] {
        return [...this.shell.mainPanel.widgets()]
            .filter(w => w !== this && w.id !== 'powerbrowser.modes.organising') // skip self and the Organising mode view
            .map(w => ({ label: w.title.label, url: w instanceof WebTabWidget ? w.url : this.tabUris.uriOf(w)?.toString() ?? '' }));
    }

    protected render(): React.ReactNode {
        return <div>{groupByDomain(this.tabs()).map(([domain, tabs]) =>
            <section key={domain}><h3>{domain} ({tabs.length})</h3>
                <ul>{tabs.map((t, i) => <li key={i}>{t.label}</li>)}</ul></section>)}</div>;
    }
}
```

- `src/browser/tabs-by-domain-frontend-module.ts` (view contribution inlined; pattern of `PowerBrowserWelcomeViewContribution` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-welcome-contribution.ts` and the `bindViewContribution` call in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts`):

ILLUSTRATIVE: assembled from PB source; not compiled.

```ts
import { ContainerModule, injectable } from '@theia/core/shared/inversify';
import { AbstractViewContribution, WidgetFactory, bindViewContribution } from '@theia/core/lib/browser';
import { TabsByDomainWidget } from './tabs-by-domain-widget';

@injectable()
export class TabsByDomainViewContribution extends AbstractViewContribution<TabsByDomainWidget> {
    constructor() {
        super({ widgetId: TabsByDomainWidget.ID, widgetName: 'Tabs by Domain',
            defaultWidgetOptions: { area: 'main' }, toggleCommandId: 'powerbrowser.tabsByDomain:toggle' });
    }
}
export default new ContainerModule(bind => {
    bind(TabsByDomainWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: TabsByDomainWidget.ID,
        createWidget: () => ctx.container.get<TabsByDomainWidget>(TabsByDomainWidget),
    })).inSingletonScope();
    bindViewContribution(bind, TabsByDomainViewContribution); // registers command "Toggle Tabs by Domain" + View menu entry
});
```

- `test/group-by-domain.test.mjs`: `import { groupByDomain, domainOf } from '../src/browser/group-by-domain.ts';`, local `assert`, cases for two hosts, `about:blank`, `settings:` (protocol fallback) and an unparsable string. Run here: `node test/group-by-domain.test.mjs`. Self-test: an env var that makes `domainOf` return `''` must turn it red.

Then:

1. Get approval for the three PB core edits (Delivery, Theia extension), make them, then run the build command from Delivery step 4.
2. Standalone (`Development loop` step 2): command palette (F1) → "Toggle Tabs by Domain"; Theia tabs appear under `settings`, `view`, `terminal`, `(other)`. Opening web pages needs the real binary.
3. Real PB (`Development loop` step 4): open two pages on one host and one on another, toggle the view, navigate a tab to a third host, close a tab; the view must follow each step. Then `"$PB_REPO"/scripts/verify-platform.sh --quick` and `--only theia-build-order`.

The view is also reachable as `view:tabs-by-domain`; no row in `$PB_REPO/theia/extensions/tab-uris/src/browser/view-factory-table.ts` is needed (that table only checks PB's own views). If the user does not approve PB core edits, nothing can show this inside the shell; the only no-edit fallback is an external script over the tab-store MCP endpoint ([03 Tools](03-tab-store-mcp-server.md#tools), `tabs_sql`), which reads stored `tabs.sqlite` rows, not live shell state.

## Common mistakes

- Running `yarn` or `node` builds outside `nix develop .#theia`.
- Forgetting to append the extension to `build:extensions`, or appending it before a package it imports.
- Using `@theia/*` versions other than exactly the one `$PB_REPO/theia/applications/browser/package.json` pins.
- Binding a contribution after module load (lazily or in `onStart`); it is never seen (D-50).
- Reading `process.env.POWERBROWSER_*` in backend code; it is always empty. Use `POWERBROWSER_ENV`.
- Opening `tabs.sqlite` directly, or for writing. Use `TabUriRegistry` / `GroupQueryService` / `GroupModel`.
- Expecting bridge or tab-store calls to work in standalone mode.
- Expecting `generate.mjs` to update `theiaPlugins` or `policies.json`; both must be copied by hand.
- Using `source = "url"` with `file://`; only `https://` is accepted (the `extensions[].url` rule of `$PB_REPO/scripts/lib/config-schema.json`). Use `local-path`.
- Pointing a `local-path` `path` at this repo with `..`; the schema rejects it.
- Adding a new verification script instead of one `CHECKS` row.
- Calling an external host without an `endpoint-allowlist.json` row.
- Putting internal identifiers (pref keys, ports, sentinels) in user-facing text.
- Editing PB core without asking the user.

## Unsettled items

- UNVERIFIED: the drop-in folder `${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser/extensions/` and "Install from VSIX" in a live PB (confirmed from Theia code only); the `.vsix` packaging tool and its offline availability. Verify: the steps in [VS Code plugin (`.vsix`), runtime, no PB edit](#vs-code-plugin-vsix-runtime-no-pb-edit).
- UNVERIFIED: a symlinked `$PB_REPO/theia/extensions/<name>` under yarn v1 workspaces and the build-order gates; watch mode (`tsc -b -w` + `theia build --watch`) and whether esbuild picks up workspace-symlinked `lib/` changes. Verify: the steps in [Theia extension (`@powerbrowser/<name>`)](#theia-extension-powerbrowsername) and [Development loop](#development-loop) step 6.
- UNVERIFIED: Reload Window inside PB picking up a new frontend bundle; kill-to-respawn of the backend as a dev workflow. Verify: the steps in [Development loop](#development-loop) step 5.
- UNVERIFIED: hand-setting the `POWERBROWSER_TOKEN` cookie in a normal browser for standalone mode with a token. Verify: read `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts` for the cookie name and check, then set it in devtools and load the standalone app.
- There is no supported way to add a Theia extension to PB without editing PB core. A PB extension point for out-of-tree Theia extensions does not exist yet.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
