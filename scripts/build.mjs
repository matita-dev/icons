#!/usr/bin/env node
/* Builds every distributable from src/defs.js:
   dist/svg · dist/svg-pencil · dist/svg-exact · dist/sprite.svg · dist/icons.json · dist/esm · dist/react · dist/umd · dist/pencil.css
   The matita.dev site is a separate project in site/ that builds from the published package. */
import { mkdir, rm, writeFile, readFile, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFS, drawIcon } from '../src/sketchify.js';
import { KEYWORDS } from '../src/keywords.js';
import { ALIASES, APPROXIMATE_ALIASES } from '../src/aliases.js';
import { SHADCN_ICONS } from '../src/shadcn-names.js';
import { toSvg, toSvgInner, pascal } from '../src/render.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = p => join(root, 'src', p), dist = p => join(root, 'dist', p);
const write = async (p, s) => { await mkdir(dirname(p), { recursive: true }); await writeFile(p, s); };
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const banner = `/*! ${pkg.name} v${pkg.version} · ${pkg.license} */\n`;

const names = Object.keys(DEFS);
const icons = Object.fromEntries(names.map(n => [n, drawIcon(n)]));
const js = v => JSON.stringify(v);
const aliasNames = Object.keys(ALIASES);
/* alias exports are plain re-exports of the target's module, so a bundler only keeps what is imported */
const aliasExports = dir => aliasNames.map(a => `export { default as ${pascal(a)}, default as ${pascal(a)}Icon } from '${dir}/${ALIASES[a]}.js';`).join('\n');
const aliasDecls = aliasNames.map(a => `export declare const ${pascal(a)}: SketchIconData;\nexport declare const ${pascal(a)}Icon: SketchIconData;`).join('\n');
const aliasDeclsReact = aliasNames.map(a => `export declare const ${pascal(a)}: SketchIconComponent;\nexport declare const ${pascal(a)}Icon: SketchIconComponent;`).join('\n');

await rm(join(root, 'dist'), { recursive: true, force: true });

/* static SVGs. A standalone pencil file can't use pencil.css, so it carries the same paper grain as a filter. */
const GRAIN = '<defs><filter id="matita-grain" filterUnits="userSpaceOnUse" x="-3" y="-3" width="30" height="30" color-interpolation-filters="sRGB">'
  + '<feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves="2" seed="5" result="noise"/>'
  + '<feColorMatrix in="noise" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -3.2 0 0 0 2.6" result="tooth"/>'
  + '<feComposite in="SourceGraphic" in2="tooth" operator="in"/></filter></defs>';
