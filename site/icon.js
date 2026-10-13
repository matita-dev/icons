/* matita.dev/icons/...: the mobile menu, the copy buttons, and on each icon page the recipe editor in place: "Edit this
   recipe" turns the recipe frame into a text box and the plotted / drawn frames follow every change. Closing the editor
   puts the real icon back. */
import { initMenu } from './menu.mjs';
import { initCopy } from './copy.mjs';
import { createEditor } from './editor.mjs';

initMenu();
initCopy();

const $ = s => document.querySelector(s);
const toggle = $('#ed-toggle'), panel = $('#ed-controls'), src = $('#ed-src');
const els = { seed: $('#ed-seed'), recipe: $('#ed-recipe'), msg: $('#ed-msg'), hash: $('#ed-hash'), reset: $('#ed-reset'), plotted: $('#ed-plotted-g'), drawn: $('#ed-drawn-g') };

if (toggle && panel && src && Object.values(els).every(Boolean)) {
  const editor = createEditor(els);
  let open = false;
  toggle.addEventListener('click', () => {
    open = !open;
    if (open && !editor.current) editor.load(toggle.dataset.icon);
    if (!open) editor.reset(); /* closing shows the real icon again */
    src.hidden = open;
    els.recipe.hidden = !open;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close the editor' : 'Edit this recipe';
    if (open) els.recipe.focus();
  });
}
