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
    .map((f) => {
      // Claude Code's own ReportFindings has no severity (ranked most severe
      // first) and calls the detail failure_scenario.
      const detail = typeof f.detail === "string" ? f.detail : typeof f.failure_scenario === "string" ? f.failure_scenario : "";
      return {
        file: typeof f.file === "string" ? f.file : "",
        ...(Number.isInteger(f.line) && f.line > 0 ? { line: f.line } : {}),
        // No severity given (ReportFindings ranks instead): the card shows the rank.
        ...(SEVERITIES.has(f.severity) ? { severity: f.severity } : {}),
        summary: f.summary.trim().slice(0, 400),
        ...(detail.trim() ? { detail: detail.trim().slice(0, 2000) } : {}),
      };
    });
}

/** The tool calls that carry findings: WestCode's desk tool and Claude Code's ReportFindings. */
export function isFindingsTool(label) {
  return /westcode_report_findings|(^|[^a-z])ReportFindings\b/.test(String(label || ""));
}

export const FINDINGS_TOOL = "westcode_report_findings";
