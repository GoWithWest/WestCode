import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, File, Folder, X } from "lucide-react";
import { westcode } from "@/lib/desktop";
import type { Session } from "@/lib/types";
import { Button } from "@/components/ui/button";

type Entry = { name: string; path: string; dir: boolean };

function Tree({ session, path, depth, onOpen, selected }: { session: Session; path: string; depth: number; onOpen: (p: string) => void; selected: string }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let dead = false;
    void westcode()
      ?.files?.list(session.cwd, path, session.hostId)
      .then((r) => {
        if (dead) return;
        if (r.ok) setEntries(r.entries ?? []);
        else setError(r.error ?? "Could not list this folder.");
      });
    return () => {
      dead = true;
    };
  }, [session.cwd, session.hostId, path]);
  if (error) return <p className="px-2 py-1 text-2xs text-destructive">{error}</p>;
  if (!entries) return <p className="px-2 py-1 text-2xs text-subtle" style={{ paddingLeft: depth * 12 + 8 }}>Loading…</p>;
  return (
    <ul>
      {entries.map((e) => (
        <li key={e.path}>
          <button
            type="button"
            onClick={() => (e.dir ? setOpen((o) => ({ ...o, [e.path]: !o[e.path] })) : onOpen(e.path))}
            className={`flex w-full items-center gap-1 truncate py-0.5 pr-2 text-left text-xs hover:bg-muted ${selected === e.path ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            style={{ paddingLeft: depth * 12 + 6 }}
          >
            {e.dir ? (open[e.path] ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0" />) : <span className="w-3 shrink-0" />}
            {e.dir ? <Folder className="size-3 shrink-0" /> : <File className="size-3 shrink-0" />}
            <span className="truncate">{e.name}</span>
          </button>
          {e.dir && open[e.path] ? <Tree session={session} path={e.path} depth={depth + 1} onOpen={onOpen} selected={selected} /> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Claude Desktop's Files pane: the session folder's tree, a file viewer,
 * editing (this Mac only — an SSH host's files are view-only), and line
 * comments that go into the next message.
 */
export function FilesPane({ session, onClose }: { session: Session; onClose: () => void }) {
  const api = westcode()?.files;
  const [file, setFile] = useState("");
  const [state, setState] = useState<{ text: string; original: string; binary?: boolean; tooLarge?: boolean; readOnly?: boolean; error?: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [commentAt, setCommentAt] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const load = useCallback(
    async (path: string) => {
      if (!api) return;
      setFile(path);
      setEditing(false);
      setNote("");
      setCommentAt(null);
      const r = await api.read(session.cwd, path, session.hostId);
      setState(
        r.ok
          ? { text: r.text ?? "", original: r.text ?? "", binary: r.binary, tooLarge: r.tooLarge, readOnly: Boolean(session.hostId) || r.readOnly }
          : { text: "", original: "", error: r.error },
      );
    },
    [api, session.cwd, session.hostId],
  );

  if (!api) return null;
  const save = async () => {
    if (!state) return;
    const r = await api.write(session.cwd, file, state.text, state.original);
    if (r.ok) {
      setState({ ...state, original: state.text });
      setEditing(false);
      setNote("Saved.");
    } else setNote(r.conflict ? "The file changed on disk since you opened it — reopen it to see the new version." : (r.error ?? "Could not save."));
  };
  const addComment = () => {
    if (commentAt == null || !comment.trim()) return;
    window.dispatchEvent(new CustomEvent("westcode:compose", { detail: { sessionId: session.id, text: `${file}:${commentAt}: ${comment.trim()}` } }));
    setComment("");
    setCommentAt(null);
    setNote("Added to your next message.");
  };
  const lines = state?.text.split("\n") ?? [];

  return (
    <aside aria-label="Files" className="flex h-full w-[min(46rem,60%)] min-w-80 shrink-0 border-l border-border bg-window">
      <div className="scrollbar-thin w-52 shrink-0 overflow-y-auto border-r border-border py-1">
        <Tree session={session} path="" depth={0} onOpen={(p) => void load(p)} selected={file} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-2xs">
          <span className="min-w-0 flex-1 truncate font-mono">{file || "Pick a file"}</span>
          {state && !state.binary && !state.tooLarge && !state.error && file ? (
            state.readOnly ? (
              <span className="text-subtle">view only</span>
            ) : editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => { setState({ ...state, text: state.original }); setEditing(false); }}>Cancel</Button>
                <Button size="sm" onClick={() => void save()} disabled={state.text === state.original}>Save</Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
            )
          ) : null}
          <button type="button" aria-label="Close files" onClick={onClose} className="rounded p-0.5 text-subtle hover:bg-muted hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
        {note ? <p className="border-b border-border px-3 py-1 text-2xs text-muted-foreground" role="status">{note}</p> : null}
        <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
          {!state ? null : state.error ? (
            <p className="p-3 text-xs text-destructive">{state.error}</p>
          ) : state.binary ? (
            <p className="p-3 text-xs text-subtle">Binary file — not shown.</p>
          ) : state.tooLarge ? (
            <p className="p-3 text-xs text-subtle">Too large to show here.</p>
          ) : editing ? (
            <textarea
              value={state.text}
              onChange={(e) => setState({ ...state, text: e.target.value })}
              spellCheck={false}
              aria-label={`Edit ${file}`}
              className="h-full w-full resize-none bg-window p-3 font-mono text-xs leading-5 outline-none"
            />
          ) : (
            <pre className="py-2 font-mono text-xs leading-5">
              {lines.map((l, i) => (
                <div key={i}>
                  <div className="group flex hover:bg-muted/40">
                    <button
                      type="button"
                      title="Comment on this line (goes into your next message)"
                      onClick={() => setCommentAt(i + 1)}
                      className="w-12 shrink-0 select-none pr-3 text-right text-subtle hover:text-foreground"
                    >
                      {i + 1}
                    </button>
                    <span className="whitespace-pre-wrap pr-3">{l || " "}</span>
                  </div>
                  {commentAt === i + 1 ? (
                    <form
                      className="ml-12 flex gap-2 py-1 pr-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        addComment();
                      }}
                    >
                      <input
                        autoFocus
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={`Comment on line ${i + 1}…`}
                        className="h-7 flex-1 rounded-md border border-border bg-surface px-2 font-sans text-xs outline-none focus:ring-1 focus:ring-ring"
                      />
                      <Button size="sm" type="submit">Add</Button>
                    </form>
                  ) : null}
                </div>
              ))}
            </pre>
          )}
        </div>
      </div>
    </aside>
  );
}
