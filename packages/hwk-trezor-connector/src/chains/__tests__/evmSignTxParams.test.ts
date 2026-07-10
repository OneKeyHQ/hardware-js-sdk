import { HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';

import { evmSignTransaction } from '../evm';

/**
 * Trezor consumes the structured-fields shape of the shared EVM sign-tx
 * contract. A Ledger-shape call (`serializedTx`) must be rejected loudly:
 * silently ignoring it would rebuild the tx from empty defaults and sign a
 * DIFFERENT transaction than the caller provided (PR #824 review finding).
 * The ctx stub guarantees rejection happens before any device call.
 */
describe('evmSignTransaction Trezor params contract', () => {
  const path = "m/44'/60'/0'/0/0";

  it('rejects serializedTx-only params with InvalidParams before touching the device', async () => {
    await expect(
      evmSignTransaction({} as never, {
        path,
        chainId: 1,
        serializedTx: '0x02e50180843b9aca00825208940000000000000000000000000000000000000000808080',
      })
    ).rejects.toMatchObject({ code: HardwareErrorCode.InvalidParams });
  });

  it('rejects mixed serializedTx + structured fields with InvalidParams', async () => {
    await expect(
      evmSignTransaction({} as never, {
        path,
        chainId: 1,
        nonce: '0x1',
        gasPrice: '0x3b9aca00',
        gasLimit: '0x5208',
        value: '0x0',
        serializedTx: '0xdeadbeef',
      })
    ).rejects.toMatchObject({ code: HardwareErrorCode.InvalidParams });
  });
});
