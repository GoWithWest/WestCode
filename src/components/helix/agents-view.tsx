import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Plus, Square, Trash2 } from "lucide-react";
import { PRESET_AGENTS, type AgentProfile } from "@/lib/agents";
import { PERMISSION_MODES, defaultEffortFor, effortsFor, modelsFor } from "@/lib/catalog";
import { PROVIDER_ORDER } from "@/lib/providers";
import { useHelix } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  DOT_ACCESSORIES,
  DOT_COLORS,
  DOT_SHAPES,
  dotActivity,
  dotStateFor,
  lookFor,
  type DotLook,
  type DotState,
} from "@/lib/dots";
import type { Session } from "@/lib/types";
import { Dot } from "./dot";
import { Button } from "@/components/ui/button";

const AVATAR_LIBRARY = [
  "avery",
  "beck",
  "sable",
  "quinn",
  "lennox",
  "oz",
  ...Array.from({ length: 12 }, (_, i) => `lib-${String(i + 1).padStart(2, "0")}`),
];

export function AgentAvatar({
  agent,
  state = "idle",
  size = 40,
  className,
}: {
  agent: AgentProfile;
  state?: DotState;
  size?: number;
  className?: string;
}) {
  if (agent.avatarStyle === "portrait") {
    return (
      <img
        src={`/avatars/${agent.avatar}.svg`}
        alt=""
        style={{ width: size, height: size }}
        className={cn("shrink-0 rounded-full border border-border object-cover", className)}
      />
    );
  }
  return <Dot look={lookFor(agent)} state={state} size={size} className={className} title={agent.name} />;
}

