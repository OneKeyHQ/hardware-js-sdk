import type { UnifiedMethodConfig, ChainCategory } from '../types';
const api: UnifiedMethodConfig[] = [
  {
    method: 'btcGetAddress',
    description: 'Get a Bitcoin address for your account.',
    presets: [
      {
        title: 'Get Bitcoin Address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/0'/0'/0/0",
          },
          {
            name: 'coin',
            type: 'string',
            required: true,
            label: 'Coin',
            description: 'Cryptocurrency symbol',
            value: 'btc',
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            required: false,
            label: 'Show on Device',
            description: 'Display address on OneKey device for verification',
            value: false,
          },
        ],
      },
      {
        title: 'Batch Get Address',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Configuration',
            description: 'JSON array of address configurations',
            value: JSON.stringify(
              Array.from({ length: 10 }, (_, i) => ({
                path: `m/44'/0'/0'/0/${i}`,
                coin: 'btc',
                showOnOneKey: false,
              })),
              null,
              2
            ),
          },
        ],
      },
      {
        title: 'Batch Get Address segwit_p2sh',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Configuration',
            description: 'JSON array of segwit P2SH address configurations',
            value: JSON.stringify(
              Array.from({ length: 10 }, (_, i) => ({
                path: `m/49'/0'/0'/0/${i}`,
                coin: 'btc',
                showOnOneKey: false,
              })),
              null,
              2
            ),
          },
        ],
      },
      {
        title: 'Batch Get Address segwit_native',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Configuration',
            description: 'JSON array of native segwit address configurations',
            value: JSON.stringify(
              Array.from({ length: 10 }, (_, i) => ({
                path: `m/84'/0'/0'/0/${i}`,
                coin: 'btc',
                showOnOneKey: false,
              })),
              null,
              2
            ),
          },
        ],
      },
      {
        title: 'Batch Get Address taproot',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Configuration',
            description: 'JSON array of taproot address configurations',
            value: JSON.stringify(
              Array.from({ length: 10 }, (_, i) => ({
                path: `m/86'/0'/0'/0/${i}`,
                coin: 'btc',
                showOnOneKey: false,
              })),
              null,
              2
            ),
          },
        ],
      },
    ],
  },
  {
    method: 'btcGetPublicKey',
    description: 'Get a Bitcoin public key for your account.',
    presets: [
      {
        title: 'Get Bitcoin Public Key',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/0'/0'/0/0",
          },
          {
            name: 'coin',
            type: 'string',
            required: true,
            label: 'Coin',
            description: 'Cryptocurrency symbol',
            value: 'btc',
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            required: false,
            label: 'Show on Device',
            description: 'Display public key on OneKey device for verification',
            value: false,
          },
        ],
      },
      {
        title: 'Batch Get Public Key',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Configuration',
            description: 'JSON array of public key configurations',
            value: JSON.stringify(
              Array.from({ length: 10 }, (_, i) => ({
                path: `m/44'/0'/0'/0/${i}`,
                coin: 'btc',
                showOnOneKey: false,
              })),
              null,
              2
            ),
          },
        ],
      },
      {
        title: 'Batch Get Public Key segwit_p2sh',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Configuration',
            description: 'JSON array of segwit P2SH public key configurations',
            value: JSON.stringify(
              Array.from({ length: 10 }, (_, i) => ({
                path: `m/49'/0'/0'/0/${i}`,
                coin: 'btc',
                showOnOneKey: false,
              })),
              null,
              2
            ),
          },
        ],
      },
      {
        title: 'Batch Get Public Key segwit_native',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Configuration',
            description: 'JSON array of native segwit public key configurations',
            value: JSON.stringify(
              Array.from({ length: 10 }, (_, i) => ({
                path: `m/84'/0'/0'/0/${i}`,
                coin: 'btc',
                showOnOneKey: false,
              })),
              null,
              2
            ),
          },
        ],
      },
      {
        title: 'Batch Get Public Key taproot',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Configuration',
            description: 'JSON array of taproot public key configurations',
            value: JSON.stringify(
              Array.from({ length: 10 }, (_, i) => ({
                path: `m/86'/0'/0'/0/${i}`,
                coin: 'btc',
                showOnOneKey: false,
              })),
              null,
              2
            ),
          },
        ],
      },
    ],
  },
  {
    method: 'btcSignMessage',
    description: 'Sign a message with your Bitcoin private key.',
    presets: [
      {
        title: 'Sign Message (Native Segwit)',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/84'/0'/0'/0/0",
          },
          {
            name: 'coin',
            type: 'string',
            required: true,
            label: 'Coin',
            description: 'Cryptocurrency symbol',
            value: 'btc',
          },
          {
            name: 'messageHex',
            type: 'string',
            required: true,
            label: 'Message (Hex)',
            description: 'Message to sign in hexadecimal format',
            value: '48656c6c6f20576f726c64',
          },
          {
            name: 'noScriptType',
            type: 'boolean',
            required: false,
            label: 'No Script Type',
            description: 'Skip script type validation',
            value: false,
          },
        ],
      },
      {
        title: 'Sign Message (Nested Segwit)',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/49'/0'/0'/0/0",
          },
          {
            name: 'coin',
            type: 'string',
            required: true,
            label: 'Coin',
            description: 'Cryptocurrency symbol',
            value: 'btc',
          },
          {
            name: 'messageHex',
            type: 'string',
            required: true,
            label: 'Message (Hex)',
            description: 'Message to sign in hexadecimal format',
            value: '48656c6c6f20576f726c64',
          },
          {
            name: 'noScriptType',
            type: 'boolean',
            required: false,
            label: 'No Script Type',
            description: 'Skip script type validation',
            value: false,
          },
        ],
      },
      {
        title: 'Sign Message (Legacy)',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/0'/0'/0/0",
          },
          {
            name: 'coin',
            type: 'string',
            required: true,
            label: 'Coin',
            description: 'Cryptocurrency symbol',
            value: 'btc',
          },
          {
            name: 'messageHex',
            type: 'string',
            required: true,
            label: 'Message (Hex)',
            description: 'Message to sign in hexadecimal format',
            value: '48656c6c6f20576f726c64',
          },
          {
            name: 'noScriptType',
            type: 'boolean',
            required: false,
            label: 'No Script Type',
            description: 'Skip script type validation',
            value: false,
          },
        ],
      },
      {
        title: 'Sign Message (ecdsa | Taproot)',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/86'/0'/0'/0/0",
          },
          {
            name: 'coin',
            type: 'string',
            required: true,
            label: 'Coin',
            description: 'Cryptocurrency symbol',
            value: 'btc',
          },
          {
            name: 'messageHex',
            type: 'string',
            required: true,
            label: 'Message (Hex)',
            description: 'Message to sign in hexadecimal format',
            value: '48656c6c6f20576f726c64',
          },
          {
            name: 'dAppSignType',
            type: 'string',
            required: false,
            label: 'DApp Sign Type',
            description: 'Signature type for DApp integration',
            value: 'ecdsa',
          },
        ],
      },
      {
        title: 'Sign Message (bip322-simple | Taproot)',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/86'/0'/0'/0/0",
          },
          {
            name: 'coin',
            type: 'string',
            required: true,
            label: 'Coin',
            description: 'Cryptocurrency symbol',
            value: 'btc',
          },
          {
            name: 'messageHex',
            type: 'string',
            required: true,
            label: 'Message (Hex)',
            description: 'Message to sign in hexadecimal format',
            value: '48656c6c6f20576f726c64',
          },
          {
            name: 'dAppSignType',
            type: 'string',
            required: false,
            label: 'DApp Sign Type',
            description: 'Signature type for DApp integration',
            value: 'bip322-simple',
          },
        ],
      },
    ],
  },
  {
    method: 'btcSignPsbt',
    description: 'Sign psbt.',
    presets: [
      {
        title: 'Sign psbt on testnet',
        parameters: [
          {
            name: 'psbt',
            type: 'textarea',
            required: true,
            label: 'PSBT',
            description: 'Partially Signed Bitcoin Transaction',
            value:
              '70736274ff0100db020000000141f56bec64ac3ed0a7900b61950525fcf9324f92771cb97f7f3a2f020b7a76000400000000fdffffff03307500000000000022512018ef253e59d4cb24a60607a6fc7c4cac95af3edad70813a198eeb5405c1c29b60000000000000000496a476262643400f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b203d5a0bb72d71993e435d6c5a70e2aa4db500a62cfaae33c56050deefee64ec00096bdae000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148973c2e03000001012bf824010000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f14897011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b200000000',
          },
          {
            name: 'coin',
            type: 'string',
            required: true,
            label: 'Coin',
            description: 'Cryptocurrency symbol',
            value: 'TEST',
          },
        ],
      },
      {
        title: 'Mock Babylon Staking（Seed3 专用）',
        parameters: [
          {
            name: 'psbt',
            type: 'textarea',
            required: true,
            label: 'PSBT',
            description: 'Partially Signed Bitcoin Transaction',
            value:
              '70736274ff0100fd7f0102000000059b7e2b54e4d24e4c003f76c87e08efe7b05a12a1eeccee492a035322ec4e03cf0000000000fdffffffa078bbb428d8e2aa30c8c6e624f95a7d5eac2a989e6955a86c284e1cac1218b80000000000fdffffffbecc3c860dd99b902be9c1dfbc4f2c0e431668880a1216a619a9503f8cffabf20000000000fdffffff5f1787d5d4edce60e926b13ec8e3c2894d757bcb0145ace5539d5fbdcd58c9900200000000fdffffff85f5c8b72fbe754a6435ce117ef4ef66ffd36bc7f80185f5764044d3e9cac4bf0200000000fdffffff03888a0100000000002251206449c9fb89c3c2692205041fe231934a250ff43a8c1f319893e56f6a6bc89fdc0000000000000000496a476262643400f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21c61411d36685bb4b293ab968ad430d591a1a88c3d191139cbc30a914b3423c70096751e000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148970a4a03000001012b9174000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148972116f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e5600008001000080000000800000000000000000011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b20001012bd968000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148972116f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e5600008001000080000000800000000000000000011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b20001012bd968000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148972116f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e5600008001000080000000800000000000000000011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b2000000010520f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b22107f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e560000800100008000000080000000000000000000',
          },
          {
            name: 'coin',
            type: 'string',
            required: true,
            label: 'Coin',
            description: 'Cryptocurrency symbol',
            value: 'TEST',
          },
        ],
      },
    ],
  },
  {
    method: 'btcSignTransaction',
    description: 'Sign a Bitcoin transaction with your Bitcoin private key.',
    presets: [
      {
        title: 'Sign Transaction',
        parameters: [
          {
            name: 'coin',
            type: 'string',
            required: true,
            label: 'Coin',
            description: 'Cryptocurrency symbol',
            value: 'btc',
          },
          {
            name: 'inputs',
            type: 'textarea',
            required: true,
            label: 'Inputs',
            description: 'Transaction inputs configuration',
            value: JSON.stringify(
              [
                {
                  prev_index: 0,
                  prev_hash: 'b3eb628dd06261805ef2232a704a727c9eb1787bccbc62cf343b05bfd7b882c7',
                  amount: '150000',
                  address_n: [2147483697, 2147483648, 2147483648, 0, 0],
                  script_type: 'SPENDP2SHWITNESS',
                },
              ],
              null,
              2
            ),
          },
          {
            name: 'outputs',
            type: 'textarea',
            required: true,
            label: 'Outputs',
            description: 'Transaction outputs configuration',
            value: JSON.stringify(
              [
                {
                  script_type: 'PAYTOADDRESS',
                  address: '3F6g14r5Z37at7HTvMN5Mmf8QJxLJp2p3U',
                  amount: '10000',
                },
                {
                  script_type: 'PAYTOP2SHWITNESS',
                  address_n: [2147483697, 2147483648, 2147483648, 0, 0],
                  amount: '128474',
                },
              ],
              null,
              2
            ),
          },
          {
            name: 'refTxs',
            type: 'textarea',
            required: true,
            label: 'Reference Transactions',
            description: 'Reference transaction data',
            value: JSON.stringify(
              [
                {
                  hash: 'b3eb628dd06261805ef2232a704a727c9eb1787bccbc62cf343b05bfd7b882c7',
                  version: 2,
                  inputs: [
                    {
                      prev_hash: '141f43a36d8421b0d30f63b2d98461e5b6172b0be606b0ac0a917fe1aaa08ba9',
                      prev_index: 1,
                      script_sig: '',
                      sequence: 4294967295,
                    },
                  ],
                  bin_outputs: [
                    {
                      amount: 150000,
                      script_pubkey: 'a9144204752392de72c50f0591313f98937c67325a3d87',
                    },
                    {
                      amount: 116300,
                      script_pubkey:
                        '512003b963b69e1b26e56546d9a7a47ef0fbee91573a1c85be8b98ea79b9b83b843c',
                    },
                  ],
                  lock_time: 0,
                },
              ],
              null,
              2
            ),
          },
        ],
      },
    ],
  },
  {
    method: 'btcVerifyMessage',
    description: 'Verify a message signed with a Bitcoin private key.',
    presets: [
      {
        title: 'Verify Message',
        parameters: [
          {
            name: 'address',
            type: 'string',
            required: true,
            label: 'Address',
            description: 'Bitcoin address to verify',
            value: '18879Y36oByqgVHCChsES2rFypprRcFWix',
          },
          {
            name: 'coin',
            type: 'string',
            required: true,
            label: 'Coin',
            description: 'Cryptocurrency symbol',
            value: 'btc',
          },
          {
            name: 'messageHex',
            type: 'string',
            required: true,
            label: 'Message (Hex)',
            description: 'Message to verify in hexadecimal format',
            value: '0x6578616d706c65206d657373616765',
          },
          {
            name: 'signature',
            type: 'string',
            required: true,
            label: 'Signature',
            description: 'Message signature to verify',
            value:
              '0x1fdef26d2134034ec4c00874597be03591a2b16bc3e2cc86f06e4c4dc4df1f00a22eea8efca6446f145e12c5a8064b4f46be57e7ddb42759550eefe4f5d3c7c487',
          },
        ],
      },
    ],
  },
];
// 导出链配置对象
export const bitcoin: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'bitcoin',
  api,
};
