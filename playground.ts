const STYLES = `
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font: 16px/1.5 ui-sans-serif, system-ui, sans-serif;
      background: #09090b;
      color: #fafafa;
    }
    main { max-width: 40rem; margin: 0 auto; padding: 4rem 1.25rem 5rem; }
    h1 { font-size: 1.75rem; letter-spacing: -0.03em; margin: 0 0 0.35rem; }
    .lede { color: #a1a1aa; margin: 0 0 2rem; }
    .lede code, .meta code {
      font: 13px/1.4 ui-monospace, Menlo, monospace; color: #f5b942;
    }
    .hero {
      display: flex; flex-direction: column; align-items: center; gap: 1.25rem;
      padding: 2rem 1rem 1.5rem;
      border: 1px solid #27272a; border-radius: 1.25rem; background: #111113;
    }
    .hero img {
      width: 10rem; height: 10rem;
      background: #09090b;
      border: 1px solid #27272a;
    }
    label { display: block; width: 100%; max-width: 22rem; }
    label span { display: block; font-size: 0.75rem; color: #a1a1aa; margin-bottom: 0.35rem; }
    input {
      width: 100%; padding: 0.6rem 0.75rem; border-radius: 0.6rem;
      border: 1px solid #27272a; background: #09090b; color: #fafafa;
      font: 14px/1.4 ui-monospace, Menlo, monospace;
    }
    .row { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
    button {
      border: 0; border-radius: 999px; padding: 0.55rem 1rem;
      font: 600 0.875rem/1 ui-sans-serif, system-ui, sans-serif;
      cursor: pointer;
    }
    button, a.download {
      background: #f5b942; color: #09090b; text-decoration: none;
    }
    button.ghost { background: transparent; color: #fafafa; border: 1px solid #27272a; }
    a.download {
      display: inline-flex; align-items: center;
      border-radius: 999px; padding: 0.55rem 1rem;
      font: 600 0.875rem/1 ui-sans-serif, system-ui, sans-serif;
    }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; margin: 0 0 1rem; }
    .url { width: 100%; max-width: 22rem; color: #a1a1aa; font: 12px/1.4 ui-monospace, Menlo, monospace; }
    h2 { font-size: 1rem; margin: 2.5rem 0 0.75rem; }
    .meta { color: #a1a1aa; font-size: 0.875rem; margin: 0 0 1rem; }
    .grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;
    }
    .grid a, .grid .cell { display: block; }
    .grid img {
      width: 100%; aspect-ratio: 1; border: 1px solid #27272a; background: #09090b;
    }
    @media (max-width: 40rem) { .grid { grid-template-columns: repeat(2, 1fr); } }
`;

const wrap = (title: string, body: string): string =>
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="Deterministic decomm-face avatars from a seed. Same seed, same face." />
  <link rel="icon" href="/avatar/decomm" type="image/svg+xml" />
  <style>${STYLES}</style>
</head>
<body>
  ${body}
</body>
</html>
`;

export const playground = (count: number): string =>
  wrap(
    "decomm avatar",
    `
  <main>
    <h1>decomm avatar</h1>
    <p class="lede">The site mark, minus the plug. Same seed, same face, every time. Combos: <code>/api?count=${count}</code></p>
    <div class="hero">
      <img id="face" alt="avatar" width="160" height="160" />
      <label>
        <span>Seed</span>
        <input id="seed" spellcheck="false" autocomplete="off" />
      </label>
      <div class="row">
        <button type="button" id="roll">Roll</button>
        <button type="button" class="ghost" id="copy">Copy URL</button>
      </div>
      <input class="url" id="url" readonly title="Avatar URL" />
    </div>
    <h2>Slight combinations</h2>
    <p class="meta"><a href="/api?count=${count}" style="color:#f5b942">/api?count=${count}</a></p>
    <div class="grid" id="grid"></div>
  </main>
  <script>
    const face = document.getElementById("face");
    const seedInput = document.getElementById("seed");
    const urlInput = document.getElementById("url");
    const count = ${count};

    const avatarPath = (seed) => "/avatar/" + encodeURIComponent(seed);

    const show = (seed) => {
      const next = seed || "decomm";
      seedInput.value = next;
      face.src = avatarPath(next);
      urlInput.value = new URL(avatarPath(next), location.href).href;
      const params = new URLSearchParams(location.search);
      if (params.get("seed") !== next) {
        params.set("seed", next);
        history.replaceState(null, "", "?" + params.toString());
      }
    };

    const roll = () => {
      const seed = Math.floor(Math.random() * 16777215).toString(16);
      show(seed);
    };

    seedInput.addEventListener("input", () => show(seedInput.value.trim() || "decomm"));
    document.getElementById("roll").addEventListener("click", roll);
    document.getElementById("copy").addEventListener("click", async () => {
      urlInput.select();
      try { await navigator.clipboard.writeText(urlInput.value); } catch {}
    });
    urlInput.addEventListener("click", () => urlInput.select());

    const grid = document.getElementById("grid");
    fetch("/api?count=" + count + "&format=json")
      .then((res) => res.json())
      .then((data) => {
        for (const item of data.avatars) {
          const a = document.createElement("a");
          a.href = "?seed=" + encodeURIComponent(item.seed);
          a.innerHTML = "<img alt=\\"combo\\" src=\\"" + avatarPath(item.seed) + "\\" />";
          a.addEventListener("click", (event) => {
            event.preventDefault();
            show(item.seed);
          });
          grid.append(a);
        }
      });

    const start = new URLSearchParams(location.search).get("seed");
    show(start || "decomm");
  </script>
`,
  );

const avatarWord = (n: number): string => (n === 1 ? "avatar" : "avatars");

export const combosPage = (seeds: string[], maxCount: number): string => {
  const n = seeds.length;
  const cells = seeds
    .map(
      (seed) =>
        `<a class="cell" href="/?seed=${encodeURIComponent(seed)}"><img alt="" src="/avatar/${
          encodeURIComponent(seed)
        }" width="128" height="128" /></a>`,
    )
    .join("");
  const zipHref = `/api/zip?seeds=${seeds.map(encodeURIComponent).join(",")}`;
  return wrap(
    `${n} decomm ${avatarWord(n)}`,
    `
  <main>
    <h1>${n} ${avatarWord(n)}</h1>
    <p class="lede"><a href="/" style="color:#f5b942">decomm avatar</a> · <code>/api?count=${n}</code> · max ${maxCount}</p>
    <p class="actions"><a class="download" href="${zipHref}">Download all</a></p>
    <div class="grid">${cells}</div>
  </main>
`,
  );
};
