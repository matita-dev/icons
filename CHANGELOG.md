# Changelog

Changes to `@matita/icons`. While the package is on 0.x, a minor version adds glyphs and a patch fixes things.

## 0.6.0 — 2026-11-08

81 new glyphs (302 → 383), a new `S` primitive for smooth lines, and four glyphs redrawn.

- **Greek letters:** alpha, alpha-capital, beta, beta-capital, gamma, gamma-capital, delta, delta-capital, epsilon, epsilon-capital, zeta, zeta-capital, eta, eta-capital, theta, theta-capital, iota, iota-capital, kappa, kappa-capital, lambda, lambda-capital, mu, mu-capital, nu, nu-capital, xi, xi-capital, omicron, omicron-capital, pi, pi-capital, rho, rho-capital, sigma, sigma-capital, tau, tau-capital, upsilon, upsilon-capital, phi, phi-capital, chi, chi-capital, psi, psi-capital, omega, omega-capital
- **Allergens:** egg, milk, peanut, wheat
- **Dietary tags:** chefs-pick, gluten-free, pork-free, vegan
- **Menu categories:** bowl, burger, drink, pizza-slice, salad, toast
- **Restaurant service:** parking, wheelchair
- **Everyday:** board-menu, cloche, folded-menu, food-app, food-menu, order-food, prices-menu, tent, utensils
- **Money and treasure:** banknote, coins
- **Nature:** anchor, paw-print, tree
- **People and work:** list-checks, shield
- **Brand:** matita
- **New: `S` primitive.** One smooth line through a list of points (`S x y x y …`), for custom glyphs and built-in ones. It draws as an exact smooth curve at wobble 0 and in the same hand as the other primitives otherwise. Every other glyph draws exactly as in 0.5.2.
- Four glyphs are redrawn (heart, heart-pulse, history and rotate-ccw have new drawings).

## 0.5.2 — 2026-11-03

The package now includes `CHANGELOG.md`, so the website can read the release history from the published version.

## 0.5.1 — 2026-11-01

README only: the cover image shows all 302 glyphs on the npm page.

## 0.5.0 — 2026-11-01

42 new glyphs (260 → 302), a new `B` primitive for curved lines, and ten glyphs redrawn.

- **Faces:** meh, frown, laugh, angry, surprised
- **Math:** infinity, square-root, plus-minus
- **Science:** beaker, magnet, telescope, orbit, planet, molecule, virus, bacteria
- **Medical and biology:** cell, petri-dish, first-aid-kit, prescription, prescription-2
- **Weather, nature and travel:** cloud-sun, cloud-rain, cloud-lightning, snowflake, wind, mountain, flower, waves, fish, sailboat, bed
- **People and work:** id-card, user-x, circle-minus, calendar-plus, bell-ring, megaphone, life-buoy
- **Money and value:** crown, gem, scale
- **New: `B` primitive.** One curved line made of cubic Bezier segments (a start point, then per segment two curve handles and the end point), for custom glyphs and built-in ones. It draws as exact shapes at wobble 0 and in the same hand as the other primitives otherwise. Every other glyph draws exactly as in 0.4.0.
- **Fixed: accessible labels.** An icon with `aria-label`, `aria-labelledby` or its own `role` is no longer `aria-hidden`, and a label also sets `role="img"`; icons with none of these stay hidden from screen readers as before. The React component now renders a `<title>` child when `title` is set, like `toSvg` and `createElement`, so a tooltip shows on hover. Thanks to @tad-bit-better.
- **New: `--matita-grain`.** A CSS variable for the pencil variant's paper grain, from 0 (solid lines) to 1 (the grain as in 0.4.0, and the default when the variable is unset). Set it on an icon or any parent. Thanks to @tad-bit-better.
- Ten glyphs are redrawn (pill now has dots in one half, and key, keyboard, hard-drive, car, lightbulb, at-sign, hammer, brush and bone have new drawings).

## 0.4.0 — 2026-10-23

60 new glyphs (200 → 260) and a wobble setting that goes all the way down to exact shapes.

- **Medical and science:** stethoscope, syringe, pill, test-tube, microscope, thermometer, heart-pulse, medical-cross, bandage, radiation, x-ray, dna, atom, brain, tooth, bone, ambulance, hospital-bed, mars, venus, face-mask, pipette
- **People and files:** user-check, user-minus, user-circle, file-check, file-x, file-code, folder-plus, mail-open, calendar-check
- **Tools, devices and places:** wrench, hammer, plug, keyboard, cpu, hard-drive, bluetooth, store, building, car, plane
- **Everyday:** timer, alarm-clock, calculator, receipt, qr-code, gauge, target, trophy, award, graduation-cap, leaf, umbrella, shuffle, repeat, percent, briefcase, trending-down, book-open
- **New: wobble.** `drawIcon(name, { wobble })` and `<SketchIcon wobble={…} />` take a number from 0 to 1 that scales every habit of the hand: jitter, bow, overshoot and ring overlap. 1 is the default and draws exactly what 0.3.0 drew. 0 draws the glyph as exact shapes (true lines, circles, arcs and square corners). It also works for your own glyphs.
- **New: exact SVG files.** `@matita/icons/exact/<name>.svg` is every glyph at wobble 0.

