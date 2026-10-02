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
    assert.match(await readFile(new URL(`../dist/svg-pencil/${n}.svg`, import.meta.url), 'utf8'), /data-sketch-pencil/);
  }
});

test('drawings are deterministic and seed-dependent', () => {
  assert.deepEqual(drawIcon('ruler'), lib.icons.ruler);
  assert.notDeepEqual(drawIcon('ruler', { seed: 3 }).ink, lib.icons.ruler.ink);
});

test('toSvg: stroke width scales every path, pencil adds the second pass', () => {
  const ink = lib.toSvg(lib.Search, { strokeWidth: 2 }), pencil = lib.toSvg(lib.Search, { pencil: true });
  const count = s => (s.match(/<path /g) || []).length;
  assert.equal(count(ink), lib.Search.ink.length);
  assert.equal(count(pencil), lib.Search.ink.length * 2);
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

test('custom glyphs draw in the same hand', () => {
  const T = R.createSketchIcon(drawIcon('t-square', { defs: { 't-square': 'L 4 5 20 5;L 12 5 12 20' } }));
  assert.match(renderToStaticMarkup(h(T)), /sketch-icon-t-square/);
});
