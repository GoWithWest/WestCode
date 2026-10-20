// Code review findings (Claude Desktop's /code-review card): the agent
// reports them through the desk's westcode_report_findings tool and the
// app renders the call's input as a card.

const SEVERITIES = new Set(["high", "medium", "low"]);

/** Validated findings from a tool call's raw input; [] when there are none. */
export function parseFindings(raw) {
  const list = raw && typeof raw === "object" && Array.isArray(raw.findings) ? raw.findings : [];
  return list
    .filter((f) => f && typeof f === "object" && typeof f.summary === "string" && f.summary.trim())
    .slice(0, 50)
    .map((f) => ({
      file: typeof f.file === "string" ? f.file : "",
      ...(Number.isInteger(f.line) && f.line > 0 ? { line: f.line } : {}),
      severity: SEVERITIES.has(f.severity) ? f.severity : "medium",
      summary: f.summary.trim().slice(0, 400),
      ...(typeof f.detail === "string" && f.detail.trim() ? { detail: f.detail.trim().slice(0, 2000) } : {}),
    }));
}

export const FINDINGS_TOOL = "westcode_report_findings";
