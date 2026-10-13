/* Shared by the site build (Node) and the "try it" demo (browser): no Node APIs in here. */

/* Exact geometry of a glyph source, for the "plotted vs drawn" comparison. */
export function plotted(src) {
  return src.split(';').map(part => {
    const k = part.trim()[0], v = part.trim().slice(1).trim().split(/\s+/).map(Number);
    const pts = []; for (let i = 0; i + 1 < v.length; i += 2) pts.push(v[i] + ',' + v[i + 1]);
    switch (k) {
      case 'L': return `<line x1="${v[0]}" y1="${v[1]}" x2="${v[2]}" y2="${v[3]}"/>`;
      case 'P': return `<polyline points="${pts.join(' ')}"/>`;
      case 'Z': return `<polygon points="${pts.join(' ')}"/>`;
      case 'R': return `<rect x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}"/>`;
      case 'C': return `<circle cx="${v[0]}" cy="${v[1]}" r="${v[2]}"/>`;
      case 'E': return `<ellipse cx="${v[0]}" cy="${v[1]}" rx="${v[2]}" ry="${v[3]}"/>`;
      case 'A': {
        const [cx, cy, R, a0, a1] = v, p = a => [cx + Math.cos(a * Math.PI / 180) * R, cy + Math.sin(a * Math.PI / 180) * R].map(n => +n.toFixed(2));
        const [x0, y0] = p(a0), [x1, y1] = p(a1);
        return `<path d="M${x0} ${y0}A${R} ${R} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${x1} ${y1}"/>`;
      }
      case 'Q': return `<path d="M${v[0]} ${v[1]}Q${v[2]} ${v[3]} ${v[4]} ${v[5]}"/>`;
      case 'O': return `<circle cx="${v[0]}" cy="${v[1]}" r=".8" fill="currentColor" stroke="none"/>`;
      default: return '';
    }
  }).join('');
}

/* 24-unit graph paper inside a glyph's viewBox. */
export const gridLines = (from = 0, to = 24) => {
  let s = '';
  for (let i = from; i <= to; i++) {
    const cls = i % 6 === 0 ? 'g-major' : 'g-minor';
    s += `<line class="${cls}" x1="${i}" y1="${from}" x2="${i}" y2="${to}"/><line class="${cls}" x1="${from}" y1="${i}" x2="${to}" y2="${i}"/>`;
  }
  return s;
};

/* Is this a usable glyph recipe? Returns '' when it is, otherwise a short hint (used by the demo). */
const ARGS = { L: [4], R: [4], C: [3], E: [4], A: [5], Q: [6], O: [2] };
export function recipeProblem(src) {
  const parts = src.split(';').map(s => s.trim()).filter(Boolean);
  if (!parts.length) return 'Write at least one shape, for example: R 4 5.5 16 15';
  if (parts.length > 24) return 'That is a lot of shapes. Keep it to 24 or fewer.';
  for (const part of parts) {
    const k = part[0], nums = part.slice(1).trim().split(/\s+/).filter(Boolean);
    if (!'LPZRCEAQO'.includes(k)) return `"${part.slice(0, 12)}" does not start with one of L P Z R C E A Q O.`;
    if (!nums.length || nums.some(n => !/^-?\d*\.?\d+$/.test(n))) return `${k} needs numbers after it, separated by spaces.`;
    /* coordinates and radii live on a 24 grid; only an arc's two angles (degrees) may run past 360, as in the heart */
    if (nums.some((n, i) => Math.abs(+n) > (k === 'A' && i >= 3 ? 1080 : 400))) return k === 'A' ? 'Arc angles are in degrees (up to ±1080); the other numbers should stay on the 24 grid.' : 'Keep the numbers small: the grid is 24 wide.';
    if (k === 'P' || k === 'Z') { if (nums.length % 2 || nums.length < 4) return `${k} needs pairs of numbers (x y), at least two points.`; }
    else if (nums.length !== ARGS[k][0]) return `${k} takes ${ARGS[k][0]} numbers, you gave ${nums.length}.`;
  }
  return '';
}
