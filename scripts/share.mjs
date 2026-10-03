/* matita.dev — favicons and the social share image, rasterised at build time. Called from site.mjs.
   Writes favicon.svg (follows the browser's dark mode), favicon.ico, apple-touch-icon.png and og.png. */
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { toSvg, toSvgInner } from '../src/render.js';

const C = { paper: '#F6F4EE', sheet: '#FBFAF6', ink1: '#14161B', ink3: '#5A5E67', blue: '#2748F5', red: '#C93A2A', green: '#1E7A46' };

/* The rasteriser reads TTF/OTF only; the font packages ship WOFF. WOFF 1.0 is an sfnt with zlib-compressed tables. */
function woffToSfnt(woff) {
  const n = woff.readUInt16BE(12), tables = [];
  for (let i = 0; i < n; i++) {
    const o = 44 + i * 20;
    const [off, comp, orig] = [woff.readUInt32BE(o + 4), woff.readUInt32BE(o + 8), woff.readUInt32BE(o + 12)];
    const raw = woff.subarray(off, off + comp);
    tables.push({ tag: woff.subarray(o, o + 4), sum: woff.readUInt32BE(o + 16), data: comp < orig ? inflateSync(raw) : raw });
  }
  const pow = 2 ** Math.floor(Math.log2(n)), head = Buffer.alloc(12 + 16 * n);
  head.writeUInt32BE(woff.readUInt32BE(4), 0);
  head.writeUInt16BE(n, 4); head.writeUInt16BE(pow * 16, 6); head.writeUInt16BE(Math.log2(pow), 8); head.writeUInt16BE(n * 16 - pow * 16, 10);
  const body = []; let at = head.length;
  tables.forEach((t, i) => {
    t.tag.copy(head, 12 + i * 16);
    head.writeUInt32BE(t.sum, 16 + i * 16); head.writeUInt32BE(at, 20 + i * 16); head.writeUInt32BE(t.data.length, 24 + i * 16);
    const pad = (4 - t.data.length % 4) % 4;
    body.push(t.data, Buffer.alloc(pad)); at += t.data.length + pad;
  });
  return Buffer.concat([head, ...body]);
}

/* An .ico that wraps one PNG (supported everywhere .ico is). */
function ico(png, size) {
  const h = Buffer.alloc(22);
  h.writeUInt16BE(0, 0); h.writeUInt16LE(1, 2); h.writeUInt16LE(1, 4);
  h[6] = size; h[7] = size; h.writeUInt16LE(1, 10); h.writeUInt16LE(32, 12);
  h.writeUInt32LE(png.length, 14); h.writeUInt32LE(22, 18);
  return Buffer.concat([h, png]);
}

/* Graph paper in pixels: minor every `step`, major every `step * 5`. */
function paper(w, h, step) {
  let s = '';
  const op = i => i % 5 ? .045 : .09;
  for (let i = 0; i * step <= w; i++) s += `<line x1="${i * step}" y1="0" x2="${i * step}" y2="${h}" stroke="${C.ink1}" stroke-opacity="${op(i)}"/>`;
  for (let i = 0; i * step <= h; i++) s += `<line x1="0" y1="${i * step}" x2="${w}" y2="${i * step}" stroke="${C.ink1}" stroke-opacity="${op(i)}"/>`;
  return s;
}

