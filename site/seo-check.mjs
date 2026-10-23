/* Build-output SEO check for every page in preview/. Usage: node site/seo-check.mjs [previewDir]. Exit code 1 on any FAIL.
   Prints a summary and every WARN/FAIL; ok lines only for the sample pages. */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..', 'preview');
const SITE = 'https://matita.dev/';
const walk = d => readdirSync(join(root, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : e.name === 'index.html' ? [join(d, e.name).replace(/\\/g, '/')] : []);
const files = ['index.html', ...walk('how-it-works'), ...walk('changelog'), ...walk('roadmap'), ...walk('icons')];
const urlOf = f => f === 'index.html' ? SITE : SITE + f.replace(/index\.html$/, '');
const SAMPLE = new Set(['index.html', 'how-it-works/index.html', 'icons/index.html', 'icons/calendar/index.html', 'changelog/index.html']);

const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const strip = s => decode(s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];
const meta = (html, key) => { const m = html.match(new RegExp(`<meta\\s+(?:name|property)="${key}"\\s+content="([^"]*)"`)); return m ? decode(m[1]) : null; };
const out = []; const tally = { ok: 0, WARN: 0, FAIL: 0 };
const note = (level, page, msg) => { tally[level === 'info' ? 'ok' : level]++; if (level !== 'ok' || SAMPLE.has(page)) out.push(`${level.padEnd(5)} ${page.padEnd(30)} ${msg}`); };
const titles = new Map(), descs = new Map(), h1s = new Map(); const sizes = [];

for (const file of files) {
  const html = readFileSync(join(root, file), 'utf8'), url = urlOf(file), P = file;
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || ''), desc = meta(html, 'description') || '';
  note(title.length >= 25 && title.length <= 65 ? 'ok' : 'WARN', P, `title ${title.length} chars: ${title}`);
  note(desc.length >= 70 && desc.length <= 165 ? 'ok' : 'WARN', P, `description ${desc.length} chars`);
  for (const [map, v] of [[titles, title], [descs, desc]]) (map.get(v) ?? map.set(v, []).get(v)).push(P);
  const canon = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  note(canon === url ? 'ok' : 'FAIL', P, `canonical ${canon}${canon === url ? '' : ' (expected ' + url + ')'}`);
  for (const [re, label] of [[/<html lang="en"/, 'lang'], [/<meta name="viewport"/, 'viewport'], [/index, follow/, 'robots index']]) note(re.test(html) ? 'ok' : 'FAIL', P, label);
  for (const k of ['og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'og:image:alt', 'twitter:card']) if (!meta(html, k)) note('FAIL', P, `${k} missing`);
  if (meta(html, 'og:url') !== url) note('FAIL', P, `og:url ${meta(html, 'og:url')} != ${url}`);
  const ogImg = meta(html, 'og:image') || '';
  if (ogImg.startsWith(SITE) && !existsSync(join(root, ogImg.slice(SITE.length)))) note('FAIL', P, `og:image file missing: ${ogImg}`);
  else note('ok', P, `og:image ${ogImg.replace(SITE, '/')}`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch (e) { note('FAIL', P, 'JSON-LD does not parse'); } }
  const heads = [...html.matchAll(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/g)].map(m => [+m[1], strip(m[2])]);
  const hs = heads.filter(h => h[0] === 1);
  note(hs.length === 1 ? 'ok' : 'FAIL', P, `h1 x${hs.length}: ${hs.map(h => h[1]).join(' | ')}`);
  if (hs[0]) (h1s.get(hs[0][1]) ?? h1s.set(hs[0][1], []).get(hs[0][1])).push(P);
  let prev = 0; for (const [l] of heads) { if (prev && l > prev + 1) { note('WARN', P, `heading level skips h${prev}->h${l}`); break; } prev = l; }
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0]).filter(t => !attr(t, 'alt') || !attr(t, 'width') || !attr(t, 'height'));
  if (imgs.length) note('WARN', P, `${imgs.length} <img> missing alt/width/height`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) note('FAIL', P, `duplicate ids: ${[...new Set(dup)].join(', ')}`);
  const broken = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    const href = attr('<a ' + m[1] + '>', 'href'); if (!href || /^(mailto:|https?:)/.test(href)) continue;
    if (/^https?:/.test(href)) continue;
    if (href.startsWith('#')) { if (!ids.includes(href.slice(1))) broken.push(href); continue; }
    const [path, hashPart] = href.replace(/\?[^#]*/, '').split('#'); const target = path === '/' ? 'index.html' : join(path.replace(/^\//, ''), path.endsWith('/') ? 'index.html' : '');
    if (!existsSync(join(root, target))) { broken.push(href); continue; }
    if (hashPart && !readFileSync(join(root, target), 'utf8').includes(`id="${hashPart}"`)) broken.push(href);
    if (!strip(m[2])) broken.push('empty link text: ' + href);
  }
  if (broken.length) note('FAIL', P, `broken links: ${[...new Set(broken)].slice(0, 5).join(', ')}`); else note('ok', P, 'internal links resolve');
  const ext = [...html.matchAll(/<a\b([^>]*)>/g)].map(m => m[1]).filter(t => /href="https?:/.test(t) && !/noopener/.test(t));
  if (ext.length) note('WARN', P, `${ext.length} external links without rel=noopener`);
  sizes.push([P, statSync(join(root, file)).size, gzipSync(readFileSync(join(root, file))).length]);
}
for (const [label, map] of [['title', titles], ['description', descs], ['h1', h1s]]) { const d = [...map].filter(([, ps]) => ps.length > 1); note(d.length ? 'FAIL' : 'ok', 'all pages', `${label}s unique: ${d.length ? d.length + ' duplicated, e.g. ' + d[0][1].slice(0, 3).join(', ') : files.length + ' distinct'}`); }
const sm = readFileSync(join(root, 'sitemap.xml'), 'utf8'), locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const expected = new Set(files.map(urlOf)); const missing = [...expected].filter(u => !locs.includes(u)), extra = locs.filter(u => !expected.has(u));
note(!missing.length && !extra.length ? 'ok' : 'FAIL', 'sitemap', `${locs.length} URLs; missing from sitemap: ${missing.length}, in sitemap but no page: ${extra.length}`);
const icons = sizes.filter(s => s[0].startsWith('icons/') && s[0] !== 'icons/index.html'), maxI = icons.reduce((a, b) => b[1] > a[1] ? b : a);
note('info', 'sizes', `icon pages: avg ${Math.round(icons.reduce((a, b) => a + b[1], 0) / icons.length / 1024)} KB raw, ${Math.round(icons.reduce((a, b) => a + b[2], 0) / icons.length / 1024)} KB gzip, largest ${maxI[0]} ${Math.round(maxI[1] / 1024)} KB; hub ${Math.round(sizes.find(s => s[0] === 'icons/index.html')[1] / 1024)} KB (${Math.round(sizes.find(s => s[0] === 'icons/index.html')[2] / 1024)} KB gzip)`);
console.log(out.join('\n') + `\n\n${files.length} pages checked: ${tally.ok} ok, ${tally.WARN} warnings, ${tally.FAIL} failures`);
process.exit(tally.FAIL ? 1 : 0);
