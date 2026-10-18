/** Desk memory files hold one fact per entry, separated by "§". */
export function memoryEntries(text: string): string[] {
  return String(text || "")
    .split("§")
    .map((e) => e.trim())
    .filter(Boolean);
}
