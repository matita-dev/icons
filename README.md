# Matita icons

Freehand pencil icons for the web. Lines overshoot their ends like ruled pencil strokes, boxes cross at the corners, circles overlap where the pen closes. Every glyph is deterministic: the same name always draws the same way.

- 173 glyphs · 24 grid · 1.6 stroke · `currentColor`
- Plain, descriptive kebab-case names (`arrow-right`, `trash-2`, `circle-check`)
- Stroke-based, so color and stroke width stay yours to change
- Pencil variant with uneven pressure, a faint second pass and graphite grain

## Install

```sh
npm i @matita/icons
```

## Use

```jsx
import { ArrowRight, SketchIcon, SketchIconProvider } from '@matita/icons/react';

<ArrowRight size={20} color="#2748F5" />
<SketchIcon name="crosshair" pencil />
<SketchIconProvider size={24} strokeWidth={1.4}>…</SketchIconProvider>
```

```js
import { Ruler, toSvg } from '@matita/icons';
toSvg(Ruler, { size: 24 });               // SVG string
```

```html
<i data-sketch-icon="ruler" data-size="24"></i>
<script src="https://cdn.jsdelivr.net/npm/@matita/icons/dist/umd/sketch-icons.min.js"></script>
<script>SketchIcons.replaceIcons({ icons: SketchIcons.icons });</script>
```

Plain files: `@matita/icons/icons/<name>.svg`, `@matita/icons/pencil/<name>.svg`, `@matita/icons/sprite.svg`, `@matita/icons/icons.json`. For the pencil grain, import `@matita/icons/pencil.css`.

## Add an icon

Glyphs are drafting primitives on a 24 grid in `src/defs.js`:

`L` line · `P` polyline · `Z` closed · `R` rect · `C` circle · `E` ellipse · `A` arc · `Q` curve · `O` dot

Keep to 2–5 primitives, stay inside the 1–23 grid, no fills, short descriptive kebab-case names. Then `npm run build && npm test`.

## Develop

```sh
npm ci
npm run build   # lint + dist
npm test
```

The site (matita.dev) lives in `site/` as its own project and is built from the published package on npm:

```sh
npm ci --prefix site
npm --prefix site run build   # preview/ from the @matita/icons version pinned in site/package.json
npm run preview               # or: build dist/, then the site from it, to check unreleased glyphs
```

## License

MIT © Matita contributors
