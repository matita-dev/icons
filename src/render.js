/* Framework-free renderer shared by every output (static SVG, sprite, vanilla DOM, React). */
import { pencilLines } from './pencil.js';

const r = n => Math.round(n * 1e4) / 1e4;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const DEFAULTS = { size: 16, color: 'currentColor', strokeWidth: 1.6, pencil: false };

/** pencil.css texture level for a `rough` amount: 0 (today's grain), 1 or 2, whichever is nearest. */
export const roughLevel = rough => Math.round(Math.min(1, Math.max(0, +rough || 0)) * 2);

/** Path list for one icon: ink strokes (or, for pencil, two or three loose pencil lines per stroke), then dots. */
export function iconPaths(icon, { strokeWidth = DEFAULTS.strokeWidth, pencil = false, rough = 0 } = {}) {
  const out = pencil
    ? pencilLines(icon, rough).map(([d, w, o]) => ({ d, 'stroke-width': r(strokeWidth * w), 'stroke-opacity': o }))
    : icon.ink.map(([d, w]) => ({ d, 'stroke-width': r(strokeWidth * w) }));
  if (icon.dot) out.push({ d: icon.dot, 'stroke-width': r(strokeWidth * (pencil ? 1.35 : 1.55)) });
  return out;
}

/** Accessibility attributes the caller set: an icon with any of these isn't decorative, so it isn't aria-hidden. */
export const a11yAttrs = (attrs = {}) => {
  const set = k => attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false && attrs[k] !== '';
  return {
    labelled: set('aria-label') || set('aria-labelledby'),
    any: Object.keys(attrs).some(k => (k.startsWith('aria-') || k === 'role') && set(k))
  };
};

/** Root <svg> attributes. */
export function iconAttrs(icon, opts = {}) {
  const { size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth, pencil = false, rough = 0, title, class: cls } = opts;
  const own = a11yAttrs(opts.attrs);
  const a = {
    xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: color,
    'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', overflow: 'visible',
    class: ['sketch-icon', 'sketch-icon-' + icon.name, cls].filter(Boolean).join(' '), 'data-sketch': ''
  };
  if (pencil) a['data-sketch-pencil'] = '';
  if (pencil && roughLevel(rough)) a['data-sketch-rough'] = roughLevel(rough);
  if (title) { a.role = 'img'; a['aria-label'] = title; }
  else if (own.labelled) a.role = 'img';
  else if (!own.any) a['aria-hidden'] = 'true';
  return a;
}

const attrString = a => Object.entries(a).filter(([, v]) => v !== undefined && v !== null && v !== false)
  .map(([k, v]) => `${k}="${esc(v)}"`).join(' '); // always k="v": bare attributes are invalid XML in standalone .svg files

/** Inner markup (paths only) — for sprites or custom wrappers. */
export function toSvgInner(icon, opts = {}) {
  return iconPaths(icon, opts).map(p => `<path ${attrString(p)}/>`).join('');
}

/** Full <svg> string. opts: size, color, strokeWidth, pencil, rough, title, class, attrs */
export function toSvg(icon, opts = {}) {
  const a = { ...iconAttrs(icon, opts), ...(opts.attrs || {}) };
  const t = opts.title ? `<title>${esc(opts.title)}</title>` : '';
  return `<svg ${attrString(a)}>${t}${toSvgInner(icon, opts)}</svg>`;
}

/** DOM <svg> element (browser). */
export function createElement(icon, opts = {}, doc = globalThis.document) {
  const NS = 'http://www.w3.org/2000/svg', svg = doc.createElementNS(NS, 'svg');
  const a = { ...iconAttrs(icon, opts), ...(opts.attrs || {}) };
  delete a.xmlns;
  for (const [k, v] of Object.entries(a)) if (v !== undefined && v !== null && v !== false) svg.setAttribute(k, String(v));
  if (opts.title) { const t = doc.createElementNS(NS, 'title'); t.textContent = opts.title; svg.appendChild(t); }
  for (const p of iconPaths(icon, opts)) {
    const el = doc.createElementNS(NS, 'path');
    for (const [k, v] of Object.entries(p)) el.setAttribute(k, String(v));
    svg.appendChild(el);
  }
  return svg;
}

/** Swap every <i data-sketch-icon="name"> (or any element) for its SVG.
    Per-element overrides: data-size, data-stroke-width, data-color, data-pencil, data-rough, data-title, class. */
export function replaceIcons({ icons, attr = 'data-sketch-icon', root = globalThis.document, ...opts } = {}) {
  if (!icons) throw new Error('replaceIcons: pass { icons }');
  const doc = root.ownerDocument || root;
  root.querySelectorAll(`[${attr}]`).forEach(el => {
    const name = el.getAttribute(attr), icon = icons[name] || icons[pascal(name)];
    if (!icon) return console.warn(`sketch-icons: unknown icon "${name}"`);
    const d = el.dataset, o = { ...opts };
    if (d.size) o.size = +d.size || d.size;
    if (d.strokeWidth) o.strokeWidth = +d.strokeWidth;
    if (d.color) o.color = d.color;
    if ('pencil' in d) o.pencil = d.pencil !== 'false';
    if (d.rough) o.rough = +d.rough;
    if (d.title) o.title = d.title;
    if (el.getAttribute('class')) o.class = [opts.class, el.getAttribute('class')].filter(Boolean).join(' ');
    el.replaceWith(createElement(icon, o, doc));
  });
}

export const pascal = n => String(n).replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
