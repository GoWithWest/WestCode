# WestCode

All your coding agents. One desk.

WestCode is the helix desk from the web app, packaged as a Mac desktop shell. It **embeds the CLIs you already use** — it is not an agent of its own.

| Provider | Install | Auth |
| --- | --- | --- |
| Claude Code | `curl -fsSL https://claude.ai/install.sh \| bash` | `claude auth login` |
| Grok Build | `curl -fsSL https://x.ai/cli/install.sh \| bash` | `grok login` |
| Codex | `npm i -g @openai/codex` or `brew install --cask codex` | `codex login` |

A Claude session only has Claude Code features. Grok and Codex are the same: WestCode spawns that CLI over ACP (`grok agent stdio`, Claude/Codex ACP adapters) and renders the helix UI around it.

## Run the Mac app

```bash
npm install
npm run app
```

That starts the Vite desk on port 8080 and opens Electron. Connections probes PATH for the three binaries (including `~/.grok/bin` and Homebrew). Login opens Terminal so the CLI can complete its own browser OAuth.

## Web preview

`npm run dev` still serves the helix UI in a browser. Sessions will not talk to CLIs there — spawning needs the desktop shell.
