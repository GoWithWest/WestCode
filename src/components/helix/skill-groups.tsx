import { useMemo, useState, type ComponentType } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import {
  AudioLines,
  BarChart3,
  Bot,
  FileCode2,
  GitPullRequest,
  Image,
  LayoutDashboard,
  ListChecks,
  Target,
  Users,
  Boxes,
  Brain,
  Briefcase,
  Check,
  ChevronRight,
  Clapperboard,
  Cloud,
  Code2,
  Database,
  FileText,
  FlaskConical,
  Gamepad2,
  Hammer,
  Layers,
  LineChart,
  Megaphone,
  Palette,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Server,
  Shield,
  Smartphone,
  Sparkles,
  Trash2,
  Wallet,
  Wrench,
  X,
  type LucideProps,
} from "lucide-react";
import { useHelix } from "@/lib/store";
import { resolveGroup, skillKey, type SkillGroup } from "@/lib/skill-groups";
import { cn } from "@/lib/utils";
import type { Session } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ProviderDot } from "./provider";

const ICONS: Record<string, ComponentType<LucideProps>> = {
  "audio-lines": AudioLines,
  "chart-bar": BarChart3,
  "code-xml": FileCode2,
  "flask-conical": FlaskConical,
  "gamepad-2": Gamepad2,
  "git-pull-request": GitPullRequest,
  image: Image,
  "layout-dashboard": LayoutDashboard,
  "list-checks": ListChecks,
  target: Target,
  users: Users,
  bot: Bot,
  boxes: Boxes,
  brain: Brain,
  briefcase: Briefcase,
  clapperboard: Clapperboard,
  cloud: Cloud,
  code: Code2,
  database: Database,
  "file-text": FileText,
  flask: FlaskConical,
  gamepad: Gamepad2,
  hammer: Hammer,
  layers: Layers,
  "line-chart": LineChart,
  megaphone: Megaphone,
  palette: Palette,
  scale: Scale,
  search: Search,
  server: Server,
  shield: Shield,
  smartphone: Smartphone,
  sparkles: Sparkles,
  wallet: Wallet,
  wrench: Wrench,
};

export const GROUP_ICON_NAMES = Object.keys(ICONS);

export function GroupIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Layers;
  return <Icon className={className} aria-hidden />;
}

const CLI_PROVIDERS = ["claude", "grok", "codex"] as const;

/** Installed skill names per provider, from the live CLI scan. */
function useInstalled() {
  const live = useHelix((s) => s.liveAddons);
  return useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const a of live) {
      if (a.kind !== "skill") continue;
      for (const p of a.providers) (out[p] ??= []).push(a.name);
    }
    return out;
  }, [live]);
}

/**
 * Library → Groups. Every group with its skills, which CLI has each one,
 * and the controls to add or take out skills and to make your own groups.
 */
