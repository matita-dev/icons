#!/usr/bin/env node
/* matita.dev — static site generator. Writes ../preview/ (served by Cloudflare).
   Draws everything with the published @matita/icons from npm, pinned in site/package.json, so the site shows exactly
   what users install. `--local` uses the repo's own build (../dist) instead, for checking unreleased glyphs.
   The icon grid is rendered here so the page reads without JavaScript; app.js adds search, controls and copy. */
import { mkdir, rm, writeFile, readFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildShare } from './share.mjs';
import { plotted, gridLines } from './geometry.mjs';
import { howPage } from './how.mjs';
import { buildIconPages } from './icon.mjs';
import { readHistory, changelogPage, anchor } from './changelog.mjs';
import { roadmapPage, roadmapOpen } from './roadmap.mjs';

const here = dirname(fileURLToPath(import.meta.url)), repo = join(here, '..');
const LOCAL = process.argv.includes('--local');
const pkgDir = LOCAL ? repo : dirname(createRequire(import.meta.url).resolve('@matita/icons/package.json'));
const entry = { '': 'dist/esm/index.js', '/engine': 'dist/esm/engine.js' };
const load = sub => import(pathToFileURL(join(pkgDir, entry[sub])).href);

const pkg = JSON.parse(await readFile(join(pkgDir, 'package.json'), 'utf8'));
const { icons, names, toSvg, toSvgInner } = await load('');
const { DEFS, drawIcon, hash } = await load('/engine');
const pascal = n => String(n).replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* Self-hosted fonts, all SIL Open Font License 1.1. Each family's license ships next to its files. */
const FONTS = [
  { pkg: 'geist-sans', family: 'Geist', files: [[400, 'normal'], [500, 'normal'], [600, 'normal']] },
  { pkg: 'geist-mono', family: 'Geist Mono', files: [[400, 'normal'], [500, 'normal']] },
  { pkg: 'instrument-serif', family: 'Instrument Serif', files: [[400, 'italic']] }
];

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

  /* images */
  await mkdir(out('img'), { recursive: true });
  await copyFile(join(here, 'img/sketchcn-components.jpg'), out('img/sketchcn-components.jpg'));

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
  await esbuild.build({
    entryPoints: [join(here, 'how.js')], bundle: true, minify: true, format: 'iife', target: 'es2019',
    outfile: out('how.js'), logLevel: 'warning', plugins: [matita]
  });
  await esbuild.build({
    entryPoints: [join(here, 'icon.js')], bundle: true, minify: true, format: 'iife', target: 'es2019',
    outfile: out('icon.js'), logLevel: 'warning', plugins: [matita]
  });

  const n = names.length;
  /* does this package have the wobble setting (0.4.0+)? Pages only offer it when it does, so a site built on an older
     pin never shows a control that does nothing. */
  const HAS_WOBBLE = drawIcon('minus', { wobble: 0 }).ink[0][0] !== drawIcon('minus').ink[0][0];
  /* which release added each icon, from CHANGELOG.md; icons from the newest batch get a "New" badge */
  const history = readHistory({ file: join(repo, 'CHANGELOG.md'), names, version: pkg.version });
  const newIcons = names.filter(name => history.isNew(name));
  const newBadge = name => history.isNew(name) ? `<span class="badge-new" title="Added in ${history.latest}">New</span>` : '';
  await buildShare({ root: here, write, icons, names, toSvg, toSvgInner });
  const ico = (name, size, extra = '') => `<span class="ico" data-icon="${name}" data-size="${size}"${extra}>${toSvg(icons[name], { size })}</span>`;

  /* hero specimens: each annotates three of the engine's habits on one glyph. The first is rendered into the page;
     app.js shows a random one on load. A note points at a fixed grid point, or at a drawn stroke ([stroke, where]):
     'first' / 'last' is where the pen starts / lifts, 'close' is where a ring's pen passes over its own start. */
  const SPECIMENS = [
    ['image', [
      ['Boxes cross at the corners', [3.5, 5], [.4, 1.8]],
      ['Circles overlap where the pen closes', [1, 'close'], [13.6, 1.8]],
      ['Strokes run past their ends', [2, 'first'], [.4, 22.4]]]],
    ['calendar', [
      ['Boxes cross at the corners', [20, 20.5], [23.6, 23.4]],
      ['Ruled lines run past the box', [1, 'last'], [23.6, 13.6]],
      ['Even short ticks overshoot', [2, 'first'], [4.4, .4]]]],
    ['clock', [
      ['Circles overlap where the pen closes', [0, 'close'], [.4, 1.8]],
      ['Joints stay sharp', [12, 12], [.4, 22.4]],
      ['Open ends run past the point', [1, 'last'], [23.6, 20.4]]]],
    ['folder', [
      ['Closed shapes run past their start', [0, 'last'], [7.6, .4]],
      ['Corners stay sharp', [11.5, 8], [16.4, 2.2]],
      ['Every edge bows a little', [12, 18.5], [15.6, 23.4]]]],
    ['search', [
      ['Circles overlap where the pen closes', [0, 'close'], [.4, 1.8]],
      ['Joins overlap instead of meeting', [1, 'first'], [23.6, 9.6]],
      ['Strokes run past their ends', [1, 'last'], [16.4, 23.4]]]],
    ['info', [
      ['Circles overlap where the pen closes', [0, 'close'], [23.6, 1.8]],
      ['Dots are a single tap of the pen', [12, 7.8], [.4, 1.8]],
      ['Strokes run past their ends', [1, 'last'], [.4, 22.4]]]],
    ['eye', [
      ['Curves cross where they meet', [2.5, 12], [.4, 5.6]],
      ['Circles overlap where the pen closes', [2, 'close'], [23.6, 1.8]],
      ['Every curve runs past its end', [1, 'first'], [23.6, 18.4]]]]
  ];
  const strokePts = d => { const v = d.match(/-?\d*\.?\d+/g).map(Number), P = []; for (let i = 0; i + 1 < v.length; i += 2) P.push([v[i], v[i + 1]]); return P; };
  const noteAt = (name, at) => {
    if (typeof at[1] === 'number') return at;
    const [i, where] = at, P = strokePts(icons[name].ink[i][0]);
    if (where === 'first') return P[0];
    if (where === 'last') return P.at(-1);
    /* ring: halfway between the start angle and where the overrun ends, on the plotted radius */
    const [cx, cy, R] = DEFS[name].split(';').filter(p => p.trim()[0] !== 'O')[i].trim().slice(1).trim().split(/\s+/).map(Number);
    const ang = p => Math.atan2(p[1] - cy, p[0] - cx), a0 = ang(P[0]), sweep = ((ang(P.at(-1)) - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return [cx + Math.cos(a0 + sweep / 2) * R, cy + Math.sin(a0 + sweep / 2) * R];
  };
  const r2 = n => +n.toFixed(2);
  const NOTE_CLS = ['c-red', 'c-blue', 'c-green'];
  const callout = (x, y, tx, ty, label, cls) =>
    `<line class="leader ${cls}" x1="${x}" y1="${y}" x2="${r2(tx)}" y2="${r2(ty)}"/><circle class="marker ${cls}" cx="${x}" cy="${y}" r="1.05"/><text class="marker-t ${cls}" x="${x}" y="${r2(y + .38)}" text-anchor="middle">${label}</text>`;
  const specimens = SPECIMENS.map(([name, notes]) => ({
    name,
    label: `The ${name} icon drawn large on its 24 unit grid`,
    glyph: toSvgInner(icons[name], { strokeWidth: .62 }).replace(/<path /g, '<path pathLength="1" '),
    notes: notes.map(([, at, [x, y]], i) => callout(x, y, ...noteAt(name, at), i + 1, NOTE_CLS[i])).join(''),
    legend: notes.map(([text], i) => `<li><span class="legend-n ${NOTE_CLS[i]}">${i + 1}</span>${esc(text)}</li>`).join('')
  }));
  const spec = specimens[0];
  const specimen = `<svg class="specimen" id="spec-svg" viewBox="-2 -2 28 28" role="img" aria-label="${spec.label}">
  <g class="grid" aria-hidden="true">${gridLines()}</g>
  <g class="glyph" id="spec-glyph" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${spec.glyph}</g>
  <g id="spec-notes" aria-hidden="true">${spec.notes}</g>
</svg>`;

  /* icon grid, server-rendered at the default size */
  const grid = names.map(name =>
    `<li><button class="icon-btn" type="button" data-name="${name}" data-since="${history.since[name]}" aria-pressed="false"><span class="glyph">${toSvg(icons[name], { size: 24 })}</span><span class="icon-name">${name}</span>${newBadge(name)}</button></li>`).join('\n');

  /* "how it's drawn": one worked example + the seed idea */
  const ex = 'image', exSrc = DEFS[ex];
  const seeds = [0, 1, 2, 3, 4].map(s =>
    `<figure class="seed"><span class="ico" data-icon="${ex}" data-size="56" data-seed="${s}">${toSvg(drawIcon(ex, { seed: s }), { size: 56 })}</span><figcaption>seed ${s}</figcaption></figure>`).join('');

  /* ten icons, five to a row, so both figures fill two even rows */
  const pencilDemo = ['ruler', 'drafting-compass', 'set-square', 'crosshair', 'layers', 'pencil', 'protractor', 'pen-nib', 'brush', 'bezier'];
  const demoRow = variant => pencilDemo.map(name =>
    `<span class="ico" data-icon="${name}" data-size="64" data-variant="${variant}">${toSvg(icons[name], { size: 64, pencil: variant === 'pencil' })}</span>`).join('');

  /* search engines: structured data for the home page, plus robots.txt and sitemap.xml (no Search Console needed) */
  const SITE = 'https://matita.dev/';
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': SITE + '#website', url: SITE, name: 'Matita', inLanguage: 'en' },
      {
        '@type': 'SoftwareSourceCode', '@id': SITE + '#icons', url: SITE, name: 'Matita icons',
        description: '200+ pencil-style icons as SVG and React components, drawn by code from simple shapes. MIT licensed.',
        codeRepository: 'https://github.com/matita-dev/icons', programmingLanguage: 'JavaScript',
        license: 'https://opensource.org/licenses/MIT', version: pkg.version, isPartOf: { '@id': SITE + '#website' },
        publisher: {
          '@type': 'Organization', name: 'Matita', url: SITE, logo: SITE + 'apple-touch-icon.png',
          sameAs: [
            'https://github.com/matita-dev', 'https://www.npmjs.com/package/@matita/icons', 'https://dev.to/matita',
            'https://matita.hashnode.dev', 'https://matita-dev.medium.com',
            'https://www.figma.com/community/file/1688850201209755442/matita-icons-freehand-pencil-icon-set'
          ]
        }
      }
    ]
  }).replace(/</g, '\\u003c');
  await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);

  /* header + footer shared by every page. `p` is '' on the home page and '/' elsewhere, so links resolve from any depth. */
  const siteHeader = p => `<header class="site-header">
  <div class="wrap header-in">
    <a class="wordmark" href="${p ? '/' : '#top'}" aria-label="Matita, home">Matita<span class="wordmark-slash">/</span><span class="wordmark-sub">icons</span></a>
    <nav class="nav" aria-label="Primary">
      <a href="${p}#icons">Icons</a>
      <a href="${p}#install">Install</a>
    </nav>
    <nav class="nav nav-ext" aria-label="Project links">
      <a href="https://github.com/matita-dev/icons">GitHub</a>
      <a href="https://www.npmjs.com/package/@matita/icons">npm</a>
    </nav>
    <details class="nav-menu">
      <summary aria-label="Menu"><span class="i-open" aria-hidden="true">${toSvg(icons.menu, { size: 24 })}</span><span class="i-close" aria-hidden="true">${toSvg(icons.x, { size: 24 })}</span></summary>
      <nav class="menu-panel" aria-label="Menu">
        <a href="${p}#icons">Icons</a>
        <a href="${p}#install">Install</a>
        <a href="https://github.com/matita-dev/icons">GitHub</a>
        <a href="https://www.npmjs.com/package/@matita/icons">npm</a>
      </nav>
    </details>
  </div>
</header>`;
  const siteFooter = p => `<footer class="site-footer">
  <div class="wrap footer-in">
    <div>
      <p class="wordmark">Matita<span class="wordmark-slash">/</span><span class="wordmark-sub">icons</span></p>
      <p class="muted">v${esc(pkg.version)}</p>
    </div>
    <ul class="footer-links">
      <li><a href="/how-it-works/">How it works</a></li>
      <li><a href="/icons/">All icons</a></li>
      <li><a href="/roadmap/">Roadmap</a></li>
      <li><a href="/changelog/">Changelog</a></li>
      <li><a href="https://github.com/matita-dev/icons">GitHub</a></li>
      <li><a href="https://www.npmjs.com/package/@matita/icons">npm</a></li>
      <li><a href="https://github.com/matita-dev/icons/issues/new?template=icon-request.yml">Request an icon</a></li>
      <li><a href="https://github.com/sponsors/ldons">Support Matita</a></li>
      <li><a href="mailto:hello@matita.dev">hello@matita.dev</a></li>
    </ul>
    <p class="credit muted"><span>Open source, MIT licensed, and it stays that way</span><span class="made-by">Made with <span class="made-by-ico" role="img" aria-label="love">${toSvg(icons.heart, { size: 16 })}</span> by <a href="https://herocreativ.com">herocreativ</a></span></p>
  </div>
</footer>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Matita · pencil-style icons for React and the web</title>
<meta name="description" content="200+ pencil-style icons as SVG and React components, drawn by code. Strokes overshoot, corners cross, circles overlap where the pen closes. Free and MIT licensed.">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:title" content="Matita · pencil-style icons">
<meta property="og:description" content="200+ pencil-style icons for the web, drawn by code. MIT licensed.">
<meta property="og:url" content="https://matita.dev/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Matita">
<meta property="og:image" content="https://matita.dev/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Matita: ruled by the grid, sketched by code. 200+ pencil-style icons for the web.">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://matita.dev/">
<script type="application/ld+json">${jsonLd}</script>
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

${siteHeader('')}

<main id="top">
<section class="hero" aria-labelledby="hero-title">
  <div class="wrap hero-in">
    <div class="hero-copy">
      ${eyebrow('00', 'Pencil-style icons for the web')}
      <h1 id="hero-title">Ruled by the grid.<br>Sketched by <em>code</em>.</h1>
      <p class="lead">200+ pencil-style icons as SVG and React components. Each one is a few simple shapes that code draws like a pencil would: lines overshoot their ends, boxes cross at the corners and circles overlap where the pen closes. The same name always draws the same way, everywhere.</p>
      <div class="install-line">
        <code id="hero-install">npm i @matita/icons</code>
        <button class="btn btn-sm copy" type="button" data-copy-target="hero-install">Copy</button>
      </div>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#icons">Browse icons ${ico('arrow-right', 16)}</a>
        <a class="btn" href="https://github.com/matita-dev/icons">View source</a>
      </div>
      <ul class="facts" aria-label="Facts">
        <li>200+ glyphs</li><li>24 grid</li><li>1.6 stroke</li><li>currentColor</li><li>MIT</li>
      </ul>
    </div>
    <div class="hero-fig">
      <figure class="frame">
        <figcaption class="frame-cap"><span>Fig. 01 · Specimen</span><span class="frame-rule" aria-hidden="true"></span><span id="spec-name">${spec.name}</span></figcaption>
        ${specimen}
      </figure>
      <div class="dim" aria-hidden="true"><span class="dim-line"></span><span class="dim-label">24 units</span><span class="dim-line"></span></div>
      <ol class="legend" id="spec-legend">${spec.legend}</ol>
      <script type="application/json" id="specimens">${JSON.stringify(specimens).replace(/</g, '\\u003c')}</script>
    </div>
  </div>
</section>

<section class="section" id="icons" aria-labelledby="icons-title">
  <div class="wrap">
    ${eyebrow('01', 'Icons')}
    <div class="section-head">
      <h2 id="icons-title">The set</h2>
      <p class="muted">Click an icon for its code. Size, stroke and colour are yours to change. Every icon also has <a href="/icons/">its own page</a>. <a href="/changelog/">See what's new</a> in ${esc(history.latest)}.</p>
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
        <button type="button" class="btn btn-sm btn-icon" id="seed-reset" aria-label="Reset seed to 0" title="Reset seed to 0" disabled>${toSvg(icons['rotate-ccw'], { size: 16 })}</button>
      </div>${HAS_WOBBLE ? `
      <div class="ctl ctl-wobble">
        <label for="wobble">Wobble</label>
        <input id="wobble" type="range" min="0" max="1" step="0.05" value="1">
        <output for="wobble" id="wobble-out">100%</output>
        <button type="button" class="btn btn-sm" id="perfect" aria-pressed="false" title="Draw every icon as exact shapes (wobble 0)">Perfect</button>
      </div>` : ''}
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
          <div><dt>Added in</dt><dd><a id="d-since" href="/changelog/#${anchor(history.since.ruler)}">v${history.since.ruler}</a></dd></div>
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
          <a class="btn btn-sm" id="d-page" href="/icons/ruler/">Open page</a>
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
@matita/icons/pencil.css           // paper grain for the pencil variant`)}
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
          <tr><td><code>pencil</code></td><td>boolean</td><td><code>false</code></td><td>Pencil variant: every stroke drawn as two or three loose pencil lines. Pair with <code>pencil.css</code> for the paper grain.</td></tr>
          <tr><td><code>title</code></td><td>string</td><td>none</td><td>Accessible label. Without it the icon is <code>aria-hidden</code>.</td></tr>
          <tr><td><code>seed</code></td><td>number</td><td><code>0</code></td><td><code>SketchIcon</code> only: a different drawing that always comes out the same for that seed.</td></tr>${HAS_WOBBLE ? `
          <tr><td><code>wobble</code></td><td>number</td><td><code>1</code></td><td><code>SketchIcon</code> only: how much hand there is, from 0 (exact shapes: true lines, circles and corners) to 1 (the full drawing).</td></tr>` : ''}
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
      <p class="muted">Pass <code>pencil</code> and every stroke is drawn as two or three loose pencil lines, like a quick sketch. Import <code>pencil.css</code> once for the paper grain.</p>
    </div>
    <div class="variants">
      <figure class="frame variant">
        <figcaption class="frame-cap"><span>Fig. 02 · Ink</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
        <div class="variant-row variant-grid">${demoRow('ink')}</div>
      </figure>
      <figure class="frame variant">
        <figcaption class="frame-cap"><span>Fig. 03 · Pencil</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
        <div class="variant-row variant-grid">${demoRow('pencil')}</div>
      </figure>
    </div>
    ${code('code-pencil', `import '@matita/icons/pencil.css';
import { Ruler } from '@matita/icons/react';

<Ruler size={32} pencil />`)}
  </div>
