import { forwardRef, useContext } from 'react';
import { SketchIconContext, renderSketchIcon } from './base.js';
import { drawIcon } from '../esm/engine.js';
import { icons } from '../esm/all.js';

const redraws = new Map();
const redraw = (name, seed, wobble) => {
  const k = name + '|' + seed + '|' + wobble;
  if (!redraws.has(k)) redraws.set(k, drawIcon(name, { seed, wobble }));
  return redraws.get(k);
};

const has = n => Object.prototype.hasOwnProperty.call(icons, n);

/** Icon by name (pulls in the whole set). `seed` redraws the glyph in a different hand; `wobble` (0 to 1) is how much
    hand there is: 1 is the default drawing, 0 is the exact shapes. */
export const SketchIcon = /*#__PURE__*/Object.assign(
  forwardRef(({ name, seed, wobble, ...props }, ref) => {
    const ctx = useContext(SketchIconContext);
    if (!has(name)) {
      if (typeof console !== 'undefined') console.warn(`sketch-icons: unknown icon "${name}"`);
      return null;
    }
    const w = wobble === undefined ? 1 : Math.min(1, Math.max(0, +wobble || 0));
    return renderSketchIcon(seed || w !== 1 ? redraw(name, seed || 0, w) : icons[name], props, ref, ctx);
  }),
  { displayName: 'SketchIcon', names: Object.keys(icons), has }
);
