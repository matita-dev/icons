#!/usr/bin/env node
/* matita.dev — static site generator. Writes ../preview/ (served by Cloudflare).
   Draws everything with the published @matita/icons from npm, pinned in site/package.json, so the site shows exactly
   what users install. `--local` uses the repo's own build (../dist) instead, for checking unreleased glyphs.
   The icon grid is rendered here so the page reads without JavaScript; app.js adds search, controls and copy. */
import { mkdir, rm, writeFile, readFile, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildShare } from './share.mjs';

const here = dirname(fileURLToPath(import.meta.url)), repo = join(here, '..');
const LOCAL = process.argv.includes('--local');
const pkgDir = LOCAL ? repo : dirname(createRequire(import.meta.url).resolve('@matita/icons/package.json'));
const entry = { '': 'dist/esm/index.js', '/engine': 'dist/esm/engine.js' };
const load = sub => import(pathToFileURL(join(pkgDir, entry[sub])).href);

const pkg = JSON.parse(await readFile(join(pkgDir, 'package.json'), 'utf8'));
const { icons, names, toSvg, toSvgInner } = await load('');
const { DEFS, drawIcon } = await load('/engine');
const pascal = n => String(n).replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* Self-hosted fonts, all SIL Open Font License 1.1. Each family's license ships next to its files. */
const FONTS = [
  { pkg: 'geist-sans', family: 'Geist', files: [[400, 'normal'], [500, 'normal'], [600, 'normal']] },
  { pkg: 'geist-mono', family: 'Geist Mono', files: [[400, 'normal'], [500, 'normal']] },
  { pkg: 'instrument-serif', family: 'Instrument Serif', files: [[400, 'italic']] }
];

/* Exact geometry of a glyph source, for the "plotted vs drawn" comparison. */
function plotted(src) {
  return src.split(';').map(part => {
    const k = part.trim()[0], v = part.trim().slice(1).trim().split(/\s+/).map(Number);
    const pts = []; for (let i = 0; i + 1 < v.length; i += 2) pts.push(v[i] + ',' + v[i + 1]);
    switch (k) {
      case 'L': return `<line x1="${v[0]}" y1="${v[1]}" x2="${v[2]}" y2="${v[3]}"/>`;
      case 'P': return `<polyline points="${pts.join(' ')}"/>`;
      case 'Z': return `<polygon points="${pts.join(' ')}"/>`;
      case 'R': return `<rect x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}"/>`;
      case 'C': return `<circle cx="${v[0]}" cy="${v[1]}" r="${v[2]}"/>`;
      case 'E': return `<ellipse cx="${v[0]}" cy="${v[1]}" rx="${v[2]}" ry="${v[3]}"/>`;
      case 'A': {
        const [cx, cy, R, a0, a1] = v, p = a => [cx + Math.cos(a * Math.PI / 180) * R, cy + Math.sin(a * Math.PI / 180) * R].map(n => +n.toFixed(2));
        const [x0, y0] = p(a0), [x1, y1] = p(a1);
        return `<path d="M${x0} ${y0}A${R} ${R} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${x1} ${y1}"/>`;
      }
      case 'Q': return `<path d="M${v[0]} ${v[1]}Q${v[2]} ${v[3]} ${v[4]} ${v[5]}"/>`;
      case 'O': return `<circle cx="${v[0]}" cy="${v[1]}" r=".8" fill="currentColor" stroke="none"/>`;
      default: return '';
    }
  }).join('');
}

/* 24-unit graph paper inside a glyph's viewBox. */
const gridLines = (from = 0, to = 24) => {
  let s = '';
  for (let i = from; i <= to; i++) {
    const cls = i % 6 === 0 ? 'g-major' : 'g-minor';
    s += `<line class="${cls}" x1="${i}" y1="${from}" x2="${i}" y2="${to}"/><line class="${cls}" x1="${from}" y1="${i}" x2="${to}" y2="${i}"/>`;
  }
  return s;
};

const code = (id, text, label = 'Copy') =>
  `<div class="code"><pre id="${id}"><code>${esc(text)}</code></pre><button class="btn btn-sm copy" type="button" data-copy-target="${id}">${label}</button></div>`;

const eyebrow = (num, text) => `<p class="eyebrow"><span class="eyebrow-num">${num}</span><span class="eyebrow-dash" aria-hidden="true"></span>${text}</p>`;

