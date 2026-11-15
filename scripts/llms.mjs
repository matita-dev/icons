/* The AI guide files, generated from the same data as everything else:
     dist/llms.txt       short guide: when to use, install, import, props, hazards, every glyph name
     dist/llms-full.txt  the same guide plus a keyword line per glyph and the alternate-name table
   One generator, so a count or a name cannot drift: scripts/build.mjs writes the files, test/llms.test.mjs rebuilds them
   from the sources and compares, and the site build can read the shipped files instead of keeping its own copy. */

const SITE = 'https://matita.dev/';
const REPO = 'https://github.com/matita-dev/icons';
const pascal = n => n.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

/* Names that exist in other icon sets with a different drawing. Matita keeps its drawing; this is the warning. */
export const HAZARDS = [
  '`chart-bar` draws vertical bars (columns). Names such as `chart-column` and `bar-chart` point at it. There is no horizontal-bar glyph yet, so do not expect one.',
  '`loader` draws an arc, not a ring of spokes. `loader-circle` and `loader-2` are the same arc. Spin it with CSS (`animate-spin`) if it should turn.'
];

/* Sizes the files promise, checked by the build and the tests so a long list cannot slip in unnoticed. */
export const LIMITS = { short: 12 * 1024, full: 36 * 1024 };

export function buildLlms({ version, names, keywords, aliases, approximate, shadcnCount }) {
  const n = names.length, a = Object.keys(aliases).length, approx = new Set(approximate);
  const example = names.includes('arrow-right') && names.includes('search') ? ['ArrowRight', 'Search'] : [pascal(names[0]), pascal(names[1])];
  const guide = `# Matita icons

> ${n} pencil-style icons for the web, as React components and SVG files. Each icon is a short recipe of simple shapes on a 24 grid that code draws like a pencil would; the same name always draws the same way. Strokes only, \`currentColor\`, MIT licensed. Version ${version}.

## When to use

Use Matita when the project already imports \`@matita/icons\`, or when the user asks for a hand-drawn, pencil or sketch look. Do not replace another icon set that is in use unless asked. Use only the names listed below: if none fits, say so and ask for the icon at ${REPO}/issues/new?template=icon-request.yml instead of inventing a name.

## Install and import

- Install: \`npm i @matita/icons\`. ESM only, no \`require()\`.
- Import named components, so a bundler keeps only the icons you use:

\`\`\`tsx
import { ${example[1]}Icon } from '@matita/icons/react';

export function Row() {
  return <button aria-label="Search"><${example[1]}Icon size={20} /></button>;
}
\`\`\`

- Every icon is exported as \`PascalCase\` and \`PascalCaseIcon\` (\`arrow-right\` is \`ArrowRight\` and \`ArrowRightIcon\`).
- Next.js App Router: the React and shadcn entries carry the \`'use client'\` directive, so you can import an icon in a server component page and it renders as a client component. Pass props that can be serialized (numbers, strings), not functions.
- Plain JavaScript: \`import { ${example[0]}, toSvg } from '@matita/icons'; toSvg(${example[0]}, { size: 24 })\`
- By name, only when the name comes from data at run time: \`<SketchIcon name="search" />\`. It loads the whole set; named imports do not.
- shadcn/ui: \`import { ChevronDownIcon } from '@matita/icons/shadcn'\` gives ${shadcnCount} components named like the icons the shadcn CLI writes into components.
- Plain files: \`@matita/icons/icons/<name>.svg\`, \`@matita/icons/pencil/<name>.svg\`, \`@matita/icons/exact/<name>.svg\`, \`@matita/icons/sprite.svg\`.

## Size and stroke

- Props: \`size\` (px, default 16; 24 in the shadcn entry), \`color\` (default \`currentColor\`), \`strokeWidth\` (default 1.6 on the 24 grid), \`pencil\` (loose pencil variant), \`title\` (accessible label).
- 16 suits text and buttons, 20 toolbars and navigation, 24 stand-alone icons. Set shared defaults once with \`<SketchIconProvider size={20}>\` instead of sizing icon by icon. For a heavier line use \`strokeWidth={2}\`.
- Icons without \`title\` are hidden from screen readers: label an icon-only button with \`aria-label\` on the button.
- Do not copy SVG paths into code and do not add fills: the icons are strokes.

## Names, alternate names and look-alikes

- Names are lowercase kebab-case. Glyphs: ${n}. Alternate names: ${a} extra spellings (\`house\` for \`home\`, \`x-circle\` for \`circle-x\`) that import and draw the glyph they point at. They are listed in \`llms-full.txt\`.
- ${approximate.length} alternate names are marked approximate: the glyph is the closest match, not the same drawing (for example a different tick size or a missing variant). Prefer the glyph name when the exact look matters.
${HAZARDS.map(h => '- Same name, different drawing: ' + h).join('\n')}

## Files

- [llms-full.txt](${SITE}llms-full.txt): this guide plus search keywords for every glyph and the alternate-name table (also in the package as \`@matita/icons/llms-full.txt\`)
- \`@matita/icons/keywords.json\`: every glyph with keywords, plus \`aliases\` and \`approximateAliases\`. Read this, not \`icons.json\`, which holds all the path data
- [Icon list with the version that added each one](${SITE}icons.json), [all icons](${SITE}icons/), [changelog](${SITE}changelog/)
- [GitHub](${REPO}) and [npm](https://www.npmjs.com/package/@matita/icons)

## All ${n} glyphs

${names.join(', ')}
`;
  const full = `${guide}
## Glyph keywords

One line per glyph: the name, then words people search for. The name's own words are matched anyway and are not repeated.

${names.map(k => `${k}: ${(keywords[k] || []).join(' ')}`).join('\n')}

## Alternate names

${a} names, one per line: the alternate name, an arrow, the glyph it draws. A trailing "(approximate)" means the glyph is the closest match.

${Object.entries(aliases).map(([k, g]) => `${k} -> ${g}${approx.has(k) ? ' (approximate)' : ''}`).join('\n')}
`;
  return { short: guide, full };
}
