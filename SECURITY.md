# Security policy

## Supported versions

Only the latest published version of `@matita/icons` receives fixes.

## Reporting a vulnerability

Please don't open a public issue. Report it privately through GitHub's
[private vulnerability reporting](https://github.com/matita-dev/icons/security/advisories/new),
or email hello@matita.dev.

Include the affected version, how to reproduce it, and what an attacker could do with it.
You should get a reply within a week. Once a fix is published, the advisory is made public and you're credited unless you'd rather not be.

## Scope

The package has no runtime dependencies and makes no network requests. The most likely issues are
markup injection through `toSvg` / `replaceIcons` options (for example `title`, `class` or `attrs`)
and problems in the release pipeline. Releases are published from GitHub Actions with npm provenance,
so check for the provenance badge on npm if a version looks suspicious.
