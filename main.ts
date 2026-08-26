/**
 * Deterministic faces from the decomm mark: a rounded socket with two eyes,
 * no plug. Same seed, same SVG, every time. No CDN, no account, no network
 * after you copy the folder.
 *
 * {@linkcode handler} serves the playground and `/avatar/:seed`. For SVG only,
 * import {@linkcode renderAvatar} from `@decomm/avatar/render`.
 *
 * @example Serve the playground
 * ```ts
 * import { handler } from "jsr:@decomm/avatar";
 *
 * Deno.serve({ port: 8000 }, handler);
 * ```
 *
 * @example Write one face
 * ```ts
 * import { renderAvatar } from "jsr:@decomm/avatar/render";
 *
 * Deno.writeTextFile("sandbox.svg", renderAvatar("sandbox"));
 * ```
 *
 * @module
 */
import { DEFAULT_COUNT, MAX_COUNT } from "./limits.ts";
import { combosPage, playground } from "./playground.ts";
import { renderAvatar } from "./render.ts";
import { zipStore } from "./zip.ts";

const AVATAR = new URLPattern({ pathname: "/avatar/:seed" });

const HELP = `decomm avatar

Deterministic faces from the decomm mark (the socket with eyes, no plug).

Serve a playground and /avatar/:seed
  deno task dev

  GET /
  GET /avatar/:seed
  GET /api?count=12          HTML grid of that many faces (max ${MAX_COUNT})
  GET /api?count=12&format=json
  GET /api/zip?seeds=a,b     zip of those SVGs (same max)

Write one SVG
  deno task svg -- --seed sandbox
  deno task svg -- --seed sandbox --out sandbox.svg

Flags:
  --seed <text>   generate this face
  --out <path>    write SVG to a file instead of stdout
  --port <n>      listen port (default 8000)
  --help
`;

/** Flags parsed from `Deno.args` when this module is the program entry. */
export type Args = {
  /** Seed to render as SVG instead of serving the playground. */
  seed?: string;
  /** Path to write that SVG. Omit to print to stdout. */
  out?: string;
  /** Listen port for {@linkcode handler}. Defaults to `8000`. */
  port: number;
  /** Print CLI help and exit. */
  help: boolean;
};

/**
 * Parse CLI flags for the playground / SVG writer.
 *
 * @param args Typically `Deno.args`.
 * @returns Normalized flags. Throws if `--port` is set and is not a positive integer.
 *
 * @example
 * ```ts
 * import { parseArgs } from "jsr:@decomm/avatar";
 * parseArgs(["--seed", "sandbox", "--out", "sandbox.svg"]);
 * ```
 */
export const parseArgs = (args: string[]): Args => {
  const parsed: Args = { port: 8000, help: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--seed") parsed.seed = args[++i];
    else if (arg === "--out") parsed.out = args[++i];
    else if (arg === "--port") parsed.port = Number(args[++i]);
  }
  if (parsed.port && (!Number.isInteger(parsed.port) || parsed.port <= 0)) {
    throw new Error("--port must be a positive integer");
  }
  return parsed;
};

export { DEFAULT_COUNT, MAX_COUNT };

/**
 * Clamp a query-string `count` to `[1, {@linkcode MAX_COUNT}]`.
 *
 * @param raw Value of `?count=`. Empty or non-integer values use `fallback`.
 * @param fallback Used when `raw` is missing or not an integer. Defaults to
 * {@linkcode DEFAULT_COUNT}.
 */
export const parseCount = (raw: string | null, fallback = DEFAULT_COUNT): number => {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(MAX_COUNT, Math.max(1, n));
};

/**
 * `count` fresh hex seeds from `crypto.getRandomValues`.
 *
 * Used by `GET /api` so each grid is a new set of faces.
 *
 * @param count How many seeds to mint (already clamped by {@linkcode parseCount}).
 */
export const comboSeeds = (count: number): string[] =>
  Array.from({ length: count }, () => {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
    return n.toString(16).padStart(8, "0");
  });

const SEED_OK = /^[A-Za-z0-9._-]+$/;

