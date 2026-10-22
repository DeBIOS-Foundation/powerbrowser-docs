# Theia/VS Code plugins and Theia AI

> Verified against PB 8843936 on 2026-10-21. Level: source-read

Source files:
- `$PB_REPO/CLAUDE.md`
- `$PB_REPO/configuration.toml`
- `$PB_REPO/docs/BUILD.md`
- `$PB_REPO/docs/REBRANDING.md`
- `$PB_REPO/docs/tab-store-access.md`
- `$PB_REPO/powerbrowser/endpoint-allowlist.json`
- `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`
- `$PB_REPO/scripts/check-internals-boundary.sh`
- `$PB_REPO/scripts/download-plugins.mjs`
- `$PB_REPO/scripts/generate.mjs`
- `$PB_REPO/scripts/verify-endpoints.sh`
- `$PB_REPO/scripts/verify-ng-073-declared-extension-loads.mjs`
- `$PB_REPO/scripts/verify-platform.sh`
- `$PB_REPO/theia/applications/browser/package.json`
- `$PB_REPO/theia/package.json`
- `$PB_REPO/theia/yarn.lock`
- `$PB_REPO/theia/extensions/`
- `$PB_REPO/theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts`
- `$PB_REPO/theia/extensions/telemetry/package.json`
- `$PB_REPO/theia/extensions/telemetry/tsconfig.json`
- `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts`
- `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`

Status: working (mechanism) / none shipped. The plugin host, Open VSX installer and Theia AI packages (pinned at 1.76.0 in `$PB_REPO/theia/applications/browser/package.json`) are compiled into the app; PowerBrowser declares zero `[[extensions]]` (comment above `[[search_engines]]` in `$PB_REPO/configuration.toml`: "This project declares none"), registers zero AI tools/agents (no `ToolProvider`, `ChatAgent` or `LanguageModelProvider` under `$PB_REPO/theia/extensions/`; re-check with `git -C "$PB_REPO" grep -nE 'ToolProvider|ChatAgent|LanguageModelProvider|mcpServers' HEAD -- theia/extensions`), configures zero MCP servers, and AI is OFF until the user sets `ai-features.AiEnable.enableAI = true`. `@theia/ai-mcp-server` is absent.

Commands in this doc assume `export PB_REPO="$(cd "${PB_REPO:-../Power-Browser}" && pwd)"` was run once from the root of this repo.

Theia AI and plugin-host facts in this doc come from the gitignored on-disk Theia install under `$PB_REPO/theia/node_modules/@theia/`, at the `@theia/*` release pinned in `$PB_REPO/theia/applications/browser/package.json` and resolved in `$PB_REPO/theia/yarn.lock`. They are written as path plus symbol, are not drift-checked, and need a re-read when that pin moves.

## What it is

Two related surfaces inside the Theia sidecar (the GUI PowerBrowser opens by default):

1. **VS Code-compatible plugins (`.vsix`).** `@theia/plugin-ext`, `@theia/plugin-ext-vscode`, `@theia/vsx-registry` and `@theia/ovsx-client` are app dependencies. Plugins run in a Node plugin host child process of the Theia backend and use the `vscode` API. Two ways in:
   - **Build-time, pinned**: an `[[extensions]]` entry in `$PB_REPO/configuration.toml` -> `$PB_REPO/scripts/generate.mjs` emits the `theiaPlugins` block -> `$PB_REPO/scripts/download-plugins.mjs` fetches, sha256-checks and unpacks it into `$PB_REPO/theia/applications/browser/plugins/<id>/` -> the supervisor passes that folder as `THEIA_DEFAULT_PLUGINS=local-dir:<app>/plugins`.
   - **Runtime, user-initiated**: the Extensions view installs from Open VSX (`VSX_REGISTRY_URL=https://open-vsx.org`). Hosts `open-vsx.org` and its download storage host are on the endpoint allowlist as user-initiated.
2. **Theia AI.** Chat, agents, tool calling, language-model providers (Anthropic, OpenAI) and an MCP **client**. A compile-time `@powerbrowser/*` Theia extension can contribute tools (`ToolProvider`), agents (`Agent`/`ChatAgent`) and language models (`LanguageModelProvider`) through Inversify DI. A `.vsix` can contribute tools through `vscode.lm.registerTool`, which Theia bridges into the same `ToolInvocationRegistry`.

Installed Theia AI packages (all pinned at `1.76.0` in the `dependencies` of `$PB_REPO/theia/applications/browser/package.json`):

