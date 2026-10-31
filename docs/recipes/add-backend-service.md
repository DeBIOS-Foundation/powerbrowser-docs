# Add a backend service

> Verified against PB d911f55 on 2026-10-22. Level: source-read

Source files:
- `$PB_REPO/theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts`
- `$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts`
- `$PB_REPO/theia/extensions/chrome-bar/package.json`
- `$PB_REPO/theia/extensions/telemetry/tsconfig.json`
- `$PB_REPO/theia/package.json`
- `$PB_REPO/theia/applications/browser/package.json`

PB core edits: 4

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

A frontend extension calls Node-only code over Theia JSON-RPC on the existing token-gated WebSocket.

## Before you start

- [Add a new backend JSON-RPC service](../04-theia-backend-rpc-http.md#b-add-a-new-backend-json-rpc-service-copy-the-chrome-bar-pattern).
- [JSON-RPC services](../04-theia-backend-rpc-http.md#json-rpc-services).
- [Create a new extension](../01-theia-extensions.md#b-create-a-new-powerbrowsername-extension).
- [Theia extension delivery](../08-building-an-extension.md#theia-extension-powerbrowsername).

## Confirm before coding

- `grep -n 'CHROME_SUGGESTION_PATH' "$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts"`
- `grep -n 'JsonRpcConnectionHandler' "$PB_REPO/theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts"`
- `grep -n 'createProxy' "$PB_REPO/theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts"`
- `grep -n 'build:extensions' "$PB_REPO/theia/package.json"`

## Steps

1. **PB core edit** Create `$PB_REPO/theia/extensions/<name>/` with `package.json` and `tsconfig.json` copied from `$PB_REPO/theia/extensions/telemetry/` and renamed to `@powerbrowser/<name>`. In `src/browser/<name>-service.ts`, write the protocol: an exported path constant such as `'/services/powerbrowser/<name>'`, an interface, and an exported `Symbol` with the same name as the interface. This file is imported by both sides, so it imports nothing browser-only. The model is `chrome-bar-suggestion-service.ts`.
2. **PB core edit** In `src/node/<name>-backend-module.ts`, bind the implementation with `toSelf().inSingletonScope()`. Bind `ConnectionHandler` to `new JsonRpcConnectionHandler<Interface>(PATH, () => ctx.container.get(Impl))`. In the extension `package.json`, list the backend module under `theiaExtensions` with a `backend` key, as `chrome-bar/package.json` does.
3. **PB core edit** In `src/browser/<name>-frontend-module.ts`, bind the `Symbol` to a proxy: `bind(<Symbol>).toDynamicValue(ctx => WebSocketConnectionProvider.createProxy<Interface>(ctx.container, PATH)).inSingletonScope()`. Then register the extension and its build as in [add a shell command](add-command.md), steps 2 and 3, with the same `dependencies` and `build:extensions` edits.
4. **PB core edit** Build inside `nix develop .#theia`: `cd "$PB_REPO/theia" && yarn install --ignore-scripts --frozen-lockfile && yarn build`. This writes generated build output (gitignored `node_modules/` and `lib/`) into the PB checkout and changes no tracked PB source.

## Verify

From the root of this repo, run:

- `"$PB_REPO"/scripts/verify-platform.sh --quick`
- `"$PB_REPO"/scripts/verify-platform.sh --only theia-build-order`

Both must pass.

## Done when

- The frontend awaits a method on the `Symbol` and gets the backend answer.
- No new HTTP route and no token-gate change was needed. The service rides the existing authenticated WebSocket ([add a backend service, section B](../04-theia-backend-rpc-http.md#b-add-a-new-backend-json-rpc-service-copy-the-chrome-bar-pattern)).

## Rollback

- Undo step 3: remove the proxy bind, the `dependencies` entry and the `build:extensions` segment.
- Undo step 2: delete the backend module and its `theiaExtensions` entry.
- Undo step 1: delete `$PB_REPO/theia/extensions/<name>/`.
- Rebuild with the step 4 command.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
