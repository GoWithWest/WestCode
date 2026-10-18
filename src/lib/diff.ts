/**
 * Line diff for the edit cards: the agent sends old/new text for the changed
 * region (or whole file); this turns it into rows to render and +/− counts.
 */

export type DiffRow =
  | { kind: "same"; text: string; a: number; b: number }
  | { kind: "del"; text: string; a: number }
  | { kind: "add"; text: string; b: number }
  | { kind: "gap"; skipped: number };

function lines(s: string): string[] {
  if (!s) return [];
  const out = s.replace(/\r\n/g, "\n").split("\n");
  if (out[out.length - 1] === "") out.pop();
  return out;
}

/** Myers-free LCS table diff — inputs are edit regions, so small. Falls back
 * to "all removed, all added" when the product would be too large. */
export function diffLines(oldText: string, newText: string): DiffRow[] {
  const a = lines(oldText);
  const b = lines(newText);
  const n = a.length;
  const m = b.length;
  if (n * m > 4_000_000) {
    return [
      ...a.map((text, i) => ({ kind: "del" as const, text, a: i + 1 })),
      ...b.map((text, j) => ({ kind: "add" as const, text, b: j + 1 })),
    ];
  }
  // lcs[i][j] = LCS length of a[i..] and b[j..]
  const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ kind: "same", text: a[i]!, a: i + 1, b: j + 1 });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      rows.push({ kind: "del", text: a[i]!, a: i + 1 });
      i++;
    } else {
      rows.push({ kind: "add", text: b[j]!, b: j + 1 });
      j++;
    }
  }
  while (i < n) rows.push({ kind: "del", text: a[i]!, a: ++i });
  while (j < m) rows.push({ kind: "add", text: b[j]!, b: ++j });
  return rows;
}

/** Keep `context` unchanged lines around each change; collapse the rest. */
export function withContext(rows: DiffRow[], context = 3): DiffRow[] {
  const keep = new Array<boolean>(rows.length).fill(false);
  rows.forEach((r, idx) => {
    if (r.kind === "add" || r.kind === "del") {
      for (let k = Math.max(0, idx - context); k <= Math.min(rows.length - 1, idx + context); k++) keep[k] = true;
    }
  });
  const out: DiffRow[] = [];
  let skipped = 0;
  rows.forEach((r, idx) => {
    if (keep[idx]) {
      if (skipped) out.push({ kind: "gap", skipped });
      skipped = 0;
      out.push(r);
    } else {
      skipped++;
    }
  });
  if (skipped && out.length) out.push({ kind: "gap", skipped });
  return out;
}

export function diffStats(rows: DiffRow[]): { adds: number; dels: number } {
  let adds = 0;
  let dels = 0;
  for (const r of rows) {
    if (r.kind === "add") adds++;
    else if (r.kind === "del") dels++;
  }
  return { adds, dels };
}

export function statsForDiffs(diffs: { oldText: string; newText: string }[] | undefined) {
  let adds = 0;
  let dels = 0;
  for (const d of diffs ?? []) {
    const s = diffStats(diffLines(d.oldText, d.newText));
    adds += s.adds;
    dels += s.dels;
  }
  return { adds, dels };
}

export type PatchFile = { path: string; oldPath?: string; rows: DiffRow[]; binary?: boolean };

/** Parse `git diff` / `git show` unified output into per-file rows. */
export function parsePatch(patch: string): PatchFile[] {
  const files: PatchFile[] = [];
  let cur: PatchFile | null = null;
  let a = 0;
  let b = 0;
  for (const line of patch.replace(/\r\n/g, "\n").split("\n")) {
    if (line.startsWith("diff --git ")) {
      const m = /^diff --git a\/(.*) b\/(.*)$/.exec(line);
      cur = { path: m?.[2] ?? line.slice(11), rows: [] };
      if (m && m[1] !== m[2]) cur.oldPath = m[1];
      files.push(cur);
      continue;
    }
    if (!cur) {
      if (line.startsWith("--- ") || line.startsWith("@@")) {
        cur = { path: "", rows: [] };
        files.push(cur);
      } else continue;
    }
    if (line.startsWith("+++ ")) {
      const p = line.slice(4).replace(/^b\//, "");
      if (p !== "/dev/null") cur.path = p;
      continue;
    }
    if (line.startsWith("--- ")) {
      const p = line.slice(4).replace(/^a\//, "");
      if (!cur.path && p !== "/dev/null") cur.path = p;
      continue;
    }
    if (/^Binary files /.test(line)) {
      cur.binary = true;
      continue;
    }
    const h = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (h) {
      const prevA = a;
      a = Number(h[1]);
      b = Number(h[2]);
      if (cur.rows.length && a - prevA > 0) cur.rows.push({ kind: "gap", skipped: a - prevA });
      continue;
    }
    if (line.startsWith("+")) cur.rows.push({ kind: "add", text: line.slice(1), b: b++ });
    else if (line.startsWith("-")) cur.rows.push({ kind: "del", text: line.slice(1), a: a++ });
    else if (line.startsWith(" ")) cur.rows.push({ kind: "same", text: line.slice(1), a: a++, b: b++ });
  }
  return files.filter((f) => f.path || f.rows.length);
}
