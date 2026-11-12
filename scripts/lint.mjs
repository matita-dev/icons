#!/usr/bin/env node
/* Validates glyph sources: known primitives, right arity, on the 24 grid, and a drawable result. */
import { DEFS } from '../src/defs.js';
import { KEYWORDS } from '../src/keywords.js';
import { ALIASES, APPROXIMATE_ALIASES } from '../src/aliases.js';
import { drawIcon } from '../src/sketchify.js';

const ARITY = { L: [4], P: 'pairs', Z: 'pairs', R: [4], C: [3], E: [4], A: [5], Q: [6], O: [2], B: 'bez', S: 'pairs' };
const errors = [];

for (const [name, src] of Object.entries(DEFS)) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) errors.push(`${name}: names are lower kebab-case`);
  const parts = src.split(';').map(s => s.trim()).filter(Boolean);
  parts.forEach((part, i) => {
    const k = part[0], v = part.slice(1).trim().split(/\s+/).map(Number), at = `${name} #${i + 1} (${part})`;
    const ar = ARITY[k];
    if (!ar) return errors.push(`${at}: unknown primitive "${k}"`);
    if (v.some(Number.isNaN)) return errors.push(`${at}: non-numeric value`);
    // B is a start point, then per segment two handles and an end point: 2 + 6n numbers
    if (ar === 'pairs' ? v.length < 4 || v.length % 2 : ar === 'bez' ? v.length < 8 || (v.length - 2) % 6 : !ar.includes(v.length)) errors.push(`${at}: wrong number of values`);
    // a B handle may leave the grid (the curve stays inside its hull), so only its nodes are checked
    const coords = k === 'B' ? v.filter((_, n) => n < 2 || (n - 2) % 6 > 3) : k === 'A' ? v.slice(0, 3) : k === 'C' ? v.slice(0, 2) : k === 'E' ? v.slice(0, 2) : k === 'R' ? [v[0], v[1], v[0] + v[2], v[1] + v[3]] : v;
    if (coords.some(c => c < 1 || c > 23)) errors.push(`${at}: outside the 24 grid (keep within 1–23)`);
  });
  try {
    const g = drawIcon(name);
    if (!g.ink.length && !g.dot) errors.push(`${name}: draws nothing`);
    if (JSON.stringify(g) !== JSON.stringify(drawIcon(name))) errors.push(`${name}: not deterministic`);
  } catch (e) { errors.push(`${name}: ${e.message}`); }
}

/* keywords: every glyph has some, every entry is a glyph, words are plain lowercase and not repeated */
for (const n of Object.keys(DEFS)) if (!KEYWORDS[n]?.length) errors.push(`${n}: no keywords (add it to src/keywords.js)`);
for (const [n, words] of Object.entries(KEYWORDS)) {
  if (!DEFS[n]) errors.push(`keywords: "${n}" is not a glyph`);
  const parts = new Set(n.split('-'));
  for (const w of words) if (!/^[a-z0-9]+$/.test(w)) errors.push(`keywords ${n}: "${w}" must be one lowercase word`);
  for (const w of words) if (parts.has(w)) errors.push(`keywords ${n}: "${w}" is already in the name`);
  if (new Set(words).size !== words.length) errors.push(`keywords ${n}: repeated word`);
}

/* aliases: kebab-case, point at a real glyph (not at another alias), never shadow a glyph, and the JSON field names stay free */
const pascalOf = n => n.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
const exportNames = new Map(Object.keys(DEFS).map(n => [pascalOf(n), n]));
for (const [a, target] of Object.entries(ALIASES)) {
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(a)) errors.push(`alias ${a}: names are lower kebab-case`);
  if (DEFS[a]) errors.push(`alias ${a}: this name is already a glyph`);
  if (!DEFS[target]) errors.push(`alias ${a}: target "${target}" is not a glyph`);
  const taken = exportNames.get(pascalOf(a));
  if (taken) errors.push(`alias ${a}: export name ${pascalOf(a)} is already used by ${taken}`);
  exportNames.set(pascalOf(a), a);
}
for (const reserved of ['aliases', 'approximateAliases']) if (DEFS[reserved]) errors.push(`${reserved}: reserved for the JSON files, not a glyph name`);
for (const a of APPROXIMATE_ALIASES) if (!ALIASES[a]) errors.push(`approximate alias "${a}" is not in ALIASES`);
if (new Set(APPROXIMATE_ALIASES).size !== APPROXIMATE_ALIASES.length) errors.push('APPROXIMATE_ALIASES: repeated name');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`${Object.keys(DEFS).length} glyphs ok, ${Object.keys(ALIASES).length} aliases ok`);
