import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as lib from '../dist/esm/index.js';
import { drawIcon, DEFS } from '../dist/esm/engine.js';
import * as R from '../dist/react/index.js';

const pascal = n => n.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

test('every glyph is exported in every format', async () => {
  assert.deepEqual(lib.names, Object.keys(DEFS));
  for (const n of lib.names) {
    assert.equal(lib[pascal(n)], lib.icons[n]);
    assert.equal(typeof R[pascal(n)], 'object');
    assert.match(await readFile(new URL(`../dist/svg/${n}.svg`, import.meta.url), 'utf8'), /^<svg [^>]*viewBox="0 0 24 24"/);
    assert.match(await readFile(new URL(`../dist/svg-pencil/${n}.svg`, import.meta.url), 'utf8'), /data-sketch-pencil=""[^>]*><defs><filter id="matita-grain"[^]*<g filter="url\(#matita-grain\)">[^]*<\/g><\/svg>/);
  }
  const css = await readFile(new URL('../dist/pencil.css', import.meta.url), 'utf8');
  assert.match(css, /mask-image:url\("data:image\/svg\+xml,/);
  // --matita-grain adds a solid layer with opacity 1 - grain; it defaults to 1, so the default look is the full grain
  assert.match(css, /mask-image:url\("data:image\/svg\+xml,[^"]+"\),linear-gradient\(rgb\(0 0 0 \/ calc\(1 - var\(--matita-grain, 1\)\)\)/);
  assert.match(css, /mask-composite:add/);
});

test('svg files are well-formed XML: every attribute has a quoted value', async () => {
  const bare = /<[a-z]+(?:\s+[\w:-]+="[^"]*")*\s+[\w:-]+(?=[\s/>])(?!=)/i;
  const files = lib.names.flatMap(n => [`svg/${n}.svg`, `svg-pencil/${n}.svg`]).concat('sprite.svg');
  for (const f of files) assert.doesNotMatch(await readFile(new URL(`../dist/${f}`, import.meta.url), 'utf8'), bare, f);
  assert.doesNotMatch(lib.toSvg(lib.Ruler, { pencil: true }), bare);
});

test('drawings are deterministic and seed-dependent', () => {
  assert.deepEqual(drawIcon('ruler'), lib.icons.ruler);
  assert.notDeepEqual(drawIcon('ruler', { seed: 3 }).ink, lib.icons.ruler.ink);
});

test('wobble: 1 is the default drawing, 0 is the exact shapes, in between is less hand', () => {
  for (const n of ['ruler', 'search', 'calendar', 'info']) {
    assert.deepEqual(drawIcon(n, { wobble: 1 }), drawIcon(n));
    const exact = drawIcon(n, { wobble: 0 }), half = drawIcon(n, { wobble: .5 });
    assert.deepEqual(drawIcon(n, { wobble: 0, seed: 9 }), exact, 'exact shapes do not depend on the seed');
    assert.notDeepEqual(exact.ink, drawIcon(n).ink);
    assert.notDeepEqual(half.ink, drawIcon(n).ink);
    assert.ok(exact.ink.every(([, w]) => w === 1));
  }
  assert.equal(drawIcon('minus', { wobble: 0 }).ink[0][0], 'M5 12L19 12');
  assert.match(drawIcon('circle', { wobble: 0 }).ink[0][0], /^M[\d. ]+A[\d. ]+ 0 1 0 [\d. ]+A/);
  assert.deepEqual(drawIcon('ruler', { wobble: 7 }), drawIcon('ruler'), 'wobble is clamped to 1');
  assert.match(renderToStaticMarkup(h(R.SketchIcon, { name: 'minus', wobble: 0 })), /d="M5 12L19 12"/);
  assert.doesNotMatch(renderToStaticMarkup(h(R.SketchIcon, { name: 'minus', wobble: 0 })), /wobble/);
});

test('pencil variant also draws over exact shapes (lines, arcs, closed shapes)', () => {
  for (const n of ['circle', 'calendar', 'heart', 'clock', 'bezier', 'radiation']) {
    const svg = lib.toSvg(drawIcon(n, { wobble: 0 }), { pencil: true });
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, n);
    assert.ok((svg.match(/<path /g) || []).length >= 2, n);
  }
});

test('toSvg: stroke width scales every path, pencil draws two or three lines per stroke', () => {
  const ink = lib.toSvg(lib.Search, { strokeWidth: 2 }), pencil = lib.toSvg(lib.Search, { pencil: true });
  const count = s => (s.match(/<path /g) || []).length, subpaths = icon => icon.ink.reduce((a, [d]) => a + d.split('M').length - 1, 0);
  assert.equal(count(ink), lib.Search.ink.length);
  for (const icon of [lib.Search, lib.Calendar, lib.Info]) {
    const n = count(lib.toSvg(icon, { pencil: true })) - (icon.dot ? 1 : 0);
    assert.ok(n >= 2 * subpaths(icon) && n <= 3 * subpaths(icon), `${icon.name}: ${n} pencil lines`);
  }
  assert.equal(lib.toSvg(lib.Search, { pencil: true }), pencil);
  assert.notEqual(lib.toSvg(drawIcon('search', { seed: 3 }), { pencil: true }), pencil);
  assert.match(ink, /stroke-width="2"/);
  assert.match(lib.toSvg(lib.Info, { title: 'Info' }), /role="img" aria-label="Info"><title>Info<\/title>/);
});

test('React components render and honour props + provider', () => {
  const a = renderToStaticMarkup(h(R.ArrowRight, { size: 20, color: 'red', className: 'x' }));
  assert.match(a, /width="20"/);
  assert.match(a, /stroke="red"/);
  assert.match(a, /class="sketch-icon sketch-icon-arrow-right x"/);
  assert.match(a, /aria-hidden="true"/);
  const b = renderToStaticMarkup(h(R.SketchIconProvider, { size: 32, pencil: true }, h(R.SketchIcon, { name: 'crosshair' })));
  assert.match(b, /width="32"/);
  assert.match(b, /data-sketch-pencil=""/);
  assert.equal(renderToStaticMarkup(h(R.SketchIcon, { name: 'nope' })), '');
  assert.ok(R.SketchIcon.has('set-square'));
});

test('icons are aria-hidden only when no label or role is passed', () => {
  // minimal stand-in for a DOM document: createElement only needs createElementNS/setAttribute/appendChild
  const doc = { createElementNS: (_, tag) => ({ tag, attrs: {}, children: [], textContent: '',
    setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.children.push(c); } }) };
  const cases = [
    { name: 'none', attrs: {}, hidden: true, role: undefined },
    { name: 'aria-label', attrs: { 'aria-label': 'Delete' }, hidden: false, role: 'img' },
    { name: 'empty aria-label', attrs: { 'aria-label': '' }, hidden: true, role: undefined },
    { name: 'aria-labelledby', attrs: { 'aria-labelledby': 'trash-label' }, hidden: false, role: 'img' },
    { name: 'own role', attrs: { role: 'presentation' }, hidden: false, role: 'presentation' }
  ];
  for (const { name, attrs, hidden, role } of cases) {
    const svg = lib.toSvg(lib.Trash, { attrs });
    const el = lib.createElement(lib.Trash, { attrs }, doc);
    const jsx = renderToStaticMarkup(h(R.Trash, attrs));
    for (const [out, s] of [['toSvg', svg], ['React', jsx]]) {
      assert.equal(/aria-hidden="true"/.test(s), hidden, `${out} / ${name}: aria-hidden`);
      assert.equal(s.match(/role="([^"]+)"/)?.[1], role, `${out} / ${name}: role`);
    }
    assert.equal(el.attrs['aria-hidden'] === 'true', hidden, `createElement / ${name}: aria-hidden`);
    assert.equal(el.attrs.role, role, `createElement / ${name}: role`);
  }

  // title labels the icon and renders a <title> child in every output
  const titled = renderToStaticMarkup(h(R.Trash, { title: 'Delete' }));
  assert.match(titled, /role="img" aria-label="Delete"/);
  assert.doesNotMatch(titled, /aria-hidden/);
  assert.match(titled, /<title>Delete<\/title>/);
  assert.match(lib.toSvg(lib.Trash, { title: 'Delete' }), /role="img" aria-label="Delete"><title>Delete<\/title>/);
  const el = lib.createElement(lib.Trash, { title: 'Delete' }, doc);
  assert.equal(el.attrs['aria-label'], 'Delete');
  assert.equal(el.attrs['aria-hidden'], undefined);
  assert.equal(el.children[0].tag, 'title');
});

test('rough: 0 is the pencil as before, up to 1 is wider and looser, deterministic, pencil only', async () => {
  const count = s => (s.match(/<path /g) || []).length;
  const widths = s => [...s.matchAll(/<path [^>]*stroke-width="([\d.]+)"/g)].map(m => +m[1]);
  for (const icon of [lib.Search, lib.Calendar, lib.Star]) {
    const base = lib.toSvg(icon, { pencil: true });
    assert.equal(lib.toSvg(icon, { pencil: true, rough: 0 }), base);
    assert.equal(lib.toSvg(icon, { pencil: true, rough: 1 }), lib.toSvg(icon, { pencil: true, rough: 1 }));
    const rough = lib.toSvg(icon, { pencil: true, rough: 1 });
    assert.ok(count(rough) > count(base), `${icon.name}: more pencil lines at 1`);
    assert.ok(Math.max(...widths(rough)) > Math.max(...widths(base)), `${icon.name}: wider lines at 1`);
    assert.notEqual(lib.toSvg(icon, { pencil: true, rough: 0.5 }), base);
    // rough works in steps of 0.05, so values in between reuse a drawing
    assert.equal(lib.toSvg(icon, { pencil: true, rough: 0.51 }), lib.toSvg(icon, { pencil: true, rough: 0.5 }));
    assert.equal(lib.toSvg(icon, { pencil: true, rough: 0.01 }), base);
    // rough is clamped to 0..1
    assert.equal(lib.toSvg(icon, { pencil: true, rough: 3 }), rough);
    assert.equal(lib.toSvg(icon, { pencil: true, rough: -1 }), base);
    // rough only changes pencil icons
    assert.equal(lib.toSvg(icon, { rough: 1 }), lib.toSvg(icon));
  }

  // rough also roughens exact shapes (wobble 0) without changing them
  for (const n of lib.names) {
    const exactRough = lib.toSvg(drawIcon(n, { wobble: 0 }), { pencil: true, rough: 1 });
    assert.doesNotMatch(exactRough, /NaN|undefined|Infinity/, n);
    assert.equal(exactRough, lib.toSvg(drawIcon(n, { wobble: 0 }), { pencil: true, rough: 1 }), n);
  }

  // the nearest pencil.css texture level is set as data-sketch-rough
  const level = rough => lib.toSvg(lib.Star, { pencil: true, rough }).match(/data-sketch-rough="(\d)"/)?.[1];
  assert.deepEqual([0, 0.2, 0.5, 0.7, 0.8, 1].map(level), [undefined, undefined, '1', '1', '2', '2']);
  assert.doesNotMatch(lib.toSvg(lib.Star, { rough: 1 }), /data-sketch-rough/);

  // React: prop and provider, same drawing as toSvg
  const jsx = renderToStaticMarkup(h(R.Star, { pencil: true, rough: 1 }));
  assert.match(jsx, /data-sketch-rough="2"/);
  assert.deepEqual(widths(jsx), widths(lib.toSvg(lib.Star, { pencil: true, rough: 1 })));
  assert.match(renderToStaticMarkup(h(R.SketchIconProvider, { pencil: true, rough: 0.5 }, h(R.SketchIcon, { name: 'star' }))), /data-sketch-rough="1"/);
  assert.equal(renderToStaticMarkup(h(R.Star, { pencil: true, rough: 0 })), renderToStaticMarkup(h(R.Star, { pencil: true })));

  // replaceIcons reads data-rough
  const doc = { createElementNS: (_, tag) => ({ tag, attrs: {}, children: [], setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.children.push(c); } }) };
  let swapped;
  const el = { dataset: { pencil: '', rough: '1' }, getAttribute: k => (k === 'data-sketch-icon' ? 'star' : null), replaceWith: s => { swapped = s; } };
  lib.replaceIcons({ icons: lib.icons, root: { ownerDocument: doc, querySelectorAll: () => [el] } });
  assert.equal(swapped.attrs['data-sketch-rough'], '2');

  // both texture levels keep the --matita-grain dial
  const css = await readFile(new URL('../dist/pencil.css', import.meta.url), 'utf8');
  for (const n of [1, 2]) {
    assert.match(css, new RegExp(`\\[data-sketch-rough="${n}"\\]\\{\\s*-webkit-mask-image:url\\("data:image/svg\\+xml,[^"]+"\\),linear-gradient\\(rgb\\(0 0 0 / calc\\(1 - var\\(--matita-grain, 1\\)\\)\\)`));
  }
});