export async function buildShare({ root, write, icons, n }) {
  const { Resvg } = await import('@resvg/resvg-js');
  const tmp = await mkdtemp(join(tmpdir(), 'matita-fonts-'));
  try {
    const fontFiles = [];
    for (const f of ['geist-sans/files/geist-sans-latin-400-normal', 'geist-sans/files/geist-sans-latin-600-normal',
      'geist-mono/files/geist-mono-latin-500-normal', 'instrument-serif/files/instrument-serif-latin-400-italic']) {
      const file = join(tmp, f.split('/').pop() + '.ttf');
      await writeFile(file, woffToSfnt(await readFile(join(root, 'node_modules/@fontsource', f + '.woff'))));
      fontFiles.push(file);
    }
    const png = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Geist' } }).render().asPng();

    /* favicons: the pencil glyph. SVG follows the tab's colour scheme; the raster ones sit on a paper tile. */
    const glyph = toSvgInner(icons.pencil, { strokeWidth: 1.9 });
    await write('favicon.svg', toSvg(icons.pencil, { size: 32, color: C.ink1, strokeWidth: 1.9 })
      .replace(/(<svg [^>]*>)/, `$1<style>@media (prefers-color-scheme: dark){svg{stroke:${C.paper}}}</style>`) + '\n');
    const tile = (pad, radius) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="${radius}" fill="${C.paper}"/>` +
      `<g transform="translate(${pad} ${pad}) scale(${(24 - 2 * pad) / 24})" fill="none" stroke="${C.ink1}" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`;
    await write('favicon.ico', ico(png(tile(1.5, 5), 32), 32));
    await write('apple-touch-icon.png', png(tile(4, 0), 180));

    /* share image, 1200×630: copy on the left, the annotated hero specimen on the right */
    const W = 1200, H = 630, S = 480, sx = 666, sy = (H - S) / 2, u = S / 28;
    const at = (x, y) => [sx + (x + 2) * u, sy + (y + 2) * u];
    const callout = (x, y, tx, ty, label, col) => {
      const [px, py] = at(x, y), [qx, qy] = at(tx, ty);
      return `<line x1="${px}" y1="${py}" x2="${qx}" y2="${qy}" stroke="${col}" stroke-width="1.6" stroke-dasharray="6 4.5"/>` +
        `<circle cx="${px}" cy="${py}" r="${1.05 * u}" fill="${C.sheet}" stroke="${col}" stroke-width="1.8"/>` +
        `<text x="${px}" y="${py + .38 * u}" text-anchor="middle" font-family="Geist Mono" font-weight="500" font-size="${1.05 * u}" fill="${col}">${label}</text>`;
    };
    let grid = '';
    for (let i = 0; i <= 24; i++) {
      const [a] = at(i, 0), [, b] = at(0, i), [x0, y0] = at(0, 0), [x1, y1] = at(24, 24), major = i % 6 === 0;
      const st = `stroke="${C.ink1}" stroke-opacity="${major ? .24 : .11}" stroke-width="${major ? 1 : .8}"`;
      grid += `<line x1="${a}" y1="${y0}" x2="${a}" y2="${y1}" ${st}/><line x1="${x0}" y1="${b}" x2="${x1}" y2="${b}" ${st}/>`;
    }
    const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${C.paper}"/>
${paper(W, H, 30)}
<rect x="${at(0, 0)[0]}" y="${at(0, 0)[1]}" width="${24 * u}" height="${24 * u}" fill="${C.sheet}"/>
${grid}
<g transform="translate(${at(0, 0).join(' ')}) scale(${u})" fill="none" stroke="${C.ink1}" stroke-linecap="round" stroke-linejoin="round">${toSvgInner(icons.image, { strokeWidth: .62 })}</g>
${callout(.4, 1.8, 3, 4.4, '1', C.red)}${callout(13.6, 1.8, 10.2, 8.3, '2', C.blue)}${callout(.4, 22.4, 3.4, 17.6, '3', C.green)}
<text x="72" y="118" font-family="Geist" font-weight="600" font-size="40" fill="${C.ink1}" letter-spacing="-0.8">Matita<tspan fill="${C.blue}" dx="2">/</tspan><tspan font-weight="400" fill="${C.ink3}" dx="2">icons</tspan></text>
<text font-family="Geist" font-weight="600" font-size="66" fill="${C.ink1}" letter-spacing="-2.2"><tspan x="70" y="272">Ruled by the grid.</tspan><tspan x="70" y="350">Drawn by <tspan font-family="Instrument Serif" font-style="italic" font-weight="400" font-size="76" letter-spacing="0">hand</tspan>.</tspan></text>
<text x="72" y="420" font-family="Geist" font-size="26" fill="${C.ink3}">${n} freehand pencil icons for the web.</text>
<text x="72" y="540" font-family="Geist Mono" font-weight="500" font-size="22" fill="${C.ink1}">matita.dev<tspan fill="${C.ink3}" dx="18">npm i @matita/icons</tspan></text>
</svg>`;
    await write('og.png', png(og, W));
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
