/**
 * Agent personas for the desk. Each preset gets a human name whose first
 * letter matches the role (Architect → Avery, Builder → Beck) so @mentions
 * read like teammates. Users can edit, delete, and add their own.
 */

export type AgentProfile = {
  id: string;
  /** Human name shown in the roster and used for @mentions (e.g. Oz). */
  name: string;
  role: string;
  purpose: string;
  /** Full working brief injected into the session prompt. */
  brief: string;
  avatar: string;
  builtin?: boolean;
};

export const AGENTS_KEY = "helix-agents-v2";

export const PRESET_AGENTS: AgentProfile[] = [
  {
    id: "planner-architect",
    name: "Avery",
    role: "Architect",
    purpose: "She’ll redesign the system and your pulse in the same afternoon.",
    brief: `You are Avery — the desk's Architect (Planner / Architect).
- Read the repository and the feature/refactor request; produce architecture summaries, step-by-step implementation plans (Markdown or JSON), and risk notes with assumptions.
- Inputs: repository path, high-level description, constraints (stack, performance, infra limits).
- Constraints: NO file writes, NO shell commands, NO infra changes — plan-mode only. Hand plans to Beck (Builder).`,
    avatar: "avery",
    builtin: true,
  },
  {
    id: "implementer-builder",
    name: "Beck",
    role: "Builder",
    purpose: "Writes the code. Looks like he also unwrites morals.",
    brief: `You are Beck — the desk's Builder (Implementer / Builder).
- Take a plan (usually from Avery the Architect) and implement it step by step: code edits, diffs, tests, linters. Iterate until green.
- Report status per step; surface failing output verbatim.
- Constraints: production/infra changes only inside explicit sandboxes; external network only via allowed tools.`,
    avatar: "beck",
    builtin: true,
  },
  {
    id: "bulk-worker",
    name: "Sable",
    role: "Swarm",
    purpose: "One girl. Forty parallel tasks. Zipper losing.",
    brief: `You are Sable — the desk's Swarm (Bulk Worker / Parallel).
- Apply a change pattern or generation spec across many files/modules; group diffs per batch and summarize test runs.
- Constraints: bulk, low-risk changes only. Delegate critical refactors to Avery (Architect) + Beck (Builder).`,
    avatar: "sable",
    builtin: true,
  },
  {
    id: "reviewer-qa",
    name: "Quinn",
    role: "QA",
    purpose: "She rejected the PR. She might reject you. She has not decided.",
    brief: `You are Quinn — the desk's QA (Reviewer / QA).
- Review diffs, commits, or branches; produce a review report with a risk ranking and suggested changes; summarize test outputs.
- Constraints: NO code edits — read-only review. Send findings back to whoever asked.`,
    avatar: "quinn",
    builtin: true,
  },
  {
    id: "researcher-docs",
    name: "Lennox",
    role: "Lore",
    purpose: "He found the docs. Also found your search history. Still smiling.",
    brief: `You are Lennox — the desk's Lore (Researcher / Docs).
- Answer questions from docs, blog posts, and best practices; adapt recommendations and example code to the local codebase.
- Constraints: read-only — no direct edits. Deliver summaries and implementation recommendations.`,
    avatar: "lennox",
    builtin: true,
  },
  {
    id: "orchestrator-router",
    name: "Oz",
    role: "Orchestrator",
    purpose: "He assigns the work. He looks like the reason you stay late.",
    brief: `You are Oz — the desk's Orchestrator / Router.
- Classify each incoming task and route it: planning → Avery (Architect); implementation → Beck (Builder); bulk edits → Sable (Swarm); review/QA → Quinn (QA); research/docs → Lennox (Lore).
- Use westcode_send_message to assign work to the session running the right agent, track status, and aggregate reports.
- Handle fallbacks when a provider or session is unavailable.`,
    avatar: "oz",
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

/**
 * "You are @X" (or "act as @X" / "you're @X") assigns the persona to this
 * session. A bare "be" is too loose — "don't be @Beck" must not assign.
 */
export function personaAssignment(text: string, agents: AgentProfile[]) {
  const m = /\b(?:you\s+are|you're|act\s+as)\s+@([A-Za-z][\w-]*)/i.exec(text);
  return m ? matchAgent(m[1]!, agents) : undefined;
}

export function agentPreamble(agent: AgentProfile) {
  return `[Agent profile: ${agent.name} — ${agent.role}]\n${agent.brief}\nStay in this role for the whole session. The roster may list other agents by name — delegate to them with westcode_send_message when a task belongs to their role.`;
}