test('custom glyphs draw in the same hand', () => {
  const T = R.createSketchIcon(drawIcon('t-square', { defs: { 't-square': 'L 4 5 20 5;L 12 5 12 20' } }));
  assert.match(renderToStaticMarkup(h(T)), /sketch-icon-t-square/);
});

test('B draws one Bezier line: exact at wobble 0, a hand at 1, deterministic', () => {
  const defs = { bow: 'B 4 12 4 6 20 6 20 12 20 18 4 18 4 12' };
  assert.equal(drawIcon('bow', { defs, wobble: 0 }).ink[0][0], 'M4 12C4 6 20 6 20 12C20 18 4 18 4 12');
  const hand = drawIcon('bow', { defs });
  assert.equal(hand.ink.length, 1, 'one stroke');
  assert.match(hand.ink[0][0], /^M[\d. ]+C[\d. ]+C[\d. ]+$/);
  assert.notEqual(hand.ink[0][0], drawIcon('bow', { defs, wobble: 0 }).ink[0][0]);
  assert.deepEqual(hand, drawIcon('bow', { defs }));
  assert.notDeepEqual(hand.ink, drawIcon('bow', { defs, seed: 3 }).ink);
});

test('S draws one smooth line through its points: exact at wobble 0, a hand at 1, deterministic', () => {
  const defs = { wave: 'S 4 12 9 6 15 18 20 12', ring: 'S 12 4 20 12 12 20 4 12 12 4' };
  assert.equal(drawIcon('wave', { defs, wobble: 0 }).ink[0][0].startsWith('M4 12C'), true);
  assert.match(drawIcon('ring', { defs, wobble: 0 }).ink[0][0], /Z$/);
  const hand = drawIcon('wave', { defs });
  assert.equal(hand.ink.length, 1, 'one stroke');
  assert.match(hand.ink[0][0], /^M[\d. ]+(C[\d. ]+)+$/);
  assert.notEqual(hand.ink[0][0], drawIcon('wave', { defs, wobble: 0 }).ink[0][0]);
  assert.deepEqual(hand, drawIcon('wave', { defs }));
  assert.equal(drawIcon('ring', { defs }).ink.length, 1);
});

