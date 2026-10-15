// Loads every ESM entry under Node's strict ESM resolver: a deep or extensionless import of a
// CommonJS dependency builds fine but fails here, and silently in some bundlers.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const entries = Object.values(manifest.exports).map(entry => entry.import.default);
for (const entry of entries) {
  await import(pathToFileURL(join(root, entry)).href);
}
