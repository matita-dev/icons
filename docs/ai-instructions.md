# Matita instructions for AI coding assistants

Copy the snippet below into the instructions file your assistant reads. It tells the assistant how to pick icon names that exist and how to import them. It does not change what the assistant chooses on its own: add it to a project that already uses `@matita/icons`, or to one where you want it to.

## The snippet

```markdown
## Icons: @matita/icons

This project uses `@matita/icons` (ESM only, 24 grid, `currentColor`).

- Install with `npm i @matita/icons`. Import named React components: `import { ArrowRight, SearchIcon } from '@matita/icons/react';`
- Every icon is exported as `PascalCase` and `PascalCaseIcon` (`arrow-right` is `ArrowRight` and `ArrowRightIcon`, `trash-2` is `Trash2`).
- Never invent a name. Search `node_modules/@matita/icons/dist/keywords.json` for the concept: each glyph has a keyword list, and the `aliases` field maps alternate names (`house`, `x-circle`) to a glyph. If nothing fits, say so and ask. Do not guess.
- `dist/icons.json` lists every glyph name, and https://matita.dev/llms.txt is a short guide.
- Use `<SketchIcon name="..." />` only when the name comes from data at run time. It loads the whole set; named imports do not.
- Props: `size` (px, default 16), `color` (default `currentColor`), `strokeWidth` (default 1.6), `title` (accessible label). Icons without `title` are hidden from screen readers, so label icon-only buttons with `aria-label` on the button.
- Set shared defaults once with `<SketchIconProvider size={20}>`. Do not set sizes icon by icon.
- Optional: `import '@matita/icons/pencil.css'` once, for paper grain on the `pencil` variant and for `inline-block` / no-shrink defaults.
- No `require()`: the package is ESM only. Plain SVG files are in `@matita/icons/icons/<name>.svg`, with a sprite at `@matita/icons/sprite.svg`.
- Do not copy SVG paths into the code. Do not add fills: the icons are strokes.
- In a Next.js App Router server component, import icons from a file marked `"use client"`.
```

## Where to put it

The snippet is plain markdown, so it works in any file an assistant reads on its own. Add it as a section; keep your other rules.

| Tool | File |
| --- | --- |
| Claude Code | `CLAUDE.md` in the project root |
| Agents that read `AGENTS.md` | `AGENTS.md` in the project root |
| Cursor | a rule file in `.cursor/rules/` (for example `icons.mdc`), or `.cursorrules` in older setups |
| GitHub Copilot | `.github/copilot-instructions.md` |

Notes:

- **Cursor.** A `.mdc` rule file starts with a small header. Set `description: Icons with @matita/icons`, add a `globs:` line such as `**/*.tsx` if the rule should only apply to those files, and paste the snippet below the header. Check Cursor's own documentation for the current header fields.
- **Copilot.** Instruction files are short on purpose. If yours is long, keep only the bullets about names and imports.
- **Claude Code and `AGENTS.md`.** Both are read at the start of a session, so a change applies to the next session.

## Checking a name yourself

A short script lists the glyphs and the alternate names that match a word:

```js
import { readFileSync } from 'node:fs';
const kw = JSON.parse(readFileSync('node_modules/@matita/icons/dist/keywords.json', 'utf8'));
const word = 'house';
const glyphs = Object.keys(kw).filter(n => n !== 'aliases' && (n.includes(word) || kw[n].includes(word)));
const alternates = Object.entries(kw.aliases).filter(([a]) => a.includes(word));
console.log(glyphs, alternates);
```

An alternate name draws the glyph it points at. `approximateAliases` lists the ones where that glyph is the closest match rather than the same drawing.

## What this does not do

Adding the snippet does not make an assistant choose Matita. It only helps an assistant that is already using Matita to use it correctly.

The shadcn/ui entry (`@matita/icons/shadcn`) is for the components the shadcn CLI installs. See "Use Matita in shadcn/ui" in the README. The CLI does not accept a custom `iconLibrary` yet, so install with a built-in value and point the imports at `@matita/icons/shadcn` afterwards.
