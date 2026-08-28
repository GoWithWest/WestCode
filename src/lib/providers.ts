export type BuiltinProviderId = "claude" | "codex" | "cursor" | "grok";
export type ProviderId = string;
export type AuthKind = "subscription" | "api";

export type Provider = {
  id: ProviderId;
  name: string;
  short: string;
  vendor: string;
  binary: string;
  protocol: string;
  auth: AuthKind;
  authLabel: string;
  models: string[];
  defaultModel: string;
  sessionStore: string;
  how: string;
  live: boolean;
  connected: boolean;
  builtin: boolean;
  endpoint?: string;
};

export type CustomProvider = {
  id: string;
  name: string;
  vendor: string;
  auth: AuthKind;
  authLabel: string;
  endpoint: string;
  apiKey: string;
  models: string[];
  defaultModel: string;
  connected: boolean;
};

/**
 * How WestCode talks to agents (same model as OpenClaw):
 *
 * Claude Code, Codex, and Cursor already ship CLIs that hold the user's
 * subscription login (OAuth / keychain). WestCode is an ACP *client* — it
 * spawns those binaries over stdio JSON-RPC and never reads a token.
 *
 *   Claude  → `claude` Agent SDK / ACP adapter, sessions in ~/.claude
 *   Codex   → ChatGPT OAuth via `codex`, native app-server runtime
 *   Cursor  → `agent acp` (JSON-RPC over stdio)
 *   Grok    → Grok Build CLI, or xAI API when no local binary
 *
 * API mode uses an OpenAI-compatible endpoint. Custom providers are the
 * same shape — base URL + key — so OpenRouter, Groq, Gemini proxies, or
 * a self-hosted vLLM box all attach the same way.
 */
export const PROVIDERS: Record<BuiltinProviderId, Provider> = {
  claude: {
    id: "claude",
    name: "Claude Code",
    short: "Claude",
    vendor: "Anthropic",
    binary: "claude",
    protocol: "ACP · Agent SDK",
    auth: "subscription",
    authLabel: "Claude Pro / Max",
    models: ["Opus 4.8", "Opus 4.7", "Sonnet 5", "Sonnet 4.6", "Haiku 4.5"],
    defaultModel: "Opus 4.7",
    sessionStore: "~/.claude/projects",
    how: "Spawns the local Claude Code CLI. Claude owns token lifecycle — WestCode never stores a key.",
    live: false,
    connected: true,
    builtin: true,
  },
  codex: {
    id: "codex",
    name: "Codex",
    short: "Codex",
    vendor: "OpenAI",
    binary: "codex",
    protocol: "ACP · app-server",
    auth: "subscription",
    authLabel: "ChatGPT Plus / Pro",
    models: ["GPT-5.4 Codex", "GPT-5.4", "GPT-5.4 Mini"],
    defaultModel: "GPT-5.4 Codex",
    sessionStore: "~/.codex",
    how: "Signs in with ChatGPT OAuth through the Codex CLI. Usage draws from the subscription, not API credits.",
    live: false,
    connected: true,
    builtin: true,
  },
  cursor: {
    id: "cursor",
    name: "Cursor Agent",
    short: "Cursor",
    vendor: "Anysphere",
    binary: "agent acp",
    protocol: "ACP · stdio JSON-RPC",
    auth: "subscription",
    authLabel: "Cursor Pro / Ultra",
    models: ["Composer 2", "Sonnet 4.6", "GPT-5.4"],
    defaultModel: "Composer 2",
    sessionStore: "~/.cursor",
    how: "Connects to Cursor CLI in ACP mode (`agent acp`). Editor login is reused; no Cursor API key.",
    live: false,
    connected: true,
    builtin: true,
  },
  grok: {
    id: "grok",
    name: "Grok Build",
    short: "Grok",
    vendor: "xAI",
    binary: "grok",
    protocol: "ACP · xAI",
    auth: "api",
    authLabel: "xAI",
    models: ["Grok 4.5", "Grok 4"],
    defaultModel: "Grok 4.5",
    sessionStore: "~/.grok",
    how: "Live in this preview via xAI. On a Mac, WestCode would spawn the Grok Build CLI the same way as the others.",
    live: true,
    connected: true,
    builtin: true,
    endpoint: "https://api.x.ai/v1",
  },
};

export const PROVIDER_ORDER: BuiltinProviderId[] = [
  "claude",
  "codex",
  "cursor",
  "grok",
];

export const PROVIDERS_KEY = "helix-providers-v1";

export const AVAILABLE_TO_ADD: {
  id: string;
  name: string;
  vendor: string;
  subscription: string;
  apiHint: string;
  endpoint: string;
  models: string[];
}[] = [
  {
    id: "gemini",
    name: "Gemini CLI",
    vendor: "Google",
    subscription: "Gemini CLI login",
    apiHint: "Google AI Studio key",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    models: ["Gemini 2.5 Pro", "Gemini 2.5 Flash"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    vendor: "OpenRouter",
    subscription: "",
    apiHint: "OpenRouter key — any model",
    endpoint: "https://openrouter.ai/api/v1",
    models: ["anthropic/claude-sonnet-4.6", "openai/gpt-5.4", "x-ai/grok-4"],
  },
];

export function customToProvider(c: CustomProvider): Provider {
  return {
    id: c.id,
    name: c.name,
    short: c.name,
    vendor: c.vendor,
    binary: c.auth === "subscription" ? c.id : "openai-compat",
    protocol:
      c.auth === "subscription"
        ? "ACP · stdio JSON-RPC"
        : "HTTP · OpenAI-compatible",
    auth: c.auth,
    authLabel: c.authLabel,
    models: c.models,
    defaultModel: c.defaultModel,
    sessionStore: "~/.westcode/providers",
    how:
      c.auth === "api"
        ? `Calls ${c.endpoint || "a custom endpoint"} with a key saved in this browser.`
        : "Subscription login on the host CLI.",
    live: false,
    connected: c.connected,
    builtin: false,
    endpoint: c.endpoint,
  };
}

export function resolveProvider(
  id: string,
  custom: CustomProvider[] = [],
): Provider {
  if (id in PROVIDERS) return PROVIDERS[id as BuiltinProviderId];
  const c = custom.find((p) => p.id === id);
  if (c) return customToProvider(c);
  return {
    id,
    name: id,
    short: id,
    vendor: "Custom",
    binary: "openai-compat",
    protocol: "HTTP · OpenAI-compatible",
    auth: "api",
    authLabel: "API",
    models: [],
    defaultModel: "default",
    sessionStore: "~/.westcode/providers",
    how: "Custom provider.",
    live: false,
    connected: true,
    builtin: false,
  };
}

export function allProviders(custom: CustomProvider[] = []): Provider[] {
  return [
    ...PROVIDER_ORDER.map((id) => PROVIDERS[id]),
    ...custom.map(customToProvider),
  ];
}
