import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Guards the "剃掉 native crypto at bundle time" contract.
//
// Trezor's THP code does `import * as crypto from 'crypto'`. On React Native
// that bare specifier can resolve to a NATIVE module (e.g. quick-crypto),
// whose iOS cipher table may miss `aes-256-gcm` and crash the handshake with
// `Exception in HostFunction: unordered_map::at: key not found`.
//
// tsup rewrites `crypto` -> src/runtime/crypto.ts (pure-JS noble) and inlines
// noble/buffer, so the published dist has ZERO native crypto and behaves
// identically on iOS/Android. These tests fail if that ever regresses.

const packageRoot = resolve(__dirname, '../..');

const FORBIDDEN: Array<[string, RegExp]> = [
  ['import from "crypto"', /from\s*["']crypto["']/],
  ['require("crypto")', /require\(\s*["']crypto["']\s*\)/],
  ['node:crypto', /["']node:crypto["']/],
  ['react-native-quick-crypto', /react-native-quick-crypto/],
  ['react-native-aes-crypto', /react-native-aes-crypto/],
  ['Nitro createHybridObject', /createHybridObject/],
  ['NativeModules', /NativeModules/],
];

describe('no native crypto (source contract)', () => {
  const tsup = readFileSync(resolve(packageRoot, 'tsup.config.ts'), 'utf8');
  const runtimeCrypto = readFileSync(resolve(packageRoot, 'src/runtime/crypto.ts'), 'utf8');

  test('tsup aliases crypto/node:crypto to the pure-JS runtime shim', () => {
    expect(tsup).toContain("crypto: resolve(__dirname, 'src/runtime/crypto.ts')");
    expect(tsup).toContain("'node:crypto': resolve(__dirname, 'src/runtime/crypto.ts')");
    // noble + buffer must be bundled in (not left external -> native)
    expect(tsup).toContain("'@noble/ciphers'");
    expect(tsup).toContain("'@noble/hashes'");
  });

  test('runtime crypto shim is pure-JS noble, never native', () => {
    expect(runtimeCrypto).toContain('@noble/ciphers/aes');
    expect(runtimeCrypto).toContain('@noble/hashes');
    for (const [label, re] of FORBIDDEN) {
      expect([label, re.test(runtimeCrypto)]).toEqual([label, false]);
    }
  });
});

// Artifact-level proof: only runs after `yarn build`. CI builds before test,
// so this enforces on every publish; locally it self-skips if dist is stale.
const distTargets = ['dist/index.mjs', 'dist/index.js'].map(f => resolve(packageRoot, f));
const isBuilt = distTargets.every(f => existsSync(f));

(isBuilt ? describe : describe.skip)('no native crypto (built dist)', () => {
  for (const distPath of distTargets) {
    const label = distPath.split('/').slice(-2).join('/');
    describe(label, () => {
      const code = isBuilt ? readFileSync(distPath, 'utf8') : '';

      test.each(FORBIDDEN)('dist does not contain %s', (_label, re) => {
        expect(re.test(code)).toBe(false);
      });

      test('dist inlines the pure-JS noble AES-256-GCM backend', () => {
        expect(code).toContain('NobleAesGcmCipherShim');
        expect(code).toMatch(/@noble\/ciphers/);
        expect(code).toContain('aes-256-gcm');
      });
    });
  }
});
