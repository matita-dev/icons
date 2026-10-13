/* Copy buttons: any <button data-copy-target="id"> copies the text of that element. Used by the pages below the root;
   announces through #announce for screen readers. */
const announce = msg => { const el = document.querySelector('#announce'); if (!el) return; el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30); };

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

export function initCopy() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-copy-target]');
    if (!btn) return;
    const el = document.getElementById(btn.dataset.copyTarget);
    if (el) copy(el.textContent, 'to clipboard', btn);
  });
}
