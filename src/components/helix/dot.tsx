import { useId, type ReactNode } from "react";
import type { DotAccessory, DotLook, DotShape, DotState } from "@/lib/dots";
import { cn } from "@/lib/utils";

/** Body outlines on a 100×100 canvas; the body is clipped to these. */
function Body({ shape }: { shape: DotShape }): ReactNode {
  switch (shape) {
    case "sphere":
      return <circle cx="50" cy="55" r="38" />;
    case "squircle":
      return <rect x="13" y="18" width="74" height="74" rx="28" />;
    case "heart":
      return (
        <path d="M50 91C26 74 9 59 11 38 13 21 30 13 42 20c4 2 6 5 8 8 2-3 4-6 8-8 12-7 29 1 31 18 2 21-15 36-39 53Z" />
      );
    case "gumdrop":
      return <path d="M50 15c9 0 18 15 27 33 8 16 13 26 11 33-3 10-17 11-38 11s-35-1-38-11c-2-7 3-17 11-33 9-18 18-33 27-33Z" />;
    case "cloud":
      return (
        <>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <circle
              key={a}
              cx={50 + 24 * Math.cos((a * Math.PI) / 180)}
              cy={55 + 22 * Math.sin((a * Math.PI) / 180)}
              r="19"
            />
          ))}
          <circle cx="50" cy="55" r="28" />
        </>
      );
    case "flower":
      return (
        <>
          {Array.from({ length: 12 }, (_, i) => (i * 30 * Math.PI) / 180).map((a, i) => (
            <circle key={i} cx={50 + 30 * Math.cos(a)} cy={55 + 30 * Math.sin(a)} r="10" />
          ))}
          <circle cx="50" cy="55" r="32" />
        </>
      );
    case "blob":
      return (
        <>
          <ellipse cx="50" cy="62" rx="40" ry="30" />
          <circle cx="33" cy="34" r="13" />
          <circle cx="67" cy="34" r="13" />
        </>
      );
  }
}

const EYE_Y: Record<DotShape, number> = {
  sphere: 52,
  squircle: 52,
  heart: 48,
  gumdrop: 58,
  cloud: 52,
  flower: 52,
  blob: 34,
};
const EYE_DX: Record<DotShape, number> = {
  sphere: 12,
  squircle: 12,
  heart: 13,
  gumdrop: 11,
  cloud: 12,
  flower: 11,
  blob: 17,
};

function Accessory({ kind, shape }: { kind: DotAccessory; shape: DotShape }) {
  const y = EYE_Y[shape];
  const dx = EYE_DX[shape];
  const top = shape === "blob" ? 20 : shape === "gumdrop" ? 22 : shape === "heart" ? 24 : 18;
  const ink = "#111";
  switch (kind) {
    case "glasses":
      return (
        <g fill="none" stroke={ink} strokeWidth="3">
          <circle cx={50 - dx} cy={y} r="8.5" />
          <circle cx={50 + dx} cy={y} r="8.5" />
          <path d={`M${50 - dx + 8.5} ${y}h${2 * dx - 17}`} />
        </g>
      );
    case "sunglasses":
      return (
        <g fill={ink}>
          <circle cx={50 - dx} cy={y} r="8.5" />
          <circle cx={50 + dx} cy={y} r="8.5" />
          <rect x={50 - dx + 6} y={y - 1.6} width={2 * dx - 12} height="3.2" rx="1.6" />
          <circle cx={50 - dx - 3} cy={y - 3} r="1.6" fill="#fff" opacity=".8" />
        </g>
      );
    case "monocle":
      return (
        <g fill="none" stroke={ink} strokeWidth="2.6">
          <circle cx={50 + dx} cy={y} r="8.5" />
          <path d={`M${50 + dx + 6} ${y + 6}q4 10 -2 22`} strokeWidth="1.6" />
        </g>
      );
    case "beret":
      return (
        <g fill={ink}>
          <ellipse cx="44" cy={top + 2} rx="24" ry="8" transform={`rotate(-10 44 ${top + 2})`} />
          <rect x="45" y={top - 9} width="3" height="6" rx="1.5" />
        </g>
      );
    case "cap":
      return (
        <g fill={ink}>
          <path d={`M28 ${top + 8}c0-11 10-18 22-18s22 7 22 18Z`} />
          <rect x="22" y={top + 6} width="34" height="4.5" rx="2.2" />
        </g>
      );
    case "headphones":
      return (
        <g fill={ink}>
          <path d={`M17 ${y + 4}c0-26 15-38 33-38s33 12 33 38`} fill="none" stroke={ink} strokeWidth="4" />
          <rect x="10" y={y - 4} width="11" height="18" rx="5" />
          <rect x="79" y={y - 4} width="11" height="18" rx="5" />
        </g>
      );
    case "bowtie":
      return (
        <g fill={ink} transform={`translate(0 ${shape === "blob" ? 30 : 30})`}>
          <path d="M50 52l-12-7v14Zm0 0l12-7v14Z" />
          <circle cx="50" cy="52" r="3" />
        </g>
      );
    default:
      return null;
  }
}

/**
 * A bot character. `state` drives the motion: idle floats and blinks,
 * thinking glances around, working sways, speaking pulses, needs-input
 * hops, done hops once, error/paused go grey with closed eyes.
 */
export function Dot({
  look,
  state = "idle",
  size = 40,
  className,
  title,
  still,
}: {
  look: DotLook;
  state?: DotState;
  size?: number;
  className?: string;
  title?: string;
  /** No motion (pickers, thumbnails). */
  still?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const shape = look.shape;
  const y = EYE_Y[shape];
  const dx = EYE_DX[shape];
  const closed = state === "paused" || state === "error";
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("dot-bot shrink-0 overflow-visible", !still && `dot-${state}`, className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <clipPath id={`b${id}`}>
          <Body shape={shape} />
        </clipPath>
        <radialGradient id={`g${id}`} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor={`color-mix(in oklch, ${look.color}, white 42%)`} />
          <stop offset="0.45" stopColor={look.color} />
          <stop offset="1" stopColor={`color-mix(in oklch, ${look.color}, black 22%)`} />
        </radialGradient>
      </defs>
      <ellipse className="dot-shadow" cx="50" cy="95" rx="26" ry="3.5" fill="#000" opacity=".28" />
      <g className="dot-body">
        <g clipPath={`url(#b${id})`}>
          <rect width="100" height="100" fill={`url(#g${id})`} />
          <ellipse cx="36" cy="32" rx="16" ry="9" fill="#fff" opacity=".28" transform="rotate(-24 36 32)" />
        </g>
        <g className="dot-eyes">
          {closed ? (
            <g fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round">
              <path d={`M${50 - dx - 4} ${y}q4 4 8 0`} />
              <path d={`M${50 + dx - 4} ${y}q4 4 8 0`} />
            </g>
          ) : (
            <g fill="#111">
              <ellipse className="dot-eye" cx={50 - dx} cy={y} rx="3.6" ry="6" />
              <ellipse className="dot-eye" cx={50 + dx} cy={y} rx="3.6" ry="6" />
            </g>
          )}
        </g>
        <Accessory kind={look.accessory} shape={shape} />
      </g>
      {state === "needs-input" ? (
        <circle cx="86" cy="18" r="9" fill="var(--color-warn)" stroke="var(--color-window)" strokeWidth="3" />
      ) : null}
    </svg>
  );
}
