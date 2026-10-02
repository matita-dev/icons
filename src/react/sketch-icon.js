import { forwardRef, useContext } from 'react';
import { SketchIconContext, renderSketchIcon } from './base.js';
import { drawIcon } from '../esm/engine.js';
import { icons } from '../esm/all.js';

const redraws = new Map();
const redraw = (name, seed) => {
  const k = name + '|' + seed;
  if (!redraws.has(k)) redraws.set(k, drawIcon(name, { seed }));
  return redraws.get(k);
};

const has = n => Object.prototype.hasOwnProperty.call(icons, n);

/** Icon by name (pulls in the whole set). `seed` redraws the glyph in a different hand. */
export const SketchIcon = /*#__PURE__*/Object.assign(
  forwardRef(({ name, seed, ...props }, ref) => {
    const ctx = useContext(SketchIconContext);
    if (!has(name)) {
      if (typeof console !== 'undefined') console.warn(`sketch-icons: unknown icon "${name}"`);
      return null;
    }
    return renderSketchIcon(seed ? redraw(name, seed) : icons[name], props, ref, ctx);
  }),
  { displayName: 'SketchIcon', names: Object.keys(icons), has }
);