test('every icon has search keywords, shipped as KEYWORDS and keywords.json', async () => {
  const json = JSON.parse(await readFile(new URL('../dist/keywords.json', import.meta.url), 'utf8'));
  const { aliases, approximateAliases, ...perGlyph } = json;
  assert.deepEqual(Object.keys(perGlyph), Object.keys(lib.KEYWORDS));
  assert.deepEqual(aliases, lib.ALIASES);
  assert.deepEqual(approximateAliases, lib.APPROXIMATE_ALIASES);
  for (const n of lib.names) assert.ok(lib.KEYWORDS[n]?.length, `${n} has no keywords`);
  assert.ok(lib.KEYWORDS.trash.includes('bin'));
  assert.ok(lib.KEYWORDS.smile.includes('emoji'));
});

test('alternate names: every alias points at a real glyph and never shadows one', () => {
  const aliases = Object.entries(lib.ALIASES);
  assert.ok(aliases.length >= 100, 'the alias layer is not empty');
  for (const [alias, target] of aliases) {
    assert.ok(lib.names.includes(target), `${alias} -> ${target}: no such glyph`);
    assert.ok(!lib.names.includes(alias), `${alias} collides with a glyph`);
    assert.ok(!(alias in lib.icons), `${alias} is in the icons map`);
    assert.match(alias, /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, `${alias}: kebab-case`);
    assert.ok(!(target in lib.ALIASES), `${alias} points at another alias`);
  }
  for (const a of lib.APPROXIMATE_ALIASES) assert.ok(a in lib.ALIASES, `${a}: approximate but not an alias`);
  assert.equal(new Set(lib.APPROXIMATE_ALIASES).size, lib.APPROXIMATE_ALIASES.length);
  assert.ok(lib.APPROXIMATE_ALIASES.includes('check-circle') && lib.APPROXIMATE_ALIASES.includes('settings-2'));
  assert.ok(!lib.APPROXIMATE_ALIASES.includes('house'));
  // names stay glyph-only; the reserved JSON field names are not glyphs
  assert.deepEqual(lib.names, Object.keys(DEFS));
  assert.ok(!lib.names.includes('aliases') && !lib.names.includes('approximateAliases'));
});

