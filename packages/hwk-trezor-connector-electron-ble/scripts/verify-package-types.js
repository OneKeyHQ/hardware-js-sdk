const fs = require('fs');
const path = require('path');

const packageRoot = path.resolve(__dirname, '..');
const packageJson = require(path.join(packageRoot, 'package.json'));

const declarationPaths = [
  packageJson.types,
  packageJson.exports?.['.']?.import?.types,
  packageJson.exports?.['.']?.require?.types,
  packageJson.exports?.['./main']?.import?.types,
  packageJson.exports?.['./main']?.require?.types,
].filter(Boolean);

const missingDeclarations = declarationPaths.filter(
  declarationPath => !fs.existsSync(path.join(packageRoot, declarationPath))
);

if (missingDeclarations.length > 0) {
  throw new Error(`Missing package declaration files: ${missingDeclarations.join(', ')}`);
}
