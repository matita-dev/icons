# Contributing

Thanks for helping. Icon requests, new glyphs, bug fixes and docs fixes are all welcome.

## Request an icon

Open an [icon request](https://github.com/matita-dev/icons/issues/new?template=icon-request.yml).
Say what it's for, so the name and the drawing fit how it will be used.

## Add an icon

Glyphs are drafting primitives on a 24 grid in `src/defs.js`, separated by `;`:

| Code | Primitive | Arguments |
|---|---|---|
| `L` | line | `x1 y1 x2 y2` |
| `P` | open polyline | `x y x y …` |
| `Z` | closed polyline | `x y x y …` |
| `R` | rect | `x y w h` |
| `C` | circle | `cx cy r` |
| `E` | ellipse | `cx cy rx ry` |
| `A` | arc | `cx cy r a0 a1` (degrees, 0 = +x, 90 = down) |
| `Q` | quadratic curve | `x1 y1 cx cy x2 y2` |
| `O` | dot | `cx cy` |

Guidelines:

- Use a short, descriptive kebab-case name that says what the icon shows (`arrow-right`, not `next`).
- Keep to 2–5 primitives and stay inside the 1–23 grid. No fills.
- Don't try to remove the wobble. Overshooting lines, crossed corners and overlapping circles are the style.
- Check it next to its neighbours in `preview/index.html` at 16px and 24px.

Then run:

```sh
npm ci
npm ci --prefix site   # once: the site's own dependencies
npm run build          # lints the sources and builds dist/
npm test
npm run preview        # builds preview/index.html from your local dist/
```

`npm run build` fails if a glyph uses an unknown primitive, has the wrong number of arguments,
leaves the grid, or draws nothing.

## Pull requests

- One icon or one fix per PR where possible.
- Include a screenshot of the new glyph from `preview/index.html`.
- Don't commit `dist/` or `preview/`; they're generated.
- CI must pass (`test` job).

## Releases

Maintainers release by bumping the version and pushing a `v*` tag. GitHub Actions publishes to npm with provenance.

By contributing you agree that your work is released under the MIT license.
