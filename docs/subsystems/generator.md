# Generator (configuration.toml to generated/)

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/configuration.toml`
- `$PB_REPO/brand/`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/scripts/lib/config-schema.json`
- `$PB_REPO/scripts/lib/toml.cjs`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/scripts/verify-upstream-pins.mjs`
- `$PB_REPO/scripts/verify-generated-identity.mjs`
- `$PB_REPO/scripts/verify-rebranding-docs.mjs`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/docs/REBRANDING.md`
- `$PB_REPO/docs/BUILD.md`
- `$PB_REPO/flake.nix`
- `$PB_REPO/powerbrowser/identity.configure.comparand`
- `$PB_REPO/.mozconfig`

Not read:
- NOT COVERED: `$PB_REPO/upstream/`
- NOT COVERED: `$PB_REPO/generated/`
- NOT COVERED: `$PB_REPO/objdir/`
- NOT COVERED: `$PB_REPO/objdir-release/`
- NOT COVERED: `$PB_REPO/theia/node_modules/`

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

PB files read for this doc: `$PB_REPO/configuration.toml`, `$PB_REPO/brand/mark.svg`, `$PB_REPO/brand/HUMAN-REVIEW.md`, `scripts/generate.mjs` (`resolveConfig`, `rejectUnknown`, `requiredLayer`, `maskDefaults`, `mergeLayers`, `validate`, `validateExtensionElements`, `validateWebExtensionElements`, `validateSearchEngineElements`, `assertEmittable`, `assertNsisEmittable`, `assertXmlEmittable`, `TARGETS`, `writeTargets`, `checkTargets`, `emitMozconfig`, `emitIdentityConfigure`, `emitBrandFtl`, `emitFirefoxBrandingJs`, `emitUpstreamPins`, `emitTheiaPlugins`, `emitWebExtensionSettings`, `emitSearchEngines`), `scripts/lib/config-schema.json` (`$comment`, `keys`), `scripts/lib/toml.cjs`, `scripts/verify-platform.sh` (`generate-check`, `generate-self-test`, `generated-byte-identity`, `verify-rebranding-docs`, `verify-upstream-pins` rows), `scripts/verify-upstream-pins.mjs`, `scripts/verify-generated-identity.mjs`, `scripts/verify-rebranding-docs.mjs` (the field derivation and exact-span rule), `$PB_REPO/powerbrowser/identity.configure.comparand`, `$PB_REPO/powerbrowser/endpoint-allowlist.json` (shape only), `$PB_REPO/.mozconfig`, `docs/REBRANDING.md` (section headings), `docs/BUILD.md` (tier-3 rule), `$PB_REPO/flake.nix` (the `theia` devShell inkscape pin). Not read: the gitignored build outputs above, and no live build was run.

## What it is

