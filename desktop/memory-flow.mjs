// What the Memory view and the learning loop do with memory, shared by the
// Electron main process and the tests.
import { join } from "node:path";
import * as learn from "./learn.mjs";
import * as hub from "./memory-hub.mjs";

export function deskFacts() {
  return [...learn.memoryEntries(learn.readMemory("user")), ...learn.memoryEntries(learn.readMemory("memory"))];
}

export async function syncAllRules(repo) {
  const info = repo ? await hub.repoInfo(String(repo)) : { repo: false };
  return hub.syncRules({
    // The folder the user picked (it may be a subfolder of the repository,
    // like memory/ next to other files): that is where facts go.
    repo: info.repo ? String(repo) : null,
    remote: info.remote || "",
    local: join(learn.learnHome(), "memory"),
    facts: deskFacts(),
  });
}

export async function memoryState(repo) {
  const sources = hub.scanSources();
  return {
    ok: true,
    sources,
    repo: repo ? await hub.repoInfo(String(repo)) : null,
    detected: await hub.detectMemoryRepo(sources),
    sync: hub.syncState(),
    facts: deskFacts(),
    local: join(learn.learnHome(), "memory"),
  };
}

/**
 * Approve or reject a learning proposal. An approved memory also goes to the
 * shared store (the memory repo: a file per fact, committed and pushed) and
 * refreshes every CLI's rules block when sharing is on.
 */
export async function decideAndShare(p = {}) {
  const pending = learn.listPending().find((r) => r.id === p.id);
  const res = learn.decide(String(p.id || ""), p.verdict === "approve" ? "approve" : "reject", p.edited);
  if (res.ok && p.verdict === "approve" && pending?.kind === "memory" && pending.op !== "remove") {
    if (p.memoryRepo) {
      res.shared = await hub.saveFact(String(p.memoryRepo), {
        text: typeof p.edited === "string" && p.edited.trim() ? p.edited : pending.text,
        type: pending.target === "user" ? "user" : "project",
      });
    }
    if (p.memorySync) await syncAllRules(p.memoryRepo);
  }
  return res;
}
