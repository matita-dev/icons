#!/usr/bin/env node
/* Validates glyph sources: known primitives, right arity, on the 24 grid, and a drawable result. */
import { DEFS } from '../src/defs.js';
import { drawIcon } from '../src/sketchify.js';

const ARITY = { L: [4], P: 'pairs', Z: 'pairs', R: [4], C: [3], E: [4], A: [5], Q: [6], O: [2] };
const errors = [];

for (const [name, src] of Object.entries(DEFS)) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) errors.push(`${name}: names are lower kebab-case`);
  const parts = src.split(';').map(s => s.trim()).filter(Boolean);
  parts.forEach((part, i) => {
    const k = part[0], v = part.slice(1).trim().split(/\s+/).map(Number), at = `${name} #${i + 1} (${part})`;
    const ar = ARITY[k];
    if (!ar) return errors.push(`${at}: unknown primitive "${k}"`);
    if (v.some(Number.isNaN)) return errors.push(`${at}: non-numeric value`);
    if (ar === 'pairs' ? v.length < 4 || v.length % 2 : !ar.includes(v.length)) errors.push(`${at}: wrong number of values`);
    const coords = k === 'A' ? v.slice(0, 3) : k === 'C' ? v.slice(0, 2) : k === 'E' ? v.slice(0, 2) : k === 'R' ? [v[0], v[1], v[0] + v[2], v[1] + v[3]] : v;
    if (coords.some(c => c < 1 || c > 23)) errors.push(`${at}: outside the 24 grid (keep within 1–23)`);
  });
  try {
    const g = drawIcon(name);
    if (!g.ink.length && !g.dot) errors.push(`${name}: draws nothing`);
    if (JSON.stringify(g) !== JSON.stringify(drawIcon(name))) errors.push(`${name}: not deterministic`);
  } catch (e) { errors.push(`${name}: ${e.message}`); }
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`${Object.keys(DEFS).length} glyphs ok`);
