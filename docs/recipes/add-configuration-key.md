# Add a configuration key

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/configuration.toml`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/scripts/lib/config-schema.json`
- `$PB_REPO/docs/REBRANDING.md`
- `$PB_REPO/powerbrowser/distribution/policies.json`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/scripts/verify-platform.sh`

PB core edits: 5

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

A new key in `$PB_REPO/configuration.toml` reaches the generated outputs and every tracked file that carries it.

## Before you start

- Rung 2 of the [ladder](../10-changing-pb-core.md#the-ladder). Stop and ask before the first edit, name rung 2 and the files, under the [approval rules](../10-changing-pb-core.md#approval-rules).
- [Procedure: add a configuration key](../subsystems/generator.md#procedure-add-a-configuration-key): the six-step order this recipe condenses.
- Companion changes, listed in [Change X, also change Y](../10-changing-pb-core.md#change-x-also-change-y): schema row, manifest value, emitter, reference row, tracked copy-over, and an allowlist row for each new host.

## Confirm before coding

- `grep -n 'rejectUnknown' "$PB_REPO/scripts/generate.mjs"`
- `grep -n 'const TARGETS' "$PB_REPO/scripts/generate.mjs"`
- `grep -n 'assertEmittable' "$PB_REPO/scripts/generate.mjs"`
- `grep -n '"keys"' "$PB_REPO/scripts/lib/config-schema.json"`

## Steps

1. **PB core edit** Add the dotted path as a key of `keys` in `$PB_REPO/scripts/lib/config-schema.json`. Give it a `product.vendor_machine`-shaped row: `type`, `required`, `regex`, `regex_help`, `regex_example`. The check `rejectUnknown` in `$PB_REPO/scripts/generate.mjs` refuses a manifest setting with no row. Set `required` only for a key a downstream must state (`maskDefaults` removes required keys from the defaults layer). The `regex` admits only characters the step 3 guard accepts.
2. **PB core edit** Set the value in `$PB_REPO/configuration.toml`. Never add an `[assets]` or `[build]` table; the generator refuses it ([CF-09](../CONFLICTS.md#cf-09)).
3. **PB core edit** Read `config.<section>.<setting>` in an emitter in `$PB_REPO/scripts/generate.mjs`, through the guard for its sink: `assertEmittable` for shell and mozconfig text, `assertNsisEmittable` for installer defines, `assertXmlEmittable` for XML. A new generated file needs a row in `TARGETS`. On a red `generated-byte-identity`, change the emitter, never a tracked comparand such as `$PB_REPO/powerbrowser/identity.configure.comparand`.
4. **PB core edit** Add the dotted path as a code span in the matching section of "Reference: every `$PB_REPO/configuration.toml` field" in `$PB_REPO/docs/REBRANDING.md`. `verify-rebranding-docs` requires every schema path there.
5. **PB core edit** Only when the value reaches a tracked file, copy the changed keys by hand ([CF-10](../CONFLICTS.md#cf-10)). Targets: `ExtensionSettings` or `SearchEngines` in `$PB_REPO/powerbrowser/distribution/policies.json`; `AppUpdateURL` in the same file (no emitter); or, only when `$PB_REPO/configuration.toml` declares one or more `[[extensions]]`, the `theiaPlugins` block of `$PB_REPO/theia/applications/browser/package.json`. For each new https host, add a `host`, `disposition`, `reason` row to `$PB_REPO/powerbrowser/endpoint-allowlist.json`. A new host is a stop-and-ask item.
6. Run inside the Theia shell from the PB root: `nix develop .#theia --command node scripts/generate.mjs`, then the same command with `--check`. It writes only the gitignored `$PB_REPO/generated/` folder, so it is unlabelled. Never use bare node on the host.

## Verify

- `"$PB_REPO"/scripts/verify-platform.sh --only generate-check` prints PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only generated-byte-identity` prints PASS.
- `"$PB_REPO"/scripts/verify-platform.sh --only verify-rebranding-docs` prints PASS.
- After step 5: `--only webextensions`, `--only search-engines` and `--only extension-pins` each print PASS. For a pin, add `--only verify-upstream-pins`. After a Gecko build, add `--only ng064-update-url-from-manifest` (full tier).
- `"$PB_REPO"/scripts/verify-platform.sh --only generate-self-test` prints PASS. Scalar keys only; array keys need the element validators in `docs/subsystems/generator.md`.
- `"$PB_REPO"/scripts/verify-platform.sh --only scan-brand-residue` exits 0, and `--quick` prints no FAIL line.
- A key that reaches `$PB_REPO/.mozconfig` or a compiled define needs the tier-3 rebuild that `$PB_REPO/docs/BUILD.md` names.

UNVERIFIED: the six steps were never run on a live tree, see the [generator gaps](../subsystems/generator.md#gaps). Verify: run the Verify commands after step 6.

## Done when

- `generate-check` and `generated-byte-identity` print PASS.
- `generate-self-test` prints PASS, and its planted faults go red naming the setting.
- A manifest setting with no schema row fails naming its dotted path.

## Rollback

- Step 6: after steps 1 to 5 are undone, run the generator again. Generated output follows the manifest and is never hand-edited.
- Step 5: restore the changed keys to their earlier values.
- Step 4: remove the code span.
- Step 3: remove the emitter read.
- Step 2: remove the key.
- Step 1: remove the schema row.
- Review changes with `git --no-optional-locks -C "$PB_REPO" diff`.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
