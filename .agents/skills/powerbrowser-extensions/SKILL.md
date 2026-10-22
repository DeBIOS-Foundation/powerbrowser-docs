---
name: powerbrowser-extensions
description: Use when building, changing or planning anything that extends or customizes PowerBrowser (PB), the Firefox ESR browser platform whose GUI is an Eclipse Theia shell - Theia extensions, UI panels, commands, CSS/theme customization, add-ons/WebExtensions, VS Code plugins, MCP tools, Theia AI tools or agents, backend services, or any question about which PB API, bridge message or endpoint exists. Tells the agent which surface to pick and which reference doc holds the exact API.
---

# Building on PowerBrowser

PB core is at `$PB_REPO` (read-only reference unless the task says otherwise). The reference docs are in `docs/` at the root of the Powerbrowser-Extensions repo (`this repository/docs/`).

## Procedure

1. Read `AGENTS.md` at the repo root for the PB hard rules. They are binding. If you do not already know how PB is built (Firefox ESR engine, Theia sidecar, bridge, tab store), read `docs/00-what-is-powerbrowser.md` first.
2. Check the docs are current: `git -C $PB_REPO rev-parse --short HEAD`. The docs were verified at `d353a94`. If HEAD differs, run `git -C $PB_REPO diff --stat d353a94 HEAD` and re-check any fact you use whose source file changed.
3. Read `docs/08-building-an-extension.md` for the end-to-end workflow (where code lives, how it reaches PB, dev loop, checklist). Then open `docs/00-choosing-a-surface.md` and find the row for the task. It names the surface and the doc to read.
4. Read only the doc(s) that row names:
   - `01-theia-extensions.md` - new `@powerbrowser/*` extension, UI, commands, PB DI services, `customize.css`
   - `02-powerbrowser-api-bridge.md` - Firefox chrome data/actions from Theia, new bridge message `kind`
   - `03-tab-store-mcp-server.md` - external process or AI agent access to tabs/history/bookmarks over MCP, new MCP tool
   - `04-theia-backend-rpc-http.md` - Node backend JSON-RPC service, token gate, egress allowlist, external listener
   - `05-webextensions.md` - Firefox add-ons, content scripts, `webRequest`, policy install, signing
   - `06-theia-plugins-and-ai.md` - `.vsix` plugins, Theia AI tools/agents/model providers, MCP client config
   - `09-tabs-reference.md` - any tab or group feature: tab model, schema, access matrix, events, gaps
   - `07-automation-and-disabled-surfaces.md` - BiDi, Marionette, DevTools, WebMCP, Firefox ML (dev/test only)
5. Before writing code, open the PB source files the doc lists for the APIs you will call and confirm the signatures. Never invent an API; mark anything you cannot confirm `UNVERIFIED:`.
6. If no surface supports the task, it is in the gaps list in `00-choosing-a-surface.md`. Tell the user what would need building in PB core instead of working around a rule.

## Stop and ask the user before

- Editing any file in PB core (`$PB_REPO`).
- Adding AI tools, agents, model providers or MCP config to PB core (out of scope in PB's requirements, see `06-theia-plugins-and-ai.md`).
- Shipping a pref change, enabling `powerbrowserPrivilegedJs`, experiment APIs, unsigned XPIs or any remote protocol.
- Adding an outbound host (needs an `endpoint-allowlist.json` row).

## Done means

- The change uses only the surfaces and APIs in the docs or confirmed in PB source.
- A PB change has its `scripts/verify-platform.sh` row and passes `scripts/verify-platform.sh --quick`.
- You report which docs you relied on and any `UNVERIFIED:` items.
