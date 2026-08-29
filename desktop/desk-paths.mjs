import { mkdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

export function deskDir() {
  const dir = join(homedir(), ".westcode", "desk");
  mkdirSync(join(dir, "outbox"), { recursive: true });
  mkdirSync(join(dir, "results"), { recursive: true });
  return dir;
}

export function rosterPath() {
  return join(deskDir(), "roster.json");
}

export function tmpRosterPath() {
  const dir = join(tmpdir(), "westcode-desk");
  mkdirSync(dir, { recursive: true });
  return join(dir, "roster.json");
}

export function outboxDir() {
  return join(deskDir(), "outbox");
}

export function resultPath(id) {
  return join(deskDir(), "results", `${id}.json`);
}

export function outboxPath(id) {
  return join(outboxDir(), `${id}.json`);
}