## 0.3.0 — 2026-10-13

27 new glyphs (173 → 200), a new pencil variant, a redrawn printer, and circles that close in more than one way.

- **New:** clipboard, trash, history, hourglass, grip-vertical, ban, square-check, toggle-right, sparkles, pin, layout-grid, arrow-up-down, arrow-left-right, chevrons-up, chevrons-down, volume, volume-1, music, flame, droplet, table, truck, wallet, thumbs-down, rocket, flask, mouse-pointer
- **Changed: circles and ellipses.** Every ring used to close the same way, running 28° to 58° past its start. Now a ring closes with a long overlap (30° to 58°), a short one (4° to 18°), or, on rings with a radius of 4 or more, stops just short of its start. The 41 glyphs with a circle or ellipse draw differently; their other strokes, and every glyph without a ring, are unchanged.
- **Changed: the pencil variant** (`pencil`). Every stroke is now drawn as two or three loose pencil lines that don't quite agree, like a quick sketch, instead of one line with a faint second pass. The paper grain in `pencil.css` now lives in the icon's own space, so it grows with the icon and fades into the line at small sizes; the old grain's large soft patches made strokes look like watercolour. The `pencil/<name>.svg` files now carry the grain as a built-in filter, so they look right without `pencil.css`.
- **Changed: icon data is smaller.** The pencil lines are drawn from the ink when an icon is rendered, so icon objects no longer have a `pencil` field (`{ name, ink, dot }` only). Each icon adds about 40% less to a bundle, and the whole-set script build drops from 65 KB to 43 KB gzipped. If you read `icon.pencil` yourself, use `iconPaths(icon, { pencil: true })` instead.
- **Changed: printer** is redrawn (a wider body, a short paper tray and a sheet coming out at the bottom); the old one read like a person standing.

## 0.2.1 — 2026-10-04

No changes to the icons or the code.

- `package.json` has a `funding` link, so the project shows up in `npm fund`.
- The README on npm now shows a preview of the whole set and links the site, the changelog and GitHub Sponsors.

## 0.2.0 — 2026-10-03

119 new glyphs (54 → 173).

- **Interface:** more-vertical, maximize, minimize, refresh-cw, rotate-cw, undo, redo, corner-down-left, log-in, log-out, share, link, paperclip, save, printer, square-pen, zoom-in, zoom-out, circle-x, circle-plus, circle-help, bell, loader, eye-off, unlock, settings, sliders, heart, star, bookmark, tag, key, flag, inbox, archive, cloud, globe, phone, users, user-plus, sidebar, columns, square, circle, arrow-down-left, arrow-down-right, arrow-up-left, chevrons-left, chevrons-right
- **Media and devices:** play, pause, skip-forward, skip-back, volume-2, volume-x, mic, headphones, camera, video, monitor, smartphone, laptop, wifi, battery, power, sun, moon, zap, bell-off
- **Text, files and code:** type, bold, italic, underline, align-left, align-center, align-right, quote, hash, at-sign, code, braces, database, server, bug, git-commit, git-merge, git-pull-request, package, file-text, file-plus, folder-open
- **Data and commerce:** chart-bar, chart-line, chart-pie, trending-up, activity, map, navigation, shopping-cart, credit-card, gift, message-circle, smile, thumbs-up, lightbulb, book, coffee
- **Drafting:** eraser, protractor, t-square, pen-nib, brush, palette, scissors, crop, move, dimension, angle, bezier

## 0.1.2 — 2026-10-03

- Fixed: the plain SVG files (`icons/*.svg`, `pencil/*.svg`) and `toSvg()` strings wrote a bare `data-sketch` attribute on the root element, which is invalid XML, so the files didn't open as images. It's now `data-sketch=""`. `sprite.svg`, inline use in HTML and the React components weren't affected.

## 0.1.1 — 2026-10-02

- First release published from GitHub Actions with npm provenance. No code changes.

## 0.1.0 — 2026-10-02

- First release: 54 glyphs, React components, `toSvg` / `createElement` / `replaceIcons`, a UMD build for script tags, plain SVG files, a sprite, the pencil variant and the freehand engine (`@matita/icons/engine`).
