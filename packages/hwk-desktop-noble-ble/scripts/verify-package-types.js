const fs = require('fs');
const path = require('path');

const packageRoot = path.resolve(__dirname, '..');
const packageJson = require(path.join(packageRoot, 'package.json'));

// Walk every export rather than naming subpaths: a hardcoded list silently
// checks nothing once a subpath is renamed or added, which is how this file
// ended up verifying a `./main` entry that no longer exists.
function collectDeclarations(node, out) {
  if (typeof node === 'string') return;
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (key === 'types' && typeof value === 'string') out.push(value);
    else collectDeclarations(value, out);
  }
}

const declarationPaths = [];
if (packageJson.types) declarationPaths.push(packageJson.types);
collectDeclarations(packageJson.exports, declarationPaths);

if (declarationPaths.length === 0) {
  throw new Error('No type declarations declared in package.json — nothing was verified');
}

const missingDeclarations = [...new Set(declarationPaths)].filter(
  declarationPath => !fs.existsSync(path.join(packageRoot, declarationPath))
);

if (missingDeclarations.length > 0) {
  throw new Error(`Missing package declaration files: ${missingDeclarations.join(', ')}`);
}
