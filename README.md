# decomm avatar

The decomm mark, minus the plug: a rounded socket with two eyes. Same seed, same face, every time.
No CDN, no account, no network after you copy the folder.

```sh
deno task dev
```

## Endpoints

| Path                            | What                                           |
| ------------------------------- | ---------------------------------------------- |
| `GET /`                         | Playground. Optional `?seed=` and `?count=`    |
| `GET /avatar/:seed`             | SVG for that seed                              |
| `GET /api?count=12`             | Page of that many random avatars, Download all |
| `GET /api?count=12&format=json` | `{ count, avatars: [{ seed, url }] }`          |
| `GET /api/zip?seeds=a,b`        | Zip of those SVGs (same faces as the page)     |

`count` defaults to 8, **max 48**. Same cap on zip. `decomm` is the canonical site face.

## Write a file

```sh
deno task svg -- --seed sandbox --out sandbox.svg
```

Sample faces live in `samples/`.

## Carry-in

```sh
deno run -A jsr:@decomm/avatar/init ./avatar
cd avatar
deno task compile
./avatar.sh
```

Or from this repo, on a connected machine:

```sh
deno task compile
```

Copy this folder (including `bin/avatar`) onto the isolated box.

```sh
./avatar.sh
./avatar.sh --seed sandbox --out sandbox.svg
```

`avatar.sh` uses the compiled binary if present, otherwise `deno run`. `--allow-net` is only for the
local playground.
