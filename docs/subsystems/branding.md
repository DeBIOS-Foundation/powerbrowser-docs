# Branding

> Verified against PB dfe3b6c on 2026-10-25. Level: source-read

Source files:
- `$PB_REPO/configuration.toml`
- `$PB_REPO/brand/mark.svg`
- `$PB_REPO/brand/HUMAN-REVIEW.md`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/scripts/lib/config-schema.json`
- `$PB_REPO/inventory/brand-tokens.json`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts`
- `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx`
- `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-welcome-contribution.ts`
- `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx`
- `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-branding-config.ts`
- `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-mark.ts`
- `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-favicon-contribution.ts`
- `$PB_REPO/docs/REBRANDING.md`
- `$PB_REPO/powerbrowser/distribution/policies.json`

Not read:
- NOT COVERED: Gecko brand files beyond what the preflight and identity gates compare (brand.ftl, brand.properties, configure.sh)
- NOT COVERED: packaging and installer internals (owned by the Phase 11 references)
- NOT COVERED: the endpoint allowlist table (owned by docs/02-powerbrowser-api-bridge.md)
- NOT COVERED: live build proof (no live build was run)

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

## What it is

- Branding turns two inputs, `$PB_REPO/configuration.toml` and `$PB_REPO/brand/`, into every product surface: the window identity, the Theia welcome/about/favicon, the installer and update endpoints, and the Gecko display names. The originating product is named only in `$PB_REPO/inventory/brand-tokens.json`.
- The generator owns the derivation: `emitTheiaFrontendConfig` and `emitTheiaBranding` in `$PB_REPO/scripts/generate.mjs` emit fragments that are copied by hand into the tracked Theia config block. Derived files are never hand-edited.
- The runtime channel is the `powerbrowserBranding` block plus `applicationName`: read synchronously at render time with compiled fallbacks, so the tree boots where the provider is unset. An unset text renders no element; nothing is invented.
- The mark has one source: `$PB_REPO/brand/mark.svg` in `$PB_REPO/brand/mark.svg`. Its companion twin and the ten rasters derive from that file; the preflight asserts the twin is byte-equal.
- The two-input rule is load-bearing but qualified: fragment keys copied into tracked files plus allowlist rows are hand work. Follow [CF-10](../CONFLICTS.md#cf-10); the unsupported-key list follows [CF-09](../CONFLICTS.md#cf-09).

## Where its data lives

- Rebrand manifest `$PB_REPO/configuration.toml`. Writer: the downstream author. Required keys fail loudly when omitted; optional keys state exactly what omission does.
- Mark source `$PB_REPO/brand/mark.svg`. Writer: the downstream author replacing the file under the preflight contract (square viewBox, dual fill, single-line element).
- Generated fragments `$PB_REPO/generated/theia-frontend-config.json` and `$PB_REPO/generated/theia-branding.json`. Writers: `emitTheiaFrontendConfig` and `emitTheiaBranding` in `$PB_REPO/scripts/generate.mjs`.
- Tracked Theia config block in `$PB_REPO/theia/applications/browser/package.json`. Writer: hand copy-over of the fragment keys (`applicationName`, `defaultTheme`, `powerbrowserBranding`) only; the file stays yarn-managed otherwise.
- Rasters `$PB_REPO/powerbrowser/branding/{dev,release}/default{16,32,48,64,128}.png`. Writer: system inkscape through `RASTER_ENV` in `$PB_REPO/scripts/generate.mjs` at generate time.
- Runtime channel `FrontendApplicationConfigProvider.get()` in the Theia frontend. Reader: `readBrandingConfig` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-branding-config.ts` with narrowing (`textOrUndefined`, `stringArrayOrUndefined` in the same file) and an all-undefined fallback.
- Review record `$PB_REPO/brand/HUMAN-REVIEW.md`. Writer: the human sign-off ritual; the mechanical gate asserts the file list still matches.

## Access matrix

| Layer | Read | Write | API |
| --- | --- | --- | --- |
| Generator | Manifest plus mark source | Fragments plus rasters | `emitTheiaFrontendConfig` and `emitTheiaBranding` in `$PB_REPO/scripts/generate.mjs`; `readMarkSvgElement` in `$PB_REPO/scripts/generate.mjs`; `emitLegalNotices` in `$PB_REPO/scripts/generate.mjs` |
| Theia frontend | `applicationName` plus `powerbrowserBranding` through the config provider | None | `readBrandingConfig` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-branding-config.ts`; `powerBrowserMarkInline` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-mark.ts` |
| Packager | Generated fragments plus tracked block | Branding directories plus installer defines | Generator target table; no hand edits to derived files |
| Verifier | Tree plus manifest-derived values plus `brand_display_expectations` in `$PB_REPO/inventory/brand-tokens.json` | None | `verify-branding-preflight.mjs` in `$PB_REPO/scripts/` (expected-value source is the inventory, never the generator output) |
| Editor (human) | Manifest, mark source, tracked copy-over targets | Manifest and mark only, plus the surgical copy-over | `$PB_REPO/brand/HUMAN-REVIEW.md` for new `$PB_REPO/brand/` files |

## APIs by layer

- `readBrandingConfig` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-branding-config.ts`: synchronous channel read returning `PowerBrowserBranding` (`welcomeText`, `aboutText`, `repoUrl`, `markSvg`, `legalNotices` in the same file). Non-string or empty resolves to `undefined`; anything off-shape resolves the legal array to `undefined`.
- `POWERBROWSER_MARK_SVG` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-mark.ts`: the compiled mark twin, byte-identical to the single-line `<svg>` element of `$PB_REPO/brand/mark.svg`.
- `powerBrowserMarkInline` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-mark.ts` and `inlineMarkFromSvg` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-mark.ts`: `currentColor` transform for in-shell surfaces.
- `POWERBROWSER_MARK_DATA_URI` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-mark.ts`: OS-driven favicon bytes built from the same twin.
- `FALLBACK_DISPLAY_NAME` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx`: boot fallback for the welcome heading.
- `POWERBROWSER_REPO_URL` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx`: boot fallback for the repo link.
- `FALLBACK_LEGAL_NOTICES` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx`: boot fallback for the three About notices.
- `emitTheiaFrontendConfig` in `$PB_REPO/scripts/generate.mjs`: owns `applicationName` from `identity.display_name` and `defaultTheme` from `theia.default_theme`.
- `emitTheiaBranding` in `$PB_REPO/scripts/generate.mjs`: owns the `powerbrowserBranding` fragment; unset `theia.welcome_text` or `theia.about_text` emits null.
- `emitLegalNotices` in `$PB_REPO/scripts/generate.mjs`: composes the three notices from `legal.trademark_notice`, the display identity plus the non-association tail constant in `$PB_REPO/scripts/generate.mjs`, and the Eclipse sentence derived from the repo URL host.
- `readMarkSvgElement` in `$PB_REPO/scripts/generate.mjs`: reads the single-line `<svg>` element or fails naming the asset.
- `INVENTORY_PATH` in `$PB_REPO/scripts/scan-brand-residue.mjs`: the residue scan's only token source, `$PB_REPO/inventory/brand-tokens.json`.

## Events and change signals

- Manifest edit has no event. Re-run `node scripts/generate.mjs` (inside the Theia dev shell for the inkscape step), then the rebuild tier the touched surface maps to.
- `generate.mjs --check` asserts idempotence: a second run produces the same bytes; stale, absent and leftover outputs are distinct outcomes.
- A new file under `$PB_REPO/brand/` fails the trademark-surface gate until the human record re-signs it.

## Commands, settings and ids

| Manifest key | Runtime field | Surface |
| --- | --- | --- |
| `identity.display_name` in `$PB_REPO/scripts/lib/config-schema.json` | `applicationName` | Welcome heading, About title, window title |
| `theia.default_theme` in `$PB_REPO/scripts/lib/config-schema.json` | `defaultTheme` | Sidecar theme |
| `theia.welcome_text` in `$PB_REPO/scripts/lib/config-schema.json` | `powerbrowserBranding.welcomeText` | Welcome paragraph; null renders nothing |
| `theia.about_text` in `$PB_REPO/scripts/lib/config-schema.json` | `powerbrowserBranding.aboutText` | About paragraph; null renders nothing |
| `installer.support_url` falling back to `product.homepage` in `$PB_REPO/scripts/lib/config-schema.json` | `powerbrowserBranding.repoUrl` | Welcome and About repo link |
| `legal.trademark_notice` in `$PB_REPO/scripts/lib/config-schema.json` | `legalNotices[0]` | Own notice in About |
| `$PB_REPO/brand/mark.svg` in `$PB_REPO/brand/mark.svg` | `powerbrowserBranding.markSvg` | Favicon, welcome mark, About mark |
| `urls.update` in `$PB_REPO/scripts/lib/config-schema.json` | Tracked `AppUpdateURL` (hand copy) | Update endpoint |

- `PowerBrowserWelcomeCommand` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-welcome-contribution.ts`: id `powerbrowser.welcome:toggle`.
- `PowerBrowserWelcomeViewContribution` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-welcome-contribution.ts`: wires `widgetId` `welcome`, so the address is `view:welcome`; first-boot layout only.
- The `welcome` factory id in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts`: binds the welcome widget factory plus the favicon contribution and the guarded `AboutDialog` rebind.

## Surfaces

| Surface | Runtime source | Fallback owner |
| --- | --- | --- |
| Welcome heading | `applicationName` through the config provider | `FALLBACK_DISPLAY_NAME` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx` |
| Welcome text, link, mark | `readBrandingConfig` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-branding-config.ts` | Link literal, mark twin, no element for unset text |
| About title, text, link, mark, notices | `applicationName` plus `readBrandingConfig` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-branding-config.ts` | `FALLBACK_DISPLAY_NAME` and `FALLBACK_LEGAL_NOTICES` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx` plus link and mark twins |
| In-shell mark theme | `inlineMarkFromSvg` on the channel SVG | `powerBrowserMarkInline` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-mark.ts` |
| Favicon | channel `markSvg` encoded as a data URI at `onStart` | `POWERBROWSER_MARK_DATA_URI` in `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-mark.ts` |
| Tracked Theia config | `applicationName`, `defaultTheme`, `powerbrowserBranding` keys | Generator fragments (copy-over target) |
| Rasters | `$PB_REPO/brand/mark.svg` via inkscape | Generator (`RASTER_ENV` in `$PB_REPO/scripts/generate.mjs`) |
| Built binary and installer names | Generator Gecko/NSIS emissions | Manifest display values |

## Limits and rules

- No hot rebrand: a manifest edit needs `generate.mjs` plus the app-bundle or rebuild tier the touched surface maps to. The rebrand guide states the tier per surface.
- Unset texts emit null and render nothing: the schema marks `theia.welcome_text` and `theia.about_text` optional, and the widgets render no element for null.
- Markup in texts is rejected: the schema regex for `theia.welcome_text` and `theia.about_text` in `$PB_REPO/scripts/lib/config-schema.json` allows plain words only.
- The mark twin stays byte-identical to `$PB_REPO/brand/mark.svg`: asserted by the preflight on every run; the two are never edited apart.
- Rasters derive only from `$PB_REPO/brand/mark.svg` through the pinned inkscape: asserted structurally by the icon gate.
- After manifest endpoint or declaration changes, copy the matching keys by hand into `$PB_REPO/powerbrowser/distribution/policies.json` and the `theiaPlugins` block of `$PB_REPO/theia/applications/browser/package.json`, add allowlist rows for new hosts (see [the bridge doc](../02-powerbrowser-api-bridge.md#rules-and-constraints)), and run the matching verify rows. Full rule in [CF-10](../CONFLICTS.md#cf-10).
- Unsupported manifest keys are never added: take every key from the rebrand guide or the schema. Full rule in [CF-09](../CONFLICTS.md#cf-09).
- Patches add no brand values: enforced by the patch brand-value rows.

## Verification

- `scan-brand-residue` in `$PB_REPO/scripts/verify-platform.sh` (quick): no originating-product residue outside the inventory scope.
- `scan-brand-residue-self-test` in `$PB_REPO/scripts/verify-platform.sh` (quick): the residue gate goes red on a planted token.
- `branding-preflight` in `$PB_REPO/scripts/verify-platform.sh` (quick): tree plus manifest-derived values match the hand-authored inventory expectations, including the mark twin, square viewBox, dual fill and the notice pins.
- `branding-preflight-self-test` in `$PB_REPO/scripts/verify-platform.sh` (quick): the preflight goes red on planted drift.
- `verify-manifest-literals` in `$PB_REPO/scripts/verify-platform.sh` (quick): multi-word display literals live only in allowlisted carriers.
- `verify-manifest-literals-self-test` in `$PB_REPO/scripts/verify-platform.sh` (quick): the literal gate goes red on a planted literal.
- `verify-trademark-surface` in `$PB_REPO/scripts/verify-platform.sh` (quick): the `$PB_REPO/brand/` file list still matches the signed human record.
- `verify-trademark-surface-self-test` in `$PB_REPO/scripts/verify-platform.sh` (quick): the surface gate goes red on an unlisted file.
- `verify-rebranding-docs` in `$PB_REPO/scripts/verify-platform.sh` (quick): the rebrand guide documents the schema's setting table.
- `verify-rebranding-docs-self-test` in `$PB_REPO/scripts/verify-platform.sh` (quick): the doc-coverage gate goes red on a removed mention.
- `check-patch-surface-brand-values` in `$PB_REPO/scripts/verify-platform.sh` (quick): patches add no brand values.
- `check-patch-surface-brand-values-self-test` in `$PB_REPO/scripts/verify-platform.sh` (quick): the patch gate goes red on a planted value.
- `branding-dir-agreement` in `$PB_REPO/scripts/verify-platform.sh` (quick): the generated branding directory is the complete drop-in set.
- `branding-dir-agreement-self-test` in `$PB_REPO/scripts/verify-platform.sh` (quick): the agreement gate goes red on drift.
- `icon-ihdr` in `$PB_REPO/scripts/verify-platform.sh` (quick): rasters and containers are structurally valid.
- `icon-ihdr-self-test` in `$PB_REPO/scripts/verify-platform.sh` (quick): the icon gate goes red on a planted break.
- `theia-branding` in `$PB_REPO/scripts/verify-platform.sh` (quick): fragments equal the manifest emission and the tracked block matches.
- `theia-branding-self-test` in `$PB_REPO/scripts/verify-platform.sh` (quick): the branding gate goes red on a drifted block or fragment.
- `verify-branding` in `$PB_REPO/scripts/verify-platform.sh` (full): live headless proof that the branding extension loads with title, favicon, config, welcome and about.
- `verify-branding-identity-dev` and `verify-branding-identity-release` in `$PB_REPO/scripts/verify-platform.sh` (full): six-surface identity equality on the built artifacts.
- `branding-variant-divergence` in `$PB_REPO/scripts/verify-platform.sh` (full): dev versus release divergence reaches the builds.

## PB docs and deltas

- `$PB_REPO/docs/REBRANDING.md` section "2. Generate first, before anything else": agrees, the fetch reads generated pins, so generate runs first.
- `$PB_REPO/docs/REBRANDING.md` section "Reference: every `$PB_REPO/configuration.toml` field": agrees, the per-key source for what omission does.
- `$PB_REPO/docs/REBRANDING.md` section "6. Drop in the logo": agrees, square viewBox, dual fill, single-line element with the byte-identical twin rule.
- `$PB_REPO/docs/REBRANDING.md` walkthrough build section: agrees, no hot rebrand; a manifest edit re-runs the generator plus the mapped rebuild tier.
- `$PB_REPO/docs/CUSTOMIZE.md`: no branding section; its headings are the file locations, the CSS layer and the developer-only JS layer.
- [CF-09](../CONFLICTS.md#cf-09): unsupported keys are never added; take keys from the guide or the schema.
- [CF-10](../CONFLICTS.md#cf-10): the tracked `policies.json` keys and the `theiaPlugins` block need the surgical hand copy after generator changes.

## Gaps

- GAP: no hot rebrand exists in PB. Checked: `$PB_REPO/docs/REBRANDING.md` and `emitTheiaBranding` in `$PB_REPO/scripts/generate.mjs`.
- GAP: unset welcome and about texts render nothing; no copy is invented. Checked: `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx` and `$PB_REPO/theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx`.
- GAP: markup and code in welcome and about texts are rejected by the schema. Checked: the `theia.welcome_text` regex in `$PB_REPO/scripts/lib/config-schema.json`.

## Unsettled items

- UNVERIFIED: the ten rasters reproduce byte-identically under the pinned inkscape. Verify: run the generator inside the Theia dev shell, then `icon-ihdr` and `generate-check` in `$PB_REPO/scripts/verify-platform.sh`.
- UNVERIFIED: the welcome, about and favicon behaviour in a running build matches the channel. Verify: build, then run `verify-branding` in `$PB_REPO/scripts/verify-branding.mjs`.
- UNVERIFIED: the release-variant surfaces on disk match the release manifest. Verify: run the full tier-3 release build, then `verify-branding-identity-release` in `$PB_REPO/scripts/verify-platform.sh`.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
