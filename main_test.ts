import { assertEquals, assertStringIncludes } from "@std/assert";
import { handler, parseArgs, parseCount, parseSeeds } from "./main.ts";
import { renderAvatar } from "./render.ts";

const req = (path: string, method = "GET"): Request =>
  new Request(new URL(path, "http://localhost"), { method });

Deno.test("GET /avatar/:seed returns SVG", async () => {
  const res = await handler(req("/avatar/sandbox"));
  assertEquals(res.status, 200);
  assertStringIncludes(res.headers.get("content-type") ?? "", "image/svg+xml");
  assertEquals(res.headers.get("cache-control"), "no-store");
  const body = await res.text();
  assertEquals(body, renderAvatar("sandbox"));
});

Deno.test("GET / serves the playground without named people", async () => {
  const res = await handler(req("/"));
  assertEquals(res.status, 200);
  assertStringIncludes(res.headers.get("content-type") ?? "", "text/html");
  const body = await res.text();
  assertStringIncludes(body, "decomm avatar");
  assertStringIncludes(body, "/api?count=");
  assertEquals(body.includes("holden"), false);
});

Deno.test("GET /api?count=5 returns that many faces", async () => {
  const res = await handler(req("/api?count=5"));
  assertEquals(res.status, 200);
  const body = await res.text();
  assertStringIncludes(body, "5 avatars");
  assertStringIncludes(body, "Download all");
  assertStringIncludes(body, "/api/zip?seeds=");
  assertStringIncludes(body, "max 48");
  assertEquals([...body.matchAll(/<img /g)].length, 5);
});

Deno.test("GET /api?count=3&format=json returns JSON", async () => {
  const res = await handler(req("/api?count=3&format=json"));
  assertEquals(res.status, 200);
  const data = await res.json() as {
    count: number;
    avatars: { seed: string; url: string }[];
  };
  assertEquals(data.count, 3);
  assertEquals(data.avatars.length, 3);
  assertStringIncludes(data.avatars[0]!.url, "/avatar/");
});

Deno.test("parseCount clamps", () => {
  assertEquals(parseCount(null), 8);
  assertEquals(parseCount("12"), 12);
  assertEquals(parseCount("0"), 1);
  assertEquals(parseCount("999"), 48);
});

Deno.test("GET /api/zip?seeds= packs those SVGs", async () => {
  const res = await handler(req("/api/zip?seeds=sandbox,decomm"));
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("content-type"), "application/zip");
  const bytes = new Uint8Array(await res.arrayBuffer());
  assertEquals(bytes[0], 0x50);
  assertEquals(bytes[1], 0x4b);
  const text = new TextDecoder().decode(bytes);
  assertStringIncludes(text, "sandbox.svg");
  assertStringIncludes(text, "decomm.svg");
});

Deno.test("GET /api/zip without seeds is 400", async () => {
  const res = await handler(req("/api/zip"));
  assertEquals(res.status, 400);
});

Deno.test("parseSeeds drops junk and caps", () => {
  assertEquals(parseSeeds("sandbox,decomm"), ["sandbox", "decomm"]);
  assertEquals(parseSeeds("../x,ok"), ["ok"]);
  assertEquals(
    parseSeeds(Array.from({ length: 60 }, (_, i) => `s${i}`).join(",")).length,
    48,
  );
});

Deno.test("unknown paths 404", async () => {
  const res = await handler(req("/nope"));
  assertEquals(res.status, 404);
});

Deno.test("POST is rejected", async () => {
  const res = await handler(req("/avatar/sandbox", "POST"));
  assertEquals(res.status, 405);
});

Deno.test("parseArgs reads seed and out", () => {
  const args = parseArgs(["--seed", "sandbox", "--out", "sandbox.svg"]);
  assertEquals(args.seed, "sandbox");
  assertEquals(args.out, "sandbox.svg");
});

const avatarSh = async (
  args: string[],
): Promise<{ stdout: string; stderr: string }> => {
  const proc = new Deno.Command("sh", {
    args: [`${Deno.cwd()}/avatar.sh`, ...args],
    cwd: Deno.cwd(),
    stdout: "piped",
    stderr: "piped",
  });
  const out = await proc.output();
  const stdout = new TextDecoder().decode(out.stdout);
  const stderr = new TextDecoder().decode(out.stderr);
  if (!out.success) throw new Error(stderr || stdout);
  return { stdout, stderr };
};

Deno.test("avatar.sh --seed writes the carry-in SVG", async () => {
  const dir = await Deno.makeTempDir({ prefix: "decomm-avatar-sh-" });
  try {
    const out = `${dir}/sandbox.svg`;
    const { stderr } = await avatarSh(["--seed", "sandbox", "--out", out]);
    assertStringIncludes(stderr, out);
    assertEquals(await Deno.readTextFile(out), renderAvatar("sandbox"));
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
