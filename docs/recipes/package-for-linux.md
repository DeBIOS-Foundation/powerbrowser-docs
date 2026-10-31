# Package for Linux

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/powerbrowser/packaging/package-linux.sh`
- `$PB_REPO/powerbrowser/packaging/node-runtime.json`
- `$PB_REPO/powerbrowser/distribution/policies.json`
- `$PB_REPO/docs/BUILD.md`
- `$PB_REPO/scripts/verify-platform.sh`

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

A Linux tarball with the Theia sidecar, the pinned Node runtime and the policy file is written to the build output folder, and the packaged-launch rows pass.

## Before you start

- The Gecko build and the Theia build come first ([build commands](../subsystems/build-system.md#commands-settings-and-ids)).
- No PB core edit here, so no ladder rung applies. This recipe publishes nothing. The release channel is planned, not implemented ([works today vs planned](../subsystems/packaging-and-release.md#works-today-vs-planned)). Stop and ask before any tag or upload.
- Stop and ask before any new outbound host. The Node archive download happens at build time and no row for it exists in `$PB_REPO/powerbrowser/endpoint-allowlist.json`; `$PB_REPO/docs/BUILD.md` section "Linux package (NG-063, NG-072)" describes the download.
- Companion checks, each a verify row below: the Node major (`node-major-agreement`), the policy copy, the update host and the installer schema. No row checks the Node archive's SHA256.

## Confirm before coding

- `grep -n 'NODE_SHA' "$PB_REPO/powerbrowser/packaging/package-linux.sh"`
- `grep -n 'precomplete' "$PB_REPO/powerbrowser/packaging/package-linux.sh"`
- `grep -n 'linux-x64' "$PB_REPO/powerbrowser/packaging/node-runtime.json"`

## Steps

1. Not labelled. Build the Gecko tree inside `nix develop .#firefox` from `$PB_REPO/upstream/`, as the Firefox half of `$PB_REPO/docs/BUILD.md` describes, using the tier that the change needs. This writes build output (`objdir`) into the PB checkout.
2. Not labelled. Inside `nix develop .#theia`, run `yarn build` from the `theia` folder under the PB root. This writes build output into the PB checkout.
3. Not labelled. Stop and ask before this step: it downloads the pinned Node archive from `nodejs.org`, and `endpoint-allowlist.json` has no row for that host. Then, from the PB root, run `nix develop .#firefox --command bash powerbrowser/packaging/package-linux.sh`. It writes into the PB checkout: the Node archive cache in `.mozbuild/node-dist`, and the tarball under `objdir/dist`. It stages the sidecar, the pinned Node and `distribution/policies.json`, refreshes precomplete and rewrites the tarball under `objdir/dist`. The script cannot check the Node release signature, so the owner runs `gpg --verify` as `docs/BUILD.md` states.
4. Not labelled. Check the output: exactly one tarball matching the linux-x86_64 pattern exists under `objdir/dist`.

## Verify

- `"$PB_REPO"/scripts/verify-platform.sh --only ng063-packaged-launch` (full) prints PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only ng072-policies-packaged-webextension` (full) prints PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only ng071-tarball-extensions-build` (full) prints PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only ng064-update-url-from-manifest` (full) prints PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only installer-schema` (quick) prints PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only node-major-agreement` (quick) prints PASS. It checks the Node major only.

UNVERIFIED: the four full rows have no recorded run at the current ESR (153.5) in this tree. Verify: run the four full rows above on this tree.

## Done when

- The tarball exists under `objdir/dist`, and the four full rows print PASS.
- The packaged `policies.json` equals the tracked file (row `ng072-policies-packaged-webextension`).

## Rollback

- Steps 1 to 4 change nothing tracked. To discard the output, delete the staged folder and the tarball under `objdir/dist` only after the user agrees, because it is destructive build output.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
