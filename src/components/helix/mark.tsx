import { cn } from "@/lib/utils";

export function HelixMark({ className }: { className?: string }) {
  return (
    <img
      src="/westcode-icon.png"
      alt=""
      className={cn("rounded-[3px] object-cover", className)}
      aria-hidden
    />
  );
}
