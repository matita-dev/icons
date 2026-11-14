import { forwardRef, useContext } from 'react';
import { SketchIconContext, renderSketchIcon } from './base.js';

/* Icons for the `@matita/icons/shadcn` entry. Same renderer as every other Matita icon with one difference: the fallback
   size is 24 (not 16), because the components that import these icons size them with CSS and an icon used bare in your
   own code should not collapse to 16. A `size` prop, a SketchIconProvider and any CSS size all win over it. The stroke
   stays 1.6. No inline display or flex, so utility classes such as hidden, inline and shrink-0 apply. */
export function createShadcnIcon(icon, displayName) {
  const C = forwardRef((props, ref) => renderSketchIcon(icon, props, ref, { size: 24, ...useContext(SketchIconContext) }));
  C.displayName = displayName;
  return C;
}
