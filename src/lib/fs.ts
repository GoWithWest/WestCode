import { uid } from "./utils";
import type { Attachment } from "./types";

export type PickedFolder = {
  name: string;
  path: string;
  language: string;
  hint: string;
};

const TEXT_EXT =
  /\.(md|txt|json|ts|tsx|js|jsx|mjs|cjs|go|rs|py|rb|php|css|scss|html|htm|yml|yaml|toml|svg|xml|sh|bash|zsh|env|sql|graphql|vue|svelte|kt|swift|c|h|cpp|cc|java|cs|r|lua)$/i;

const MAX_TEXT = 80_000;
const MAX_FILES = 8;

export function prettySize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function langFromFilenames(names: string[]): string {
  const ext = names.map((n) => (n.split(".").pop() ?? "").toLowerCase());
  const has = (xs: string[]) => ext.some((e) => xs.includes(e));
  if (has(["ts", "tsx"])) return "TypeScript";
  if (has(["go"])) return "Go";
  if (has(["rs"])) return "Rust";
  if (has(["py"])) return "Python";
  if (has(["swift"])) return "Swift";
  if (has(["kt"])) return "Kotlin";
  if (has(["java"])) return "Java";
  if (has(["rb"])) return "Ruby";
  if (has(["js", "jsx", "mjs"])) return "JavaScript";
  return "Mixed";
}

export async function readAttachments(
  files: FileList | File[],
): Promise<Attachment[]> {
  const list = Array.from(files).slice(0, MAX_FILES);
  const out: Attachment[] = [];
  for (const file of list) {
    const mime = file.type || "application/octet-stream";
    const isText =
      mime.startsWith("text/") ||
      mime === "application/json" ||
      TEXT_EXT.test(file.name);
    if (isText && file.size <= MAX_TEXT) {
      out.push({
        id: uid("file"),
        name: file.name,
        size: file.size,
        mime,
        kind: "text",
        text: await file.text(),
      });
      continue;
    }
    out.push({
      id: uid("file"),
      name: file.name,
      size: file.size,
      mime,
      kind: mime.startsWith("image/") ? "image" : "binary",
    });
  }
  return out;
}

export function formatOutgoing(
  text: string,
  attachments?: Attachment[],
): string {
  const body = text.trim();
  if (!attachments?.length) return body;
  const parts = attachments.map((a) => {
    if (a.kind === "text" && a.text) {
      return `<attached name="${a.name}">\n${a.text.slice(0, 12_000)}\n</attached>`;
    }
    return `<attached name="${a.name}" mime="${a.mime}" size="${a.size}" />`;
  });
  return [body, ...parts].filter(Boolean).join("\n\n");
}

type DirHandle = {
  name: string;
  values: () => AsyncIterableIterator<{ kind: string; name: string }>;
};

export async function pickDirectory(): Promise<PickedFolder | null> {
  const w = window as unknown as {
    showDirectoryPicker?: (opts?: { mode?: string }) => Promise<DirHandle>;
  };
  if (typeof w.showDirectoryPicker === "function") {
    try {
      const handle = await w.showDirectoryPicker({ mode: "read" });
      const names: string[] = [];
      let n = 0;
      for await (const entry of handle.values()) {
        names.push(entry.name);
        n += 1;
        if (n >= 40) break;
      }
      return {
        name: handle.name,
        path: `~/${handle.name}`,
        language: langFromFilenames(names),
        hint: "Opened from this Mac",
      };
    } catch (err) {
      if ((err as Error).name === "AbortError") return null;
      return pickDirectoryInput();
    }
  }
  return pickDirectoryInput();
}

function pickDirectoryInput(): Promise<PickedFolder | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
    const done = (folder: PickedFolder | null) => {
      input.remove();
      resolve(folder);
    };
    input.addEventListener("change", () => {
      const files = input.files;
      if (!files || files.length === 0) {
        done(null);
        return;
      }
      const rel = (files[0] as File & { webkitRelativePath?: string })
        .webkitRelativePath;
      const name = rel?.split("/")[0] || "folder";
      const names = Array.from(files).map((f) => f.name);
      done({
        name,
        path: `~/${name}`,
        language: langFromFilenames(names),
        hint: "Opened from this Mac",
      });
    });
    input.addEventListener("cancel", () => done(null));
    input.click();
  });
}
