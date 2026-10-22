# Firefox WebExtensions

> Verified against PB 8843936 on 2026-10-21. Level: source-read

Source files:
- `$PB_REPO/configuration.toml`
- `$PB_REPO/scripts/lib/config-schema.json`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/powerbrowser/distribution/policies.json`
- `$PB_REPO/powerbrowser/packaging/package-linux.sh`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/powerbrowser/branding/release/pref/firefox-branding.js`
- `$PB_REPO/scripts/verify-webextensions.mjs`
- `$PB_REPO/scripts/verify-ng-072-policies-webextension.mjs`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/docs/REBRANDING.md`
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/powerbrowser/shell/powerbrowser.xhtml`
- `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts`
- `$PB_REPO/patches/`
- `$PB_REPO/CLAUDE.md`

Status: working (engine and policy install path), none declared. Signed add-ons install through `[[webextensions]]` with no other change. Unsigned or self-hosted XPIs additionally require `xpinstall.signatures.required = false`, which PB does not ship and has no `$PB_REPO/configuration.toml` key for.

Facts cited from `$PB_REPO/upstream/` (prefs, build flags, add-on manager and native-messaging code) come from the on-disk Gecko checkout of the ESR tag pinned by `firefox_esr_tag` in `$PB_REPO/configuration.toml`. That tree is gitignored, so those facts are not drift-checked; the drift check sees only a change of the pin.

## What it is

PowerBrowser runs stock Gecko from the Firefox ESR tag pinned in `$PB_REPO/configuration.toml` (table `[upstreams]`, `firefox_esr_tag = "FIREFOX_153_5_0esr_BUILD1"`). The WebExtensions engine is unmodified upstream code: the PB patch stack (`$PB_REPO/patches/`) touches no add-on or extension code.

- Manifest V2 and Manifest V3 are both accepted (`manifest_version` schema: `minimum: 2`, `maximum: 3`, in `$PB_REPO/upstream/toolkit/components/extensions/schemas/manifest.json`).
- Add-ons are installed by the Firefox enterprise policy engine. PB ships `distribution/policies.json` in the package, and its `ExtensionSettings` key is the install list.
- That key is produced from `[[webextensions]]` entries in `$PB_REPO/configuration.toml` by `emitWebExtensionSettings` in `$PB_REPO/scripts/generate.mjs`, written to `$PB_REPO/generated/webextensions-settings.json`, and then copied by hand into the tracked `$PB_REPO/powerbrowser/distribution/policies.json`. `$PB_REPO/scripts/verify-webextensions.mjs` checks that the two agree.
- PB declares no add-ons. `ExtensionSettings` is `{}` in `$PB_REPO/powerbrowser/distribution/policies.json`, and `$PB_REPO/generated/webextensions-settings.json` is `{}`.

## Use it when / Do not use it when

Use it when:
- The feature acts on web page content or the network layer: content scripts, `webRequest`, page DOM access, per-site behavior.
- The feature should also work in a stock Firefox profile, or you want to reuse an existing Firefox add-on.
- The feature runs in the stock browser windows (`navigator:browser`), which PB keeps reachable (rule 5 of `$PB_REPO/CLAUDE.md`).

