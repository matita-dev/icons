/* The public roadmap (matita.dev/roadmap/): what has shipped, what is being built and what comes next, for people who
   visit the site. Shipped releases are read from CHANGELOG.md (see changelog.mjs); everything else is the list below.
   An item with `release` moves to "Shipped" on its own once that version is published (it has a date in CHANGELOG.md),
   so the only upkeep is adding, removing or re-wording items. Keep this page public-safe: plain words, no internal
   notes, no names of other icon sets or tools, no dates promised for things that are not built. */
import { pageHead, SITE } from './layout.mjs';
import { anchor } from './changelog.mjs';

/* Where Matita is going: a few plain sentences, the same ones you would say out loud. */
export const VISION = [
  ['A set that covers real projects', 'Matita keeps growing, led by what people ask for. Every new icon is drawn in the same pencil hand, so the set still feels like one.'],
  ['From sketch to exact, with one setting', 'The same icons can look hand-drawn, a little calmer, or perfectly precise. You choose how much hand there is, per icon or for a whole app.'],
  ['Easy to find, for people and for AI tools', 'Search by meaning, a page for every icon, a changelog that says when each icon arrived, and plain lists that AI assistants can read.'],
  ['Free and open', 'MIT licensed and free for personal and commercial projects, now and later.']
];

/* status: 'progress' (being built now), 'next' (planned, in order), 'later' (considering; tell us if you want it).
   when: a target, shown as is. Targets are not promises: they move if something takes longer. */
export const ROADMAP = [
  { status: 'progress', release: '0.4.0', when: 'Target: late October 2026', title: '60 new icons',
    text: 'The biggest batch yet, led by what people asked for: a medical and science set (stethoscope, syringe, microscope, DNA, X-ray and more), plus everyday gaps such as timers, checked files and users, tools, devices and travel.' },
  { status: 'progress', release: '0.4.0', when: 'Target: late October 2026', title: 'Perfect mode: wobble from 0 to 1',
    text: 'A wobble setting so any icon can be drawn as exact shapes (true lines, circles and square corners) or anywhere in between. Comes with ready-made exact SVG files and a Perfect button in the icon browser.' },
  { status: 'next', when: 'Target: November 2026', title: 'Search by meaning',
    text: 'Type "delete" and find the bin, or "money" and find the wallet. Every icon gets keywords and a category, used by the search box, the icon pages and the all-icons page.' },
  { status: 'next', when: 'Target: December 2026, depending on requests', title: 'More science glyphs',
    text: 'Greek letters, lab and hospital people (surgeon, patient). They only go in if they can be drawn clearly at 24 px, so tell us exactly which ones you need.' },
  { status: 'later', title: 'A matching hand-drawn font',
    text: 'Type for buttons, links and headings that sits next to the icons in the same pencil hand. Asked for by several people; not started.' },
  { status: 'later', title: 'More habits of the hand',
    text: 'Softer corners where lines join, slightly off angles, and drag lines between strokes. These redraw the whole set, so they would ship together as one release.' },
  { status: 'later', title: 'Vue and Svelte components',
    text: 'The SVG files and the plain JavaScript API already work in both. Dedicated components come if enough people want them.' },
  { status: 'later', title: 'An MCP server for AI assistants',
    text: 'Let an assistant search and fetch icons directly. For now matita.dev/llms.txt and matita.dev/icons.json tell AI tools exactly which icons exist.' }
];

/* roadmap items that are not shipped yet, in page order (used by the home page's "Follow along" card) */
export const roadmapOpen = history => {
  const released = new Set(history.releases.filter(r => r.date !== 'unreleased').map(r => r.version));
  return ROADMAP.filter(i => !(i.release && released.has(i.release)));
};

