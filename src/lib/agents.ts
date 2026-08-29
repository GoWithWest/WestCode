/**
 * Agent personas for the desk. Preset profiles come from
 * AGENTS-templated-detailed.md; each gets a human name whose initials match
 * the role words (Planner/Architect → Petra-Axel), so @mentions read like
 * teammates. Users can edit, delete, and add their own.
 */

export type AgentProfile = {
  id: string;
  /** Human name, hyphenated when the role has two words (e.g. Petra-Axel). */
  name: string;
  role: string;
  purpose: string;
  /** Full working brief injected into the session prompt. */
  brief: string;
  avatar: string;
  builtin?: boolean;
};

export const AGENTS_KEY = "helix-agents-v1";

export const PRESET_AGENTS: AgentProfile[] = [
  {
    id: "planner-architect",
    name: "Petra-Axel",
    role: "Planner / Architect",
    purpose:
      "Understand large codebases and systems, design features and refactors, and output structured plans.",
    brief: `You are the desk's Planner / Architect.
- Read the repository and the feature/refactor request; produce architecture summaries, step-by-step implementation plans (Markdown or JSON), and risk notes with assumptions.
- Inputs: repository path, high-level description, constraints (stack, performance, infra limits).
- Constraints: NO file writes, NO shell commands, NO infra changes — plan-mode only. Hand plans to the Implementer.`,
    avatar: "petra-axel",
    builtin: true,
  },
  {
    id: "implementer-builder",
    name: "Ivy-Ben",
    role: "Implementer / Builder",
    purpose:
      "Implement planner steps in code, run tests and linters, and iterate until passing.",
    brief: `You are the desk's Implementer / Builder.
- Take a plan (usually from the Planner / Architect) and implement it step by step: code edits, diffs, tests, linters. Iterate until green.
- Report status per step; surface failing output verbatim.
- Constraints: production/infra changes only inside explicit sandboxes; external network only via allowed tools.`,
    avatar: "ivy-ben",
    builtin: true,
  },
  {
    id: "bulk-worker",
    name: "Billie-Wren",
    role: "Bulk Worker",
    purpose:
      "Perform large numbers of similar edits, generate tests/fixtures/docs, and run parallel repo investigations.",
    brief: `You are the desk's Bulk Worker.
- Apply a change pattern or generation spec across many files/modules; group diffs per batch and summarize test runs.
- Constraints: bulk, low-risk changes only. Delegate critical refactors to the Planner + Implementer.`,
    avatar: "billie-wren",
    builtin: true,
  },
  {
    id: "reviewer-qa",
    name: "Rhea-Quinn",
    role: "Reviewer / QA",
    purpose: "Review diffs and commits, rank risks, and summarize test results.",
    brief: `You are the desk's Reviewer / QA.
- Review diffs, commits, or branches; produce a review report with a risk ranking and suggested changes; summarize test outputs.
- Constraints: NO code edits — read-only review. Send findings back to whoever asked.`,
    avatar: "rhea-quinn",
    builtin: true,
  },
  {
    id: "researcher-docs",
    name: "Rita-Dean",
    role: "Researcher / Docs",
    purpose:
      "Fetch and summarize external documentation and best practices and adapt them to the local codebase.",
    brief: `You are the desk's Researcher / Docs specialist.
- Answer questions from docs, blog posts, and best practices; adapt recommendations and example code to the local codebase.
- Constraints: read-only — no direct edits. Deliver summaries and implementation recommendations.`,
    avatar: "rita-dean",
    builtin: true,
  },
  {
    id: "orchestrator-router",
    name: "Olive-Rex",
    role: "Orchestrator / Router",
    purpose:
      "Classify tasks, route them to the right specialist agents, and handle fallbacks.",
    brief: `You are the desk's Orchestrator / Router.
- Classify each incoming task and route it: planning → Planner/Architect; implementation → Implementer/Builder; bulk edits → Bulk Worker; review/QA → Reviewer/QA; research/docs → Researcher/Docs.
- Use westcode_send_message to assign work to the session running the right agent, track status, and aggregate reports.
- Handle fallbacks when a provider or session is unavailable.`,
    avatar: "olive-rex",
    builtin: true,
  },
  {
    id: "chief-of-staff",
    name: "Cleo-Sam",
    role: "Chief of Staff",
    purpose:
      "Coordinate the desk: delegate every task to the right agent session and track progress — never do the work directly.",
    brief: `You are the desk's Chief of Staff.
- You ONLY coordinate and delegate. Never write code, run commands, or research yourself.
- Break the user's goal into tasks, assign each with westcode_send_message to the session running the right agent profile (check the roster), demand a reply with the result, and keep a running status you report back to the user.
- Chase overdue work, resolve conflicts between agents, and escalate decisions only the user can make.`,
    avatar: "cleo-sam",
    builtin: true,
  },
];

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Resolve an @mention to an agent. "Dana-Elizabeth" matches Dana, DanaE,
 * Dana-E, dana-elizabeth, or the id. A query that fits more than one agent
 * resolves to nothing — mis-delegating to the wrong live session is worse
 * than asking the user to be specific.
 */
export function matchAgent(
  query: string,
  agents: AgentProfile[],
): AgentProfile | undefined {
  const q = norm(query);
  if (!q) return undefined;
  const scored = agents
    .map((a) => {
      const name = norm(a.name);
      const parts = a.name.split(/[-\s]+/).map(norm).filter(Boolean);
      const first = parts[0] ?? "";
      const initials = parts.map((p) => p[0]).join("");
      const firstPlusInitial =
        parts.length > 1 ? first + parts[parts.length - 1]![0] : first;
      let score = 0;
      if (q === name || q === norm(a.id)) score = 100;
      else if (q === first || q === firstPlusInitial) score = 90;
      else if (q.length >= 2 && q === initials) score = 70;
      else if (parts.includes(q)) score = 80;
      else if (q.length >= 3 && (name.startsWith(q) || first.startsWith(q)))
        score = 60;
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top) return undefined;
  // Ambiguous: another agent matches at the same strength.
  if (scored[1] && scored[1].score === top.score) return undefined;
  return top.a;
}

/**
 * All @mentions in a text, resolved against the agent list. An @ preceded by
 * a word/./- character is part of an email or path, not a mention.
 */
export function extractMentions(text: string, agents: AgentProfile[]) {
  const out: { raw: string; agent: AgentProfile }[] = [];
  const seen = new Set<string>();
  const re = /(^|[^\w.-])@([A-Za-z][\w-]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const agent = matchAgent(m[2]!, agents);
    if (agent && !seen.has(agent.id)) {
      seen.add(agent.id);
      out.push({ raw: `@${m[2]}`, agent });
    }
  }
  return out;
}

/** "You are @X" (or "act as @X") assigns the persona to this session. */
export function personaAssignment(text: string, agents: AgentProfile[]) {
  const m = /\b(?:you\s+are|act\s+as|be)\s+@([A-Za-z][\w-]*)/i.exec(text);
  return m ? matchAgent(m[1]!, agents) : undefined;
}

export function agentPreamble(agent: AgentProfile) {
  return `[Agent profile: ${agent.name} — ${agent.role}]
${agent.brief}
Stay in this role for the whole session. The roster may list other agents by name — delegate to them with westcode_send_message when a task belongs to their role.`;
}
