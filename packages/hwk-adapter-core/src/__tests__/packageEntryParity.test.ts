import { existsSync, readFileSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import { join, resolve } from 'path';

/**
 * Guard for the 1.1.29-alpha.8 regression class: a tsup build entry and its
 * package.json `exports` mapping live in two different files and MUST stay in
 * sync.
 *
 * - entry without an exports mapping → dead entry; consumers cannot resolve
 *   the subpath (exactly how webusb `./constants` shipped broken in alpha.8).
 * - exports mapping without an entry → resolves to dist files tsup never
 *   builds; consumers crash at install/import time.
 *
 * Generated dist files are not read. Static prebuild exports must resolve to
 * real files in a directory included in the package's publication manifest.
 */

const repoRoot = resolve(__dirname, '..', '..', '..', '..');
const packagesRoot = join(repoRoot, 'packages');

type PackageExports = Record<
  string,
  | {
      import?: { types?: string; default?: string };
      require?: { types?: string; default?: string };
    }
  | string
>;

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? listFiles(join(directory, entry.name)).map(file => join(entry.name, file))
      : [entry.name]
  );
}

function parseTsupEntryKeys(configText: string): string[] | null {
  // Strip comments BEFORE matching: a `}` inside a comment (e.g. adapter-core
  // mentions `import type {...}`) would otherwise truncate the entry block.
  const stripped = configText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  // Literal object form: entry: { index: 'src/index.ts', 'ui-events': '...' }
  const objectMatch = stripped.match(/entry:\s*{([\s\S]*?)}/);
  if (objectMatch) {
    return [...objectMatch[1].matchAll(/(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:/g)].map(
      m => m[1] ?? m[2] ?? m[3]
    );
  }
  // Literal array form: entry: ['src/index.ts']
  const arrayMatch = stripped.match(/entry:\s*\[([\s\S]*?)\]/);
  if (arrayMatch) {
    return [...arrayMatch[1].matchAll(/'([^']+)'/g)].map(m => {
      const base = m[1].split('/').pop() ?? m[1];
      return base.replace(/\.tsx?$/, '');
    });
  }
  return null;
}

function entryToExportKey(entryKey: string): string {
  return entryKey === 'index' ? '.' : `./${entryKey}`;
}

describe('tsup entry ↔ package.json exports parity', () => {
  const tsupPackages = readdirSync(packagesRoot).filter(name =>
    existsSync(join(packagesRoot, name, 'tsup.config.ts'))
  );

  it('scans a plausible number of tsup packages', () => {
    // Path-breakage tripwire: a silent empty scan must not pass as green.
    expect(tsupPackages.length).toBeGreaterThanOrEqual(10);
  });

  it.each(tsupPackages)('%s: every entry is exported and every export is built', pkg => {
    const configText = readFileSync(join(packagesRoot, pkg, 'tsup.config.ts'), 'utf8');
    const entryKeys = parseTsupEntryKeys(configText);
    // Unparseable config = the guard is blind; update parseTsupEntryKeys.
    expect({ pkg, entryKeys }).toEqual({ pkg, entryKeys: expect.any(Array) });

    const packageJson = JSON.parse(
      readFileSync(join(packagesRoot, pkg, 'package.json'), 'utf8')
    ) as { name: string; exports?: PackageExports; files?: string[] };
    const exportsMap = packageJson.exports;
    expect({ pkg, hasExports: Boolean(exportsMap) }).toEqual({ pkg, hasExports: true });

    const expectedKeys = (entryKeys ?? []).map(entryToExportKey).sort();
    const assetKeys = Object.entries(exportsMap ?? {})
      .filter(([key, target]) => key.startsWith('./prebuilds/') && typeof target === 'string')
      .map(([key]) => key);
    const actualKeys = Object.keys(exportsMap ?? {})
      .filter(key => !assetKeys.includes(key))
      .sort();
    expect({ pkg, exportKeys: actualKeys }).toEqual({ pkg, exportKeys: expectedKeys });

    if (assetKeys.length) {
      expect(packageJson.files).toContain('prebuilds');
      for (const key of assetKeys) expect(exportsMap?.[key]).toBe(key);
      const packageRoot = join(packagesRoot, pkg);
      const assets = listFiles(join(packageRoot, 'prebuilds'));
      expect(assets.length).toBeGreaterThan(0);
      const requireFromPackage = createRequire(join(packageRoot, 'package.json'));
      for (const asset of assets) {
        expect(
          requireFromPackage.resolve(`${packageJson.name}/prebuilds/${asset.replace(/\\/g, '/')}`)
        ).toBe(join(packageRoot, 'prebuilds', asset));
      }
    }

    for (const entryKey of entryKeys ?? []) {
      const mapping = exportsMap?.[entryToExportKey(entryKey)];
      // toMatchObject: import/require must point at the tsup outputs for this
      // entry; extra conditions (e.g. schema-utils' `react-native`) are fine.
      expect({ pkg, entryKey, mapping }).toMatchObject({
        pkg,
        entryKey,
        mapping: {
          import: { types: `./dist/${entryKey}.d.mts`, default: `./dist/${entryKey}.mjs` },
          require: { types: `./dist/${entryKey}.d.ts`, default: `./dist/${entryKey}.js` },
        },
      });
    }
  });
});
