import { HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';

import { btcGetAddress, btcGetPublicKey } from '../connector/chains/btc';

import type { ConnectorContext } from '../connector/chains/types';

// Refusals happen before any device access, so an empty context is enough.
const ctx = {} as ConnectorContext;

describe('Ledger BTC request checks', () => {
  it.each([
    ['a full address path', { path: "m/84'/0'/0'/0/0" }, HardwareErrorCode.InvalidParams],
    [
      'a non-mainnet coin',
      { path: "m/84'/0'/0'", coin: 'Litecoin' },
      HardwareErrorCode.ChainNotSupported,
    ],
  ])('btcGetAddress refuses %s', async (_name, params, code) => {
    await expect(btcGetAddress(ctx, 'session-1', params)).rejects.toMatchObject({ code });
  });

  it('btcGetPublicKey refuses a non-mainnet coin', async () => {
    await expect(
      btcGetPublicKey(ctx, 'session-1', { path: "m/84'/1'/0'", coin: 'Testnet' })
    ).rejects.toMatchObject({ code: HardwareErrorCode.ChainNotSupported });
  });
});
