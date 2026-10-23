/* The changelog page (matita.dev/changelog/) and "added in" data for every icon, both read from the repo's CHANGELOG.md
   at build time, so the site never needs a second list to keep in sync. Only versions up to the one the site is built
   with are shown (an entry for an unreleased version is skipped). A list item counts as "new glyphs" when every
   comma-separated word in it is an icon name; glyphs that no entry adds came with the first release. */
import { readFileSync } from 'node:fs';
import { pageHead, SITE } from './layout.mjs';

const semver = v => v.split('.').map(Number);
const newer = (a, b) => { const x = semver(a), y = semver(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
export const anchor = v => 'v' + v.replace(/\./g, '-');

export function readHistory({ file, names, version }) {
  const known = new Set(names);
  const releases = [];
  let cur = null;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const h = line.match(/^## (\d+\.\d+\.\d+)\s+—\s+(\d{4}-\d{2}-\d{2}|unreleased)\s*$/);
    if (line.startsWith('## ')) { cur = h && !newer(h[1], version) ? { version: h[1], date: h[2], intro: [], items: [], added: [] } : null; if (cur) releases.push(cur); continue; }
    if (!cur || !line.trim()) continue;
    const li = line.match(/^- (?:\*\*([^*]+?):?\*\*:?\s*)?(.*)$/);
    if (!li) { cur.intro.push(line.trim()); continue; }
    const [, label = '', text] = li, words = text.split(',').map(w => w.trim()).filter(Boolean);
    const glyphs = words.length && words.every(w => known.has(w)) ? words : null;
    if (glyphs) cur.added.push(...glyphs);
    cur.items.push({ label, raw: line.slice(2), glyphs });
  }
  /* the first release: every glyph no later entry claims */
  const claimed = new Set(releases.flatMap(r => r.added)), first = releases.at(-1);
  if (first) {
    const rest = names.filter(n => !claimed.has(n));
    first.added.push(...rest);
    first.items.push({ label: `The first ${rest.length} glyphs`, glyphs: rest });
  }
  const since = {};
  for (const r of releases) for (const n of r.added) since[n] = r.version;
  /* the newest release that added glyphs: those get the "New" badge until the next one */
  const latest = releases.find(r => r.added.length)?.version;
  return { releases, since, latest, isNew: n => since[n] === latest };
}

/* the little markdown CHANGELOG.md uses: **bold**, `code` */
const inline = (s, esc) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
const longDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function changelogPage({ history, icons, toSvg, esc, eyebrow, siteHeader, siteFooter }) {
  const URL = SITE + 'changelog/';
  const title = 'Changelog · new icons and changes in every release · Matita';
  const description = 'What changed in each release of Matita: which pencil-style icons were added when, redrawn glyphs and changes to the package.';
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'BreadcrumbList', '@id': URL + '#breadcrumb',
      itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Matita', item: SITE }, { '@type': 'ListItem', position: 2, name: 'Changelog', item: URL }]
    }]
  }).replace(/</g, '\\u003c');

  const tile = n => `<li><a class="icon-btn" href="/icons/${n}/"><span class="glyph">${toSvg(icons[n], { size: 24 })}</span><span class="icon-name">${n}</span></a></li>`; /* no New badge here: the section already says so */
  const entry = r => {
    const lists = r.items.filter(i => i.glyphs), notes = r.items.filter(i => !i.glyphs);
    return `<article class="release" id="${anchor(r.version)}" aria-labelledby="${anchor(r.version)}-h">
  <div class="release-meta">
    <h2 id="${anchor(r.version)}-h"><a href="#${anchor(r.version)}">${esc(r.version)}</a></h2>
    <p>${r.date === 'unreleased' ? 'Unreleased' : `<time datetime="${r.date}">${longDate(r.date)}</time>`}</p>
    ${r.added.length ? `<p class="release-count">+${r.added.length} icons</p>` : ''}
  </div>
  <div class="release-body">
    ${r.intro.map(p => `<p>${inline(p, esc)}</p>`).join('\n    ')}
    ${lists.map(i => `<h3 class="release-group">${esc(i.label === 'New' ? 'New icons' : i.label)} <span class="muted">${i.glyphs.length}</span></h3>
    <ul class="icon-grid">${i.glyphs.map(tile).join('')}</ul>`).join('\n    ')}
    ${notes.length ? `${lists.length ? '<h3 class="release-group">Other changes</h3>' : ''}<ul class="release-notes">${notes.map(i => `<li>${inline(i.raw, esc)}</li>`).join('')}</ul>` : ''}
  </div>
</article>`;
  };

  const head = pageHead({ esc, url: URL, title, description, ogTitle: 'Changelog · Matita', jsonLd, script: 'icon.js' });
  return `${head}
<body>
<a class="skip" href="#releases">Skip to the releases</a>

${siteHeader('/')}

<main id="main">
<section class="hero page-hero" aria-labelledby="cl-title">
  <div class="wrap page-in">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Matita</a><span aria-hidden="true">/</span><span aria-current="page">Changelog</span></nav>
    ${eyebrow('00', 'Changelog')}
    <h1 id="cl-title">What's <em>new</em></h1>
    <p class="lead">Every release of <code>@matita/icons</code>, newest first: the icons it added and what else changed. Icons from the latest batch carry a <span class="badge-new badge-inline">New</span> badge across the site.</p>
  </div>
</section>
<section class="section" id="releases" aria-label="Releases">
  <div class="wrap">
${history.releases.map(entry).join('\n')}
  </div>
</section>
</main>

${siteFooter('/')}

<div class="sr-only" id="announce" aria-live="polite"></div>
</body>
</html>
`;
}
