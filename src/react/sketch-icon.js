import { forwardRef, useContext } from 'react';
import { SketchIconContext, renderSketchIcon } from './base.js';
import { drawIcon } from '../esm/engine.js';
import { icons } from '../esm/all.js';
import { ALIASES } from '../esm/aliases.js';

const redraws = new Map();
const redraw = (name, seed, wobble) => {
  const k = name + '|' + seed + '|' + wobble;
  if (!redraws.has(k)) redraws.set(k, drawIcon(name, { seed, wobble }));
  return redraws.get(k);
};

const own = (o, n) => Object.prototype.hasOwnProperty.call(o, n);
const has = n => own(icons, n) || own(ALIASES, n);
/* an alternate name draws the glyph it points at */
const glyph = n => own(ALIASES, n) ? ALIASES[n] : n;

/** Icon by name, or by an alternate name (pulls in the whole set). `seed` redraws the glyph in a different hand; `wobble` (0 to 1) is how much
    hand there is: 1 is the default drawing, 0 is the exact shapes. */
export const SketchIcon = /*#__PURE__*/Object.assign(
  forwardRef(({ name, seed, wobble, ...props }, ref) => {
    const ctx = useContext(SketchIconContext);
    if (!has(name)) {
      if (typeof console !== 'undefined') console.warn(`sketch-icons: unknown icon "${name}"`);
      return null;
    }
    name = glyph(name);
    const w = wobble === undefined ? 1 : Math.min(1, Math.max(0, +wobble || 0));
    return renderSketchIcon(seed || w !== 1 ? redraw(name, seed || 0, w) : icons[name], props, ref, ctx);
  }),
  { displayName: 'SketchIcon', names: Object.keys(icons), has }
);