test('alternate names: X and XIcon exist in the main and React entries and draw the same as their glyph', () => {
  const taken = new Set(lib.names.map(pascal));
  for (const [alias, target] of Object.entries(lib.ALIASES)) {
    const P = pascal(alias);
    assert.ok(!taken.has(P), `${P}: export name already used`);
    taken.add(P);
    for (const key of [P, `${P}Icon`]) {
      assert.equal(lib[key], lib.icons[target], `${key} is the data of ${target}`);
      assert.equal(typeof R[key], 'object', `React ${key}`);
      assert.equal(R[key], R[pascal(target)], `React ${key} is the component of ${target}`);
    }
    assert.equal(lib.toSvg(lib[P]), lib.toSvg(lib.icons[target]));
  }
  const spot = (n, props) => renderToStaticMarkup(h(R[n], props));
  assert.equal(spot('House', { size: 20 }).replace('sketch-icon-home', ''), spot('Home', { size: 20 }).replace('sketch-icon-home', ''));
  assert.equal(spot('HouseIcon'), spot('Home'));
  assert.equal(spot('CheckCircle'), spot('CircleCheck'));
});

test('alternate names: icons.json carries aliases and the exports match it', async () => {
  const json = JSON.parse(await readFile(new URL('../dist/icons.json', import.meta.url), 'utf8'));
  assert.deepEqual(json.aliases, lib.ALIASES);
  assert.deepEqual(json.approximateAliases, lib.APPROXIMATE_ALIASES);
  assert.deepEqual(Object.keys(json).filter(k => k !== 'aliases' && k !== 'approximateAliases'), lib.names);
  for (const [alias, target] of Object.entries(json.aliases)) {
    assert.ok(json[target]?.ink, `${alias} -> ${target}`);
    assert.ok(!(alias in json), `${alias} is also a glyph entry`);
    assert.equal(typeof lib[pascal(alias)], 'object', `${alias} has an export`);
  }
  // every export that is not a glyph is an alias, in both name styles
  const extra = Object.keys(lib).filter(k => typeof lib[k] === 'object' && lib[k]?.ink && !lib.names.some(n => pascal(n) === k || `${pascal(n)}Icon` === k));
  assert.deepEqual(extra.sort(), Object.keys(lib.ALIASES).flatMap(a => [pascal(a), `${pascal(a)}Icon`]).sort());
});

