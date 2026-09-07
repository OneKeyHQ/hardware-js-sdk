#!/usr/bin/env node
/**
 * Merge published GitHub releases into data/hardware-sdk-releases.json.
 *
 * Curated entries keep their hand-written highlights and only refresh the date.
 * New stable (non-draft, non-prerelease) tags are appended from the release body.
 *
 *   node scripts/sync-changelog.mjs
 */

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = resolve(root, 'data/hardware-sdk-releases.json');

const classify = version => {
  const parts = version.replace(/^v/, '').split(/[.-]/).map(part => Number(part) || 0);
  if (parts[1] === 0 && parts[2] === 0) return 'major';
  if (parts[2] === 0) return 'minor';
  return 'patch';
};

const semverTuple = version =>
  version
    .replace(/^v/, '')
    .split(/[.-]/)
    .map(part => Number.parseInt(part, 10) || 0);

const isNewer = (left, right) => {
  const a = semverTuple(left);
  const b = semverTuple(right);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
};

const extractBullets = body =>
  (body || '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('* ') || line.startsWith('- '))
    .map(line =>
      line
        .replace(/^[-*]\s+/, '')
        .replace(/\s+by @\S+ in https?:\/\/\S+$/u, '')
        .replace(/\s+https?:\/\/github.com\/\S+$/u, '')
        .trim()
    )
    .filter(line => line && !/^Full Changelog/i.test(line) && !/^What's Changed/i.test(line))
    .slice(0, 8);

const loadExisting = () => JSON.parse(readFileSync(dataPath, 'utf8'));

const fetchReleases = () => {
  const raw = execFileSync(
    'gh',
    [
      'api',
      'repos/OneKeyHQ/hardware-js-sdk/releases?per_page=40',
      '--jq',
      '[.[] | select(.draft==false and .prerelease==false) | {tag:.tag_name, date:.published_at, body:.body}]',
    ],
    { encoding: 'utf8' }
  );
  return JSON.parse(raw);
};

const existing = loadExisting();
const byVersion = new Map(existing.hardware.map(entry => [entry.version, entry]));
const newestCurated = existing.hardware
  .filter(entry => entry.curated)
  .map(entry => entry.version)
  .sort((a, b) => (isNewer(a, b) ? -1 : 1))[0];

for (const release of fetchReleases()) {
  const version = release.tag.startsWith('v') ? release.tag : `v${release.tag}`;
  const date = (release.date || '').slice(0, 10);
  const current = byVersion.get(version);
  if (current?.curated) {
    current.date = date || current.date;
    continue;
  }
  if (current) {
    current.date = date || current.date;
    continue;
  }
  // Do not backfill noisy historical tags; only append stables newer than curated.
  if (newestCurated && !isNewer(version, newestCurated)) continue;
  const bullets = extractBullets(release.body);
  if (!bullets.length) continue;
  byVersion.set(version, {
    version,
    date,
    type: classify(version),
    curated: false,
    changes: { en: bullets, zh: bullets },
  });
}

const hardware = [...byVersion.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

const next = {
  source: existing.source,
  updatedAt: new Date().toISOString().slice(0, 10),
  hardware,
};

writeFileSync(dataPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Wrote ${hardware.length} Hardware SDK releases to ${dataPath}`);
