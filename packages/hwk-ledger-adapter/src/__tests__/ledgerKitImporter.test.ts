import { defaultLedgerKitImporter } from '../connector/LedgerConnectorBase';

/**
 * Every chain the adapter can dispatch needs its signer kit registered in the
 * default importer. A missing case only surfaces at the moment a user signs,
 * because the adapter tests mock the connector and never reach the importer,
 * which is exactly how the Tron kit shipped unregistered.
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