/** The session currently running an agent (most recently active). */
function sessionFor(sessions: Session[], agentId: string) {
  return sessions
    .filter((s) => s.agentId === agentId && !s.archivedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export function AgentsView() {
  const agents = useHelix((s) => s.agents);
  const sessions = useHelix((s) => s.sessions);
  const clock = useHelix((s) => s.clock);
  const remove = useHelix((s) => s.removeAgent);
  const removedIds = useHelix((s) => s.agentsPersist.removed);
  const restorePresets = useHelix((s) => s.restorePresetAgents);
  const [editing, setEditing] = useState<AgentProfile | null>(null);
  const [creating, setCreating] = useState(false);
  const hiddenPresets = removedIds.filter((id) =>
    PRESET_AGENTS.some((p) => p.id === id),
  ).length;
  const working = sessions.filter(
    (s) => s.agentId && !s.archivedAt && (s.status === "running" || s.permission),
  );
  const recent = sessions
    .filter((s) => s.agentId && !s.archivedAt && s.status !== "running" && !s.permission && s.turns > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6);

  function open(agent: AgentProfile) {
    const st = useHelix.getState();
    const running = sessionFor(st.sessions, agent.id);
    if (running) {
      st.setActive(running.id);
      return;
    }
    st.createSession({
      providerId: agent.providerId || st.settings.defaultProviderId || "claude",
      projectId: "scratch",
      title: agent.name,
      agentId: agent.id,
      model: agent.model,
      effort: agent.effort,
      permissionMode: agent.permissionMode,
    });
  }

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight">Agents</h2>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Your teammates. Open one to start a session in its role, say{" "}
              <span className="font-mono text-xs">You are @Oz</span> in any
              session, or tag <span className="font-mono text-xs">@Beck</span> to
              hand work across the desk.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hiddenPresets > 0 ? (
              <Button size="sm" variant="ghost" onClick={restorePresets}>
                Restore presets ({hiddenPresets})
              </Button>
            ) : null}
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-3.5" />
              New agent
            </Button>
          </div>
        </div>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => {
            const ses = sessionFor(sessions, a.id);
            const state = dotStateFor(ses, clock);
            const look = lookFor(a);
            return (
              <li
                key={a.id}
                className="group relative flex flex-col items-center rounded-2xl border border-border bg-surface px-4 pt-5 pb-4 text-center"
                style={{
                  backgroundImage: `radial-gradient(120% 70% at 50% 0%, color-mix(in oklch, ${look.color}, transparent 86%), transparent 70%)`,
                }}
              >
                <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <Button size="icon" variant="ghost" aria-label={`Edit ${a.name}`} onClick={() => setEditing(a)}>
                    <Pencil className="size-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${a.name}`}
                    onClick={() => {
                      if (window.confirm(`Delete ${a.name}? Sessions using this agent lose the persona.`)) {
                        remove(a.id);
                      }
                    }}
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
                <AgentAvatar agent={a} state={state} size={72} />
                <div className="relative -mt-2 rounded-full border border-border bg-window px-3 py-1 shadow-window">
                  <span className="text-sm font-semibold">{a.name}</span>
                  <span className="ml-1.5 text-2xs text-muted-foreground">{a.role}</span>
                </div>
                <p className="mt-2 line-clamp-1 text-2xs text-subtle" title={dotActivity(ses)}>
                  {ses ? dotActivity(ses) : "Free"}
                </p>
                <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">
                  {a.purpose}
                </p>
                <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => open(a)}>
                  {ses ? "Open session" : `Work with ${a.name}`}
                </Button>
              </li>
            );
          })}
        </ul>

        {working.length || recent.length ? (
          <section className="mt-8">
            <h3 className="text-sm font-medium">Activity</h3>
            <ActivityList title="In progress" sessions={working} agents={agents} clock={clock} />
            <ActivityList title="Recent" sessions={recent} agents={agents} clock={clock} />
          </section>
        ) : null}
      </div>

      {editing ? (
        <AgentDialog
          agent={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {creating ? <AgentDialog onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

function ActivityList({
  title,
  sessions,
  agents,
  clock,
}: {
  title: string;
  sessions: Session[];
  agents: AgentProfile[];
  clock: number;
}) {
  const setActive = useHelix((s) => s.setActive);
  const stop = useHelix((s) => s.stop);
  if (!sessions.length) return null;
  return (
    <div className="mt-3">
      <p className="text-2xs font-medium tracking-wide text-subtle uppercase">{title}</p>
      <ul className="mt-1.5 overflow-hidden rounded-xl border border-border bg-surface">
        {sessions.map((s) => {
          const agent = agents.find((a) => a.id === s.agentId);
          if (!agent) return null;
          const running = s.status === "running";
          return (
            <li key={s.id} className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
              <AgentAvatar agent={agent} state={dotStateFor(s, clock)} size={28} />
              <button type="button" onClick={() => setActive(s.id)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-xs font-medium">{s.title}</span>
                <span className="block truncate text-2xs text-muted-foreground">
                  {agent.name} · {dotActivity(s)}
                </span>
              </button>
              {running ? (
                <Button size="icon" variant="subtle" aria-label={`Stop ${agent.name}`} onClick={() => stop(s.id)}>
                  <Square className="size-3 fill-current" />
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AgentDialog({
  agent,
  onClose,
}: {
  agent?: AgentProfile;
  onClose: () => void;
}) {
  const addAgent = useHelix((s) => s.addAgent);
  const updateAgent = useHelix((s) => s.updateAgent);
  const [name, setName] = useState(agent?.name ?? "");
  const [role, setRole] = useState(agent?.role ?? "");
  const [purpose, setPurpose] = useState(agent?.purpose ?? "");
  const [brief, setBrief] = useState(agent?.brief ?? "");
  const [avatar, setAvatar] = useState(agent?.avatar ?? "lib-01");
  const [style, setStyle] = useState<"dot" | "portrait">(agent?.avatarStyle ?? "dot");
  const [look, setLook] = useState<DotLook>(lookFor(agent ?? { id: `new-${Date.now()}` }));
  const [providerId, setProviderId] = useState(agent?.providerId ?? "");
  const [model, setModel] = useState(agent?.model ?? "");
  const [effort, setEffort] = useState(agent?.effort ?? "");
  const [permissionMode, setPermissionMode] = useState(
    agent?.permissionMode ?? "",
  );

  function submit() {
    const n = name.trim();
    if (!n) return;
    const payload = {
      name: n,
      role: role.trim() || "Agent",
      purpose: purpose.trim(),
      brief: brief.trim() || purpose.trim() || `You are ${n}.`,
      avatar,
      avatarStyle: style,
      look,
      providerId: providerId || undefined,
      model: model || undefined,
      effort: effort || undefined,
      permissionMode: permissionMode || undefined,
    };
    if (agent) updateAgent(agent.id, payload);
    else addAgent(payload);
    onClose();
  }

  return (
    <Dialog.Root open onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/70" />
        <Dialog.Content className="scrollbar-none fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[min(90dvh,42rem)] w-auto max-w-lg -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-window focus:outline-none">
          <Dialog.Title className="text-lg font-medium tracking-tight">
            {agent ? `Edit ${agent.name}` : "New agent"}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            Sessions adopt this profile when you say "You are @Name".
          </Dialog.Description>

          <div className="mt-4 flex items-center gap-4">
            <div className="grid size-24 shrink-0 place-items-center rounded-2xl bg-window">
              {style === "dot" ? (
                <Dot look={look} state="idle" size={72} />
              ) : (
                <img src={`/avatars/${avatar}.svg`} alt="" className="size-16 rounded-full object-cover" />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="inline-flex w-fit rounded-md border border-border p-0.5">
                {(["dot", "portrait"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={style === v}
                    onClick={() => setStyle(v)}
                    className={cn(
                      "rounded-sm px-2.5 py-1 text-xs",
                      style === v ? "bg-muted font-medium" : "text-muted-foreground",
                    )}
                  >
                    {v === "dot" ? "Character" : "Portrait"}
                  </button>
                ))}
              </div>
              <p className="text-2xs text-muted-foreground">
                The character moves with its session: thinking, working, waiting for you.
              </p>
            </div>
          </div>

          {style === "dot" ? (
            <>
              <p className="mt-4 text-2xs font-medium tracking-wide text-subtle uppercase">Shape</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {DOT_SHAPES.map((sh) => (
                  <button
                    key={sh}
                    type="button"
                    aria-label={`Shape ${sh}`}
                    aria-pressed={look.shape === sh}
                    onClick={() => setLook({ ...look, shape: sh })}
                    className={cn(
                      "rounded-lg border p-1",
                      look.shape === sh ? "border-border-strong bg-muted" : "border-transparent hover:bg-muted/50",
                    )}
                  >
                    <Dot look={{ ...look, shape: sh, accessory: "none" }} size={30} still />
                  </button>
                ))}
              </div>
              <p className="mt-3 text-2xs font-medium tracking-wide text-subtle uppercase">Colour</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {DOT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    aria-pressed={look.color === c}
                    onClick={() => setLook({ ...look, color: c })}
                    className={cn(
                      "size-7 rounded-full border-2",
                      look.color === c ? "border-foreground" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <p className="mt-3 text-2xs font-medium tracking-wide text-subtle uppercase">Accessory</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {DOT_ACCESSORIES.map((acc) => (
                  <button
                    key={acc}
                    type="button"
                    aria-pressed={look.accessory === acc}
                    onClick={() => setLook({ ...look, accessory: acc })}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs capitalize",
                      look.accessory === acc ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    {acc}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {AVATAR_LIBRARY.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-label={`Avatar ${id}`}
                  onClick={() => setAvatar(id)}
                  className={cn(
                    "rounded-full border-2 p-0.5",
                    avatar === id ? "border-accent" : "border-transparent",
                  )}
                >
                  <img src={`/avatars/${id}.svg`} alt="" className="size-9 rounded-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <Field label="Name" value={name} onChange={setName} placeholder="Avery" />
          <Field label="Role" value={role} onChange={setRole} placeholder="Architect" />
          <Field
            label="Purpose"
            value={purpose}
            onChange={setPurpose}
            placeholder="One line on what this agent does"
          />
          <label className="mt-3 block">
            <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
              Instructions
            </span>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={6}
              placeholder="The full working brief injected into the session."
              className="mt-1.5 w-full resize-none rounded-md border border-border bg-window px-3 py-2 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
            />
          </label>

          <p className="mt-4 text-2xs font-medium tracking-wide text-subtle uppercase">
            Runtime
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <select
              value={providerId}
              onChange={(e) => {
                setProviderId(e.target.value);
                setModel("");
                setEffort(e.target.value ? defaultEffortFor(e.target.value) : "");
              }}
              className="h-8 rounded-md border border-border bg-window px-2 text-xs outline-none"
            >
              <option value="">Provider: use context (sender / desk default)</option>
              {PROVIDER_ORDER.map((id) => (
                <option key={id} value={id}>
                  Provider: {id}
                </option>
              ))}
            </select>
            <select
              value={permissionMode}
              onChange={(e) => setPermissionMode(e.target.value)}
              className="h-8 rounded-md border border-border bg-window px-2 text-xs outline-none"
            >
              <option value="">Permissions: delegation default</option>
              {PERMISSION_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  Permissions: {m.label}
                </option>
              ))}
            </select>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!providerId}
              className="h-8 rounded-md border border-border bg-window px-2 text-xs outline-none disabled:opacity-50"
            >
              <option value="">Model: provider default</option>
              {providerId
                ? modelsFor(providerId, []).map((m) => (
                    <option key={m.id} value={m.id}>
                      Model: {m.label}
                    </option>
                  ))
                : null}
            </select>
            <select
              value={effort}
              onChange={(e) => setEffort(e.target.value)}
              disabled={!providerId}
              className="h-8 rounded-md border border-border bg-window px-2 text-xs outline-none disabled:opacity-50"
            >
              <option value="">Effort: provider default</option>
              {providerId
                ? effortsFor(providerId).map((x) => (
                    <option key={x.id} value={x.id}>
                      Effort: {x.label}
                    </option>
                  ))
                : null}
            </select>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!name.trim()}>
              {agent ? "Save" : "Add agent"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="mt-3 block">
      <span className="text-2xs font-medium tracking-wide text-subtle uppercase">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-9 w-full rounded-md border border-border bg-window px-3 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-ring"
      />
    </label>
  );
}
