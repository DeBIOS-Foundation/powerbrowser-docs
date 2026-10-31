# Subsystem references

> Verified against PB 238fcdf on 2026-10-21. Level: source-read

Source files:
- none

This directory holds one reference per PB subsystem: what it is, where its data lives, its APIs, events, rules, gaps and unsettled items. The one-line scopes below are copied from each subsystem reference, which carries its own stamp and `Source files:` list; read that reference for the facts. Each `.md` file here other than this README is one subsystem reference. To add one, copy the [subsystem template](../_templates/subsystem.md) and follow the [template rules](../CONVENTIONS.md#templates).

- [Branding](branding.md): How the two brand inputs become every product surface and the runtime branding channel.
- [Build system](build-system.md): Which Nix shell builds which half of PB and where each half's outputs land.
- [Generator](generator.md): The script that is the only writer of the derived build surfaces, and its two brand inputs.
- [Modes](modes.md): Modes as Theia perspectives, their shipped descriptors, and how a mode reshapes the shell.
- [Packaging and release](packaging-and-release.md): The Linux tarball contents, the packager, and the self-hosted update channel.
- [Panorama](panorama.md): The Organising canvas and tree over one in-memory group model, with its save and retry behaviour.
- [Patches and upstream](patches-and-upstream.md): The patch-set model: a disposable upstream checkout and patches that carry hooks only.
- [Settings](settings.md): The five settings layers, each with one writer and its own read path.
- [Setups and dependent windows](setups-and-windows.md): Named saved layouts of windows, tabs and modes, and the unnamed session snapshot.
- [Shell window and sidecar supervisor](shell-and-supervisor.md): The shell window deck and the bootstrap that launches and supervises the Theia sidecar.
- [Tab URI registry](tab-uris.md): The registry that maps typeable addresses to Theia tabs and back.
- [Telemetry and crash pipeline](telemetry-and-crash.md): The Theia-side telemetry pipeline, its shipped off posture, and the crash collector path.
- [Verification subsystem](verification.md): The single verification driver script and its registry of check rows.
- [Verification rule scripts](verification-rule-scripts.md): The rule-script table: which scripts run as checks and what each row asserts.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
