// westcode://new?folder=…&q=…&host=…&provider=… → what the New session dialog
// is filled in with. Only these fields; nothing in a link is ever run.
export function parseDeepLink(raw) {
  let u;
  try {
    u = new URL(String(raw));
  } catch {
    return null;
  }
  if (u.protocol !== "westcode:") return null;
  const what = (u.hostname || u.pathname.replace(/^\/+/, "")).toLowerCase();
  if (what !== "new") return null;
  const get = (k) => (u.searchParams.get(k) || "").slice(0, 4000);
  return { action: "new", folder: get("folder"), prompt: get("q"), host: get("host"), provider: get("provider") };
}
