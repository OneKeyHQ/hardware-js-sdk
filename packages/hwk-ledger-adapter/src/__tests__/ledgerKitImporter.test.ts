import { defaultLedgerKitImporter } from '../connector/LedgerConnectorBase';

/**
 * Every dispatchable chain needs its signer kit in the default importer. Adapter
 * tests mock the connector, so a missing case would only surface when a user signs.
 */
const REQUIRED_KITS = [
  '@ledgerhq/device-management-kit',
  '@ledgerhq/context-module',
  '@ledgerhq/device-signer-kit-ethereum',
  '@ledgerhq/device-signer-kit-bitcoin',
  '@ledgerhq/device-signer-kit-solana',
  '@ledgerhq/device-signer-kit-tron',
  '@ledgerhq/device-signer-kit-zcash',
] as const;

describe('defaultLedgerKitImporter', () => {
  it.each(REQUIRED_KITS)('resolves %s', async pkg => {
    await expect(defaultLedgerKitImporter(pkg)).resolves.toBeDefined();
  });

  it('rejects an unregistered package rather than returning something empty', async () => {
    await expect(defaultLedgerKitImporter('@ledgerhq/device-signer-kit-nope')).rejects.toThrow(
      'Unknown Ledger kit package'
    );
  });
});
