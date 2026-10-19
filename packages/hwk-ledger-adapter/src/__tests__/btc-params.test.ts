import { HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';

import { btcGetAddress, btcGetPublicKey } from '../connector/chains/btc';

import type { ConnectorContext } from '../connector/chains/types';

// Refusals happen before any device access, so an empty context is enough.
const ctx = {} as ConnectorContext;

describe('Ledger BTC request checks', () => {
  it.each([
    [
      'btcGetAddress',
      'a full address path',
      btcGetAddress,
      { path: "m/84'/0'/0'/0/0" },
      HardwareErrorCode.InvalidParams,
    ],
    [
      'btcGetAddress',
      'a non-mainnet coin',
      btcGetAddress,
      { path: "m/84'/0'/0'", coin: 'Litecoin' },
      HardwareErrorCode.ChainNotSupported,
    ],
    [
      'btcGetPublicKey',
      'a non-mainnet coin',
      btcGetPublicKey,
      { path: "m/84'/1'/0'", coin: 'Testnet' },
      HardwareErrorCode.ChainNotSupported,
    ],
  ] as const)('%s refuses %s', async (_method, _name, call, params, code) => {
    await expect(call(ctx, 'session-1', params)).rejects.toMatchObject({ code });
  });
});
