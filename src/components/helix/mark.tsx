import { cn } from "@/lib/utils";

export function HelixMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("text-foreground", className)}
      aria-hidden
    >
      <path
        d="M8 3c4.2 2.4 4.2 5.6 0 8 4.2 2.4 4.2 5.6 0 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M16 3c-4.2 2.4-4.2 5.6 0 8-4.2 2.4-4.2 5.6 0 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
