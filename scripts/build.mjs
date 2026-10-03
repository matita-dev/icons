#!/usr/bin/env node
/* Builds every distributable from src/defs.js:
   dist/svg · dist/svg-pencil · dist/sprite.svg · dist/icons.json · dist/esm · dist/react · dist/umd · dist/pencil.css
   The matita.dev site is a separate project in site/ that builds from the published package. */
import { mkdir, rm, writeFile, readFile, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFS, drawIcon } from '../src/sketchify.js';
import { toSvg, toSvgInner, pascal } from '../src/render.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = p => join(root, 'src', p), dist = p => join(root, 'dist', p);
const write = async (p, s) => { await mkdir(dirname(p), { recursive: true }); await writeFile(p, s); };
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const banner = `/*! ${pkg.name} v${pkg.version} · ${pkg.license} */\n`;

const names = Object.keys(DEFS);
const icons = Object.fromEntries(names.map(n => [n, drawIcon(n)]));
const js = v => JSON.stringify(v);

await rm(join(root, 'dist'), { recursive: true, force: true });

/* static SVGs */
for (const n of names) {
  await write(dist(`svg/${n}.svg`), toSvg(icons[n], { size: 24 }) + '\n');
  await write(dist(`svg-pencil/${n}.svg`), toSvg(icons[n], { size: 24, pencil: true }) + '\n');
}
await write(dist('sprite.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n` +
  names.map(n => `<symbol id="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" overflow="visible">${toSvgInner(icons[n])}</symbol>`).join('\n') +
  `\n</svg>\n`);
await write(dist('icons.json'), js(icons) + '\n');
await copyFile(src('pencil.css'), dist('pencil.css'));

/* ESM: engine, renderer, per-icon data, index */
await write(dist('esm/defs.js'), banner + await readFile(src('defs.js'), 'utf8'));
await write(dist('esm/engine.js'), banner + await readFile(src('sketchify.js'), 'utf8'));
await write(dist('esm/render.js'), banner + await readFile(src('render.js'), 'utf8'));
for (const n of names) await write(dist(`esm/icons/${n}.js`), `export default ${js(icons[n])};\n`);
await write(dist('esm/all.js'),
  names.map((n, i) => `import i${i} from './icons/${n}.js';`).join('\n') +
  `\nexport const icons = {\n${names.map((n, i) => `  ${js(n)}: i${i}`).join(',\n')}\n};\n`);
await write(dist('esm/index.js'), banner +
  names.map(n => `export { default as ${pascal(n)}, default as ${pascal(n)}Icon } from './icons/${n}.js';`).join('\n') +
  `\nexport { icons } from './all.js';\nexport { DEFAULTS, iconPaths, iconAttrs, toSvg, toSvgInner, createElement, replaceIcons } from './render.js';\n` +
  `export const names = ${js(names)};\n`);

/* React */
await write(dist('react/base.js'), banner + await readFile(src('react/base.js'), 'utf8'));
await write(dist('react/sketch-icon.js'), banner + await readFile(src('react/sketch-icon.js'), 'utf8'));
for (const n of names) await write(dist(`react/icons/${n}.js`),
  `import { createSketchIcon } from '../base.js';\nimport icon from '../../esm/icons/${n}.js';\nexport default /*#__PURE__*/createSketchIcon(icon);\n`);
await write(dist('react/index.js'), banner +
  names.map(n => `export { default as ${pascal(n)}, default as ${pascal(n)}Icon } from './icons/${n}.js';`).join('\n') +
  `\nexport { SketchIconContext, SketchIconProvider, createSketchIcon } from './base.js';\nexport { SketchIcon } from './sketch-icon.js';\n`);

/* types */
const nameUnion = names.map(js).join(' | ');
await write(dist('esm/index.d.ts'), `export type SketchIconName = ${nameUnion};
export interface SketchIconData {
  name: string;
  /** [path d, width multiplier] per stroke */
  ink: [string, number][];
  /** dot marks, drawn at 1.55× stroke */
  dot: string;
  pencil: { opacity: number[]; pass: [string, number][] };
}
export interface SketchIconOptions {
  /** px, default 16 */ size?: number | string;
  /** CSS colour, default currentColor */ color?: string;
  /** stroke width on the 24 grid, default 1.6 */ strokeWidth?: number;
  /** graphite variant: uneven pressure + a faint second pass (pair with pencil.css for grain) */ pencil?: boolean;
  /** accessible label; omit for decorative icons */ title?: string;
  class?: string;
  attrs?: Record<string, string | number>;
}
export declare const DEFAULTS: Required<Pick<SketchIconOptions, 'size' | 'color' | 'strokeWidth' | 'pencil'>>;
export declare function iconPaths(icon: SketchIconData, opts?: Pick<SketchIconOptions, 'strokeWidth' | 'pencil'>): { d: string; 'stroke-width': number; 'stroke-opacity'?: number }[];
export declare function iconAttrs(icon: SketchIconData, opts?: SketchIconOptions): Record<string, string | number>;
export declare function toSvg(icon: SketchIconData, opts?: SketchIconOptions): string;
export declare function toSvgInner(icon: SketchIconData, opts?: SketchIconOptions): string;
export declare function createElement(icon: SketchIconData, opts?: SketchIconOptions, doc?: Document): SVGSVGElement;
export declare function replaceIcons(opts: SketchIconOptions & { icons: Record<string, SketchIconData>; attr?: string; root?: ParentNode }): void;
export declare const icons: Record<SketchIconName, SketchIconData>;
export declare const names: SketchIconName[];
${names.map(n => `export declare const ${pascal(n)}: SketchIconData;\nexport declare const ${pascal(n)}Icon: SketchIconData;`).join('\n')}
`);
await write(dist('esm/engine.d.ts'), `import type { SketchIconData } from './index.js';
/** Built-in glyph sources: drafting primitives on a 24 grid (L line · P polyline · Z closed · R rect · C circle · E ellipse · A arc · Q curve · O dot). */
export declare const DEFS: Record<string, string>;
export declare const names: string[];
/** Draw a glyph. Pass your own \`defs\` to draw custom icons in the same hand; \`seed\` gives a different drawing. */
export declare function drawIcon(name: string, opts?: { seed?: number; defs?: Record<string, string> }): SketchIconData;
export declare function drawSource(src: string, key: string, seed?: number): { p: { d: string; w: number }[]; o: string };
export declare function sketchify(src: string, random: () => number): { p: { d: string; w: number }[]; o: string };
export declare function hash(s: string): number;
export declare function prng(seed: number): () => number;
`);
await write(dist('esm/defs.d.ts'), `export declare const DEFS: Record<string, string>;\n`);
await write(dist('react/index.d.ts'), `import * as React from 'react';
import type { SketchIconData, SketchIconName } from '../esm/index.js';
export type { SketchIconData, SketchIconName };
export interface SketchIconProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref' | 'color' | 'strokeWidth'> {
  /** px, default 16 */ size?: number | string;
  /** CSS colour, default currentColor */ color?: string;
  /** stroke width on the 24 grid, default 1.6 (≈1px at 16px) */ strokeWidth?: number;
  /** alias of strokeWidth */ weight?: number;
  /** graphite variant: uneven pressure + a faint second pass (pair with pencil.css for grain) */ pencil?: boolean;
  /** accessible label; omit for decorative icons */ title?: string;
}
export type SketchIconComponent = React.ForwardRefExoticComponent<SketchIconProps & React.RefAttributes<SVGSVGElement>>;
export declare const SketchIconContext: React.Context<Pick<SketchIconProps, 'size' | 'color' | 'strokeWidth' | 'pencil'>>;
export declare function SketchIconProvider(props: Pick<SketchIconProps, 'size' | 'color' | 'strokeWidth' | 'pencil'> & { children?: React.ReactNode }): React.JSX.Element;
export declare function createSketchIcon(icon: SketchIconData): SketchIconComponent;
export declare const SketchIcon: React.ForwardRefExoticComponent<SketchIconProps & { name: SketchIconName; seed?: number } & React.RefAttributes<SVGSVGElement>> & {
  names: SketchIconName[];
  has(name: string): name is SketchIconName;
};
${names.map(n => `export declare const ${pascal(n)}: SketchIconComponent;\nexport declare const ${pascal(n)}Icon: SketchIconComponent;`).join('\n')}
`);

/* UMD / CDN build: window.SketchIcons */
const esbuild = await import('esbuild');
await esbuild.build({
  entryPoints: [dist('esm/index.js')], bundle: true, minify: true, format: 'iife', globalName: 'SketchIcons',
  outfile: dist('umd/sketch-icons.min.js'), banner: { js: banner.trim() }, logLevel: 'warning'
});

console.log(`built ${names.length} icons`);
