# Add a tab-store column

> Verified against PB 5571d3d on 2026-10-31. Level: source-read

Source files:
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/powerbrowser/INTERNAL-APIS.md`
- `$PB_REPO/docs/TAB-STORE.md`
- `$PB_REPO/scripts/verify-ng-019-tab-store-doc.mjs`
- `$PB_REPO/scripts/verify-tab-store-offline.mjs`
- `$PB_REPO/scripts/verify-sql-store-second-writer.mjs`

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

A new nullable `tabs` column is written by chrome, every existing store migrates forward to the new head, and the schema page matches the DDL.

## Before you start

- Stop and ask first. The schema change is one-way. A build at the older head refuses a store whose `user_version` is newer than its head: the `refusing downgrade` message in `openTabStore` in `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`. Ask the user for a copy of `tabs.sqlite`, taken while PB is closed, before the first launch.
- UNVERIFIED: PB has no user-facing backup command for `tabs.sqlite`. The only backup call is the quarantine path in the same file. Verify: read the Integrity and quarantine section of `$PB_REPO/docs/TAB-STORE.md`. This has not been confirmed.
- Only chrome writes `tabs.sqlite`, and no step here opens it for writing ([settings limits and rules](../subsystems/settings.md#limits-and-rules)).
- The store layout: [where tab data lives](../09-tabs-reference.md#where-tab-data-lives).
- Covers no ladder row: this is a store schema change. Ask first, and name the files in the question.

## Confirm before coding

- `grep -n 'TAB_STORE_SCHEMA_HEAD' "$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs"`
- `grep -n 'migrateTabStoreToV6' "$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs"`
- `grep -n 'writeTabRow' "$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs"`
- `grep -n 'migrateTabStoreToV6' "$PB_REPO/powerbrowser/INTERNAL-APIS.md"`
- `grep -n 'Schema at head' "$PB_REPO/docs/TAB-STORE.md"`

## Steps

1. **PB core edit** Add `TAB_STORE_V7_DDL` between the `PB-SQL-V7-DDL-START` and `PB-SQL-V7-DDL-END` markers, in the form of `TAB_STORE_V6_DDL`, with a nullable `ALTER TABLE tabs ADD COLUMN`, so existing rows stay valid. Add `migrateTabStoreToV7` after `migrateTabStoreToV6`, with the same marker check. It ends with `await conn.setSchemaVersion(7);`. Without that call, `user_version` stays at 6, and the next open reruns the step and fails on the duplicate column.
2. **PB core edit** Steps 1 and 2 are one change, applied before any build. In the same file, raise `TAB_STORE_SCHEMA_HEAD` from 6 to 7 and append `PowerBrowserAPI.migrateTabStoreToV7` to the steps array in `migrateTabStoreToHead`. That function throws when the array length and the head differ.
3. **PB core edit** Set the column in `writeTabRow` in the same file. That function is chrome-side only.
4. **PB core edit** In `$PB_REPO/docs/TAB-STORE.md`, add a `## v7` section, add the column to the `Schema at head` section, and change its `user_version` value from 6 to 7. `verify-ng-019-tab-store-doc` requires one section per version up to the head and none beyond it.
5. **PB core edit** In `$PB_REPO/powerbrowser/INTERNAL-APIS.md`, add `migrateTabStoreToV7` to the method list of the row for the `Sqlite.sys.mjs` lazy import in `PowerBrowserAPI.sys.mjs`.
6. Companion in this repo, not PB core, so unlabelled: change `head = v6` in the heading of `docs/09-tabs-reference.md` to `head = v7`.

## Verify

Run from `$PB_REPO`, quick tier:

- `scripts/verify-platform.sh --only ng-019-tab-store-doc` prints `ng-019-tab-store-doc: PASS`.
- `scripts/verify-platform.sh --only tab-store-offline` prints `tab-store-offline: PASS`.
- `scripts/verify-platform.sh --only sql-store-second-writer` prints `sql-store-second-writer: PASS`.
- `scripts/verify-platform.sh --only internals-boundary` prints `internals-boundary: PASS`.

On a built tree, full tier:

- `scripts/verify-platform.sh --only ng-014-rebuild-at-head` prints `ng-014-rebuild-at-head: PASS`.
- `scripts/verify-platform.sh --only ng-015-real-migration-from-every-version` prints `ng-015-real-migration-from-every-version: PASS`. It proves a store at every shipped version reaches the new head.
- `scripts/verify-platform.sh --only sql-store-roundtrip` prints `sql-store-roundtrip: PASS`.
- Reopen check, manual: open a copy of a v6 store, close it, and open it again. The second open must succeed, and `user_version` must read 7. No registry row opens a store twice. UNVERIFIED: not run.

## Done when

- The four quick rows pass.
- `ng-015` shows every shipped version migrates to the new head.
- The reopen check reads `user_version` 7 with no error.
- The schema page lists the column.
- The head note in this repo's `docs/09-tabs-reference.md` names the new head.

## Rollback

- Before any PB build opens a store: for each changed PB file, run `git --no-optional-locks -C "$PB_REPO" diff -- <file>`. If the diff holds anything beyond this recipe's edits, stop and ask. Otherwise, after the user agrees, restore the file with `git --no-optional-locks -C "$PB_REPO" restore -- <file>`. Revert the step 6 heading by hand.
- After a store reached the new head, a build at the older head refuses it. Restore the copy the user took, as the UNVERIFIED: item under Before you start describes.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
