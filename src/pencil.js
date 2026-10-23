/* Pencil variant: every ink stroke is drawn again as two or three loose pencil lines that don't quite agree, the way
   a quick sketch goes over a line twice. Built from the ink paths when an icon is rendered, so the icon data stays
   small; seeded from the icon's name, so the same icon always gets the same lines. The paper grain comes from
   pencil.css (inline icons) or from a filter inside each pencil/*.svg file. */
import { hash, prng } from './random.js';

const f = n => Math.round(n * 10) / 10, len = (x, y) => Math.sqrt(x * x + y * y);
const cache = new WeakMap();

/** An SVG arc (no rotation) as cubic segments of up to a quarter turn each: [[c1, c2, end], ...]. */
function arcToCubics(p0, rx, ry, large, sweep, p1) {
  const x1 = (p0[0] - p1[0]) / 2, y1 = (p0[1] - p1[1]) / 2, lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / (den || 1)));
  const cxp = k * rx * y1 / ry, cyp = -k * ry * x1 / rx, cx = cxp + (p0[0] + p1[0]) / 2, cy = cyp + (p0[1] + p1[1]) / 2;
  const a0 = Math.atan2((y1 - cyp) / ry, (x1 - cxp) / rx);
  let da = Math.atan2((-y1 - cyp) / ry, (-x1 - cxp) / rx) - a0;
  if (!sweep && da > 0) da -= 2 * Math.PI; else if (sweep && da < 0) da += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 2) - 1e-9)), step = da / n, t = 4 / 3 * Math.tan(step / 4), out = [];
  const P = a => [cx + rx * Math.cos(a), cy + ry * Math.sin(a)], D = a => [-rx * Math.sin(a), ry * Math.cos(a)];
  for (let s = 0; s < n; s++) {
    const A = a0 + step * s, B = A + step, pa = P(A), pb = P(B), dA = D(A), dB = D(B);
    out.push([[pa[0] + t * dA[0], pa[1] + t * dA[1]], [pb[0] - t * dB[0], pb[1] - t * dB[1]], s === n - 1 ? p1 : pb]);
  }
  return out;
}

/** Engine paths are M + Q/C segments, sometimes several subpaths per stroke (a box is four lines). Exact shapes
    (wobble 0) also use L, A and Z; those are turned into the same segments here. */
function subpaths(d) {
  const t = d.match(/[MLQCAZ]|-?\d*\.?\d+/g), out = [];
  let i = 0, cur, pen, start;
  const pt = () => [+t[i++], +t[i++]];
  const line = p => { cur.push(['Q', pen, [(pen[0] + p[0]) / 2, (pen[1] + p[1]) / 2], p]); pen = p; };
  while (i < t.length) {
    const c = t[i++];
    if (c === 'M') { pen = start = pt(); out.push(cur = []); }
    else if (c === 'L') line(pt());
    else if (c === 'Z') { if (pen[0] !== start[0] || pen[1] !== start[1]) line(start); }
    else if (c === 'A') {
      const rx = +t[i++], ry = +t[i++]; i++; const large = +t[i++], sweep = +t[i++], p = pt();
      for (const [c1, c2, e] of arcToCubics(pen, rx, ry, large, sweep, p)) { cur.push(['C', pen, c1, c2, e]); pen = e; }
    }
    else { const p = c === 'Q' ? [pt(), pt()] : [pt(), pt(), pt()]; cur.push([c, pen, ...p]); pen = p[p.length - 1]; }
  }
  return out;
}

/** One line running alongside a stroke: the stroke's own segments with every point pushed `off` sideways along the
    local normal (plus jitter and a slow drift), and the ends pulled in by tIn / tOut. */
function hairline(segs, r, off, drift, tIn, tOut) {
  const nrm = (p, q) => { const x = q[0] - p[0], y = q[1] - p[1], L = len(x, y) || 1; return [-y / L, x / L]; };
  const avg = (a, b) => { const x = a[0] + b[0], y = a[1] + b[1], L = len(x, y) || 1; return [x / L, y / L]; };
  const n = segs.length, inN = segs.map(s => nrm(s[1], s[2])), outN = segs.map(s => nrm(s[s.length - 2], s[s.length - 1]));
  const J = () => (r() * 2 - 1) * .06, at = (i, t) => off + drift * ((i + t) / n - .5);
  const mv = (p, v, o) => [p[0] + v[0] * o + J(), p[1] + v[1] * o + J()];
  const pull = (p, q, e) => { const L = len(q[0] - p[0], q[1] - p[1]) || 1, k = Math.min(e, L * .35); return [p[0] + (q[0] - p[0]) / L * k, p[1] + (q[1] - p[1]) / L * k]; };
  let d = '';
  segs.forEach((s, i) => {
    const nA = i ? avg(outN[i - 1], inN[i]) : inN[i], nB = i < n - 1 ? avg(outN[i], inN[i + 1]) : outN[i];
    let A = mv(s[1], nA, at(i, 0)), B = mv(s[s.length - 1], nB, at(i, 1));
    const C = s.slice(2, -1).map((c, k, all) => mv(c, s[0] === 'Q' ? avg(nA, nB) : k ? nB : nA, at(i, (k + 1) / (all.length + 1))));
    if (i === 0 && tIn) A = pull(A, C[0], tIn);
    if (i === n - 1 && tOut) B = pull(B, C[C.length - 1], tOut);
    if (!i) d += 'M' + f(A[0]) + ' ' + f(A[1]);
    d += s[0] + C.map(c => f(c[0]) + ' ' + f(c[1])).join(' ') + ' ' + f(B[0]) + ' ' + f(B[1]);
  });
  return d;
}

/** [path d, width multiplier, opacity] for every pencil line of an icon. Long strokes get three lines, short ones two;
    each sits up to about 0.5 off the stroke, drifts a little, and starts and stops at its own place. */
export function pencilLines(icon) {
  if (cache.has(icon)) return cache.get(icon);
  const r = prng(hash(icon.name + ':sketchy')), out = [];
  for (const [d, w] of icon.ink) for (const segs of subpaths(d)) {
    const L = segs.reduce((a, s) => a + len(s[s.length - 1][0] - s[1][0], s[s.length - 1][1] - s[1][1]), 0), n = L > 3 ? 3 : 2, trim = Math.min(1.2, L * .12);
    for (let k = 0; k < n; k++) {
      const off = (k - (n - 1) / 2) * .42 + (r() - .5) * .2, drift = (r() - .5) * .45, tIn = r() * trim, tOut = r() * trim;
      out.push([hairline(segs, r, off, drift, tIn, tOut), w * .5, Math.round((.62 + r() * .25) * 100) / 100]);
    }
  }
  cache.set(icon, out);
  return out;
}
