#!/usr/bin/env node
/**
 * Generate the flat library SVG avatars (lib-01..lib-12) into public/avatars/.
 * Deterministic: same input → same file, so re-running never churns git.
 *
 * Roster portraits (avery, beck, sable, quinn, lennox, oz) are
 * hand-authored raster-in-SVG files. Do not write those filenames here —
 * same path would clobber the photoreal art.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "avatars");
mkdirSync(out, { recursive: true });

const SKIN = ["#f2c19b", "#e8a878", "#c98a5b", "#a06a42", "#7c4f2e", "#f7d2b0"];
const HAIR = ["#2d2320", "#5b3a24", "#8a5a2b", "#b98a4a", "#d8c0a0", "#3d3d45", "#a5453a", "#1f1f24"];
const BG = ["#7d8db3", "#b3877d", "#7db396", "#b3a67d", "#9b7db3", "#7da8b3", "#b37d95", "#8fb37d"];
const SHIRT = ["#2f3542", "#3d4a5c", "#4a3d5c", "#5c3d46", "#3d5c4a", "#44424a"];

function head(skin) {
  return `<ellipse cx="256" cy="238" rx="118" ry="128" fill="${skin}"/>
  <ellipse cx="138" cy="248" rx="22" ry="30" fill="${skin}"/>
  <ellipse cx="374" cy="248" rx="22" ry="30" fill="${skin}"/>`;
}

function eyes(style) {
  const y = 244;
  const dots = `<circle cx="210" cy="${y}" r="13" fill="#1c1c22"/><circle cx="302" cy="${y}" r="13" fill="#1c1c22"/>
  <circle cx="214" cy="${y - 4}" r="4" fill="#fff"/><circle cx="306" cy="${y - 4}" r="4" fill="#fff"/>`;
  if (style === "glasses") {
    return `${dots}<g stroke="#1c1c22" stroke-width="7" fill="none">
    <circle cx="210" cy="${y}" r="34"/><circle cx="302" cy="${y}" r="34"/><path d="M244 ${y}h24"/></g>`;
  }
  return dots;
}

function brows(hair) {
  return `<path d="M186 208q24 -14 48 -4" stroke="${hair}" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M278 204q24 -10 48 4" stroke="${hair}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
}

function mouth(kind) {
  if (kind === "open") {
    return `<path d="M228 312q28 26 56 0q-8 26 -28 26t-28 -26z" fill="#8c3f3a"/>`;
  }
  return `<path d="M226 314q30 22 60 0" stroke="#8c3f3a" stroke-width="9" fill="none" stroke-linecap="round"/>`;
}

const HAIRSTYLES = {
  short: (c) => `<path d="M138 240q-6 -128 118 -132t118 132q-6 -66 -50 -84q10 22 2 40q-26 -46 -78 -50t-92 34q-14 16 -18 60z" fill="${c}"/>`,
  swoop: (c) => `<path d="M136 246q-10 -134 122 -136q96 2 116 100q-46 -34 -104 -30q22 12 30 32q-70 -28 -128 6q-30 18 -36 28z" fill="${c}"/>`,
  bun: (c) => `<circle cx="256" cy="96" r="42" fill="${c}"/><path d="M138 244q-4 -120 118 -124t118 124q-8 -78 -60 -92q-26 -8 -58 -8t-58 8q-52 14 -60 92z" fill="${c}"/>`,
  long: (c) => `<path d="M132 380q-14 -230 124 -234t124 234q-34 -30 -40 -120q-4 34 -10 52q-16 -56 -20 -88q-40 22 -108 10q-16 40 -22 86q-10 -30 -12 -60q-22 40 -36 120z" fill="${c}"/>`,
  curly: (c) => `<path d="M256 100q66 0 100 44q30 40 22 96q-20 -18 -26 -44q-2 24 -12 38q-10 -36 -34 -56q-52 22 -100 0q-24 20 -34 56q-10 -14 -12 -38q-6 26 -26 44q-8 -56 22 -96q34 -44 100 -44z" fill="${c}"/>`,
  cap: (c) => `<path d="M142 218q0 -104 114 -104t114 104l-14 6q-100 -34 -200 0z" fill="${c}"/><path d="M124 218q132 -44 264 0q10 4 4 14t-16 6q-120 -40 -240 0q-10 4 -16 -6t4 -14z" fill="${c}"/>`,
  buzz: (c) => `<path d="M144 232q-2 -104 112 -108t112 108q-8 -60 -52 -78q-28 -10 -60 -10t-60 10q-44 18 -52 78z" fill="${c}" opacity="0.9"/>`,
};

function avatar({ bg, skin, hair, shirt, style, glasses, mouthKind, headset }) {
  const hs = HAIRSTYLES[style](hair);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="256" fill="${bg}"/>
  <path d="M96 512q10 -110 160 -114t160 114z" fill="${shirt}"/>
  <rect x="232" y="330" width="48" height="60" rx="20" fill="${skin}"/>
  ${head(skin)}
  ${hs}
  ${brows(hair)}
  ${eyes(glasses ? "glasses" : "plain")}
  <path d="M252 268q-4 14 4 20" stroke="#00000022" stroke-width="7" fill="none" stroke-linecap="round"/>
  ${mouth(mouthKind)}
  ${headset ? `<path d="M148 240q-24 4 -20 34t28 26" stroke="#22222a" stroke-width="12" fill="none"/><circle cx="160" cy="304" r="12" fill="#22222a"/><path d="M160 304q40 30 76 30" stroke="#22222a" stroke-width="8" fill="none"/>` : ""}
</svg>\n`;
}

const styles = Object.keys(HAIRSTYLES);
for (let i = 0; i < 12; i++) {
  const cfg = {
    bg: BG[(i * 3) % BG.length],
    skin: SKIN[(i * 5) % SKIN.length],
    hair: HAIR[(i * 7) % HAIR.length],
    shirt: SHIRT[(i * 2) % SHIRT.length],
    style: styles[i % styles.length],
    glasses: i % 3 === 1,
    mouthKind: i % 4 === 2 ? "open" : "smile",
    headset: false,
  };
  writeFileSync(join(out, `lib-${String(i + 1).padStart(2, "0")}.svg`), avatar(cfg));
}

console.log(`Wrote 12 library avatars to ${out} (roster portraits left untouched)`);
