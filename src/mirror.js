/* Direction-aware glyphs: the ones whose meaning follows the reading direction, so an app in a right-to-left layout
   (Arabic, Hebrew, Persian) wants them flipped horizontally: arrows and chevrons that point forward or back, undo and
   redo, sign in and out, sidebars, text alignment, speech bubbles. Symmetric glyphs, media controls (play, skip), clocks,
   refresh and rotate arrows, logos and anything with a drawn letter or number are not listed.
   The build ships this as `MIRROR`, as the `mirror` field of icons.json and keywords.json, and the React `mirror` prop
   draws any icon flipped. `scripts/lint.mjs` checks every entry is a glyph. Reviewed by the owner before release. */
export const MIRROR = [
  'arrow-right', 'arrow-left', 'arrow-up-right', 'arrow-up-left', 'arrow-down-right', 'arrow-down-left',
  'chevron-right', 'chevron-left', 'chevrons-right', 'chevrons-left',
  'corner-down-left', 'corner-up-left', 'corner-up-right', 'circle-arrow-left',
  'undo', 'redo', 'forward', 'send', 'external-link',
  'log-in', 'log-out', 'sidebar', 'panels-top-left',
  'align-left', 'align-right', 'quote', 'clipboard-paste-right',
  'message-square', 'message-circle', 'toggle-right'
];
