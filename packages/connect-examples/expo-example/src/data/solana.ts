import { SolanaOffChainMessageVersion } from '@onekeyfe/hd-transport';

import { prepareSolanaOffchainV1Sample } from '../utils/manualSigning/solana';

import type { PlaygroundProps } from '../components/Playground';
import type { SolSignOffchainMessageParams } from '@onekeyfe/hd-core';

const offchainV1: SolSignOffchainMessageParams = {
  path: "m/44'/501'/0'/0'",
  messageHex: '48656c6c6f204f6e654b6579',
  messageVersion: SolanaOffChainMessageVersion.MESSAGE_VERSION_1,
  requiredSigners: ['80'.repeat(32)],
};

const api: PlaygroundProps[] = [
  {
    method: 'solGetAddress',

    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/501'/0'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/501'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/501'/1'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/501'/2'/0'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'solSignTransaction',

    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/501'/0'/0'",
          rawTx:
            '0100010376655f5ed1653f0882195b265edd2149775b197f64a21a283337abb53ae80db2eb08fa3adfd0ff75382ba8cb3b08bb165addc780f6adc2937be8ee36a9f44adc00000000000000000000000000000000000000000000000000000000000000000cd9e955d5c0cdfba7f0ccf4c51000bc5e219adec51f4e0bc98f6d8649bc0cd801020200010c0200000040420f0000000000',
        },
      },
    ],
  },
  {
    method: 'solSignOffchainMessage',
    description:
      'Sign Offchain Message. V1 needs Classic 1S 3.21.0+ or Pro 2; use the generate button to add the current wallet to the required signers.',
    presupposes: [
      {
        title: 'Sign Offchain Message',
        value: {
          path: "m/44'/501'/0'/0'",
          messageHex: '48656c6c6f',
        },
      },
      {
        title: 'V1: Current Wallet And External Signer',
        value: offchainV1,
        prepareSample: call => prepareSolanaOffchainV1Sample(call, offchainV1),
      },
      {
        title: 'V1: Current Wallet Not A Signer (Should Reject)',
        value: offchainV1,
        prepareSample: null,
      },
      {
        title: 'V1: Empty Required Signers (Should Reject)',
        value: { ...offchainV1, requiredSigners: [] },
        prepareSample: null,
      },
    ],
  },
  {
    method: 'solSignMessage',

    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/501'/0'/0'",
          messageHex: '48656c6c6f',
        },
      },
    ],
  },
];

export default api;
