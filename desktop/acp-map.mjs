// Map ACP session/update notifications to WestCode session events.
//
// Shapes below are the ones the agents actually send (recorded from
// @agentclientprotocol/claude-agent-acp 0.93 and grok 1.0.13 — see
// tests/fixtures/*.jsonl):
//   - tool content is NESTED: [{type:"content", content:{type:"text", text}}]
//     or a diff: [{type:"diff", path, oldText, newText}]
//   - tool_call_update is a PATCH: most updates carry only rawInput, title or
//     _meta; status arrives only on the final one ("completed"/"failed")
//   - the real tool name is in _meta (claudeCode.toolName, "x.ai/tool".name);
//     title is the human label ("Read calc.py")

/** Text of a content block list, whichever nesting the agent used. */
export function contentText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) {
    if (content && typeof content === "object") {
      if (typeof content.text === "string") return content.text;
      if (content.content) return contentText(content.content);
    }
    return "";
  }
  return content
    .map((b) => {
      if (!b || typeof b !== "object") return "";
      if (b.type === "diff") return "";
      if (typeof b.text === "string") return b.text;
      if (b.content) return contentText(b.content);
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function contentDiffs(content) {
  if (!Array.isArray(content)) return [];
  return content
    .filter((b) => b && b.type === "diff" && typeof b.path === "string")
    .map((b) => ({
      path: b.path,
      oldText: typeof b.oldText === "string" ? b.oldText : "",
      newText: typeof b.newText === "string" ? b.newText : "",
    }));
}

function toolName(u) {
  const meta = u._meta || {};
  return (
    meta.claudeCode?.toolName ||
    meta["x.ai/tool"]?.name ||
    u.toolName ||
    u.name ||
    ""
  );
}

function toolStatus(u) {
  const s = String(u.status || "").toLowerCase();
  if (s === "failed" || s === "error" || s === "cancelled") return "error";
  if (s === "completed" || s === "done") return "done";
  if (s === "pending" || s === "in_progress" || s === "running") return "running";
  return undefined;
}

export function extractText(u) {
  if (u.content && typeof u.content === "object" && typeof u.content.text === "string") {
    return u.content.text;
  }
  if (typeof u.text === "string") return u.text;
  return "";
}

export function mapUpdate(params, opts = {}) {
  const u = params.update || params;
  const kind = u.sessionUpdate || u.session_update || "";
  if (opts.replay && (kind === "user_message_chunk" || kind === "user_message")) {
    return { type: "user", text: extractText(u) };
  }
  if (kind === "available_commands_update" || u.availableCommands) {
    const list = u.availableCommands || u.available_commands || [];
    return {
      type: "commands",
      commands: list
        .map((c) => ({
          cmd: String(c.name || c.command || "").replace(/^\//, ""),
          hint: c.description || c.hint || "",
          kind: c.kind === "skill" ? "skill" : "builtin",
        }))
        .filter((c) => c.cmd),
    };
  }
  if (kind === "plan" || kind === "plan_update") {
    const entries = Array.isArray(u.entries) ? u.entries : [];
    return {
      type: "plan",
      plan: entries
        .map((e) => ({
          content: String(e.content || e.title || "").trim(),
          status:
            e.status === "completed" || e.status === "in_progress"
              ? e.status
              : "pending",
        }))
        .filter((e) => e.content),
    };
  }
  if (kind === "usage_update") {
    const used = Number(u.used);
    const size = Number(u.size);
    if (!Number.isFinite(used)) return { type: "noop" };
    return { type: "usage", usage: { used, size: Number.isFinite(size) ? size : 0 } };
  }
  if (kind === "session_info_update") {
    const title = typeof u.title === "string" ? u.title.trim() : "";
    // Claude predicts the user's next prompt here (empty list = no prediction).
    const ps = u._meta?.promptSuggestions;
    const suggestion = ps && Array.isArray(ps.suggestions)
      ? String(ps.suggestions.find((x) => x && String(x.text || "").trim())?.text || "").trim() || null
      : undefined;
    if (!title && suggestion === undefined) return { type: "noop" };
    return { type: "info", ...(title ? { title } : {}), ...(suggestion !== undefined ? { suggestion } : {}) };
  }
  if (kind === "async_task_spawned" || kind === "async_task_state_update") {
    const id = String(u.asyncTaskId || "");
    if (!id) return { type: "noop" };
    return {
      type: "task",
      task: {
        id,
        kind: "background",
        ...(u.description ? { description: String(u.description) } : {}),
        state: kind === "async_task_spawned" ? "running" : String(u.state || "running"),
        ...(u.summary ? { summary: String(u.summary) } : {}),
      },
    };
  }
  if (kind === "subagent_update") {
    const id = String(u.sessionId || "");
    if (!id) return { type: "noop" };
    return {
      type: "task",
      task: {
        id,
        kind: "subagent",
        ...(u.title || u.description ? { description: String(u.title || u.description) } : {}),
        state: String(u.status || "running"),
      },
    };
  }
  if (kind === "current_mode_update") {
    const modeId = u.currentModeId || u.modeId || u.current_mode_id;
    return modeId ? { type: "mode", modeId: String(modeId) } : { type: "noop" };
  }
  if (kind === "user_message_chunk" || kind === "user_message") {
    return { type: "noop" };
  }
  if (kind === "agent_thought_chunk") {
    return { type: "thought", text: extractText(u) };
  }
  if (kind === "agent_message_chunk") {
    return { type: "text", text: extractText(u) };
  }
  if (kind === "tool_call" || kind === "tool_call_update") {
    const raw = u.rawInput && typeof u.rawInput === "object" ? u.rawInput : {};
    const name = toolName(u);
    const title = typeof u.title === "string" ? u.title : "";
    const diffs = contentDiffs(u.content);
    const status = toolStatus(u);
    return {
      type: "tool",
      toolId: u.toolCallId || u.tool_call_id || u.id,
      // Identity name first (the dedupe in extractSendMessages matches on
      // westcode_send_message); a tool_call with nothing better falls back to
      // its title/kind, and an update without a name sends "" so the
      // renderer keeps the recorded one.
      name: name || (kind === "tool_call" ? title || u.kind || "Tool" : ""),
      title,
      toolKind: typeof u.kind === "string" ? u.kind : undefined,
      path:
        u.locations?.[0]?.path ||
        raw.file_path ||
        raw.path ||
        raw.target_file ||
        diffs[0]?.path,
      command: typeof raw.command === "string" ? raw.command : undefined,
      content: contentText(u.content),
      diffs: diffs.length ? diffs : undefined,
      // A patch without a status says nothing about it: undefined keeps the
      // card's current state. A fresh call without one is running.
      status: status ?? (kind === "tool_call" ? "running" : undefined),
    };
  }
  const text = extractText(u);
  if (text) return { type: "text", text };
  return { type: "noop" };
}

/** Event types that belong to a transcript, so session/load can replay them. */
export const TRANSCRIPT_EVENTS = new Set(["user", "text", "thought", "tool"]);

/**
 * The models a session offers. Grok sends them as `models.availableModels`
 * (initialize _meta and session/new); Claude's adapter sends a `model`
 * select in session/new `configOptions`.
 */
export function modelsFrom(init, session) {
  const lists = [
    session?.models?.availableModels,
    init?._meta?.modelState?.availableModels,
    init?._meta?.availableModels,
  ];
  for (const list of lists) {
    if (Array.isArray(list) && list.length) {
      return list
        .map((m) => ({ id: String(m.modelId || m.id || ""), label: String(m.name || m.modelId || m.id || "") }))
        .filter((m) => m.id);
    }
  }
  const opt = (session?.configOptions || []).find(
    (o) => o && (o.category === "model" || o.id === "model") && Array.isArray(o.options),
  );
  if (opt) {
    return opt.options
      .map((o) => ({
        id: String(o.value ?? o.id ?? ""),
        label: o.value === "default" && o.description ? `Default (${o.description})` : String(o.name || o.value || ""),
      }))
      .filter((m) => m.id);
  }
  return [];
}
