/**
 * Parametric SVG faces from a seed: socket body, two eyes, one ink square.
 *
 * The tile background never changes. Seed `decomm` always hits
 * {@linkcode canonicalTraits}. Every other seed is a slight combination of
 * palette, size, and eye geometry via a seeded RNG.
 *
 * @example
 * ```ts
 * import { renderAvatar } from "jsr:@decomm/avatar/render";
 *
 * const svg = renderAvatar("sandbox");
 * ```
 *
 * @module
 */
import { hashString, Seeded } from "./rng.ts";

/** Width and height of every avatar, in SVG user units. */
export const SIZE = 128;

/** Outline stroke vs solid fill for the socket body. */
export type FaceStyle = "outline" | "filled";

/** Named ink pair for the socket body and eyes. */
export type Palette = {
  /** Stable palette id (`mark`, `solid`, `warm`, …). */
  name: string;
  /** Socket body color (stroke or fill, depending on {@linkcode FaceStyle}). */
  body: string;
  /** Eye fill. Outline palettes match the body; filled palettes use the ink field. */
  eyes: string;
  /** Whether the socket is stroked or filled. */
  style: FaceStyle;
};

/** Geometry and palette for one face. Same seed always yields the same traits. */
export type Traits = {
  /** Seed these traits were derived from. */
  seed: string;
  /** Palette picked for this seed. */
  palette: Palette;
  /** Socket width. */
  faceW: number;
  /** Socket height. */
  faceH: number;
  /** Socket corner radius. */
  faceRx: number;
  /** Stroke width when {@linkcode FaceStyle} is `outline`. */
  strokeW: number;
  /** Eye width. */
  eyeW: number;
  /** Right-eye height (left eye is this times {@linkcode Traits.leftEyeScale}). */
  eyeH: number;
  /** Gap between the two eyes. */
  eyeGap: number;
  /** Offset of the eye pair from the top of the socket. */
  eyeTop: number;
  /** Eye corner radius. */
  eyeRx: number;
  /** Left-eye height as a fraction of {@linkcode Traits.eyeH}. */
  leftEyeScale: number;
};

/** Same ink field as the site. Faces change; the tile does not. */
export const BG = "#09090b";
const INK = BG;

const PALETTES: readonly Palette[] = [
  { name: "mark", body: "#f5b942", eyes: "#f5b942", style: "outline" },
  { name: "solid", body: "#f5b942", eyes: INK, style: "filled" },
  { name: "warm", body: "#e8a317", eyes: "#e8a317", style: "outline" },
  { name: "warm-solid", body: "#e8a317", eyes: INK, style: "filled" },
  { name: "cream", body: "#fde68a", eyes: "#fde68a", style: "outline" },
  { name: "cream-solid", body: "#fde68a", eyes: INK, style: "filled" },
  { name: "mute", body: "#a1a1aa", eyes: "#a1a1aa", style: "outline" },
  { name: "mute-solid", body: "#a1a1aa", eyes: INK, style: "filled" },
];

const round = (n: number): number => Math.round(n * 10) / 10;

/**
 * Centered, plug-less version of the site mark.
 *
 * Seed `decomm` always hits this. Pass another seed only to keep
 * {@linkcode Traits.seed} in sync with the request.
 *
 * @param seed Stored on the returned traits. Geometry is fixed.
 */
export const canonicalTraits = (seed = "decomm"): Traits => ({
  seed,
  palette: PALETTES[0],
  faceW: 44,
  faceH: 60,
  faceRx: 12,
  strokeW: 7,
  eyeW: 7,
  eyeH: 20,
  eyeGap: 5,
  eyeTop: 16,
  eyeRx: 2,
  leftEyeScale: 1,
});

/**
 * Map a seed to {@linkcode Traits}.
 *
 * A trailing `.svg` is stripped. `decomm` returns {@linkcode canonicalTraits};
 * every other seed is a combination of the eight palettes and a tight range of
 * sizes around the mark.
 *
 * @param seed Any string. Same input, same traits.
 */
export const traitsFromSeed = (seed: string): Traits => {
  const key = seed.endsWith(".svg") ? seed.slice(0, -4) : seed;
  if (key === "decomm") return canonicalTraits(seed);

  const rng = new Seeded(hashString(seed));
  const palette = rng.pick(PALETTES);
  const faceW = round(rng.nextFloat(42, 56));
  const faceH = round(rng.nextFloat(54, 68));
  return {
    seed,
    palette,
    faceW,
    faceH,
    faceRx: round(rng.nextFloat(faceW * 0.16, faceW * 0.3)),
    strokeW: round(rng.nextFloat(5.5, 8.5)),
    eyeW: round(rng.nextFloat(6, 9.5)),
    eyeH: round(rng.nextFloat(16, 26)),
    eyeGap: round(rng.nextFloat(4, 8)),
    eyeTop: round(rng.nextFloat(12, 20)),
    eyeRx: round(rng.nextFloat(1.2, 3.2)),
    leftEyeScale: round(rng.nextFloat(0.88, 1)),
  };
};

/**
 * Render one 128×128 SVG for `seed`.
 *
 * @param seed Face id. `decomm` is the site mark; anything else is a
 * deterministic combination.
 * @returns A complete SVG document string.
 *
 * @example
 * ```ts
 * import { renderAvatar } from "jsr:@decomm/avatar/render";
 * renderAvatar("decomm");
 * ```
 */
export const renderAvatar = (seed: string): string => {
  const t = traitsFromSeed(seed);
  const { palette } = t;
  const faceX = round((SIZE - t.faceW) / 2);
  const faceY = round((SIZE - t.faceH) / 2);
  const pairW = t.eyeW + t.eyeGap + t.eyeW;
  const eyeX = round(faceX + (t.faceW - pairW) / 2);
  const eyeY = round(faceY + t.eyeTop);
  const leftH = round(t.eyeH * t.leftEyeScale);
  const leftY = round(eyeY + (t.eyeH - leftH) / 2);
  const rightX = round(eyeX + t.eyeW + t.eyeGap);

  const faceFill = palette.style === "filled" ? palette.body : "none";
  const faceStroke = palette.style === "outline"
    ? ` stroke="${palette.body}" stroke-width="${t.strokeW}"`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" role="img">
  <title>decomm avatar</title>
  <rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>
  <rect x="${faceX}" y="${faceY}" width="${t.faceW}" height="${t.faceH}" rx="${t.faceRx}" fill="${faceFill}"${faceStroke} stroke-linejoin="round"/>
  <rect x="${eyeX}" y="${leftY}" width="${t.eyeW}" height="${leftH}" rx="${t.eyeRx}" fill="${palette.eyes}"/>
  <rect x="${rightX}" y="${eyeY}" width="${t.eyeW}" height="${t.eyeH}" rx="${t.eyeRx}" fill="${palette.eyes}"/>
</svg>
`;
};
