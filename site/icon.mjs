/* One page per icon (matita.dev/icons/<name>/) plus the hub (matita.dev/icons/). Built by build.mjs from the published
   package, so every drawing, snippet and file path on these pages is exactly what users get. Each page carries facts that
   are unique to its icon (its recipe, the shapes it is made of, its five seeds), so no two pages are near-duplicates. */
import { plotted, gridLines } from './geometry.mjs';
import { pageHead, SITE } from './layout.mjs';

const UNIT = {
  L: ['line', 'lines'], P: ['polyline', 'polylines'], Z: ['closed shape', 'closed shapes'], R: ['rectangle', 'rectangles'],
  C: ['circle', 'circles'], E: ['ellipse', 'ellipses'], A: ['arc', 'arcs'], Q: ['curve', 'curves'], O: ['dot', 'dots']
};
const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a.at(-1);
/* "1 rectangle and 3 lines" */
function shapes(src) {
  const n = {};
  for (const part of src.split(';')) { const k = part.trim()[0]; if (UNIT[k]) n[k] = (n[k] || 0) + 1; }
  return list(Object.entries(n).map(([k, c]) => `${c} ${UNIT[k][c === 1 ? 0 : 1]}`));
}
const titleOf = n => n.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
const clip = (s, max) => s.length <= max ? s : s.slice(0, s.lastIndexOf(' ', max - 1)).replace(/[,;:]$/, '') + '.';

