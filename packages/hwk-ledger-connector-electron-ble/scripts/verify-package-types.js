/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const manifest = require('../package.json');

const packageRoot = path.resolve(__dirname, '..');
const declarations = [
  manifest.types,
  ...Object.values(manifest.exports).flatMap(entry => [entry.import.types, entry.require.types]),
];
const missing = declarations.filter(file => !fs.existsSync(path.join(packageRoot, file)));
if (missing.length) throw new Error(`Missing package declarations: ${missing.join(', ')}`);
