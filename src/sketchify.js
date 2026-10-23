/* Freehand engine: turns drafting primitives into deterministic pencil strokes.
   Lines overshoot their ends like ruled pencil lines, boxes cross at the corners, circles overlap where the pen closes,
   polylines keep sharp joints with a slight bow per segment. Same name + seed = same drawing, everywhere. */
import { DEFS } from './defs.js';
import { hash, prng } from './random.js';

const f = n => Math.round(n * 100) / 100, pt = p => f(p[0]) + ' ' + f(p[1]);

export { hash, prng };

function smooth(P) {
  let d = 'M' + pt(P[0]);
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i - 1] || P[i], b = P[i], c = P[i + 1], e = P[i + 2] || c;
    d += 'C' + pt([b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6]) + ' ' + pt([c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6]) + ' ' + pt(c);
  }
  return d;
}

/* `wobble` (0 to 1) scales every habit of the hand: jitter, bow, overshoot and ring overlap. 1 is the full drawing and
   multiplies by nothing, so it is byte-for-byte what 0.3.0 drew. The random stream does not depend on it. */
export function sketchify(src, r, wobble = 1) {
  const K = wobble, S = v => K === 1 ? v : v * K;
  const j = a => (r() * 2 - 1) * a * K, J = p => [p[0] + j(.2), p[1] + j(.2)];
  const line = (x1, y1, x2, y2, ov = .4) => {
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L, e1 = S(ov) * (.45 + r() * .9), e2 = S(ov) * (.45 + r() * .9), b = j(Math.min(.7, L * .045));
    const a = J([x1 - ux * e1, y1 - uy * e1]), c = J([x2 + ux * e2, y2 + uy * e2]);
    return 'M' + pt(a) + 'Q' + pt([(a[0] + c[0]) / 2 - uy * b, (a[1] + c[1]) / 2 + ux * b]) + ' ' + pt(c);
  };
  const poly = (P, closed) => {
    P = P.map(J); if (closed) P = P.concat([P[0]]);
    if (!closed) { const s = P[0], n = P[1], L = Math.hypot(n[0] - s[0], n[1] - s[1]) || 1, e = S(.2 + r() * .45); P[0] = [s[0] - (n[0] - s[0]) / L * e, s[1] - (n[1] - s[1]) / L * e]; }
    const z = P[P.length - 1], y = P[P.length - 2], Lz = Math.hypot(z[0] - y[0], z[1] - y[1]) || 1, ez = S(closed ? .3 : .15 + r() * .4);
    let end = [z[0] + (z[0] - y[0]) / Lz * ez, z[1] + (z[1] - y[1]) / Lz * ez];
    if (closed) { const n = P[1], L1 = Math.hypot(n[0] - z[0], n[1] - z[1]) || 1, o = S(1 + r() * .9); end = [z[0] + (n[0] - z[0]) / L1 * o, z[1] + (n[1] - z[1]) / L1 * o]; P.push(end); } else P[P.length - 1] = end;
    let d = 'M' + pt(P[0]);
    for (let i = 1; i < P.length; i++) { const a = P[i - 1], c = P[i], L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, b = j(Math.min(.55, L * .045)); d += 'Q' + pt([(a[0] + c[0]) / 2 - (c[1] - a[1]) / L * b, (a[1] + c[1]) / 2 + (c[0] - a[0]) / L * b]) + ' ' + pt(c); }
    return d;
  };
  const ring = (cx, cy, rx, ry) => {
    // The pen closes three ways: a long overlap, a short one, or (on rings big enough to show it) stopping just short.
    // The point count keeps its 0.2 formula so the random stream, and every stroke drawn after the ring, stay as they were.
    const a0 = r() * 360, u = r(), n = Math.max(10, Math.ceil((388 + u * 30) / 24)), long = u < .45, gap = u >= .8 && Math.min(rx, ry) >= 4;
    const sw = long ? 390 + u / .45 * 28 : gap ? 360 - (1.9 + (u - .8) * 3.5) / ((rx + ry) / 2) * 180 / Math.PI : 364 + (u - .45) / .55 * 14;
    const sweep = K === 1 ? sw : 360 + (sw - 360) * K;
    const dr = S((.55 + r() * .45) * (gap ? .3 : 1)), sq = 1 + j(.045), P = []; ry *= sq; rx /= sq;
    for (let i = 0; i <= n; i++) { const t = i / n, a = (a0 + sweep * t) * Math.PI / 180, k = 1 + j(.028), g = dr * t; P.push([cx + Math.cos(a) * (rx * k + g), cy + Math.sin(a) * (ry * k + g)]); }
    return smooth(P);
  };
  const arc = (cx, cy, R, a0, a1) => {
    const e = (a1 > a0 ? 1 : -1) * S(4 + r() * 5), A0 = a0 - e, A1 = a1 + e, n = Math.max(3, Math.ceil(Math.abs(A1 - A0) / 26)), P = [];
    for (let i = 0; i <= n; i++) { const a = (A0 + (A1 - A0) * i / n) * Math.PI / 180, k = R + j(.16); P.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k]); }
    return smooth(P);
  };
  const quad = (x1, y1, cx, cy, x2, y2) => {
    const a = J([x1, y1]), c = J([cx, cy]), b = J([x2, y2]), t = (p, q, e) => { const L = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1; return [p[0] + (p[0] - q[0]) / L * e, p[1] + (p[1] - q[1]) / L * e]; };
    return 'M' + pt(t(a, c, S(.15 + r() * .3))) + 'Q' + pt(c) + ' ' + pt(t(b, c, S(.15 + r() * .3)));
  };
  let s = '', o = ''; const out = [];
  for (const part of src.split(';')) {
    const before = s; const k = part.trim()[0], v = part.trim().slice(1).trim().split(/\s+/).map(Number), pts = [];
    for (let i = 0; i + 1 < v.length; i += 2) pts.push([v[i], v[i + 1]]);
    if (k === 'L') s += line(...v); else if (k === 'P') s += poly(pts, false); else if (k === 'Z') s += poly(pts, true);
    else if (k === 'R') { const [x, y, w, h] = v; const ov = 1.15; s += line(x, y, x + w, y, ov) + line(x + w, y, x + w, y + h, ov) + line(x + w, y + h, x, y + h, ov) + line(x, y + h, x, y, ov); }
    else if (k === 'C') s += ring(v[0], v[1], v[2], v[2]); else if (k === 'E') s += ring(v[0], v[1], v[2], v[3]); else if (k === 'A') s += arc(...v); else if (k === 'Q') s += quad(...v);
    else if (k === 'O') { const p = J([v[0], v[1]]); o += 'M' + pt(p) + 'l.01 0'; }
    if (s !== before) out.push({ d: s.slice(before.length), w: f(K === 1 ? .86 + r() * .28 : 1 + (.86 + r() * .28 - 1) * K) });
  }
  return { p: out, o };
}