export function buildIconPages(ctx) {
  const { icons, names, DEFS, drawIcon, hash, toSvg, toSvgInner, esc, code, eyebrow, siteHeader, siteFooter, pascal, pkg } = ctx;
  const sorted = [...names].sort();
  const pos = Object.fromEntries(sorted.map((n, i) => [n, i]));
  const url = n => `${SITE}icons/${n}/`;
  const tile = n => `<li><a class="icon-btn" href="/icons/${n}/"><span class="glyph">${toSvg(icons[n], { size: 24 })}</span><span class="icon-name">${n}</span></a></li>`;

  /* related: icons that share a word in the name first, then the neighbours in the set's own order (the set is grouped by
     theme: calendar sits next to clock, mail and user), which is a better "similar" than the alphabet */
  const order = Object.fromEntries(names.map((n, i) => [n, i]));
  const related = n => {
    const t = new Set(n.split('-'));
    return names.filter(o => o !== n)
      .map(o => ({ o, s: o.split('-').filter(w => t.has(w)).length, d: Math.abs(order[o] - order[n]) }))
      .sort((a, b) => b.s - a.s || a.d - b.d).slice(0, 8).map(x => x.o);
  };

  const shell = (head, main) => `${head}
<body>
<a class="skip" href="#main">Skip to the content</a>

${siteHeader('/')}

<main id="main">
${main}
</main>

${siteFooter('/')}

<div class="sr-only" id="announce" aria-live="polite"></div>
</body>
</html>
`;

  const stepSvg = (label, inner, sw = '', gid = '') =>
    `<svg class="step-svg" viewBox="-1 -1 26 26" role="img" aria-label="${label}"><g class="grid" aria-hidden="true">${gridLines()}</g><g${gid ? ` id="${gid}"` : ''} fill="none" stroke="currentColor"${sw} stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;

  function iconPage(name) {
    const P = pascal(name), T = titleOf(name), src = DEFS[name], sh = shapes(src), u = url(name);
    const title = `${T} icon · pencil-style SVG and React · Matita`;
    const description = clip(`${T} icon in a pencil style: a free SVG and React component drawn from ${sh} on a 24 grid. MIT licensed.`, 158);
    const jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [{
        '@type': 'BreadcrumbList', '@id': u + '#breadcrumb',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Matita', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Icons', item: SITE + 'icons/' },
          { '@type': 'ListItem', position: 3, name: `${T} icon`, item: u }
        ]
      }]
    }).replace(/</g, '\\u003c');

    const prev = sorted[(pos[name] + sorted.length - 1) % sorted.length], next = sorted[(pos[name] + 1) % sorted.length];
    const seeds = [0, 1, 2, 3, 4].map(s => `<figure class="seed"><span class="ico">${toSvg(drawIcon(name, { seed: s }), { size: 56 })}</span><figcaption>seed ${s}</figcaption></figure>`).join('');
    const sizes = [16, 20, 24, 32, 48, 96].map(px => `<figure class="seed"><span class="ico">${toSvg(icons[name], { size: px })}</span><figcaption>${px} px</figcaption></figure>`).join('');
    const recipe = src.split(';').map(s => s.trim()).join(';\n');

    const main = `<section class="hero" aria-labelledby="icon-title">
  <div class="wrap hero-in">
    <div class="hero-copy">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Matita</a><span aria-hidden="true">/</span><a href="/icons/">Icons</a><span aria-hidden="true">/</span><span aria-current="page">${esc(name)}</span></nav>
      <h1 id="icon-title">${esc(T)} <em>icon</em></h1>
      <p class="lead">A free pencil-style ${esc(name.replace(/-/g, ' '))} icon, drawn by code from ${sh}. Use it as an SVG, a React component, or by name. MIT licensed.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#use">Copy the code</a>
        <a class="btn" href="/icons/">All ${names.length} icons</a>
      </div>
    </div>
    <figure class="frame icon-big hero-fig">
      <figcaption class="frame-cap"><span>${esc(name)}</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
      ${stepSvg(`The ${name} icon drawn large on its 24 unit grid`, toSvgInner(icons[name], { strokeWidth: .8 }))}
    </figure>
  </div>
</section>

<section class="section" id="use" aria-labelledby="use-title">
  <div class="wrap">
    ${eyebrow('01', 'Use it')}
    <div class="section-head">
      <h2 id="use-title">Use <em>${esc(name)}</em></h2>
      <p class="muted">One package, four ways in. The icon inherits <code>currentColor</code> and is decorative unless you give it a <code>title</code>. Install it with <code>npm i @matita/icons</code>.</p>
    </div>
    <h3 class="panel-h-static">React</h3>
    ${code('code-react', `import { ${P} } from '@matita/icons/react';\n\n<${P} size={24} />\n\n// or by name\nimport { SketchIcon } from '@matita/icons/react';\n<SketchIcon name="${name}" />`)}
    <h3 class="panel-h-static">JavaScript</h3>
    ${code('code-js', `import { ${P}, toSvg } from '@matita/icons';\n\ntoSvg(${P}, { size: 24 });   // SVG string`)}
    <h3 class="panel-h-static">SVG</h3>
    ${code('code-svg', toSvg(icons[name], { size: 24 }))}
    <h3 class="panel-h-static">Pencil variant</h3>
    ${code('code-pencil', `import '@matita/icons/pencil.css';\nimport { ${P} } from '@matita/icons/react';\n\n<${P} size={32} pencil />`)}
    <p class="after-fig muted">The file is <code>icons/${esc(name)}.svg</code> in the package (<code>pencil/${esc(name)}.svg</code> for the pencil variant). Matita ${esc(pkg.version)}.</p>
  </div>
</section>

<section class="section" id="recipe" aria-labelledby="recipe-title">
  <div class="wrap">
    ${eyebrow('02', "How it's drawn")}
    <div class="section-head">
      <h2 id="recipe-title">The recipe for <em>${esc(name)}</em></h2>
      <p class="muted">${esc(T)} is not stored as a drawing. It is a recipe of ${sh} on a 24 by 24 grid, and a small program draws it like a pencil would. The wobble comes from the name, so it always comes out the same.</p>
    </div>
    <div class="example example-3">
      <figure class="frame step">
        <figcaption class="frame-cap"><span>A · Recipe</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
        <pre class="src" id="ed-src"><code>${esc(recipe)}</code></pre>
        <label class="sr-only" for="ed-recipe">Recipe for ${esc(name)}</label>
        <textarea class="ed-recipe" id="ed-recipe" rows="${Math.max(4, Math.min(12, src.split(';').length + 1))}" spellcheck="false" autocomplete="off" autocapitalize="off" hidden>${esc(recipe)}</textarea>
      </figure>
      <figure class="frame step">
        <figcaption class="frame-cap"><span>B · Plotted</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
        ${stepSvg(`The ${name} icon as exact geometry`, plotted(src), ' stroke-width=".8"', 'ed-plotted-g')}
      </figure>
      <figure class="frame step">
        <figcaption class="frame-cap"><span>C · Drawn</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
        ${stepSvg(`The ${name} icon as drawn by Matita`, toSvgInner(icons[name], { strokeWidth: .8 }), '', 'ed-drawn-g')}
      </figure>
    </div>
    <div class="ed-controls" id="ed-controls" hidden>
      <div class="try-fields">
        <label class="try-field try-seed" for="ed-seed">Seed<input id="ed-seed" type="number" min="0" max="99" value="0"></label>
        <p class="try-hash muted"><code>${esc(name)}</code> as a number: <code id="ed-hash">${hash(name)}</code></p>
        <button type="button" class="btn btn-sm" id="ed-reset" hidden>Reset recipe</button>
      </div>
      <p class="try-msg" id="ed-msg" role="status" aria-live="polite"></p>
      <p class="muted ed-note">Shapes: <code>L</code> line, <code>P</code> polyline, <code>Z</code> closed shape, <code>R</code> rectangle, <code>C</code> circle, <code>E</code> ellipse, <code>A</code> arc, <code>Q</code> curve, <code>O</code> dot. Separate shapes with <code>;</code>. Edits stay on this page.</p>
    </div>
    <div class="used-actions page-cta">
      <button type="button" class="btn btn-primary ed-toggle" id="ed-toggle" data-icon="${esc(name)}" aria-expanded="false" aria-controls="ed-controls">Edit this recipe</button>
      <a class="btn" href="/how-it-works/">How it works</a>
    </div>
  </div>
</section>

<section class="section" id="variants" aria-labelledby="variants-title">
  <div class="wrap">
    ${eyebrow('03', 'Takes, sizes, pencil')}
    <div class="section-head">
      <h2 id="variants-title">Same icon, <em>every way</em></h2>
      <p class="muted">Pass a <code>seed</code> for another take of the same recipe. The wobble is capped, so it still reads at 16 px.</p>
    </div>
    <div class="seeds">
      <div class="seed-row">${seeds}</div>
      <p class="seeds-l">Five seeds of ${esc(name)}. Seed 0 is the default.</p>
    </div>
    <div class="seeds">
      <div class="seed-row sizes">${sizes}</div>
      <p class="seeds-l">True pixel sizes.</p>
    </div>
    <div class="variants">
      <figure class="frame variant">
        <figcaption class="frame-cap"><span>Ink</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
        <div class="variant-row"><span class="ico">${toSvg(icons[name], { size: 96 })}</span></div>
      </figure>
      <figure class="frame variant">
        <figcaption class="frame-cap"><span>Pencil</span><span class="frame-rule" aria-hidden="true"></span></figcaption>
        <div class="variant-row"><span class="ico">${toSvg(icons[name], { size: 96, pencil: true })}</span></div>
      </figure>
    </div>
  </div>
</section>

<section class="section" id="related" aria-labelledby="related-title">
  <div class="wrap">
    ${eyebrow('04', 'More icons')}
    <div class="section-head">
      <h2 id="related-title">Related <em>icons</em></h2>
      <p class="muted">Icons with a similar name, then the ones that sit next to it in the set.</p>
    </div>
    <ul class="icon-grid">${related(name).map(tile).join('')}</ul>
    <nav class="pager" aria-label="Previous and next icon">
      <a class="btn" href="/icons/${prev}/">← ${esc(prev)}</a>
      <a class="btn" href="/icons/">All icons</a>
      <a class="btn" href="/icons/${next}/">${esc(next)} →</a>
    </nav>
  </div>
</section>`;
    return shell(pageHead({
      esc, url: u, title, description, ogTitle: `${T} icon · Matita`, jsonLd, script: 'icon.js',
      ogImage: `${SITE}og/${name}.png`, ogImageAlt: `The ${name} icon drawn large on its 24 unit grid, titled "${T} icon", from matita.dev`
    }), main);
  }

  function hub() {
    const u = SITE + 'icons/', n = names.length;
    const title = `All ${n} pencil-style icons · SVG and React · Matita`;
    const description = `Browse all ${n} Matita icons: free pencil-style SVG and React icons on a 24 grid, MIT licensed. Every icon has its own page with code to copy.`;
    const jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'CollectionPage', '@id': u + '#page', url: u, name: `All ${n} Matita icons`, description, isPartOf: { '@id': SITE + '#website' } },
        { '@type': 'BreadcrumbList', '@id': u + '#breadcrumb', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Matita', item: SITE }, { '@type': 'ListItem', position: 2, name: 'Icons', item: u }] }
      ]
    }).replace(/</g, '\\u003c');
    const main = `<section class="hero" aria-labelledby="hub-title">
  <div class="wrap page-in">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Matita</a><span aria-hidden="true">/</span><span aria-current="page">Icons</span></nav>
    <h1 id="hub-title">All ${n} <em>icons</em></h1>
    <p class="lead">Free pencil-style icons as SVG and React components, on a 24 grid with <code>currentColor</code>. Each one has its own page with the code to copy and the recipe it is drawn from. Want to search, resize or recolour them? Use the <a href="/#icons">icon browser</a>.</p>
  </div>
</section>
<section class="section" aria-labelledby="hub-list">
  <div class="wrap">
    <h2 id="hub-list" class="sr-only">Every icon</h2>
    <ul class="icon-grid">${sorted.map(tile).join('')}</ul>
  </div>
</section>`;
    return shell(pageHead({ esc, url: u, title, description, ogTitle: `All ${n} icons · Matita`, jsonLd, script: 'icon.js' }), main);
  }

  return [
    { file: 'icons/index.html', url: SITE + 'icons/', html: hub() },
    ...sorted.map(n => ({ file: `icons/${n}/index.html`, url: url(n), html: iconPage(n) }))
  ];
}