| Package | Role |
|---|---|
| `@theia/ai-core` | `ToolInvocationRegistry`, `ToolProvider`, `Agent`, `LanguageModelRegistry`, `LanguageModelProvider`, prompt service |
| `@theia/ai-core-ui` | AI configuration views |
| `@theia/ai-chat` | `ChatAgent`, `AbstractChatAgent`, `AbstractStreamParsingChatAgent` |
| `@theia/ai-chat-ui` | Chat view |
| `@theia/ai-ide` | Built-in agents (Architect, Coder, ProjectInfo, CreateSkill, Orchestrator, Universal, AppTester, GitHub, Command, Explore, CodeReviewer, PRReview, CommitMessage; bound in `$PB_REPO/theia/node_modules/@theia/ai-ide/src/browser/frontend-module.ts` (the `Agent` and `ChatAgent` binds)) and workspace tools; owns the `enableAI` preference |
| `@theia/ai-code-completion` | Inline completion |
| `@theia/ai-editor` | Editor AI actions |
| `@theia/ai-terminal` | Terminal AI assistant |
| `@theia/ai-anthropic` | Anthropic provider |
| `@theia/ai-openai` | OpenAI provider (official + custom OpenAI-compatible endpoints) |
| `@theia/ai-mcp` | MCP client: starts/connects configured MCP servers and registers their tools |
| `@theia/ai-mcp-ui` | MCP configuration UI |

Absent: `@theia/ai-mcp-server` (Theia exposing itself as an MCP server), `@theia/ai-ollama`, `@theia/ai-google`, `@theia/ai-llamafile`, `@theia/ai-huggingface`, and any `@theia/ai-*` not in the table. The app's `dependencies` name exactly the table's packages (`git -C "$PB_REPO" show HEAD:theia/applications/browser/package.json | grep '"@theia/ai-'`), and the on-disk install under `$PB_REPO/theia/node_modules/@theia/` holds no other `ai-*` package (`ls "$PB_REPO"/theia/node_modules/@theia | grep ^ai`).

> Scope warning: PB's planning files list "DSH (DeepSeek Harness) and any AI assistant integration" and "Customising Theia's AI framework" as Out of Scope (RM-02); at the stamped PB commit they sit in `$PB_REPO/.planning/PROJECT.md`, section "Out of Scope", and no longer in `$PB_REPO/.planning/REQUIREMENTS.md`. UNVERIFIED: this scope decision rests only on PB planning files, which can lag. Verify: read `$PB_REPO/.planning/PROJECT.md` section "Out of Scope" at your PB HEAD and ask the user. Adding AI tools, agents, model providers or MCP server config to PB core needs the user's confirmation first. Building them in a separate extension repo for evaluation is fine.

## Use it when / Do not use it when

Use a **`.vsix` via `[[extensions]]`** when:
- the feature already exists as a VS Code extension, or must also run in VS Code/VSCodium;
- the feature fits the `vscode` API (commands, views, webviews, `lm.registerTool`).

Use a **compile-time `@powerbrowser/*` Theia extension that binds Theia AI contributions** when:
- you need to give Theia AI chat agents a tool with full control (`checkAutoAction`, `confirmAlwaysAllow`, custom renderer), a new agent, or a new language-model provider;
- the tool needs PB DI services (`TabUriRegistry`, `ChromeStoreClient`, `GroupQueryService` from `@powerbrowser/tab-uris`; `ModeService` from `@powerbrowser/modes`).

For a compile-time extension that adds UI, commands or backend services but no AI contribution, use [01-theia-extensions.md](01-theia-extensions.md) (and [04-theia-backend-rpc-http.md](04-theia-backend-rpc-http.md) for frontend/backend RPC).

Configure **`ai-features.mcp.mcpServers`** when the tools already exist as an MCP server (stdio command or remote URL). No code is needed.

Do not use this surface when:
- the caller is an **external** agent (Claude Code, a script) that needs PB data. Use the tab-store MCP endpoint (`store-access.json`, `POST /mcp`); see `$PB_REPO/docs/tab-store-access.md` and [03-tab-store-mcp-server.md](03-tab-store-mcp-server.md).
- you need a browser (Gecko) capability. Plugins and Theia AI cannot reach Firefox internals; that goes through `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` and a new actor `kind` (see [02-powerbrowser-api-bridge.md](02-powerbrowser-api-bridge.md)).
- you need a toolbar button/popup in the Theia shell from a WebExtension. WebExtension UI is not rendered in Theia (see [05-webextensions.md](05-webextensions.md)).
- you want a custom chat participant or a language model from a `.vsix`: `vscode.chat.createChatParticipant`, `vscode.lm.selectChatModels` and `vscode.lm.registerLanguageModelChatProvider` are stubs in Theia 1.76 (see Gotchas).
- you need Theia itself exposed as an MCP server: `@theia/ai-mcp-server` is not a dependency.

## How to use

### A. Ship a pinned VS Code extension with the build