</section>

<section class="section" id="follow" aria-labelledby="follow-title">
  <div class="wrap">
    ${eyebrow('05', 'Follow along')}
    <div class="section-head">
      <h2 id="follow-title">Watch it <em>grow</em></h2>
      <p class="muted">New icons land in regular releases. See what just arrived, what is being built next, and how the pencil hand works.</p>
    </div>
    <div class="follow">
      <article class="follow-card">
        <h3>What's new in ${esc(history.latest)}</h3>
        <p>${newIcons.length} new icons in the latest batch.</p>
        <div class="follow-glyphs" aria-hidden="true">${newIcons.slice(0, 10).map(name => `<span title="${name}">${toSvg(icons[name], { size: 28 })}</span>`).join('')}</div>
        <a class="follow-link" href="/changelog/">Read the changelog ${ico('arrow-right', 16)}</a>
      </article>
      <article class="follow-card">
        <h3>Roadmap</h3>
        <ul class="follow-road">${roadmapOpen(history).slice(0, 4).map(i => `<li><strong>${esc(i.title)}</strong>${i.when ? `<span>${esc(i.when.replace(/^Target: /, ''))}</span>` : ''}</li>`).join('')}</ul>
        <a class="follow-link" href="/roadmap/">See where we are going ${ico('arrow-right', 16)}</a>
      </article>
      <article class="follow-card">
        <h3>How it works</h3>
        <p>Matita stores recipes, not drawings: a few shapes on a grid that a small program draws like a pencil. The same name always draws the same way.</p>
        <a class="follow-link" href="/how-it-works/">How it works, step by step ${ico('arrow-right', 16)}</a>
      </article>
    </div>
  </div>
