# Rebrand a downstream

> Verified against PB 0f27a5c on 2026-10-25. Level: source-read

Source files:
- `$PB_REPO/docs/REBRANDING.md`
- `$PB_REPO/configuration.toml`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/scripts/lib/config-schema.json`
- `$PB_REPO/brand/HUMAN-REVIEW.md`
- `$PB_REPO/inventory/brand-tokens.json`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/powerbrowser/distribution/policies.json`
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

A downstream build shows its own name, texts, mark and update host. Its two brand inputs live outside the tree; steps 3 to 5 copy the downstream values into tracked files, a PB gap (see Before you start).

## Before you start

- Rung 2 (configuration keys) and the CF-10 copies. Stop and ask first. Steps 3 to 5 change tracked files and need the user's approval. The release steps (tags, uploads, publication) are outside this recipe.
- Steps 3 to 5 are the CF-10 hand copy. `AGENTS.md` says a downstream edit to a PB file means PB is missing an extension point; say so in the question.
- The commands come from the section "Rebranding from an external config directory" of `$PB_REPO/docs/REBRANDING.md`.
- [Branding limits and rules](../subsystems/branding.md#limits-and-rules) and [generator commands](../subsystems/generator.md#commands-settings-and-ids).
- [CF-09](../CONFLICTS.md#cf-09) and [CF-10](../CONFLICTS.md#cf-10) say the copy-over of tracked files is a hand step.
- Companions are listed in [change X, also change Y](../10-changing-pb-core.md#change-x-also-change-y), not copied here: the tracked-file copy-over, and the allowlist row for each new host.

## Confirm before coding

- `grep -n 'PB_CONFIG_DIR' "$PB_REPO/scripts/generate.mjs"`
- `grep -n 'display_name' "$PB_REPO/scripts/lib/config-schema.json"`
- `grep -n 'applicationName' "$PB_REPO/theia/applications/browser/package.json"`
- `grep -n 'AppUpdateURL' "$PB_REPO/powerbrowser/distribution/policies.json"`

## Steps

1. Not labelled. Put the two inputs in an outside directory `<dir>`: `<dir>/configuration.toml` and `<dir>/brand/mark.svg`. Use a path with no space. Leave every other platform input unchanged.
2. Not labelled. From the PB checkout root, inside the Theia shell, run `nix develop .#theia --command env PB_CONFIG_DIR=<dir> node scripts/generate.mjs`, then the same command with `--check`. This writes the gitignored `$PB_REPO/generated/` folder, which is build output.
3. **PB core edit** In `$PB_REPO/theia/applications/browser/package.json`, copy only the `applicationName` and `defaultTheme` keys of `theia.frontend.config` and the `powerbrowserBranding` block from the generator output (`$PB_REPO/generated/theia-frontend-config.json` and `$PB_REPO/generated/theia-branding.json`). Copy the `theiaPlugins` block only when `$PB_REPO/configuration.toml` declares `[[extensions]]` (CF-10).
4. **PB core edit** In `$PB_REPO/powerbrowser/distribution/policies.json`, copy `ExtensionSettings` and `SearchEngines` from the `webextensions-settings.json` and `search-engines.json` fragments in `$PB_REPO/generated/`, changing only those keys. Set `AppUpdateURL` by hand to the exact `[urls] update` value from the manifest. The generator has no emitter for `AppUpdateURL`; `ng064-update-url-from-manifest` checks it.
5. **PB core edit** For each new https host that the brand names (the update address, or an install or search address), add an object with `host`, `disposition` and `reason` to the `hosts` array of `$PB_REPO/powerbrowser/endpoint-allowlist.json`. Stop and ask first.

## Verify

- `"$PB_REPO"/scripts/verify-platform.sh --only verify-rebranding-docs` prints `verify-rebranding-docs: PASS`.
- `"$PB_REPO"/scripts/verify-platform.sh --only generate-check` prints `generate-check: PASS`.
- `"$PB_REPO"/scripts/verify-platform.sh --only generated-byte-identity` prints `generated-byte-identity: PASS`.
- `"$PB_REPO"/scripts/verify-platform.sh --only branding-preflight` prints `branding-preflight: PASS`.
- `"$PB_REPO"/scripts/verify-platform.sh --only theia-branding` prints `theia-branding: PASS`.
- `"$PB_REPO"/scripts/verify-platform.sh --only icon-ihdr` prints `icon-ihdr: PASS`.
- `"$PB_REPO"/scripts/verify-platform.sh --only scan-brand-residue` exits 0.
- On a built dev tree (full tier): `"$PB_REPO"/scripts/verify-platform.sh --only verify-branding` and `--only verify-branding-identity-dev` print PASS. After step 4, `--only ng064-update-url-from-manifest` prints PASS.

UNVERIFIED: whether a mark that lives outside the tree passes `generated-byte-identity` and `verify-trademark-surface`, because the trademark row reads the in-tree brand list and the human record must re-sign any change under `$PB_REPO/brand/`. Verify: run the two rows after step 2 and read their output.

## Done when

- `generate-check` prints PASS.
- `theia-branding` prints PASS.
- `verify-branding` prints PASS on a built tree.

## Rollback

- Steps 3 to 5: for each changed tracked file, run `git --no-optional-locks -C "$PB_REPO" diff -- <file>`. If it holds more than this recipe's edits, stop and ask. Otherwise, after the user agrees, restore it with `git --no-optional-locks -C "$PB_REPO" restore -- <file>`, then run the generator without `PB_CONFIG_DIR` and re-run the verify rows.
- Steps 1 and 2: delete the outside directory only after the user agrees.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
