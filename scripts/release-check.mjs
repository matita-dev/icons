#!/usr/bin/env node
/* Pre-tag release check: package version, lockfile, top CHANGELOG heading and README set.png ?v= must agree.
   Usage: node scripts/release-check.mjs [package-dir]   (default: the icons/ folder this script lives in) */
import { readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..'));
const failures = [];
const fail = msg => failures.push(msg);
const read = file => {
  try { return readFileSync(join(root, file), 'utf8'); }
  catch { fail(`${file}: cannot read it`); return null; }
};
const json = file => {
  const text = read(file);
  if (text === null) return null;
  try { return JSON.parse(text); } catch { fail(`${file}: not valid JSON`); return null; }
};

const pkg = json('package.json');
const version = pkg && pkg.version;
if (pkg && !/^\d+\.\d+\.\d+$/.test(version || '')) fail(`package.json: version "${version}" is not x.y.z`);

// Lockfile: top-level "version" and packages[""].version
const lock = json('package-lock.json');
if (lock && version) {
  if (lock.version !== version) fail(`package-lock.json: top-level version is ${lock.version}, package.json says ${version}`);
  const inner = lock.packages && lock.packages[''] && lock.packages[''].version;
  if (inner !== version) fail(`package-lock.json: packages[""].version is ${inner}, package.json says ${version}`);
}

// CHANGELOG: first "## x.y.z" heading must match and carry a real date
const changelog = read('CHANGELOG.md');
if (changelog !== null && version) {
  const heading = changelog.split(/\r?\n/).find(l => /^## /.test(l));
  if (!heading) fail('CHANGELOG.md: no "## x.y.z" heading found');
  else {
    const m = heading.match(/^## (\S+)(?:\s+[—–-]+\s+(.*))?$/);
    const headVersion = m && m[1];
    const date = m && (m[2] || '').trim();
    if (headVersion !== version) fail(`CHANGELOG.md: top heading is "${heading}", expected version ${version}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) fail(`CHANGELOG.md: top heading "${heading}" has no YYYY-MM-DD date (not "unreleased")`);
  }
}

// README: set.png cache-busting query
const readme = read('README.md');
if (readme !== null && version) {
  const found = [...readme.matchAll(/set\.png\?v=([^\s)"'&]+)/g)].map(m => m[1]);
  if (!found.length) fail('README.md: no set.png?v=<version> image URL found');
  else for (const v of found) if (v !== version) fail(`README.md: set.png?v=${v} differs from package version ${version} (bump it after the site deploy, RELEASING.md step 13)`);
}

if (failures.length) {
  console.error(`release-check FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`release-check OK: ${version} (package, lockfile, CHANGELOG, README ?v=)`);
