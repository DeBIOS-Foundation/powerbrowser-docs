# Pin a VS Code extension

> Verified against PB d911f55 on 2026-10-22. Level: source-read

Source files:
- `$PB_REPO/configuration.toml`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/scripts/download-plugins.mjs`
- `$PB_REPO/scripts/verify-extension-pins.mjs`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`

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

The build installs a pinned `.vsix` and the extension runs in the plugin host.

## Before you start

- [Ship a pinned VS Code extension](../06-theia-plugins-and-ai.md#a-ship-a-pinned-vs-code-extension-with-the-build).
- [Extensions keys](../06-theia-plugins-and-ai.md#extensions-keys).
- [Build-time pinned extensions](../08-building-an-extension.md#vs-code-plugin-build-time-pinned-extensions).

## Confirm before coding

- `grep -n 'emitTheiaPlugins' "$PB_REPO/scripts/generate.mjs"`
- `grep -n 'Declared sidecar extensions' "$PB_REPO/configuration.toml"`
- `grep -n 'download:plugins' "$PB_REPO/theia/applications/browser/package.json"`

## Steps

1. Get the archive in a scratch folder outside `$PB_REPO`, and record its sha256 of the archive bytes: `sha256sum <file>.vsix`.
2. **PB core edit** Add an `[[extensions]]` entry to `$PB_REPO/configuration.toml`. Set `id` (it must contain a dot), `source` (`openvsx`, `url`, `npm` or `local-path`), an exact `version`, and the `sha256` from step 1. The file declares no entries today. Open VSX (`open-vsx.org`) already has an allowlist row. Any other host needs a row first: stop and ask, then see [add an outbound host](add-outbound-host.md).
3. **PB core edit** Run `node scripts/generate.mjs` inside `nix develop .#theia`. It writes `$PB_REPO/generated/theia-plugins.json`, which is gitignored. Add a `theiaPlugins` key to `$PB_REPO/theia/applications/browser/package.json` whose value is the object in that file. The key is absent today.
4. **PB core edit** Build inside `nix develop .#theia`: `cd "$PB_REPO/theia/applications/browser" && yarn build`. The build runs `download:plugins`, which fetches each archive, checks its sha256, and unpacks it under `plugins/<id>/`. This writes generated build output (gitignored `plugins/` and `lib/`) into the PB checkout and changes no tracked PB source.

## Verify

From the root of this repo, run `"$PB_REPO"/scripts/verify-platform.sh --only extension-pins`. It must pass.

## Done when

- The plugin unpacks under `$PB_REPO/theia/applications/browser/plugins/<id>/` and its commands run in the plugin host.
- The pin matches the archive bytes (the `extension-pins` check).

## Rollback

- Undo step 3: remove the `theiaPlugins` key from `$PB_REPO/theia/applications/browser/package.json`.
- Undo step 2: remove the `[[extensions]]` entry from `$PB_REPO/configuration.toml`.
- Delete `$PB_REPO/theia/applications/browser/plugins/<id>/` and the archive slot `plugins/<id>.vsix`.
- Re-run the step 4 build, then the verify command.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