- `scripts/generate.mjs` is the only writer of the derived build surfaces under `$PB_REPO/generated/`. It reads `$PB_REPO/configuration.toml` and `$PB_REPO/brand/` and rewrites `$PB_REPO/generated/`; no other file is edited to change the brand.
- The two inputs are `$PB_REPO/configuration.toml` (every brand setting) and `$PB_REPO/brand/` (the mark artwork). Everything else under `$PB_REPO/generated/` is derived.
- Tracked files stay tracked: `$PB_REPO/.mozconfig`, `$PB_REPO/powerbrowser/identity.configure.comparand`, `$PB_REPO/powerbrowser/branding/` files, `$PB_REPO/powerbrowser/powerbrowser.desktop` files, `$PB_REPO/powerbrowser/distribution/policies.json` keys, and `$PB_REPO/theia/applications/browser/package.json` keys are build input, never rewritten by the generator.
- Three keys are copied by hand from generated fragments into tracked files: `ExtensionSettings` and `SearchEngines` into `$PB_REPO/powerbrowser/distribution/policies.json`, and the `theiaPlugins` block into `$PB_REPO/theia/applications/browser/package.json`. `AppUpdateURL` in the same `policies.json` has no emitter: it is kept by hand equal to `[urls] update`, and verify row `ng064-update-url-from-manifest` fails when they differ. See [PowerBrowser conflicts register](../CONFLICTS.md#cf-10).
- Nothing under `$PB_REPO/generated/` is ever hand-edited. A hand edit is overwritten by the next run.

## Where its data lives

- `$PB_REPO/configuration.toml`: the manifest. Required keys (identity, product, legal, upstreams, variant elements) fail loudly when omitted; optional keys fall back to documented defaults.
- `$PB_REPO/brand/`: `$PB_REPO/brand/mark.svg` (single-line `svg`, square `viewBox="0 0 128 128"`) plus `$PB_REPO/brand/HUMAN-REVIEW.md` (human artwork sign-off).
- `$PB_REPO/scripts/lib/config-schema.json`: the one schema table (`keys`) for the unknown-key check, the defaults masker, and the validator.
- `$PB_REPO/generated/`: gitignored output tree (`/generated/` in `$PB_REPO/.gitignore`). Exists only to be compared against the tracked files; absent on a fresh clone.
- Tracked comparands: `$PB_REPO/.mozconfig`, `$PB_REPO/powerbrowser/identity.configure.comparand`, and the policy and package.json keys named above.

## Access matrix

| Layer | Read | Write | API |
| --- | --- | --- | --- |
| Downstream editor | `$PB_REPO/configuration.toml`, `$PB_REPO/brand/` | manifest and artwork only | `keys` in `$PB_REPO/scripts/lib/config-schema.json` |
| Generator run | manifest, brand, schema | `$PB_REPO/generated/` | `resolveConfig`, `TARGETS`, `writeTargets`, `checkTargets` in `$PB_REPO/scripts/generate.mjs` |
| Tracked copy-over | `$PB_REPO/generated/` fragments | tracked policy and package.json keys (PB core edit) | `emitTheiaPlugins`, `emitWebExtensionSettings`, `emitSearchEngines` in `$PB_REPO/scripts/generate.mjs` |
| Verifier | `$PB_REPO/generated/`, tracked files, manifest | none | `generate-check`, `generate-self-test`, `generated-byte-identity` rows in `$PB_REPO/scripts/verify-platform.sh` |

## APIs by layer

- `resolveConfig` in `$PB_REPO/scripts/generate.mjs`: resolves the defaults layer plus the downstream layer. Pipeline order is parse, reject unknown settings, mask, merge, validate, emit, write. Unknown settings fail before anything is merged or assigned; masking runs on the defaults-layer object before the merge; nothing is written until every check passes.
- `maskDefaults` in `$PB_REPO/scripts/generate.mjs`: strips every schema-required key out of the defaults layer, so a downstream cannot silently inherit identity, product, legal, or upstream pins.
- `TARGETS` in `$PB_REPO/scripts/generate.mjs`: the frozen target table. Every output path lives here, so no manifest value can direct a write. Rows carry `generated`, an optional `tracked` comparand, a `variant`, and an `emit` function.
- `writeTargets` in `$PB_REPO/scripts/generate.mjs`: emits every target first, checks locale agreement in memory, then writes. A failed run leaves the output tree exactly as it found it.
- `checkTargets` in `$PB_REPO/scripts/generate.mjs`: compares a fresh emission in a temporary directory against `$PB_REPO/generated/`. Reports fresh, stale, absent, and leftover outputs as distinct outcomes; skips with PASS on a tree that never generated.
- `emitMozconfig` in `$PB_REPO/scripts/generate.mjs`: the `$PB_REPO/.mozconfig` build inputs (objdir default, app basename, distribution id, remoting name, update channel).
- `emitIdentityConfigure` in `$PB_REPO/scripts/generate.mjs`: the identity carrier (vendor and UA lines plus the two fixed telemetry-policy lines), pulled into the build by the patch 010 include hook.
- `emitUpstreamPins` in `$PB_REPO/scripts/generate.mjs`: the `upstream-pins.env` fragment (the `[upstreams]` tag as one shell assignment), sourced by `scripts/fetch-upstream.sh` as its default. The command shape is `TAG=<tag> scripts/fetch-upstream.sh` for overrides.
- Fragment emitters in `$PB_REPO/scripts/generate.mjs`: `emitTheiaFrontendConfig`, `emitTheiaBranding`, `emitTheiaTelemetry`, `emitEndpointHosts`, `emitTheiaPlugins`, `emitWebExtensionSettings`, `emitSearchEngines`. Each writes only its fragment; the copy-over into tracked files is a separate hand step.

## Events and change signals

- `generate: default applied` lines on stderr, one per inherited default, naming the dotted path and the value. There are no silent defaults.
- `generate: --check PASS` means the tree matches the manifest; `--check SKIP` means nothing was ever generated (fresh clone); `FAIL` names stale, absent, or leftover files with the rerun step.
- `generate: --self-test PASS` means every planted fault behaved as pinned. A red names the setting and the next step.
- A failed run writes nothing: the output tree is exactly as it was found.

## Commands, settings and ids

- Run the generator inside the Theia shell: `nix develop .#theia --command node scripts/generate.mjs` from `$PB_REPO`. Bare `node` fails at the icon step on a host without the shell's pinned inkscape. See [PowerBrowser conflicts register](../CONFLICTS.md#cf-05).
- Prove freshness: `node scripts/generate.mjs --check` (same shell). Prove the gate discriminates: `node scripts/generate.mjs --self-test`.
- Write elsewhere: `node scripts/generate.mjs --out <dir>` writes under `<dir>` instead of `$PB_REPO/generated/`. `<dir>` must be outside the project; `--out` cannot be combined with `--check` or `--self-test`.
- Generate before fetching upstream: run the generator before `scripts/fetch-upstream.sh`, because the fetch reads its default tag from `$PB_REPO/generated/upstream-pins.env`. An explicit `TAG=<tag>` export overrides the pin. See [PowerBrowser conflicts register](../CONFLICTS.md#cf-06).
- External config: `PB_CONFIG_DIR=<dir> node scripts/generate.mjs` reads `<dir>/configuration.toml` and `<dir>/brand/mark.svg` as the downstream layer. The manifest key `upstreams.firefox_esr_tag` is the one ESR tag the fetch builds against; `upstreams.theia_release` is the exact Theia triple enforced across every `@theia/*` pin.
- Take every `$PB_REPO/configuration.toml` key from `keys` in `$PB_REPO/scripts/lib/config-schema.json`, or from the reference in `$PB_REPO/docs/REBRANDING.md`. Never add an `[assets]` or `[build]` table. See [PowerBrowser conflicts register](../CONFLICTS.md#cf-09).

## Procedure: add a configuration key

Every step is a PB core edit (`$PB_REPO/configuration.toml`, `scripts/lib/config-schema.json`, `scripts/generate.mjs`, a tracked file, `docs/REBRANDING.md`, or `$PB_REPO/powerbrowser/endpoint-allowlist.json`), so the stop-and-ask block at the top applies. Run the steps in order.

1. **Schema row.** Add the dotted path to `keys` in `$PB_REPO/scripts/lib/config-schema.json`. `rejectUnknown` in `$PB_REPO/scripts/generate.mjs` refuses any manifest setting that has no row, names it, and stops before anything is merged. Row fields the generator reads:
   - `required`: `true` makes the key a mask key. `maskDefaults` removes it from the defaults layer, so a downstream must state it. `validate` in `$PB_REPO/scripts/generate.mjs` fails with `is not set` when `$PB_REPO/configuration.toml` omits it (`requiredLayer` only builds the layer of required keys).
   - `type` and `regex` (with `regex_help` and `regex_example`): `validate` requires a text value for `"type": "string"` and tests the value against `regex`. Choose a regex that admits only characters the emitter can carry (step 3).
   - Array keys use `[]` in the path, for example `variants[].id`. The `extensions[]`, `webextensions[]` and `search_engines[]` leaves are checked only by their element validators (`validateExtensionElements`, `validateWebExtensionElements`, `validateSearchEngineElements`), not by the generic check.
2. **Manifest value.** Set the key in `$PB_REPO/configuration.toml`, in its section (`[product]`, `[identity]`, `[legal]`, `[theia]`, `[urls]`, `[installer]`, `[telemetry]`, `[upstreams]`, or a `[[...]]` table). Never add an `[assets]` or `[build]` table ([CF-09](../CONFLICTS.md#cf-09)). A key that is not `required` takes the manifest value as its default for any downstream that omits it, and each inherited default prints one `generate: default applied` line.
3. **Emitter.** Read the value as `config.<section>.<setting>` inside an emitter in `$PB_REPO/scripts/generate.mjs`. Put it into emitted content only through the guard for that sink: `assertEmittable` (shell, mozconfig and other text), `assertNsisEmittable` (installer defines) or `assertXmlEmittable` (XML). Each guard refuses the characters its sink cannot carry and fails the run naming the path.
   - If an existing generated file carries the value, edit the emitter that writes it, for example `emitMozconfig`, `emitIdentityConfigure`, `emitBrandFtl` or `emitFirefoxBrandingJs`.
   - If the key needs a new generated file, add a row to `TARGETS`, the frozen table in `generate.mjs`: `generated` (the path under `$PB_REPO/generated/`), `variant` (`'dev'` or `'release'`, which must match a `[[variants]]` `id`; otherwise the run fails naming the missing variant), `emit(config, variant)`, and optionally `tracked` (a comparand path, only for a file compared byte for byte). `writeTargets` calls every row's `emit` before the first write, so a failed emit leaves the tree unchanged.
4. **Tracked copy-over, only when the value reaches a tracked file.** The generator never edits a tracked file. It writes a fragment, and a PB core edit copies the keys over ([CF-10](../CONFLICTS.md#cf-10)), changing only those keys:
   - `ExtensionSettings` (`emitWebExtensionSettings`) and `SearchEngines` (`emitSearchEngines`) in `$PB_REPO/powerbrowser/distribution/policies.json`.
   - `AppUpdateURL` in the same file has no emitter; when `[urls] update` changes, set it by hand to the same value (`ng064-update-url-from-manifest` checks it).
   - The `theiaPlugins` block of `$PB_REPO/theia/applications/browser/package.json` (`emitTheiaPlugins`).
   - For each new `https` host, such as an `install_url` or a search-engine URL, add a row with `host`, `disposition` (`allow`) and `reason` to the `hosts` array of `$PB_REPO/powerbrowser/endpoint-allowlist.json`.
   - A key that changes `$PB_REPO/.mozconfig` or `$PB_REPO/powerbrowser/identity.configure.comparand` changes a tracked comparand. Change the emitter, not the tracked file: on a red byte-identity result the emitter is what changes, and the tracked file is never edited to make the gate green.
5. **Reference row.** Add the dotted path as an inline code span in the matching section of "Reference: every `$PB_REPO/configuration.toml` field" in `$PB_REPO/docs/REBRANDING.md` (for example `[identity]` for `identity.*`). `verify-rebranding-docs.mjs` derives its field list from `keys` and requires each path as an exact code span or inside a heading. `product.homepage` does not cover `urls.homepage`.
6. **Verify.** From `$PB_REPO`, inside `nix develop .#theia`:
   - `node scripts/generate.mjs` writes `$PB_REPO/generated/`.
   - `node scripts/generate.mjs --check` prints `--check PASS` when a fresh emission matches the tree.
   - `scripts/verify-platform.sh --only verify-rebranding-docs`, `--only generate-check` and `--only generated-byte-identity` each prove one step above. Add `--only verify-upstream-pins` when the key is a pin.
   - When step 4 applies, run the CF-10 rows: `--only webextensions`, `--only search-engines`, `--only extension-pins`, and after a Gecko build `--only ng064-update-url-from-manifest`.
   - A key that reaches `$PB_REPO/.mozconfig` or a compiled define needs a tier-3 rebuild. See `$PB_REPO/docs/BUILD.md` ("Tier 3") and the [build timings](build-system.md#build-timings-carried-attributions) in the build-system reference.

## Limits and rules

- Generated files are never hand-edited. To change a derived surface, edit `$PB_REPO/configuration.toml` or `$PB_REPO/brand/` and re-run the generator, then copy the tracked keys by hand where [PowerBrowser conflicts register](../CONFLICTS.md#cf-10) requires it.
- The generator is the inkscape exception to the plain-`node` rule: it rasterises `$PB_REPO/brand/mark.svg` through the system inkscape in `$PB_REPO/flake.nix`, and only the pinned version reproduces the tracked PNG bytes.
- Unknown settings fail naming the dotted path before anything merges; missing required settings fail naming the setting; a downstream that states one `[[variants]]` element must complete it.
- `variants[].branding_dir` and `variants[].objdir` are emitted as content, never used as write targets.
- A downstream build must state its own `urls.update`: inheriting the platform host fails the run. A mistyped update address fails naming `urls.update`.
- The repo path must contain no space character: a space breaks the icon raster command line the same way it breaks every native link step.

## Verification

- `scripts/verify-platform.sh --only generate-check` proves the `$PB_REPO/generated/` tree matches the manifest right now (skips with PASS on a tree that never generated).
- `scripts/verify-platform.sh --only generate-self-test` proves the generator's planted faults each go red naming the setting.
- `scripts/verify-platform.sh --only generated-byte-identity` proves each emitted file equals its tracked original, without reading `$PB_REPO/generated/`.
- `node scripts/verify-upstream-pins.mjs` proves the manifest tag equals the fragment, the rebase workflow mirror, and the fetch default, with no second tag literal.
- `node scripts/verify-rebranding-docs.mjs` proves every `$PB_REPO/configuration.toml` field has a row in `$PB_REPO/docs/REBRANDING.md`, derived from the same schema table that rejects unknown settings.

## PB docs and deltas

- `$PB_REPO/docs/REBRANDING.md`: agrees. Walkthrough (generate first, edit, regenerate, check), `PB_CONFIG_DIR` external flow, every-field reference, downstream obligations.
- `$PB_REPO/docs/BUILD.md`: agrees. The generator must run inside `nix develop .#theia`; run it before `./mach configure`, because a stale or absent tree misbrands with exit 0.
- `$PB_REPO/docs/BUILD.md` re-pin procedure and `$PB_REPO/docs/REBRANDING.md` field reference are the full procedures; this doc links to them instead of restating them.
- Disagreements that touch the generator live in [PowerBrowser conflicts register](../CONFLICTS.md#cf-05) (bare `node` vs the Theia shell), [PowerBrowser conflicts register](../CONFLICTS.md#cf-06) (generate before fetch), [PowerBrowser conflicts register](../CONFLICTS.md#cf-09) (no `[assets]` or `[build]` keys), and [PowerBrowser conflicts register](../CONFLICTS.md#cf-10) (hand-copy exception).

## Gaps

- The add-a-key procedure is derived from `$PB_REPO/scripts/generate.mjs`, `$PB_REPO/scripts/lib/config-schema.json` and `$PB_REPO/scripts/verify-rebranding-docs.mjs` at the stamp. No add-a-key step was run on a live tree, so the procedure is source-derived, not exercised.
- Step 4 is a hand copy into tracked files. The generator does not write it. Its check is the CF-10 row set named in step 6; a copy that was never made stays red until it is made.

## Unsettled items

- None: every generator claim above was read in `$PB_REPO/scripts/generate.mjs`, `$PB_REPO/scripts/lib/config-schema.json`, `$PB_REPO/docs/REBRANDING.md`, or `$PB_REPO/docs/BUILD.md` at the stamp.

## Recipes that touch this

No recipes yet; the add-a-configuration-key core recipe lands in Phase 17.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
