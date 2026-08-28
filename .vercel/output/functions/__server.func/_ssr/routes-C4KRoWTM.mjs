import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { S as ArrowUp, _ as Columns2, a as Trash2, b as Check, c as Settings2, d as PanelLeft, f as LayoutGrid, g as FileCode, h as FileText, l as Send, m as FolderOpen, n as Wifi, o as Terminal, p as Folder, r as Users, s as Square, t as X, u as Plus, v as CircleDashed, x as Blocks, y as ChevronRight } from "../_libs/lucide-react.mjs";
import { a as projectById, c as PROVIDER_ORDER, i as PROJECTS, l as allProviders, n as formatRoster, o as AVAILABLE_TO_ADD, r as titleFromPrompt, s as PROVIDERS_KEY, u as resolveProvider } from "./router-BJjvpOr6.mjs";
import { n as nn, r as qt, t as Qt } from "../_libs/react-resizable-panels.mjs";
import { t as create } from "../_libs/zustand.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { a as DialogPortal, c as Slot, i as DialogOverlay, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-C4KRoWTM.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var MODELS = {
	claude: [
		{
			id: "Opus 4.8",
			label: "Opus 4.8"
		},
		{
			id: "Opus 4.7",
			label: "Opus 4.7"
		},
		{
			id: "Sonnet 5",
			label: "Sonnet 5"
		},
		{
			id: "Sonnet 4.6",
			label: "Sonnet 4.6"
		},
		{
			id: "Haiku 4.5",
			label: "Haiku 4.5"
		},
		{
			id: "Fable 5",
			label: "Fable 5"
		}
	],
	codex: [
		{
			id: "GPT-5.4 Codex",
			label: "GPT-5.4 Codex"
		},
		{
			id: "GPT-5.4",
			label: "GPT-5.4"
		},
		{
			id: "GPT-5.4 Mini",
			label: "GPT-5.4 Mini"
		},
		{
			id: "GPT-5.3 Codex",
			label: "GPT-5.3 Codex"
		}
	],
	cursor: [
		{
			id: "Composer 2",
			label: "Composer 2"
		},
		{
			id: "Composer 1.5",
			label: "Composer 1.5"
		},
		{
			id: "Sonnet 4.6",
			label: "Sonnet 4.6"
		},
		{
			id: "Opus 4.6",
			label: "Opus 4.6"
		},
		{
			id: "GPT-5.4",
			label: "GPT-5.4"
		},
		{
			id: "Grok 4",
			label: "Grok 4"
		}
	],
	grok: [{
		id: "Grok 4.5",
		label: "Grok 4.5"
	}, {
		id: "Grok 4",
		label: "Grok 4"
	}]
};
/** Effort is provider-specific. Claude uses Extra (= xhigh) and Supercode (= ultracode). */
var EFFORTS = {
	claude: [
		{
			id: "low",
			label: "Low",
			hint: "Fast, light on limits"
		},
		{
			id: "medium",
			label: "Medium",
			hint: "Everyday coding"
		},
		{
			id: "high",
			label: "High",
			hint: "Default for Opus"
		},
		{
			id: "extra",
			label: "Extra",
			hint: "xhigh — long agentic work"
		},
		{
			id: "max",
			label: "Max",
			hint: "Single-pass maximum"
		},
		{
			id: "supercode",
			label: "Supercode",
			hint: "ultracode — session-only"
		}
	],
	codex: [
		{
			id: "minimal",
			label: "Minimal",
			hint: "CLI: cheapest thinking"
		},
		{
			id: "low",
			label: "Low",
			hint: "Desktop calls this Light"
		},
		{
			id: "medium",
			label: "Medium",
			hint: "Recommended default"
		},
		{
			id: "high",
			label: "High",
			hint: "Harder tasks"
		},
		{
			id: "xhigh",
			label: "Extra high",
			hint: "Long-horizon work"
		}
	],
	cursor: [
		{
			id: "low",
			label: "Low",
			hint: "Quick edits"
		},
		{
			id: "medium",
			label: "Medium",
			hint: "Default"
		},
		{
			id: "high",
			label: "High",
			hint: "Deeper reasoning"
		},
		{
			id: "xhigh",
			label: "Extra high",
			hint: "Hardest Composer turns"
		}
	],
	grok: [
		{
			id: "low",
			label: "Low",
			hint: "Snappy"
		},
		{
			id: "medium",
			label: "Medium",
			hint: "Default"
		},
		{
			id: "high",
			label: "High",
			hint: "More thinking"
		}
	]
};
var DEFAULT_EFFORT = {
	claude: "high",
	codex: "medium",
	cursor: "medium",
	grok: "medium"
};
var SLASH = {
	claude: [
		{
			cmd: "clear",
			hint: "Start a new conversation",
			kind: "builtin"
		},
		{
			cmd: "compact",
			args: "[focus]",
			hint: "Summarize history to free context",
			kind: "builtin"
		},
		{
			cmd: "model",
			args: "[name]",
			hint: "Switch model for this session",
			kind: "builtin"
		},
		{
			cmd: "effort",
			args: "[level]",
			hint: "Set effort: low … supercode",
			kind: "builtin"
		},
		{
			cmd: "plan",
			args: "[task]",
			hint: "Enter plan mode",
			kind: "builtin"
		},
		{
			cmd: "fast",
			hint: "Toggle fast mode",
			kind: "builtin"
		},
		{
			cmd: "context",
			hint: "Show context usage",
			kind: "builtin"
		},
		{
			cmd: "cost",
			hint: "Session usage",
			kind: "builtin"
		},
		{
			cmd: "permissions",
			hint: "Tool allowlist",
			kind: "builtin"
		},
		{
			cmd: "mcp",
			hint: "Manage MCP connectors",
			kind: "builtin"
		},
		{
			cmd: "plugin",
			hint: "Manage plugins",
			kind: "builtin"
		},
		{
			cmd: "skills",
			hint: "List enabled skills",
			kind: "builtin"
		},
		{
			cmd: "memory",
			hint: "Edit CLAUDE.md",
			kind: "builtin"
		},
		{
			cmd: "init",
			hint: "Write CLAUDE.md for this repo",
			kind: "builtin"
		},
		{
			cmd: "diff",
			hint: "Review working tree",
			kind: "builtin"
		},
		{
			cmd: "code-review",
			args: "[path]",
			hint: "Review diff for bugs",
			kind: "skill"
		},
		{
			cmd: "debug",
			args: "[issue]",
			hint: "Debug with extra logging",
			kind: "skill"
		},
		{
			cmd: "doctor",
			hint: "Diagnose Claude Code setup",
			kind: "skill"
		},
		{
			cmd: "batch",
			args: "[instruction]",
			hint: "Split work across subagents",
			kind: "skill"
		},
		{
			cmd: "loop",
			args: "[prompt]",
			hint: "Repeat until done",
			kind: "skill"
		},
		{
			cmd: "help",
			hint: "List commands for this provider",
			kind: "builtin"
		}
	],
	codex: [
		{
			cmd: "clear",
			hint: "New thread",
			kind: "builtin"
		},
		{
			cmd: "compact",
			hint: "Compact context",
			kind: "builtin"
		},
		{
			cmd: "model",
			args: "[name]",
			hint: "Choose model and reasoning effort",
			kind: "builtin"
		},
		{
			cmd: "fast",
			hint: "Toggle GPT-5.4 fast tier",
			kind: "builtin"
		},
		{
			cmd: "plan",
			args: "[task]",
			hint: "Plan before editing",
			kind: "builtin"
		},
		{
			cmd: "approvals",
			hint: "What Codex may do unattended",
			kind: "builtin"
		},
		{
			cmd: "status",
			hint: "Runtime and auth",
			kind: "builtin"
		},
		{
			cmd: "diff",
			hint: "Show uncommitted changes",
			kind: "builtin"
		},
		{
			cmd: "undo",
			hint: "Revert last Codex turn",
			kind: "builtin"
		},
		{
			cmd: "review",
			hint: "Review the current diff",
			kind: "builtin"
		},
		{
			cmd: "mcp",
			hint: "MCP servers",
			kind: "builtin"
		},
		{
			cmd: "skills",
			hint: "Enabled skills",
			kind: "builtin"
		},
		{
			cmd: "init",
			hint: "Write AGENTS.md",
			kind: "builtin"
		},
		{
			cmd: "help",
			hint: "List Codex commands",
			kind: "builtin"
		}
	],
	cursor: [
		{
			cmd: "clear",
			hint: "Reset the agent thread",
			kind: "builtin"
		},
		{
			cmd: "compress",
			hint: "Compress context",
			kind: "builtin"
		},
		{
			cmd: "model",
			args: "[name]",
			hint: "Switch Composer / frontier model",
			kind: "builtin"
		},
		{
			cmd: "plan",
			args: "[task]",
			hint: "Read-only plan mode",
			kind: "builtin"
		},
		{
			cmd: "ask",
			args: "[q]",
			hint: "Q&A, no edits",
			kind: "builtin"
		},
		{
			cmd: "mode",
			args: "[agent|plan|ask]",
			hint: "Set agent mode",
			kind: "builtin"
		},
		{
			cmd: "rules",
			hint: "Project rules",
			kind: "builtin"
		},
		{
			cmd: "mcp",
			hint: "MCP connectors",
			kind: "builtin"
		},
		{
			cmd: "skills",
			hint: "Enabled skills",
			kind: "builtin"
		},
		{
			cmd: "apply",
			hint: "Apply pending diffs",
			kind: "builtin"
		},
		{
			cmd: "help",
			hint: "List Cursor commands",
			kind: "builtin"
		}
	],
	grok: [
		{
			cmd: "clear",
			hint: "New conversation",
			kind: "builtin"
		},
		{
			cmd: "compact",
			hint: "Summarize history",
			kind: "builtin"
		},
		{
			cmd: "model",
			args: "[name]",
			hint: "Switch Grok model",
			kind: "builtin"
		},
		{
			cmd: "effort",
			args: "[level]",
			hint: "low / medium / high",
			kind: "builtin"
		},
		{
			cmd: "plan",
			args: "[task]",
			hint: "Plan first",
			kind: "builtin"
		},
		{
			cmd: "mcp",
			hint: "Connectors",
			kind: "builtin"
		},
		{
			cmd: "skills",
			hint: "Enabled skills",
			kind: "builtin"
		},
		{
			cmd: "help",
			hint: "List Grok commands",
			kind: "builtin"
		}
	]
};
var GENERIC_SLASH = [
	{
		cmd: "clear",
		hint: "New conversation",
		kind: "builtin"
	},
	{
		cmd: "compact",
		hint: "Summarize history",
		kind: "builtin"
	},
	{
		cmd: "model",
		args: "[name]",
		hint: "Switch model",
		kind: "builtin"
	},
	{
		cmd: "effort",
		args: "[level]",
		hint: "low / medium / high",
		kind: "builtin"
	},
	{
		cmd: "skills",
		hint: "Enabled skills",
		kind: "builtin"
	},
	{
		cmd: "mcp",
		hint: "Connectors",
		kind: "builtin"
	},
	{
		cmd: "help",
		hint: "List commands",
		kind: "builtin"
	}
];
var BUS_SLASH = [{
	cmd: "agents",
	hint: "List other sessions on this desk",
	kind: "builtin"
}, {
	cmd: "msg",
	args: "<session> <text>",
	hint: "Message another WestCode session",
	kind: "builtin"
}];
var GENERIC_EFFORT = [
	{
		id: "low",
		label: "Low",
		hint: "Faster"
	},
	{
		id: "medium",
		label: "Medium",
		hint: "Default"
	},
	{
		id: "high",
		label: "High",
		hint: "Deeper"
	}
];
function isBuiltin(id) {
	return id === "claude" || id === "codex" || id === "cursor" || id === "grok";
}
function modelsFor(id, extras = []) {
	if (isBuiltin(id)) return MODELS[id];
	return extras.map((m) => ({
		id: m,
		label: m
	}));
}
function effortsFor(id) {
	if (isBuiltin(id)) return EFFORTS[id];
	return GENERIC_EFFORT;
}
function defaultEffortFor(id) {
	if (isBuiltin(id)) return DEFAULT_EFFORT[id];
	return "medium";
}
function slashFor(id) {
	const base = isBuiltin(id) ? SLASH[id] : GENERIC_SLASH;
	const help = base.filter((c) => c.cmd === "help");
	return [
		...base.filter((c) => c.cmd !== "help"),
		...BUS_SLASH,
		...help
	];
}
function filterSlash(id, query) {
	const q = query.replace(/^\//, "").toLowerCase();
	return slashFor(id).filter((c) => c.cmd.startsWith(q) || c.hint.toLowerCase().includes(q));
}
function matchModel(id, query, extras = []) {
	const q = query.trim().toLowerCase();
	if (!q) return void 0;
	const list = modelsFor(id, extras);
	return list.find((m) => m.id.toLowerCase() === q) ?? list.find((m) => m.label.toLowerCase() === q) ?? list.find((m) => m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q));
}
function matchEffort(id, query) {
	const q = query.trim().toLowerCase();
	if (!q) return void 0;
	const list = effortsFor(id);
	return list.find((e) => e.id.toLowerCase() === q) ?? list.find((e) => e.label.toLowerCase() === q) ?? list.find((e) => e.id.toLowerCase().includes(q) || e.label.toLowerCase().includes(q));
}
function effortLabel(id, effort) {
	return effortsFor(id).find((e) => e.id === effort)?.label ?? effort;
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function uid(prefix = "id") {
	return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
function relativeTime(ts, now = Date.now()) {
	const s = Math.max(0, Math.floor((now - ts) / 1e3));
	if (s < 8) return "just now";
	if (s < 60) return `${s}s ago`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	return `${Math.floor(h / 24)}d ago`;
}
function formatClock(d = /* @__PURE__ */ new Date()) {
	return d.toLocaleTimeString(void 0, {
		hour: "numeric",
		minute: "2-digit"
	});
}
var TEXT_EXT = /\.(md|txt|json|ts|tsx|js|jsx|mjs|cjs|go|rs|py|rb|php|css|scss|html|htm|yml|yaml|toml|svg|xml|sh|bash|zsh|env|sql|graphql|vue|svelte|kt|swift|c|h|cpp|cc|java|cs|r|lua)$/i;
var MAX_TEXT = 8e4;
var MAX_FILES = 8;
function prettySize(n) {
	if (n < 1024) return `${n} B`;
	if (n < 1048576) return `${Math.round(n / 1024)} KB`;
	return `${(n / 1048576).toFixed(1)} MB`;
}
function langFromFilenames(names) {
	const ext = names.map((n) => (n.split(".").pop() ?? "").toLowerCase());
	const has = (xs) => ext.some((e) => xs.includes(e));
	if (has(["ts", "tsx"])) return "TypeScript";
	if (has(["go"])) return "Go";
	if (has(["rs"])) return "Rust";
	if (has(["py"])) return "Python";
	if (has(["swift"])) return "Swift";
	if (has(["kt"])) return "Kotlin";
	if (has(["java"])) return "Java";
	if (has(["rb"])) return "Ruby";
	if (has([
		"js",
		"jsx",
		"mjs"
	])) return "JavaScript";
	return "Mixed";
}
async function readAttachments(files) {
	const list = Array.from(files).slice(0, MAX_FILES);
	const out = [];
	for (const file of list) {
		const mime = file.type || "application/octet-stream";
		if ((mime.startsWith("text/") || mime === "application/json" || TEXT_EXT.test(file.name)) && file.size <= MAX_TEXT) {
			out.push({
				id: uid("file"),
				name: file.name,
				size: file.size,
				mime,
				kind: "text",
				text: await file.text()
			});
			continue;
		}
		out.push({
			id: uid("file"),
			name: file.name,
			size: file.size,
			mime,
			kind: mime.startsWith("image/") ? "image" : "binary"
		});
	}
	return out;
}
function formatOutgoing(text, attachments) {
	const body = text.trim();
	if (!attachments?.length) return body;
	return [body, ...attachments.map((a) => {
		if (a.kind === "text" && a.text) return `<attached name="${a.name}">\n${a.text.slice(0, 12e3)}\n</attached>`;
		return `<attached name="${a.name}" mime="${a.mime}" size="${a.size}" />`;
	})].filter(Boolean).join("\n\n");
}
async function pickDirectory() {
	const w = window;
	if (typeof w.showDirectoryPicker === "function") try {
		const handle = await w.showDirectoryPicker({ mode: "read" });
		const names = [];
		let n = 0;
		for await (const entry of handle.values()) {
			names.push(entry.name);
			n += 1;
			if (n >= 40) break;
		}
		return {
			name: handle.name,
			path: `~/${handle.name}`,
			language: langFromFilenames(names),
			hint: "Opened from this Mac"
		};
	} catch (err) {
		if (err.name === "AbortError") return null;
		return pickDirectoryInput();
	}
	return pickDirectoryInput();
}
function pickDirectoryInput() {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.multiple = true;
		input.setAttribute("webkitdirectory", "");
		input.setAttribute("directory", "");
		const done = (folder) => {
			input.remove();
			resolve(folder);
		};
		input.addEventListener("change", () => {
			const files = input.files;
			if (!files || files.length === 0) {
				done(null);
				return;
			}
			const name = files[0].webkitRelativePath?.split("/")[0] || "folder";
			const names = Array.from(files).map((f) => f.name);
			done({
				name,
				path: `~/${name}`,
				language: langFromFilenames(names),
				hint: "Opened from this Mac"
			});
		});
		input.addEventListener("cancel", () => done(null));
		input.click();
	});
}
var LIBRARY_KEY = "helix-library-v1";
var DEFAULT_ENABLED = [
	"skill-pdf",
	"skill-code-review",
	"skill-frontend-design",
	"mcp-github",
	"mcp-filesystem"
];
var LIBRARY = [
	{
		id: "skill-pdf",
		kind: "skill",
		name: "PDF",
		source: "Anthropic",
		repo: "anthropics/skills",
		summary: "Extract and generate PDFs from the working tree.",
		providers: [
			"claude",
			"codex",
			"cursor",
			"grok"
		],
		install: "/plugin install document-skills@anthropic-agent-skills"
	},
	{
		id: "skill-pptx",
		kind: "skill",
		name: "PowerPoint",
		source: "Anthropic",
		repo: "anthropics/skills",
		summary: "Read and write PPTX decks.",
		providers: [
			"claude",
			"codex",
			"cursor"
		],
		install: "/plugin install document-skills@anthropic-agent-skills"
	},
	{
		id: "skill-xlsx",
		kind: "skill",
		name: "Excel",
		source: "Anthropic",
		repo: "anthropics/skills",
		summary: "Spreadsheet read/write and formulas.",
		providers: [
			"claude",
			"codex",
			"cursor"
		],
		install: "/plugin install document-skills@anthropic-agent-skills"
	},
	{
		id: "skill-docx",
		kind: "skill",
		name: "Word",
		source: "Anthropic",
		repo: "anthropics/skills",
		summary: "DOCX authoring with tracked structure.",
		providers: ["claude", "codex"],
		install: "/plugin install document-skills@anthropic-agent-skills"
	},
	{
		id: "skill-frontend-design",
		kind: "skill",
		name: "Frontend design",
		source: "Anthropic",
		repo: "anthropics/skills",
		summary: "Distinctive UI — type, color, motion — not template slop.",
		providers: [
			"claude",
			"cursor",
			"grok"
		],
		install: "/plugin install example-skills@anthropic-agent-skills"
	},
	{
		id: "skill-webapp-testing",
		kind: "skill",
		name: "Webapp testing",
		source: "Anthropic",
		repo: "anthropics/skills",
		summary: "Playwright flows, console, and visual checks.",
		providers: [
			"claude",
			"codex",
			"cursor"
		],
		install: "/plugin install example-skills@anthropic-agent-skills"
	},
	{
		id: "skill-mcp-builder",
		kind: "skill",
		name: "MCP builder",
		source: "Anthropic",
		repo: "anthropics/skills",
		summary: "Scaffold and evaluate MCP servers.",
		providers: ["claude", "codex"],
		install: "/plugin install example-skills@anthropic-agent-skills"
	},
	{
		id: "skill-skill-creator",
		kind: "skill",
		name: "Skill creator",
		source: "Anthropic",
		repo: "anthropics/skills",
		summary: "Author a SKILL.md the agent can load.",
		providers: [
			"claude",
			"codex",
			"cursor",
			"grok"
		],
		install: "/plugin install example-skills@anthropic-agent-skills"
	},
	{
		id: "skill-code-review",
		kind: "skill",
		name: "Code review",
		source: "Anthropic",
		repo: "anthropics/skills",
		summary: "Review diffs and PRs. Maps to /code-review.",
		providers: [
			"claude",
			"codex",
			"cursor"
		],
		install: "bundled · /code-review"
	},
	{
		id: "skill-debug",
		kind: "skill",
		name: "Debug",
		source: "Anthropic",
		repo: "anthropics/skills",
		summary: "Focused debugging pass with extra logging.",
		providers: ["claude"],
		install: "bundled · /debug"
	},
	{
		id: "plugin-document-skills",
		kind: "plugin",
		name: "Document skills",
		source: "Anthropic",
		repo: "anthropics/skills",
		summary: "PDF / PPTX / XLSX / DOCX as a Claude Code plugin.",
		providers: ["claude"],
		install: "/plugin marketplace add anthropics/skills"
	},
	{
		id: "plugin-example-skills",
		kind: "plugin",
		name: "Example skills",
		source: "Anthropic",
		repo: "anthropics/skills",
		summary: "Frontend design, MCP builder, webapp testing.",
		providers: ["claude"],
		install: "/plugin install example-skills@anthropic-agent-skills"
	},
	{
		id: "plugin-knowledge-finance",
		kind: "plugin",
		name: "Finance",
		source: "Anthropic",
		repo: "anthropics/knowledge-work-plugins",
		summary: "Knowledge-work plugin: models, connectors, slash commands.",
		providers: ["claude"],
		install: "claude plugin marketplace add anthropics/knowledge-work-plugins"
	},
	{
		id: "plugin-knowledge-research",
		kind: "plugin",
		name: "Research",
		source: "Anthropic",
		repo: "anthropics/knowledge-work-plugins",
		summary: "Deep research workflow with cited synthesis.",
		providers: ["claude"],
		install: "claude plugin marketplace add anthropics/knowledge-work-plugins"
	},
	{
		id: "plugin-community",
		kind: "plugin",
		name: "Community skills pack",
		source: "Community",
		repo: "alirezarezvani/claude-skills",
		summary: "Large community pack — also loads in Codex, Cursor, Gemini.",
		providers: [
			"claude",
			"codex",
			"cursor"
		],
		install: "/plugin marketplace add alirezarezvani/claude-skills"
	},
	{
		id: "mcp-github",
		kind: "connector",
		name: "GitHub",
		source: "GitHub",
		repo: "github/github-mcp-server",
		summary: "PRs, issues, checks. Tools namespace as /mcp__github__*.",
		providers: [
			"claude",
			"codex",
			"cursor",
			"grok"
		],
		install: "MCP · stdio github-mcp-server"
	},
	{
		id: "mcp-linear",
		kind: "connector",
		name: "Linear",
		source: "Linear",
		repo: "linear/linear-mcp",
		summary: "Issues, projects, cycles.",
		providers: [
			"claude",
			"cursor",
			"codex"
		],
		install: "MCP · Linear OAuth"
	},
	{
		id: "mcp-notion",
		kind: "connector",
		name: "Notion",
		source: "Notion",
		repo: "makenotion/notion-mcp-server",
		summary: "Pages, databases, comments.",
		providers: [
			"claude",
			"codex",
			"cursor",
			"grok"
		],
		install: "MCP · Notion integration"
	},
	{
		id: "mcp-slack",
		kind: "connector",
		name: "Slack",
		source: "Slack",
		repo: "modelcontextprotocol/servers",
		summary: "Channels, threads, search.",
		providers: ["claude", "cursor"],
		install: "MCP · Slack bot token"
	},
	{
		id: "mcp-postgres",
		kind: "connector",
		name: "Postgres",
		source: "MCP",
		repo: "modelcontextprotocol/servers",
		summary: "Read-only SQL against a database URL.",
		providers: [
			"claude",
			"codex",
			"cursor",
			"grok"
		],
		install: "MCP · DATABASE_URL"
	},
	{
		id: "mcp-sentry",
		kind: "connector",
		name: "Sentry",
		source: "Sentry",
		repo: "getsentry/sentry-mcp",
		summary: "Issues, stack traces, releases.",
		providers: [
			"claude",
			"codex",
			"cursor"
		],
		install: "MCP · Sentry auth token"
	},
	{
		id: "mcp-figma",
		kind: "connector",
		name: "Figma",
		source: "Figma",
		repo: "figma/mcp-server-guide",
		summary: "File structure, components, variables.",
		providers: ["claude", "cursor"],
		install: "MCP · Figma Dev Mode"
	},
	{
		id: "mcp-stripe",
		kind: "connector",
		name: "Stripe",
		source: "Stripe",
		repo: "stripe/agent-toolkit",
		summary: "Customers, invoices, payment intents.",
		providers: ["claude", "codex"],
		install: "MCP · Stripe restricted key"
	},
	{
		id: "mcp-playwright",
		kind: "connector",
		name: "Playwright",
		source: "Microsoft",
		repo: "microsoft/playwright-mcp",
		summary: "Drive a real browser from the agent.",
		providers: [
			"claude",
			"codex",
			"cursor",
			"grok"
		],
		install: "npx @playwright/mcp"
	},
	{
		id: "mcp-filesystem",
		kind: "connector",
		name: "Filesystem",
		source: "MCP",
		repo: "modelcontextprotocol/servers",
		summary: "Scoped file tools outside the project cwd.",
		providers: [
			"claude",
			"codex",
			"cursor",
			"grok"
		],
		install: "MCP · stdio filesystem"
	}
];
var TOOL_RE = /<tool\s+name="([^"]+)"([^>]*)>([\s\S]*?)<\/tool>/gi;
var THINK_RE = /<think>([\s\S]*?)<\/think>/gi;
function attrs(src) {
	const path = /path="([^"]*)"/.exec(src)?.[1];
	return {
		path,
		command: /command="([^"]*)"/.exec(src)?.[1],
		to: /(?:\bto|\bsession|\bagent)="([^"]+)"/.exec(src)?.[1] ?? /(?:\bto|\bsession|\bagent)=([^\s>"']+)/.exec(src)?.[1] ?? path
	};
}
function pushText(blocks, text) {
	const t = text.replace(/\n{3,}/g, "\n\n").trim();
	if (t) blocks.push({
		type: "text",
		text: t
	});
}
function parseAgentOutput(raw) {
	const strippedThink = {
		text: raw,
		thinks: []
	};
	strippedThink.text = raw.replace(THINK_RE, (_, body) => {
		strippedThink.thinks.push(String(body).trim());
		return "";
	});
	const blocks = [];
	for (const t of strippedThink.thinks) if (t) blocks.push({
		type: "think",
		text: t
	});
	const src = strippedThink.text;
	let last = 0;
	const re = new RegExp(TOOL_RE.source, "gi");
	let m;
	while (m = re.exec(src)) {
		pushText(blocks, src.slice(last, m.index));
		const a = attrs(m[2] ?? "");
		const name = m[1] ?? "Tool";
		blocks.push({
			type: "tool",
			name,
			path: a.path,
			command: a.command,
			to: /^sendmessage$/i.test(name) ? a.to : void 0,
			content: (m[3] ?? "").trim(),
			status: "done"
		});
		last = m.index + m[0].length;
	}
	const rest = src.slice(last);
	const open = /<tool\s+name="([^"]+)"([^>]*)>([\s\S]*)$/i.exec(rest);
	if (open && !/<\/tool>/i.test(rest)) {
		pushText(blocks, rest.slice(0, open.index));
		const a = attrs(open[2] ?? "");
		const name = open[1] ?? "Tool";
		blocks.push({
			type: "tool",
			name,
			path: a.path,
			command: a.command,
			to: /^sendmessage$/i.test(name) ? a.to : void 0,
			content: (open[3] ?? "").trim(),
			status: "running"
		});
	} else pushText(blocks, rest);
	return blocks.length ? blocks : [{
		type: "text",
		text: raw.trim()
	}];
}
function blocksToPlain(blocks) {
	return blocks.map((b) => {
		if (b.type === "text") return b.text;
		if (b.type === "think") return b.text;
		if (/^sendmessage$/i.test(b.name)) return `SendMessage → ${b.to ?? ""}\n${b.content}`.trim();
		const target = b.path ?? b.command ?? "";
		return `${b.name} ${target}\n${b.content}`.trim();
	}).join("\n\n");
}
function lastSnippet(blocks, max = 140) {
	for (let i = blocks.length - 1; i >= 0; i--) {
		const b = blocks[i];
		if (!b) continue;
		if (b.type === "text" && b.text.trim()) {
			const t = b.text.replace(/\s+/g, " ").trim();
			return t.length > max ? `${t.slice(0, max)}…` : t;
		}
		if (b.type === "tool") {
			if (/^sendmessage$/i.test(b.name)) return `SendMessage · ${b.to ?? "session"}`;
			const target = b.path ?? b.command ?? b.name;
			return `${b.name} · ${target}`;
		}
	}
	return "No output yet";
}
function extractSendMessages(blocks) {
	const fromTools = blocks.filter((b) => b.type === "tool" && /^sendmessage$/i.test(b.name)).map((b) => ({
		to: (b.to ?? b.path ?? "").trim(),
		text: b.content.trim()
	})).filter((s) => s.to && s.text);
	if (fromTools.length) return fromTools;
	const plain = blocksToPlain(blocks);
	const out = [];
	const re = /SendMessage\s+(?:to[=:\s"]+)([a-z0-9._-]+)["']?\s*\n+([\s\S]+?)(?=\nSendMessage\s+to|\s*$)/gi;
	let m;
	while (m = re.exec(plain)) out.push({
		to: m[1].trim(),
		text: m[2].trim()
	});
	return out.filter((s) => s.to && s.text);
}
var t0 = Date.now();
var ago = (min) => t0 - min * 6e4;
var SEED_SESSIONS = [
	{
		id: "ses-claude-auth",
		title: "Refresh session cookies in auth middleware",
		providerId: "claude",
		projectId: "harbor",
		cwd: "~/src/harbor",
		model: "Opus 4.7",
		effort: "high",
		status: "waiting",
		createdAt: ago(42),
		updatedAt: ago(2),
		turns: 2,
		messages: [{
			id: "m-c-u1",
			role: "user",
			createdAt: ago(42),
			blocks: [{
				type: "text",
				text: "Session cookies die after a deploy even when the user is mid-checkout. The middleware in src/auth/middleware.ts looks like it's minting a new token every request. Fix it without forcing a logout, and add a test."
			}]
		}, {
			id: "m-c-a1",
			role: "assistant",
			createdAt: ago(40),
			blocks: [
				{
					type: "think",
					text: "If cookies vanish on deploy, the signing secret is rotating or the refresh path is writing a blank session. Read the middleware and the cookie helper first."
				},
				{
					type: "tool",
					name: "Read",
					path: "src/auth/middleware.ts",
					status: "done",
					content: `import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET);

export async function touchSession() {
  const jar = await cookies();
  const token = jar.get("harbor_session")?.value;
  if (!token) return null;

  const { payload } = await jwtVerify(token, secret());
  const next = await new SignJWT({ sub: payload.sub })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(secret());

  jar.set("harbor_session", next, { httpOnly: true, sameSite: "lax", path: "/" });
  return payload;
}`
				},
				{
					type: "tool",
					name: "Read",
					path: "src/auth/session.ts",
					status: "done",
					content: `export const SESSION_TTL_SEC = 60 * 60 * 24 * 14; // 14d
export const REFRESH_WINDOW_SEC = 60 * 15;`
				},
				{
					type: "text",
					text: "The 15-minute JWT is being re-signed on every `touchSession()` call, and `AUTH_SECRET` is baked at boot from a rolling deploy secret. Two failures: the cookie's max-age never matches the 14-day TTL, and a new secret invalidates in-flight checkouts. Sliding refresh should only fire inside the window, and verification needs to accept the previous secret."
				},
				{
					type: "tool",
					name: "Edit",
					path: "src/auth/middleware.ts",
					status: "done",
					content: `--- a/src/auth/middleware.ts
+++ b/src/auth/middleware.ts
@@ -6,16 +6,28 @@
 export async function touchSession() {
   const jar = await cookies();
   const token = jar.get("harbor_session")?.value;
   if (!token) return null;
 
-  const { payload } = await jwtVerify(token, secret());
-  const next = await new SignJWT({ sub: payload.sub })
-    .setProtectedHeader({ alg: "HS256" })
-    .setExpirationTime("15m")
-    .sign(secret());
-
-  jar.set("harbor_session", next, { httpOnly: true, sameSite: "lax", path: "/" });
-  return payload;
+  const payload = await verifyWithFallback(token);
+  if (!payload) return null;
+
+  const exp = Number(payload.exp ?? 0);
+  const remaining = exp - Math.floor(Date.now() / 1000);
+  if (remaining > REFRESH_WINDOW_SEC) return payload;
+
+  const next = await mint(payload.sub as string);
+  jar.set("harbor_session", next, {
+    httpOnly: true,
+    sameSite: "lax",
+    path: "/",
+    maxAge: SESSION_TTL_SEC,
+  });
+  return payload;
 }`
				},
				{
					type: "tool",
					name: "Write",
					path: "src/auth/verify.ts",
					status: "done",
					content: `export async function verifyWithFallback(token: string) {
  for (const key of [process.env.AUTH_SECRET, process.env.AUTH_SECRET_PREV]) {
    if (!key) continue;
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(key));
      return payload;
    } catch {
      /* try previous secret — rolling deploys */
    }
  }
  return null;
}`
				},
				{
					type: "tool",
					name: "Bash",
					command: "npx vitest run src/auth/middleware.test.ts",
					status: "done",
					content: ` ✓ src/auth/middleware.test.ts (3)
   ✓ keeps cookie across secret rotation
   ✓ does not resign outside refresh window
   ✓ mints when remaining < 15m

 Test Files  1 passed (1)
      Tests  3 passed (3)`
				},
				{
					type: "text",
					text: "Tests pass. I did not force a logout — in-flight sessions verify against `AUTH_SECRET_PREV` for one deploy, then slide onto the new secret inside the 15-minute window.\n\nOne thing I want your call on: should checkout skip `touchSession()` entirely and only refresh after a successful payment intent, so a slow 3-D Secure redirect can't race the cookie write?"
				}
			]
		}]
	},
	{
		id: "ses-codex-flake",
		title: "Stabilize checkout Playwright spec",
		providerId: "codex",
		projectId: "harbor",
		cwd: "~/src/harbor",
		model: "GPT-5.4 Codex",
		effort: "medium",
		status: "running",
		createdAt: ago(28),
		updatedAt: ago(1),
		turns: 1,
		messages: [{
			id: "m-x-u1",
			role: "user",
			createdAt: ago(28),
			blocks: [{
				type: "text",
				text: "tests/checkout.spec.ts is flaky on CI only — ~1/6 runs. Locally it's fine. Don't skip it. Find the race."
			}]
		}, {
			id: "m-x-a1",
			role: "assistant",
			createdAt: ago(26),
			blocks: [
				{
					type: "tool",
					name: "Read",
					path: "tests/checkout.spec.ts",
					status: "done",
					content: `test("paying with a saved card reaches receipt", async ({ page }) => {
  await page.goto("/checkout");
  await page.getByTestId("pay").click();
  await expect(page.getByTestId("receipt")).toBeVisible();
});`
				},
				{
					type: "tool",
					name: "Read",
					path: "src/checkout/usePay.ts",
					status: "done",
					content: `export function usePay() {
  const [pending, setPending] = useState(false);
  async function pay() {
    setPending(true);
    await stripe.confirmCardPayment(clientSecret);
    router.push("/checkout/receipt");
  }
  return { pay, pending };
}`
				},
				{
					type: "text",
					text: "Race is in the client, not Playwright. `confirmCardPayment` resolves when Stripe has the intent, but the receipt route still reads a webhook-written row. CI is a few hundred ms slower, so the page renders the empty state and the assertion fires too early. Two fixes: wait on the receipt's ready flag, and don't navigate until the intent is `succeeded` on our side."
				},
				{
					type: "tool",
					name: "Edit",
					path: "src/checkout/usePay.ts",
					status: "done",
					content: `--- a/src/checkout/usePay.ts
+++ b/src/checkout/usePay.ts
@@ -3,8 +3,11 @@
   async function pay() {
     setPending(true);
-    await stripe.confirmCardPayment(clientSecret);
-    router.push("/checkout/receipt");
+    const { paymentIntent } = await stripe.confirmCardPayment(clientSecret);
+    if (paymentIntent?.status !== "succeeded") {
+      throw new Error(paymentIntent?.status ?? "unconfirmed");
+    }
+    await api.waitForReceipt(paymentIntent.id);
+    router.push(\`/checkout/receipt?pi=\${paymentIntent.id}\`);
   }`
				},
				{
					type: "tool",
					name: "Edit",
					path: "tests/checkout.spec.ts",
					status: "done",
					content: `--- a/tests/checkout.spec.ts
+++ b/tests/checkout.spec.ts
@@ -1,5 +1,8 @@
 test("paying with a saved card reaches receipt", async ({ page }) => {
   await page.goto("/checkout");
   await page.getByTestId("pay").click();
-  await expect(page.getByTestId("receipt")).toBeVisible();
+  await expect(page.getByTestId("receipt")).toBeVisible({ timeout: 15_000 });
+  await expect(page.getByTestId("receipt")).toHaveAttribute(
+    "data-ready",
+    "true",
+  );
 });`
				},
				{
					type: "tool",
					name: "Bash",
					command: "npx playwright test tests/checkout.spec.ts --repeat-each=8",
					status: "running",
					content: `[1/8] passed
[2/8] passed
[3/8] passed
[4/8] passed`
				}
			]
		}]
	},
	{
		id: "ses-cursor-keys",
		title: "Command palette keyboard map",
		providerId: "cursor",
		projectId: "atlas",
		cwd: "~/src/atlas",
		model: "Composer 2",
		effort: "medium",
		status: "idle",
		createdAt: ago(80),
		updatedAt: ago(18),
		turns: 2,
		messages: [{
			id: "m-u-u1",
			role: "user",
			createdAt: ago(80),
			blocks: [{
				type: "text",
				text: "Add a command palette to the atlas TUI. Cmd+K / Ctrl+K to open, j/k to move, enter to run, esc to close. Fuzzy filter on the existing command registry. Don't pull a crate if we can do it with the current crossterm stack."
			}]
		}, {
			id: "m-u-a1",
			role: "assistant",
			createdAt: ago(74),
			blocks: [
				{
					type: "tool",
					name: "Read",
					path: "src/commands/registry.rs",
					status: "done",
					content: `pub struct Command {
    pub id: &'static str,
    pub title: &'static str,
    pub keys: &'static str,
    pub run: fn(&mut App),
}

pub static REGISTRY: &[Command] = &[
    Command { id: "file.save", title: "Save", keys: "ctrl+s", run: App::save },
    Command { id: "git.push", title: "Push", keys: "ctrl+shift+p", run: App::push },
];`
				},
				{
					type: "tool",
					name: "Write",
					path: "src/ui/palette.rs",
					status: "done",
					content: `pub struct Palette {
    open: bool,
    query: String,
    cursor: usize,
}

impl Palette {
    pub fn on_key(&mut self, key: KeyEvent, app: &mut App) {
        match key.code {
            KeyCode::Char('k') if key.modifiers.contains(CTRL_OR_CMD) => self.open = true,
            KeyCode::Esc => self.close(),
            KeyCode::Char('j') => self.cursor += 1,
            KeyCode::Char('k') => self.cursor = self.cursor.saturating_sub(1),
            KeyCode::Enter => self.run_selected(app),
            KeyCode::Char(c) => self.query.push(c),
            KeyCode::Backspace => { self.query.pop(); }
            _ => {}
        }
    }

    fn filtered(&self) -> Vec<&Command> {
        REGISTRY.iter().filter(|c| fuzzy(&self.query, c.title)).collect()
    }
}`
				},
				{
					type: "tool",
					name: "Edit",
					path: "src/app.rs",
					status: "done",
					content: `--- a/src/app.rs
+++ b/src/app.rs
@@ -18,6 +18,7 @@
 pub struct App {
     pub mode: Mode,
     pub git: Git,
+    pub palette: Palette,
 }`
				},
				{
					type: "tool",
					name: "Bash",
					command: "cargo test palette -- --nocapture",
					status: "done",
					content: `running 4 tests
test ui::palette::opens_on_ctrl_k ... ok
test ui::palette::fuzzy_ranks_title_before_id ... ok
test ui::palette::enter_runs_selected ... ok
test ui::palette::esc_clears_query ... ok

test result: ok. 4 passed; 0 failed`
				},
				{
					type: "text",
					text: "Palette is wired into `App` with the existing crossterm event loop — no new crate. Filter is a small subsequence fuzzy match on `REGISTRY` titles. j/k move, enter runs, esc closes and clears the query so the next Cmd+K is empty.\n\nCtrl/Cmd is the same modifier bit we already use for save. I left `ctrl+shift+p` on Push so it doesn't collide."
				}
			]
		}]
	}
];
var ONBOARD_KEY = "helix-onboarding-v1";
var FOLDERS_KEY = "helix-folders-v1";
var MAX_HOP = 3;
var abortBySession = /* @__PURE__ */ new Map();
var hopBySession = /* @__PURE__ */ new Map();
var inbox = /* @__PURE__ */ new Map();
var busLog = [];
function readJson(key, fallback) {
	if (typeof window === "undefined") return fallback;
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
}
function persistLibrary(enabled, custom) {
	try {
		localStorage.setItem(LIBRARY_KEY, JSON.stringify({
			enabled,
			custom
		}));
	} catch {}
}
function persistProviders(list) {
	try {
		localStorage.setItem(PROVIDERS_KEY, JSON.stringify(list));
	} catch {}
}
function persistFolders(list) {
	try {
		localStorage.setItem(FOLDERS_KEY, JSON.stringify(list));
	} catch {}
}
function slugId(name, taken) {
	const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "provider";
	if (!taken.has(base)) return base;
	let i = 2;
	while (taken.has(`${base}-${i}`)) i += 1;
	return `${base}-${i}`;
}
function systemNote(text) {
	return {
		id: uid("m"),
		role: "system",
		createdAt: Date.now(),
		blocks: [{
			type: "text",
			text
		}]
	};
}
function patchSession(sessions, id, fn) {
	return sessions.map((s) => s.id === id ? fn(s) : s);
}
function addonNames(enabled, custom, kind, providerId) {
	return [...LIBRARY, ...custom].filter((a) => a.kind === kind && enabled.includes(a.id) && (a.providers.includes(providerId) || a.providers.includes("*") || a.custom)).map((a) => a.name);
}
function rosterFor(sessions, selfId, custom) {
	return sessions.filter((s) => s.id !== selfId).map((s) => ({
		id: s.id,
		title: s.title,
		providerId: s.providerId,
		provider: resolveProvider(s.providerId, custom).short,
		cwd: s.cwd,
		model: s.model,
		status: s.status
	}));
}
function resolveTarget(sessions, fromId, query, custom) {
	const q = query.trim().toLowerCase();
	if (!q) return void 0;
	return sessions.filter((s) => s.id !== fromId).map((s) => {
		const short = resolveProvider(s.providerId, custom).short.toLowerCase();
		const title = s.title.toLowerCase();
		const id = s.id.toLowerCase();
		let score = 0;
		if (id === q || short === q) score = 100;
		else if (id.startsWith(q) || short.startsWith(q)) score = 80;
		else if (id.includes(q) || short.includes(q) || title.includes(q)) score = 50;
		else if (s.providerId.toLowerCase() === q) score = 70;
		return {
			s,
			score
		};
	}).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || b.s.updatedAt - a.s.updatedAt)[0]?.s;
}
function hashText(s) {
	return s.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 240);
}
function busAllowed(from, to, text, hop) {
	if (from === to) return "Cannot message this session.";
	if (hop > MAX_HOP) return "Desk bus stopped the loop (hop limit).";
	const now = Date.now();
	const h = hashText(text);
	const recent = busLog.filter((e) => now - e.at < 9e4);
	busLog.length = 0;
	busLog.push(...recent);
	if (recent.filter((e) => e.from === from && e.to === to).length >= 4) return "Desk bus rate-limited this pair.";
	if (recent.some((e) => e.from === from && e.to === to && e.hash === h)) return "Dropped a duplicate message.";
	busLog.push({
		from,
		to,
		at: now,
		hash: h
	});
	return null;
}
function fillListAgents(blocks, roster) {
	return blocks.map((b) => b.type === "tool" && /^listagents$/i.test(b.name) ? {
		...b,
		content: roster,
		status: "done"
	} : b);
}
var useHelix = create((set, get) => ({
	sessions: SEED_SESSIONS,
	activeId: SEED_SESSIONS[0]?.id ?? null,
	splitIds: null,
	view: "mosaic",
	onboarding: true,
	mobileNav: "desk",
	clock: Date.now(),
	newOpen: false,
	enabledAddons: DEFAULT_ENABLED,
	customAddons: [],
	customProviders: [],
	recentFolders: [],
	setView: (view) => set({
		view,
		mobileNav: "desk"
	}),
	setActive: (id) => set({
		activeId: id,
		view: "focus",
		mobileNav: "desk"
	}),
	setSplit: (ids) => set({
		splitIds: ids,
		view: "split",
		mobileNav: "desk"
	}),
	setNewOpen: (newOpen) => set({ newOpen }),
	setMobileNav: (mobileNav) => set({ mobileNav }),
	tick: () => set({ clock: Date.now() }),
	restoreOnboarding: () => {
		if (typeof window === "undefined") return;
		const seen = localStorage.getItem(ONBOARD_KEY);
		const lib = readJson(LIBRARY_KEY, {});
		const prov = readJson(PROVIDERS_KEY, []);
		const folders = readJson(FOLDERS_KEY, []);
		set({
			onboarding: seen !== "1",
			enabledAddons: lib.enabled ?? DEFAULT_ENABLED,
			customAddons: Array.isArray(lib.custom) ? lib.custom : [],
			customProviders: Array.isArray(prov) ? prov : [],
			recentFolders: Array.isArray(folders) ? folders : []
		});
	},
	dismissOnboarding: () => {
		try {
			localStorage.setItem(ONBOARD_KEY, "1");
		} catch {}
		set({ onboarding: false });
	},
	resetDemo: () => set({
		sessions: SEED_SESSIONS,
		activeId: SEED_SESSIONS[0]?.id ?? null,
		splitIds: null,
		view: "mosaic"
	}),
	finishCodexDemo: () => {
		set((state) => ({ sessions: patchSession(state.sessions, "ses-codex-flake", (s) => {
			if (s.status !== "running") return s;
			const messages = s.messages.map((m) => {
				if (m.id !== "m-x-a1") return m;
				const blocks = m.blocks.map((b) => {
					if (b.type === "tool" && b.status === "running") return {
						...b,
						status: "done",
						content: `${b.content}
[5/8] passed
[6/8] passed
[7/8] passed
[8/8] passed

  8 passed (8)`
					};
					return b;
				});
				return {
					...m,
					blocks: [...blocks, {
						type: "text",
						text: "8/8 green after waiting on `data-ready`. Race was the webhook vs navigate, not Playwright itself."
					}]
				};
			});
			return {
				...s,
				messages,
				status: "idle",
				updatedAt: Date.now()
			};
		}) }));
	},
	rememberFolder: (folder) => {
		const next = [folder, ...get().recentFolders.filter((f) => f.path !== folder.path)].slice(0, 6);
		persistFolders(next);
		set({ recentFolders: next });
	},
	createSession: ({ providerId, projectId, prompt, model, effort, cwd, attachments }) => {
		const p = resolveProvider(providerId, get().customProviders);
		const project = projectById(projectId);
		const session = {
			id: uid("ses"),
			title: titleFromPrompt(prompt),
			providerId,
			projectId,
			cwd: cwd?.trim() || project.path,
			model: model ?? p.defaultModel,
			effort: effort ?? defaultEffortFor(providerId),
			status: "idle",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			messages: [],
			turns: 0
		};
		set((state) => ({
			sessions: [session, ...state.sessions],
			activeId: session.id,
			view: "focus",
			newOpen: false,
			mobileNav: "desk"
		}));
		get().send(session.id, prompt, { attachments });
	},
	setSessionModel: (sessionId, model) => {
		set((state) => ({ sessions: patchSession(state.sessions, sessionId, (s) => ({
			...s,
			model,
			updatedAt: Date.now()
		})) }));
	},
	setSessionEffort: (sessionId, effort) => {
		set((state) => ({ sessions: patchSession(state.sessions, sessionId, (s) => ({
			...s,
			effort,
			updatedAt: Date.now()
		})) }));
	},
	toggleAddon: (id) => {
		const { enabledAddons, customAddons } = get();
		const next = enabledAddons.includes(id) ? enabledAddons.filter((x) => x !== id) : [...enabledAddons, id];
		persistLibrary(next, customAddons);
		set({ enabledAddons: next });
	},
	importAddon: (addon) => {
		const item = {
			...addon,
			id: uid("addon"),
			custom: true
		};
		const { enabledAddons, customAddons } = get();
		const custom = [...customAddons, item];
		const enabled = [...enabledAddons, item.id];
		persistLibrary(enabled, custom);
		set({
			customAddons: custom,
			enabledAddons: enabled
		});
	},
	removeAddon: (id) => {
		const { enabledAddons, customAddons } = get();
		const custom = customAddons.filter((a) => a.id !== id);
		const enabled = enabledAddons.filter((x) => x !== id);
		persistLibrary(enabled, custom);
		set({
			customAddons: custom,
			enabledAddons: enabled
		});
	},
	addCustomProvider: (p) => {
		const taken = new Set(get().customProviders.map((c) => c.id));
		const id = p.id && !taken.has(p.id) ? p.id : slugId(p.name, taken);
		const next = {
			id,
			name: p.name,
			vendor: p.vendor,
			auth: p.auth,
			authLabel: p.authLabel,
			endpoint: p.endpoint,
			apiKey: p.apiKey,
			models: p.models.length ? p.models : ["default"],
			defaultModel: p.defaultModel || p.models[0] || "default",
			connected: true
		};
		const list = [...get().customProviders.filter((c) => c.id !== id), next];
		persistProviders(list);
		set({ customProviders: list });
	},
	removeCustomProvider: (id) => {
		const list = get().customProviders.filter((c) => c.id !== id);
		persistProviders(list);
		set({ customProviders: list });
	},
	stop: (sessionId) => {
		abortBySession.get(sessionId)?.abort();
		abortBySession.delete(sessionId);
		set((state) => ({ sessions: patchSession(state.sessions, sessionId, (s) => ({
			...s,
			status: "waiting",
			updatedAt: Date.now(),
			messages: s.messages.map((m) => m.streaming ? {
				...m,
				streaming: false
			} : m)
		})) }));
	},
	messageSession: (fromId, toQuery, text, opts) => {
		const state = get();
		const from = state.sessions.find((s) => s.id === fromId);
		if (!from) return false;
		const target = resolveTarget(state.sessions, fromId, toQuery, state.customProviders);
		if (!target) return false;
		const hop = (hopBySession.get(fromId) ?? 0) + 1;
		const blocked = busAllowed(fromId, target.id, text, hop);
		if (blocked) {
			set((s) => ({ sessions: patchSession(s.sessions, fromId, (ses) => ({
				...ses,
				messages: [...ses.messages, systemNote(blocked)],
				updatedAt: Date.now()
			})) }));
			return true;
		}
		const toShort = resolveProvider(target.providerId, state.customProviders).short;
		if (opts?.echo) set((s) => ({ sessions: patchSession(s.sessions, fromId, (ses) => ({
			...ses,
			updatedAt: Date.now(),
			messages: [...ses.messages, {
				id: uid("m"),
				role: "assistant",
				createdAt: Date.now(),
				blocks: [{
					type: "tool",
					name: "SendMessage",
					to: `${toShort} · ${target.title}`,
					content: text,
					status: "done"
				}]
			}]
		})) }));
		deliverTo(get, {
			fromId,
			fromProviderId: from.providerId,
			fromTitle: from.title,
			targetId: target.id,
			text,
			hop
		});
		return true;
	},
	send: async (sessionId, text, opts) => {
		const trimmed = text.trim();
		const attachments = opts?.attachments ?? [];
		if (!trimmed && attachments.length === 0) return;
		if (!opts?.incoming && trimmed.startsWith("/")) {
			if (runSlash(get, set, sessionId, trimmed)) return;
		}
		const session = get().sessions.find((s) => s.id === sessionId);
		if (!session) return;
		if (session.status === "running") {
			if (opts?.incoming) {
				const q = inbox.get(sessionId) ?? [];
				if (q.length < 8) inbox.set(sessionId, [...q, {
					text: trimmed,
					incoming: opts.incoming
				}]);
			}
			return;
		}
		abortBySession.get(sessionId)?.abort();
		const ac = new AbortController();
		abortBySession.set(sessionId, ac);
		const hop = opts?.incoming?.hop ?? 0;
		hopBySession.set(sessionId, hop);
		const outgoing = formatOutgoing(trimmed, attachments);
		const userMsg = opts?.incoming ? {
			id: uid("m"),
			role: "agent",
			createdAt: Date.now(),
			blocks: [{
				type: "text",
				text: trimmed
			}],
			fromSessionId: opts.incoming.fromSessionId,
			fromProviderId: opts.incoming.fromProviderId,
			fromTitle: opts.incoming.fromTitle,
			hop
		} : {
			id: uid("m"),
			role: "user",
			createdAt: Date.now(),
			blocks: [{
				type: "text",
				text: trimmed || "Attached files"
			}],
			attachments: attachments.length ? attachments : void 0
		};
		const asstId = uid("m");
		const asstMsg = {
			id: asstId,
			role: "assistant",
			createdAt: Date.now(),
			blocks: [],
			raw: "",
			streaming: true
		};
		set((s) => ({ sessions: patchSession(s.sessions, sessionId, (ses) => ({
			...ses,
			title: ses.turns === 0 && ses.messages.length === 0 ? titleFromPrompt(trimmed || attachments[0]?.name || "Session") : ses.title,
			status: "running",
			updatedAt: Date.now(),
			turns: ses.turns + 1,
			messages: [
				...ses.messages,
				userMsg,
				asstMsg
			]
		})) }));
		const latest = get().sessions.find((s) => s.id === sessionId);
		if (!latest) return;
		const provider = resolveProvider(latest.providerId, get().customProviders);
		const history = latest.messages.filter((m) => m.role === "user" || m.role === "assistant" || m.role === "agent").filter((m) => m.id !== asstId).map((m) => {
			if (m.role === "agent") return {
				role: "user",
				content: `[Peer agent: ${resolveProvider(m.fromProviderId ?? "", get().customProviders).short} · ${m.fromTitle ?? "session"}]\nIncoming message from another WestCode session. Act on it. SendMessage a result back if they need one.\n\n${blocksToPlain(m.blocks)}`.slice(0, 6e3)
			};
			const content = m.role === "user" ? formatOutgoing(blocksToPlain(m.blocks), m.attachments) : blocksToPlain(m.blocks);
			return {
				role: m.role,
				content: content.slice(0, 6e3)
			};
		});
		if (opts?.incoming) {
			const last = history[history.length - 1];
			if (last) last.content = last.content;
		} else if (attachments.length && history.length) {
			const last = history[history.length - 1];
			if (last && last.role === "user") last.content = outgoing.slice(0, 6e3);
		}
		const { enabledAddons, customAddons, customProviders } = get();
		const roster = rosterFor(get().sessions, sessionId, customProviders);
		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					providerId: latest.providerId,
					providerName: provider.name,
					vendor: provider.vendor,
					projectId: latest.projectId,
					cwd: latest.cwd,
					model: latest.model,
					effort: latest.effort,
					selfId: latest.id,
					roster,
					skills: addonNames(enabledAddons, customAddons, "skill", latest.providerId),
					connectors: addonNames(enabledAddons, customAddons, "connector", latest.providerId),
					messages: history
				}),
				signal: ac.signal
			});
			if (!res.ok || !res.body) throw new Error(`Chat failed (${res.status})`);
			const reader = res.body.getReader();
			const dec = new TextDecoder();
			let carry = "";
			let raw = "";
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				carry += dec.decode(value, { stream: true });
				const lines = carry.split("\n");
				carry = lines.pop() ?? "";
				for (const line of lines) {
					const row = line.trim();
					if (!row.startsWith("data:")) continue;
					const data = row.slice(5).trim();
					if (!data || data === "[DONE]") continue;
					try {
						const json = JSON.parse(data);
						if (json.error) throw new Error(json.error);
						if (json.content) {
							raw += json.content;
							const blocks = parseAgentOutput(raw);
							set((s) => ({ sessions: patchSession(s.sessions, sessionId, (ses) => ({
								...ses,
								updatedAt: Date.now(),
								messages: ses.messages.map((m) => m.id === asstId ? {
									...m,
									raw,
									blocks,
									streaming: true
								} : m)
							})) }));
						}
					} catch (err) {
						if (err instanceof SyntaxError) continue;
						throw err;
					}
				}
			}
			const rosterText = formatRoster(roster);
			const finalBlocks = fillListAgents(parseAgentOutput(raw), rosterText);
			set((s) => ({ sessions: patchSession(s.sessions, sessionId, (ses) => ({
				...ses,
				status: "waiting",
				updatedAt: Date.now(),
				messages: ses.messages.map((m) => m.id === asstId ? {
					...m,
					streaming: false,
					blocks: finalBlocks
				} : m)
			})) }));
			const sends = extractSendMessages(finalBlocks);
			if (sends.length) queueMicrotask(() => {
				for (const msg of sends) get().messageSession(sessionId, msg.to, msg.text);
			});
		} catch (err) {
			if (err.name === "AbortError") return;
			set((s) => ({ sessions: patchSession(s.sessions, sessionId, (ses) => ({
				...ses,
				status: "error",
				updatedAt: Date.now(),
				messages: ses.messages.map((m) => m.id === asstId ? {
					...m,
					streaming: false,
					blocks: [{
						type: "text",
						text: `The agent did not respond. ${err.message}`
					}]
				} : m)
			})) }));
		} finally {
			abortBySession.delete(sessionId);
			const queued = inbox.get(sessionId);
			if (queued?.length) {
				const next = queued.shift();
				inbox.set(sessionId, queued);
				if (next) queueMicrotask(() => {
					get().send(sessionId, next.text, { incoming: next.incoming });
				});
			}
		}
	}
}));
async function deliverTo(get, opts) {
	if (!get().sessions.find((s) => s.id === opts.targetId)) return;
	await get().send(opts.targetId, opts.text, { incoming: {
		fromSessionId: opts.fromId,
		fromProviderId: opts.fromProviderId,
		fromTitle: opts.fromTitle,
		hop: opts.hop
	} });
}
function runSlash(get, set, sessionId, raw) {
	const session = get().sessions.find((s) => s.id === sessionId);
	if (!session) return true;
	const match = /^\/([a-z0-9-]+)(?:\s+([\s\S]+))?$/i.exec(raw);
	if (!match) return false;
	const cmd = match[1].toLowerCase();
	const arg = (match[2] ?? "").trim();
	const known = slashFor(session.providerId);
	const spec = known.find((c) => c.cmd === cmd);
	const note = (text) => {
		set((s) => ({ sessions: patchSession(s.sessions, sessionId, (ses) => ({
			...ses,
			updatedAt: Date.now(),
			messages: [...ses.messages, systemNote(text)]
		})) }));
	};
	const local = /* @__PURE__ */ new Set([
		"help",
		"clear",
		"compact",
		"compress",
		"model",
		"effort",
		"skills",
		"mcp",
		"plugin",
		"cost",
		"status",
		"permissions",
		"context",
		"fast",
		"approvals",
		"rules",
		"agents",
		"peers",
		"list-agents",
		"msg"
	]);
	if (!spec && !local.has(cmd)) return false;
	if (spec && spec.kind === "skill") return false;
	if (!local.has(cmd)) return false;
	if (cmd === "help") {
		const lines = known.map((c) => `/${c.cmd}${c.args ? ` ${c.args}` : ""}  — ${c.hint}`).join("\n");
		note(`${resolveProvider(session.providerId, get().customProviders).short} commands\n\n${lines}`);
		return true;
	}
	if (cmd === "agents" || cmd === "peers" || cmd === "list-agents") {
		const roster = rosterFor(get().sessions, sessionId, get().customProviders);
		note(`WestCode desk roster\n\n${formatRoster(roster)}`);
		return true;
	}
	if (cmd === "msg") {
		const split = arg.match(/^(\S+)\s+([\s\S]+)$/);
		if (!split) {
			note("Usage: /msg <session> <text>\nTry /agents for the roster.");
			return true;
		}
		if (!get().messageSession(sessionId, split[1], split[2], { echo: true })) note(`No session matching “${split[1]}”. Try /agents.`);
		return true;
	}
	if (cmd === "clear") {
		set((s) => ({ sessions: patchSession(s.sessions, sessionId, (ses) => ({
			...ses,
			messages: [systemNote("Conversation cleared.")],
			turns: 0,
			updatedAt: Date.now(),
			status: "idle"
		})) }));
		return true;
	}
	if (cmd === "compact" || cmd === "compress") {
		set((s) => ({ sessions: patchSession(s.sessions, sessionId, (ses) => {
			const kept = ses.messages.filter((m) => m.role !== "system").slice(-4);
			const focus = arg ? ` Focus: ${arg}.` : "";
			return {
				...ses,
				messages: [systemNote(`Context compacted.${focus} Last turns kept.`), ...kept],
				updatedAt: Date.now()
			};
		}) }));
		return true;
	}
	if (cmd === "model") {
		const extras = resolveProvider(session.providerId, get().customProviders).models;
		if (!arg) {
			note(`Models for this provider\n\n${modelsFor(session.providerId, extras).map((m) => m.id === session.model ? `• ${m.label}  (current)` : `  ${m.label}`).join("\n")}`);
			return true;
		}
		const found = matchModel(session.providerId, arg, extras);
		if (!found) {
			note(`Unknown model “${arg}”. Try /model for the list.`);
			return true;
		}
		set((s) => ({ sessions: patchSession(s.sessions, sessionId, (ses) => ({
			...ses,
			model: found.id,
			updatedAt: Date.now(),
			messages: [...ses.messages, systemNote(`Model set to ${found.label}.`)]
		})) }));
		return true;
	}
	if (cmd === "effort") {
		if (!arg) {
			note(`Effort for this provider\n\n${effortsFor(session.providerId).map((e) => e.id === session.effort ? `• ${e.label}  (${e.id}) — ${e.hint}  (current)` : `  ${e.label}  (${e.id}) — ${e.hint}`).join("\n")}`);
			return true;
		}
		const found = matchEffort(session.providerId, arg);
		if (!found) {
			note(`Unknown effort “${arg}”. Try /effort for the list.`);
			return true;
		}
		set((s) => ({ sessions: patchSession(s.sessions, sessionId, (ses) => ({
			...ses,
			effort: found.id,
			updatedAt: Date.now(),
			messages: [...ses.messages, systemNote(`Effort set to ${found.label}.`)]
		})) }));
		return true;
	}
	if (cmd === "fast") {
		const low = session.effort === "low" || session.effort === "minimal";
		const next = low ? defaultEffortFor(session.providerId) : effortsFor(session.providerId).some((e) => e.id === "minimal") ? "minimal" : "low";
		set((s) => ({ sessions: patchSession(s.sessions, sessionId, (ses) => ({
			...ses,
			effort: next,
			updatedAt: Date.now(),
			messages: [...ses.messages, systemNote(low ? `Fast mode off. Effort ${effortLabel(session.providerId, next)}.` : `Fast mode on. Effort ${effortLabel(session.providerId, next)}.`)]
		})) }));
		return true;
	}
	if (cmd === "skills" || cmd === "plugin" || cmd === "mcp") {
		const kind = cmd === "skills" ? "skill" : cmd === "plugin" ? "plugin" : "connector";
		const { enabledAddons, customAddons } = get();
		const names = addonNames(enabledAddons, customAddons, kind, session.providerId);
		const label = kind === "skill" ? "Skills" : kind === "plugin" ? "Plugins" : "Connectors";
		note(names.length ? `${label} enabled for this provider\n\n${names.map((n) => `• ${n}`).join("\n")}\n\nToggle more in Library.` : `No ${label.toLowerCase()} enabled for this provider. Open Library to add them.`);
		return true;
	}
	if (cmd === "cost" || cmd === "context") {
		note(`Turns: ${session.turns}\nModel: ${session.model}\nEffort: ${effortLabel(session.providerId, session.effort)}\nMessages: ${session.messages.length}\nAuth: ${resolveProvider(session.providerId, get().customProviders).authLabel}`);
		return true;
	}
	if (cmd === "status" || cmd === "permissions" || cmd === "approvals" || cmd === "rules") {
		const p = resolveProvider(session.providerId, get().customProviders);
		note(`${p.name}\n${p.protocol}\nAuth: ${p.authLabel}\nBinary: ${p.binary}\nCwd: ${session.cwd}\n${cmd === "permissions" || cmd === "approvals" ? "Unattended tools: Read, Grep. Write/Edit/Bash ask first." : "Project rules load from the repo (CLAUDE.md / AGENTS.md)."}`);
		return true;
	}
	return false;
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-opacity duration-(--motion-quick) ease-(--ease-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4", {
	variants: {
		variant: {
			default: "bg-accent text-accent-foreground hover:opacity-90",
			ghost: "text-foreground hover:bg-muted/60",
			outline: "border border-border bg-transparent hover:bg-muted/50",
			subtle: "bg-muted text-foreground hover:bg-muted/80",
			danger: "bg-danger text-danger-foreground hover:opacity-90"
		},
		size: {
			default: "h-9 rounded-md px-3 text-sm",
			sm: "h-7 rounded-sm px-2.5 text-xs",
			lg: "h-11 rounded-md px-4 text-sm",
			icon: "size-8 rounded-sm",
			pill: "h-7 rounded-full px-3 text-xs"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
function HelixMark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		fill: "none",
		className: cn("text-foreground", className),
		"aria-hidden": true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M8 3c4.2 2.4 4.2 5.6 0 8 4.2 2.4 4.2 5.6 0 8",
			stroke: "currentColor",
			strokeWidth: "1.6",
			strokeLinecap: "round"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M16 3c-4.2 2.4-4.2 5.6 0 8-4.2 2.4-4.2 5.6 0 8",
			stroke: "currentColor",
			strokeWidth: "1.6",
			strokeLinecap: "round",
			opacity: "0.55"
		})]
	});
}
function toneBg(id) {
	if (id === "claude") return "bg-claude";
	if (id === "codex") return "bg-codex";
	if (id === "cursor") return "bg-cursor";
	if (id === "grok") return "bg-grok";
	return "bg-accent";
}
function toneText(id) {
	if (id === "claude") return "text-claude";
	if (id === "codex") return "text-codex";
	if (id === "cursor") return "text-cursor";
	if (id === "grok") return "text-grok";
	return "text-accent";
}
function useResolvedProvider(id) {
	const custom = useHelix((s) => s.customProviders);
	return resolveProvider(id, custom);
}
function useAllProviders() {
	const custom = useHelix((s) => s.customProviders);
	return allProviders(custom);
}
function ProviderDot({ id, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-block size-2 shrink-0 rounded-full", toneBg(id), className),
		"aria-hidden": true
	});
}
function ProviderChip({ id, live }) {
	const p = useResolvedProvider(id);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-2xs font-medium text-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderDot, { id }),
			p.short,
			live ?? p.live ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-subtle",
				children: "live"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-subtle",
				children: "ACP"
			})
		]
	});
}
function ProviderName({ id, className }) {
	const p = useResolvedProvider(id);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn(toneText(id), className),
		children: p.short
	});
}
function StatusLabel({ status }) {
	const s = {
		running: {
			label: "Running",
			cls: "text-claude"
		},
		waiting: {
			label: "Waiting",
			cls: "text-warn"
		},
		idle: {
			label: "Idle",
			cls: "text-muted-foreground"
		},
		error: {
			label: "Error",
			cls: "text-danger"
		}
	}[status];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: cn("inline-flex items-center gap-1.5 text-2xs font-medium", s.cls),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-1.5 rounded-full bg-current", status === "running" && "animate-pulse") }), s.label]
	});
}
var TABS = [
	{
		id: "skill",
		label: "Skills"
	},
	{
		id: "plugin",
		label: "Plugins"
	},
	{
		id: "connector",
		label: "Connectors"
	}
];
function LibraryView() {
	const enabled = useHelix((s) => s.enabledAddons);
	const custom = useHelix((s) => s.customAddons);
	const toggle = useHelix((s) => s.toggleAddon);
	const remove = useHelix((s) => s.removeAddon);
	const [tab, setTab] = (0, import_react.useState)("skill");
	const [query, setQuery] = (0, import_react.useState)("");
	const [importOpen, setImportOpen] = (0, import_react.useState)(false);
	const items = (0, import_react.useMemo)(() => {
		const all = [...LIBRARY, ...custom].filter((a) => a.kind === tab);
		const q = query.trim().toLowerCase();
		if (!q) return all;
		return all.filter((a) => a.name.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.repo.toLowerCase().includes(q) || a.source.toLowerCase().includes(q));
	}, [
		tab,
		query,
		custom
	]);
	const enabledCount = items.filter((a) => enabled.includes(a.id)).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 md:p-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-2xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-end justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-medium tracking-tight",
						children: "Library"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm leading-relaxed text-muted-foreground",
						children: "Skills, plugins, and MCP connectors from GitHub — anthropics/skills, knowledge-work-plugins, community packs, and official MCP servers. Enable them for sessions, or import your own."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						onClick: () => setImportOpen(true),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), "Import"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 flex flex-wrap items-center gap-1.5",
					children: [TABS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setTab(t.id),
						className: cn("h-8 rounded-md px-3 text-xs font-medium", tab === t.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"),
						children: t.label
					}, t.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: query,
						onChange: (e) => setQuery(e.target.value),
						placeholder: "Filter",
						className: "ml-auto h-8 w-36 rounded-md border border-border bg-window px-2.5 text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-2xs text-subtle",
					children: [
						enabledCount,
						" enabled · ",
						items.length,
						" in this list"
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 space-y-2",
					children: items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: "rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground",
						children: "Nothing matches. Import your own, or clear the filter."
					}) : items.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddonCard, {
						addon: a,
						on: enabled.includes(a.id),
						onToggle: () => toggle(a.id),
						onRemove: a.custom ? () => remove(a.id) : void 0
					}, a.id))
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImportDialog, {
			open: importOpen,
			onOpenChange: setImportOpen
		})]
	});
}
function AddonCard({ addon, on, onToggle, onRemove }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
		className: cn("rounded-lg border bg-surface p-4", on ? "border-border-strong" : "border-border"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-sm font-medium",
							children: addon.name
						}), addon.custom ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-2xs text-subtle",
							children: "yours"
						}) : null]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs leading-relaxed text-muted-foreground",
						children: addon.summary
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 font-mono text-2xs text-subtle",
						children: [addon.source, addon.repo ? ` · ${addon.repo}` : ""]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 flex flex-wrap items-center gap-1.5",
						children: addon.providers.includes("*") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-2xs text-subtle",
							children: "all providers"
						}) : addon.providers.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1 text-2xs text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderDot, { id }), id]
						}, id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 font-mono text-2xs text-subtle",
						children: addon.install
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 flex-col items-end gap-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: on ? "subtle" : "outline",
					onClick: onToggle,
					children: on ? "Enabled" : "Enable"
				}), onRemove ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: "ghost",
					"aria-label": "Remove",
					onClick: onRemove,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5 text-muted-foreground" })
				}) : null]
			})]
		})
	});
}
function ImportDialog({ open, onOpenChange }) {
	const importAddon = useHelix((s) => s.importAddon);
	const [kind, setKind] = (0, import_react.useState)("skill");
	const [name, setName] = (0, import_react.useState)("");
	const [source, setSource] = (0, import_react.useState)("");
	const [repo, setRepo] = (0, import_react.useState)("");
	const [summary, setSummary] = (0, import_react.useState)("");
	const [install, setInstall] = (0, import_react.useState)("");
	const [providers, setProviders] = (0, import_react.useState)([...PROVIDER_ORDER]);
	function toggleProv(id) {
		setProviders((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
	}
	function submit() {
		const n = name.trim();
		if (!n) return;
		importAddon({
			kind,
			name: n,
			source: source.trim() || "Custom",
			repo: repo.trim(),
			summary: summary.trim() || "Imported by you.",
			providers: providers.length ? providers : ["*"],
			install: install.trim() || "local"
		});
		setName("");
		setSource("");
		setRepo("");
		setSummary("");
		setInstall("");
		onOpenChange(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-50 bg-background/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[min(90dvh,40rem)] w-auto max-w-md -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-window focus:outline-none",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "text-lg font-medium tracking-tight",
					children: "Import"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
					className: "mt-1 text-xs text-muted-foreground",
					children: "Add a skill, plugin, or MCP connector from a repo you trust — or a local SKILL.md."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 flex gap-1.5",
					children: TABS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setKind(t.id),
						className: cn("h-8 rounded-md px-3 text-xs font-medium", kind === t.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"),
						children: t.label.slice(0, -1)
					}, t.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Name",
					value: name,
					onChange: setName,
					placeholder: "PDF tools"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Source",
					value: source,
					onChange: setSource,
					placeholder: "Anthropic, you, a teammate"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "GitHub repo",
					value: repo,
					onChange: setRepo,
					placeholder: "org/repo"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-3 block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-2xs font-medium tracking-wide text-subtle uppercase",
						children: "Summary"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: summary,
						onChange: (e) => setSummary(e.target.value),
						rows: 2,
						className: "mt-1.5 w-full resize-none rounded-md border border-border bg-window px-3 py-2 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Install",
					value: install,
					onChange: setInstall,
					placeholder: "/plugin install … or npx …"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-2xs font-medium tracking-wide text-subtle uppercase",
					children: "Providers"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-1.5 flex flex-wrap gap-1.5",
					children: PROVIDER_ORDER.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => toggleProv(id),
						className: cn("inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs", providers.includes(id) ? "border-accent bg-muted" : "border-border text-muted-foreground"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderDot, { id }), id]
					}, id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex justify-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						onClick: () => onOpenChange(false),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: submit,
						disabled: !name.trim(),
						children: "Add to library"
					})]
				})
			]
		})] })
	});
}
function Field({ label, value, onChange, placeholder }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "mt-3 block",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-2xs font-medium tracking-wide text-subtle uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			value,
			onChange: (e) => onChange(e.target.value),
			placeholder,
			className: "mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
		})]
	});
}
var MENUS = [
	{
		label: "WestCode",
		items: [
			{
				label: "About WestCode",
				action: "providers"
			},
			{
				label: "Library",
				action: "library"
			},
			{
				label: "New Session",
				action: "new"
			}
		]
	},
	{
		label: "View",
		items: [
			{
				label: "Mosaic",
				action: "mosaic"
			},
			{
				label: "Focus",
				action: "focus"
			},
			{
				label: "Split",
				action: "split"
			},
			{
				label: "Library",
				action: "library"
			},
			{
				label: "Connections",
				action: "providers"
			}
		]
	},
	{
		label: "Session",
		items: [{
			label: "New Session",
			action: "new"
		}]
	}
];
function MenuBar() {
	const setView = useHelix((s) => s.setView);
	const setNewOpen = useHelix((s) => s.setNewOpen);
	const sessions = useHelix((s) => s.sessions);
	const [open, setOpen] = (0, import_react.useState)(null);
	const [clock, setClock] = (0, import_react.useState)(() => formatClock());
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => setClock(formatClock()), 15e3);
		return () => window.clearInterval(id);
	}, []);
	function run(action) {
		setOpen(null);
		if (action === "new") setNewOpen(true);
		else setView(action);
	}
	const running = sessions.filter((s) => s.status === "running").length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "relative z-30 flex h-8 items-center justify-between border-b border-white/5 bg-menubar px-3 text-2xs text-foreground backdrop-blur-md",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HelixMark, { className: "mr-1 size-3.5" }), MENUS.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setOpen(open === m.label ? null : m.label),
					className: `rounded-xs px-2 py-0.5 ${open === m.label ? "bg-white/10" : "hover:bg-white/8"}`,
					children: m.label
				}), open === m.label ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute top-full left-0 mt-1 min-w-40 rounded-md border border-border bg-surface py-1 shadow-window",
					children: m.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => run(item.action),
						className: "block w-full px-3 py-1.5 text-left text-xs hover:bg-muted",
						children: item.label
					}, item.label))
				}) : null]
			}, m.label))]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3 text-muted-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "hidden tabular-nums sm:inline",
					children: [running, " running"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wifi, { className: "size-3" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "tabular-nums text-foreground",
					children: clock
				})
			]
		})]
	});
}
function MessageList({ messages, compact }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex flex-col", compact ? "gap-3" : "gap-5"),
		children: messages.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Message, {
			message: m,
			compact
		}, m.id))
	});
}
function Message({ message, compact }) {
	if (message.role === "system") {
		const text = message.blocks.map((b) => b.type === "text" ? b.text : "").join("\n");
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex justify-center",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: cn("max-w-[min(42rem,100%)] whitespace-pre-wrap rounded-md border border-border bg-surface px-3 py-2 font-sans text-2xs leading-relaxed text-muted-foreground", compact && "px-2.5 py-1.5"),
				children: text
			})
		});
	}
	if (message.role === "agent") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentNote, {
		message,
		compact
	});
	if (message.role === "user") {
		const text = message.blocks.map((b) => b.type === "text" ? b.text : "").join("\n");
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex justify-end",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("max-w-[min(42rem,92%)] rounded-lg bg-muted px-3.5 py-2.5 text-sm leading-relaxed text-foreground", compact && "px-3 py-2 text-xs"),
				children: [message.attachments?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttachmentRow, { items: message.attachments }) : null, text]
			})
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-2.5",
		children: [message.blocks.map((b, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockView, {
			block: b,
			compact
		}, `${message.id}-${i}`)), message.streaming && message.blocks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs text-muted-foreground",
			children: "Thinking"
		}) : null]
	});
}
function AgentNote({ message, compact }) {
	const who = useResolvedProvider(message.fromProviderId ?? "claude");
	const text = message.blocks.map((b) => b.type === "text" ? b.text : "").join("\n");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("rounded-lg border border-border bg-surface px-3.5 py-2.5", compact && "px-3 py-2"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mb-1.5 flex items-center gap-1.5 text-2xs font-medium text-muted-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-3" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderDot, { id: message.fromProviderId ?? "claude" }),
				"Message from ",
				who.short,
				message.fromTitle ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-subtle",
					children: "·"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "truncate",
					children: message.fromTitle
				})] }) : null
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: cn("whitespace-pre-wrap text-sm leading-relaxed", compact && "text-xs"),
			children: text
		})]
	});
}
function AttachmentRow({ items }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "mb-2 flex flex-wrap gap-1",
		children: items.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "inline-flex items-center gap-1 rounded-sm border border-border bg-window px-1.5 py-0.5 font-mono text-2xs text-muted-foreground",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "size-3" }), a.name]
		}, a.id))
	});
}
function BlockView({ block, compact }) {
	if (block.type === "think") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-xs italic leading-relaxed text-subtle",
		children: block.text
	});
	if (block.type === "tool") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolCard, {
		tool: block,
		compact
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Prose, {
		text: block.text,
		compact
	});
}
function ToolCard({ tool, compact }) {
	const send = /^sendmessage$/i.test(tool.name);
	const list = /^listagents$/i.test(tool.name);
	const [open, setOpen] = (0, import_react.useState)(tool.status === "running" || Boolean(tool.content));
	const target = tool.to ?? tool.path ?? tool.command ?? "";
	const Icon = send ? Send : list ? Users : tool.name === "Bash" ? Terminal : FileCode;
	const running = tool.status === "running";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "overflow-hidden rounded-md border border-border bg-surface-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => setOpen((v) => !v),
			className: "flex w-full items-center gap-2 px-3 py-2 text-left",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: cn("size-3.5 shrink-0 text-subtle transition-transform duration-(--motion-quick) ease-(--ease-out)", open && "rotate-90") }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-3.5 shrink-0 text-muted-foreground" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-2xs font-medium tracking-wide text-muted-foreground uppercase",
					children: tool.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "min-w-0 flex-1 truncate font-mono text-xs text-foreground",
					children: target
				}),
				running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleDashed, { className: "size-3.5 animate-spin text-claude" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5 text-success" })
			]
		}), open && tool.content ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: cn("overflow-x-auto border-t border-border bg-background/40 p-3 font-mono text-2xs leading-relaxed text-muted-foreground", compact && "max-h-32 overflow-y-auto", !compact && "max-h-72"),
			children: tool.content
		}) : null]
	});
}
function Prose({ text, compact }) {
	const parts = splitFences(text);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("max-w-prose text-sm leading-relaxed text-foreground", compact && "text-xs"),
		children: parts.map((p, i) => p.kind === "code" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: "my-2 overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-2xs text-muted-foreground",
			children: p.body
		}, i) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "whitespace-pre-wrap",
			children: inlineCode(p.body)
		}, i))
	});
}
function splitFences(text) {
	const out = [];
	const re = /```[\w-]*\n?([\s\S]*?)```/g;
	let last = 0;
	let m;
	while (m = re.exec(text)) {
		if (m.index > last) out.push({
			kind: "text",
			body: text.slice(last, m.index).trim()
		});
		out.push({
			kind: "code",
			body: (m[1] ?? "").trimEnd()
		});
		last = m.index + m[0].length;
	}
	if (last < text.length) out.push({
		kind: "text",
		body: text.slice(last).trim()
	});
	return out.filter((p) => p.body);
}
function inlineCode(text) {
	return text.split(/(`[^`]+`)/g).map((b, i) => {
		if (b.startsWith("`") && b.endsWith("`")) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
			className: "rounded-xs bg-muted px-1 py-0.5 font-mono text-2xs text-accent",
			children: b.slice(1, -1)
		}, i);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: b }, i);
	});
}
function Composer({ session }) {
	const send = useHelix((s) => s.send);
	const stop = useHelix((s) => s.stop);
	const sessions = useHelix((s) => s.sessions);
	const [value, setValue] = (0, import_react.useState)("");
	const [files, setFiles] = (0, import_react.useState)([]);
	const [hi, setHi] = (0, import_react.useState)(0);
	const [dismissed, setDismissed] = (0, import_react.useState)(false);
	const [menu, setMenu] = (0, import_react.useState)(false);
	const [peersOpen, setPeersOpen] = (0, import_react.useState)(false);
	const [drop, setDrop] = (0, import_react.useState)(false);
	const ref = (0, import_react.useRef)(null);
	const fileRef = (0, import_react.useRef)(null);
	const menuRef = (0, import_react.useRef)(null);
	const running = session.status === "running";
	const provider = useResolvedProvider(session.providerId);
	const peers = sessions.filter((s) => s.id !== session.id);
	const slashOpen = !running && !dismissed && value.startsWith("/") && !value.includes("\n") && !value.includes(" ");
	const matches = (0, import_react.useMemo)(() => slashOpen ? filterSlash(session.providerId, value) : [], [
		slashOpen,
		session.providerId,
		value
	]);
	const atMatch = /(?:^|\s)@([^\s]*)$/.exec(value);
	const atOpen = !running && !slashOpen && Boolean(atMatch);
	const atQuery = (atMatch?.[1] ?? "").toLowerCase();
	const atMatches = atOpen ? peers.filter((s) => {
		if (!atQuery) return true;
		return s.title.toLowerCase().includes(atQuery) || s.providerId.toLowerCase().includes(atQuery) || s.id.toLowerCase().includes(atQuery);
	}) : [];
	(0, import_react.useEffect)(() => {
		ref.current?.focus();
	}, [session.id]);
	(0, import_react.useEffect)(() => {
		setHi(0);
	}, [
		value,
		session.id,
		peersOpen
	]);
	(0, import_react.useEffect)(() => {
		if (!menu) return;
		function onDown(e) {
			if (!menuRef.current?.contains(e.target)) {
				setMenu(false);
				setPeersOpen(false);
			}
		}
		window.addEventListener("mousedown", onDown);
		return () => window.removeEventListener("mousedown", onDown);
	}, [menu]);
	function submit(text = value) {
		const t = text.trim();
		if (!t && files.length === 0 || running) return;
		const attached = files;
		setValue("");
		setFiles([]);
		setDismissed(false);
		setMenu(false);
		send(session.id, t, { attachments: attached });
	}
	function choose(cmd) {
		if (cmd.args) {
			setValue(`/${cmd.cmd} `);
			setDismissed(true);
			ref.current?.focus();
			return;
		}
		setValue("");
		send(session.id, `/${cmd.cmd}`);
	}
	function mention(peer) {
		const label = peer.providerId.charAt(0).toUpperCase() + peer.providerId.slice(1);
		const next = value.replace(/(?:^|\s)@[^\s]*$/, (m) => m.startsWith(" ") ? ` @${label} ` : `@${label} `);
		setValue(next.endsWith(" ") ? next : `${next} `);
		setDismissed(true);
		ref.current?.focus();
	}
	async function addFiles(list) {
		const next = await readAttachments(list);
		setFiles((prev) => [...prev, ...next].slice(0, 8));
	}
	const palette = slashOpen ? matches : atOpen ? atMatches : [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border-t border-border bg-surface px-3 py-3 md:px-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: fileRef,
				type: "file",
				multiple: true,
				className: "hidden",
				onChange: (e) => {
					if (e.target.files?.length) addFiles(e.target.files);
					e.target.value = "";
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				children: [
					slashOpen && matches.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						role: "listbox",
						"aria-label": "Slash commands",
						className: "absolute inset-x-0 bottom-full z-10 mb-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-window py-1 shadow-window",
						children: matches.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							role: "option",
							"aria-selected": i === hi,
							onMouseEnter: () => setHi(i),
							onClick: () => choose(c),
							className: cn("flex w-full items-baseline gap-2 px-3 py-1.5 text-left", i === hi ? "bg-muted" : "hover:bg-muted/50"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono text-xs text-foreground",
									children: [
										"/",
										c.cmd,
										c.args ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-subtle",
											children: [" ", c.args]
										}) : null
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "min-w-0 flex-1 truncate text-2xs text-muted-foreground",
									children: c.hint
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "shrink-0 text-2xs text-subtle",
									children: c.kind === "skill" ? "skill" : provider.short
								})
							]
						}, c.cmd))
					}) : null,
					atOpen && atMatches.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						role: "listbox",
						"aria-label": "Sessions on this desk",
						className: "absolute inset-x-0 bottom-full z-10 mb-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-window py-1 shadow-window",
						children: atMatches.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							role: "option",
							"aria-selected": i === hi,
							onMouseEnter: () => setHi(i),
							onClick: () => mention(p),
							className: cn("flex w-full items-center gap-2 px-3 py-2 text-left", i === hi ? "bg-muted" : "hover:bg-muted/50"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderDot, { id: p.providerId }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium",
									children: p.title
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-auto truncate text-2xs text-subtle",
									children: p.cwd
								})
							]
						}, p.id))
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						onDragOver: (e) => {
							e.preventDefault();
							setDrop(true);
						},
						onDragLeave: () => setDrop(false),
						onDrop: (e) => {
							e.preventDefault();
							setDrop(false);
							if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
						},
						className: cn("rounded-lg border border-border-strong bg-window focus-within:ring-1 focus-within:ring-ring", drop && "ring-1 ring-ring"),
						children: [
							files.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "flex flex-wrap gap-1.5 px-3 pt-2.5",
								children: files.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "size-3 shrink-0 text-muted-foreground" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "truncate font-mono text-2xs",
											children: f.name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-2xs text-subtle",
											children: prettySize(f.size)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											"aria-label": `Remove ${f.name}`,
											onClick: () => setFiles((prev) => prev.filter((x) => x.id !== f.id)),
											className: "text-subtle hover:text-foreground",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-3" })
										})
									]
								}, f.id))
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								ref,
								value,
								onChange: (e) => {
									setValue(e.target.value);
									setDismissed(false);
								},
								onPaste: (e) => {
									const pasted = e.clipboardData.files;
									if (pasted.length) {
										e.preventDefault();
										addFiles(pasted);
									}
								},
								onKeyDown: (e) => {
									if (palette.length > 0) {
										if (e.key === "ArrowDown") {
											e.preventDefault();
											setHi((n) => (n + 1) % palette.length);
											return;
										}
										if (e.key === "ArrowUp") {
											e.preventDefault();
											setHi((n) => (n - 1 + palette.length) % palette.length);
											return;
										}
										if (e.key === "Tab" || e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
											e.preventDefault();
											if (slashOpen) {
												const c = matches[hi] ?? matches[0];
												if (c) choose(c);
											} else if (atOpen) {
												const p = atMatches[hi] ?? atMatches[0];
												if (p) mention(p);
											}
											return;
										}
										if (e.key === "Escape") {
											e.preventDefault();
											setDismissed(true);
											return;
										}
									}
									if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
										e.preventDefault();
										submit();
									}
								},
								rows: 2,
								placeholder: running ? `${provider.short} is working…` : `Steer ${provider.short}…  / commands  @ a session`,
								disabled: running,
								className: "w-full resize-none bg-transparent px-3.5 pt-3 pb-1 text-sm leading-relaxed text-foreground outline-none placeholder:text-subtle disabled:opacity-60"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2 px-2 pb-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex min-w-0 items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										ref: menuRef,
										className: "relative",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "icon",
											variant: "ghost",
											"aria-label": "Add to message",
											"aria-expanded": menu,
											disabled: running,
											className: "size-11 md:size-8",
											onClick: () => {
												setMenu((v) => !v);
												setPeersOpen(false);
											},
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
										}), menu ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "absolute bottom-full left-0 z-20 mb-1 min-w-48 rounded-md border border-border bg-window py-1 shadow-window",
											children: peersOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "px-3 py-1 text-2xs text-subtle",
												children: "Message a session"
											}), peers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "px-3 py-2 text-xs text-muted-foreground",
												children: "No other sessions on this desk."
											}) : peers.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => {
													setValue((v) => `${v}${v && !v.endsWith(" ") ? " " : ""}Tell @${p.providerId} `);
													setMenu(false);
													setPeersOpen(false);
													ref.current?.focus();
												},
												className: "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderDot, { id: p.providerId }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "min-w-0 flex-1 truncate",
													children: p.title
												})]
											}, p.id))] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => {
													setMenu(false);
													fileRef.current?.click();
												},
												className: "block w-full px-3 py-2 text-left text-xs hover:bg-muted",
												children: "Attach files"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setPeersOpen(true),
												className: "block w-full px-3 py-2 text-left text-xs hover:bg-muted",
												children: "Message a session"
											})] })
										}) : null]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex min-w-0 items-center gap-1.5 px-1 text-2xs text-muted-foreground",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderDot, { id: session.providerId }),
											provider.short,
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-subtle",
												children: "·"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "truncate",
												children: session.model
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-subtle",
												children: "·"
											}),
											effortLabel(session.providerId, session.effort)
										]
									})]
								}), running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "icon",
									variant: "subtle",
									"aria-label": "Stop",
									className: "size-11 md:size-8",
									onClick: () => stop(session.id),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-3.5 fill-current" })
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "icon",
									"aria-label": "Send",
									className: "size-11 md:size-8",
									disabled: !value.trim() && files.length === 0,
									onClick: () => submit(),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { className: "size-4" })
								})]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1.5 px-1 text-2xs text-subtle",
				children: ["⌘ Enter · + files · @ a session · ", provider.authLabel]
			})
		]
	});
}
function SessionPane({ session, compact }) {
	const setActive = useHelix((s) => s.setActive);
	const setSessionModel = useHelix((s) => s.setSessionModel);
	const setSessionEffort = useHelix((s) => s.setSessionEffort);
	const provider = useResolvedProvider(session.providerId);
	const scroller = (0, import_react.useRef)(null);
	const models = modelsFor(session.providerId, provider.models);
	const efforts = effortsFor(session.providerId);
	(0, import_react.useEffect)(() => {
		const el = scroller.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
	}, [session.messages, session.status]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex min-h-0 min-w-0 flex-1 flex-col bg-window",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setActive(session.id),
					className: "flex min-w-0 flex-1 items-center gap-2 text-left",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "truncate text-sm font-medium tracking-tight",
								children: session.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLabel, { status: session.status })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-0.5 flex items-center gap-2 text-2xs text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderChip, { id: session.providerId }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1 truncate",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Folder, { className: "size-3" }), session.cwd]
							})]
						})]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex shrink-0 items-center gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "sr-only",
							htmlFor: `model-${session.id}`,
							children: "Model"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							id: `model-${session.id}`,
							value: session.model,
							onChange: (e) => setSessionModel(session.id, e.target.value),
							className: "h-8 max-w-36 truncate rounded-md border border-border bg-surface px-2 text-2xs text-foreground outline-none focus:ring-1 focus:ring-ring",
							children: [models.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: m.id,
								children: m.label
							}, m.id)), models.some((m) => m.id === session.model) ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: session.model,
								children: session.model
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "sr-only",
							htmlFor: `effort-${session.id}`,
							children: "Effort"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							id: `effort-${session.id}`,
							value: session.effort,
							onChange: (e) => setSessionEffort(session.id, e.target.value),
							title: efforts.find((e) => e.id === session.effort)?.hint,
							className: "h-8 max-w-28 truncate rounded-md border border-border bg-surface px-2 text-2xs text-foreground outline-none focus:ring-1 focus:ring-ring",
							children: efforts.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: e.id,
								children: e.label
							}, e.id))
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: scroller,
				className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5",
				children: session.messages.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptySession, {
					name: provider.short,
					cwd: session.cwd,
					model: session.model,
					effort: effortLabel(session.providerId, session.effort)
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageList, {
					messages: session.messages,
					compact
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Composer, { session })
		]
	});
}
function EmptySession({ name, cwd, model, effort }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col items-center justify-center gap-2 px-6 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-sm font-medium",
			children: [name, " is ready"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "max-w-xs text-xs text-muted-foreground",
			children: [
				model,
				" · ",
				effort,
				" · ",
				cwd,
				". Attach files with +, @ another session, or type / for commands."
			]
		})]
	});
}
function SessionCard({ session, onOpen }) {
	const clock = useHelix((s) => s.clock);
	const last = session.messages[session.messages.length - 1];
	const snippet = last ? lastSnippet(last.blocks) : "New session";
	useResolvedProvider(session.providerId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: onOpen,
		className: "group flex h-full min-h-40 flex-col overflow-hidden rounded-lg border border-border bg-surface text-left transition-opacity duration-(--motion-quick) hover:border-border-strong",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-2 border-b border-border px-3 py-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "inline-flex min-w-0 items-center gap-1.5 text-xs font-medium",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderName, { id: session.providerId }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-subtle",
						children: "·"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "truncate text-muted-foreground",
						children: session.cwd
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLabel, { status: session.status })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-h-0 flex-1 flex-col px-3 py-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "line-clamp-2 text-sm font-medium leading-snug tracking-tight",
					children: session.title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 line-clamp-4 flex-1 text-xs leading-relaxed text-muted-foreground",
					children: snippet
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex items-center justify-between text-2xs text-subtle",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						session.model,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-subtle",
							children: " · "
						}),
						effortLabel(session.providerId, session.effort),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-subtle",
							children: " · "
						}),
						relativeTime(session.updatedAt, clock)
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "opacity-0 transition-opacity duration-(--motion-quick) group-hover:opacity-100",
						children: "Open"
					})]
				})
			]
		})]
	});
}
function Mosaic() {
	const sessions = useHelix((s) => s.sessions);
	const setActive = useHelix((s) => s.setActive);
	const setNewOpen = useHelix((s) => s.setNewOpen);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 md:p-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex items-end justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-lg font-medium tracking-tight",
				children: "All agents"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 text-xs text-muted-foreground",
				children: "Every live session across connected providers. Attach files, pick a folder, and let them SendMessage each other."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-2xs tabular-nums text-subtle",
				children: [sessions.length, " open"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3",
			children: [sessions.map((ses) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionCard, {
				session: ses,
				onOpen: () => setActive(ses.id)
			}, ses.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setNewOpen(true),
				className: "flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong text-muted-foreground transition-opacity duration-(--motion-quick) hover:border-accent hover:text-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs font-medium",
					children: "New session"
				})]
			})]
		})]
	});
}
function NewSessionDialog() {
	const open = useHelix((s) => s.newOpen);
	const setNewOpen = useHelix((s) => s.setNewOpen);
	const createSession = useHelix((s) => s.createSession);
	const rememberFolder = useHelix((s) => s.rememberFolder);
	const recents = useHelix((s) => s.recentFolders);
	const providers = useAllProviders().filter((p) => p.connected);
	const [providerId, setProviderId] = (0, import_react.useState)("claude");
	const [projectId, setProjectId] = (0, import_react.useState)("harbor");
	const [cwd, setCwd] = (0, import_react.useState)("~/src/harbor");
	const [prompt, setPrompt] = (0, import_react.useState)("");
	const [model, setModel] = (0, import_react.useState)("Opus 4.7");
	const [effort, setEffort] = (0, import_react.useState)("high");
	const provider = providers.find((p) => p.id === providerId) ?? providers[0];
	const modelOpts = (0, import_react.useMemo)(() => modelsFor(provider?.id ?? "claude", provider?.models ?? []), [provider]);
	const effortOpts = (0, import_react.useMemo)(() => effortsFor(provider?.id ?? "claude"), [provider]);
	function pickProvider(id) {
		setProviderId(id);
		const p = providers.find((x) => x.id === id);
		const models = modelsFor(id, p?.models ?? []);
		setModel(p?.defaultModel ?? models[0]?.id ?? "");
		setEffort(defaultEffortFor(id));
	}
	function pickProject(id, path) {
		setProjectId(id);
		setCwd(path);
	}
	async function browse() {
		const folder = await pickDirectory();
		if (!folder) return;
		rememberFolder(folder);
		setProjectId("scratch");
		setCwd(folder.path);
	}
	function start() {
		if (!provider) return;
		createSession({
			providerId: provider.id,
			projectId,
			cwd: cwd.trim() || PROJECTS[0].path,
			prompt: prompt.trim() || "Inspect the repo and wait for a task.",
			model,
			effort
		});
		setPrompt("");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: setNewOpen,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-50 bg-background/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[min(90dvh,42rem)] w-auto max-w-md -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-window focus:outline-none",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "text-lg font-medium tracking-tight",
					children: "New session"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
					className: "mt-1 text-xs text-muted-foreground",
					children: "Pick a provider and the folder it should work in. Browse this Mac, or use a recent project."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 grid grid-cols-2 gap-2",
					children: providers.map((p) => {
						const selected = p.id === providerId;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => pickProvider(p.id),
							className: cn("rounded-lg border px-3 py-3 text-left transition-colors duration-(--motion-quick)", selected ? "border-accent bg-muted" : "border-border hover:border-border-strong"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-2 text-sm font-medium",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderDot, { id: p.id }), p.name]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "mt-1 block text-2xs text-muted-foreground",
								children: [p.authLabel, p.live ? " · live in preview" : p.builtin ? " · ACP" : " · added"]
							})]
						}, p.id);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-2xs font-medium tracking-wide text-subtle uppercase",
							children: "Model"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: model,
							onChange: (e) => setModel(e.target.value),
							className: "mt-1.5 h-9 w-full rounded-md border border-border bg-window px-2.5 text-sm outline-none focus:ring-1 focus:ring-ring",
							children: modelOpts.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: m.id,
								children: m.label
							}, m.id))
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-2xs font-medium tracking-wide text-subtle uppercase",
							children: "Effort"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: effort,
							onChange: (e) => setEffort(e.target.value),
							className: "mt-1.5 h-9 w-full rounded-md border border-border bg-window px-2.5 text-sm outline-none focus:ring-1 focus:ring-ring",
							children: effortOpts.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: e.id,
								children: e.label
							}, e.id))
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-4 block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-2xs font-medium tracking-wide text-subtle uppercase",
						children: "Folder"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1.5 flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: cwd,
							onChange: (e) => {
								setCwd(e.target.value);
								setProjectId("scratch");
							},
							spellCheck: false,
							className: "h-9 min-w-0 flex-1 rounded-md border border-border bg-window px-2.5 font-mono text-xs outline-none focus:ring-1 focus:ring-ring"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							variant: "outline",
							className: "h-9 shrink-0",
							onClick: () => void browse(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, { className: "size-3.5" }), "Browse"]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex flex-wrap gap-1.5",
					children: [PROJECTS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => pickProject(p.id, p.path),
						className: cn("rounded-full border px-2.5 py-1 text-2xs", cwd === p.path ? "border-accent bg-muted text-foreground" : "border-border text-muted-foreground hover:border-border-strong"),
						children: p.name
					}, p.id)), recents.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							setProjectId("scratch");
							setCwd(f.path);
						},
						className: cn("rounded-full border px-2.5 py-1 text-2xs", cwd === f.path ? "border-accent bg-muted text-foreground" : "border-border text-muted-foreground hover:border-border-strong"),
						children: f.name
					}, f.path))]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-3 block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-2xs font-medium tracking-wide text-subtle uppercase",
						children: "First prompt"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: prompt,
						onChange: (e) => setPrompt(e.target.value),
						rows: 3,
						placeholder: "What should this agent do?",
						className: "mt-1.5 w-full resize-none rounded-md border border-border bg-window px-3 py-2 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex justify-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						onClick: () => setNewOpen(false),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: start,
						children: "Start session"
					})]
				})
			]
		})] })
	});
}
function Onboarding() {
	const dismiss = useHelix((s) => s.dismissOnboarding);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-50 flex items-center justify-center bg-desktop p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-glow pointer-events-none absolute inset-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "noise pointer-events-none absolute inset-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-window",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HelixMark, { className: "size-8" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-4 text-xl font-medium tracking-tight",
						children: "Every coding agent. One desk."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-foreground",
									children: "See them all."
								}),
								" ",
								"Claude Code, Codex, and Cursor sessions sit in one mosaic — no more hopping windows."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-foreground",
									children: "Pick a provider."
								}),
								" ",
								"Subscription CLI or API endpoint. Each session has its own model and effort."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-foreground",
									children: "Desk bus."
								}),
								" ",
								"Sessions message each other — Claude to Codex, any provider — the same SendMessage path Claude Code and Codex use. You don’t relay."
							] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-6 h-11 w-full",
						size: "lg",
						onClick: dismiss,
						children: "Enter desk"
					})
				]
			})
		]
	});
}
function ProvidersView() {
	const resetDemo = useHelix((s) => s.resetDemo);
	const setView = useHelix((s) => s.setView);
	const custom = useHelix((s) => s.customProviders);
	const remove = useHelix((s) => s.removeCustomProvider);
	const providers = useAllProviders();
	const [addOpen, setAddOpen] = (0, import_react.useState)(false);
	const taken = new Set(custom.map((c) => c.id));
	const available = AVAILABLE_TO_ADD.filter((a) => !taken.has(a.id));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 md:p-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-2xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-end justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-medium tracking-tight",
						children: "Connections"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm leading-relaxed text-muted-foreground",
						children: "Add a provider with a subscription CLI, or with an API key against any OpenAI-compatible endpoint. WestCode is an ACP client — Claude Desktop only attaches API gateways; WestCode attaches the subscriptions themselves."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						onClick: () => setAddOpen(true),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), "Add provider"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
					className: "mt-6 space-y-3",
					children: providers.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-lg border border-border bg-surface p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-2xs text-subtle",
										children: String(i + 1).padStart(2, "0")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderDot, { id: p.id }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-sm font-medium",
										children: p.name
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-xs leading-relaxed text-muted-foreground",
								children: p.how
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex shrink-0 items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `rounded-full px-2 py-0.5 text-2xs font-medium ${p.live ? "bg-muted text-foreground" : "bg-muted text-muted-foreground"}`,
									children: p.live ? "Live" : p.auth === "api" ? "API" : "Hosted ACP"
								}), p.builtin ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "icon",
									variant: "ghost",
									"aria-label": `Remove ${p.name}`,
									onClick: () => remove(p.id),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5 text-muted-foreground" })
								})]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-2xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-subtle",
									children: "Auth"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: p.authLabel })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-subtle",
									children: "Binary"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "font-mono",
									children: p.binary
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-subtle",
									children: "Protocol"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: p.protocol })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-subtle",
									children: p.endpoint ? "Endpoint" : "Sessions"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "truncate font-mono",
									children: p.endpoint ?? p.sessionStore
								})] })
							]
						})]
					}, p.id))
				}),
				available.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-medium",
						children: "Available to add"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-2 space-y-2",
						children: available.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium",
								children: a.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-2xs text-muted-foreground",
								children: [
									a.vendor,
									a.subscription ? ` · ${a.subscription}` : "",
									a.apiHint ? ` · ${a.apiHint}` : ""
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "outline",
								onClick: () => setAddOpen(true),
								children: "Add"
							})]
						}, a.id))
					})]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 rounded-lg border border-border bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-sm font-medium",
							children: "On a Mac"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs leading-relaxed text-muted-foreground",
							children: [
								"Native WestCode spawns each binary as a subprocess and speaks JSON-RPC over stdio:",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "font-mono text-foreground",
									children: "initialize"
								}),
								",",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "font-mono text-foreground",
									children: "session/new"
								}),
								",",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "font-mono text-foreground",
									children: "session/prompt"
								}),
								". API providers POST to the endpoint you pasted. Tokens never leave this machine. This preview runs the same desk in the browser — Grok is live; other sessions are hosted ACP stand-ins so you can still drive them."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								onClick: () => setView("mosaic"),
								children: "Back to mosaic"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								onClick: resetDemo,
								children: "Reset demo sessions"
							})]
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddProviderDialog, {
			open: addOpen,
			onOpenChange: setAddOpen
		})]
	});
}
function AddProviderDialog({ open, onOpenChange }) {
	const add = useHelix((s) => s.addCustomProvider);
	const custom = useHelix((s) => s.customProviders);
	const taken = new Set(custom.map((c) => c.id));
	const presets = [...AVAILABLE_TO_ADD.filter((a) => !taken.has(a.id)), {
		id: "custom",
		name: "Custom endpoint",
		vendor: "Custom",
		subscription: "",
		apiHint: "Any OpenAI-compatible base URL",
		endpoint: "https://",
		models: ["gpt-4.1"]
	}];
	const [presetId, setPresetId] = (0, import_react.useState)("gemini");
	const preset = presets.find((p) => p.id === presetId) ?? presets[0];
	const canSub = Boolean(preset.subscription);
	const [auth, setAuth] = (0, import_react.useState)(canSub ? "subscription" : "api");
	const [name, setName] = (0, import_react.useState)(preset.name);
	const [vendor, setVendor] = (0, import_react.useState)(preset.vendor);
	const [endpoint, setEndpoint] = (0, import_react.useState)(preset.endpoint);
	const [apiKey, setApiKey] = (0, import_react.useState)("");
	const [models, setModels] = (0, import_react.useState)(preset.models.join(", "));
	function pickPreset(id) {
		const p = presets.find((x) => x.id === id);
		if (!p) return;
		setPresetId(id);
		setName(p.name);
		setVendor(p.vendor);
		setEndpoint(p.endpoint);
		setModels(p.models.join(", "));
		setAuth(p.subscription ? "subscription" : "api");
	}
	function submit() {
		const list = models.split(",").map((m) => m.trim()).filter(Boolean);
		const payload = {
			id: presetId === "custom" ? void 0 : presetId,
			name: name.trim() || preset.name,
			vendor: vendor.trim() || preset.vendor,
			auth,
			authLabel: auth === "subscription" ? preset.subscription || "CLI login" : preset.apiHint || "API key",
			endpoint: auth === "api" ? endpoint.trim() : "",
			apiKey: auth === "api" ? apiKey.trim() : "",
			models: list.length ? list : preset.models,
			defaultModel: list[0] ?? preset.models[0] ?? "default"
		};
		add(payload);
		setApiKey("");
		onOpenChange(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: (v) => {
			onOpenChange(v);
			if (v) {
				const first = presets[0];
				if (first) pickPreset(first.id);
			}
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-50 bg-background/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[min(90dvh,42rem)] w-auto max-w-md -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-window focus:outline-none",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "text-lg font-medium tracking-tight",
					children: "Add provider"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
					className: "mt-1 text-xs text-muted-foreground",
					children: "Subscription reuses the vendor CLI login — no key in WestCode. API mode stores a key in this browser and talks to the endpoint you set."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-2xs font-medium tracking-wide text-subtle uppercase",
					children: "Provider"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-1.5 grid grid-cols-1 gap-1.5",
					children: presets.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => pickPreset(p.id),
						className: cn("rounded-md border px-3 py-2 text-left text-sm", p.id === presetId ? "border-accent bg-muted" : "border-border hover:border-border-strong"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium",
							children: p.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "mt-0.5 block text-2xs text-muted-foreground",
							children: [p.vendor, p.subscription ? ` · ${p.subscription}` : " · API only"]
						})]
					}, p.id))
				}),
				canSub ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setAuth("subscription"),
						className: cn("rounded-md border px-3 py-2 text-left", auth === "subscription" ? "border-accent bg-muted" : "border-border"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-medium",
							children: "Subscription"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-0.5 block text-2xs text-muted-foreground",
							children: preset.subscription
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setAuth("api"),
						className: cn("rounded-md border px-3 py-2 text-left", auth === "api" ? "border-accent bg-muted" : "border-border"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-medium",
							children: "API"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-0.5 block text-2xs text-muted-foreground",
							children: preset.apiHint || "OpenAI-compatible"
						})]
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-xs text-muted-foreground",
					children: "This provider is API-only."
				}),
				presetId === "custom" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-3 block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-2xs font-medium tracking-wide text-subtle uppercase",
						children: "Name"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: name,
						onChange: (e) => setName(e.target.value),
						placeholder: "Groq, vLLM, LM Studio…",
						className: "mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-3 block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-2xs font-medium tracking-wide text-subtle uppercase",
						children: "Vendor"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: vendor,
						onChange: (e) => setVendor(e.target.value),
						className: "mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
					})]
				})] }) : null,
				auth === "api" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-3 block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-2xs font-medium tracking-wide text-subtle uppercase",
						children: "Endpoint"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: endpoint,
						onChange: (e) => setEndpoint(e.target.value),
						placeholder: "https://api.example.com/v1",
						className: "mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 font-mono text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-3 block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-2xs font-medium tracking-wide text-subtle uppercase",
						children: "API key"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "password",
						value: apiKey,
						onChange: (e) => setApiKey(e.target.value),
						placeholder: "Saved only in this browser",
						className: "mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 font-mono text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
					})]
				})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-xs leading-relaxed text-muted-foreground",
					children: "WestCode will spawn the local CLI and reuse its existing login. No key is stored."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-3 block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-2xs font-medium tracking-wide text-subtle uppercase",
						children: "Models"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: models,
						onChange: (e) => setModels(e.target.value),
						placeholder: "comma-separated",
						className: "mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex justify-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						onClick: () => onOpenChange(false),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: submit,
						disabled: !name.trim(),
						children: ["Add ", name.trim() || "provider"]
					})]
				})
			]
		})] })
	});
}
function Sidebar() {
	const sessions = useHelix((s) => s.sessions);
	const activeId = useHelix((s) => s.activeId);
	const view = useHelix((s) => s.view);
	const clock = useHelix((s) => s.clock);
	const enabledAddons = useHelix((s) => s.enabledAddons);
	const setActive = useHelix((s) => s.setActive);
	const setView = useHelix((s) => s.setView);
	const setNewOpen = useHelix((s) => s.setNewOpen);
	const providers = useAllProviders();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "flex h-full w-full flex-col border-r border-border bg-surface md:w-60",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex h-11 items-center justify-between px-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-2xs font-medium tracking-wide text-subtle uppercase",
					children: "Sessions"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: "ghost",
					"aria-label": "New session",
					onClick: () => setNewOpen(true),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto px-1.5 pb-3",
				children: sessions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-2 py-6 text-center text-xs text-muted-foreground",
					children: "No sessions yet"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "flex flex-col gap-0.5",
					children: sessions.map((ses) => {
						const active = ses.id === activeId && view === "focus";
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setActive(ses.id),
							className: `flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors duration-(--motion-quick) ${active ? "bg-muted" : "hover:bg-muted/50"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderDot, { id: ses.providerId }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "min-w-0 flex-1 truncate text-sm",
									children: ses.title
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center justify-between pl-4 text-2xs text-subtle",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLabel, { status: ses.status }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tabular-nums",
									children: relativeTime(ses.updatedAt, clock)
								})]
							})]
						}) }, ses.id);
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "border-t border-border p-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-2 pb-1.5 text-2xs font-medium tracking-wide text-subtle uppercase",
						children: "Providers"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "flex flex-col",
						children: providers.map((p) => {
							const count = sessions.filter((s) => s.providerId === p.id).length;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex items-center justify-between px-2 py-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-2 text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProviderDot, { id: p.id }), p.short]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-2xs tabular-nums text-subtle",
									children: p.live ? "live" : `${count}`
								})]
							}, p.id);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "ghost",
						size: "sm",
						className: view === "library" ? "mt-1 w-full justify-start bg-muted/60" : "mt-1 w-full justify-start text-muted-foreground",
						onClick: () => setView("library"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Blocks, { className: "size-3.5" }),
							"Library",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-auto text-2xs tabular-nums text-subtle",
								children: enabledAddons.length
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "ghost",
						size: "sm",
						className: view === "providers" ? "w-full justify-start bg-muted/60" : "w-full justify-start text-muted-foreground",
						onClick: () => setView("providers"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { className: "size-3.5" }), "Connections"]
					})
				]
			})
		]
	});
}
function HelixApp() {
	const view = useHelix((s) => s.view);
	const sessions = useHelix((s) => s.sessions);
	const activeId = useHelix((s) => s.activeId);
	const splitIds = useHelix((s) => s.splitIds);
	const onboarding = useHelix((s) => s.onboarding);
	const mobileNav = useHelix((s) => s.mobileNav);
	const setView = useHelix((s) => s.setView);
	const setNewOpen = useHelix((s) => s.setNewOpen);
	const setMobileNav = useHelix((s) => s.setMobileNav);
	const tick = useHelix((s) => s.tick);
	const finishCodexDemo = useHelix((s) => s.finishCodexDemo);
	const restoreOnboarding = useHelix((s) => s.restoreOnboarding);
	(0, import_react.useEffect)(() => {
		restoreOnboarding();
		const id = window.setInterval(tick, 15e3);
		const t = window.setTimeout(finishCodexDemo, 4200);
		return () => {
			window.clearInterval(id);
			window.clearTimeout(t);
		};
	}, [
		tick,
		finishCodexDemo,
		restoreOnboarding
	]);
	const active = sessions.find((s) => s.id === activeId) ?? sessions[0] ?? null;
	const left = sessions.find((s) => s.id === splitIds?.[0]) ?? sessions[0] ?? null;
	const right = sessions.find((s) => s.id === splitIds?.[1]) ?? sessions[1] ?? null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex h-dvh flex-col overflow-hidden bg-desktop text-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "desktop-glow pointer-events-none absolute inset-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "noise pointer-events-none absolute inset-0 opacity-80" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hidden md:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuBar, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "relative flex min-h-0 flex-1 flex-col items-center p-0 md:p-4 md:pt-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden rounded-none border-0 bg-window shadow-none md:rounded-xl md:border md:border-border md:shadow-window",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TitleBar, {
						view,
						onMosaic: () => setView("mosaic"),
						onSplit: () => {
							if (sessions.length >= 2) useHelix.getState().setSplit([sessions[0].id, sessions[1].id]);
						},
						onNew: () => setNewOpen(true),
						onSessions: () => setMobileNav(mobileNav === "sessions" ? "desk" : "sessions")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex min-h-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: cn("h-full w-full md:flex md:w-60 md:shrink-0", mobileNav === "sessions" ? "flex" : "hidden md:flex"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sidebar, {})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: cn("min-h-0 min-w-0 flex-1 flex-col", mobileNav === "desk" ? "flex" : "hidden md:flex"),
							children: [
								view === "mosaic" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mosaic, {}) : null,
								view === "providers" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProvidersView, {}) : null,
								view === "library" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LibraryView, {}) : null,
								view === "focus" && active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionPane, { session: active }) : null,
								view === "split" && left && right ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(qt, {
									orientation: "horizontal",
									className: "h-full min-h-0 flex-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Qt, {
											defaultSize: "50%",
											minSize: "28%",
											className: "min-h-0",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "flex h-full min-h-0 flex-col",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionPane, {
													session: left,
													compact: true
												})
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(nn, { className: "w-px bg-border" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Qt, {
											defaultSize: "50%",
											minSize: "28%",
											className: "min-h-0",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "flex h-full min-h-0 flex-col",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionPane, {
													session: right,
													compact: true
												})
											})
										})
									]
								}) : null,
								view === "focus" && !active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mosaic, {}) : null,
								view === "split" && (!left || !right) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mosaic, {}) : null
							]
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewSessionDialog, {}),
			onboarding ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Onboarding, {}) : null
		]
	});
}
function TitleBar({ view, onMosaic, onSplit, onNew, onSessions }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-11 shrink-0 items-center gap-3 border-b border-border bg-surface px-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hidden w-16 items-center gap-1.5 sm:flex",
				"aria-hidden": true,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-3 rounded-full bg-traffic-close" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-3 rounded-full bg-traffic-min" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-3 rounded-full bg-traffic-max" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 flex-1 items-center justify-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HelixMark, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm font-medium tracking-tight",
					children: "WestCode"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-0.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "ghost",
						className: "size-11 md:hidden",
						"aria-label": "Sessions",
						onClick: onSessions,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelLeft, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: view === "mosaic" ? "subtle" : "ghost",
						className: "size-11 md:size-8",
						"aria-label": "Mosaic",
						onClick: onMosaic,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutGrid, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: view === "split" ? "subtle" : "ghost",
						className: "size-11 md:size-8",
						"aria-label": "Split",
						onClick: onSplit,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Columns2, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						onClick: onNew,
						className: "hidden sm:inline-flex",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), "New"]
					})
				]
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HelixApp, {});
}
//#endregion
export { Home as component };
