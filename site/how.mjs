/* The "How it works" page (matita.dev/how-it-works/). Built by build.mjs with the same published package as the home
   page, so every figure on it is drawn by the version users install. Plain words first, numbers second.
   Every number below comes from src/sketchify.js; when the engine changes, check them here. */
import { plotted, gridLines } from './geometry.mjs';
import { pageHead } from './layout.mjs';

const WRITEUP = 'https://dev.to/matita/hand-drawn-icons-that-draw-the-same-every-time-2p0h';

const FAQ = [
  ['Are the icons hand-drawn?',
    'No. Nobody drew these strokes. Each icon is a short recipe, written by hand, and a small program draws it in a pencil style. The wobble is on purpose; the hand is code.'],
  ['Is AI involved?',
    'No. It is a plain algorithm: about 90 lines of code and a tiny random number generator. There is no model and no training, and nothing is drawn differently from one run to the next.'],
  ['Why not just draw them by hand?',
    'Consistency and speed. Every icon follows the same rules, so the set feels like one hand drew it, and adding an icon is one line of text instead of an afternoon at the drawing board.'],
  ['What does "the same every time" mean?',
    'That the drawing is repeatable. The wobble is not rolled fresh on every render: it comes from the icon\'s name, so the server and the browser, or two different builds, draw exactly the same strokes. If you want another take, ask for a different seed.'],
  ['How big are the icons?',
    'About 0.8 KB each as a raw SVG (about 0.45 KB gzipped), and around 1.5 KB for the pencil version. In a bundle, one React icon adds about 1 KB gzipped with the renderer included, and ten add about 4 KB. The whole set is drawn once at build time and ships as finished path data.'],
  ['Does it still read at 16 px?',
    'Yes. Every habit of the pencil has a cap. At 24 px a line bows by less than a pixel and an endpoint moves by about a fifth of one, and no stroke is thinner than about 1.4. The pencil character shows from about 32 px up.'],
  ['Can I turn any SVG into this style?',
    'No. The engine only understands its nine shapes (below). You describe an icon with those shapes instead, and the engine draws it in the same hand as the rest of the set.'],
  ['Is it free to use?',
    'Yes. Matita is MIT licensed, free for personal and commercial projects.']
];

