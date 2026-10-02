/* Framework-free renderer shared by every output (static SVG, sprite, vanilla DOM, React). */
const r = n => Math.round(n * 1e4) / 1e4;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const DEFAULTS = { size: 16, color: 'currentColor', strokeWidth: 1.6, pencil: false };

/** Path list for one icon: ink strokes, then (pencil) the faint second pass, then dots. */
export function iconPaths(icon, { strokeWidth = DEFAULTS.strokeWidth, pencil = false } = {}) {
  const out = icon.ink.map(([d, w], i) => pencil
    ? { d, 'stroke-width': r(strokeWidth * w), 'stroke-opacity': icon.pencil.opacity[i] }
    : { d, 'stroke-width': r(strokeWidth * w) });
  if (pencil) for (const [d, w] of icon.pencil.pass) out.push({ d, 'stroke-width': r(strokeWidth * w * .55), 'stroke-opacity': .32 });
  if (icon.dot) out.push(pencil
    ? { d: icon.dot, 'stroke-width': r(strokeWidth * 1.55), 'stroke-opacity': .9 }
    : { d: icon.dot, 'stroke-width': r(strokeWidth * 1.55) });
  return out;
}

/** Root <svg> attributes. */
export function iconAttrs(icon, opts = {}) {
  const { size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth, pencil = false, title, class: cls } = opts;
  const a = {
    xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: color,
    'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', overflow: 'visible',
    class: ['sketch-icon', 'sketch-icon-' + icon.name, cls].filter(Boolean).join(' '), 'data-sketch': ''
  };
  if (pencil) a['data-sketch-pencil'] = '';
  if (title) { a.role = 'img'; a['aria-label'] = title; } else a['aria-hidden'] = 'true';
  return a;
}

const attrString = a => Object.entries(a).filter(([, v]) => v !== undefined && v !== null && v !== false)
  .map(([k, v]) => v === '' ? k : `${k}="${esc(v)}"`).join(' ');

/** Inner markup (paths only) — for sprites or custom wrappers. */
export function toSvgInner(icon, opts = {}) {
  return iconPaths(icon, opts).map(p => `<path ${attrString(p)}/>`).join('');
}

/** Full <svg> string. opts: size, color, strokeWidth, pencil, title, class, attrs */
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
    Per-element overrides: data-size, data-stroke-width, data-color, data-pencil, data-title, class. */
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
    if (d.title) o.title = d.title;
    if (el.getAttribute('class')) o.class = [opts.class, el.getAttribute('class')].filter(Boolean).join(' ');
    el.replaceWith(createElement(icon, o, doc));
  });
}

export const pascal = n => String(n).replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