export function GroupsPanel({ query }: { query: string }) {
  const groups = useHelix((s) => s.skillGroups);
  const restore = useHelix((s) => s.restorePresetGroups);
  const removedPresets = useHelix((s) => s.groupsPersist.removed.length);
  const installed = useInstalled();
  const [creating, setCreating] = useState(false);
  const q = query.trim().toLowerCase();
  const shown = q
    ? groups.filter(
        (g) =>
          g.label.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.skills.some((s) => s.name.toLowerCase().includes(q)),
      )
    : groups;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Link a group to a session (composer → Skills, or{" "}
          <code className="font-mono text-2xs">/group web</code>) and every skill in it that the
          session's CLI has installed rides along.
        </p>
        <div className="flex gap-1.5">
          {removedPresets ? (
            <Button size="sm" variant="ghost" onClick={restore}>
              <RotateCcw className="size-3.5" />
              Restore presets
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" />
            New group
          </Button>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {shown.map((g) => (
          <GroupCard key={g.id} group={g} installed={installed} />
        ))}
        {shown.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No group matches.
          </li>
        ) : null}
      </ul>
      <NewGroupDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function GroupCard({
  group,
  installed,
}: {
  group: SkillGroup;
  installed: Record<string, string[]>;
}) {
  const [open, setOpen] = useState(false);
  const unassign = useHelix((s) => s.unassignSkillFromGroup);
  const remove = useHelix((s) => s.removeSkillGroup);
  const keysBy = useMemo(() => {
    const out: Record<string, Set<string>> = {};
    for (const p of CLI_PROVIDERS) out[p] = new Set((installed[p] ?? []).map(skillKey));
    return out;
  }, [installed]);
  const have = group.skills.filter((s) =>
    CLI_PROVIDERS.some((p) => keysBy[p]!.has(skillKey(s.name))),
  ).length;

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted">
          <GroupIcon name={group.icon} className="size-4 text-foreground" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-medium">{group.label}</span>
            {!group.builtin ? <span className="text-2xs text-subtle">yours</span> : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {group.description}
          </span>
        </span>
        <span className="shrink-0 text-2xs tabular-nums text-subtle">
          {have}/{group.skills.length} installed
        </span>
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-subtle transition-transform duration-(--motion-quick)",
            open && "rotate-90",
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-border px-4 py-3">
          <ul className="flex flex-col gap-1">
            {group.skills.map((s) => (
              <li
                key={s.name}
                className="group/skill flex items-center gap-2 rounded-sm px-1 py-1 hover:bg-muted/40"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{s.name}</span>
                <span className="flex items-center gap-1.5">
                  {CLI_PROVIDERS.map((p) =>
                    keysBy[p]!.has(skillKey(s.name)) ? (
                      <ProviderDot key={p} id={p} className="size-1.5" />
                    ) : null,
                  )}
                  {!CLI_PROVIDERS.some((p) => keysBy[p]!.has(skillKey(s.name))) ? (
                    <span className="text-2xs text-subtle" title={s.source}>
                      not installed
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${s.name} from ${group.label}`}
                  onClick={() => unassign(group.id, s.name)}
                  className="text-subtle opacity-0 group-hover/skill:opacity-100 hover:text-foreground focus-visible:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AddSkillPicker group={group} />
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-muted-foreground"
              onClick={() => remove(group.id)}
            >
              <Trash2 className="size-3.5" />
              {group.builtin ? "Hide group" : "Delete group"}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/** Search every skill the CLIs report (plus free text) and add it to a group. */
function AddSkillPicker({ group }: { group: SkillGroup }) {
  const live = useHelix((s) => s.liveAddons);
  const assign = useHelix((s) => s.assignSkillToGroup);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inGroup = useMemo(
    () => new Set(group.skills.map((s) => skillKey(s.name))),
    [group.skills],
  );
  const options = useMemo(() => {
    const byKey = new Map<string, { name: string; summary: string; providers: Set<string> }>();
    for (const a of live) {
      if (a.kind !== "skill") continue;
      const k = skillKey(a.name);
      const cur = byKey.get(k);
      if (cur) a.providers.forEach((p) => cur.providers.add(p));
      else byKey.set(k, { name: a.name, summary: a.summary, providers: new Set(a.providers) });
    }
    const needle = q.trim().toLowerCase();
    return [...byKey.entries()]
      .filter(([k]) => !inGroup.has(k))
      .map(([, v]) => v)
      .filter(
        (v) =>
          !needle ||
          v.name.toLowerCase().includes(needle) ||
          v.summary.toLowerCase().includes(needle),
      )
      .slice(0, 40);
  }, [live, q, inGroup]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-3.5" />
          Add skill
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-80 rounded-lg border border-border bg-window p-2 shadow-window"
        >
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim() && options.length === 0) {
                assign(group.id, { name: q.trim() });
                setQ("");
              }
            }}
            placeholder="Search installed skills, or type a name"
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
          />
          <ul className="scrollbar-thin mt-1.5 max-h-64 overflow-y-auto">
            {options.map((o) => (
              <li key={o.name}>
                <button
                  type="button"
                  onClick={() => assign(group.id, { name: o.name })}
                  className="flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left hover:bg-muted"
                >
                  <span className="flex w-full items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">{o.name}</span>
                    {[...o.providers].map((p) => (
                      <ProviderDot key={p} id={p} className="size-1.5" />
                    ))}
                  </span>
                  <span className="line-clamp-1 text-2xs text-muted-foreground">{o.summary}</span>
                </button>
              </li>
            ))}
            {options.length === 0 && q.trim() ? (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    assign(group.id, { name: q.trim() });
                    setQ("");
                  }}
                  className="w-full rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  Add “{q.trim()}” by name
                </button>
              </li>
            ) : null}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function NewGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const add = useHelix((s) => s.addSkillGroup);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("layers");
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(28rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-window p-5 shadow-window">
          <Dialog.Title className="text-base font-medium">New skill group</Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            Name it, then add skills from the group card.
          </Dialog.Description>
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!label.trim()) return;
              add({ label: label.trim(), description: description.trim(), icon, skills: [] });
              setLabel("");
              setDescription("");
              onOpenChange(false);
            }}
          >
            <label className="flex flex-col gap-1 text-xs">
              Name
              <input
                autoFocus
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-9 rounded-md border border-border bg-surface px-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              What it is for
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 rounded-md border border-border bg-surface px-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </label>
            <div className="flex flex-wrap gap-1">
              {GROUP_ICON_NAMES.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={n}
                  aria-pressed={icon === n}
                  onClick={() => setIcon(n)}
                  className={cn(
                    "grid size-8 place-items-center rounded-md border border-transparent hover:bg-muted",
                    icon === n && "border-border-strong bg-muted",
                  )}
                >
                  <GroupIcon name={n} className="size-4" />
                </button>
              ))}
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" size="sm" disabled={!label.trim()}>
                Create
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** On a skill card: which groups hold this skill, toggled in place. */
export function SkillGroupAssign({ name }: { name: string }) {
  const groups = useHelix((s) => s.skillGroups);
  const assign = useHelix((s) => s.assignSkillToGroup);
  const unassign = useHelix((s) => s.unassignSkillFromGroup);
  const k = skillKey(name);
  const member = groups.filter((g) => g.skills.some((s) => skillKey(s.name) === k));
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-2xs text-muted-foreground hover:text-foreground"
        >
          <Layers className="size-3" />
          {member.length ? member.map((g) => g.label).join(", ") : "Add to group"}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="scrollbar-thin z-50 max-h-80 w-64 overflow-y-auto rounded-lg border border-border bg-window py-1 shadow-window"
        >
          {groups.map((g) => {
            const on = member.includes(g);
            return (
              <button
                key={g.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={on}
                onClick={() => (on ? unassign(g.id, name) : assign(g.id, { name }))}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted"
              >
                <GroupIcon name={g.icon} className="size-3.5 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{g.label}</span>
                {on ? <Check className="size-3.5" /> : null}
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Composer control: link groups to this session; shows what applies here. */
export function ComposerSkillGroups({ session }: { session: Session }) {
  const groups = useHelix((s) => s.skillGroups);
  const link = useHelix((s) => s.linkSkillGroup);
  const installed = useInstalled()[session.providerId] ?? [];
  const linked = new Set(session.skillGroupIds ?? []);
  const linkedGroups = groups.filter((g) => linked.has(g.id));
  const [q, setQ] = useState("");
  const shown = groups.filter(
    (g) => !q.trim() || g.label.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 max-w-48 items-center gap-1 rounded-md px-1.5 text-2xs text-muted-foreground hover:bg-muted hover:text-foreground",
            linkedGroups.length && "text-foreground",
          )}
          aria-label="Skill groups"
        >
          <Sparkles className="size-3" />
          <span className="truncate">
            {linkedGroups.length ? linkedGroups.map((g) => g.label).join(" · ") : "Skills"}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={6}
          className="z-50 w-80 rounded-lg border border-border bg-window p-1.5 shadow-window"
        >
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a skill group"
            className="mb-1 h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
          />
          <ul className="scrollbar-thin max-h-72 overflow-y-auto">
            {shown.map((g) => {
              const r = resolveGroup(g, installed);
              const on = linked.has(g.id);
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={on}
                    onClick={() => link(session.id, g.id, !on)}
                    className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left hover:bg-muted"
                  >
                    <GroupIcon name={g.icon} className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{g.label}</span>
                      <span className="block truncate text-2xs text-muted-foreground">
                        {r.available.length} of {g.skills.length} installed here
                      </span>
                    </span>
                    {on ? <Check className="size-3.5 shrink-0" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
