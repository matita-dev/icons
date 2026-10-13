/* Mobile menu: a <details> in the header, so it opens without JavaScript. This only adds the polite behaviour: close it
   when a link is used, on Escape, on an outside click, or when the screen grows past the breakpoint. */
export function initMenu() {
  const menu = document.querySelector('.nav-menu');
  if (!menu) return;
  menu.addEventListener('click', e => { if (e.target.closest('.menu-panel a')) menu.open = false; });
  document.addEventListener('click', e => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
  });
  const wide = matchMedia('(min-width: 1041px)');
  const close = e => { if (e.matches) menu.open = false; };
  wide.addEventListener ? wide.addEventListener('change', close) : wide.addListener(close);
}