</section>

<section class="section" id="used-in" aria-labelledby="used-title">
  <div class="wrap">
    ${eyebrow('06', 'Used in')}
    <div class="section-head">
      <h2 id="used-title">Where Matita <em>shows up</em></h2>
      <p class="muted">Libraries and projects that ship Matita. Using it somewhere? Open an issue or write to <a href="mailto:hello@matita.dev">hello@matita.dev</a> and it can be listed here.</p>
    </div>
    <div class="used">
      <figure class="frame used-fig">
        <figcaption class="frame-cap"><span>Fig. 04 · In sketchcn</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
        <img src="img/sketchcn-components.jpg" width="706" height="372" loading="lazy" alt="The sketchcn docs page for Matita: a row of Matita icons, and sketchcn buttons, a date picker and a theme toggle that use them">
      </figure>
      <div class="used-copy">
        <h3>sketchcn</h3>
        <p>A registry of hand-drawn React components in the shadcn style. Since 0.2.0 its Button, Checkbox, Dialog, Native Select, Sheet, Sidebar and Toast use Matita for their icons, and its docs have an icons page with install steps.</p>
        <div class="used-actions">
          <a class="btn btn-primary" href="https://sketchcn.chuwii.com">Visit sketchcn ${ico('arrow-right', 16)}</a>
          <a class="btn" href="https://sketchcn.chuwii.com/icons">How they use Matita</a>
        </div>
      </div>
    </div>
  </div>
