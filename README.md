# WestCode

All your coding agents. One desk.

WestCode is a Mac desktop app that **embeds the CLIs you already use** — it is not an agent of its own. A Claude session has exactly Claude Code's features; Grok and Codex likewise. WestCode spawns each CLI over ACP (`grok agent stdio`, the Claude/Codex ACP adapters) and renders the desk UI around it.

## Install

Download the signed, notarized DMG from the [latest release](https://github.com/thejago/WestCode/releases), drag WestCode.app to Applications, and launch. The app runs its own bundled server — no Node, npm, or dev setup needed.

You do not need the provider CLIs preinstalled: Connections can **install and update them for you** (Claude and Codex from npm into `~/.westcode/cli`, Grok via its vendor installer). An in-app banner offers one-click updates when a new CLI version ships. Prefer to manage them yourself? These work too:

| Provider | Install | Auth |
| --- | --- | --- |
| Claude Code | `curl -fsSL https://claude.ai/install.sh \| bash` | `claude auth login` |
| Grok Build | `curl -fsSL https://x.ai/cli/install.sh \| bash` | `grok login` |
| Codex | `npm i -g @openai/codex` or `brew install --cask codex` | `codex login` |

Login opens Terminal so each CLI completes its own browser OAuth — WestCode never sees a key. You can also add your own OpenAI-compatible **API provider** (OpenRouter, Groq, vLLM…) in Connections; its key is stored OS-encrypted via Electron safeStorage.

## The desk

- **Sessions** for any provider, in mosaic, focus, or split view. Rename them, switch their working directory, and watch the live **git chip** (branch, +/− lines, ahead/behind, PR link).
- **Desk bus**: sessions message each other across providers (`/msg`, or just ask an agent to "tell Codex…"). Assignments carry an explicit reply-to contract so agents report back instead of waiting on each other.
- **Agents**: preset personas (Petra-Axel the Planner/Architect, Ivy-Ben, Billie-Wren, Rhea-Quinn, Rita-Dean, Olive-Rex, Cleo-Sam the Chief of Staff) with avatars — editable, deletable, or make your own. Say `You are @Cleo-Sam` in a session to assign one; tag `@Ivy-Ben` to delegate.
- **Library**: skills, plugins, and MCP connectors read live from each CLI (`~/.claude`, `~/.grok`, `~/.codex`), filterable by provider and kind; import from a repo or a local file.

## Develop

```bash
npm install
npm run app        # Vite dev server on :8080 + Electron shell
npm run dev        # web preview only (no CLI spawning in a browser)
npm run dist       # signed DMG/ZIP into release/ (Developer ID cert required)
```

CI (`.github/workflows/build.yml`) typechecks, lints, then builds a **signed + notarized + stapled** DMG/ZIP on every push to main and publishes it to GitHub Releases (requires the `MAC_CERT_P12`/`APPLE_API_*` repo secrets; unsigned dev artifact otherwise).

Note: building from a folder synced by iCloud/cloud file providers breaks codesign (`com.apple.provenance` stamping) — `npm run dist` therefore packages via `/tmp/westcode-release` and copies the DMG/ZIP back.