test('alternate names: SketchIcon and replaceIcons accept them', () => {
  assert.ok(R.SketchIcon.has('house') && R.SketchIcon.has('home') && !R.SketchIcon.has('nope'));
  assert.ok(!R.SketchIcon.names.includes('house'), 'names lists glyphs only');
  const strip = m => m.replace(/sketch-icon-[a-z0-9-]+/g, '');
  assert.equal(strip(renderToStaticMarkup(h(R.SketchIcon, { name: 'house' }))), strip(renderToStaticMarkup(h(R.SketchIcon, { name: 'home' }))));
  assert.equal(strip(renderToStaticMarkup(h(R.SketchIcon, { name: 'house', wobble: 0 }))), strip(renderToStaticMarkup(h(R.SketchIcon, { name: 'home', wobble: 0 }))));
  assert.equal(renderToStaticMarkup(h(R.SketchIcon, { name: 'constructor' })), '');
  const doc = { createElementNS: (_, tag) => ({ tag, attrs: {}, children: [], setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.children.push(c); } }) };
  const swap = aliases => {
    let out;
    const el = { dataset: {}, getAttribute: k => (k === 'data-sketch-icon' ? 'house' : null), replaceWith: s => { out = s; } };
    lib.replaceIcons({ icons: lib.icons, aliases, root: { ownerDocument: doc, querySelectorAll: () => [el] } });
    return out;
  };
  assert.ok(swap(lib.ALIASES), 'resolved with aliases');
  assert.equal(swap(undefined), undefined, 'unknown without aliases, as before');
});

