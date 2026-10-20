import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useHelix } from "@/lib/store";
import { SessionPane } from "./session-pane";

/**
 * A session in its own window (Claude Desktop's pop-out). The window is a
 * child of this one and the pane is rendered into it with a portal, so it is
 * the same app state — nothing to sync. Closing the window brings it back.
 */
export function PopOutWindow({ sessionId }: { sessionId: string }) {
  const session = useHelix((s) => s.sessions.find((x) => x.id === sessionId));
  const close = useHelix((s) => s.popIn);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const w = window.open("", `westcode-pop-${sessionId}`, "width=780,height=860");
    if (!w) {
      close(sessionId);
      return;
    }
    const doc = w.document;
    doc.title = "WestCode";
    // Same look: the app's styles, theme attributes and body classes.
    for (const node of document.head.querySelectorAll('style, link[rel="stylesheet"]')) {
      doc.head.appendChild(node.cloneNode(true));
    }
    for (const a of Array.from(document.documentElement.attributes)) doc.documentElement.setAttribute(a.name, a.value);
    doc.body.className = document.body.className;
    doc.body.style.margin = "0";
    const root = doc.createElement("div");
    root.style.height = "100vh";
    root.style.display = "flex";
    root.style.flexDirection = "column";
    doc.body.appendChild(root);
    setHost(root);
    const onClose = () => close(sessionId);
    w.addEventListener("beforeunload", onClose);
    return () => {
      w.removeEventListener("beforeunload", onClose);
      w.close();
    };
  }, [sessionId, close]);

  useEffect(() => {
    if (host && session) host.ownerDocument.title = `${session.title} — WestCode`;
  }, [host, session]);

  if (!host || !session) return null;
  return createPortal(<SessionPane session={session} />, host);
}
