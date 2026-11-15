import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { DEFS } from '../src/defs.js';
import { KEYWORDS } from '../src/keywords.js';
import { ALIASES, APPROXIMATE_ALIASES } from '../src/aliases.js';
import { SHADCN_ICONS } from '../src/shadcn-names.js';
import { buildLlms, LIMITS, HAZARDS } from '../scripts/llms.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFile(join(root, p), 'utf8');
const pkg = JSON.parse(await read('package.json'));
const names = Object.keys(DEFS);

test('llms.txt and llms-full.txt are what the shared generator makes from the sources', async () => {
  const want = buildLlms({ version: pkg.version, names, keywords: KEYWORDS, aliases: ALIASES, approximate: APPROXIMATE_ALIASES, shadcnCount: Object.keys(SHADCN_ICONS).length });
  assert.equal(await read('dist/llms.txt'), want.short);
  assert.equal(await read('dist/llms-full.txt'), want.full);
});

test('llms files: counts, every glyph name, every alternate name and the approximate marks', async () => {
  const short = await read('dist/llms.txt'), full = await read('dist/llms-full.txt');
  assert.ok(short.includes(`> ${names.length} pencil-style icons`));
  assert.ok(short.includes(`## All ${names.length} glyphs`));
  const list = short.split(`## All ${names.length} glyphs\n\n`)[1].trim().split(', ');
  assert.deepEqual(list, names);
  assert.ok(short.includes(`Version ${pkg.version}`));
  assert.ok(short.includes(`${Object.keys(ALIASES).length} extra spellings`));
  assert.ok(short.includes(`${APPROXIMATE_ALIASES.length} alternate names are marked approximate`));
  assert.ok(short.includes(`gives ${Object.keys(SHADCN_ICONS).length} components`));
  // llms-full.txt: one keyword line per glyph, one table row per alternate name
  const kwBlock = full.split('## Glyph keywords')[1].split('## Alternate names')[0];
  const kwLines = kwBlock.split('\n').filter(l => /^[a-z0-9-]+:( |$)/.test(l));
  assert.deepEqual(kwLines.map(l => l.split(':')[0]), names);
  for (const l of kwLines) assert.equal(l.slice(l.indexOf(':') + 1).trim(), KEYWORDS[l.split(':')[0]].join(' '));
  const rows = full.split('## Alternate names')[1].split('\n').filter(l => / -> /.test(l));
  assert.equal(rows.length, Object.keys(ALIASES).length);
  for (const row of rows) {
    const [a, rest] = row.split(' -> ');
    assert.equal(rest.replace(' (approximate)', ''), ALIASES[a], a);
    assert.equal(rest.endsWith(' (approximate)'), APPROXIMATE_ALIASES.includes(a), `${a}: approximate mark`);
  }
});

test('llms files: size limits, the same-name hazards, the client note and no other brand names', async () => {
  const short = await read('dist/llms.txt'), full = await read('dist/llms-full.txt');
  assert.ok(Buffer.byteLength(short) <= LIMITS.short, 'llms.txt over its limit');
  assert.ok(Buffer.byteLength(full) <= LIMITS.full, 'llms-full.txt over its limit');
  assert.ok(Buffer.byteLength(short) + Buffer.byteLength(full) < 44 * 1024, 'the two files together stay near 40 KB');
  assert.ok(Buffer.byteLength(full) > Buffer.byteLength(short));
  assert.equal(HAZARDS.length, 2);
  assert.match(short, /`chart-bar` draws vertical bars/);
  assert.match(short, /`loader` draws an arc/);
  assert.match(short, /'use client'/);
  assert.match(short, /import \{ SearchIcon \} from '@matita\/icons\/react'/);
  assert.match(short, /## When to use/);
  assert.doesNotMatch(short + full, /lucide/i);
});

test('the package exposes the llms files', async () => {
  assert.equal(pkg.exports['./llms.txt'], './dist/llms.txt');
  assert.equal(pkg.exports['./llms-full.txt'], './dist/llms-full.txt');
  assert.ok(pkg.files.includes('dist'));
});

/* React Server Components (Next.js App Router) */
const reactFiles = async dir => (await readdir(join(root, dir), { withFileTypes: true, recursive: true }))
  .filter(e => e.isFile() && e.name.endsWith('.js')).map(e => join(e.parentPath ?? e.path, e.name));

test("every dist/react module starts with the 'use client' directive (after the banner comment)", async () => {
  const files = await reactFiles('dist/react');
  assert.ok(files.length > 440);
  for (const f of files) {
    const src = await readFile(f, 'utf8');
    assert.match(src, /^\/\*![^\n]*\*\/\n'use client';\n/, f);
  }
  // the UMD and plain-JavaScript entries have no React and carry no directive
  assert.doesNotMatch(await read('dist/esm/index.js'), /use client/);
});

test('react-server: the React entries are client boundaries, and the plain entries load without React', async () => {
  // a server-side bundler stops at the first 'use client' module, so entries that start with it never run hooks there
  for (const entry of ['dist/react/index.js', 'dist/react/shadcn.js']) assert.match(await read(entry), /^\/\*![^\n]*\*\/\n'use client';\n/, entry);
  // the main entry and the engine have no React import and load under the react-server condition (the installed React 18 has no server build, so the React entries are checked by their directive and by the Next.js check in the PR notes)
  const load = "Promise.all([import('./dist/esm/index.js'), import('./dist/esm/engine.js')]).then(([a, b]) => process.stdout.write(String(a.names.length + ':' + typeof b.drawIcon)))";
  const loaded = execFileSync(process.execPath, ['--conditions=react-server', '-e', load], { cwd: root, encoding: 'utf8' });
  assert.equal(loaded, `${names.length}:function`);
  // every module that imports React is a client module (the boundary), so none can run on the server by accident
  for (const f of await reactFiles('dist/react')) {
    const src = await readFile(f, 'utf8');
    if (/from 'react'/.test(src)) assert.match(src, /'use client';/, f);
  }
});

test('alternate names: spellings of one meaning get the same approximate flag', () => {
  const flagged = new Set(APPROXIMATE_ALIASES);
  for (const g of [['check-circle', 'check-circle-2'], ['check-square', 'check-square-2'], ['circle-user', 'circle-user-round', 'user-circle-2']])
    assert.equal(new Set(g.map(a => flagged.has(a))).size, 1, g.join(', '));
  assert.ok(['grid', 'grid-2x2', 'grid-2-x-2', 'text', 'circle-check-big'].every(a => flagged.has(a)));
  assert.ok(!['grid-3-x-3', 'house', 'check-circle', 'check-circle-2', 'check-square'].some(a => flagged.has(a)));
});
