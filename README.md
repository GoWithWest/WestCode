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
- **Agents**: preset personas (Avery the Architect, Beck the Builder, Sable the Swarm, Quinn the QA, Lennox the Lore, Oz the Orchestrator, Mason the Maker) with avatars — editable, deletable, or make your own. Say `You are @Oz` in a session to assign one; tag `@Beck` to delegate.
- **Agents as characters**: each persona is a small glossy character (shape, colour, accessory — pick your own) that moves with its session: floats when free, glances around while thinking, sways while a tool runs, hops when it needs your OK. Teammate cards show what each is doing; an Activity list shows what is in progress.
- **Transcript**: tool calls fold into one line ("Read 3 files, edited 1, ran 2 commands +12 −3") with a live label while the agent works; edits show as diffs, thinking as "Thought for 8s", replies as Markdown. The agent's task list is pinned above the composer, context use is a ring in the composer, and permission requests show the exact diff or command (press 1–3). ⌘O cycles Normal / Thinking / Verbose.
- **Source control** (GitHub Desktop in the session): click the git chip or ⌘⇧G — changed files with checkboxes and their diffs, commit exactly what you picked (with Undo), switch or create branches, Fetch / Pull / Push / Publish with ahead/behind, and history with each commit's patch.
- **Checkpoints**: before each of your messages runs, the folder's files are snapshotted; hover a message → Restore puts them back (undoable), Cursor-style.
- **Side chats**: `/btw <question>` asks in a read-only drawer next to the session without derailing it.
- **Skill groups**: Library → Groups bundles skills by kind of work (Web Design, Motion & Video, DevOps & Cloud, … 24 presets). Link one from the composer's Skills control or `/group web`; every skill in it that the session's CLI has installed rides each turn. Add or take out skills per group, or make your own.
- **The desk learns** (Hermes-style): after enough turns or tool calls a read-only reviewer session proposes new or better skills and short memory facts; you approve them in Library → Learned (or set it to automatic). Approved skills land in `~/.agents/skills` and `~/.claude/skills`; memory reaches every new session. `/reflect` reviews a session now.
- **Library**: skills (with descriptions, including plugin skills), plugins, and MCP connectors read live from each CLI (`~/.claude`, `~/.grok`, `~/.codex`), filterable by provider and kind; import from a repo or a local file.
- **Light and dark**: Settings → Appearance (System / Dark / Light).

## WestCreate

[WestCreate](https://github.com/thejago/WestCreate) (laser cutting, CNC, 3D printing) registers its MCP server with Claude Code, Grok and Codex the first time it is opened — and WestCode also adds WestCreate's bridge (`~/.westcreate/bin/westcreate-mcp.mjs`) to every session it starts when a CLI has not registered it, so the tools are always there. The **WestCreate** view (sidebar) shows the open drawing, the planned job and the machine, read-only, with quick prompts that hand work to **Mason the Maker**. Say `You are @Mason` in a session, or tag `@Mason`, to steer WestCreate from anywhere on the desk. WestCode never edits WestCreate's files or settings.

## Develop

```bash
npm install
npm run app        # Vite dev server on :8080 + Electron shell
npm run dev        # web preview only (no CLI spawning in a browser)
npm run dist       # signed DMG/ZIP into release/ (Developer ID cert required)
```

CI (`.github/workflows/build.yml`) typechecks, lints, then builds a **signed + notarized + stapled** DMG/ZIP on every push to main and publishes it to GitHub Releases (requires the `MAC_CERT_P12`/`APPLE_API_*` repo secrets; unsigned dev artifact otherwise).

Note: building from a folder synced by iCloud/cloud file providers breaks codesign (`com.apple.provenance` stamping) — `npm run dist` therefore packages via `/tmp/westcode-release` and copies the DMG/ZIP back.

## Licence

WestCode is **source-available**, not open source. The [LICENSE](LICENSE) lets you run it for personal use, read it, fork it on GitHub to work on it, and send improvements back as pull requests. It does not let you put any of it inside other software, run it for other people as a service, use it in a business without written permission, or sell it in any form. Business use: ask at chat@withwest.net. Third-party components keep their own licences.
