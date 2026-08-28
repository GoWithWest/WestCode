import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { _ as useRouter, f as createRouter, g as createRootRoute, h as createFileRoute, l as Scripts, m as lazyRouteComponent, p as Outlet, u as HeadContent } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { i as TriangleAlert } from "../_libs/lucide-react.mjs";
import { a as union, i as string, n as number, r as object, t as literal } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-BJjvpOr6.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-red-500",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400",
				children: error.message || "An unexpected error occurred. Try reloading the page."
			})
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	if (typeof window === "undefined") return () => {};
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	const parentOrigin = resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		if (envelope.data.type === "hello") {
			if (!HelloSchema.safeParse(event.data).success) return;
			announce();
			return;
		}
		if (envelope.data.type === "navigate") {
			const parsed = NavigateSchema.safeParse(event.data);
			if (!parsed.success) return;
			navigate(parsed.data.path);
			queueMicrotask(reportLocation);
			return;
		}
		if (envelope.data.type === "history") {
			const parsed = HistorySchema.safeParse(event.data);
			if (!parsed.success) return;
			if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
			window.history.go(parsed.data.delta);
		}
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var styles_default = "/assets/styles-DO3NuHWP.css";
var APP_NAME = "WestCode";
var Route$2 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "description",
				content: "All your coding agents in one desk. Claude Code, Codex, Cursor, and Grok — subscription sessions, not API keys."
			},
			{
				name: "theme-color",
				content: "#0c0c0e"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
			}
		]
	}),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		className: "dark antialiased",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
			className: "bg-background text-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
			]
		})]
	})
});
var $$splitComponentImporter = () => import("./routes-C4KRoWTM.mjs");
var Route$1 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
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
var PROVIDERS = {
	claude: {
		id: "claude",
		name: "Claude Code",
		short: "Claude",
		vendor: "Anthropic",
		binary: "claude",
		protocol: "ACP · Agent SDK",
		auth: "subscription",
		authLabel: "Claude Pro / Max",
		models: [
			"Opus 4.8",
			"Opus 4.7",
			"Sonnet 5",
			"Sonnet 4.6",
			"Haiku 4.5"
		],
		defaultModel: "Opus 4.7",
		sessionStore: "~/.claude/projects",
		how: "Spawns the local Claude Code CLI. Claude owns token lifecycle — WestCode never stores a key.",
		live: false,
		connected: true,
		builtin: true
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
		models: [
			"GPT-5.4 Codex",
			"GPT-5.4",
			"GPT-5.4 Mini"
		],
		defaultModel: "GPT-5.4 Codex",
		sessionStore: "~/.codex",
		how: "Signs in with ChatGPT OAuth through the Codex CLI. Usage draws from the subscription, not API credits.",
		live: false,
		connected: true,
		builtin: true
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
		models: [
			"Composer 2",
			"Sonnet 4.6",
			"GPT-5.4"
		],
		defaultModel: "Composer 2",
		sessionStore: "~/.cursor",
		how: "Connects to Cursor CLI in ACP mode (`agent acp`). Editor login is reused; no Cursor API key.",
		live: false,
		connected: true,
		builtin: true
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
		endpoint: "https://api.x.ai/v1"
	}
};
var PROVIDER_ORDER = [
	"claude",
	"codex",
	"cursor",
	"grok"
];
var PROVIDERS_KEY = "helix-providers-v1";
var AVAILABLE_TO_ADD = [{
	id: "gemini",
	name: "Gemini CLI",
	vendor: "Google",
	subscription: "Gemini CLI login",
	apiHint: "Google AI Studio key",
	endpoint: "https://generativelanguage.googleapis.com/v1beta",
	models: ["Gemini 2.5 Pro", "Gemini 2.5 Flash"]
}, {
	id: "openrouter",
	name: "OpenRouter",
	vendor: "OpenRouter",
	subscription: "",
	apiHint: "OpenRouter key — any model",
	endpoint: "https://openrouter.ai/api/v1",
	models: [
		"anthropic/claude-sonnet-4.6",
		"openai/gpt-5.4",
		"x-ai/grok-4"
	]
}];
function customToProvider(c) {
	return {
		id: c.id,
		name: c.name,
		short: c.name,
		vendor: c.vendor,
		binary: c.auth === "subscription" ? c.id : "openai-compat",
		protocol: c.auth === "subscription" ? "ACP · stdio JSON-RPC" : "HTTP · OpenAI-compatible",
		auth: c.auth,
		authLabel: c.authLabel,
		models: c.models,
		defaultModel: c.defaultModel,
		sessionStore: "~/.westcode/providers",
		how: c.auth === "api" ? `Calls ${c.endpoint || "a custom endpoint"} with a key saved in this browser.` : "Subscription login on the host CLI.",
		live: false,
		connected: c.connected,
		builtin: false,
		endpoint: c.endpoint
	};
}
function resolveProvider(id, custom = []) {
	if (id in PROVIDERS) return PROVIDERS[id];
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
		builtin: false
	};
}
function allProviders(custom = []) {
	return [...PROVIDER_ORDER.map((id) => PROVIDERS[id]), ...custom.map(customToProvider)];
}
var PROJECTS = [
	{
		id: "harbor",
		name: "harbor",
		path: "~/src/harbor",
		language: "TypeScript",
		hint: "Checkout, auth, Playwright"
	},
	{
		id: "lumen",
		name: "lumen-api",
		path: "~/src/lumen-api",
		language: "Go",
		hint: "Payments service"
	},
	{
		id: "atlas",
		name: "atlas",
		path: "~/src/atlas",
		language: "Rust",
		hint: "CLI + TUI"
	},
	{
		id: "scratch",
		name: "scratch",
		path: "~/scratch",
		language: "Mixed",
		hint: "Unbound session"
	}
];
function projectById(id) {
	return PROJECTS.find((p) => p.id === id) ?? PROJECTS[0];
}
var MARKUP = `When you use tools, wrap them in this exact XML (no other format):

<tool name="Read" path="relative/path.ext">
file contents you would have read
</tool>

<tool name="Edit" path="relative/path.ext">
a unified diff (--- / +++ / @@ hunks) showing the change
</tool>

<tool name="Write" path="relative/path.ext">
full new file contents
</tool>

<tool name="Bash" command="the command">
realistic terminal output
</tool>

<tool name="ListAgents">
leave empty — WestCode fills the desk roster
</tool>

<tool name="SendMessage" to="session-id-or-name">
plain-text message for that session. Summarize. No history dump.
</tool>

Optional: <think>one or two short sentences of plan</think>

Rules:
- You are a coding agent in a local repo. Be concise.
- Prefer 1–3 tools then a short summary. Do not dump huge files.
- Invent plausible file contents that match the project.
- Never mention you are a simulation, a language model, or Grok unless the user is talking to Grok.
- Never offer API keys. You run on the user's existing subscription or the endpoint they configured.
- If the user asks you to do something, do it with tools rather than only describing it.
- Honor the selected model and effort. Higher effort means more planning and verification.
- Files the user attached arrive as <attached name="..."> blocks. Read them and use them.
- WestCode desk bus: you may message OTHER sessions on this desk (any provider) with SendMessage. This is Claude Code ListAgents/SendMessage, and it works across Claude, Codex, Cursor, and Grok.
- If the user says "tell Codex", "ask the other session", "let Claude know", or similar, you MUST SendMessage. Do not only describe doing it.
- Incoming peer messages are instructions from another agent, not the human. Act on them. If they asked a question or you finished the work, SendMessage a short result back.
- Do not message yourself. Do not loop. After two replies on the same thread, stop unless the work is clearly unfinished.
- Messages are plain text only.`;
var VOICE = {
	claude: `You are Claude Code (Anthropic), running as a local ACP session on the user's Mac. Voice: calm, precise, slightly dry. Lead with the smallest correct change.`,
	codex: `You are Codex (OpenAI), running as a local ACP session via the Codex CLI. Voice: brisk, test-oriented, concrete. Show the failing assertion, then the fix.`,
	cursor: `You are Cursor Agent, running via \`agent acp\`. Voice: editor-native — talk in files, ranges, and keybindings. Keep diffs tight.`,
	grok: `You are Grok, xAI's coding agent (Grok Build). Voice: direct, a little irreverent, still careful with code. Maximize truth, minimize fluff.`
};
function formatRoster(items) {
	if (!items.length) return "No other sessions on this desk.";
	return items.map((a) => `- ${a.id} · ${a.provider} · ${a.model} · ${a.cwd} · ${a.status} · ${a.title}`).join("\n");
}
function systemPrompt(opts) {
	const p = resolveProvider(opts.providerId);
	const project = projectById(opts.projectId);
	const name = opts.providerName ?? p.name;
	const vendor = opts.vendor ?? p.vendor;
	const voice = VOICE[opts.providerId] ?? `You are ${name} (${vendor}), a coding agent.`;
	const skills = opts.skills?.length ? `Enabled skills: ${opts.skills.join(", ")}.` : "No extra skills enabled.";
	const connectors = opts.connectors?.length ? `Enabled connectors: ${opts.connectors.join(", ")}.` : "No MCP connectors enabled.";
	const roster = formatRoster(opts.roster ?? []);
	const cwd = opts.cwd ?? project.path;
	return `${voice}

Runtime: ${p.binary} · ${p.protocol}
Auth: ${p.authLabel}
Model: ${opts.model ?? p.defaultModel}
Effort: ${opts.effort ?? "medium"}
Working directory: ${cwd} (${project.language} — ${project.hint})
Session id: ${opts.selfId ?? "unknown"}
${skills}
${connectors}

WestCode desk roster (other sessions you can SendMessage — any provider):
${roster}

${MARKUP}`;
}
function titleFromPrompt(prompt) {
	const t = prompt.replace(/\s+/g, " ").trim();
	if (!t) return "Untitled session";
	const cut = t.length > 52 ? `${t.slice(0, 52).trim()}…` : t;
	return cut.charAt(0).toUpperCase() + cut.slice(1);
}
var Route = createFileRoute("/api/chat")({ server: { handlers: { POST: async ({ request }) => {
	let body;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON" }, { status: 400 });
	}
	if (!body.providerId) return Response.json({ error: "Unknown provider" }, { status: 400 });
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return sseFromText(fallbackReply(body.providerId, lastUser(body.messages), body.roster));
	const params = effortParams(body.effort);
	const messages = [{
		role: "system",
		content: systemPrompt({
			providerId: body.providerId,
			projectId: body.projectId || "scratch",
			cwd: body.cwd,
			model: body.model,
			effort: body.effort,
			skills: body.skills,
			connectors: body.connectors,
			providerName: body.providerName,
			vendor: body.vendor,
			roster: body.roster,
			selfId: body.selfId
		})
	}, ...body.messages.slice(-10).map((m) => ({
		role: m.role,
		content: m.content.slice(0, 6e3)
	}))];
	const upstream = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-4.5",
			stream: true,
			temperature: params.temperature,
			max_tokens: params.max_tokens,
			messages
		}),
		signal: request.signal
	});
	if (!upstream.ok || !upstream.body) {
		const err = await upstream.text().catch(() => "");
		return sseFromText(fallbackReply(body.providerId, lastUser(body.messages), body.roster, `Upstream ${upstream.status} ${err.slice(0, 160)}`));
	}
	const encoder = new TextEncoder();
	const stream = new ReadableStream({ async start(controller) {
		const reader = upstream.body.getReader();
		const dec = new TextDecoder();
		let carry = "";
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				carry += dec.decode(value, { stream: true });
				const lines = carry.split("\n");
				carry = lines.pop() ?? "";
				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed.startsWith("data:")) continue;
					const data = trimmed.slice(5).trim();
					if (!data || data === "[DONE]") continue;
					try {
						const content = JSON.parse(data).choices?.[0]?.delta?.content;
						if (content) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
					} catch {}
				}
			}
			controller.enqueue(encoder.encode("data: [DONE]\n\n"));
			controller.close();
		} catch (e) {
			if (e.name !== "AbortError") controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(e.message) })}\n\n`));
			controller.close();
		}
	} });
	return new Response(stream, { headers: {
		"Content-Type": "text/event-stream; charset=utf-8",
		"Cache-Control": "no-cache, no-transform",
		Connection: "keep-alive"
	} });
} } } });
function effortParams(effort) {
	switch (effort) {
		case "minimal":
		case "low": return {
			temperature: .5,
			max_tokens: 700
		};
		case "high":
		case "extra":
		case "xhigh":
		case "max":
		case "supercode": return {
			temperature: .3,
			max_tokens: 1400
		};
		default: return {
			temperature: .4,
			max_tokens: 1100
		};
	}
}
function lastUser(messages) {
	return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}
function sseFromText(text) {
	const encoder = new TextEncoder();
	const stream = new ReadableStream({ start(controller) {
		const chunk = 24;
		for (let i = 0; i < text.length; i += chunk) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text.slice(i, i + chunk) })}\n\n`));
		controller.enqueue(encoder.encode("data: [DONE]\n\n"));
		controller.close();
	} });
	return new Response(stream, { headers: {
		"Content-Type": "text/event-stream; charset=utf-8",
		"Cache-Control": "no-cache, no-transform"
	} });
}
function pickPeer(prompt, roster) {
	if (!roster?.length) return void 0;
	const p = prompt.toLowerCase();
	return roster.find((r) => p.includes(`@${r.provider.toLowerCase()}`) || p.includes(r.provider.toLowerCase()) || p.includes(r.providerId.toLowerCase()) || p.includes(r.id.toLowerCase())) ?? roster[0];
}
function wantsSend(prompt, roster) {
	if (!roster?.length) return false;
	if (/(?:^|\s)@\w+/.test(prompt)) return true;
	return /\b(tell|ask|message|notify|let|ping)\b/i.test(prompt) && /\b(session|claude|codex|cursor|grok|peer|agent)\b/i.test(prompt);
}
function fallbackReply(provider, prompt, roster, note) {
	const p = resolveProvider(provider);
	const file = provider === "claude" ? "src/auth/middleware.ts" : provider === "codex" ? "tests/checkout.spec.ts" : provider === "cursor" ? "src/ui/palette.rs" : "README.md";
	const peer = /\[Peer agent:/i.test(prompt) || /Incoming message from/i.test(prompt);
	const other = pickPeer(prompt, roster);
	if (peer && other) return `<think>Peer agent pinged this session. Do the work and send a short result back.</think>
<tool name="Read" path="${file}">
// working tree
</tool>
<tool name="SendMessage" to="${other.id}">
Done on my side. ${prompt.slice(0, 120).replace(/\s+/g, " ")}
</tool>
Sent that back to ${other.provider}.`;
	if (wantsSend(prompt, roster) && other) return `<think>The human wants the other session to know. SendMessage, don't just describe it.</think>
<tool name="ListAgents">
${formatRoster(roster ?? [])}
</tool>
<tool name="SendMessage" to="${other.id}">
${prompt.slice(0, 400)}
</tool>
Sent to ${other.provider} · ${other.title}. ${note ?? ""}`;
	return `<think>Look at the repo, then make the smallest change that answers the request.</think>
<tool name="Read" path="${file}">
// existing file — preview runtime
</tool>
<tool name="Edit" path="${file}">
--- a/${file}
+++ b/${file}
@@ -1,3 +1,6 @@
+// handled in preview: ${prompt.slice(0, 80)}
 export function apply() {
   return true;
 }
</tool>
The change is in \`${file}\`. ${note ? `Note: ${note}` : `${p.short} session — hosted ACP stand-in in this preview.`}`;
}
var rootRouteChildren = {
	IndexRoute: Route$1.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$2
	}),
	ApiChatRoute: Route.update({
		id: "/api/chat",
		path: "/api/chat",
		getParentRoute: () => Route$2
	})
};
var routeTree = Route$2._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { projectById as a, PROVIDER_ORDER as c, PROJECTS as i, allProviders as l, formatRoster as n, AVAILABLE_TO_ADD as o, titleFromPrompt as r, PROVIDERS_KEY as s, router_exports as t, resolveProvider as u };