Do not use it when:
- The feature needs UI inside the Theia shell window (`chrome://powerbrowser/content/powerbrowser.xhtml`). WebExtension toolbar buttons, popups, sidebars and the extensions menu do not appear there. Write a Theia extension instead: see [Theia extensions](01-theia-extensions.md).
- The feature needs the PB tab store, groups or history as PB models them. Use the tab-store MCP endpoint or the Theia-to-chrome bridge instead: see [the tab-store MCP server](03-tab-store-mcp-server.md) and [the PowerBrowserGroup bridge](02-powerbrowser-api-bridge.md).
- The feature needs Firefox internals (privileged chrome code). Experiment APIs are disabled; such code belongs behind `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (rule 2 of `$PB_REPO/CLAUDE.md`); see [the PowerBrowserGroup bridge](02-powerbrowser-api-bridge.md).
- The feature is a VS Code-style editor plugin. Those are declared as `[[extensions]]` (sha256-pinned), not `[[webextensions]]`: see [Theia plugins and AI](06-theia-plugins-and-ai.md).

## How to use

Steps marked **PB core edit** change tracked files in `$PB_REPO`; stop and ask the user before each one ([Stop and ask](_shared/RULES.md#stop-and-ask)).

1. Build or obtain the XPI. Give it an explicit Gecko id in `manifest.json` (`browser_specific_settings.gecko.id`). The id must match the `[[webextensions]] id` exactly.

   Minimal manifest, reformatted from the `manifest.json` object that `$PB_REPO/scripts/verify-ng-072-policies-webextension.mjs` writes (the `ng072 probe` add-on):

   ILLUSTRATIVE: reformatted from PB source; `port` is the probe server's port; not run as written.

   ```js
   { manifest_version: 2, name: 'ng072 probe', version: '1.0',
     browser_specific_settings: { gecko: { id: 'ng072-probe@powerbrowser.test' } },
     background: { scripts: ['bg.js'] },
     permissions: [`http://127.0.0.1:${port}/*`] }
   ```

2. Decide on signing.
   - AMO-signed XPI (listed or unlisted): no pref change.
   - Unsigned or self-signed XPI: `xpinstall.signatures.required` must be `false` in the running profile. Upstream default is `true` (`$PB_REPO/upstream/browser/app/profile/firefox.js`, pref `xpinstall.signatures.required`), PB does not override it, and `$PB_REPO/configuration.toml` has no key for it. Because ESR builds leave `MOZ_REQUIRE_SIGNING` off (`$PB_REPO/upstream/toolkit/moz.configure`, function `require_signing`), the pref is honored rather than locked (`$PB_REPO/upstream/toolkit/mozapps/extensions/internal/AddonSettings.sys.mjs`, `REQUIRE_SIGNING`). The header comment of `$PB_REPO/scripts/verify-webextensions.mjs` states the same chain.

3. **PB core edit** (the allowlist row): Host the XPI. `install_url` must start with `https://` or `file:///`. An `https` host must be added to the `hosts` list of `$PB_REPO/powerbrowser/endpoint-allowlist.json` with a hand-written `reason`, or `verify-webextensions` fails naming the host.

4. **PB core edit**: Declare it in `$PB_REPO/configuration.toml` (format from `FIXTURE_ENTRY_A` in `$PB_REPO/scripts/verify-webextensions.mjs`):

   ILLUSTRATIVE: the self-test fixture entry from PB source, written as TOML; `acme-tool@example.org` is a placeholder add-on.

   ```toml
   [[webextensions]]
   id = "acme-tool@example.org"
   installation_mode = "force_installed"
   install_url = "https://addons.example.org/acme-tool-1.2.3.xpi"
   ```

