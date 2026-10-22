# Powerbrowser-Extensions: agent instructions (Claude Code, Codex, Theia AI)

This repo is the home for new PowerBrowser (PB) extensions. PB core lives at `$PB_REPO`. Treat PB core as read-only reference unless the task explicitly says to change it.

## What PowerBrowser is

PB is a rebrandable web browser platform: a real Firefox ESR browser engine whose default GUI is an Eclipse Theia IDE shell. Web pages and editors run in the same application. Full version: `docs/00-what-is-powerbrowser.md`.

- **Firefox ESR 153.5.0esr** (`firefox_esr_tag = "FIREFOX_153_5_0esr_BUILD1"`). PB is a patch-set repo, not a code fork: `upstream/` is an unmodified ESR checkout, plus a small stack in `patches/`, plus PB's own tree. Full browser features stay intact: WebExtensions, DRM, per-site process isolation, Mozilla security updates.
- **Eclipse Theia 1.76.0** (browser target, Node >= 24). Consumed as `@theia/*` npm packages, never edited. Everything PB adds is a `@powerbrowser/*` Theia extension in `theia/extensions/`.
- **Stream model.** Firefox ESR and Theia are upstreams; PB is the midstream platform; branded distributions are downstreams that add, never patch. If a downstream must edit a PB file, PB is missing an extension point.

How it runs:

1. The Firefox process starts. Chrome code `powerbrowser/shell/TheiaService.sys.mjs` launches the bundled Theia backend as a Node sidecar on `127.0.0.1:<port>` and supervises it (health checks, restart).
2. The shell window `chrome://powerbrowser/content/powerbrowser.xhtml` shows the Theia frontend full-window in its `powerbrowser-content` browser element. Every backend request needs a per-launch cookie (`@powerbrowser/token-gate`).
3. Theia frontend code reaches Firefox internals only through the `PowerBrowserGroup` JSWindowActor, served by `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, the single boundary to Firefox internals (docs/02).
4. Tabs are URL-addressable Theia tabs (`stock:`, `web:` and Theia URIs, `@powerbrowser/tab-uris`). They are stored in `tabs.sqlite` in the profile, which only chrome writes.
5. Theia is the default GUI, not the only one: a stock Firefox browser window stays reachable. Modes (Coding / Browsing / Organising and custom) reshape the shell (`@powerbrowser/modes`).
6. Branding comes from two inputs only: `configuration.toml` and `brand/`. `node scripts/generate.mjs` derives everything else, so never hand-edit generated files.

Ways to change PB, from least to most invasive: runtime CSS (`customize.css`), a pinned WebExtension or VS Code plugin declared in `configuration.toml`, a new `@powerbrowser/*` Theia extension (needs a rebuild), a new bridge message kind in `PowerBrowserAPI.sys.mjs` (a PB core change), and a Gecko patch (last resort).

The docs in `docs/` were verified against PB commit `d353a94` on 2026-10-20. Check the current commit with `git -C $PB_REPO rev-parse --short HEAD`. If it is newer, run `git -C $PB_REPO diff --stat d353a94 HEAD` and re-verify any doc fact against PB source before you rely on it. Facts marked `UNVERIFIED:` were never confirmed.

## PB hard rules that extensions must follow

These come from `$PB_REPO/CLAUDE.md`. Read that file for the full text.

1. **Never fork or patch Theia core.** Theia additions are `@powerbrowser/*` extensions. Consume `@theia/*` as npm dependencies pinned to the release (1.76.0). Never vendor or edit them. `scripts/diff-theia-core.sh` is the check.
2. **Never modify Gecko outside the patch stack.** Never hand-edit `upstream/`. Firefox internals are reached only through `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, and every touchpoint is catalogued in `powerbrowser/INTERNAL-APIS.md` (`scripts/check-internals-boundary.sh`).
3. **Design for the bridge.** Nothing may weld Theia to full-window presentation. `TabUriRegistry`'s exported shape is asserted (`scripts/verify-registry-shape.mjs`).
4. **The repo path must contain no space character.** A space breaks every native link step.
5. **Theia is the default GUI, and stock browser chrome stays reachable.** No custom browser chrome is authored: no tab strip, toolbar, address bar or menu of our own outside Theia.

Also binding:

- Verification has one driver, `scripts/verify-platform.sh`. To add a check, append one `"label|command"` row. Never create a sibling driver. Never assert on the absence of a log line you emit yourself. Derive expectations from the tree, and give each check a `--self-test`.
- `node scripts/scan-brand-residue.mjs` must exit 0. It reads `git ls-files`, so stage new files first. Name the originating product only in `inventory/brand-tokens.json`.
- Patches are regenerated, never text-edited.
- User-facing text contains no internal identifiers (pref key, port, sentinel, raw exception). Name the product "PowerBrowser" and end every error with an on-screen next step.
- Builds run in Nix dev shells: `nix develop .#theia` for `theia/` (yarn fails in the host shell) and `nix develop .#firefox` for `upstream/`.
- Every new outbound host needs a row in `powerbrowser/endpoint-allowlist.json` (`scripts/verify-endpoints.sh`).
- Theia DI binds are static at module load (D-50). Only chrome writes `tabs.sqlite`. Never open it for writing.

## Docs index

- `docs/00-what-is-powerbrowser.md`: read first. What PB is, its parts, how it boots and runs, repo layout, data stores, versions, glossary.
- `docs/08-building-an-extension.md`: read before building anything. Learning path, extension types and how each gets into PB, repo layout, dev loop, testing, end-to-end checklist.
- `docs/09-tabs-reference.md`: anything touching tabs or groups. Tab model, tabs.sqlite schema, access matrix (which API per extension type), change events, gaps.
- `docs/00-choosing-a-surface.md`: read next. Maps tasks to surfaces and lists capability gaps.
- `docs/01-theia-extensions.md`: you are adding shell UI, commands or keybindings, injecting PB services (`TabUriRegistry`, `ChromeStoreClient`, `GroupModel`, `ModeService`), or using `customize.css` / `customize.js`.
- `docs/02-powerbrowser-api-bridge.md`: Theia code needs Firefox chrome data or actions (history, bookmarks, group writes, stock tabs), or you must add a new actor message `kind`.
- `docs/03-tab-store-mcp-server.md`: an external process or AI agent needs tabs, groups, history or bookmarks over MCP, or you are adding an MCP tool.
- `docs/04-theia-backend-rpc-http.md`: you need a Node backend service (JSON-RPC), a backend-to-window relay, `POWERBROWSER_ENV`, the egress allowlist, or a new external listener.
- `docs/05-webextensions.md`: you are working with page content, content scripts or `webRequest`, or installing a Firefox add-on by policy.
- `docs/06-theia-plugins-and-ai.md`: you are shipping a `.vsix` plugin, or adding Theia AI tools, agents, model providers or MCP-client servers.
- `docs/07-automation-and-disabled-surfaces.md`: you need WebDriver BiDi live tests, DevTools, Marionette, geckodriver, WebMCP or Firefox ML, or the single-instance handler.

Do not invent APIs. If a doc does not cover something, read PB source and mark anything you cannot confirm as `UNVERIFIED:`.
