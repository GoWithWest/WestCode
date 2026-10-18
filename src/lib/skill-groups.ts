/**
 * Skill groups: named bundles of skills ("Web Design", "Motion & Video")
 * that a session links in one go. Linking a group puts every skill of the
 * group that THIS session's CLI has installed into each turn's preamble, so
 * the agent loads them when the task calls for them. Skills the CLI lacks
 * are listed as missing, never claimed.
 *
 * The catalog ships as presets (skill-group-catalog.ts). Users edit it the
 * same way they edit agents: overrides per preset, their own groups, and a
 * removed list — all persisted, presets restorable.
 */
import { GROUP_CATALOG } from "./skill-group-catalog";

export type SkillRef = {
  /** Skill name as the CLI lists it, e.g. "frontend-design". */
  name: string;
  /** Where to get it when it is not installed (repo, URL, or install line). */
  source?: string;
};

export type SkillGroup = {
  id: string;
  label: string;
  description: string;
  /** lucide icon name, rendered by GroupIcon. */
  icon: string;
  skills: SkillRef[];
  builtin?: boolean;
};

export type GroupsPersist = {
  custom: SkillGroup[];
  /** Per preset: skills the user added and skills the user took out. */
  overrides: Record<
    string,
    { added?: SkillRef[]; removed?: string[]; label?: string; description?: string; icon?: string }
  >;
  removed: string[];
};

export const GROUPS_KEY = "helix-skill-groups-v1";

export const EMPTY_GROUPS: GroupsPersist = { custom: [], overrides: {}, removed: [] };

/** Comparable form of a skill name: "Frontend Design", "frontend-design" and
 * "example-skills:frontend-design" all name the same skill. */
export function skillKey(name: string): string {
  const bare = name.includes(":") ? name.slice(name.lastIndexOf(":") + 1) : name;
  return bare.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function dedupe(skills: SkillRef[]): SkillRef[] {
  const seen = new Set<string>();
  const out: SkillRef[] = [];
  for (const s of skills) {
    const k = skillKey(s.name);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

export function mergeGroups(p: GroupsPersist, catalog: SkillGroup[] = GROUP_CATALOG): SkillGroup[] {
  const removed = new Set(p.removed);
  const presets = catalog
    .filter((g) => !removed.has(g.id))
    .map((g) => {
      const o = p.overrides[g.id] ?? {};
      const out = new Set((o.removed ?? []).map(skillKey));
      return {
        ...g,
        label: o.label ?? g.label,
        description: o.description ?? g.description,
        icon: o.icon ?? g.icon,
        builtin: true,
        skills: dedupe([...g.skills, ...(o.added ?? [])]).filter((s) => !out.has(skillKey(s.name))),
      };
    });
  const custom = p.custom
    .filter((g) => !removed.has(g.id))
    .map((g) => ({ ...g, builtin: false, skills: dedupe(g.skills) }));
  return [...presets, ...custom];
}

/** Add a skill to a group, recording it the way that group is stored. */
export function assignSkill(p: GroupsPersist, groupId: string, skill: SkillRef): GroupsPersist {
  const custom = p.custom.find((g) => g.id === groupId);
  if (custom) {
    return {
      ...p,
      custom: p.custom.map((g) =>
        g.id === groupId ? { ...g, skills: dedupe([...g.skills, skill]) } : g,
      ),
    };
  }
  const o = p.overrides[groupId] ?? {};
  const k = skillKey(skill.name);
  return {
    ...p,
    overrides: {
      ...p.overrides,
      [groupId]: {
        ...o,
        added: dedupe([...(o.added ?? []), skill]),
        removed: (o.removed ?? []).filter((r) => skillKey(r) !== k),
      },
    },
  };
}

/** Take a skill out of a group. Presets remember the removal so a catalog
 * update does not quietly put it back. */
export function unassignSkill(p: GroupsPersist, groupId: string, name: string): GroupsPersist {
  const k = skillKey(name);
  const custom = p.custom.find((g) => g.id === groupId);
  if (custom) {
    return {
      ...p,
      custom: p.custom.map((g) =>
        g.id === groupId ? { ...g, skills: g.skills.filter((s) => skillKey(s.name) !== k) } : g,
      ),
    };
  }
  const o = p.overrides[groupId] ?? {};
  return {
    ...p,
    overrides: {
      ...p.overrides,
      [groupId]: {
        ...o,
        added: (o.added ?? []).filter((s) => skillKey(s.name) !== k),
        removed: [...new Set([...(o.removed ?? []), name])],
      },
    },
  };
}

export function groupsForSkill(groups: SkillGroup[], name: string): SkillGroup[] {
  const k = skillKey(name);
  return groups.filter((g) => g.skills.some((s) => skillKey(s.name) === k));
}

export type ResolvedGroup = {
  group: SkillGroup;
  /** Installed for this provider, under the name the CLI uses. */
  available: string[];
  missing: SkillRef[];
};

/**
 * Which of a group's skills this provider's CLI actually has. `installed` is
 * the live skill list for the provider (names as the CLI reports them).
 */
export function resolveGroup(group: SkillGroup, installed: string[]): ResolvedGroup {
  const byKey = new Map<string, string>();
  for (const n of installed) {
    const k = skillKey(n);
    if (k && !byKey.has(k)) byKey.set(k, n);
  }
  const available: string[] = [];
  const missing: SkillRef[] = [];
  for (const s of group.skills) {
    const hit = byKey.get(skillKey(s.name));
    if (hit) available.push(hit);
    else missing.push(s);
  }
  return { group, available, missing };
}

/** Preamble lines for the groups linked to a session. Empty when none apply. */
export function groupPreamble(resolved: ResolvedGroup[]): string {
  const live = resolved.filter((r) => r.available.length);
  if (!live.length) return "";
  const lines = live.map((r) => `- ${r.group.label}: ${r.available.join(", ")}`);
  return `[Skill groups linked to this session]
The user linked these groups. Load and follow the listed skills whenever the task touches their area — they are installed for you:
${lines.join("\n")}
`;
}

export function slugGroupId(label: string, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "group";
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}

/** Match "/group web" or "web design" to a group by id or label. */
export function matchGroup(query: string, groups: SkillGroup[]): SkillGroup | undefined {
  const q = query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (!q) return undefined;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return (
    groups.find((g) => norm(g.id) === q || norm(g.label) === q) ??
    groups.find((g) => norm(g.id).startsWith(q) || norm(g.label).startsWith(q)) ??
    groups.find((g) => norm(g.label).includes(q))
  );
}
