import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pen, RectangleHorizontal, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mark = { tool: "pen" | "box"; color: string; points: [number, number][] };
const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

function draw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, marks: Mark[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(img, 0, 0);
  const w = Math.max(3, Math.round(img.naturalWidth / 300));
  for (const m of marks) {
    ctx.strokeStyle = m.color;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (m.tool === "box" && m.points.length > 1) {
      const [a, b] = [m.points[0]!, m.points[m.points.length - 1]!];
      ctx.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    } else {
      ctx.beginPath();
      m.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
  }
}

/**
 * Mark up a screenshot before it goes to the agent (Claude Desktop's
 * screenshot annotation): pen and box in a few colours, undo.
 */
export function AnnotateDialog({ src, onDone }: { src: string | null; onDone: (file: File | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [tool, setTool] = useState<Mark["tool"]>("box");
  const [color, setColor] = useState(COLORS[0]!);
  const drawing = useRef<Mark | null>(null);

  useEffect(() => {
    setMarks([]);
    if (!src) return;
    const i = new Image();
    i.onload = () => {
      img.current = i;
      const c = canvas.current;
      if (!c) return;
      c.width = i.naturalWidth;
      c.height = i.naturalHeight;
      draw(c.getContext("2d")!, i, []);
    };
    i.src = src;
  }, [src]);

  useEffect(() => {
    const c = canvas.current;
    if (c && img.current) draw(c.getContext("2d")!, img.current, drawing.current ? [...marks, drawing.current] : marks);
  }, [marks]);

  const at = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height];
  };

  return (
    <Dialog.Root open={Boolean(src)} onOpenChange={(o) => !o && onDone(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/70" />
        <Dialog.Content className="fixed inset-4 z-50 m-auto flex max-h-[90dvh] max-w-5xl flex-col rounded-xl border border-border bg-surface p-4 shadow-window focus:outline-none">
          <div className="flex items-center gap-2">
            <Dialog.Title className="mr-auto text-sm font-medium">Mark up the screenshot</Dialog.Title>
            {(["box", "pen"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tool === t}
                aria-label={t === "box" ? "Box" : "Pen"}
                onClick={() => setTool(t)}
                className={cn("rounded-md p-1.5 text-muted-foreground hover:bg-muted", tool === t && "bg-muted text-foreground")}
              >
                {t === "box" ? <RectangleHorizontal className="size-4" /> : <Pen className="size-4" />}
              </button>
            ))}
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={cn("size-5 rounded-full border-2", color === c ? "border-foreground" : "border-transparent")}
                style={{ background: c }}
              />
            ))}
            <button
              type="button"
              aria-label="Undo"
              disabled={!marks.length}
              onClick={() => setMarks((m) => m.slice(0, -1))}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
            >
              <Undo2 className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-background">
            <canvas
              ref={canvas}
              aria-label="Screenshot"
              className="max-h-full max-w-full cursor-crosshair touch-none object-contain"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                drawing.current = { tool, color, points: [at(e)] };
              }}
              onPointerMove={(e) => {
                if (!drawing.current) return;
                drawing.current.points.push(at(e));
                const c = canvas.current;
                if (c && img.current) draw(c.getContext("2d")!, img.current, [...marks, drawing.current]);
              }}
              onPointerUp={() => {
                const m = drawing.current;
                drawing.current = null;
                if (m && m.points.length > 1) setMarks((list) => [...list, m]);
              }}
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onDone(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                canvas.current?.toBlob((b) => onDone(b ? new File([b], "screenshot.png", { type: "image/png" }) : null), "image/png")
              }
            >
              Attach
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
