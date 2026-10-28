# Releasing

How a version of `@matita/icons` goes out. A release is three small PRs and one tag, in this order:

1. `release-x.y.z`: the version bump and CHANGELOG date (the package).
2. `site-x.y.z`: pin the site to the published package.
3. `readme-set-image`: bump the README image URL (only after the site is deployed).

Only maintainers with write access do the steps marked **manual**. `main` requires a PR and the `test` check.
On Windows PowerShell 5.1 run one command per line (no `&&`).

## Pre-release checklist

Run in `icons/` on a branch from an up-to-date `main`:

- [ ] `npm run build` is clean (lints every glyph, writes `dist/`, including `dist/svg-exact/`).
- [ ] `npm test` passes.
- [ ] `package.json` and `package-lock.json` have the same new version (two fields in the lock).
- [ ] `CHANGELOG.md` has `## x.y.z — YYYY-MM-DD` with the real release date. Not "unreleased": the site changelog
      skips undated entries. Keep the format (`- **Label:** a, b, c` for new glyphs, names spelled exactly).
- [ ] The count in the CHANGELOG summary ("200 → 260") and in `README.md` matches the real number of glyphs.
- [ ] New glyphs: inside the 1–23 grid, checked at 96 px and 24 px, listed in the CHANGELOG.
- [ ] `npm --prefix site run build:local` and `npm --prefix site run build` both succeed, then `node seo-check.mjs`
      in `site/` reports 0 failures.
- [ ] No other icon set or library is named anywhere (code, docs, comments, package.json, commit messages).

## Steps

| # | Step | Who | Command / action |
|---|---|---|---|
| 1 | Branch `release-x.y.z` from up-to-date `main` | manual | `git checkout main`, `git pull`, `git checkout -b release-x.y.z` |
| 2 | Bump the version without a commit or tag | manual | `npm version minor --no-git-tag-version` (`patch` for fixes; minor when glyphs are added). Never plain `npm version`: it commits and tags. |
| 3 | Set the CHANGELOG date, run the checklist above | manual | edit `CHANGELOG.md`, `npm run build`, `npm test` |
| 4 | Commit `package.json`, `package-lock.json`, `CHANGELOG.md`, push, open PR | manual | `git push -u origin release-x.y.z` |
| 5 | CI: `test` (build + tests) and `site` (site build) | automated | wait for green, then merge the PR |
| 6 | Pull the merge | manual | `git checkout main`, `git pull`, then `git log --oneline -1` must show the PR's merge commit |
| 7 | Tag **only now** | manual | `git tag vx.y.z`, `git push origin vx.y.z` |
| 8 | Release workflow: checks the tag equals `package.json`, builds, tests, `npm publish --provenance` (trusted publishing, no token) | automated | watch Actions, Release |
| 9 | Confirm it is live | manual | `npm view @matita/icons@x.y.z version --prefer-online`. The registry can lag a few minutes, poll instead of trusting the first answer. |
| 10 | Site PR `site-x.y.z`: pin the exact version | manual | in `site/`: `npm install --save-exact @matita/icons@x.y.z`; commit `site/package.json` and `site/package-lock.json` (patch releases too: the footer shows the version) |
| 11 | In the same PR: raise the "NNN+" count literals (`site/build.mjs`, `site/layout.mjs`, `site/share.mjs`), re-measure the bundle sizes in `site/how.mjs`, update `site/roadmap.mjs` targets | manual | then `npm run build` and `node seo-check.mjs` in `site/` |
| 12 | Merge the site PR; Cloudflare builds and deploys `matita.dev` | manual, then automated | check `https://matita.dev/` shows the new version and count |
| 13 | **README image PR** `readme-set-image`: change `set.png?v=<old>` to `?v=x.y.z` in `README.md` | manual | one line; merge it |
| 14 | Outside the repo: launch assets, Figma file, Iconify, announcement posts | manual | `node launch/icons/assets.mjs` (maintainers' working folder) |

## Commonly missed

- **README set image version (step 13).** `README.md` shows `https://matita.dev/set.png?v=<version>`. GitHub's image
  proxy caches the image for up to a day, so without the new `?v=` the repo page keeps showing the old set. It can
  only be done after the site deploy (step 12): if the README changes first, the proxy caches the old picture under
  the new URL. This is why 0.4.0 needed a third PR (#18 site, then `readme-set-image`) after the release.
- **Tagging before the merge (step 6 to 7).** The tag then points at the old `main`; the workflow's version guard
  stops it and nothing is published. Fix: `git push origin :refs/tags/vx.y.z`, `git tag -d vx.y.z`, `git pull`,
  tag again, push.
- **CHANGELOG still "unreleased".** The site changelog and roadmap "Shipped" list only treat dated entries as released.
- **Site pin (step 10).** The site is built from the published package. It stays on the old version until pinned.
- **Count literals.** "NNN+" copy and the og.png text are literals; raise them only after the site is on the new
  package.
- **Lock file.** `npm version` updates both `package.json` and `package-lock.json`; commit both.

## Rolling back

A published version cannot be replaced. Fix forward with a patch release. `npm deprecate @matita/icons@x.y.z "message"`
marks a bad version if needed (manual, owner only).
