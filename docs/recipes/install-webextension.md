# Install a WebExtension

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/configuration.toml`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/scripts/verify-webextensions.mjs`
- `$PB_REPO/powerbrowser/distribution/policies.json`
- `$PB_REPO/scripts/verify-platform.sh`

PB core edits: 3

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

A signed add-on installs by policy and its content scripts run on pages.

## Before you start

- [How to use](../05-webextensions.md#how-to-use).
- [Webextensions keys](../05-webextensions.md#webextensions-keys).
- [Gates](../05-webextensions.md#gates).

## Confirm before coding

- `grep -n 'emitWebExtensionSettings' "$PB_REPO/scripts/generate.mjs"`
- `grep -n 'WEBEXTENSION_INSTALLATION_MODES' "$PB_REPO/scripts/generate.mjs"`
- `grep -n 'ExtensionSettings' "$PB_REPO/powerbrowser/distribution/policies.json"`

## Steps

1. Build the XPI, outside `$PB_REPO`. Set `browser_specific_settings.gecko.id` in `manifest.json` to the id you will declare. Host the XPI at an `https://` URL or a `file:///` URL.
2. **PB core edit** Add a `[[webextensions]]` entry to `$PB_REPO/configuration.toml` with `id`, `installation_mode` (`force_installed` or `normal_installed`) and `install_url`. An `https://` host also needs a `hosts` row in `$PB_REPO/powerbrowser/endpoint-allowlist.json`. That is an outbound-host change: stop and ask, then see [add an outbound host](add-outbound-host.md).
3. **PB core edit** Run `node scripts/generate.mjs` inside `nix develop .#theia`. It writes `$PB_REPO/generated/webextensions-settings.json`, which is gitignored.
4. **PB core edit** In `$PB_REPO/powerbrowser/distribution/policies.json`, replace the value of the `ExtensionSettings` key with the object from the generated file. Change no other key. The key is `{}` today.

## Verify

From the root of this repo, run `"$PB_REPO"/scripts/verify-platform.sh --only webextensions`. It must pass. The check fails when the fragment and the `ExtensionSettings` key differ.

## Done when

- The add-on loads in a packaged build and its background script runs (a manual check).
- `--only webextensions` passes.

## Rollback

- Undo step 4: set the `ExtensionSettings` value back to `{}`.
- Undo step 2: remove the `[[webextensions]]` entry.
- Re-run step 3 with the entry removed, so the generated fragment matches.
- Re-run the verify command.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
