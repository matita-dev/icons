/* matita.dev/how-it-works/ behaviour: menu, copy buttons and the "try it" demo (an icon picker in front of the shared
   recipe editor). */
import { DEFS, drawIcon } from '@matita/icons/engine';
import { toSvg } from '@matita/icons';
import { initMenu } from './menu.mjs';
import { initCopy } from './copy.mjs';
import { createEditor } from './editor.mjs';

initMenu();
initCopy();

const $ = s => document.querySelector(s);

/* ---------- try it ----------
   Same search as the icon browser on the home page: type to filter the set, click an icon to load its recipe. Only real
   icons can be picked. The recipe can then be edited; the icon's name (plus the seed) decides the wobble. */
const searchEl = $('#try-search'), countEl = $('#try-count'), gridEl = $('#try-grid'), emptyEl = $('#try-empty'), emptyQ = $('#try-empty-q');
const currentEl = $('#try-current');
const names = Object.keys(DEFS);
const norm = v => v.trim().toLowerCase().replace(/\s+/g, '-');
const buttons = {};

function filter() {
  const q = norm(searchEl.value);
  let shown = 0, first = null;
  for (const [n, b] of Object.entries(buttons)) {
    const hit = !q || n.includes(q);
    b.parentElement.hidden = !hit;
    if (hit) { shown++; first ||= b; }
  }
  countEl.textContent = q ? `${shown} of ${names.length} icons` : `${names.length} icons`;
  emptyEl.hidden = shown > 0;
  emptyQ.textContent = searchEl.value.trim();
  return first;
}

const els = { seed: $('#try-seed'), recipe: $('#try-recipe'), msg: $('#try-msg'), hash: $('#try-hash'), reset: $('#try-reset'), plotted: $('#try-plotted-g'), drawn: $('#try-drawn-g') };
if (searchEl && gridEl && Object.values(els).every(Boolean)) {
  const editor = createEditor(els, {
    onLoad: name => {
      currentEl.textContent = name;
      for (const [n, b] of Object.entries(buttons)) b.setAttribute('aria-pressed', String(n === name));
    }
  });
  /* the picker: every icon as drawn by the package (seed 0), same markup and look as the home page grid */
  for (const name of names) {
    const li = document.createElement('li');
    li.innerHTML = `<button class="icon-btn" type="button" data-name="${name}" aria-pressed="false"><span class="glyph">${toSvg(drawIcon(name), { size: 24 })}</span><span class="icon-name">${name}</span></button>`;
    buttons[name] = li.firstElementChild;
    gridEl.append(li);
  }
  gridEl.addEventListener('click', e => { const b = e.target.closest('.icon-btn'); if (b) editor.load(b.dataset.name); });
  searchEl.addEventListener('input', filter);
  searchEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); const first = filter(); if (first) editor.load(first.dataset.name); }
    else if (e.key === 'Escape' && searchEl.value) { searchEl.value = ''; filter(); }
  });
  /* ?icon=name picks that icon; anything that is not a real icon is ignored */
  const wanted = norm(new URLSearchParams(location.search).get('icon') || '');
  const initial = currentEl.textContent.trim();
  editor.load(names.includes(wanted) ? wanted : names.includes(initial) ? initial : names[0]);
}
