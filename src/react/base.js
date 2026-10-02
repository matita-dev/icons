import { createElement as h, createContext, forwardRef, useContext } from 'react';
import { iconPaths, pascal } from '../esm/render.js';

/** Defaults for every sketch icon below it: size, color, strokeWidth, pencil. */
export const SketchIconContext = /*#__PURE__*/createContext({});

export function SketchIconProvider({ children, ...value }) {
  const parent = useContext(SketchIconContext);
  return h(SketchIconContext.Provider, { value: { ...parent, ...value } }, children);
}

export function renderSketchIcon(icon, props, ref, ctx = {}) {
  const {
    size = ctx.size ?? 16, color = ctx.color ?? 'currentColor', strokeWidth, weight,
    pencil = ctx.pencil ?? false, title, className, style, children, ...rest
  } = props;
  const sw = strokeWidth ?? weight ?? ctx.strokeWidth ?? 1.6;
  return h('svg', {
    ref, xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', width: size, height: size,
    fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round',
    'data-sketch': '', 'data-sketch-pencil': pencil ? '' : undefined,
    className: ['sketch-icon', 'sketch-icon-' + icon.name, className].filter(Boolean).join(' '),
    role: title ? 'img' : undefined, 'aria-label': title, 'aria-hidden': title ? undefined : 'true',
    ...rest,
    style: { display: 'inline-block', flex: 'none', overflow: 'visible', ...style }
  },
  iconPaths(icon, { strokeWidth: sw, pencil }).map((p, i) =>
    h('path', { key: i, d: p.d, strokeWidth: p['stroke-width'], strokeOpacity: p['stroke-opacity'] })),
  children);
}

/** Wrap icon data (built-in, or your own from drawIcon) as a component. */
export function createSketchIcon(icon) {
  const C = forwardRef((props, ref) => renderSketchIcon(icon, props, ref, useContext(SketchIconContext)));
  C.displayName = pascal(icon.name);
  return C;
}
