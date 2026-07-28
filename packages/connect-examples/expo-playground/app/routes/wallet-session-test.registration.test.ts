import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from '@jest/globals';

const appRoot = resolve(process.cwd(), 'packages/connect-examples/expo-playground/app');

describe('wallet session test route registration', () => {
  test('registers the WebUSB wallet session page and sidebar entry', () => {
    const entry = readFileSync(resolve(appRoot, 'entry.client.tsx'), 'utf8');
    const sidebar = readFileSync(resolve(appRoot, 'components/sidebar.tsx'), 'utf8');

    expect(entry).toContain("import WalletSessionTestPage from './routes/wallet-session-test'");
    expect(entry).toContain("path: 'wallet-session-test'");
    expect(sidebar).toContain("url: '/wallet-session-test'");
  });
});
