/* matita.dev behaviour. Uses the package's own engine + renderer, so what you copy is exactly what you see. */
import { DEFS, drawIcon } from '../src/sketchify.js';
import { toSvg, pascal } from '../src/render.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const names = Object.keys(DEFS);

const cache = new Map();
const draw = (name, seed = 0) => {
  const k = name + ':' + seed;
  if (!cache.has(k)) cache.set(k, drawIcon(name, { seed }));
  return cache.get(k);
};

const state = { q: '', size: 24, strokeWidth: 1.6, color: 'currentColor', pencil: false, seed: 0, selected: 'ruler', fmt: 'react' };
const opts = (size = state.size) => ({ size, strokeWidth: state.strokeWidth, color: state.color, pencil: state.pencil });
const announce = msg => { const el = $('#announce'); el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30); };

/* ---------- clipboard ---------- */
async function copy(text, label, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select();
    try { document.execCommand('copy'); } finally { ta.remove(); }
  }
  announce(`Copied ${label}`);
  if (btn) {
    const was = btn.dataset.label || btn.textContent;
    btn.dataset.label = was;
    btn.textContent = 'Copied';
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.textContent = was; }, 1400);
  }
}
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-copy-target]');
  if (!btn) return;
  const el = document.getElementById(btn.dataset.copyTarget);
  if (el) copy(el.textContent, 'to clipboard', btn);
});

/* ---------- icon grid ---------- */
const grid = $('#grid');
const buttons = $$('.icon-btn', grid);
const byName = Object.fromEntries(buttons.map(b => [b.dataset.name, b]));

function renderGrid() {
  const o = opts();
  for (const b of buttons) b.firstElementChild.innerHTML = toSvg(draw(b.dataset.name, state.seed), o);
}

function filter() {
  const q = state.q.trim().toLowerCase().replace(/\s+/g, '-');
  let shown = 0;
  for (const b of buttons) {
    const hit = !q || b.dataset.name.includes(q);
    b.parentElement.hidden = !hit;
    if (hit) shown++;
  }
  $('#count').textContent = q ? `${shown} of ${names.length} icons` : `${names.length} icons`;
  $('#empty').hidden = shown > 0;
  $('#empty-q').textContent = state.q.trim();
}

const q = $('#q');
q.addEventListener('input', () => { state.q = q.value; filter(); });
document.addEventListener('keydown', e => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  e.preventDefault();
  q.focus();
  q.select();
});

/* arrow keys move between visible icons */
grid.addEventListener('keydown', e => {
  const keys = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 'down', ArrowUp: 'up', Home: 'home', End: 'end' };
  if (!(e.key in keys)) return;
  const visible = buttons.filter(b => !b.parentElement.hidden);
  const i = visible.indexOf(document.activeElement);
  if (i < 0) return;
  const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const k = keys[e.key];
  const j = k === 'down' ? i + cols : k === 'up' ? i - cols : k === 'home' ? 0 : k === 'end' ? visible.length - 1 : i + k;
  if (visible[j]) { e.preventDefault(); visible[j].focus(); }
});

/* controls */
const size = $('#size'), stroke = $('#stroke');
size.addEventListener('input', () => { state.size = +size.value; $('#size-out').textContent = size.value; renderGrid(); renderDetail(); });
stroke.addEventListener('input', () => {
  state.strokeWidth = Math.round(+stroke.value * 10) / 10;
  $('#stroke-out').textContent = state.strokeWidth.toFixed(1);
  renderGrid(); renderDetail();
});

const swatches = $$('.swatch[data-color]'), custom = $('#color'), customWrap = $('.swatch-custom');
function setColor(c, fromCustom) {
  state.color = c;
  for (const s of swatches) s.setAttribute('aria-pressed', String(!fromCustom && s.dataset.color === c));
  customWrap.classList.toggle('on', !!fromCustom);
  renderGrid(); renderDetail();
}
for (const s of swatches) s.addEventListener('click', () => setColor(s.dataset.color, false));
custom.addEventListener('input', () => setColor(custom.value, true));

function setVariant(pencil) {
  state.pencil = pencil;
  for (const b of $$('[data-variant]')) {
    if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String((b.dataset.variant === 'pencil') === pencil));
  }
  renderGrid(); renderDetail();
}
for (const b of $$('button[data-variant]')) b.addEventListener('click', () => setVariant(b.dataset.variant === 'pencil'));

const seedOut = $('#seed-out'), reset = $('#seed-reset');
function setSeed(s) {
  state.seed = s;
  seedOut.textContent = String(s);
  reset.hidden = s === 0;
  renderGrid(); renderDetail();
  announce(s ? `Redrawn with seed ${s}` : 'Back to seed 0');
}
$('#redraw').addEventListener('click', () => setSeed(state.seed + 1));
reset.addEventListener('click', () => { setSeed(0); $('#redraw').focus(); });

