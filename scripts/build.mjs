#!/usr/bin/env node
/* Builds every distributable from src/defs.js:
   dist/svg · dist/svg-pencil · dist/sprite.svg · dist/icons.json · dist/esm · dist/react · dist/umd · dist/pencil.css · preview/index.html */
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

/* guideline sheet — brand-sketch-icons */
const cell = n => `<div class="cell">${toSvg(icons[n], { size: 24 })}<span class="lbl">${n}</span></div>`;
const sizes = [14, 16, 18, 24, 32].map(s => `<div class="size">${toSvg(icons['drafting-compass'], { size: s })}<span class="lbl">${s}</span></div>`).join('');
const blues = ['crosshair', 'ruler', 'set-square', 'layers'].map(n => toSvg(icons[n], { size: 20, pencil: true })).join('');
const pencilCss = (await readFile(src('pencil.css'), 'utf8')).replace(/\/\*[\s\S]*?\*\/\s*/, '').trim();
await write(join(root, 'preview/index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Matita icons</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--paper-1:#F6F4EE;--ink-1:#14161B;--ink-2:#353941;--ink-3:#5E626B;--blue-500:#2748F5;
--line-1:rgba(20,22,27,.22);--line-2:rgba(20,22,27,.14);--surface-page:var(--paper-1);--text-body:var(--ink-2);
--font-mono:'Geist Mono',ui-monospace,'SFMono-Regular',Menlo,monospace;--fw-regular:400;--fw-medium:500;--tracking-label:.08em;
--guide-h:repeating-linear-gradient(90deg,var(--line-1) 0 4px,transparent 4px 8px)}
*{box-sizing:border-box}
body{margin:0;background:var(--surface-page);color:var(--text-body)}
.sheet{max-width:700px;margin:0 auto;padding:20px 22px;display:flex;flex-direction:column;gap:16px}
.head{display:flex;align-items:baseline;gap:12px}
.title{font:var(--fw-medium) 11px/1 var(--font-mono);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--ink-1)}
.meta{font:var(--fw-regular) 11px/1 var(--font-mono);color:var(--ink-3)}
.rule{flex:1;height:1px;background:var(--guide-h)}
.grid{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:14px 6px}
.cell{display:flex;flex-direction:column;align-items:center;gap:7px;min-width:0;color:var(--ink-1)}
.lbl{font:var(--fw-medium) 9.5px/1.2 var(--font-mono);letter-spacing:.04em;color:var(--ink-3);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.foot{display:flex;align-items:flex-end;gap:22px;padding-top:12px;border-top:1px dashed var(--line-1)}
.size{display:flex;flex-direction:column;align-items:center;gap:6px}
.sep{width:1px;align-self:stretch;background:var(--line-2)}
.blue{display:flex;gap:14px;align-items:center;color:var(--blue-500)}
.spacer{flex:1}
.note{text-align:right}
.note code{font:inherit;color:var(--ink-1)}
svg.sketch-icon{display:inline-block;flex:none}
${pencilCss}
@media (max-width:560px){.grid{grid-template-columns:repeat(6,minmax(0,1fr))}.foot{flex-wrap:wrap;row-gap:14px}.spacer,.sep{display:none}.note{flex-basis:100%;text-align:left}}
</style></head>
<body>
<main class="sheet">
  <div class="head"><span class="title">Matita icons</span><span class="meta">${names.length} glyphs · 24 grid · 1.6 stroke</span><span class="rule"></span></div>
  <div class="grid">
${names.map(n => '    ' + cell(n)).join('\n')}
  </div>
  <div class="foot">${sizes}<span class="sep"></span><div class="blue">${blues}</div><span class="spacer"></span><span class="lbl note">Pencil variant: pass <code>pencil</code></span></div>
</main>
</body></html>
`);

console.log(`built ${names.length} icons`);
