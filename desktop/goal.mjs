// Goal mode (after Hermes): the user states an objective; after every turn
// a judge — a tool-less one-shot of the same CLI — reads the goal and the
// latest turns and says whether the work is done, blocked on the user, or
// should continue. WestCode keeps going while it says continue, within a
// turn budget.

export const GOAL_BUDGET = 20;

export function judgePrompt(goal, transcript) {
  return `You are judging whether an agent has reached a goal. Do not do the work; only judge it.

GOAL: ${goal}

Recent turns of the session:
${transcript}

Reply with ONE line of JSON and nothing else:
{"verdict":"done"|"blocked"|"continue","reason":"<one short sentence>"}
- "done": the goal is met and the deliverable exists (say what proves it).
- "blocked": it cannot go on without the user (a decision, access, a secret) — say what is needed.
- "continue": there is clear next work toward the goal — say what it is.`;
}

/** Parse the judge's reply; anything unreadable counts as "continue". */
export function parseVerdict(reply) {
  const m = /\{[\s\S]*?\}/.exec(String(reply || ""));
  if (m) {
    try {
      const v = JSON.parse(m[0]);
      const verdict = ["done", "blocked", "continue"].includes(v.verdict) ? v.verdict : "continue";
      return { verdict, reason: String(v.reason || "").slice(0, 300) };
    } catch {
      /* fall through */
    }
  }
  const t = String(reply || "").toLowerCase();
  if (/\bdone\b/.test(t) && !/not done/.test(t)) return { verdict: "done", reason: String(reply).slice(0, 200) };
  if (/\bblocked\b/.test(t)) return { verdict: "blocked", reason: String(reply).slice(0, 200) };
  return { verdict: "continue", reason: "" };
}