{
  const out = p => join(repo, 'preview', p);
  const write = async (p, s) => { await mkdir(dirname(out(p)), { recursive: true }); await writeFile(out(p), s); };
  await rm(join(repo, 'preview'), { recursive: true, force: true });

  /* fonts + licenses */
  const faces = [];
  for (const f of FONTS) {
    const dir = join(here, 'node_modules/@fontsource', f.pkg);
    for (const [w, style] of f.files) {
      const file = `${f.pkg}-latin-${w}-${style}.woff2`;
      await mkdir(out('fonts'), { recursive: true });
      await copyFile(join(dir, 'files', file), out('fonts/' + file));
      faces.push(`@font-face{font-family:'${f.family}';font-style:${style};font-weight:${w};font-display:swap;src:url(fonts/${file}) format('woff2')}`);
    }
    await copyFile(join(dir, 'LICENSE'), out(`fonts/LICENSE-${f.pkg}.txt`));
  }

  /* styles: fonts + site + the package's own pencil grain */
  const esbuild = await import('esbuild');
  const css = faces.join('\n') + '\n' + await readFile(join(here, 'site.css'), 'utf8') + '\n' + await readFile(join(pkgDir, 'dist/pencil.css'), 'utf8');
  await write('site.css', (await esbuild.transform(css, { loader: 'css', minify: true })).code);

  /* behaviour: bundles the package's engine + renderer, so the browser draws identical icons.
     @matita/icons resolves to the same package the page was rendered with (npm, or ../dist with --local). */
  const matita = { name: 'matita', setup: b => b.onResolve({ filter: /^@matita\/icons(\/engine)?$/ }, a => ({ path: join(pkgDir, entry[a.path.slice('@matita/icons'.length)]) })) };
  await esbuild.build({
    entryPoints: [join(here, 'app.js')], bundle: true, minify: true, format: 'iife', target: 'es2019',
    outfile: out('app.js'), logLevel: 'warning', plugins: [matita]
  });

  const n = names.length;
  await buildShare({ root: here, write, icons, toSvg, toSvgInner, n });
  const ico = (name, size, extra = '') => `<span class="ico" data-icon="${name}" data-size="${size}"${extra}>${toSvg(icons[name], { size })}</span>`;

  /* hero specimen: "image" shows all three habits — crossed corners, pen overlap, overshoot */
  const spec = icons.image;
  const callout = (x, y, tx, ty, label, cls) =>
    `<line class="leader ${cls}" x1="${x}" y1="${y}" x2="${tx}" y2="${ty}"/><circle class="marker ${cls}" cx="${x}" cy="${y}" r="1.05"/><text class="marker-t ${cls}" x="${x}" y="${y + .38}" text-anchor="middle">${label}</text>`;
  const specimen = `<svg class="specimen" viewBox="-2 -2 28 28" role="img" aria-label="The image icon drawn large on its 24 unit grid">
  <g class="grid" aria-hidden="true">${gridLines()}</g>
  <g class="glyph" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${toSvgInner(spec, { strokeWidth: .62 }).replace(/<path /g, '<path pathLength="1" ')}</g>
  <g aria-hidden="true">${callout(.4, 1.8, 3, 4.4, '1', 'c-red')}${callout(13.6, 1.8, 10.2, 8.3, '2', 'c-blue')}${callout(.4, 22.4, 3.4, 17.6, '3', 'c-green')}</g>
</svg>`;

  /* icon grid, server-rendered at the default size */
  const grid = names.map(name =>
    `<li><button class="icon-btn" type="button" data-name="${name}" aria-pressed="false"><span class="glyph">${toSvg(icons[name], { size: 24 })}</span><span class="icon-name">${name}</span></button></li>`).join('\n');

  /* "how it's drawn": one worked example + the seed idea */
  const ex = 'image', exSrc = DEFS[ex];
  const seeds = [0, 1, 2, 3, 4].map(s =>
    `<figure class="seed"><span class="ico" data-icon="${ex}" data-size="56" data-seed="${s}">${toSvg(drawIcon(ex, { seed: s }), { size: 56 })}</span><figcaption>seed ${s}</figcaption></figure>`).join('');

  const pencilDemo = ['ruler', 'drafting-compass', 'set-square', 'crosshair', 'layers', 'pencil'];
  const demoRow = variant => pencilDemo.map(name =>
    `<span class="ico" data-icon="${name}" data-size="56" data-variant="${variant}">${toSvg(icons[name], { size: 56, pencil: variant === 'pencil' })}</span>`).join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Matita · freehand pencil icons</title>
<meta name="description" content="${n} freehand pencil icons for the web. Ruled strokes that overshoot, crossed corners, circles that overlap where the pen closes. React, plain SVG and a tiny renderer. MIT.">
<meta property="og:title" content="Matita · freehand pencil icons">
<meta property="og:description" content="${n} freehand pencil icons for the web. MIT licensed.">
<meta property="og:url" content="https://matita.dev/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Matita">
<meta property="og:image" content="https://matita.dev/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Matita: ruled by the grid, drawn by hand. ${n} freehand pencil icons for the web.">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://matita.dev/">
<meta name="theme-color" content="#F6F4EE">
<link rel="icon" href="favicon.ico" sizes="32x32">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preload" href="fonts/geist-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/geist-mono-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="site.css">
<script>document.documentElement.className+=' js'</script>
<script src="app.js" defer></script>
</head>
<body>
<a class="skip" href="#icons">Skip to icons</a>

<header class="site-header">
  <div class="wrap header-in">
    <a class="wordmark" href="#top" aria-label="Matita, home">Matita<span class="wordmark-slash">/</span><span class="wordmark-sub">icons</span></a>
    <nav class="nav" aria-label="Primary">
      <a href="#icons">Icons</a>
      <a href="#install">Install</a>
      <a href="#drawn">How it's drawn</a>
      <a href="https://github.com/matita-dev/icons">GitHub</a>
      <a href="https://www.npmjs.com/package/@matita/icons">npm</a>
    </nav>
  </div>
</header>

<main id="top">
<section class="hero" aria-labelledby="hero-title">
  <div class="wrap hero-in">
    <div class="hero-copy">
      ${eyebrow('00', 'Freehand icons for the web')}
      <h1 id="hero-title">Ruled by the grid.<br>Drawn by <em>hand</em>.</h1>
      <p class="lead">${n} pencil icons where lines overshoot their ends, boxes cross at the corners and circles overlap where the pen closes. Every drawing is deterministic: the same name draws the same way, everywhere.</p>
      <div class="install-line">
        <code id="hero-install">npm i @matita/icons</code>
        <button class="btn btn-sm copy" type="button" data-copy-target="hero-install">Copy</button>
      </div>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#icons">Browse icons ${ico('arrow-right', 16)}</a>
        <a class="btn" href="https://github.com/matita-dev/icons">View source</a>
      </div>
      <ul class="facts" aria-label="Facts">
        <li>${n} glyphs</li><li>24 grid</li><li>1.6 stroke</li><li>currentColor</li><li>MIT</li>
      </ul>
    </div>
    <div class="hero-fig">
      <figure class="frame">
        <figcaption class="frame-cap"><span>Fig. 01 · Specimen</span><span class="frame-rule" aria-hidden="true"></span><span>image</span></figcaption>
        ${specimen}
      </figure>
      <div class="dim" aria-hidden="true"><span class="dim-line"></span><span class="dim-label">24 units</span><span class="dim-line"></span></div>
      <ol class="legend">
        <li><span class="legend-n c-red">1</span>Boxes cross at the corners</li>
        <li><span class="legend-n c-blue">2</span>Circles overlap where the pen closes</li>
        <li><span class="legend-n c-green">3</span>Strokes run past their ends</li>
      </ol>
    </div>
  </div>
</section>

<section class="section" id="icons" aria-labelledby="icons-title">
  <div class="wrap">
    ${eyebrow('01', 'Icons')}
    <div class="section-head">
      <h2 id="icons-title">The set</h2>
      <p class="muted">Click an icon for its code. Size, stroke and colour are yours to change.</p>
    </div>

    <div class="toolbar" aria-label="Icon controls">
      <label class="search">
        <span class="sr-only">Search icons</span>
        ${ico('search', 16)}
        <input id="q" type="search" placeholder="Search ${n} icons" autocomplete="off" spellcheck="false">
        <kbd aria-hidden="true">/</kbd>
      </label>
      <div class="ctl">
        <label for="size">Size</label>
        <input id="size" type="range" min="12" max="64" step="2" value="24">
        <output for="size" id="size-out">24</output>
      </div>
      <div class="ctl">
        <label for="stroke">Stroke</label>
        <input id="stroke" type="range" min="1" max="3" step="0.1" value="1.6">
        <output for="stroke" id="stroke-out">1.6</output>
      </div>
      <div class="ctl" role="group" aria-label="Colour">
        <span class="ctl-l" aria-hidden="true">Colour</span>
        <button type="button" class="swatch" data-color="currentColor" aria-pressed="true" aria-label="Ink (currentColor)"></button>
        <button type="button" class="swatch" data-color="#2748F5" aria-pressed="false" aria-label="Drafting blue"></button>
        <button type="button" class="swatch" data-color="#D8402F" aria-pressed="false" aria-label="Redline"></button>
        <label class="swatch swatch-custom"><span class="sr-only">Custom colour</span><input id="color" type="color" value="#2748F5"></label>
      </div>
      <div class="seg" role="group" aria-label="Icon variant">
        <button type="button" data-variant="ink" aria-pressed="true">Ink</button>
        <button type="button" data-variant="pencil" aria-pressed="false">Pencil</button>
      </div>
      <div class="ctl">
        <span class="ctl-l">Seed</span>
        <output id="seed-out">0</output>
        <button type="button" class="btn btn-sm" id="redraw">Redraw</button>
        <button type="button" class="btn btn-sm" id="seed-reset" hidden>Reset</button>
      </div>
    </div>

    <p class="count" id="count" aria-live="polite">${n} icons</p>

    <div class="browser">
      <div class="browser-grid">
        <ul class="icon-grid" id="grid">
${grid}
        </ul>
        <div class="empty" id="empty" hidden>
          <p>No icon matches “<span id="empty-q"></span>”.</p>
          <a class="btn btn-sm" href="https://github.com/matita-dev/icons/issues/new?template=icon-request.yml">Request it on GitHub</a>
        </div>
      </div>

      <div class="scrim" id="scrim" hidden></div>
      <aside class="detail" id="detail" aria-labelledby="d-name" tabindex="-1">
        <div class="detail-head">
          <h3 class="detail-name" id="d-name">ruler</h3>
          <button type="button" class="btn btn-sm detail-close" id="d-close" aria-label="Close details">${ico('x', 16)}</button>
        </div>
        <div class="detail-preview"><div class="detail-glyph" id="d-glyph"></div></div>
        <dl class="detail-meta">
          <div><dt>Component</dt><dd id="d-comp">Ruler</dd></div>
          <div><dt>File</dt><dd id="d-file">icons/ruler.svg</dd></div>
        </dl>
        <div class="seg seg-full" role="group" aria-label="Code format">
          <button type="button" data-fmt="react" aria-pressed="true">React</button>
          <button type="button" data-fmt="js" aria-pressed="false">JavaScript</button>
          <button type="button" data-fmt="svg" aria-pressed="false">SVG</button>
        </div>
        <div class="code"><pre id="d-code"><code></code></pre></div>
        <div class="detail-actions">
          <button type="button" class="btn btn-primary btn-sm" id="d-copy">Copy code</button>
          <button type="button" class="btn btn-sm" id="d-copy-name">Copy name</button>
        </div>
      </aside>
    </div>
  </div>
</section>

<section class="section" id="install" aria-labelledby="install-title">
  <div class="wrap">
    ${eyebrow('02', 'Install')}
    <div class="section-head">
      <h2 id="install-title">Install &amp; use</h2>
      <p class="muted">One package, four ways in. Icons inherit <code>currentColor</code> and are decorative unless you give them a <code>title</code>.</p>
    </div>
    ${code('install-cmd', 'npm i @matita/icons')}
    <div class="tabs" data-tabs>
      <div class="tablist" role="tablist" aria-label="Usage">
        <button role="tab" type="button" id="tab-react" aria-controls="panel-react" aria-selected="true">React</button>
        <button role="tab" type="button" id="tab-js" aria-controls="panel-js" aria-selected="false" tabindex="-1">JavaScript</button>
        <button role="tab" type="button" id="tab-cdn" aria-controls="panel-cdn" aria-selected="false" tabindex="-1">CDN</button>
        <button role="tab" type="button" id="tab-files" aria-controls="panel-files" aria-selected="false" tabindex="-1">SVG files</button>
      </div>
      <div class="tabpanel" role="tabpanel" id="panel-react" aria-labelledby="tab-react">
        <h3 class="panel-h">React</h3>
        <p>Every icon is a component. <code>SketchIcon</code> takes a name and an optional <code>seed</code>; the provider sets defaults for a subtree.</p>
        ${code('code-react', `import { ArrowRight, SketchIcon, SketchIconProvider } from '@matita/icons/react';

<ArrowRight size={20} color="#2748F5" />
<SketchIcon name="crosshair" pencil />
<SketchIconProvider size={24} strokeWidth={1.4}>…</SketchIconProvider>`)}
      </div>
      <div class="tabpanel" role="tabpanel" id="panel-js" aria-labelledby="tab-js">
        <h3 class="panel-h">JavaScript</h3>
        <p>No framework needed. Render to a string, or create a DOM element.</p>
        ${code('code-js', `import { Ruler, toSvg, createElement } from '@matita/icons';

toSvg(Ruler, { size: 24 });              // SVG string
document.body.append(createElement(Ruler, { size: 24, pencil: true }));`)}
      </div>
      <div class="tabpanel" role="tabpanel" id="panel-cdn" aria-labelledby="tab-cdn">
        <h3 class="panel-h">CDN</h3>
        <p>Drop in placeholders and swap them in one call.</p>
        ${code('code-cdn', `<i data-sketch-icon="ruler" data-size="24"></i>
<script src="https://cdn.jsdelivr.net/npm/@matita/icons/dist/umd/sketch-icons.min.js"></script>
<script>SketchIcons.replaceIcons({ icons: SketchIcons.icons });</script>`)}
      </div>
      <div class="tabpanel" role="tabpanel" id="panel-files" aria-labelledby="tab-files">
        <h3 class="panel-h">SVG files</h3>
        <p>Plain files for design tools, sprites and anything else.</p>
        ${code('code-files', `@matita/icons/icons/<name>.svg     // ink
@matita/icons/pencil/<name>.svg    // pencil variant
@matita/icons/sprite.svg           // <symbol id="<name>">
@matita/icons/icons.json           // path data for every glyph
@matita/icons/pencil.css           // graphite grain for the pencil variant`)}
      </div>
    </div>

    <div class="table-wrap">
      <table class="props">
        <caption class="sr-only">Props</caption>
        <thead><tr><th scope="col">Prop</th><th scope="col">Type</th><th scope="col">Default</th><th scope="col">What it does</th></tr></thead>
        <tbody>
          <tr><td><code>size</code></td><td>number | string</td><td><code>16</code></td><td>Width and height in px (or any CSS length).</td></tr>
          <tr><td><code>color</code></td><td>string</td><td><code>currentColor</code></td><td>Stroke colour.</td></tr>
          <tr><td><code>strokeWidth</code></td><td>number</td><td><code>1.6</code></td><td>Stroke width on the 24 grid. Every stroke scales with it.</td></tr>
          <tr><td><code>pencil</code></td><td>boolean</td><td><code>false</code></td><td>Graphite variant: uneven pressure and a faint second pass. Pair with <code>pencil.css</code>.</td></tr>
          <tr><td><code>title</code></td><td>string</td><td>none</td><td>Accessible label. Without it the icon is <code>aria-hidden</code>.</td></tr>
          <tr><td><code>seed</code></td><td>number</td><td><code>0</code></td><td><code>SketchIcon</code> only: a different, equally deterministic drawing.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="section" id="drawn" aria-labelledby="drawn-title">
  <div class="wrap">
    ${eyebrow('03', "How it's drawn")}
    <div class="section-head">
      <h2 id="drawn-title">Drafted, then <em>drawn</em></h2>
      <p class="muted">Each glyph is a few drafting primitives on a 24 grid. A seeded hand turns them into pencil strokes, so the wobble is designed, not random.</p>
    </div>
    <div class="drawn">
      <div class="table-wrap">
        <table class="prims">
          <caption class="sr-only">Primitives</caption>
          <thead><tr><th scope="col">Code</th><th scope="col">Primitive</th><th scope="col">Arguments</th></tr></thead>
          <tbody>
            <tr><td><code>L</code></td><td>Line</td><td><code>x1 y1 x2 y2</code></td></tr>
            <tr><td><code>P</code></td><td>Polyline</td><td><code>x y x y …</code></td></tr>
            <tr><td><code>Z</code></td><td>Closed shape</td><td><code>x y x y …</code></td></tr>
            <tr><td><code>R</code></td><td>Rectangle</td><td><code>x y w h</code></td></tr>
            <tr><td><code>C</code></td><td>Circle</td><td><code>cx cy r</code></td></tr>
            <tr><td><code>E</code></td><td>Ellipse</td><td><code>cx cy rx ry</code></td></tr>
            <tr><td><code>A</code></td><td>Arc</td><td><code>cx cy r a0 a1</code></td></tr>
            <tr><td><code>Q</code></td><td>Curve</td><td><code>x1 y1 cx cy x2 y2</code></td></tr>
            <tr><td><code>O</code></td><td>Dot</td><td><code>cx cy</code></td></tr>
          </tbody>
        </table>
      </div>
      <div class="example">
        <figure class="frame step">
          <figcaption class="frame-cap"><span>A · Source</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
          <pre class="src"><code>${esc(exSrc.split(';').join(';\n'))}</code></pre>
        </figure>
        <figure class="frame step">
          <figcaption class="frame-cap"><span>B · Plotted</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
          <svg class="step-svg" viewBox="-1 -1 26 26" role="img" aria-label="The image icon as exact geometry"><g class="grid" aria-hidden="true">${gridLines()}</g><g fill="none" stroke="currentColor" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round">${plotted(exSrc)}</g></svg>
        </figure>
        <figure class="frame step">
          <figcaption class="frame-cap"><span>C · Drawn</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
          <svg class="step-svg" viewBox="-1 -1 26 26" role="img" aria-label="The image icon as drawn by Matita"><g class="grid" aria-hidden="true">${gridLines()}</g><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${toSvgInner(icons[ex], { strokeWidth: .8 })}</g></svg>
        </figure>
      </div>
    </div>
    <div class="seeds">
      <p class="seeds-l">Same name, same seed, same drawing: in SVG, React and the browser, on every machine. Change the seed for another take.</p>
      <div class="seed-row">${seeds}</div>
    </div>
  </div>
</section>

<section class="section" id="pencil" aria-labelledby="pencil-title">
  <div class="wrap">
    ${eyebrow('04', 'Pencil variant')}
    <div class="section-head">
      <h2 id="pencil-title">Ink, or <em>graphite</em></h2>
      <p class="muted">Pass <code>pencil</code> for uneven pressure and a faint second pass. Import <code>pencil.css</code> once for the paper-tooth grain.</p>
    </div>
    <div class="variants">
      <figure class="frame variant">
        <figcaption class="frame-cap"><span>Fig. 02 · Ink</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
        <div class="variant-row">${demoRow('ink')}</div>
      </figure>
      <figure class="frame variant">
        <figcaption class="frame-cap"><span>Fig. 03 · Pencil</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
        <div class="variant-row">${demoRow('pencil')}</div>
      </figure>
    </div>
    ${code('code-pencil', `import '@matita/icons/pencil.css';
import { Ruler } from '@matita/icons/react';

<Ruler size={32} pencil />`)}
  </div>
</section>
</main>

<footer class="site-footer">
  <div class="wrap footer-in">
    <div>
      <p class="wordmark">Matita<span class="wordmark-slash">/</span><span class="wordmark-sub">icons</span></p>
      <p class="muted">MIT licensed · v${esc(pkg.version)}</p>
    </div>
    <ul class="footer-links">
      <li><a href="https://github.com/matita-dev/icons">GitHub</a></li>
      <li><a href="https://www.npmjs.com/package/@matita/icons">npm</a></li>
      <li><a href="https://github.com/matita-dev/icons/issues/new?template=icon-request.yml">Request an icon</a></li>
      <li><a href="mailto:hello@matita.dev">hello@matita.dev</a></li>
    </ul>
    <p class="credit muted">Set in Geist, Geist Mono and Instrument Serif, under the SIL Open Font License (<a href="fonts/LICENSE-geist-sans.txt">Geist</a>, <a href="fonts/LICENSE-geist-mono.txt">Geist Mono</a>, <a href="fonts/LICENSE-instrument-serif.txt">Instrument Serif</a>).</p>
  </div>
</footer>

<div class="sr-only" id="announce" aria-live="polite"></div>
</body>
</html>
`;
  /* links that leave the site open in a new tab */
  await write('index.html', html.replace(/<a ([^>]*?)href="(https?:\/\/[^"]+)"/g, '<a $1href="$2" target="_blank" rel="noopener"'));
  console.log(`site built with ${pkg.name}@${pkg.version}${LOCAL ? ' (local ../dist)' : ''}, ${n} icons`);
}
