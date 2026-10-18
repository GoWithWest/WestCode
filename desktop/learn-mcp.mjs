#!/usr/bin/env node
// MCP stdio server for the learning reviewer: read skills and memory, and
// PROPOSE changes. Proposals are staged by learn.mjs; nothing is applied here.
import { createInterface } from "node:readline";
import { listSkills, readMemory, readSkill, stage } from "./learn.mjs";

const SESSION = process.env.WESTCODE_LEARN_SESSION || "";
const MEMORY = process.env.WESTCODE_LEARN_MEMORY === "1";
const SKILLS = process.env.WESTCODE_LEARN_SKILLS !== "0";
const MAX_PROPOSALS = 6;
const viewed = new Set();
let proposals = 0;

const TOOLS = [
  SKILLS && {
    name: "westcode_skills_list",
    description: "List the skills installed for this user (name and description).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  SKILLS && {
    name: "westcode_skill_view",
    description: "Read a skill's full SKILL.md. Required before proposing a change to an existing skill.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
      additionalProperties: false,
    },
  },
  SKILLS && {
    name: "westcode_skill_propose",
    description:
      "Propose a new skill or an improved version of an existing one: the COMPLETE SKILL.md (frontmatter with name and description, then the procedure, then pitfalls). The user approves before it is written.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "kebab-case class-of-work name" },
        content: { type: "string", description: "The whole SKILL.md" },
        why: { type: "string", description: "One sentence: what in the session shows this is worth keeping" },
      },
      required: ["name", "content", "why"],
      additionalProperties: false,
    },
  },
  MEMORY && {
    name: "westcode_memory_view",
    description: 'Read the desk memory: target "user" (about the user) or "memory" (their setup and projects).',
    inputSchema: {
      type: "object",
      properties: { target: { type: "string", enum: ["user", "memory"] } },
      required: ["target"],
      additionalProperties: false,
    },
  },
  MEMORY && {
    name: "westcode_memory_propose",
    description:
      'Propose a memory change. op "add" a one-line fact, "replace" the entry containing `old` with `text`, or "remove" the entry containing `old`. The user approves first.',
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", enum: ["user", "memory"] },
        op: { type: "string", enum: ["add", "replace", "remove"] },
        text: { type: "string" },
        old: { type: "string" },
        why: { type: "string" },
      },
      required: ["target", "op", "why"],
      additionalProperties: false,
    },
  },
].filter(Boolean);

const send = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`);
const text = (t, isError = false) => ({ content: [{ type: "text", text: t }], isError });

function call(name, args = {}) {
  if (name === "westcode_skills_list") {
    const list = listSkills();
    return text(list.length ? list.map((s) => `- ${s.name}: ${s.description}`).join("\n") : "No skills yet.");
  }
  if (name === "westcode_skill_view") {
    const s = readSkill(String(args.name || ""));
    if (!s) return text(`No skill named ${args.name}.`, true);
    viewed.add(String(args.name));
    return text(s.content);
  }
  if (name === "westcode_skill_propose") {
    if (proposals >= MAX_PROPOSALS) return text("Enough proposals for one review.", true);
    if (readSkill(String(args.name || "")) && !viewed.has(String(args.name))) {
      return text(`${args.name} exists: call westcode_skill_view first, then propose the whole improved file.`, true);
    }
    const r = stage({ kind: "skill", name: args.name, content: args.content, why: args.why }, { sessionId: SESSION });
    if (!r.ok) return text(r.error, true);
    proposals++;
    return text(`Staged for the user's approval (${r.record.action} ${args.name}).`);
  }
  if (name === "westcode_memory_view") {
    return text(readMemory(args.target === "user" ? "user" : "memory") || "(empty)");
  }
  if (name === "westcode_memory_propose") {
    if (proposals >= MAX_PROPOSALS) return text("Enough proposals for one review.", true);
    const r = stage(
      { kind: "memory", target: args.target, op: args.op, text: args.text, old: args.old, why: args.why },
      { sessionId: SESSION },
    );
    if (!r.ok) return text(r.error, true);
    proposals++;
    return text("Staged for the user's approval.");
  }
  return text(`Unknown tool ${name}`, true);
}

createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (msg.id === undefined) return; // notifications
  try {
    if (msg.method === "initialize") {
      send({
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          protocolVersion: msg.params?.protocolVersion || "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: "westcode-learn", version: "1" },
        },
      });
    } else if (msg.method === "tools/list") send({ jsonrpc: "2.0", id: msg.id, result: { tools: TOOLS } });
    else if (msg.method === "tools/call") send({ jsonrpc: "2.0", id: msg.id, result: call(msg.params?.name, msg.params?.arguments) });
    else if (msg.method === "ping") send({ jsonrpc: "2.0", id: msg.id, result: {} });
    else send({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: `Method not found: ${msg.method}` } });
  } catch (err) {
    send({ jsonrpc: "2.0", id: msg.id, error: { code: -32000, message: err.message } });
  }
});
