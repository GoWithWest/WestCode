import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { AgentProfile } from "@/lib/agents";
import { useHelix } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const AVATAR_LIBRARY = [
  "petra-axel",
  "ivy-ben",
  "billie-wren",
  "rhea-quinn",
  "rita-dean",
  "olive-rex",
  "cleo-sam",
  ...Array.from({ length: 12 }, (_, i) => `lib-${String(i + 1).padStart(2, "0")}`),
];

export function AgentsView() {
  const agents = useHelix((s) => s.agents);
  const remove = useHelix((s) => s.removeAgent);
  const [editing, setEditing] = useState<AgentProfile | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight">Agents</h2>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Personas for your sessions. Say{" "}
              <span className="font-mono text-xs">You are @Cleo-Sam</span> in a
              session to assign one, or tag teammates like{" "}
              <span className="font-mono text-xs">@Ivy-Ben</span> to delegate
              work across the desk.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" />
            New agent
          </Button>
        </div>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {agents.map((a) => (
            <li
              key={a.id}
              className="flex gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <img
                src={`/avatars/${a.avatar}.svg`}
                alt=""
                className="size-14 shrink-0 rounded-full border border-border"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium">{a.name}</h3>
                    <p className="text-2xs font-medium text-accent">{a.role}</p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Edit ${a.name}`}
                      onClick={() => setEditing(a)}
                    >
                      <Pencil className="size-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${a.name}`}
                      onClick={() => remove(a.id)}
                    >
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {a.purpose}
                </p>
                <p className="mt-1.5 font-mono text-2xs text-subtle">
                  @{a.name} · @{a.name.split(/[-\s]/)[0]}
                </p>
              </div>
            </li>
          ))}
        </ul>
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

  function submit() {
    const n = name.trim();
    if (!n) return;
    const payload = {
      name: n,
      role: role.trim() || "Agent",
      purpose: purpose.trim(),
      brief: brief.trim() || purpose.trim() || `You are ${n}.`,
      avatar,
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

          <p className="mt-4 text-2xs font-medium tracking-wide text-subtle uppercase">
            Avatar
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                <img src={`/avatars/${id}.svg`} alt="" className="size-9 rounded-full" />
              </button>
            ))}
          </div>

          <Field label="Name" value={name} onChange={setName} placeholder="Dana-Elizabeth" />
          <Field label="Role" value={role} onChange={setRole} placeholder="Data Engineer" />
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
