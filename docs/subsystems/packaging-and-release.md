# Packaging and release

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/powerbrowser/packaging/package-linux.sh`
- `$PB_REPO/powerbrowser/packaging/node-runtime.json`
- `$PB_REPO/powerbrowser/packaging/version-nplus1/`
- `$PB_REPO/powerbrowser/packaging/mar/`
- `$PB_REPO/powerbrowser/packaging/mar/mar-primary.der`
- `$PB_REPO/powerbrowser/distribution/policies.json`
- `$PB_REPO/powerbrowser/powerbrowser.desktop`
- `$PB_REPO/powerbrowser/powerbrowser-release.desktop`
- `$PB_REPO/powerbrowser/branding/`
- `$PB_REPO/theia/applications/browser/`
- `$PB_REPO/configuration.toml`
- `$PB_REPO/brand/`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/docs/BUILD.md`
- `$PB_REPO/docs/RELEASING.md`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/scripts/verify-mar-update-hop.mjs`
- `$PB_REPO/scripts/verify-installer-schema.mjs`
- `$PB_REPO/scripts/verify-installer-build-proof.mjs`
- `$PB_REPO/scripts/verify-ng-063-packaged-launch.mjs`
- `$PB_REPO/scripts/verify-ng-064-update-url.mjs`
- `$PB_REPO/scripts/verify-ng-065-mar-signature.mjs`
- `$PB_REPO/scripts/verify-ng-066-nsis-branding.mjs`
- `$PB_REPO/scripts/verify-ng-071-tarball-extensions.mjs`
- `$PB_REPO/scripts/verify-ng-072-policies-webextension.mjs`
- `$PB_REPO/.github/workflows/`

Not read:
- NOT COVERED: `$PB_REPO/upstream/` (the Gecko checkout the package is built from; the staged app dir comes from its build)
- NOT COVERED: `$PB_REPO/theia/node_modules/` (the installed Theia tree; the package copies the `better-sqlite3` runtime files from it)
- NOT COVERED: `$PB_REPO/objdir/` and `$PB_REPO/objdir-release/` (build outputs, gitignored)
- NOT COVERED: `$PB_REPO/generated/` (generator output, gitignored)
- NOT COVERED: `$PB_REPO/.mozbuild/` evidence (the hop logs, the install-matrix logs and the Node archive cache, gitignored)
- NOT COVERED: live release runs and their artifacts (no `release.yml` exists in `$PB_REPO/.github/workflows/` at this commit)
- NOT COVERED: staged Windows and macOS hosts and their install proofs
- NOT COVERED: the events-origin Cloudflare Worker and the update descriptor repository

Status: partly working

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

- PowerBrowser ships as a Linux tarball that bundles three things: the Gecko application directory, a staged Theia sidecar, and a pinned official Node runtime. The tarball also carries `distribution/policies.json`.
- The packager is `$PB_REPO/powerbrowser/packaging/package-linux.sh`. It runs `./mach package` in the upstream Gecko checkout, stages the sidecar, the pinned Node and the policy file into the staged application directory, refreshes the `precomplete` file, and rewrites the tarball that `mach` wrote.
- The update channel is fork-self-hosted. The client reads its update host from its own `application.ini`, which is baked from the `update` key under the `[urls]` table in `$PB_REPO/configuration.toml`. It fetches a hash-pinned descriptor, downloads a fork-signed MAR, and verifies the signature against the fork certificate embedded in its updater.
- What this doc does not own: how keys in `$PB_REPO/configuration.toml` become generated outputs (`$PB_REPO/scripts/generate.mjs` owns that; no generator reference exists in `docs/` yet); how brand inputs in `$PB_REPO/brand/` reach the product (no branding reference exists yet); nightly or per-commit CI behaviour.

## Works today vs planned

Works today. The recorded evidence below is in `$PB_REPO/docs/BUILD.md`. None of it was re-run at the current ESR (153.5); the recorded runs used 153.1.0 and 153.1.1.

- Linux tarball path: the Theia sidecar staging, the pinned Node with sha256 enforcement, `distribution/policies.json` in the package, the `precomplete` refresh and the tarball rewrite. The "Per-OS install matrix" section of `$PB_REPO/docs/BUILD.md` records the Linux install, launch, alongside-stock-Firefox and uninstall cells as GREEN on 2026-09-05.
- Loopback update hop: the "MAR build and serve loop" section of `$PB_REPO/docs/BUILD.md` records N 153.1.0 to N-plus-1 153.1.1 as `applied`, with a zero-Mozilla-host resolver log. The gate row `mar-update-hop` re-verifies that recorded evidence. It is not a 153.5 proof.
- Windows installer compile on Linux: the `installer-build-proof` row recorded PASS on 2026-09-05. The compiled installer is not run on Windows.
- Dev-run policy copy: the "Policy install (dev runs only)" section of `$PB_REPO/docs/BUILD.md` records a live check in both directions (with and without the policy file).

Planned or staged. Each item below is stated in PB docs as ahead of its implementation or not yet executed.

- Windows installer: unsigned, with the SmartScreen path. The install, launch and uninstall cells need the Windows host `pkg-win11`, which is not provisioned.
- macOS universal DMG: ad-hoc signature only. The cells need the `pkg-macos` host, which is not provisioned.
- MSIX package: out of scope for the release, per `$PB_REPO/docs/RELEASING.md` (it needs the Windows SDK and only serves a Store listing).
- Live release channel: the signed tag, the `build-linux` and `sign-upload` jobs, the draft Release, the descriptor publication and the `channel-live` job. `$PB_REPO/docs/RELEASING.md` describes these as written ahead of the stages that create them.

## Where its data lives

- Staged application directory: created by `./mach package` under the gitignored build output directory `objdir`. `package-linux.sh` adds `theia`, `node` and `distribution` beside the Gecko binaries. The `dist/bin` tree under that build output is not modified, so dev runs keep the dev tree. Writer: `$PB_REPO/powerbrowser/packaging/package-linux.sh`.
- Theia sidecar inside the staged directory: the built app's `lib` without `.map` files, its `package.json`, its `plugins` directory when present, and the `better-sqlite3` runtime files (the JS wrapper, `package.json` and the linux-x64 prebuild) under `node_modules` beside `lib`. The built app is `$PB_REPO/theia/applications/browser/`; its `lib` is gitignored build output. Writer: `$PB_REPO/powerbrowser/packaging/package-linux.sh`.
- Pinned Node: the release named by `linux-x64` in `$PB_REPO/powerbrowser/packaging/node-runtime.json`. The packager downloads the archive once into the gitignored `.mozbuild/node-dist` cache and deletes it on a hash mismatch.
- `distribution/policies.json` in the package: copied from `$PB_REPO/powerbrowser/distribution/policies.json` by `$PB_REPO/powerbrowser/packaging/package-linux.sh`.
- Tarball: rewritten by the packager in the `dist` directory of the gitignored build output, with the pattern `*-<version>.en-US.linux-x86_64.tar.xz`. The name observed at 153.1.0 is recorded in `$PB_REPO/docs/BUILD.md`. Whether the release asset keeps the locale token is pending in `$PB_REPO/docs/RELEASING.md`.
- Test N-plus-1 version files in `$PB_REPO/powerbrowser/packaging/version-nplus1/` (`version.txt`, `version_display.txt`): test-only fork versions (153.1.1 and 153.1.1esr) for the hop proof. They are not an upstream ESR tag.
- Tracked MAR certificate `$PB_REPO/powerbrowser/packaging/mar/mar-primary.der`: the public half of the fork MAR key. The private key is stored outside the repository, and `$PB_REPO/docs/BUILD.md` names this certificate as the only tracked key material.
- Identity inputs in `$PB_REPO/configuration.toml`: `[urls]` (the `update` descriptor URL, whose host the build bakes as `MOZ_APPUPDATE_HOST`), `[installer]` (`support_url`, which feeds the NSIS URL defines) and `[identity]`.
- Desktop entries `$PB_REPO/powerbrowser/powerbrowser.desktop` (dev) and `$PB_REPO/powerbrowser/powerbrowser-release.desktop` (release). Both carry the header "Generated from configuration.toml by scripts/generate.mjs". Each has an `Exec` and an `Icon` line that start with the `@POWERBROWSER_REPO_ROOT@` placeholder, which the install step replaces with the checkout path.
- Hop evidence: `hop.json`, `update.xml`, `server-access.log` and `client-resolver.log` under the gitignored `.mozbuild/mar-hop/` directory. Writer: the hop procedure in `$PB_REPO/docs/BUILD.md`. The gate reads these files and never writes them.

## Access matrix

| Layer | Read | Write | API |
| --- | --- | --- | --- |
| Theia extension code | Never reads packaging inputs | Never writes packaging outputs | None; packaging is not an extension surface |
| Downstream rebrander | Reads the identity and installer keys in `$PB_REPO/configuration.toml` | Edits `$PB_REPO/configuration.toml` and `$PB_REPO/brand/` only | The generator, `$PB_REPO/scripts/generate.mjs` |
| Release operator (planned) | Reads `$PB_REPO/docs/RELEASING.md` and `$PB_REPO/docs/BUILD.md` | Pushes a tag that matches the release pattern | The tag pattern and `gh run watch`, as written in `$PB_REPO/docs/RELEASING.md` |
| `package-linux.sh` | Reads the built Theia app, `$PB_REPO/powerbrowser/packaging/node-runtime.json` and `$PB_REPO/powerbrowser/distribution/policies.json` | Writes the staged application directory, `precomplete` and the tarball | `$PB_REPO/powerbrowser/packaging/package-linux.sh` |

## APIs by layer

- `NODE_VERSION`, `NODE_URL` and `NODE_SHA` in `$PB_REPO/powerbrowser/packaging/package-linux.sh`: the pinned Node version, download URL and sha256, read from the `linux-x64` entry of `$PB_REPO/powerbrowser/packaging/node-runtime.json`.
- `precomplete` in `$PB_REPO/powerbrowser/packaging/package-linux.sh`: the staged directory's precomplete list. The script regenerates it with `createprecomplete.py` before the tarball is written.
- `TARBALL` in `$PB_REPO/powerbrowser/packaging/package-linux.sh`: the one tarball rewritten after staging. The run fails unless exactly one matches.
- `patchelf` and `node-file` in `$PB_REPO/powerbrowser/packaging/package-linux.sh`: the checkout-path scrub of the staged sidecar (native RUNPATH removal and the backend bundle key rewrite).
- `linux-x64` in `$PB_REPO/powerbrowser/packaging/node-runtime.json`: the pinned platform release (version, URL, sha256).
- `AppUpdateURL` in `$PB_REPO/powerbrowser/distribution/policies.json`: the fork update-descriptor URL. The policy wins over the `application.ini` value when present.
- `DisableTelemetry` in `$PB_REPO/powerbrowser/distribution/policies.json`: the shipped telemetry policy.
- `SearchEngines` and `Default` in `$PB_REPO/powerbrowser/distribution/policies.json`: the shipped engine list, whose default is `DuckDuckGo Lite`.
- `[urls]` in `$PB_REPO/configuration.toml`: the `update` key, the descriptor URL. The build bakes its host as `MOZ_APPUPDATE_HOST`.
- `support_url` in `$PB_REPO/configuration.toml`: the URL the NSIS installer defines consume.
- `CERT` in `$PB_REPO/scripts/verify-ng-065-mar-signature.mjs`: the path of the tracked certificate, `$PB_REPO/powerbrowser/packaging/mar/mar-primary.der`, that the gate loads.
- `MOZ_VERIFY_MAR_SIGNATURE` in `$PB_REPO/docs/BUILD.md`: the compiled-in verification define. The build asserts it in the build's `config.status`.
- `MAR_CHANNEL_ID` in `$PB_REPO/docs/BUILD.md`: the channel id, `<app_basename>-default`, which must equal `ACCEPTED_MAR_CHANNEL_IDS`.
- `signmar` in `$PB_REPO/docs/BUILD.md`: the signing and verify tool. The verify form takes `-v` against a certificate database.
- `application.ini` in `$PB_REPO/docs/BUILD.md`: carries the baked `[AppUpdate]` host, the version and the build ID that the hop compares.
- `buildUpdateXml` in `$PB_REPO/scripts/verify-mar-update-hop.mjs`: emits the update descriptor for a MAR file. It is deterministic for identical bytes.

## Events and change signals

- The hop stages: the client's background update timer fires, the client fetches the descriptor and the MAR and checks their hash and size, the staging updater writes the result into the install's `updated` directory, and the swap happens at the next startup.
- The proof records two distinct versions and two distinct build IDs. A same-version loop fails as plumbing only.
- Descriptors are generated by `buildUpdateXml`. The proof serves them over loopback HTTP at `127.0.0.1`. The live channel is planned to serve them over HTTPS from the descriptor repository, as `$PB_REPO/docs/RELEASING.md` describes.
- The fork server access log must show a GET for `/update.xml` and a GET for a `.mar` file. A passing hop with no access-log entry is a failure.
- The client resolver log is sifted with the anchored `Resolving host [...]` form. It must name the serving host, and it must name zero `mozilla.org` or `mozilla.net` hosts.
- Update URL preference: the `AppUpdateURL` policy wins over the `application.ini` URL when the policy is present.

## Commands, settings and ids

- Build the package from the PB repository root, after a Gecko build in the upstream checkout and a Theia `yarn build` in the Theia workspace:

  ```sh
  cd "$PB_REPO"
  nix develop .#firefox --command bash powerbrowser/packaging/package-linux.sh
  ```

- Dev-run policy copy, from the repository root, so that a run from the build output's `dist/bin` loads the fork policy:

  ```sh
  mkdir -p objdir/dist/bin/distribution
  cp powerbrowser/distribution/policies.json objdir/dist/bin/distribution/policies.json
  ```

- Updater assertions, from the repository root, after a build:

  ```sh
  test -x objdir/dist/bin/updater && echo UPDATER_PRESENT
  grep -q "'MOZ_VERIFY_MAR_SIGNATURE'" objdir/config.status && echo VERIFY_ON
  ```

- Release tag pattern: `v<ESR>-<revision>`, for example `v153.2.0-1`, as `$PB_REPO/docs/RELEASING.md` states it. Milestone tags such as `v1.x` never match the pattern and never release.
- Update channel id: `powerbrowser-default`. `$PB_REPO/docs/BUILD.md` derives it from the app basename and sets `MAR_CHANNEL_ID` and `ACCEPTED_MAR_CHANNEL_IDS` to the same value. A MAR for another channel is refused.
- Shipped search default: `DuckDuckGo Lite`, set in `$PB_REPO/configuration.toml` and carried in `$PB_REPO/powerbrowser/distribution/policies.json`.

## Limits and rules

- Never hand-edit a generated output: the two desktop entries and the other generated fragments. Edit `$PB_REPO/configuration.toml` or `$PB_REPO/brand/`, then regenerate with `$PB_REPO/scripts/generate.mjs`. The `generated-byte-identity` row of `$PB_REPO/scripts/verify-platform.sh` enforces byte identity against the tracked comparands.
- The Node archive is hash-checked before unpack. A download that does not match the pin is deleted and the run fails. Enforced by the `NODE_SHA` check in `$PB_REPO/powerbrowser/packaging/package-linux.sh`. The script cannot check the release signature itself. `$PB_REPO/docs/BUILD.md` names the `gpg --verify` step that the owner performs.
- No checkout path ships in the sidecar. The script removes RUNPATHs from the native `.node` files and rewrites the `node-file` keys in the backend bundles. Any staged file that still names the checkout fails the run.
- The updater refuses an unsigned MAR, a MAR signed with a foreign key, and a MAR for another channel. Enforced by the `ng065-mar-signature-enforced` row, which checks `CERT_VERIFY_ERROR` and `MAR_CHANNEL_MISMATCH_ERROR` in `$PB_REPO/scripts/verify-ng-065-mar-signature.mjs`.
- The packaged `policies.json` must equal the tracked file. Enforced by the `ng072-policies-packaged-webextension` row.
- The baked update host must equal the `[urls] update` value. Enforced by the `ng064-update-url-from-manifest` row.

## Verification

Each row is run with `$PB_REPO/scripts/verify-platform.sh --only <label>`. Rows that need a built tree (the build output, the upstream checkout, the Theia build) fail on a bare checkout.

- `mar-update-hop`: re-verifies the recorded N to N-plus-1 hop. It requires two distinct versions and build IDs, a hash-pinned descriptor that re-generates byte-identically, the descriptor and MAR GETs in the server log, and zero Mozilla update hosts in the resolver log. Its evidence is the gitignored `.mozbuild/mar-hop/` set.
- `mar-update-hop-self-test`: proves the hop gate reddens for a faulty proof.
- `ng063-packaged-launch`: proves an extracted package reaches a ready workbench with the sidecar backend and its Node binary inside the extracted prefix, not the checkout. The packaged Node must report the pinned version.
- `ng064-update-url-from-manifest`: proves that no build endpoint points at `aus5.mozilla.org` and that the update URL in `application.ini`, the compiled-in data, the effective default prefs and the tracked policy all name the `[urls] update` host.
- `ng065-mar-signature-enforced`: proves the four signature outcomes. The fork-signed MAR applies. The unsigned MAR and the foreign-key MAR are refused with `CERT_VERIFY_ERROR`. The other-channel MAR is refused with `MAR_CHANNEL_MISMATCH_ERROR`.
- `ng066-nsis-branding-no-ping`: proves the NSIS sources take `AppName` and the certificate name from the manifest, name no Mozilla telemetry host, and return from `SendPingIfApplicable` before doing anything. It then compiles the installer.
- `ng071-tarball-extensions-build`: proves that npm and local-path extension sources are fetched by the declared `download:plugins` step to their pinned sha256 paths. A wrong local pin fails naming the entry.
- `ng072-policies-packaged-webextension`: proves the extracted package carries a `policies.json` byte-equal to the tracked file, and that a fixture WebExtension declared in it installs and loads in the packaged binary.
- `installer-schema`: proves the generated installer fragments in the generator output directory carry the emitter-owned defines with non-empty values and have no schema defect.
- `installer-build-proof`: proves that `makensis` compiles the pinned installer script with the generated branding on Linux into a non-vacuous `setup.exe`. Two inputs are upstream stand-ins, and the PASS record labels them.
- `installer-schema-self-test` and `installer-build-proof-self-test`: prove that the two installer gates redden in their failure case.

## PB docs and deltas

- `$PB_REPO/docs/BUILD.md` agrees with the packaging scripts. Its hop evidence was recorded at N 153.1.0 and N-plus-1 153.1.1, not at 153.5. The `version-nplus1` files still carry 153.1.1, and BUILD names bumping them as backlog item 999.2. A re-run needs an N-plus-1 above the current N.
- `$PB_REPO/docs/BUILD.md` records the install matrix and the timings from 2026-09-04 and 2026-09-05. Those values are not current measurements.
- `$PB_REPO/docs/RELEASING.md` agrees with the tag pattern and the MAR key custody. It describes the `build-linux` and `sign-upload` jobs and the `channel-live` job. No `release.yml` exists in `$PB_REPO/.github/workflows/` at this commit. The tracked workflows are `verify.yml` and `rebase-upstream.yml`, so those jobs are planned, not implemented.
- `$PB_REPO/docs/RELEASING.md` agrees that Linux carries no OS signature, Windows ships unsigned, and macOS carries an ad-hoc signature only.
- `$PB_REPO/docs/RELEASING.md` leaves the release asset names pending. It states the generation rule and the pattern, but no filled filenames exist for Windows or macOS.

## Gaps

- GAP: no MSIX proof exists in this tree. Checked: `$PB_REPO/docs/BUILD.md` records the MSIX mechanics as staged for a Windows host with the SDK, and `$PB_REPO/docs/RELEASING.md` puts MSIX out of scope.
- GAP: no DMG proof exists in this tree. Checked: `$PB_REPO/docs/BUILD.md` records the macOS cells as staged for a host that is not provisioned.
- GAP: no live release-channel proof exists in this tree. Checked: no `release.yml` exists under `$PB_REPO/.github/workflows/`, and `$PB_REPO/docs/RELEASING.md` marks the pipeline as written ahead of the stages that create it.

## Unsettled items

- UNVERIFIED: the ng065 refusal outcomes (unsigned, foreign-key and other-channel MARs) hold on the current tree. No run of that row is recorded in the tree. Verify: build the tree, then run `$PB_REPO/scripts/verify-platform.sh --only ng065-mar-signature-enforced`.
- UNVERIFIED: the hop holds at the current ESR. Verify: bump `$PB_REPO/powerbrowser/packaging/version-nplus1/` above N, run the build and serve loop in `$PB_REPO/docs/BUILD.md`, then run `$PB_REPO/scripts/verify-platform.sh --only mar-update-hop`.
- UNVERIFIED: the live channel serves descriptors and MARs exactly as the loopback proof did. Verify: run the liveness row against the published Release, per the per-release procedure in `$PB_REPO/docs/RELEASING.md`, once the release workflow exists.

## Recipes that touch this

No recipe references this subsystem yet; packaging and rebrand recipes land in a later phase.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