</section>
</main>

${siteFooter('')}

<div class="sr-only" id="announce" aria-live="polite"></div>
</body>
</html>
`;
  /* links that leave the site open in a new tab */
  const external = s => s.replace(/<a ([^>]*?)href="(https?:\/\/[^"]+)"/g, '<a $1href="$2" target="_blank" rel="noopener"');
  const howHtml = external(howPage({ icons, DEFS, drawIcon, toSvg, toSvgInner, hash, esc, code, eyebrow, siteHeader, siteFooter, pkg }));
  await write('index.html', external(html));
  await write('how-it-works/index.html', howHtml);

  /* one page per icon + the /icons/ hub */
  const iconPages = buildIconPages({ icons, names, DEFS, drawIcon, hash, toSvg, toSvgInner, esc, code, eyebrow, siteHeader, siteFooter, pascal, pkg, history, newBadge, anchor, HAS_WOBBLE })
    .map(p => ({ ...p, html: external(p.html) }));
  for (const p of iconPages) await write(p.file, p.html);
  const changelogHtml = external(changelogPage({ history, icons, toSvg, esc, eyebrow, siteHeader, siteFooter }));
  await write('changelog/index.html', changelogHtml);
  const roadmapHtml = external(roadmapPage({ history, esc, eyebrow, siteHeader, siteFooter, count: n }));
  await write('roadmap/index.html', roadmapHtml);

  /* For AI tools and scripts: /icons.json is the machine-readable list of every icon (name, component, the version that
     added it), and /llms.txt is a short plain-text guide that points at it. Both come from the same data as the pages,
     so they always list exactly what the pinned package ships. */
  const latestNew = names.filter(name => history.isNew(name));
  await write('icons.json', JSON.stringify({
    name: '@matita/icons', version: pkg.version, count: n, site: SITE, license: 'MIT',
    install: 'npm i @matita/icons',
    usage: { react: "import { Ruler } from '@matita/icons/react'; <Ruler size={24} />", byName: "import { SketchIcon } from '@matita/icons/react'; <SketchIcon name=\"ruler\" />", js: "import { Ruler, toSvg } from '@matita/icons'; toSvg(Ruler, { size: 24 })" },
    latestRelease: { version: history.latest, icons: latestNew },
    icons: names.map(name => ({ name, component: pascal(name), since: history.since[name], url: `${SITE}icons/${name}/`, svg: `@matita/icons/icons/${name}.svg` }))
  }, null, 2) + '\n');
  await write('llms.txt', `# Matita icons

