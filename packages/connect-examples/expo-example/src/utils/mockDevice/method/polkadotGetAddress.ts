import { PolkadotGetAddressParams } from '@onekeyfe/hd-core';

import { hdLedger, encodeAddress } from '@polkadot/util-crypto';

export default function polkadotGetAddress(
  connectId: string,
  deviceId: string,
  params: PolkadotGetAddressParams & {
    mnemonic: string;
    passphrase?: string;
  }
) {
  const { path, network, prefix, mnemonic, passphrase } = params;

  // @ts-expect-error
  const secret = hdLedger(mnemonic, path, passphrase);
  const address = encodeAddress(secret.publicKey, prefix);

  return {
    success: true,
    payload: {
      address,
      path,
    },
  };
}