test('alternate names: aliases are pure re-exports, so a named import keeps tree-shaking', async () => {
  const esbuild = await import('esbuild');
  const bundle = async (entry, code) => (await esbuild.build({
    stdin: { contents: code, resolveDir: fileURLToPath(new URL('../dist', import.meta.url)) },
    bundle: true, minify: true, write: false, format: 'esm', external: ['react'], logLevel: 'silent'
  })).outputFiles[0].text;
  for (const [entry, via] of [['./esm/index.js', ''], ['./react/index.js', '']]) {
    const alias = await bundle(entry, `import { House } from '${entry}'; console.log(House);`);
    const glyph = await bundle(entry, `import { Home } from '${entry}'; console.log(Home);`);
    assert.equal(alias.length, glyph.length, `${entry}: an alias costs nothing over its glyph`);
    assert.ok(alias.length < 6000, `${entry}: one named import stays small (${alias.length} bytes)`);
    assert.doesNotMatch(alias, /sketch-icon-ruler|"name":"ruler"/);
  }
});

test('renderer: no inline display or flex, so utility classes win; a user style still wins', () => {
  const hidden = renderToStaticMarkup(h(R.ChevronDown, { className: 'hidden group-aria-expanded:inline shrink-0' }));
  assert.match(hidden, /class="sketch-icon sketch-icon-chevron-down hidden group-aria-expanded:inline shrink-0"/);
  assert.doesNotMatch(hidden, /display|flex/);
  assert.match(hidden, /style="overflow:visible"/);
  const user = renderToStaticMarkup(h(R.ChevronDown, { style: { display: 'block', flex: '1 1 auto', color: 'red' } }));
  assert.match(user, /display:block/);
  assert.match(user, /flex:1 1 auto/);
  assert.match(user, /color:red/);
  assert.match(user, /overflow:visible/);
});