> ${n} pencil-style icons for the web, as SVG files and React components. Each icon is a short recipe of simple shapes on a 24 grid that code draws like a pencil would. The same name always draws the same way. MIT licensed. Current version: ${pkg.version}.

Use only the icon names listed below. Names are lowercase kebab-case and the React component is the PascalCase form (\`arrow-right\` is \`ArrowRight\`). If an icon you need is not in the list, it does not exist yet: pick the closest one or ask for it at https://github.com/matita-dev/icons/issues/new?template=icon-request.yml.

## Install and use

- Install: \`npm i @matita/icons\`
- React: \`import { Ruler } from '@matita/icons/react'; <Ruler size={24} />\`
- By name: \`import { SketchIcon } from '@matita/icons/react'; <SketchIcon name="ruler" />\`
- Plain JavaScript: \`import { Ruler, toSvg } from '@matita/icons'; toSvg(Ruler, { size: 24 })\`
- Props: \`size\` (px, default 16), \`color\` (default currentColor), \`strokeWidth\` (default 1.6 on the 24 grid), \`pencil\` (loose pencil variant, pair with \`@matita/icons/pencil.css\`), \`title\` (accessible label; without it the icon is decorative). \`SketchIcon\` also takes \`seed\`${HAS_WOBBLE ? ' and `wobble` (0 = exact shapes, 1 = the full hand, default 1)' : ''}.
- Plain files: \`@matita/icons/icons/<name>.svg\`, \`@matita/icons/pencil/<name>.svg\`${HAS_WOBBLE ? ', `@matita/icons/exact/<name>.svg`' : ''}, \`@matita/icons/sprite.svg\`

## Machine-readable

- [Every icon as JSON](${SITE}icons.json): name, component name and the version that added it
- [Changelog](${SITE}changelog/): which icons each release added
- [Roadmap](${SITE}roadmap/): what is being built and what comes next

## Pages

- [All ${n} icons](${SITE}icons/): every icon has its own page with code to copy
- [How it works](${SITE}how-it-works/)
- [GitHub](https://github.com/matita-dev/icons) and [npm](https://www.npmjs.com/package/@matita/icons)

## Added in ${history.latest}

${latestNew.join(', ')}

## All ${n} icons

${names.join(', ')}
`);

  /* sitemap: every page on the site */
  await write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    [SITE, SITE + 'how-it-works/', SITE + 'changelog/', SITE + 'roadmap/', ...iconPages.map(p => p.url)].map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);

  /* _headers (Cloudflare static assets): security headers on everything, long caching for files that never change.
     The page is plain HTML + one external script per page, so the policy can be strict. The only inline script is the
     one-liner that adds the `js` class; it is allowed by hash, so a CSP check here fails the build if it is edited.
     Not set here: HSTS (Cloudflare dashboard), and no Cross-Origin-Resource-Policy, because the README hot-links set.png. */
  const INLINE_JS = "document.documentElement.className+=' js'";
  for (const [name, page] of [['index.html', html], ['how-it-works/index.html', howHtml], ['changelog/index.html', changelogHtml], ['roadmap/index.html', roadmapHtml], ...iconPages.map(p => [p.file, p.html])])
    if (!page.includes(`<script>${INLINE_JS}</script>`)) throw new Error(`${name}: the inline script no longer matches the CSP hash in build.mjs`);
  const csp = [
    "default-src 'self'", `script-src 'self' 'sha256-${createHash('sha256').update(INLINE_JS).digest('base64')}'`, "style-src 'self'",
    "img-src 'self' data:", "font-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"
  ].join('; ');
  const small = 'Cache-Control: public, max-age=86400'; /* files whose names never change but whose content can: a day, then revalidate */
  /* The CSP goes on HTML pages only. On everything (it used to be on /*) it also hit sitemap.xml, and the browser's own
     XML viewer needs inline styles, so the sitemap showed as one run of text. Every page the build writes must sit under
     one of these patterns; the check below fails the build otherwise. */
  const CSP_PATHS = ['/', '/how-it-works/*', '/changelog/*', '/roadmap/*', '/icons/*'];
  const covered = u => CSP_PATHS.some(p => p.endsWith('*') ? u.startsWith(p.slice(0, -1)) : u === p);
  for (const u of ['/', '/how-it-works/', '/changelog/', '/roadmap/', ...iconPages.map(p => p.url.replace(SITE, '/'))])
    if (!covered(u)) throw new Error(`${u}: not covered by a Content-Security-Policy rule in _headers (CSP_PATHS in build.mjs)`);
  await write('_headers', `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()

${CSP_PATHS.map(p => `${p}\n  Content-Security-Policy: ${csp}`).join('\n')}

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/img/*
  Cache-Control: public, max-age=2592000

/og.png
  ${small}
/og/*
  ${small}
/set.png
  ${small}
/apple-touch-icon.png
  ${small}
/favicon.ico
  ${small}
/favicon.svg
  ${small}
/llms.txt
  ${small}
  Content-Type: text/plain; charset=utf-8
/icons.json
  ${small}
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
`);
  console.log(`site built with ${pkg.name}@${pkg.version}${LOCAL ? ' (local ../dist)' : ''}, ${n} icons`);
}
