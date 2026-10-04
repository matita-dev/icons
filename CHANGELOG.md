# Changelog

Changes to `@matita/icons`. While the package is on 0.x, a minor version adds glyphs and a patch fixes things.

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