Steps marked **PB core edit** change tracked files in `$PB_REPO`; stop and ask the user before each one ([Stop and ask](_shared/RULES.md#stop-and-ask)).

1. Get the archive and its sha256 (example for Open VSX):
   ```sh
   curl -sL -o x.vsix https://open-vsx.org/api/<publisher>/<name>/<version>/file/<publisher>.<name>-<version>.vsix
   sha256sum x.vsix
   ```
2. **PB core edit**: Add an entry to `$PB_REPO/configuration.toml` (or to a downstream `PB_CONFIG_DIR/configuration.toml`; arrays replace, never merge):
   ILLUSTRATIVE: an `[[extensions]]` entry with placeholder values; not a PB file.
   ```toml
   [[extensions]]
   id = "publisher.name"          # must contain a dot; publisher = text before the first dot
   source = "openvsx"             # openvsx | url | npm | local-path
   version = "1.2.3"              # exact; required for openvsx and npm
   sha256 = "<64 hex of the archive bytes>"
   ```
   Other sources:
   ILLUSTRATIVE: `[[extensions]]` entries for the other three sources, placeholder values; not a PB file.
   ```toml
   [[extensions]]
   id = "publisher.name"
   source = "url"
   url = "https://host/path/file.vsix"   # must end .vsix, .theia, .tgz or .tar.gz; host needs an allowlist row
   sha256 = "..."

   [[extensions]]
   id = "acme.npmpack"                    # id must contain a dot for every source (emitTheiaPlugins in generate.mjs)
   source = "npm"
   version = "1.2.3"                      # exact X.Y.Z; latest/ranges fail
   integrity = "sha512-..."               # from: npm view <id>@<version> dist.integrity
   sha256 = "..."

   [[extensions]]
   id = "publisher.local"
   source = "local-path"
   path = "relative/folder"               # packed with `npm pack --ignore-scripts`; sha256 is of the packed .tgz
   sha256 = "..."
   ```
3. **PB core edit**: Run `cd "$PB_REPO" && nix develop .#theia --command node scripts/generate.mjs`; bare `node` on the host fails without the pinned `inkscape` ([CF-05](CONFLICTS.md#cf-05)). It writes the gitignored `$PB_REPO/generated/theia-plugins.json`. Copy that map into `$PB_REPO/theia/applications/browser/package.json` as the top-level `theiaPlugins` block (the generator's copy-over sets only that block; today the block is absent because the map is `{}`; `emitTheiaPlugins` in `$PB_REPO/scripts/generate.mjs`).
4. Declare every `extensionDependencies` / `extensionPack` id of the plugin as its own `[[extensions]]` entry; the download step fails otherwise.
5. Inside `nix develop .#theia`: `cd "$PB_REPO"/theia/applications/browser && yarn build` (runs `rebuild`, then `download:plugins`, then `theia build`).
6. Checks: `"$PB_REPO"/scripts/verify-platform.sh --only extension-pins`, `--only ng071-tarball-extensions-build`, `--only ng073-declared-extension-loads` (full tier; builds a probe `.vsix` whose `activate()` writes a marker file and launches the product). The row labels are `extension-pins`, `ng071-tarball-extensions-build` and `ng073-declared-extension-loads` in `$PB_REPO/scripts/verify-platform.sh`.

### B. Give Theia AI agents a tool from a `@powerbrowser/*` Theia extension

`ToolInvocationRegistry` and the `ToolProvider` contribution point are bound in the **frontend** container only (`$PB_REPO/theia/node_modules/@theia/ai-core/lib/browser/ai-core-frontend-module.js` (the `ToolInvocationRegistry` and `ToolProvider` binds)). Write the tool in the browser module; reach backend code through a JSON-RPC service.

Steps marked **PB core edit** change tracked files in `$PB_REPO`; stop and ask the user before each one ([Stop and ask](_shared/RULES.md#stop-and-ask)).

1. **PB core edit**: Create `$PB_REPO/theia/extensions/<name>/` (the `workspaces` glob `extensions/*` of `$PB_REPO/theia/package.json` picks it up). Copy `$PB_REPO/theia/extensions/telemetry/package.json` and `$PB_REPO/theia/extensions/telemetry/tsconfig.json` (`rootDir: src`, `outDir: lib`, decorators on), then add the AI dependency at the pinned release:
   ILLUSTRATIVE: the telemetry `package.json` with the name changed and `@theia/ai-core` added; not compiled.
   ```json
   {
     "private": true,
     "name": "@powerbrowser/<name>",
     "version": "0.1.0",
     "license": "MIT",
     "dependencies": {
       "@theia/core": "1.76.0",
       "@theia/ai-core": "1.76.0"
     },
     "theiaExtensions": [{ "frontend": "lib/browser/<name>-frontend-module" }],
     "files": ["lib", "src"],
     "scripts": { "clean": "rm -rf lib *.tsbuildinfo", "build": "tsc -b" }
   }
   ```
2. **PB core edit**: Implement the tool. Pattern from `$PB_REPO/theia/node_modules/@theia/ai-ide/src/browser/todo-tool.ts` (`TodoWriteTool`):
   ILLUSTRATIVE: a tool written after the `TodoWriteTool` pattern; not compiled.
   ```ts
   import { injectable, inject } from '@theia/core/shared/inversify';
   import { ToolProvider, ToolRequest } from '@theia/ai-core/lib/common';

   @injectable()
   export class ListGroupsTool implements ToolProvider {
       static ID = 'powerbrowser_list_groups';
       getTool(): ToolRequest {
           return {
               id: ListGroupsTool.ID,
               name: ListGroupsTool.ID,
               providerName: 'powerbrowser',
               description: 'Lists the tab groups of the current PowerBrowser window.',
               parameters: { type: 'object', properties: {}, required: [] },
               // arg_string is the raw JSON argument string from the model.
               handler: async (arg_string: string) => {
                   const args = JSON.parse(arg_string || '{}');
                   return JSON.stringify({ groups: [] }); // ToolCallResult = undefined | object | string | ToolCallContent
               },
               // optional: checkAutoAction: argString => ({ action: 'allow' }),
               // optional: confirmAlwaysAllow: 'Warning text shown before "Always allow"',
           };
       }
   }
   ```
3. **PB core edit**: Bind it in the frontend module with the helper (binds to self in singleton scope, then `ToolProvider` to it):
   ILLUSTRATIVE: a frontend module that binds the tool above; not compiled.
   ```ts
   import { ContainerModule } from '@theia/core/shared/inversify';
   import { bindToolProvider } from '@theia/ai-core/lib/common';
   export default new ContainerModule(bind => {
       bindToolProvider(ListGroupsTool, bind);
   });
   ```
4. Reference the tool from an agent prompt as `~{powerbrowser_list_groups}` (a leading `?`, `~{?id}`, marks it deferred). Users can also add it in a custom agent or prompt fragment.
5. **PB core edit**: Add `"@powerbrowser/<name>": "0.1.0"` to the `dependencies` of `$PB_REPO/theia/applications/browser/package.json`, and append `&& yarn --cwd extensions/<name> build` to the explicit `build:extensions` script in `$PB_REPO/theia/package.json` (it lists each extension by name; `applications/browser`'s own `yarn build` does not compile extensions). Inside `nix develop .#theia`: `cd "$PB_REPO"/theia && yarn install --ignore-scripts --frozen-lockfile && (cd node_modules/drivelist && node-gyp rebuild) && yarn build` (the install form of `$PB_REPO/docs/BUILD.md`, section "Theia half"; a bare `yarn` runs install scripts PB deliberately skips). Drop `--frozen-lockfile` (keep `--ignore-scripts`) only when the extension adds a third-party dependency that is not in `$PB_REPO/theia/yarn.lock`, such as a dependency outside the pinned `@theia/*` set. Theia extensions cannot be installed at runtime.

### C. Register a chat agent

Pattern from `$PB_REPO/theia/node_modules/@theia/ai-ide/src/browser/project-info-agent.ts` (`ProjectInfoAgent`) and its `Agent`/`ChatAgent` binds in `$PB_REPO/theia/node_modules/@theia/ai-ide/src/browser/frontend-module.ts`. Requires `@theia/ai-chat` 1.76.0 as a dependency.

ILLUSTRATIVE: an agent class written after the `ProjectInfoAgent` pattern; not compiled.

```ts
import { AbstractStreamParsingChatAgent } from '@theia/ai-chat';
import { LanguageModelRequirement } from '@theia/ai-core';
import { injectable } from '@theia/core/shared/inversify';

@injectable()
export class PowerBrowserAgent extends AbstractStreamParsingChatAgent {
    id = 'PowerBrowser';
    name = 'PowerBrowser';
    languageModelRequirements: LanguageModelRequirement[] = [{ purpose: 'chat', identifier: 'default/fast' }];
    protected defaultLanguageModelPurpose = 'chat';
    override description = 'Answers questions about open tabs and groups.';
    override prompts = [{ id: 'powerbrowser-system', defaultVariant: { id: 'powerbrowser-system-default',
        template: 'You help with PowerBrowser tabs. Tools: ~{powerbrowser_list_groups}' } }];
    protected override systemPromptId = 'powerbrowser-system';
}
```

ILLUSTRATIVE: the binds for the agent above; not compiled.

```ts
import { Agent } from '@theia/ai-core/lib/common';
import { ChatAgent } from '@theia/ai-chat/lib/common';
bind(PowerBrowserAgent).toSelf().inSingletonScope();
bind(Agent).toService(PowerBrowserAgent);
bind(ChatAgent).toService(PowerBrowserAgent);
```

UNVERIFIED: the inline `prompts` literal above compiles against `PromptVariantSet` (`{id, defaultVariant: BasePromptFragment, variants?}`); ai-ide defines its prompt sets in separate `*-prompt-template.ts` files. Verify: compile the class with `tsc -b` inside `nix develop .#theia`, or read the `PromptVariantSet` declaration under `$PB_REPO/theia/node_modules/@theia/ai-core/lib/common/`.

### D. Add a language-model provider

`LanguageModelProvider = () => Promise<LanguageModel[]>`, collected as a contribution in both the frontend (`$PB_REPO/theia/node_modules/@theia/ai-core/lib/browser/ai-core-frontend-module.js` (`LanguageModelProvider`)) and backend (`$PB_REPO/theia/node_modules/@theia/ai-core/lib/node/ai-core-backend-module.js` (`LanguageModelProvider`)). The built-in providers instead inject `LanguageModelRegistry` and call `addLanguageModels([...])` (`$PB_REPO/theia/node_modules/@theia/ai-anthropic/lib/node/anthropic-language-models-manager-impl.js` (`addLanguageModels`)). Any new model host needs a row in `$PB_REPO/powerbrowser/endpoint-allowlist.json`. UNVERIFIED: no PB code implements a provider; follow `@theia/ai-anthropic` as the reference. Verify: `git -C "$PB_REPO" grep -n LanguageModelProvider HEAD -- theia/extensions` prints nothing when no PB provider exists.

For an OpenAI-compatible endpoint, no code is needed: set `ai-features.openAiCustom.customOpenAiModels`.

### E. Connect Theia AI to an MCP server

1. User enables AI: `"ai-features.AiEnable.enableAI": true` (user `settings.json` under `$THEIA_CONFIG_DIR`, default `${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser`).
2. Add the server under `ai-features.mcp.mcpServers`:
   ILLUSTRATIVE: a user `settings.json` fragment with placeholder servers; not a PB file.
   ```json
   {
     "ai-features.mcp.mcpServers": {
       "filesystem": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/folder"],
         "env": { "CUSTOM_ENV_VAR": "x" },
         "autostart": true
       },
       "remote": {
         "serverUrl": "https://mcp.example.com/mcp",
         "serverAuthToken": "TOKEN",
         "serverAuthTokenHeader": "Authorization"
       }
     }
   }
   ```
3. Start it with the command "MCP: Start MCP Server" (command id `mcp.startserver`; also `mcp.stopserver`, `mcp.signin` and `mcp.signout`; all four in `$PB_REPO/theia/node_modules/@theia/ai-mcp-ui/lib/browser/mcp-command-contribution.js` (`mcp.startserver`)). Autostart applies only from the next start.
4. Each MCP tool registers in `ToolInvocationRegistry` as id `mcp_<server>_<tool>` with `providerName: "mcp_<server>"`, and a prompt fragment `mcp_<server>_tools` lists them all (`~{mcp_<server>_<tool>}` per line). With `deferLoading: true` the fragment uses `~{?mcp_<server>_<tool>}`. Put `{{prompt:mcp_<server>_tools}}` (include syntax used by ai-ide, e.g. `{{prompt:project-info}}`, used by `$PB_REPO/theia/node_modules/@theia/ai-ide/lib/browser/architect-prompt-template.js` (`{{prompt:project-info}}`)) or individual `~{...}` ids in an agent prompt.

Connecting Theia AI to PB's own tab-store MCP endpoint: `serverUrl` = `url` and `serverAuthToken` = `token` from `<profile>/store-access.json`. UNVERIFIED: this works; the port and token change every start, so a static preference goes stale, and the MCP SDK client's request headers were not checked against the endpoint's `Origin`/`Host` rejection rules. Verify: configure the server from a live `store-access.json`, run "MCP: Start MCP Server", and check that the endpoint answers instead of returning `403`.

### F. Custom `powerbrowser.*` namespace for `.vsix` plugins (not built)

Theia's hook: bind a provider under `Symbol.for('extPluginApi')` in the backend (collected by `bindContributionProvider`, called from `$PB_REPO/theia/node_modules/@theia/plugin-ext/lib/hosted/node/plugin-ext-hosted-backend-module.js` (`bindContributionProvider`)), returning `{ backendInitPath, frontendExtApi: { initPath, initVariable, initFunction } }`; the main side binds `MainPluginApiProvider` (`Symbol('mainPluginApi')`) with `initialize(rpc, container)`. No PB code uses it. The design note that proposed `@powerbrowser/plugin-api` (`$PB_REPO/.planning/notes/pba-plugin-shipping-design.md`) is marked "Superseded 2026-10-16" and nothing is planned. UNVERIFIED: that nothing is planned rests only on that PB planning note. Verify: read `$PB_REPO/.planning/ROADMAP.md` at your PB HEAD for a plugin-API phase. UNVERIFIED: an end-to-end example in this Theia version; none was built or run. Verify: build a test `.vsix` against a provider bound under `Symbol.for('extPluginApi')` and call its namespace.

## Reference

### `[[extensions]]` keys

Keys and sources come from `EXTENSION_SOURCES` and `EXTENSION_SOURCE_KEYS` in `$PB_REPO/scripts/generate.mjs` (checked by `validateExtensionElements`) and from `$PB_REPO/docs/REBRANDING.md`, section "`[[extensions]]` — declared sidecar extensions (absent block means none)".

| Key | Required | Notes |
|---|---|---|
| `id` | always | Unique; must contain `.`; becomes the `theiaPlugins` key and the `plugins/<id>` folder |
| `source` | always | `openvsx`, `url`, `npm`, `local-path`; anything else fails |
| `sha256` | always | Hash of the archive bytes (packed `.tgz` for local-path) |
| `version` | openvsx, npm | Exact; npm must be full X.Y.Z |
| `url` | url | Verbatim; may contain `${targetPlatform}` (passed through unexpanded) |
| `integrity` | npm | Registry SRI digest |
| `path` | local-path | Folder relative to `PB_CONFIG_DIR` when set, else the repo root (`configDir` and `pack` in `$PB_REPO/scripts/download-plugins.mjs`) |

A key valid for another source (e.g. `version` on a `url` entry) fails generation.

Resolved download URLs (`openVsxFileUrl`, `npmDistTarballUrl`, `localPackRef` and `emitTheiaPlugins` in `$PB_REPO/scripts/generate.mjs`):

| source | `theiaPlugins` value |
|---|---|
| openvsx | `https://open-vsx.org/api/<ns>/<name>/<version>/file/<id>-<version>.vsix` |
| url | the stated `url` |
| npm | `https://registry.npmjs.org/<id>/-/<id>-<version>.tgz` |
| local-path | `<path>.tgz` |

### `download-plugins.mjs` behaviour

All rows describe `$PB_REPO/scripts/download-plugins.mjs`.

| Step | Result |
|---|---|
| `theiaPlugins` id with no `[[extensions]]` entry | fail |
| URL not ending `.vsix` / `.theia` / `.tgz` / `tar.gz` | fail |
| archive already at its pin (not local-path) | reused |
| `.tar.gz` kinds | fetched (`FETCH_TIMEOUT_MS`, 300 s) or `npm pack`ed |
| other kinds | stock `theia download:plugins --packed` |
| sha256 mismatch | slot removed, build fails naming the id |
| anything undeclared in `plugins/` | deleted |
| unpack | `decompress`, regular files/dirs only, no `..` |
| undeclared `extensionDependencies`/`extensionPack` | fail |

### Environment the supervisor gives the sidecar (`$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`)

Both variables are set in `_spawnAndGate` in `$PB_REPO/powerbrowser/shell/TheiaService.sys.mjs`.

| Variable | Value |
|---|---|
| `VSX_REGISTRY_URL` | `https://open-vsx.org` (also in the app `start` script) |
| `THEIA_DEFAULT_PLUGINS` | `local-dir:<app>/plugins` |

### `ToolRequest`

Declared in `$PB_REPO/theia/node_modules/@theia/ai-core/lib/common/language-model.d.ts` (`ToolRequest`).

| Field | Type | Required |
|---|---|---|
| `id` | string | yes |
| `name` | string | yes |
| `parameters` | `{ type?: 'object'; properties: Record<string, {type?, anyOf?, ...}>; required?: string[] }` | yes |
| `description` | string | no |
| `handler` | `(arg_string: string, ctx?: ToolInvocationContext) => Promise<ToolCallResult>` | yes |
| `providerName` | string | no; used by `unregisterAllTools(providerName)` |
| `confirmAlwaysAllow` | boolean \| string | no; forces CONFIRM default and an extra modal |
| `getArgumentsShortLabel` | `(args: string) => {label, hasMore} \| undefined` | no |
| `checkAutoAction` | `(argString) => {action:'allow'\|'deny', reason?} \| undefined` | no |

`ToolInvocationContext = { toolCallId?: string; cancellationToken?: CancellationToken }`. `ToolCallResult = undefined | object | string | ToolCallContent`.

### `ToolInvocationRegistry` (`tool-invocation-registry.d.ts`)

Declared in `$PB_REPO/theia/node_modules/@theia/ai-core/lib/common/tool-invocation-registry.d.ts` (`ToolInvocationRegistry`).

| Method | Signature |
|---|---|
| `registerTool` | `(tool: ToolRequest): void` |
| `getFunction` | `(toolId: string): ToolRequest \| undefined` |
| `getFunctions` | `(...toolIds: string[]): ToolRequest[]` |
| `getAllFunctions` | `(): ToolRequest[]` |
| `unregisterTool` | `(toolId: string): void` |
| `unregisterAllTools` | `(providerName: string): void` |
| `onDidChange` | `Event<void>` |
| `bindToolProvider` (function) | `(identifier: Newable<ToolProvider>, bind): void` |

Use `ToolProvider` + `bindToolProvider` for static tools; inject `ToolInvocationRegistry` and call `registerTool`/`unregisterAllTools` for tools that appear and disappear (this is what ai-mcp does).

### `Agent` (`agent.d.ts`)

Declared in `$PB_REPO/theia/node_modules/@theia/ai-core/lib/common/agent.d.ts` (`Agent`).

`id, name, description: string; variables: string[]; prompts: PromptVariantSet[]; languageModelRequirements: LanguageModelRequirement[]; tags?: string[]; agentSpecificVariables: {name, description, usedInPrompt}[]; functions: string[]`. Chat agents also implement `ChatAgent.invoke(request: MutableChatRequestModel, chatAgentService?)`; extend `AbstractStreamParsingChatAgent`.

### VS Code `lm`/`chat` API in Theia 1.76

Implemented in `$PB_REPO/theia/node_modules/@theia/plugin-ext/lib/plugin/plugin-context.js` (the `lm` and `chat` namespaces).

| API | Status |
|---|---|
| `vscode.lm.registerTool(name, tool)` | working; bridged to `ToolInvocationRegistry` with `providerName: plugin_lm_tools_<pluginId>`; description = `contributes.languageModelTools[].modelDescription`, schema = its `inputSchema` (warns if undeclared) |
| `vscode.lm.invokeTool`, `vscode.lm.tools` | working |
| `vscode.lm.registerMcpServerDefinitionProvider` | implemented; UNVERIFIED: not run end to end. Verify: register a provider from a test `.vsix` and check that its server appears in the MCP configuration view |
| `vscode.lm.selectChatModels` | stub, resolves `[]` |
| `vscode.lm.registerLanguageModelChatProvider` | stub, `Disposable.NULL` |
| `vscode.chat.createChatParticipant` | stub; handler never called |

### Preferences

| Key | Default | Owner |
|---|---|---|
| `ai-features.AiEnable.enableAI` | `false` | `@theia/ai-ide` (`$PB_REPO/theia/node_modules/@theia/ai-ide/lib/common/ai-ide-preferences.js` (`ai-features.AiEnable.enableAI`)); `AIIdeActivationServiceImpl` rebinds `AIActivationService` |
| `ai-features.mcp.mcpServers` | none | `@theia/ai-mcp` (`$PB_REPO/theia/node_modules/@theia/ai-mcp/lib/common/mcp-preferences.js` (`ai-features.mcp.mcpServers`)) |
| `ai-features.mcp.useWorkspaceAsRoot` | `true` | `@theia/ai-mcp` (`$PB_REPO/theia/node_modules/@theia/ai-mcp/lib/common/mcp-preferences.js` (`ai-features.mcp.useWorkspaceAsRoot`)) |
| `ai-features.anthropic.AnthropicApiKey` | none | `@theia/ai-anthropic` |
| `ai-features.anthropic.allowEnvironmentApiKey` | `false` | `@theia/ai-anthropic` |
| `ai-features.anthropicCustom.customAnthropicModels` | `[]` | `@theia/ai-anthropic` |
| `ai-features.openAiOfficial.openAiApiKey` | none | `@theia/ai-openai` |
| `ai-features.openAiOfficial.allowEnvironmentApiKey` | `false` | `@theia/ai-openai` |
| `ai-features.openAiCustom.customOpenAiModels` | `[]` | `@theia/ai-openai` |
| `ai-features.agentMode.enabled` | `false` | `@theia/ai-ide` |

`mcpServers.<name>` fields: `command`, `args[]`, `env{}`, `autostart` (default true), `deferLoading` (default false), `serverUrl`, `serverAuthToken`, `serverAuthTokenHeader` (default `Authorization: Bearer`), `headers{}`, `oauth{clientId, clientSecret, scopes[], authorizationServer, ...}`.

PB's shipped frontend preference defaults (key `theia.frontend.config.preferences` in `$PB_REPO/theia/applications/browser/package.json`) are only `security.workspace.trust.enabled: false` and `workbench.startupEditor: "none"`. No `ai-features.*` key is set anywhere in PB source (`git -C "$PB_REPO" grep -n ai-features HEAD -- . ':(exclude).planning'` prints nothing).

## Rules and constraints

From `$PB_REPO/CLAUDE.md`:
- Rule 1: never fork or patch Theia core. Consume `@theia/*` as npm dependencies at the single pinned release (key `theia_release` in table `[upstreams]` of `$PB_REPO/configuration.toml`; every `@theia/*` pin in the `resolutions` of `$PB_REPO/theia/package.json`, the member package.jsons and `$PB_REPO/theia/yarn.lock` must agree). Checked by `$PB_REPO/scripts/diff-theia-core.sh`. Adding `@theia/ai-mcp-server` or another `@theia/*` package means adding it at that release everywhere, not vendoring it.
- Rule 2: never modify Gecko outside the patch stack; Firefox internals are reached only through `$PB_REPO/powerbrowser/shell/PowerBrowserAPI.sys.mjs` (checked by `$PB_REPO/scripts/check-internals-boundary.sh`, whose `FORBIDDEN_PATTERNS` list names the Firefox globals no other file may use). Plugins and Theia extensions therefore cannot touch Firefox internals.
- Rule 3 (design for the bridge): do not change the exported shape of `TabUriRegistry` (`$PB_REPO/scripts/verify-registry-shape.mjs`).
- Rule 4: the repo path must contain no space (native module builds fail).
- Rule 5: Theia is the default GUI; stock browser chrome stays reachable; no custom browser chrome is authored.
- User-facing text (tool descriptions shown in UI, agent descriptions, errors) must not contain internal identifiers (pref keys, ports, raw exceptions) and must name the product "PowerBrowser".
- Builds run in the Nix dev shell (`nix develop .#theia` for `$PB_REPO/theia/`), not the host shell; `yarn` does not work outside it.
- (From `$PB_REPO/docs/BUILD.md` and the endpoint allowlist, not `$PB_REPO/CLAUDE.md`:) third-party plugins enter the build only through pinned, sha256-checked `[[extensions]]` entries; every new egress host needs a row in `$PB_REPO/powerbrowser/endpoint-allowlist.json` (`$PB_REPO/scripts/verify-endpoints.sh` fails on an unlisted host observed at runtime).
- New checks are one row in `$PB_REPO/scripts/verify-platform.sh`; derive expectations from the tree rather than hand-kept lists.

## Gotchas

- AI is off by default. With `enableAI=false` the context key `ai-features.AiEnable.enableAI` is false and AI views/commands are hidden; your tools and agents are registered but unused. Setting the default in PB would mean adding the key to `theia.frontend.config.preferences` in `$PB_REPO/theia/applications/browser/package.json`. UNVERIFIED: that this mechanism is accepted for this key; it is the mechanism used for the two existing defaults. Verify: add the key in a scratch build and check that the AI views appear on first start.
- `api.anthropic.com` and `api.openai.com` are allowlisted only as user-initiated (after the user sets a key). Any other model host or remote MCP host needs an allowlist row.
- `ToolInvocationRegistry` exists only in the frontend container. A backend-only tool must be called from a frontend handler over JSON-RPC (pattern: `$PB_REPO/theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts`).
- Tool ids are global: `lm-tool-main` throws `Tool '<name>' is already registered.` on a duplicate; ai-core's `registerTool` logs `Function with id <id> is already registered.` and keeps the first registration (`$PB_REPO/theia/node_modules/@theia/ai-core/lib/common/tool-invocation-registry.js` (`registerTool`)), so the second tool is ignored. Prefix ids, e.g. `powerbrowser_`.
- `handler` receives the raw JSON string; parse it yourself and return errors as a result, not a throw: `TodoWriteTool` returns `JSON.stringify({ error: '...' })`; `createToolCallError(message, errorKind?)` (exported from `@theia/ai-core/lib/common`, declared in `$PB_REPO/theia/node_modules/@theia/ai-core/lib/common/language-model.d.ts` (`createToolCallError`)) builds a typed `{ type: 'error' }` result, as `lm-tool-main` does.
- A `.vsix` tool without a `contributes.languageModelTools` entry registers with no description and parameters `{ type: 'object', properties: {} }` (`$PB_REPO/theia/node_modules/@theia/plugin-ext/lib/main/browser/lm-tool-main.js` (`registerTool`)).
- `plugins/` is wiped of anything undeclared on every build; never put files there by hand.
- The token gate scrubs `POWERBROWSER_*` env vars at backend load, so plugins and MCP stdio servers cannot read PB secrets from the environment (`captured` in `$PB_REPO/theia/extensions/token-gate/src/node/powerbrowser-env.ts`).
- The Theia backend port is cookie-gated (`POWERBROWSER_TOKEN` in `$PB_REPO/theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`); external processes cannot call Theia AI services over HTTP.
- Runtime-installed Open VSX plugins are not pinned and not reproducible; only `[[extensions]]` entries ship.
- `autostart` for a newly added MCP server takes effect only after restart; start it manually the first time.
- MCP `serverAuthToken`, `headers` and `oauth.clientSecret` are stored in plain text in preferences.

<!-- BEGIN pb-rules:footer -->
Missing, wrong or guessed something here? File a doc-gap issue as described in `docs/FEEDBACK.md`.
<!-- END pb-rules:footer -->
