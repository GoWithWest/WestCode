import { createContext, useContext } from "react";
import { westcode } from "@/lib/desktop";
import { useHelix } from "@/lib/store";

/** Which session a transcript belongs to, for Preview buttons deep inside it. */
export const SessionIdContext = createContext<string | undefined>(undefined);

export const PREVIEWABLE = /\.(html?|svg|md|markdown|png|jpe?g|gif|webp|avif|pdf)$/i;

/** Open something in the session's preview pane (null outside a session or the app). */
export function usePreview() {
  const sessionId = useContext(SessionIdContext);
  const open = useHelix((s) => s.openArtifact);
  if (!sessionId || !westcode()?.artifact) return null;
  return (what: { path?: string; code?: string; lang?: string }) => void open(sessionId, what);
}