5. Generate: `(cd "$PB_REPO" && nix develop .#theia --command node scripts/generate.mjs)`; bare `node` fails without the pinned `inkscape` ([CF-05](CONFLICTS.md#cf-05)). This writes `$PB_REPO/generated/webextensions-settings.json`:

   ILLUSTRATIVE: the fragment `emitWebExtensionSettings` produces for the entry above; not run.

   ```json
   {
     "acme-tool@example.org": {
       "installation_mode": "force_installed",
       "install_url": "https://addons.example.org/acme-tool-1.2.3.xpi"
     }
   }
   ```

6. **PB core edit**: Copy that object into `$PB_REPO/powerbrowser/distribution/policies.json` as the value of `policies.ExtensionSettings`. Change only that key; the sibling keys must stay byte-identical: `AppUpdateURL`, `DisableTelemetry`, `DisableFirefoxStudies`, and `SearchEngines` (copied the same way from `$PB_REPO/generated/search-engines.json`, the fragment `emitSearchEngines` in `$PB_REPO/scripts/generate.mjs` writes from `[[search_engines]]`). The generator does not do this copy.

7. Run the quick gate: `(cd "$PB_REPO" && node scripts/verify-webextensions.mjs)` (and `--self-test`). Both are registered in `$PB_REPO/scripts/verify-platform.sh` as the rows `webextensions` and `webextensions-self-test`.

8. Package and run the live check: `$PB_REPO/powerbrowser/packaging/package-linux.sh` copies `policies.json` into `$STAGE/distribution/` (its `cp "$ROOT/powerbrowser/distribution/policies.json"` line). `$PB_REPO/scripts/verify-ng-072-policies-webextension.mjs` (row `ng072-policies-packaged-webextension` in `$PB_REPO/scripts/verify-platform.sh`, tier full) is the worked example of a policy-installed add-on loading in the packaged binary.

### Worked example: verify-ng-072-policies-webextension.mjs

It proves end to end that a policy-declared add-on installs and runs (`$PB_REPO/scripts/verify-ng-072-policies-webextension.mjs`). Steps:
1. Extracts the Linux package and checks the packaged `distribution/policies.json` is byte-equal to the tracked file.
2. Starts a loopback HTTP server on `127.0.0.1:<random port>` that records a hit on `/ng072-loaded`.
3. Writes an MV2 add-on whose background script is one line: ``fetch('http://127.0.0.1:${port}/ng072-loaded');`` and zips it to `ng072.xpi` with Python `zipfile`.
4. Adds the entry to the extracted copy's policy:

   ILLUSTRATIVE: reformatted from the `policy.policies.ExtensionSettings` assignment in PB source.

   ```js
   policy.policies.ExtensionSettings = { ...(policy.policies.ExtensionSettings ?? {}),
     [ID]: { installation_mode: 'force_installed', install_url: `file://${xpi}` } };
   ```

5. Creates a fresh profile with `user.js` containing `user_pref("xpinstall.signatures.required", false);`.
6. Launches `<prefix>/<identity.binary_name> --headless --no-remote --profile <dir> about:blank` and waits up to 90 s for the probe hit.

Use the same pattern (loopback probe + temporary profile pref) to test a new add-on without changing tracked files.

## Reference

### `[[webextensions]]` keys

Sources: the `webextensions[].id`, `webextensions[].installation_mode` and `webextensions[].install_url` rules of `$PB_REPO/scripts/lib/config-schema.json`, `validateWebExtensionElements` in `$PB_REPO/scripts/generate.mjs`, and the section "`[[webextensions]]` — declared WebExtensions (absent table means none)" of `$PB_REPO/docs/REBRANDING.md`.

| Key | Required | Validation | Emitted as |
|---|---|---|---|
| `id` | yes | `^([A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9.-]*\|\{UUID\})$` (name@host or braced UUID). Duplicate ids fail. | ExtensionSettings key |
| `installation_mode` | yes | one of `force_installed`, `normal_installed` (`WEBEXTENSION_INSTALLATION_MODES` in `$PB_REPO/scripts/generate.mjs`). `allowed`, `blocked` and others fail. | `installation_mode` |
| `install_url` | yes | `^(https://\|file:///)[^\s\x00-\x1f\x7f]+$`; https host must be in `$PB_REPO/powerbrowser/endpoint-allowlist.json` | `install_url` |

No other keys are accepted (unknown keys fail the generator). There is no `sha256`, `version` or signing key for `[[webextensions]]`. sha256 pinning applies only to `[[extensions]]` (Theia/VS Code plugins), not to WebExtensions.

Arrays replace, never merge: a downstream manifest that restates `[[webextensions]]` replaces the whole list.

### Gates

| Script | Tier | Asserts |
|---|---|---|
| `$PB_REPO/scripts/verify-webextensions.mjs` | quick | fragment equals emitter output (SKIP if `$PB_REPO/generated/` absent); tracked `ExtensionSettings` equals emitter output in both directions; every https `install_url` host is in allowlist `hosts` |
| `$PB_REPO/scripts/verify-webextensions.mjs --self-test` | quick | six planted faults each go red naming the id or host |
| `$PB_REPO/scripts/verify-ng-072-policies-webextension.mjs` | full (live, needs built package) | packaged `policies.json` equals tracked; a force-installed MV2 XPI from `file://` runs its background script |

### Prefs and build flags that govern add-ons

Rows marked PB are prefs in the tracked `$PB_REPO/powerbrowser/branding/release/pref/firefox-branding.js` (generator output). Rows citing `$PB_REPO/upstream/` are from the pinned Gecko checkout and are not drift-checked.

| Setting | Value in PB | Source | Effect |
|---|---|---|---|
| `xpinstall.signatures.required` | `true` (upstream default, not overridden) | `$PB_REPO/upstream/browser/app/profile/firefox.js` (pref `xpinstall.signatures.required`) | unsigned XPIs refused |
| `MOZ_REQUIRE_SIGNING` | off (ESR) | `$PB_REPO/upstream/toolkit/moz.configure` (`require_signing`) | signing pref can be flipped |
| `extensions.experiments.enabled` | `false` | `$PB_REPO/upstream/browser/app/profile/firefox.js` (pref `extensions.experiments.enabled`) | `experiment_apis` add-ons refused unless privileged-signed |
| `AddonSettings.EXPERIMENTS_ENABLED` | follows the pref above (not locked, because `MOZ_REQUIRE_SIGNING` is off) | `$PB_REPO/upstream/toolkit/mozapps/extensions/internal/AddonSettings.sys.mjs` (`EXPERIMENTS_ENABLED`) | setting the pref to `true` enables experiment APIs |
| `MOZ_ALLOW_ADDON_SIDELOAD` | on (defaults to `is_esr`) | `$PB_REPO/upstream/toolkit/moz.configure` (`MOZ_ALLOW_ADDON_SIDELOAD`) | sideload scopes scanned |
| `extensions.autoDisableScopes` | `15` (upstream default) | `$PB_REPO/upstream/browser/app/profile/firefox.js` (pref `extensions.autoDisableScopes`) | sideloaded add-ons arrive disabled |
| `extensions.update.autoUpdateDefault` | `false` (PB) | `$PB_REPO/powerbrowser/branding/release/pref/firefox-branding.js` | no automatic add-on updates |
| `extensions.getAddons.cache.enabled` | `false` (PB) | `$PB_REPO/powerbrowser/branding/release/pref/firefox-branding.js` | AMO search/discovery off |
| `extensions.getAddons.get.url`, `.langpacks.url`, `.discovery.api_url`, `.browserMappings.url`, `extensions.addonAbuseReport.url` | `""` (PB) | `$PB_REPO/powerbrowser/branding/release/pref/firefox-branding.js` | AMO endpoints blanked |
| `extensions.systemAddon.update.enabled` | `false` (PB) | `$PB_REPO/powerbrowser/branding/release/pref/firefox-branding.js` | no system add-on updates |
| `services.addons.mozilla.org` | `deny` | the `hosts` entry for that host in `$PB_REPO/powerbrowser/endpoint-allowlist.json` | AMO host contact fails `verify-endpoints` |

### Native messaging (stock, unused)

| Item | Value |
|---|---|
| User manifest dir (Linux) | `$HOME/.mozilla/native-messaging-hosts/` (hardcoded `.mozilla`, not rebranded; `$PB_REPO/upstream/toolkit/xre/nsXREDirProvider.cpp` (the user native-messaging directory lookup) and `$PB_REPO/upstream/toolkit/components/extensions/NativeManifests.sys.mjs` (`NativeManifests`)) |
| System manifest dir (Linux) | `/usr/lib/mozilla/native-messaging-hosts/` or `/usr/lib64/mozilla/...` (`$PB_REPO/upstream/toolkit/xre/nsXREDirProvider.cpp`, the system directory lookup) |
| Shipped hosts | none |
| Tested | no |

### Stock-tab bridge kind relevant to add-ons

The chrome side is `PowerBrowserAPI.openStockTab` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`, reached through the `case "openStockTab"` arm of `handleGroupMutation`; the Theia sender is `requestStockTab` in `$PB_REPO/theia/extensions/tab-uris/src/browser/browser-window-command.ts`.

| Kind | Payload | Reply | Gating |
|---|---|---|---|
| `openStockTab` | `{ kind: 'openStockTab', url }` dispatched as `CustomEvent(GROUP_REQUEST_EVENT, { bubbles: true, cancelable: true, detail: { requestId, msg } })` from the Theia frontend | `{ ok: true, kind, where }`, `where` is `"opened-tab"`, `"opened-window"`, or `"refused-scheme"` (return values of `openStockTab`) | only `about:newtab` (also the fallback for an empty `url`) and `http(s)://` accepted (scheme check at the top of `openStockTab`); the Theia sender `requestStockTab` already drops non-http(s) URLs before dispatch |

Consequence: `about:addons`, `about:debugging` and `moz-extension://` pages cannot be opened from Theia through this path.

## Rules and constraints

From `$PB_REPO/CLAUDE.md`:
- Rule 2: never modify Gecko outside the patch stack; `$PB_REPO/upstream/` is never hand-edited. Add-on behavior changes are made by prefs or policy, not by patching the add-on manager.
- Rule 2: Firefox internals are reached only through `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`. Do not enable experiment APIs to work around this.
- Rule 5: no custom browser chrome is authored. Do not build a toolbar or extensions menu into the shell to host WebExtension UI.
- Checks: derive expectations from the tree, do not hand-keep lists; a new check needs a `--self-test` that plants faults. Add a check by appending one row to the registry of `$PB_REPO/scripts/verify-platform.sh`.
- User-facing copy: no internal identifier (pref key, add-on id) in user-facing text.
- `$PB_REPO/docs/REBRANDING.md`, section "`[[webextensions]]` — declared WebExtensions (absent table means none)": no add-on binary is ever vendored into the PB tree. The add-on list is downstream data.
- Every new network host an add-on contacts unattended needs a row in `$PB_REPO/powerbrowser/endpoint-allowlist.json`.

## Gotchas

- Copying the fragment into `policies.json` is manual. Running only `generate.mjs` leaves the tracked key stale and `verify-webextensions` fails.
- `$PB_REPO/generated/` is gitignored. On a fresh clone the fragment check SKIPs; the tracked-key check still runs.
- An unsigned XPI listed in policy fails to install silently with the shipped defaults. NG-072 passes only because it sets the signing pref in a temporary `user.js`.
- There is no PB config key for `xpinstall.signatures.required`. `$PB_REPO/powerbrowser/branding/<variant>/pref/firefox-branding.js` is generator output (`emitFirefoxBrandingJs` in `$PB_REPO/scripts/generate.mjs`), so hand-editing it fails the byte-identity check. There is no `$PB_REPO/configuration.toml` route. The only way to ship it is a **PB core edit**: add the line to `FIREFOX_BRANDING_BASE_LINES` in `$PB_REPO/scripts/generate.mjs` and regenerate (see [Gotchas](07-automation-and-disabled-surfaces.md#gotchas) in doc 07, item 4). That changes the release signing posture; get user approval first. (The header comment of `$PB_REPO/scripts/verify-webextensions.mjs` says a downstream flips the pref "in its own branding pref file"; no generator mechanism for that exists.)
- `extensions.update.autoUpdateDefault = false`. UNVERIFIED: the policy engine re-fetches a changed `install_url` of an https add-on while auto-update is off; this was not tested. Verify: declare an https add-on, replace the XPI at its `install_url` with a higher version, restart PB and read the add-on version in `about:addons` of a stock browser window.
- The shell window has `windowtype="powerbrowser:main"` (attribute of the root element of `$PB_REPO/powerbrowser/shell/powerbrowser.xhtml`), not `navigator:browser`, and contains no toolbox, nav-bar, sidebar or unified-extensions element. Browser actions, page actions, popups and `sidebar_action` render only in stock browser windows.
- UNVERIFIED: whether `browser.tabs` and `browser.windows` enumerate the Theia shell window or the in-shell web tabs; not tested. Assume they see only stock browser windows until tested. Verify: install a policy add-on whose background script logs `browser.windows.getAll({ populate: true })` while a Theia web tab is open, and compare the result with the open windows.
- Sideloaded add-ons (dropped into profile or system extension dirs) are disabled until the user enables them in `about:addons`, which is not reachable from Theia. Use policy install instead.
- Native messaging hosts use the hardcoded `$HOME/.mozilla` path, shared with any installed Firefox, not a PB-branded path.
- Upstream Firefox ML prefs (`extensions.ml.enabled`, trialML API) are upstream defaults and not set by PB (the upstream default of `extensions.ml.enabled` is `true`: `$PB_REPO/upstream/modules/libpref/init/all.js`, pref `extensions.ml.enabled`; PB branding prefs do not override it).

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
