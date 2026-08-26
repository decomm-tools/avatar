import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { BG, canonicalTraits, renderAvatar, traitsFromSeed } from "./render.ts";

Deno.test("same seed always renders the same SVG", () => {
  assertEquals(renderAvatar("sandbox"), renderAvatar("sandbox"));
});

Deno.test("decomm seed is the canonical outline face", () => {
  const traits = traitsFromSeed("decomm");
  assertEquals(traits.palette.name, "mark");
  assertEquals(traits.palette.style, "outline");
  assertEquals(traits.faceW, canonicalTraits().faceW);
  const svg = renderAvatar("decomm");
  assertStringIncludes(svg, 'fill="none"');
  assertStringIncludes(svg, "#f5b942");
  assertStringIncludes(svg, "#09090b");
});

Deno.test("renders an SVG with a face and two eyes, no plug", () => {
  const svg = renderAvatar("sandbox");
  const rects = svg.match(/<rect/g) ?? [];
  assertEquals(rects.length, 4);
  assertStringIncludes(svg, "<svg");
  assertStringIncludes(svg, "</svg>");
});

Deno.test("different seeds can produce different avatars", () => {
  const a = renderAvatar("alpha");
  const b = renderAvatar("omega");
  assert(a !== b, "expected distinct seeds to pick different traits");
});

Deno.test(".svg suffix does not change the decomm face", () => {
  assertEquals(
    traitsFromSeed("decomm.svg").palette.name,
    traitsFromSeed("decomm").palette.name,
  );
});

Deno.test("every face sits on the same square ink field", () => {
  for (const seed of ["decomm", "sandbox", "usb", "amber", "alpha", "omega"]) {
    const svg = renderAvatar(seed);
    assertStringIncludes(svg, `<rect width="128" height="128" fill="${BG}"/>`);
    assertEquals(svg.includes('rx="64"'), false);
    assertEquals(svg.includes("#f4f4f5"), false);
    assertEquals(svg.includes("#fafafa"), false);
  }
});