/**
 * Split a `?seeds=` list into unique, filename-safe seeds.
 *
 * Drops empty parts and anything outside `[A-Za-z0-9._-]`. Stops at
 * {@linkcode MAX_COUNT}.
 *
 * @param raw Comma-separated seeds, or `null` if the query param is missing.
 */
export const parseSeeds = (raw: string | null): string[] => {
  if (!raw) return [];
  const seeds: string[] = [];
  for (const part of raw.split(",")) {
    const seed = part.trim();
    if (!seed || !SEED_OK.test(seed)) continue;
    if (seeds.includes(seed)) continue;
    seeds.push(seed);
    if (seeds.length >= MAX_COUNT) break;
  }
  return seeds;
};

const svgHeaders = (): Headers =>
  new Headers({
    "content-type": "image/svg+xml; charset=utf-8",
    "cache-control": "no-store",
  });

const htmlHeaders = (): Headers =>
  new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });

const wantsJson = (req: Request, url: URL): boolean =>
  url.searchParams.get("format") === "json" ||
  (req.headers.get("accept") ?? "").includes("application/json");

/**
 * HTTP handler for the playground, SVG route, JSON grid, and zip download.
 *
 * | Path | Response |
 * | --- | --- |
 * | `GET /` | Playground HTML (`?seed=`, `?count=`) |
 * | `GET /avatar/:seed` | SVG for that seed |
 * | `GET /api?count=12` | HTML grid of that many random faces |
 * | `GET /api?count=12&format=json` | `{ count, avatars: [{ seed, url }] }` |
 * | `GET /api/zip?seeds=a,b` | Zip of those SVGs |
 *
 * Responses are `cache-control: no-store` so the grid does not stick.
 *
 * @example
 * ```ts
 * import { handler } from "jsr:@decomm/avatar";
 * Deno.serve({ port: 8000 }, handler);
 * ```
 */
export const handler = (req: Request): Response => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { allow: "GET, HEAD" },
    });
  }

  const url = new URL(req.url);
  const count = parseCount(url.searchParams.get("count"));

  if (url.pathname === "/") {
    return new Response(playground(count), { headers: htmlHeaders() });
  }

  if (url.pathname === "/api") {
    const seeds = comboSeeds(count);
    if (wantsJson(req, url)) {
      return Response.json({
        count: seeds.length,
        avatars: seeds.map((seed) => ({
          seed,
          url: `/avatar/${encodeURIComponent(seed)}`,
        })),
      }, { headers: { "cache-control": "no-store" } });
    }
    return new Response(combosPage(seeds, MAX_COUNT), { headers: htmlHeaders() });
  }

  if (url.pathname === "/api/zip") {
    const seeds = parseSeeds(url.searchParams.get("seeds"));
    if (seeds.length === 0) {
      return new Response("Pass ?seeds=a,b,c (max " + MAX_COUNT + ")", { status: 400 });
    }
    const zip = zipStore(
      seeds.map((seed) => ({
        name: `${seed}.svg`,
        data: new TextEncoder().encode(renderAvatar(seed)),
      })),
    );
    const body = zip.buffer.slice(
      zip.byteOffset,
      zip.byteOffset + zip.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="decomm-avatars.zip"`,
        "cache-control": "no-store",
      },
    });
  }

  const match = AVATAR.exec(url);
  if (match) {
    const seed = match.pathname.groups.seed ?? "";
    return new Response(renderAvatar(decodeURIComponent(seed)), {
      headers: svgHeaders(),
    });
  }

  return new Response("Not Found", { status: 404 });
};

const writeSvg = async (seed: string, out?: string): Promise<void> => {
  const svg = renderAvatar(seed);
  if (!out) {
    console.log(svg);
    return;
  }
  await Deno.writeTextFile(out, svg);
  console.error(`Wrote ${out}`);
};

if (import.meta.main) {
  try {
    const args = parseArgs(Deno.args);
    if (args.help) {
      console.log(HELP);
    } else if (args.seed !== undefined) {
      if (args.seed === "") throw new Error("--seed needs a value");
      await writeSvg(args.seed, args.out);
    } else {
      Deno.serve({ port: args.port }, handler);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