/* ---------- detail panel ---------- */
const detail = $('#detail'), scrim = $('#scrim');
const sheet = window.matchMedia('(max-width: 979px)');
let opener = null;

function snippets(name) {
  const P = pascal(name), s = state;
  const props = [`size={${s.size}}`];
  if (s.color !== 'currentColor') props.push(`color="${s.color}"`);
  if (s.strokeWidth !== 1.6) props.push(`strokeWidth={${s.strokeWidth}}`);
  if (s.pencil) props.push('pencil');
  const jsOpts = [`size: ${s.size}`];
  if (s.color !== 'currentColor') jsOpts.push(`color: '${s.color}'`);
  if (s.strokeWidth !== 1.6) jsOpts.push(`strokeWidth: ${s.strokeWidth}`);
  if (s.pencil) jsOpts.push('pencil: true');
  const css = s.pencil ? `import '@matita/icons/pencil.css';\n` : '';
  const react = s.seed
    ? `${css}import { SketchIcon } from '@matita/icons/react';\n\n<SketchIcon name="${name}" seed={${s.seed}} ${props.join(' ')} />`
    : `${css}import { ${P} } from '@matita/icons/react';\n\n<${P} ${props.join(' ')} />`;
  const js = s.seed
    ? `${css}import { toSvg } from '@matita/icons';\nimport { drawIcon } from '@matita/icons/engine';\n\ntoSvg(drawIcon('${name}', { seed: ${s.seed} }), { ${jsOpts.join(', ')} });`
    : `${css}import { ${P}, toSvg } from '@matita/icons';\n\ntoSvg(${P}, { ${jsOpts.join(', ')} });`;
  const svg = toSvg(draw(name, s.seed), opts());
  return { react, js, svg };
}

function renderDetail() {
  const name = state.selected;
  if (!name) return;
  $('#d-name').textContent = name;
  $('#d-comp').textContent = pascal(name);
  $('#d-file').textContent = `${state.pencil ? 'pencil' : 'icons'}/${name}.svg`;
  $('#d-glyph').innerHTML = toSvg(draw(name, state.seed), opts(120));
  $('#d-code').firstElementChild.textContent = snippets(name)[state.fmt];
}

function select(name, fromClick) {
  if (state.selected && byName[state.selected]) byName[state.selected].setAttribute('aria-pressed', 'false');
  state.selected = name;
  byName[name].setAttribute('aria-pressed', 'true');
  renderDetail();
  if (fromClick && sheet.matches) openSheet(byName[name]);
}

function openSheet(from) {
  opener = from;
  detail.classList.add('open');
  detail.removeAttribute('inert');
  scrim.hidden = false;
  detail.focus();
}
function closeSheet() {
  if (!detail.classList.contains('open')) return;
  detail.classList.remove('open');
  if (sheet.matches) detail.setAttribute('inert', '');
  scrim.hidden = true;
  if (opener) opener.focus();
}
function syncSheet() {
  if (sheet.matches) { if (!detail.classList.contains('open')) detail.setAttribute('inert', ''); }
  else { detail.removeAttribute('inert'); detail.classList.remove('open'); scrim.hidden = true; }
}
sheet.addEventListener ? sheet.addEventListener('change', syncSheet) : sheet.addListener(syncSheet);

grid.addEventListener('click', e => { const b = e.target.closest('.icon-btn'); if (b) select(b.dataset.name, true); });
$('#d-close').addEventListener('click', closeSheet);
scrim.addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

for (const b of $$('[data-fmt]')) b.addEventListener('click', () => {
  state.fmt = b.dataset.fmt;
  for (const x of $$('[data-fmt]')) x.setAttribute('aria-pressed', String(x === b));
  renderDetail();
});
$('#d-copy').addEventListener('click', e => copy(snippets(state.selected)[state.fmt], { react: 'React snippet', js: 'JavaScript snippet', svg: 'SVG' }[state.fmt], e.currentTarget));
$('#d-copy-name').addEventListener('click', e => copy(state.selected, `name ${state.selected}`, e.currentTarget));
$('#d-download').addEventListener('click', () => {
  const svg = snippets(state.selected).svg + '\n';
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${state.selected}${state.pencil ? '-pencil' : ''}.svg` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce(`Downloaded ${state.selected}.svg`);
});

/* ---------- tabs ---------- */
for (const tabs of $$('[data-tabs]')) {
  const list = $$('[role="tab"]', tabs);
  const show = (tab, focus) => {
    for (const t of list) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    }
    if (focus) tab.focus();
  };
  list.forEach((t, i) => {
    t.addEventListener('click', () => show(t));
    t.addEventListener('keydown', e => {
      const j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : null;
      if (j === null) return;
      e.preventDefault();
      show(list[(j + list.length) % list.length], true);
    });
  });
  show(list.find(t => t.getAttribute('aria-selected') === 'true') || list[0]);
}

/* ---------- start ---------- */
syncSheet();
select(state.selected, false);
filter();