for (const n of names) {
  await write(dist(`svg/${n}.svg`), toSvg(icons[n], { size: 24 }) + '\n');
  await write(dist(`svg-exact/${n}.svg`), toSvg(drawIcon(n, { wobble: 0 }), { size: 24 }) + '\n');
  await write(dist(`svg-pencil/${n}.svg`), toSvg(icons[n], { size: 24, pencil: true })
    .replace(/^<svg [^>]*>/, s => s + GRAIN + '<g filter="url(#matita-grain)">').replace(/<\/svg>$/, '</g></svg>') + '\n');
}
await write(dist('sprite.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n` +
  names.map(n => `<symbol id="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" overflow="visible">${toSvgInner(icons[n])}</symbol>`).join('\n') +
  `\n</svg>\n`);
/* both JSON files are one entry per glyph, then two reserved fields: aliases (alternate name -> glyph) and approximateAliases */
await write(dist('icons.json'), js({ ...icons, aliases: ALIASES, approximateAliases: APPROXIMATE_ALIASES }) + '\n');
await write(dist('keywords.json'), js({ ...KEYWORDS, aliases: ALIASES, approximateAliases: APPROXIMATE_ALIASES }) + '\n');
await copyFile(src('pencil.css'), dist('pencil.css'));

/* ESM: engine, renderer, per-icon data, index */
await write(dist('esm/defs.js'), banner + await readFile(src('defs.js'), 'utf8'));
await write(dist('esm/aliases.js'), banner + await readFile(src('aliases.js'), 'utf8'));
await write(dist('esm/keywords.js'), banner + await readFile(src('keywords.js'), 'utf8'));
await write(dist('esm/random.js'), banner + await readFile(src('random.js'), 'utf8'));
await write(dist('esm/pencil.js'), banner + await readFile(src('pencil.js'), 'utf8'));
await write(dist('esm/engine.js'), banner + await readFile(src('sketchify.js'), 'utf8'));
await write(dist('esm/render.js'), banner + await readFile(src('render.js'), 'utf8'));
for (const n of names) await write(dist(`esm/icons/${n}.js`), `export default ${js(icons[n])};\n`);
await write(dist('esm/all.js'),
  names.map((n, i) => `import i${i} from './icons/${n}.js';`).join('\n') +
  `\nexport const icons = {\n${names.map((n, i) => `  ${js(n)}: i${i}`).join(',\n')}\n};\n`);
await write(dist('esm/index.js'), banner +
  names.map(n => `export { default as ${pascal(n)}, default as ${pascal(n)}Icon } from './icons/${n}.js';`).join('\n') +
  `\n${aliasExports('./icons')}\nexport { icons } from './all.js';\nexport { KEYWORDS } from './keywords.js';\nexport { ALIASES, APPROXIMATE_ALIASES } from './aliases.js';\nexport { DEFAULTS, iconPaths, iconAttrs, toSvg, toSvgInner, createElement, replaceIcons } from './render.js';\n` +
  `export const names = ${js(names)};\n`);

/* React */
await write(dist('react/base.js'), banner + await readFile(src('react/base.js'), 'utf8'));
await write(dist('react/sketch-icon.js'), banner + await readFile(src('react/sketch-icon.js'), 'utf8'));
for (const n of names) await write(dist(`react/icons/${n}.js`),
  `import { createSketchIcon } from '../base.js';\nimport icon from '../../esm/icons/${n}.js';\nexport default /*#__PURE__*/createSketchIcon(icon);\n`);
await write(dist('react/index.js'), banner +
  names.map(n => `export { default as ${pascal(n)}, default as ${pascal(n)}Icon } from './icons/${n}.js';`).join('\n') +
  `\n${aliasExports('./icons')}\nexport { SketchIconContext, SketchIconProvider, createSketchIcon } from './base.js';\nexport { SketchIcon } from './sketch-icon.js';\n`);

/* shadcn entry: one component per name in src/shadcn-names.js, each drawing a glyph (or an alternate name's glyph) */
const shadcnRows = Object.entries(SHADCN_ICONS).map(([e, t]) => [e, ALIASES[t] ?? t]);
await write(dist('react/shadcn-base.js'), banner + await readFile(src('react/shadcn.js'), 'utf8'));
await write(dist('react/shadcn.js'), banner + [
  "import { createShadcnIcon } from './shadcn-base.js';",
  ...[...new Set(shadcnRows.map(r => r[1]))].map(g => `import ${pascal(g)}Data from '../esm/icons/${g}.js';`),
  ...shadcnRows.map(([e, g]) => `export const ${e} = /*#__PURE__*/createShadcnIcon(${pascal(g)}Data, '${e}');`)
].join('\n') + '\n');

/* types */
const nameUnion = names.map(js).join(' | '), aliasUnion = aliasNames.map(js).join(' | ');
await write(dist('esm/index.d.ts'), `/** The glyphs themselves, one per drawing */
export type SketchGlyphName = ${nameUnion};
/** Alternate names that resolve to a glyph (see ALIASES) */
export type SketchAliasName = ${aliasUnion};
/** Any name a component, \`SketchIcon\` or a lookup accepts: a glyph or an alternate name */
export type SketchIconName = SketchGlyphName | SketchAliasName;
export interface SketchIconData {
  name: string;
  /** [path d, width multiplier] per stroke */
  ink: [string, number][];
  /** dot marks, drawn at 1.55× stroke */
  dot: string;
}
export interface SketchIconOptions {
  /** px, default 16 */ size?: number | string;
  /** CSS colour, default currentColor */ color?: string;
  /** stroke width on the 24 grid, default 1.6 */ strokeWidth?: number;
  /** pencil variant: every stroke drawn as two or three loose pencil lines (pair with pencil.css for the paper grain) */ pencil?: boolean;
  /** pencil texture, 0 (default) to 1: wider, looser lines and a coarser paper (with pencil.css). Shape is \`wobble\`'s job */ rough?: number;
  /** accessible label; omit for decorative icons */ title?: string;
  class?: string;
  attrs?: Record<string, string | number>;
}
export declare const DEFAULTS: Required<Pick<SketchIconOptions, 'size' | 'color' | 'strokeWidth' | 'pencil'>>;
export declare function iconPaths(icon: SketchIconData, opts?: Pick<SketchIconOptions, 'strokeWidth' | 'pencil' | 'rough'>): { d: string; 'stroke-width': number; 'stroke-opacity'?: number }[];
export declare function iconAttrs(icon: SketchIconData, opts?: SketchIconOptions): Record<string, string | number>;
export declare function toSvg(icon: SketchIconData, opts?: SketchIconOptions): string;
export declare function toSvgInner(icon: SketchIconData, opts?: SketchIconOptions): string;
export declare function createElement(icon: SketchIconData, opts?: SketchIconOptions, doc?: Document): SVGSVGElement;
export declare function replaceIcons(opts: SketchIconOptions & { icons: Record<string, SketchIconData>; /** alternate name to glyph name; pass ALIASES to accept alternate names */ aliases?: Record<string, string>; attr?: string; root?: ParentNode }): void;
export declare const icons: Record<SketchGlyphName, SketchIconData>;
/** Search words per icon (synonyms like "bin" for trash); the name itself is not repeated */
export declare const KEYWORDS: Record<SketchGlyphName, string[]>;
/** Alternate name to the glyph it draws (also the \`aliases\` field of icons.json and keywords.json) */
export declare const ALIASES: Record<SketchAliasName, SketchGlyphName>;
/** Aliases whose glyph is the closest match rather than the same drawing */
export declare const APPROXIMATE_ALIASES: SketchAliasName[];
/** Glyph names only; alternate names are in ALIASES */
export declare const names: SketchGlyphName[];
${names.map(n => `export declare const ${pascal(n)}: SketchIconData;\nexport declare const ${pascal(n)}Icon: SketchIconData;`).join('\n')}
${aliasDecls}
`);
await write(dist('esm/engine.d.ts'), `import type { SketchIconData } from './index.js';
/** Built-in glyph sources: drafting primitives on a 24 grid (L line · P polyline · Z closed · R rect · C circle · E ellipse · A arc · Q curve · S smooth line · B Bezier path · O dot). */
export declare const DEFS: Record<string, string>;
export declare const names: string[];
/** Draw a glyph. Pass your own \`defs\` to draw custom icons in the same hand; \`seed\` gives a different drawing;
    \`wobble\` (0 to 1, default 1) is how much hand there is: 0 is the exact shapes, 1 the full drawing. */
export declare function drawIcon(name: string, opts?: { seed?: number; wobble?: number; defs?: Record<string, string> }): SketchIconData;
export declare function drawSource(src: string, key: string, seed?: number, wobble?: number): { p: { d: string; w: number }[]; o: string };
export declare function sketchify(src: string, random: () => number, wobble?: number): { p: { d: string; w: number }[]; o: string };
/** The primitives exactly as written: true lines, circles, arcs and corners. What wobble 0 draws. */
export declare function exact(src: string): { p: { d: string; w: number }[]; o: string };
export declare function hash(s: string): number;
export declare function prng(seed: number): () => number;
`);
await write(dist('esm/defs.d.ts'), `export declare const DEFS: Record<string, string>;\n`);
await write(dist('react/index.d.ts'), `import * as React from 'react';
import type { SketchIconData, SketchIconName, SketchGlyphName, SketchAliasName } from '../esm/index.js';
export type { SketchIconData, SketchIconName, SketchGlyphName, SketchAliasName };
export interface SketchIconProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref' | 'color' | 'strokeWidth'> {
  /** px, default 16 */ size?: number | string;
  /** CSS colour, default currentColor */ color?: string;
  /** stroke width on the 24 grid, default 1.6 (≈1px at 16px) */ strokeWidth?: number | string;
  /** alias of strokeWidth */ weight?: number;
  /** pencil variant: every stroke drawn as two or three loose pencil lines (pair with pencil.css for the paper grain) */ pencil?: boolean;
  /** pencil texture, 0 (default) to 1: wider, looser lines and a coarser paper (with pencil.css). Shape is \`wobble\`'s job */ rough?: number;
  /** accessible label; omit for decorative icons */ title?: string;
}
export type SketchIconComponent = React.ForwardRefExoticComponent<SketchIconProps & React.RefAttributes<SVGSVGElement>>;
export declare const SketchIconContext: React.Context<Pick<SketchIconProps, 'size' | 'color' | 'strokeWidth' | 'pencil' | 'rough'>>;
export declare function SketchIconProvider(props: Pick<SketchIconProps, 'size' | 'color' | 'strokeWidth' | 'pencil' | 'rough'> & { children?: React.ReactNode }): React.JSX.Element;
export declare function createSketchIcon(icon: SketchIconData): SketchIconComponent;
export declare const SketchIcon: React.ForwardRefExoticComponent<SketchIconProps & { name: SketchIconName; seed?: number; /** 0 = exact shapes, 1 = the full hand (default) */ wobble?: number } & React.RefAttributes<SVGSVGElement>> & {
  names: SketchGlyphName[];
  has(name: string): name is SketchIconName;
};
${names.map(n => `export declare const ${pascal(n)}: SketchIconComponent;\nexport declare const ${pascal(n)}Icon: SketchIconComponent;`).join('\n')}
${aliasDeclsReact}
`);

await write(dist('react/shadcn.d.ts'), [
  "import type { SketchIconComponent } from './index.js';",
  "export type { SketchIconProps, SketchIconComponent } from './index.js';",
  ...shadcnRows.map(([e]) => `export declare const ${e}: SketchIconComponent;`)
].join('\n') + '\n');

/* UMD / CDN build: window.SketchIcons */
const esbuild = await import('esbuild');
await esbuild.build({
  entryPoints: [dist('esm/index.js')], bundle: true, minify: true, format: 'iife', globalName: 'SketchIcons',
  outfile: dist('umd/sketch-icons.min.js'), banner: { js: banner.trim() }, logLevel: 'warning'
});

console.log(`built ${names.length} icons`);
