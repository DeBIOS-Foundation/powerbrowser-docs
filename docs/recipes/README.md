# Recipes

> Verified against PB 238fcdf on 2026-10-21. Level: source-read

Source files:
- none

This directory holds short task recipes: ordered steps with exact paths and commands, PB-core-edit labels, a verify command and a rollback. Each `.md` file here other than this README is one recipe, and its `PB core edits:` line gives the number of steps that change PB core. To add one, copy the [recipe template](../_templates/recipe.md) and follow the [template rules](../CONVENTIONS.md#templates).

Each PB core edits count below is the number of steps labelled PB core edit, and it is the same number as that recipe's own `PB core edits:` line.

A step labelled **PB core edit** changes a file under `$PB_REPO`. Ask the user before the first such step, in every recipe, whichever group it is in ([approval rules](../10-changing-pb-core.md#approval-rules)).

## Extension recipes (RCP-01)

These recipes add an extension or a surface. Each one except restyle-shell has at least one PB core edit step, because a PB extension is compiled into PB.

- [Add a shell command](add-command.md), PB core edits: 3
- [Add a shell panel](add-panel.md), PB core edits: 4
- [Add a backend service](add-backend-service.md), PB core edits: 4
- [Add an MCP tool](add-mcp-tool.md), PB core edits: 3
- [Add a Theia AI tool](add-theia-ai-tool.md), PB core edits: 3
- [Pin a VS Code extension](pin-vscode-extension.md), PB core edits: 3
- [Install a WebExtension](install-webextension.md), PB core edits: 3
- [Restyle the shell](restyle-shell.md), PB core edits: 0
- [Add an outbound host](add-outbound-host.md), PB core edits: 1
- [Add a bridge kind](add-bridge-kind.md), PB core edits: 5

## Core recipes (RCP-02)

These recipes change PB itself, or run its build and crash tools (the last two edit no PB file).

- [Add a setting](add-setting.md), PB core edits: 2
- [Add a configuration key](add-configuration-key.md), PB core edits: 5
- [Add a verify check](add-verify-check.md), PB core edits: 2
- [Add a mode](add-mode.md), PB core edits: 2
- [Add a telemetry event](add-telemetry-event.md), PB core edits: 1
- [Add a Theia extension to the app](add-theia-extension-to-app.md), PB core edits: 4
- [Add a tab-store column](add-tab-store-column.md), PB core edits: 5
- [Change a Gecko patch](change-a-patch.md), PB core edits: 1
- [Re-pin Firefox ESR](repin-firefox-esr.md), PB core edits: 2
- [Re-pin Theia](repin-theia.md), PB core edits: 2
- [Rebrand a downstream](rebrand-downstream.md), PB core edits: 3
- [Package for Linux](package-for-linux.md), PB core edits: 0
- [Run the crash collector](run-crash-collector.md), PB core edits: 0

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
