import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { C as Blocks, S as Check, _ as Columns2, a as Terminal, b as ChevronRight, c as Settings2, d as PanelLeft, f as LayoutGrid, g as FileCode, h as FileText, i as Trash2, l as Send, m as FolderOpen, n as Users, o as Square, p as Folder, s as Shield, t as X, u as Plus, v as CircleDashed, w as ArrowUp, x as ChevronDown, y as CircleArrowUp } from "../_libs/lucide-react.mjs";
import { a as PROVIDERS_KEY, c as resolveProvider, i as projectById, n as deskPreamble, o as PROVIDER_ORDER, r as formatRoster, s as allProviders } from "./router-IgEgN721.mjs";
import { n as nn, r as qt, t as Qt } from "../_libs/react-resizable-panels.mjs";
import { t as create } from "../_libs/zustand.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { a as DialogPortal, c as Slot, i as DialogOverlay, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CgkPjziT.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function westcode() {
	return typeof window !== "undefined" ? window.westcode : void 0;
}
var MODELS = {
	claude: [
		{
			id: "opus",
			label: "Opus"
		},
		{
			id: "sonnet",
			label: "Sonnet"
		},
		{
			id: "haiku",
			label: "Haiku"
		}
	],
	codex: [
		{
			id: "gpt-5.4-codex",
			label: "GPT-5.4 Codex"
		},
		{
			id: "gpt-5.4",
			label: "GPT-5.4"
		},
		{
			id: "gpt-5.4-mini",
			label: "GPT-5.4 Mini"
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
		id: "grok-4.6",
		label: "Grok 4.6"
	}, {
		id: "grok-4.5",
		label: "Grok 4.5"
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
			hint: "Quick implementations"
		},
		{
			id: "medium",
			label: "Medium",
			hint: "Balanced"
		},
		{
			id: "high",
			label: "High",
			hint: "Default for Grok 4.6"
		},
		{
			id: "xhigh",
			label: "Extra high",
			hint: "Highest reasoning"
		}
	]
};
var DEFAULT_EFFORT = {
	claude: "high",
	codex: "medium",
	cursor: "medium",
	grok: "high"
};
var PERMISSION_MODES = [
	{
		id: "ask",
		label: "Ask",
		hint: "Approve tools as they run"
	},
	{
		id: "auto",
		label: "Auto",
		hint: "Accept edits without asking"
	},
	{
		id: "plan",
		label: "Plan",
		hint: "Read-only until a plan is approved"
	},
	{
		id: "bypass",
		label: "Bypass",
		hint: "Run tools without asking"
	}
];
function permissionLabel(mode) {
	return PERMISSION_MODES.find((m) => m.id === mode)?.label ?? mode;
}
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
			hint: "Compress conversation history",
			kind: "builtin"
		},
		{
			cmd: "always-approve",
			hint: "Skip permission prompts",
			kind: "builtin"
		},
		{
			cmd: "context",
			hint: "Context window usage",
			kind: "builtin"
		},
		{
			cmd: "plugins",
			hint: "Manage plugins",
			kind: "builtin"
		},
		{
			cmd: "session-info",
			hint: "Session details",
			kind: "builtin"
		},
		{
			cmd: "feedback",
			hint: "Send session feedback",
			kind: "builtin"
		},
		{
			cmd: "deep-research",
			args: "[topic]",
			hint: "Bounded parallel research",
			kind: "builtin"
		},
		{
			cmd: "workflow",
			args: "[name]",
			hint: "Launch or manage a workflow",
			kind: "builtin"
		},
		{
			cmd: "goal",
			args: "[text]",
			hint: "Set or check an autonomous goal",
			kind: "builtin"
		},
		{
			cmd: "loop",
			args: "[prompt]",
			hint: "Run a prompt on an interval",
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
function slashFor(id, live) {
	const catalog = isBuiltin(id) ? SLASH[id] : GENERIC_SLASH;
	const base = live && live.length ? live : catalog;
	const seen = new Set(base.map((c) => c.cmd));
	const extra = BUS_SLASH.filter((c) => !seen.has(c.cmd));
	const help = base.filter((c) => c.cmd === "help");
	const rest = base.filter((c) => c.cmd !== "help");
	if (!help.length) return [
		...rest,
		...extra,
		{
			cmd: "help",
			hint: "List commands",
			kind: "builtin"
		}
	];
	return [
		...rest,
		...extra,
		...help
	];
}
function filterSlash(id, query, live) {
	const q = query.replace(/^\//, "").toLowerCase();
	return slashFor(id, live).filter((c) => c.cmd.startsWith(q) || c.hint.toLowerCase().includes(q));
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
function modelLabel(id, model, extras = []) {
	return modelsFor(id, extras).find((m) => m.id === model)?.label ?? model;
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
	const desktop = westcode();
	if (desktop) try {
		return await desktop.pickFolder();
	} catch {
		return null;
	}
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
	const fromTools = blocks.filter((b) => b.type === "tool" && /^sendmessage$/i.test(b.name) && !/^westcode_/i.test(b.name)).map((b) => ({
		to: (b.to ?? b.path ?? "").trim(),
		text: b.content.trim()
	})).filter((s) => s.to && s.text);
	if (fromTools.length) return fromTools;
	const plain = blocksToPlain(blocks);
	const out = [];
	const xml = /<tool\s+name="SendMessage"\s+to="([^"]+)">([\s\S]*?)<\/tool>/gi;
	const fence = /westcode_send_message\s+(?:to[=:\s]+)([^\s\n]+)[\s\n]+([\s\S]+?)(?=\nwestcode_send_message|\s*$)/gi;
	const legacy = /SendMessage\s+(?:to[=:\s"]+)([a-z0-9._-]+)["']?\s*\n+([\s\S]+?)(?=\nSendMessage\s+to|\s*$)/gi;
	let m;
	for (const re of [
		xml,
		fence,
		legacy
	]) {
		re.lastIndex = 0;
		while (m = re.exec(plain)) out.push({
			to: m[1].trim(),
			text: m[2].trim()
		});
	}
	return out.filter((s) => s.to && s.text);
}
var ONBOARD_KEY = "helix-onboarding-v1";
var FOLDERS_KEY = "helix-folders-v1";
var DESK_KEY = "helix-desk-v1";
var UPDATES_KEY = "helix-cli-updates-dismissed-v1";
var MAX_HOP = 6;
var abortBySession = /* @__PURE__ */ new Map();
var hopBySession = /* @__PURE__ */ new Map();
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
function sanitizeSession(s) {
	return {
		...s,
		status: s.status === "running" ? "waiting" : s.status,
		permission: null,
		queued: void 0,
		permissionMode: s.permissionMode || "ask",
		agentSessionId: s.agentSessionId,
		messages: s.messages.map((m) => ({
			...m,
			streaming: false
		}))
	};
}
function persistDesk() {
	if (typeof window === "undefined") return;
	try {
		const { sessions, activeId, splitIds, view } = useHelix.getState();
		localStorage.setItem(DESK_KEY, JSON.stringify({
			sessions: sessions.map(sanitizeSession),
			activeId,
			splitIds,
			view
		}));
	} catch {}
}
var deskBound = false;
function deskRows(sessions, custom) {
	return sessions.map((s) => ({
		id: s.id,
		title: s.title,
		providerId: s.providerId,
		provider: resolveProvider(s.providerId, custom).short,
		cwd: s.cwd,
		model: s.model,
		status: s.status
	}));
}
function bindDeskPersist() {
	if (deskBound || typeof window === "undefined") return;
	deskBound = true;
	const push = (s) => {
		persistDesk();
		westcode()?.syncDesk?.(deskRows(s.sessions, s.customProviders));
	};
	push(useHelix.getState());
	useHelix.subscribe((s, prev) => {
		if (s.sessions !== prev.sessions || s.activeId !== prev.activeId || s.splitIds !== prev.splitIds || s.view !== prev.view) push(s);
	});
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
function addonNames(enabled, custom, kind, providerId, live = []) {
	const names = [
		...LIBRARY,
		...custom,
		...live
	].filter((a) => a.kind === kind && enabled.includes(a.id) && ((a.providers ?? []).includes(providerId) || (a.providers ?? []).includes("*") || "custom" in a && a.custom)).map((a) => a.name);
	return [...new Set(names)];
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
	if (recent.filter((e) => e.from === from && e.to === to).length >= 8) return "Desk bus rate-limited this pair.";
	if (recent.some((e) => e.from === from && e.to === to && e.hash === h)) return "Dropped a duplicate message.";
	busLog.push({
		from,
		to,
		at: now,
		hash: h
	});
	return null;
}
function applyEvent(sessionId, asstId, ev) {
	const patch = (fn) => useHelix.setState((s) => ({ sessions: patchSession(s.sessions, sessionId, fn) }));
	if (ev.type === "ready" && ev.agentSessionId) {
		patch((ses) => ({
			...ses,
			agentSessionId: ev.agentSessionId,
			updatedAt: Date.now()
		}));
		return;
	}
	if (ev.type === "commands" && ev.commands) {
		patch((ses) => ({
			...ses,
			slashCommands: ev.commands,
			updatedAt: Date.now()
		}));
		return;
	}
	if (ev.type === "models" && ev.models?.length) {
		patch((ses) => ({
			...ses,
			updatedAt: Date.now(),
			availableModels: ev.models,
			model: ev.models.some((m) => m.id === ses.model) ? ses.model : ev.models[0].id ?? ses.model
		}));
		return;
	}
	if (ev.type === "error" && ev.message) {
		patch((ses) => ({
			...ses,
			status: "error",
			permission: null,
			updatedAt: Date.now(),
			messages: ses.messages.map((m) => m.id === asstId ? {
				...m,
				streaming: false,
				blocks: m.blocks.length ? m.blocks : [{
					type: "text",
					text: ev.message
				}]
			} : m)
		}));
		return;
	}
	if (ev.type === "permission" && ev.rpcId != null) {
		patch((ses) => ({
			...ses,
			permission: {
				rpcId: ev.rpcId,
				tool: ev.tool || "tool",
				options: ev.options || []
			},
			updatedAt: Date.now()
		}));
		return;
	}
	if (ev.type === "thought" && ev.text) {
		patch((ses) => ({
			...ses,
			updatedAt: Date.now(),
			messages: ses.messages.map((m) => {
				if (m.id !== asstId) return m;
				const blocks = [...m.blocks];
				const last = blocks[blocks.length - 1];
				if (last?.type === "think") blocks[blocks.length - 1] = {
					type: "think",
					text: last.text + ev.text
				};
				else blocks.push({
					type: "think",
					text: ev.text
				});
				return {
					...m,
					blocks,
					raw: (m.raw ?? "") + ev.text,
					streaming: true
				};
			})
		}));
		return;
	}
	if (ev.type === "text" && ev.text) {
		patch((ses) => ({
			...ses,
			updatedAt: Date.now(),
			messages: ses.messages.map((m) => {
				if (m.id !== asstId) return m;
				const blocks = [...m.blocks];
				const last = blocks[blocks.length - 1];
				if (last?.type === "text") blocks[blocks.length - 1] = {
					type: "text",
					text: last.text + ev.text
				};
				else blocks.push({
					type: "text",
					text: ev.text
				});
				return {
					...m,
					blocks,
					raw: (m.raw ?? "") + ev.text,
					streaming: true
				};
			})
		}));
		return;
	}
	if (ev.type === "tool") patch((ses) => ({
		...ses,
		updatedAt: Date.now(),
		messages: ses.messages.map((m) => {
			if (m.id !== asstId) return m;
			const blocks = [...m.blocks];
			const idx = blocks.findIndex((b) => b.type === "tool" && (ev.toolId ? b.path === ev.toolId || b.name === ev.name : b.name === ev.name && b.status === "running"));
			const tool = {
				type: "tool",
				name: ev.name || "Tool",
				path: ev.path || ev.toolId,
				command: ev.command,
				content: ev.content || "",
				status: ev.status || "running"
			};
			if (idx >= 0) {
				const prev = blocks[idx];
				blocks[idx] = {
					...tool,
					content: tool.content || prev.content,
					path: tool.path || prev.path,
					command: tool.command || prev.command
				};
			} else blocks.push(tool);
			return {
				...m,
				blocks,
				streaming: true
			};
		})
	}));
}
var eventsBound = false;
function bindDesktopEvents() {
	const api = westcode();
	if (!api || eventsBound) return;
	eventsBound = true;
	api.onEvent((ev) => {
		const pending = promptAsst.get(ev.sessionId);
		if (!pending) {
			if (ev.type === "commands" || ev.type === "permission" || ev.type === "models" || ev.type === "ready") applyEvent(ev.sessionId, "", ev);
			return;
		}
		applyEvent(ev.sessionId, pending, ev);
		if (ev.type === "done" || ev.type === "error") promptAsst.delete(ev.sessionId);
	});
	api.onDeskDeliver?.((p) => {
		const deliveredTo = useHelix.getState().messageSession(p.from, p.to, p.text, { echo: false });
		api.deskDelivered?.({
			requestId: p.requestId,
			ok: Boolean(deliveredTo),
			error: deliveredTo ? void 0 : `No session matching “${p.to}”. Try westcode_list_sessions.`,
			deliveredTo: deliveredTo || void 0
		});
	});
}
var promptAsst = /* @__PURE__ */ new Map();
var useHelix = create((set, get) => ({
	sessions: [],
	activeId: null,
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
	cliStatus: [],
	cliUpdates: [],
	updateBusy: null,
	liveAddons: [],
	libraryStatus: "idle",
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
		bindDesktopEvents();
		const seen = localStorage.getItem(ONBOARD_KEY);
		const lib = readJson(LIBRARY_KEY, {});
		const prov = readJson(PROVIDERS_KEY, []);
		const folders = readJson(FOLDERS_KEY, []);
		const desk = readJson(DESK_KEY, {});
		const saved = Array.isArray(desk.sessions) ? desk.sessions.map(sanitizeSession) : [];
		const live = get().sessions;
		const sessions = live.length ? live : saved;
		set({
			onboarding: seen !== "1",
			enabledAddons: lib.enabled ?? DEFAULT_ENABLED,
			customAddons: Array.isArray(lib.custom) ? lib.custom : [],
			customProviders: Array.isArray(prov) ? prov : [],
			recentFolders: Array.isArray(folders) ? folders : [],
			...live.length ? {} : {
				sessions,
				activeId: desk.activeId ?? sessions[0]?.id ?? null,
				splitIds: desk.splitIds ?? null,
				view: desk.view ?? (sessions.length ? "focus" : "mosaic")
			}
		});
		bindDeskPersist();
		get().refreshCli();
		get().refreshLibrary();
		get().refreshUpdates();
	},
	refreshCli: async () => {
		const api = westcode();
		if (!api) return;
		try {
			set({ cliStatus: await api.probe() });
		} catch {}
	},
	refreshUpdates: async () => {
		const api = westcode();
		if (!api?.updates) return;
		try {
			const all = await api.updates();
			const dismissed = readJson(UPDATES_KEY, []);
			set({ cliUpdates: all.filter((u) => !dismissed.includes(`${u.id}@${u.latest}`)) });
		} catch {}
	},
	applyCliUpdate: async (id) => {
		const api = westcode();
		if (!api?.updateCli || get().updateBusy) return;
		set({ updateBusy: id });
		try {
			if ((await api.updateCli(id)).ok) {
				set((s) => ({ cliUpdates: s.cliUpdates.filter((u) => u.id !== id) }));
				get().refreshCli();
			}
		} finally {
			set({ updateBusy: null });
		}
	},
	dismissCliUpdate: (id) => {
		const u = get().cliUpdates.find((x) => x.id === id);
		if (u) {
			const dismissed = readJson(UPDATES_KEY, []);
			try {
				localStorage.setItem(UPDATES_KEY, JSON.stringify([...dismissed, `${u.id}@${u.latest}`].slice(-12)));
			} catch {}
		}
		set((s) => ({ cliUpdates: s.cliUpdates.filter((x) => x.id !== id) }));
	},
	refreshLibrary: async () => {
		const api = westcode();
		if (!api) return;
		if (get().libraryStatus === "loading") return;
		const had = get().liveAddons;
		set({ libraryStatus: "loading" });
		try {
			set({
				liveAddons: (await Promise.all(PROVIDER_ORDER.map((id) => api.library(id)))).flat().map((a) => ({
					...a,
					summary: (a.summary || "").slice(0, 180)
				})),
				libraryStatus: "ready"
			});
		} catch {
			set({
				liveAddons: had,
				libraryStatus: "ready"
			});
		}
	},
	answerPermission: (sessionId, optionId) => {
		const rpcId = get().sessions.find((s) => s.id === sessionId)?.permission?.rpcId;
		set((s) => ({ sessions: patchSession(s.sessions, sessionId, (x) => ({
			...x,
			permission: null
		})) }));
		if (rpcId == null) return;
		westcode()?.permission({
			sessionId,
			rpcId,
			optionId
		});
	},
	dismissOnboarding: () => {
		try {
			localStorage.setItem(ONBOARD_KEY, "1");
		} catch {}
		set({ onboarding: false });
	},
	resetDemo: () => {
		set({
			sessions: [],
			activeId: null,
			splitIds: null,
			view: "mosaic"
		});
		persistDesk();
	},
	finishCodexDemo: () => {},
	rememberFolder: (folder) => {
		const next = [folder, ...get().recentFolders.filter((f) => f.path !== folder.path)].slice(0, 6);
		persistFolders(next);
		set({ recentFolders: next });
	},
	createSession: ({ providerId, projectId, title, prompt, model, effort, permissionMode, cwd, attachments }) => {
		const p = resolveProvider(providerId, get().customProviders);
		const project = projectById(projectId);
		const path = cwd?.trim() || project.path;
		const folderName = path.split("/").filter(Boolean).pop() || "session";
		const session = {
			id: uid("ses"),
			title: title?.trim() || folderName,
			providerId,
			projectId,
			cwd: path,
			model: model ?? p.defaultModel,
			effort: effort ?? defaultEffortFor(providerId),
			permissionMode: permissionMode || "ask",
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
		if (prompt?.trim() || attachments?.length) get().send(session.id, prompt ?? "", { attachments });
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
	setSessionPermissionMode: (sessionId, mode) => {
		set((state) => ({ sessions: patchSession(state.sessions, sessionId, (s) => ({
			...s,
			permissionMode: mode,
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
		westcode()?.cancel(sessionId);
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
		const deliveredTo = `${resolveProvider(target.providerId, state.customProviders).short} · ${target.title}`;
		const hop = (hopBySession.get(fromId) ?? 0) + 1;
		const blocked = busAllowed(fromId, target.id, text, hop);
		if (blocked) {
			set((s) => ({ sessions: patchSession(s.sessions, fromId, (ses) => ({
				...ses,
				messages: [...ses.messages, systemNote(blocked)],
				updatedAt: Date.now()
			})) }));
			return false;
		}
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
					to: deliveredTo,
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
		return deliveredTo;
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
		const replay = Boolean(opts?.replay);
		const outgoing = replay ? trimmed : formatOutgoing(trimmed, attachments);
		if (session.status === "running" && !replay) {
			const hop = opts?.incoming?.hop ?? 0;
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
			set((s) => ({ sessions: patchSession(s.sessions, sessionId, (ses) => ({
				...ses,
				updatedAt: Date.now(),
				queued: [...ses.queued ?? [], {
					text: outgoing,
					incoming: opts?.incoming
				}].slice(0, 8),
				messages: [...ses.messages, userMsg]
			})) }));
			return;
		}
		abortBySession.get(sessionId)?.abort();
		const ac = new AbortController();
		abortBySession.set(sessionId, ac);
		const hop = opts?.incoming?.hop ?? 0;
		hopBySession.set(sessionId, hop);
		const userMsg = replay ? null : opts?.incoming ? {
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
			status: "running",
			updatedAt: Date.now(),
			turns: ses.turns + 1,
			messages: userMsg ? [
				...ses.messages,
				userMsg,
				asstMsg
			] : [...ses.messages, asstMsg]
		})) }));
		const latest = get().sessions.find((s) => s.id === sessionId);
		if (!latest) return;
		const provider = resolveProvider(latest.providerId, get().customProviders);
		const roster = rosterFor(get().sessions, sessionId, get().customProviders);
		const bus = deskPreamble(sessionId, latest.providerId, roster, {
			skills: addonNames(get().enabledAddons, get().customAddons, "skill", latest.providerId, get().liveAddons),
			connectors: addonNames(get().enabledAddons, get().customAddons, "connector", latest.providerId, get().liveAddons)
		});
		const promptText = opts?.incoming ? `${bus}\n[Peer agent: ${resolveProvider(opts.incoming.fromProviderId, get().customProviders).short} · ${opts.incoming.fromTitle} · session ${opts.incoming.fromSessionId}]\nIncoming message from another WestCode session. Act on it now. When you finish (or if you are blocked), you MUST call westcode_send_message with to="${opts.incoming.fromSessionId}" and a short result — the sender is waiting for your reply.\n\n${outgoing}` : `${bus}\n${outgoing}`;
		const api = westcode();
		if (!api) {
			set((s) => ({ sessions: patchSession(s.sessions, sessionId, (ses) => ({
				...ses,
				status: "error",
				messages: ses.messages.map((m) => m.id === asstId ? {
					...m,
					streaming: false,
					blocks: [{
						type: "text",
						text: "WestCode hosts Claude, Grok, and Codex as local CLIs. Run `npm run app` (the Mac desktop shell) — the browser preview cannot spawn those binaries."
					}]
				} : m)
			})) }));
			abortBySession.delete(sessionId);
			return;
		}
		promptAsst.set(sessionId, asstId);
		try {
			const history = latest.messages.filter((m) => m.id !== asstId && (m.role === "user" || m.role === "assistant" || m.role === "agent")).slice(-16).map((m) => ({
				role: m.role,
				text: blocksToPlain(m.blocks).slice(0, 1500)
			})).filter((m) => m.text.trim());
			const res = await api.prompt({
				sessionId,
				providerId: latest.providerId,
				cwd: latest.cwd,
				model: latest.model,
				effort: latest.effort,
				permissionMode: latest.permissionMode,
				agentSessionId: latest.agentSessionId,
				history,
				text: promptText
			});
			if (!res.ok) throw new Error(res.error || `${provider.name} failed`);
			set((s) => ({ sessions: patchSession(s.sessions, sessionId, (ses) => ({
				...ses,
				status: "waiting",
				updatedAt: Date.now(),
				messages: ses.messages.map((m) => m.id === asstId ? {
					...m,
					streaming: false
				} : m)
			})) }));
			const asst = get().sessions.find((x) => x.id === sessionId)?.messages.find((m) => m.id === asstId);
			if (asst) for (const msg of extractSendMessages(asst.blocks)) get().messageSession(sessionId, msg.to, msg.text, { echo: true });
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
			promptAsst.delete(sessionId);
			abortBySession.delete(sessionId);
			const next = get().sessions.find((x) => x.id === sessionId)?.queued?.[0];
			if (next) {
				set((s) => ({ sessions: patchSession(s.sessions, sessionId, (x) => ({
					...x,
					queued: (x.queued ?? []).slice(1)
				})) }));
				queueMicrotask(() => {
					get().send(sessionId, next.text, {
						incoming: next.incoming,
						replay: true
					});
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
	const known = slashFor(session.providerId, session.slashCommands);
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
		westcode()?.stopSession(sessionId);
		set((s) => ({ sessions: patchSession(s.sessions, sessionId, (ses) => ({
			...ses,
			messages: [systemNote("Conversation cleared.")],
			turns: 0,
			updatedAt: Date.now(),
			status: "idle",
			permission: null,
			slashCommands: void 0
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: "/westcode-icon.png",
		alt: "",
		className: cn("rounded-[3px] object-cover", className),
		"aria-hidden": true
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
	const cli = useHelix((s) => s.cliStatus);
	return allProviders(custom).map((p) => {
		const hit = cli.find((c) => c.id === p.id);
		if (!hit) return {
			...p,
			connected: false,
			live: false
		};
		return {
			...p,
			connected: hit.connected,
			live: Boolean(hit.found && hit.loggedIn),
			how: hit.found ? p.how : `${p.how} Missing binary — ${hit.install}`
		};
	});
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
	const live = useHelix((s) => s.liveAddons);
	const libraryStatus = useHelix((s) => s.libraryStatus);
	const refreshLibrary = useHelix((s) => s.refreshLibrary);
	const [tab, setTab] = (0, import_react.useState)("skill");
	const [query, setQuery] = (0, import_react.useState)("");
	const [importOpen, setImportOpen] = (0, import_react.useState)(false);
	const [filter, setFilter] = (0, import_react.useState)("all");
	(0, import_react.useEffect)(() => {
		if (libraryStatus === "idle") refreshLibrary();
	}, [libraryStatus, refreshLibrary]);
	const items = (0, import_react.useMemo)(() => {
		const fromCli = live.map((a) => ({
			id: a.id,
			kind: a.kind,
			name: a.name,
			source: a.source,
			repo: a.source,
			summary: a.summary,
			providers: a.providers,
			install: ""
		}));
		const canned = LIBRARY.filter((a) => (a.providers ?? []).some((p) => p === "*" || PROVIDER_ORDER.includes(p)));
		const seen = /* @__PURE__ */ new Set();
		const all = [
			...fromCli,
			...custom,
			...canned
		].filter((a) => {
			const key = `${a.kind}:${a.name.toLowerCase()}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		}).filter((a) => a.kind === tab);
		const scoped = filter === "all" ? all : all.filter((a) => (a.providers ?? []).includes(filter) || (a.providers ?? []).includes("*"));
		const q = query.trim().toLowerCase();
		if (!q) return scoped;
		return scoped.filter((a) => a.name.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.repo.toLowerCase().includes(q) || a.source.toLowerCase().includes(q));
	}, [
		tab,
		query,
		custom,
		live,
		filter
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
						children: "Skills, plugins, and MCP connectors belong to each CLI (~/.claude, ~/.grok, ~/.codex). Enable what that provider already installed; WestCode does not keep a separate catalog."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						onClick: () => setImportOpen(true),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), "Import"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5 flex flex-wrap items-center gap-1.5",
					children: ["all", ...PROVIDER_ORDER].map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setFilter(id),
						className: cn("h-8 rounded-md px-3 text-xs font-medium", filter === id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"),
						children: id === "all" ? "All" : id[0].toUpperCase() + id.slice(1)
					}, id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex flex-wrap items-center gap-1.5",
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
						children: libraryStatus === "loading" ? "Reading skills from the CLIs…" : "Nothing matches. Import your own, or clear the filter."
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
var drafts = /* @__PURE__ */ new Map();
function Composer({ session }) {
	const send = useHelix((s) => s.send);
	const stop = useHelix((s) => s.stop);
	const setSessionModel = useHelix((s) => s.setSessionModel);
	const setSessionEffort = useHelix((s) => s.setSessionEffort);
	const setSessionPermissionMode = useHelix((s) => s.setSessionPermissionMode);
	const sessions = useHelix((s) => s.sessions);
	const saved = drafts.get(session.id);
	const [value, setValue] = (0, import_react.useState)(saved?.text ?? "");
	const [files, setFiles] = (0, import_react.useState)(saved?.files ?? []);
	const [hi, setHi] = (0, import_react.useState)(0);
	const [dismissed, setDismissed] = (0, import_react.useState)(false);
	const [menu, setMenu] = (0, import_react.useState)(false);
	const [peersOpen, setPeersOpen] = (0, import_react.useState)(false);
	const [panel, setPanel] = (0, import_react.useState)(null);
	const [drop, setDrop] = (0, import_react.useState)(false);
	const ref = (0, import_react.useRef)(null);
	const fileRef = (0, import_react.useRef)(null);
	const menuRef = (0, import_react.useRef)(null);
	const metaRef = (0, import_react.useRef)(null);
	const running = session.status === "running";
	const queued = session.queued?.length ?? 0;
	const provider = useResolvedProvider(session.providerId);
	const peers = sessions.filter((s) => s.id !== session.id);
	const models = session.availableModels?.length ? session.availableModels : modelsFor(session.providerId, provider.models);
	const efforts = effortsFor(session.providerId);
	const effortIdx = Math.max(0, efforts.findIndex((e) => e.id === session.effort));
	const slashOpen = !dismissed && value.startsWith("/") && !value.includes("\n") && !value.includes(" ");
	const matches = (0, import_react.useMemo)(() => slashOpen ? filterSlash(session.providerId, value, session.slashCommands) : [], [
		slashOpen,
		session.providerId,
		session.slashCommands,
		value
	]);
	const atMatch = /(?:^|\s)@([^\s]*)$/.exec(value);
	const atOpen = !slashOpen && Boolean(atMatch);
	const atQuery = (atMatch?.[1] ?? "").toLowerCase();
	const atMatches = atOpen ? peers.filter((s) => {
		if (!atQuery) return true;
		return s.title.toLowerCase().includes(atQuery) || s.providerId.toLowerCase().includes(atQuery) || s.id.toLowerCase().includes(atQuery);
	}) : [];
	const draftRef = (0, import_react.useRef)({
		value,
		files
	});
	draftRef.current = {
		value,
		files
	};
	(0, import_react.useEffect)(() => {
		ref.current?.focus();
		return () => {
			const { value: text, files: attached } = draftRef.current;
			if (text.trim() || attached.length) drafts.set(session.id, {
				text,
				files: attached
			});
			else drafts.delete(session.id);
		};
	}, [session.id]);
	(0, import_react.useEffect)(() => {
		setHi(0);
	}, [
		value,
		session.id,
		peersOpen
	]);
	(0, import_react.useEffect)(() => {
		function onDown(e) {
			const t = e.target;
			if (menu && !menuRef.current?.contains(t)) {
				setMenu(false);
				setPeersOpen(false);
			}
			if (panel && !metaRef.current?.contains(t)) setPanel(null);
		}
		window.addEventListener("mousedown", onDown);
		return () => window.removeEventListener("mousedown", onDown);
	}, [menu, panel]);
	function submit(text = value) {
		const t = text.trim();
		if (!t && files.length === 0) return;
		const attached = files;
		setValue("");
		setFiles([]);
		setDismissed(false);
		setMenu(false);
		setPanel(null);
		drafts.delete(session.id);
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
	const canSend = Boolean(value.trim() || files.length);
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
									if (e.nativeEvent.isComposing) return;
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
										if (e.key === "Tab" || e.key === "Enter" && !e.shiftKey) {
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
									if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
										e.preventDefault();
										submit();
									}
								},
								rows: 2,
								placeholder: running ? `Queue a follow-up for ${provider.short}…` : `Message ${provider.short}…  / commands  @ a session`,
								className: "w-full resize-none bg-transparent px-3.5 pt-3 pb-1 text-sm leading-relaxed text-foreground outline-none placeholder:text-subtle"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2 px-2 pb-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex min-w-0 items-center gap-0.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										ref: menuRef,
										className: "relative",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "icon",
											variant: "ghost",
											"aria-label": "Add to message",
											"aria-expanded": menu,
											className: "size-11 md:size-8",
											onClick: () => {
												setMenu((v) => !v);
												setPeersOpen(false);
												setPanel(null);
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
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										ref: metaRef,
										className: "flex min-w-0 items-center gap-0.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetaButton, {
												open: panel === "mode",
												onToggle: () => setPanel(panel === "mode" ? null : "mode"),
												label: permissionLabel(session.permissionMode || "ask"),
												icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-3" }),
												children: PERMISSION_MODES.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: () => {
														setSessionPermissionMode(session.id, m.id);
														setPanel(null);
													},
													className: cn("block w-full px-3 py-2 text-left hover:bg-muted", m.id === (session.permissionMode || "ask") && "bg-muted"),
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "block text-xs font-medium",
														children: m.label
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "block text-2xs text-muted-foreground",
														children: m.hint
													})]
												}, m.id))
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetaButton, {
												open: panel === "model",
												onToggle: () => setPanel(panel === "model" ? null : "model"),
												label: modelLabel(session.providerId, session.model, provider.models),
												children: models.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => {
														setSessionModel(session.id, m.id);
														setPanel(null);
													},
													className: cn("block w-full truncate px-3 py-2 text-left text-xs hover:bg-muted", m.id === session.model && "bg-muted font-medium"),
													children: m.label
												}, m.id))
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetaButton, {
												open: panel === "effort",
												onToggle: () => setPanel(panel === "effort" ? null : "effort"),
												label: effortLabel(session.providerId, session.effort),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "px-3 py-3",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "text-xs font-medium",
															children: efforts[effortIdx]?.label ?? session.effort
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "mt-0.5 text-2xs text-muted-foreground",
															children: efforts[effortIdx]?.hint
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
															type: "range",
															min: 0,
															max: Math.max(0, efforts.length - 1),
															step: 1,
															value: effortIdx,
															onChange: (e) => {
																const next = efforts[Number(e.target.value)];
																if (next) setSessionEffort(session.id, next.id);
															},
															className: "mt-3 w-full",
															style: { accentColor: "var(--color-accent)" }
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "mt-1 flex justify-between text-2xs text-subtle",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: efforts[0]?.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: efforts[efforts.length - 1]?.label })]
														})
													]
												})
											})
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex shrink-0 items-center gap-1",
									children: [
										queued > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-2xs text-subtle",
											children: [queued, " queued"]
										}) : null,
										running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "icon",
											variant: "subtle",
											"aria-label": "Stop",
											className: "size-11 md:size-8",
											onClick: () => stop(session.id),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-3.5 fill-current" })
										}) : null,
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "icon",
											"aria-label": running ? "Queue" : "Send",
											className: "size-11 md:size-8",
											disabled: !canSend,
											onClick: () => submit(),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { className: "size-4" })
										})
									]
								})]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1.5 px-1 text-2xs text-subtle",
				children: ["Enter to send · Shift Enter for a new line · ", provider.authLabel]
			})
		]
	});
}
function MetaButton({ open, onToggle, label, icon, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: onToggle,
			className: cn("inline-flex h-8 max-w-36 items-center gap-1 rounded-md px-1.5 text-2xs text-muted-foreground hover:bg-muted hover:text-foreground", open && "bg-muted text-foreground"),
			children: [
				icon,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "truncate",
					children: label
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-3 shrink-0 opacity-70" })
			]
		}), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "absolute bottom-full left-0 z-20 mb-1 min-w-48 overflow-hidden rounded-md border border-border bg-window py-1 shadow-window",
			children
		}) : null]
	});
}
function SessionPane({ session, compact }) {
	const setActive = useHelix((s) => s.setActive);
	const provider = useResolvedProvider(session.providerId);
	const scroller = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const el = scroller.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
	}, [session.messages, session.status]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex min-h-0 min-w-0 flex-1 flex-col bg-window",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
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
				})
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
			session.permission ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "border-t border-border bg-surface px-3 py-3 md:px-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs font-medium",
					children: [
						provider.short,
						" wants to run ",
						session.permission.tool
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 flex flex-wrap gap-2",
					children: (session.permission.options.length ? session.permission.options : [
						{
							optionId: "allow-once",
							name: "Allow once"
						},
						{
							optionId: "allow-always",
							name: "Allow always"
						},
						{
							optionId: "reject",
							name: "Reject"
						}
					]).map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: (opt.kind || opt.optionId || "").toLowerCase().includes("reject") ? "ghost" : "default",
						onClick: () => useHelix.getState().answerPermission(session.id, opt.optionId || "allow-once"),
						children: opt.name || opt.optionId
					}, opt.optionId || opt.name))
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Composer, { session }, session.id)
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
				children: "Every live session across Claude, Grok, and Codex. Each pane is that CLI — pick a folder and let them message each other."
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
	const allProviders = useAllProviders();
	const providers = allProviders.filter((p) => p.connected);
	const list = providers.length ? providers : allProviders;
	const [providerId, setProviderId] = (0, import_react.useState)(list[0]?.id ?? "grok");
	const [projectId, setProjectId] = (0, import_react.useState)("scratch");
	const [cwd, setCwd] = (0, import_react.useState)("");
	const [title, setTitle] = (0, import_react.useState)("");
	const [model, setModel] = (0, import_react.useState)(list[0]?.defaultModel ?? "grok-4.6");
	const [effort, setEffort] = (0, import_react.useState)(defaultEffortFor(list[0]?.id ?? "grok"));
	const provider = list.find((p) => p.id === providerId) ?? list[0];
	const modelOpts = (0, import_react.useMemo)(() => modelsFor(provider?.id ?? "claude", provider?.models ?? []), [provider]);
	const effortOpts = (0, import_react.useMemo)(() => effortsFor(provider?.id ?? "claude"), [provider]);
	function pickProvider(id) {
		setProviderId(id);
		const p = list.find((x) => x.id === id);
		const models = modelsFor(id, p?.models ?? []);
		setModel(p?.defaultModel ?? models[0]?.id ?? "");
		setEffort(defaultEffortFor(id));
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
		if (!cwd.trim()) return;
		createSession({
			providerId: provider.id,
			projectId,
			cwd: cwd.trim(),
			title: title.trim(),
			model,
			effort
		});
		setTitle("");
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
					children: list.map((p) => {
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
								children: [p.authLabel, p.connected ? " · ready" : " · install CLI"]
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
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 flex flex-wrap gap-1.5",
					children: recents.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							setProjectId("scratch");
							setCwd(f.path);
						},
						className: cn("rounded-full border px-2.5 py-1 text-2xs", cwd === f.path ? "border-accent bg-muted text-foreground" : "border-border text-muted-foreground hover:border-border-strong"),
						children: f.name
					}, f.path))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-3 block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-2xs font-medium tracking-wide text-subtle uppercase",
						children: "Session name"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: title,
						onChange: (e) => setTitle(e.target.value),
						onKeyDown: (e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								start();
							}
						},
						placeholder: "Optional — defaults to the folder name",
						className: "mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
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
						disabled: !cwd.trim() || !provider,
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
		className: "fixed inset-0 z-50 flex items-center justify-center bg-window p-4",
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
								"Claude Code, Codex, and Grok sessions sit in one mosaic — no more hopping windows."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-foreground",
									children: "Use your logins."
								}),
								" ",
								"Claude Code, Grok Build, and Codex keep their own auth. WestCode only embeds those CLIs."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-foreground",
									children: "Desk bus."
								}),
								" ",
								"Sessions can message each other — Claude to Codex, any provider on this desk. You don’t relay."
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
	const setView = useHelix((s) => s.setView);
	const setNewOpen = useHelix((s) => s.setNewOpen);
	const refreshCli = useHelix((s) => s.refreshCli);
	const cli = useHelix((s) => s.cliStatus);
	const providers = useAllProviders();
	const [busy, setBusy] = (0, import_react.useState)(null);
	const api = westcode();
	async function login(id) {
		if (!api) return;
		setBusy(id);
		try {
			await api.login(id);
			await refreshCli();
		} finally {
			setBusy(null);
		}
	}
	async function logout(id) {
		if (!api) return;
		setBusy(id);
		try {
			await api.logout(id);
			await refreshCli();
		} finally {
			setBusy(null);
		}
	}
	async function install(id) {
		if (!api?.installCli) return;
		setBusy(id);
		try {
			await api.installCli(id);
			await refreshCli();
		} finally {
			setBusy(null);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 md:p-8",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-2xl",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-medium tracking-tight",
					children: "Connections"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm leading-relaxed text-muted-foreground",
					children: "WestCode embeds the CLIs already on this Mac. Sign in with Claude Code, Grok Build, or Codex — auth stays in those tools."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "subtle",
					onClick: () => void refreshCli(),
					children: "Recheck"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-6 space-y-3",
				children: providers.map((p, i) => {
					const probe = cli.find((c) => c.id === p.id);
					const found = probe?.found ?? false;
					const loggedIn = probe?.loggedIn;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-lg border border-border bg-surface p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-2 text-xs leading-relaxed text-muted-foreground",
										children: p.how
									}),
									probe?.install && !found ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("pre", {
										className: "mt-3 overflow-x-auto rounded-md bg-window px-3 py-2 font-mono text-2xs text-foreground",
										children: [probe.install, probe.installAlt ? `\n# or ${probe.installAlt}` : ""]
									}) : null
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: cn("shrink-0 rounded-full px-2 py-0.5 text-2xs font-medium", loggedIn ? "bg-muted text-foreground" : found ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"),
									children: !found ? "Not installed" : loggedIn ? "Connected" : loggedIn === false ? "Sign in" : "Installed"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
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
										children: probe?.path ?? p.binary
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-subtle",
										children: "Protocol"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: p.protocol })] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-subtle",
										children: "Sessions"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
										className: "truncate font-mono",
										children: p.sessionStore
									})] })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 flex flex-wrap gap-2",
								children: found ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										disabled: busy === p.id,
										onClick: () => void login(p.id),
										children: loggedIn ? "Re-login" : "Login"
									}),
									loggedIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "ghost",
										disabled: busy === p.id,
										onClick: () => void logout(p.id),
										children: "Logout"
									}) : null,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "ghost",
										onClick: () => {
											setView("mosaic");
											setNewOpen(true);
										},
										children: "New session"
									})
								] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "sm",
									disabled: busy === p.id,
									onClick: () => void install(p.id),
									children: busy === p.id ? "Installing…" : "Install"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-2xs text-muted-foreground",
									children: "WestCode installs and manages this CLI for you — or install it yourself in Terminal, then Recheck."
								})] })
							})
						]
					}, p.id);
				})
			})]
		})
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
function UpdateBanner() {
	const updates = useHelix((s) => s.cliUpdates);
	const busy = useHelix((s) => s.updateBusy);
	const apply = useHelix((s) => s.applyCliUpdate);
	const dismiss = useHelix((s) => s.dismissCliUpdate);
	const next = updates[0];
	if (!next) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleArrowUp, { className: "size-4 shrink-0 text-muted-foreground" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "min-w-0 flex-1 truncate text-xs text-muted-foreground",
				children: [
					"New ",
					next.name,
					" CLI available (",
					next.current,
					" → ",
					next.latest,
					")."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				disabled: busy === next.id,
				onClick: () => void apply(next.id),
				children: busy === next.id ? "Updating…" : "Update"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				variant: "ghost",
				disabled: busy === next.id,
				onClick: () => dismiss(next.id),
				children: "Later"
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
	const restoreOnboarding = useHelix((s) => s.restoreOnboarding);
	(0, import_react.useEffect)(() => {
		restoreOnboarding();
		const id = window.setInterval(tick, 15e3);
		const offMenu = westcode()?.onMenu?.((action) => {
			const state = useHelix.getState();
			if (action === "new") state.setNewOpen(true);
			else if (action === "mosaic") state.setView("mosaic");
			else if (action === "library") state.setView("library");
			else if (action === "providers") state.setView("providers");
			else if (action === "focus") {
				const id = state.activeId ?? state.sessions[0]?.id;
				if (id) state.setActive(id);
			} else if (action === "split" && state.sessions.length >= 2) state.setSplit([state.sessions[0].id, state.sessions[1].id]);
		});
		return () => {
			window.clearInterval(id);
			offMenu?.();
		};
	}, [tick, restoreOnboarding]);
	const active = sessions.find((s) => s.id === activeId) ?? sessions[0] ?? null;
	const left = sessions.find((s) => s.id === splitIds?.[0]) ?? sessions[0] ?? null;
	const right = sessions.find((s) => s.id === splitIds?.[1]) ?? sessions[1] ?? null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex h-dvh flex-col overflow-hidden bg-window text-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TitleBar, {
				view,
				onMosaic: () => setView("mosaic"),
				onSplit: () => {
					if (sessions.length >= 2) useHelix.getState().setSplit([sessions[0].id, sessions[1].id]);
				},
				onNew: () => setNewOpen(true),
				onSessions: () => setMobileNav(mobileNav === "sessions" ? "desk" : "sessions")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UpdateBanner, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewSessionDialog, {}),
			onboarding ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Onboarding, {}) : null
		]
	});
}
function TitleBar({ view, onMosaic, onSplit, onNew, onSessions }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "titlebar flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-3 [-webkit-app-region:drag]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hidden w-[72px] shrink-0 items-center gap-1.5 sm:flex",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "traffic-lights flex items-center gap-1.5 [-webkit-app-region:no-drag]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Close",
							className: "size-3 rounded-full bg-traffic-close",
							onClick: () => westcode()?.window.close()
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Minimize",
							className: "size-3 rounded-full bg-traffic-min",
							onClick: () => westcode()?.window.minimize()
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Zoom",
							className: "size-3 rounded-full bg-traffic-max",
							onClick: () => westcode()?.window.maximize()
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 flex-1 items-center justify-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HelixMark, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm font-medium tracking-tight",
					children: "WestCode"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-0.5 [-webkit-app-region:no-drag]",
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
