import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement as h, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as S from '../dist/react/shadcn.js';
import * as R from '../dist/react/index.js';
import { SHADCN_ICONS } from '../src/shadcn-names.js';
import { ALIASES } from '../src/aliases.js';

const exportsList = Object.keys(SHADCN_ICONS);
const render = (C, props) => renderToStaticMarkup(h(C, props));

test('shadcn entry exports every name in the list and nothing else', () => {
  assert.equal(exportsList.length, 166);
  assert.equal(exportsList.filter(e => e.endsWith('Icon')).length, 161);
  assert.deepEqual(exportsList.filter(e => !e.endsWith('Icon')).sort(), ['BadgeCheck', 'BookOpen', 'LifeBuoy', 'Send', 'VolumeX']);
  assert.deepEqual(Object.keys(S).sort(), [...exportsList].sort());
});

test('every shadcn export is a real component that draws its glyph', () => {
  for (const [name, target] of Object.entries(SHADCN_ICONS)) {
    const C = S[name];
    assert.equal(typeof C, 'object', name);
    assert.equal(C.displayName, name);
    const svg = render(C, {});
    assert.match(svg, /^<svg [^>]*viewBox="0 0 24 24"/, name);
    assert.match(svg, /<path /, name);
    // the glyph is the one the main entry draws under the target name (a glyph, or an alternate name's glyph)
    const glyph = ALIASES[target] ?? target;
    assert.match(svg, new RegExp(`sketch-icon-${glyph}"`), name);
    const main = R[name] ?? R[name + 'Icon'] ?? R[target.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase()) + 'Icon'];
    if (main) assert.equal(svg.replace(/ class="[^"]*"/, ''), render(main, { size: 24 }).replace(/ class="[^"]*"/, ''), name);
  }
});

test('defaults: size 24, stroke 1.6, currentColor, no inline display or flex', () => {
  const svg = render(S.ChevronDownIcon, {});
  assert.match(svg, /width="24" height="24"/);
  assert.match(svg, /stroke="currentColor"/);
  assert.match(svg, /stroke-width="1.6"/);
  assert.match(svg, /style="overflow:visible"/);
  assert.doesNotMatch(svg, /display|flex/);
});

test('size, strokeWidth, className, data-* and aria-* pass through', () => {
  const svg = render(S.ChevronUpIcon, { size: 16, strokeWidth: 2, className: 'hidden shrink-0 group-aria-expanded/x:inline', 'data-icon': 'inline-start', 'data-slot': 'accordion-trigger-icon', 'aria-hidden': 'true' });
  assert.match(svg, /width="16" height="16"/);
  assert.match(svg, /stroke-width="2"/);
  assert.match(svg, /class="sketch-icon sketch-icon-chevron-up hidden shrink-0 group-aria-expanded\/x:inline"/);
  assert.match(svg, /data-icon="inline-start"/);
  assert.match(svg, /data-slot="accordion-trigger-icon"/);
  assert.match(svg, /aria-hidden="true"/);
  assert.match(render(S.InfoIcon, { 'aria-label': 'Info', role: 'img' }), /aria-label="Info"[^>]*>|role="img"/);
  assert.doesNotMatch(render(S.InfoIcon, { 'aria-label': 'Info' }), /aria-hidden/);
  assert.match(render(S.InfoIcon, { style: { display: 'none' } }), /style="overflow:visible;display:none"/);
});

test('ref is forwarded to the svg', () => {
  const ref = createRef();
  let el;
  renderToStaticMarkup(h(() => { el = S.SearchIcon.render({}, ref); return null; }));  // hooks need a render pass
  assert.equal(el.type, 'svg');
  assert.equal(el.ref, ref);
  assert.equal(typeof S.SearchIcon.$$typeof, 'symbol');
});

test('the provider still sets defaults, and an explicit size wins over it', () => {
  const wrap = (C, props, ctx) => renderToStaticMarkup(h(R.SketchIconProvider, ctx, h(C, props)));
  assert.match(wrap(S.PlusIcon, {}, { size: 20, strokeWidth: 2 }), /width="20" height="20"[^>]*stroke-width="2"/);
  assert.match(wrap(S.PlusIcon, { size: 12 }, { size: 20 }), /width="12" height="12"/);
});

test('the package exposes ./shadcn and keeps it free of side effects', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.deepEqual(pkg.exports['./shadcn'], { types: './dist/react/shadcn.d.ts', default: './dist/react/shadcn.js' });
  assert.deepEqual(pkg.sideEffects, ['*.css']);
  const js = await readFile(new URL('../dist/react/shadcn.js', import.meta.url), 'utf8');
  assert.doesNotMatch(js, /\.css/);
  assert.equal((js.match(/\/\*#__PURE__\*\//g) || []).length, 166);
  assert.match(await readFile(new URL('../dist/react/shadcn.d.ts', import.meta.url), 'utf8'), /export declare const AlertTriangleIcon: SketchIconComponent;/);
});
