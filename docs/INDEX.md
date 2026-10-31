# Documentation index

> Verified against PB 0f27a5c on 2026-10-25. Level: source-read

Source files:
- none

Start here. Each entry says when to read the doc. Recipes and subsystem references are indexed through their directory READMEs.

## Top-level docs

- [00-what-is-powerbrowser.md](00-what-is-powerbrowser.md): read first. What PB is, its parts, how it boots, its data stores and glossary.
- [00-choosing-a-surface.md](00-choosing-a-surface.md): before you build anything. Maps a task to the surface and the doc that holds its API, and lists the capability gaps.
- [01-theia-extensions.md](01-theia-extensions.md): shell UI, commands, keybindings, PB services, and customize.css.
- [02-powerbrowser-api-bridge.md](02-powerbrowser-api-bridge.md): Theia code needs Firefox data or actions, or you add a bridge message kind.
- [03-tab-store-mcp-server.md](03-tab-store-mcp-server.md): an external agent needs tabs, groups, history or bookmarks over MCP.
- [04-theia-backend-rpc-http.md](04-theia-backend-rpc-http.md): a Node backend service, a window relay, the egress allowlist, or a new listener.
- [05-webextensions.md](05-webextensions.md): page content, content scripts, webRequest, or installing an add-on by policy.
- [06-theia-plugins-and-ai.md](06-theia-plugins-and-ai.md): shipping a .vsix plugin, or Theia AI tools, agents, providers and MCP client config.
- [07-automation-and-disabled-surfaces.md](07-automation-and-disabled-surfaces.md): WebDriver BiDi tests, DevTools, and surfaces that are disabled.
- [08-building-an-extension.md](08-building-an-extension.md): the learning path, dev loop and end-to-end checklist for building an extension.
- [09-tabs-reference.md](09-tabs-reference.md): anything that touches tabs or groups.
- [10-changing-pb-core.md](10-changing-pb-core.md): before any change to PB core. The ladder, the approval rule and the gates.
- [CONFLICTS.md](CONFLICTS.md): read when a PB doc or planning file and PB source disagree, to see which side these docs follow.
- [CONVENTIONS.md](CONVENTIONS.md): before you edit any doc. The stamp, marker, citation, link and budget rules.
- [FEEDBACK.md](FEEDBACK.md): read when a doc fact is missing, wrong or guessed, to report it as a doc gap.
- [UNVERIFIED.md](UNVERIFIED.md): read when a claim is marked `UNVERIFIED:`, to find the command or file that settles it.
- [_shared/RULES.md](_shared/RULES.md): read when you change a shared rule block (stop-and-ask, hard-rules or footer) that other files copy.

## Directories

- [recipes/README.md](recipes/README.md): task recipes for a PB or extension change, with each recipe's PB core edit count. Read the directory README to find the recipe.
- [subsystems/README.md](subsystems/README.md): PB subsystem references. Read the subsystem reference before you touch that subsystem; the README lists each one.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