export function howPage({ icons, DEFS, drawIcon, toSvg, toSvgInner, hash, esc, code, eyebrow, siteHeader, siteFooter, pkg }) {
  const SITE = 'https://matita.dev/', URL = SITE + 'how-it-works/';
  const title = 'How Matita works · pencil-style icons drawn by code';
  const description = 'Each Matita icon is a short recipe of simple shapes. A small program draws it like a pencil, and the same name always draws the same way. Here is how, step by step.';

  const ex = 'calendar', exSrc = DEFS[ex];
  const seeds = [0, 1, 2, 3, 4].map(s =>
    `<figure class="seed"><span class="ico">${toSvg(drawIcon(ex, { seed: s }), { size: 56 })}</span><figcaption>seed ${s}</figcaption></figure>`).join('');
  const sizes = [16, 20, 24, 32, 48, 96].map(px =>
    `<figure class="seed"><span class="ico">${toSvg(icons[ex], { size: px })}</span><figcaption>${px} px</figcaption></figure>`).join('');
  const stepSvg = (label, inner, sw = '') =>
    `<svg class="step-svg" viewBox="-1 -1 26 26" role="img" aria-label="${label}"><g class="grid" aria-hidden="true">${gridLines()}</g><g fill="none" stroke="currentColor"${sw} stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;

  const habit = (h, text) => `<div class="habit"><dt>${h}</dt><dd>${text}</dd></div>`;

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle', '@id': URL + '#article', headline: 'How Matita works', description, url: URL,
        inLanguage: 'en', isPartOf: { '@id': SITE + '#website' }, about: { '@id': SITE + '#icons' },
        author: { '@type': 'Organization', name: 'Matita', url: SITE }
      },
      {
        '@type': 'FAQPage', '@id': URL + '#faq', url: URL,
        mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
      }
    ]
  }).replace(/</g, '\\u003c');

  const head = pageHead({ esc, url: URL, title, description, ogTitle: 'How Matita works', ogType: 'article', jsonLd, script: 'how.js' });

  const prims = [
    ['L', 'Line', 'x1 y1 x2 y2'], ['P', 'Polyline', 'x y x y …'], ['Z', 'Closed shape', 'x y x y …'], ['R', 'Rectangle', 'x y w h'],
    ['C', 'Circle', 'cx cy r'], ['E', 'Ellipse', 'cx cy rx ry'], ['A', 'Arc', 'cx cy r a0 a1'], ['Q', 'Curve', 'x1 y1 cx cy x2 y2'], ['O', 'Dot', 'cx cy']
  ].map(([c, n, a]) => `<tr><td><code>${c}</code></td><td>${n}</td><td><code>${a}</code></td></tr>`).join('');

  const body = `<body>
<a class="skip" href="#recipe">Skip to the explanation</a>

${siteHeader('/')}

<main id="top">
<section class="hero page-hero" aria-labelledby="how-title">
  <div class="wrap page-in">
    ${eyebrow('00', 'How it works')}
    <h1 id="how-title">A recipe in,<br>a <em>pencil drawing</em> out.</h1>
    <p class="lead">Matita doesn't store drawings. It stores recipes: a few lines of text like "a rectangle here, a line there". When you use an icon, a small program follows the recipe and draws it the way a pencil would, with a little wobble. The wobble comes from the icon's name, so the same icon always comes out the same.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="#try">Try it yourself</a>
      <a class="btn" href="${WRITEUP}">Read the longer write-up</a>
    </div>
  </div>
</section>

<section class="section" id="recipe" aria-labelledby="recipe-title">
  <div class="wrap">
    ${eyebrow('01', 'The recipe')}
    <div class="section-head">
      <h2 id="recipe-title">Every icon is a <em>recipe</em></h2>
      <p class="muted">A glyph is a short list of drafting shapes on a 24 by 24 grid, the kind of thing you would plot with a ruler and compass. There are nine kinds of shape, and most icons use two to five of them.</p>
    </div>
    <div class="drawn">
      <div class="table-wrap">
        <table class="prims">
          <caption class="sr-only">The nine shapes</caption>
          <thead><tr><th scope="col">Code</th><th scope="col">Shape</th><th scope="col">Numbers it takes</th></tr></thead>
          <tbody>${prims}</tbody>
        </table>
      </div>
      <div class="example">
        <figure class="frame step">
          <figcaption class="frame-cap"><span>A · Recipe</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
          <pre class="src"><code>${esc(exSrc.split(';').join(';\n'))}</code></pre>
        </figure>
        <figure class="frame step">
          <figcaption class="frame-cap"><span>B · Plotted</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
          ${stepSvg('The calendar icon as exact geometry', plotted(exSrc), ' stroke-width=".8"')}
        </figure>
        <figure class="frame step">
          <figcaption class="frame-cap"><span>C · Drawn</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
          ${stepSvg('The calendar icon as drawn by Matita', toSvgInner(icons[ex], { strokeWidth: .8 }))}
        </figure>
      </div>
    </div>
    <p class="after-fig muted">Plotted is the recipe drawn with a ruler: perfectly straight, perfectly closed. Drawn is what Matita gives you.</p>
  </div>
</section>

<section class="section" id="habits" aria-labelledby="habits-title">
  <div class="wrap">
    ${eyebrow('02', 'The pencil')}
    <div class="section-head">
      <h2 id="habits-title">The habits of a <em>pencil</em></h2>
      <p class="muted">The program gives every shape a few small habits. Each one is something a hand really does with a ruler, and each one has a limit so the icon still reads when it is small. Numbers are grid units; at 24 px one unit is one pixel.</p>
    </div>
    <dl class="habits">
      ${habit('Lines overshoot', 'Both ends of a line are pushed out along its direction by 0.2 to 0.5, and each endpoint moves by up to 0.2. The line is drawn as a gentle curve whose middle is pulled sideways by at most 0.7, or 4.5 % of its length, whichever is smaller. A ruled pencil line is never perfectly straight and rarely stops exactly where you aimed.')}
      ${habit('Boxes cross at the corners', 'A rectangle is not a closed path. It is four separate lines with a bigger overshoot (0.5 to 1.5), so every corner is a small cross, like a box drawn edge by edge.')}
      ${habit('Circles overlap where the pen closes', 'A circle starts at a random angle and sweeps 388° to 418°, so the pen runs 28° to 58° past where it started. Over the sweep the radius drifts outward by 0.55 to 1, so the closing pass sits just outside the opening one. Each point gets ±2.8 % radius noise, and the whole ring is squashed by up to 4.5 %.')}
      ${habit('Joints stay sharp', 'Every corner of a polyline moves by up to 0.2 and every segment bows on its own, but the joints stay sharp: a check mark still has a point at the bottom. Closed shapes run past their starting point along the first edge, the way you would close a shape without lifting the pencil.')}
      ${habit('Arcs and curves overshoot too', 'Arcs run 4° to 9° past each end, and curves overshoot their ends by 0.15 to 0.45.')}
      ${habit('Pressure varies per stroke', 'Every stroke gets its own width, between 0.86 and 1.14 times the base 1.6.')}
      ${habit('Dots are taps', 'A dot is a near-zero-length stroke with a round cap, so it reads as a single tap of the pen.')}
    </dl>
  </div>
</section>

<section class="section" id="same" aria-labelledby="same-title">
  <div class="wrap">
    ${eyebrow('03', 'Repeatable')}
    <div class="section-head">
      <h2 id="same-title">Same name, <em>same drawing</em></h2>
      <p class="muted">The wobble is not rolled fresh each time. The icon's name is turned into a number, that number starts a tiny random number generator, and every "random" choice for that icon comes from it, in a fixed order.</p>
    </div>
    ${code('code-hash', `// the name becomes a number...
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
hash('${ex}')   // ${hash(ex)}

// ...which starts the generator (add a seed for another take)
const random = prng(hash(name) + seed * 7919);`)}
    <p class="after-fig">So <code>${ex}</code> is drawn the same way on every machine, in every build, unless its recipe changes. That matters more than it sounds:</p>
    <ul class="points">
      <li><strong>No hydration mismatch.</strong> The server-rendered SVG and the client-rendered SVG are byte-identical.</li>
      <li><strong>No flicker.</strong> Nothing re-rolls when a component re-renders.</li>
      <li><strong>Snapshot tests stay green.</strong> The same input always gives the same output.</li>
      <li><strong>No drawing at runtime.</strong> The whole set is drawn once at build time and the package ships the finished path data. The engine only runs if you ask for another seed or draw your own icon.</li>
    </ul>
    <div class="seeds">
      <p class="seeds-l">Don't like a particular drawing? Pass a <code>seed</code>. Seed 0 is the default; the others are other takes of the same recipe.</p>
      <div class="seed-row">${seeds}</div>
    </div>
  </div>
</section>

<section class="section" id="small" aria-labelledby="small-title">
  <div class="wrap">
    ${eyebrow('04', 'Small sizes')}
    <div class="section-head">
      <h2 id="small-title">Built for <em>small sizes</em></h2>
      <p class="muted">A hand-drawn look is easy at 96 px and hard at 16 px: too much wobble and a small icon turns to mush. The caps above are what keep it usable. At 24 px a line bows by less than a pixel and an endpoint moves by a fifth of one, and no stroke is thinner than about 1.4.</p>
    </div>
    <div class="seeds">
      <div class="seed-row sizes">${sizes}</div>
      <p class="seeds-l">The same icon at true pixel sizes. At UI sizes the set reads like a regular line icon set; the pencil character shows from about 32 px up.</p>
    </div>
  </div>
</section>

<section class="section" id="try" aria-labelledby="try-title">
  <div class="wrap">
    ${eyebrow('05', 'Try it')}
    <div class="section-head">
      <h2 id="try-title">Write a recipe, <em>watch it draw</em></h2>
      <p class="muted">Search the set and pick an icon to see its recipe, then change the numbers. The icon's name decides the wobble, and a seed gives you another take of the same recipe.</p>
    </div>
    <div class="try" id="try-demo">
      <div class="try-ui">
        <label class="search try-search">
          <span class="sr-only">Search icons</span>
          <span class="ico">${toSvg(icons.search, { size: 16 })}</span>
          <input id="try-search" type="search" placeholder="Search ${Object.keys(DEFS).length} icons" autocomplete="off" spellcheck="false">
        </label>
        <p class="count try-count" id="try-count" aria-live="polite">${Object.keys(DEFS).length} icons</p>
        <ul class="icon-grid try-grid" id="try-grid" aria-label="Pick an icon"></ul>
        <div class="empty try-empty" id="try-empty" hidden><p>No icon matches “<span id="try-empty-q"></span>”.</p></div>
        <div class="try-fields">
          <label class="try-field try-seed" for="try-seed">Seed<input id="try-seed" type="number" min="0" max="99" value="0"></label>
          <p class="try-hash muted"><code id="try-current">${ex}</code> as a number: <code id="try-hash">${hash(ex)}</code></p>
        </div>
        <div class="try-label-row">
          <label class="try-label" for="try-recipe">Recipe</label>
          <button type="button" class="btn btn-sm" id="try-reset" hidden>Reset recipe</button>
        </div>
        <textarea id="try-recipe" rows="6" spellcheck="false" autocomplete="off" autocapitalize="off">${esc(exSrc.split(';').map(s => s.trim()).join(';\n'))}</textarea>
        <p class="try-msg" id="try-msg" role="status" aria-live="polite"></p>
      </div>
      <div class="try-out">
        <figure class="frame step">
          <figcaption class="frame-cap"><span>Plotted</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
          <svg class="step-svg" id="try-plotted" viewBox="-1 -1 26 26" role="img" aria-label="Your recipe as exact geometry"><g class="grid" aria-hidden="true">${gridLines()}</g><g id="try-plotted-g" fill="none" stroke="currentColor" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round">${plotted(exSrc)}</g></svg>
        </figure>
        <figure class="frame step">
          <figcaption class="frame-cap"><span>Drawn</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
          <svg class="step-svg" id="try-drawn" viewBox="-1 -1 26 26" role="img" aria-label="Your recipe as drawn by Matita"><g class="grid" aria-hidden="true">${gridLines()}</g><g id="try-drawn-g" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${toSvgInner(icons[ex], { strokeWidth: .8 })}</g></svg>
        </figure>
      </div>
    </div>
    <p class="muted try-note">Shapes: ${'L P Z R C E A Q O'.split(' ').map(c => `<code>${c}</code>`).join(' ')}. Separate shapes with <code>;</code>. For example, <code>C 12 12 8; L 12 6 12 12</code> is a circle with a hand pointing up.</p>
  </div>
</section>

<section class="section" id="own" aria-labelledby="own-title">
  <div class="wrap">
    ${eyebrow('06', 'Your own')}
    <div class="section-head">
      <h2 id="own-title">Draw your <em>own</em></h2>
      <p class="muted">The engine is part of the package, so you can draw your own icons in the same hand and use them like any other icon.</p>
    </div>
    ${code('code-own', `npm i @matita/icons`)}
    ${code('code-own-2', `import { drawIcon } from '@matita/icons/engine';
import { createSketchIcon } from '@matita/icons/react';

const Kite = createSketchIcon(drawIcon('kite', {
  defs: { kite: 'Z 12 3 18 10 12 21 6 10; L 6 10 18 10; L 12 3 12 21' },
}));

<Kite size={32} />`)}
  </div>
</section>

<section class="section" id="faq" aria-labelledby="faq-title">
  <div class="wrap">
    ${eyebrow('07', 'Questions')}
    <div class="section-head">
      <h2 id="faq-title">Good <em>questions</em></h2>
      <p class="muted">The ones people ask most. Something missing? Open an issue and it can be added here.</p>
    </div>
    <div class="faq">
      ${FAQ.map(([q, a]) => `<details class="faq-item"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n      ')}
    </div>
    <div class="used-actions faq-cta">
      <a class="btn btn-primary" href="/#icons">Browse the icons</a>
      <a class="btn" href="${WRITEUP}">Read the longer write-up</a>
      <a class="btn" href="https://github.com/matita-dev/icons">View the source</a>
    </div>
  </div>
</section>
</main>

${siteFooter('/')}

<div class="sr-only" id="announce" aria-live="polite"></div>
</body>
</html>
`;
  return head + '\n' + body;
}