const STATUS = {
  progress: ['In progress', 'Being built now, due in the coming days'],
  next: ['Next', 'Planned, in this order. Dates are targets, not promises'],
  later: ['Considering', 'No date yet. Your vote moves things up']
};
const longDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function roadmapPage({ history, esc, eyebrow, siteHeader, siteFooter, count }) {
  const URL = SITE + 'roadmap/';
  const title = 'Roadmap · what is shipped and what is next · Matita';
  const description = 'What the Matita icon set has shipped, what is being built now and what comes next, from new icons to a perfect-shapes mode. Tell us what you need.';
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'BreadcrumbList', '@id': URL + '#breadcrumb',
      itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Matita', item: SITE }, { '@type': 'ListItem', position: 2, name: 'Roadmap', item: URL }]
    }]
  }).replace(/</g, '\\u003c');

  const listed = new Set(history.releases.map(r => r.version)); /* versions the changelog page has an entry for */
  const released = new Set(history.releases.filter(r => r.date !== 'unreleased').map(r => r.version));
  const open = ROADMAP.filter(i => !(i.release && released.has(i.release)));
  const done = ROADMAP.filter(i => i.release && released.has(i.release));

  const card = i => `<li class="road-item">
      <h3>${esc(i.title)}</h3>
      <p>${esc(i.text)}</p>
      <p class="road-meta">${i.when ? `<span class="road-when">${esc(i.when)}</span>` : ''}${i.release ? `${i.when ? ' · ' : ''}Release ${listed.has(i.release) ? `<a href="/changelog/#${anchor(i.release)}">${esc(i.release)}</a>` : esc(i.release)}` : ''}</p>
    </li>`;
  const group = status => {
    const items = open.filter(i => i.status === status);
    if (!items.length) return '';
    const [label, hint] = STATUS[status];
    return `<section class="road-group road-${status}" aria-labelledby="road-${status}">
    <div class="road-head"><h2 id="road-${status}">${label}</h2><p class="muted">${hint}</p></div>
    <ul class="road-list">
    ${items.map(card).join('\n    ')}
    </ul>
  </section>`;
  };

  /* one plain line per release: its own summary sentence from CHANGELOG.md, else its first note, shortened */
  const clean = s => s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`/g, '');
  const cut = (s, max) => s.length <= max ? s : s.slice(0, s.lastIndexOf(' ', max - 1)).replace(/[,;:.]$/, '') + '…';
  const blurb = r => cut(clean(r.intro[0] || r.items.find(i => !i.glyphs)?.raw || (r.added.length ? `${r.added.length} new icons` : 'Fixes and docs')), 120);
  const shipped = history.releases.filter(r => r.date !== 'unreleased').slice(0, 6).map(r =>
    `<li><a href="/changelog/#${anchor(r.version)}"><span class="ship-v">${esc(r.version)}</span><span class="ship-d"><time datetime="${r.date}">${longDate(r.date)}</time></span><span class="ship-t">${esc(blurb(r))}</span></a></li>`
  ).join('\n      ');

  const head = pageHead({ esc, url: URL, title, description, ogTitle: 'Roadmap · Matita', jsonLd, script: 'icon.js' });
  return `${head}
<body>
<a class="skip" href="#roadmap">Skip to the roadmap</a>

${siteHeader('/')}

<main id="main">
<section class="hero page-hero" aria-labelledby="road-title">
  <div class="wrap page-in">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Matita</a><span aria-hidden="true">/</span><span aria-current="page">Roadmap</span></nav>
    ${eyebrow('00', 'Roadmap')}
    <h1 id="road-title">Where Matita is <em>going</em></h1>
    <p class="lead">${count} icons today. Here is what has shipped, what is being built now and what comes next, so you can see the set grow. Something missing for your project? <a href="https://github.com/matita-dev/icons/issues/new?template=icon-request.yml">Request an icon</a> or tell us what to build first.</p>
  </div>
</section>
<section class="section" id="vision" aria-labelledby="vision-title">
  <div class="wrap">
    <div class="road-head"><h2 id="vision-title">Where we are going</h2><p class="muted">The direction behind the list below.</p></div>
    <ul class="vision-list">
      ${VISION.map(([h, t]) => `<li><h3>${esc(h)}</h3><p>${esc(t)}</p></li>`).join('\n      ')}
    </ul>
  </div>
</section>
<section class="section" id="roadmap" aria-label="Roadmap">
  <div class="wrap">
  ${group('progress')}
  ${group('next')}
  ${group('later')}
  <section class="road-group road-done" aria-labelledby="road-done">
    <div class="road-head"><h2 id="road-done">Shipped</h2><p class="muted">Every release, newest first. <a href="/changelog/">Full changelog</a></p></div>
    ${done.length ? `<ul class="road-list">\n    ${done.map(i => card({ ...i, when: '' })).join('\n    ')}\n    </ul>` : ''}
    <ul class="ship-list">
      ${shipped}
    </ul>
  </section>
  <p class="road-cta">Your say matters: pick what you want from the "Considering" list, or ask for something new. <a class="btn btn-primary" href="https://github.com/matita-dev/icons/issues/new?template=icon-request.yml">Request an icon</a> <a class="btn" href="https://github.com/matita-dev/icons/issues">Open an issue</a></p>
  </div>
</section>
</main>

${siteFooter('/')}

<div class="sr-only" id="announce" aria-live="polite"></div>
</body>
</html>
`;
}