/** The primitives exactly as written: true lines, circles, arcs and corners, no hand. This is what wobble 0 draws. */
export function exact(src) {
  const out = []; let o = '';
  for (const part of src.split(';')) {
    const k = part.trim()[0], v = part.trim().slice(1).trim().split(/\s+/).map(Number), pts = [];
    for (let i = 0; i + 1 < v.length; i += 2) pts.push(pt([v[i], v[i + 1]]));
    let d = '';
    if (k === 'L') d = 'M' + pts[0] + 'L' + pts[1];
    else if (k === 'P') d = 'M' + pts.join('L');
    else if (k === 'Z') d = 'M' + pts.join('L') + 'Z';
    else if (k === 'R') { const [x, y, w, h] = v; d = 'M' + pt([x, y]) + 'L' + pt([x + w, y]) + 'L' + pt([x + w, y + h]) + 'L' + pt([x, y + h]) + 'Z'; }
    else if (k === 'C' || k === 'E') { const [cx, cy, rx, ry = rx] = v; d = `M${pt([cx - rx, cy])}A${f(rx)} ${f(ry)} 0 1 0 ${pt([cx + rx, cy])}A${f(rx)} ${f(ry)} 0 1 0 ${pt([cx - rx, cy])}Z`; }
    else if (k === 'A') {
      const [cx, cy, R, a0, a1] = v, at = a => pt([cx + Math.cos(a * Math.PI / 180) * R, cy + Math.sin(a * Math.PI / 180) * R]);
      d = `M${at(a0)}A${f(R)} ${f(R)} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${at(a1)}`;
    }
    else if (k === 'Q') d = 'M' + pts[0] + 'Q' + pts[1] + ' ' + pts[2];
    else if (k === 'O') o += 'M' + pts[0] + 'l.01 0';
    if (d) out.push({ d, w: 1 });
  }
  return { p: out, o };
}

/** One drawing of a primitive source string. `wobble` is 0 (exact shapes) to 1 (the full hand, the default). */
export function drawSource(src, key, seed = 0, wobble = 1) {
  const w = Math.min(1, Math.max(0, Number.isFinite(wobble) ? wobble : 1));
  return w === 0 ? exact(src) : sketchify(src, prng(hash(key) + (seed || 0) * 7919), w);
}

/** Everything any renderer needs for one glyph: ink strokes and the dot pass. The pencil variant is drawn from the
    ink at render time (see pencil.js), so it adds nothing to the icon data. */
export function drawIcon(name, { seed = 0, wobble = 1, defs = DEFS } = {}) {
  const src = defs[name];
  if (!src) throw new Error('Unknown sketch icon: ' + name);
  const g = drawSource(src, name, seed, wobble);
  return { name, ink: g.p.map(p => [p.d, p.w]), dot: g.o };
}

export { DEFS };
export const names = Object.keys(DEFS);
