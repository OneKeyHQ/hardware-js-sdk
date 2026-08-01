/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const packagesDir = path.resolve(__dirname, '../packages');

function main() {
  const versions = {};
  let firstVersion = null;
  let hasError = false;

  const packageDirs = fs.readdirSync(packagesDir).filter(file => {
    const filePath = path.join(packagesDir, file);
    return fs.statSync(filePath).isDirectory();
  });

  for (const pkg of packageDirs) {
    const pkgJsonPath = path.join(packagesDir, pkg, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        const { name, version } = pkgJson;

        if (name && version) {
          versions[name] = version;
          if (!firstVersion) {
            firstVersion = version;
          }

          if (version !== firstVersion) {
            hasError = true;
          }
        }
      } catch (e) {
        console.error(`Error parsing ${pkgJsonPath}:`, e);
      }
    }
  }

  if (hasError) {
    console.error('❌ Error: Found inconsistent package versions.');
    console.log('   Please ensure all packages have the same version.');
    console.log('\n--- Version Report ---');
    for (const [name, version] of Object.entries(versions)) {
      const marker = version === firstVersion ? '✅' : '❌';
      console.log(`  ${marker} ${name}: ${version}`);
    }
    console.log('----------------------\n');
    process.exit(1);
  } else {
    console.log(`✅ All ${Object.keys(versions).length} packages are at version: ${firstVersion}`);
  }
}

main();
