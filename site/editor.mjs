/* The recipe editor: an editable recipe, a seed, and live "plotted" + "drawn" previews. Shared by the how-it-works demo
   (with an icon picker in front) and every icon page (one fixed icon). Draws with the published package's engine, so
   what you see is what the package draws. */
import { DEFS, drawIcon, hash } from '@matita/icons/engine';
import { toSvgInner } from '@matita/icons';
import { plotted, recipeProblem } from './geometry.mjs';

export const format = src => src.split(';').map(s => s.trim()).join(';\n');

/* els: { seed, recipe, msg, hash, reset, plotted, drawn }  (plotted / drawn are the <g> elements to fill) */
export function createEditor(els, { onLoad } = {}) {
  let current = null;

  function draw() {
    const seed = Math.max(0, Math.min(99, parseInt(els.seed.value, 10) || 0));
    const src = els.recipe.value.slice(0, 600);
    els.hash.textContent = hash(current);
    els.reset.hidden = format(els.recipe.value.trim()) === format(DEFS[current]) && seed === 0;
    const problem = recipeProblem(src);
    els.msg.textContent = problem;
    els.msg.classList.toggle('is-error', !!problem);
    if (problem) return; /* keep the last good drawing on screen while the recipe is being edited */
    try {
      const icon = drawIcon(current, { seed, defs: { [current]: src } });
      els.plotted.innerHTML = plotted(src);
      els.drawn.innerHTML = toSvgInner(icon, { strokeWidth: .8 });
    } catch {
      els.msg.textContent = 'That recipe could not be drawn. Check the numbers.';
      els.msg.classList.add('is-error');
    }
  }

  function load(name) {
    current = name;
    els.recipe.value = format(DEFS[name]);
    els.recipe.rows = Math.max(4, Math.min(12, DEFS[name].split(';').length + 1));
    els.seed.value = els.seed.value || '0';
    draw();
    if (onLoad) onLoad(name);
  }

  function reset() { els.recipe.value = format(DEFS[current]); els.seed.value = '0'; draw(); }

  let raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
  els.seed.addEventListener('input', schedule);
  els.recipe.addEventListener('input', schedule);
  els.reset.addEventListener('click', () => { reset(); els.recipe.focus(); });

  return { load, reset, draw, get current() { return current; } };
}
