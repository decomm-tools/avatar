import { assertEquals, assertStringIncludes } from "@std/assert";
import { init } from "./init.ts";

Deno.test("init copies the carry-in files", async () => {
  const root = await Deno.makeTempDir({ prefix: "decomm-avatar-" });
  try {
    await init(root, { force: true });
    const names = [...Deno.readDirSync(root)].map((entry) => entry.name).sort();
    assertEquals(names, [
      "LICENSE",
      "README.md",
      "avatar.sh",
      "deno.json",
      "limits.ts",
      "main.ts",
      "playground.ts",
      "render.ts",
      "rng.ts",
      "zip.ts",
    ]);
    const main = await Deno.readTextFile(`${root}/main.ts`);
    assertStringIncludes(main, "renderAvatar");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
