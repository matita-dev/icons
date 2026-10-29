import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
  assert.match(await readFile(new URL('../dist/pencil.css', import.meta.url), 'utf8'), /mask-image:url\("data:image\/svg\+xml,/);
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
