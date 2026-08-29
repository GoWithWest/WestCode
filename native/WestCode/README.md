# WestCode for Mac

All your coding agents. One desk.

WestCode is a native macOS SwiftUI app that hosts **Claude Code**, **Codex**, **Cursor Agent**, and **Grok** in one mosaic. It is an ACP client: it spawns the CLIs you already pay for and never stores their tokens.

## Open in Xcode

1. Open `WestCode.xcodeproj` in Xcode 15 or later (macOS 14 Sonoma+).
2. Select the **WestCode** scheme, destination **My Mac**.
3. Press Run.

The first build signs ad-hoc (`-`). No team is required for local use.

## How it talks to agents

| Provider | Binary | Auth |
| --- | --- | --- |
| Claude Code | `claude --acp` | Claude Pro / Max (CLI login) |
| Codex | `codex acp` | ChatGPT Plus / Pro |
| Cursor | `agent acp` | Cursor Pro / Ultra |
| Grok | `grok acp`, or xAI HTTP | CLI or an optional API key in Settings |

Install those CLIs on your PATH (`/opt/homebrew/bin` is searched). App Sandbox is **off** so WestCode can spawn them and read the folders you pick.

If a CLI is missing, the session still runs a local stand-in so the desk is usable — then wire the real binary when you have it.

## What you get

- Mosaic, focus, and split of live sessions
- Per-session model + effort (Claude extra/supercode, Codex xhigh, Cursor xhigh)
- Library of skills, plugins, and MCP connectors (plus custom import)
- Provider slash commands, `/agents`, `/msg`
- Attach files and browse a project folder (`NSOpenPanel`)
- Desk bus: sessions message each other across providers (ListAgents / SendMessage)

## Settings

WestCode → Settings for an optional xAI API key (Keychain). Claude, Codex, and Cursor do not need one.

Bundle id: `app.westcode.desktop`
