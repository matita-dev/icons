// Bundle-size guard: one named icon import must stay tiny as the set grows.
// Bundles a one-glyph import and a one-alias import per entry (minified, react external)
// and fails when either exceeds its budget. Run after `npm run build`; CI runs it.
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist', import.meta.url));

// Budgets in bytes, minified (raw). Measured on 2026-11-16, see CHANGELOG. ~20% headroom.
const BUDGET = { './esm/index.js': 400, './react/index.js': 6000 };

const bundle = async (code) => (await build({
  stdin: { contents: code, resolveDir: dist },
  bundle: true, minify: true, write: false, format: 'esm', external: ['react'], logLevel: 'silent'
})).outputFiles[0].text;

let failed = false;
for (const [entry, budget] of Object.entries(BUDGET)) {
  for (const [kind, name] of [['named import', 'Home'], ['alias import', 'House']]) {
    const out = await bundle(`import { ${name} } from '${entry}'; console.log(${name});`);
    const raw = Buffer.byteLength(out);
    const gz = gzipSync(out).length;
    const ok = raw <= budget;
    if (!ok) failed = true;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${entry} ${kind} (${name}): ${raw} B min, ${gz} B gzip, budget ${budget} B`);
  }
}
if (failed) {
  console.error('Bundle-size budget exceeded: a single icon import grew. Check tree-shaking (sideEffects, re-exports).');
  process.exit(1);
}
