import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { zipStore } from "./zip.ts";

Deno.test("zipStore writes a PK zip with named entries", () => {
  const zip = zipStore([
    { name: "a.svg", data: new TextEncoder().encode("<svg>a</svg>") },
    { name: "b.svg", data: new TextEncoder().encode("<svg>b</svg>") },
  ]);
  assertEquals(zip[0], 0x50);
  assertEquals(zip[1], 0x4b);
  const text = new TextDecoder().decode(zip);
  assertStringIncludes(text, "a.svg");
  assertStringIncludes(text, "b.svg");
  assert(zip.length > 80);
});
