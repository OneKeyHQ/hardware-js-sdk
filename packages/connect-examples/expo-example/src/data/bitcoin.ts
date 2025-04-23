import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'btcGetAddress',
    description: 'Get a Bitcoin address for your account.',
    presupposes: [
      {
        title: 'Get Bitcoin Address',
        value: {
          path: "m/44'/0'/0'/0/0",
          coin: 'btc',
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/0'/0'/0/0",
              coin: 'btc',
              showOnOneKey: false,
            },
            {
              path: "m/44'/0'/0'/0/1",
              coin: 'btc',
              showOnOneKey: false,
            },
            {
              path: "m/44'/0'/0'/0/2",
              coin: 'btc',
              showOnOneKey: false,
            },
            {
              path: "m/44'/0'/0'/0/3",
              coin: 'btc',
              showOnOneKey: false,
            },
            {
              path: "m/44'/0'/0'/0/4",
              coin: 'btc',
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'btcGetPublicKey',
    description: 'Get a Bitcoin public key for your account.',
    presupposes: [
      {
        title: 'Get Bitcoin Public Key',
        value: {
          path: "m/44'/0'/0'/0/0",
          coin: 'btc',
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Public Key',
        value: {
          bundle: [
            {
              path: "m/44'/0'/0'/0/0",
              coin: 'btc',
              showOnOneKey: false,
            },
            {
              path: "m/44'/0'/0'/0/2",
              coin: 'btc',
              showOnOneKey: false,
            },
            {
              path: "m/44'/0'/0'/0/3",
              coin: 'btc',
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'btcSignMessage',
    description: 'Sign a message with your Bitcoin private key.',
    presupposes: [
      {
        title: 'Sign Message (Native Segwit)',
        value: {
          path: "m/84'/0'/0'/0/0",
          coin: 'btc',
          messageHex: '48656c6c6f20576f726c64',
          noScriptType: false,
        },
      },
      {
        title: 'Sign Message (Nested Segwit)',
        value: {
          path: "m/49'/0'/0'/0/0",
          coin: 'btc',
          messageHex: '48656c6c6f20576f726c64',
          noScriptType: false,
        },
      },
      {
        title: 'Sign Message (Legacy)',
        value: {
          path: "m/44'/0'/0'/0/0",
          coin: 'btc',
          messageHex: '48656c6c6f20576f726c64',
          noScriptType: false,
        },
      },
      {
        title: 'Sign Message (ecdsa | Taproot)',
        value: {
          path: "m/86'/0'/0'/0/0",
          coin: 'btc',
          messageHex: '48656c6c6f20576f726c64',
          dAppSignType: 'ecdsa',
        },
      },
      {
        title: 'Sign Message (ecdsa | Native Segwit)',
        value: {
          path: "m/84'/0'/0'/0/0",
          coin: 'btc',
          messageHex: '48656c6c6f20576f726c64',
          dAppSignType: 'ecdsa',
        },
      },
      {
        title: 'Sign Message (ecdsa | Nested Segwit)',
        value: {
          path: "m/49'/0'/0'/0/0",
          coin: 'btc',
          messageHex: '48656c6c6f20576f726c64',
          dAppSignType: 'ecdsa',
        },
      },
      {
        title: 'Sign Message (ecdsa | Legacy)',
        value: {
          path: "m/44'/0'/0'/0/0",
          coin: 'btc',
          messageHex: '48656c6c6f20576f726c64',
          dAppSignType: 'ecdsa',
        },
      },
      {
        title: 'Sign Message (bip322-simple | Taproot)',
        value: {
          path: "m/86'/0'/0'/0/0",
          coin: 'btc',
          messageHex: '48656c6c6f20576f726c64',
          dAppSignType: 'bip322-simple',
        },
      },
      {
        title: 'Sign Message (bip322-simple | Native Segwit)',
        value: {
          path: "m/84'/0'/0'/0/0",
          coin: 'btc',
          messageHex: '48656c6c6f20576f726c64',
          dAppSignType: 'bip322-simple',
        },
      },
    ],
  },
  {
    method: 'btcSignPsbt',
    description: 'Sign psbt.',
    presupposes: [
      {
        title: 'Sign psbt on testnet',
        value: {
          psbt: '70736274ff0100db020000000141f56bec64ac3ed0a7900b61950525fcf9324f92771cb97f7f3a2f020b7a76000400000000fdffffff03307500000000000022512018ef253e59d4cb24a60607a6fc7c4cac95af3edad70813a198eeb5405c1c29b60000000000000000496a476262643400f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b203d5a0bb72d71993e435d6c5a70e2aa4db500a62cfaae33c56050deefee64ec00096bdae000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148973c2e03000001012bf824010000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f14897011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b200000000',
          coin: 'TEST',
        },
      },
      {
        title: 'Mock Babylon Staking（Seed3 专用）',
        value: {
          psbt: '70736274ff0100fd7f0102000000059b7e2b54e4d24e4c003f76c87e08efe7b05a12a1eeccee492a035322ec4e03cf0000000000fdffffffa078bbb428d8e2aa30c8c6e624f95a7d5eac2a989e6955a86c284e1cac1218b80000000000fdffffffbecc3c860dd99b902be9c1dfbc4f2c0e431668880a1216a619a9503f8cffabf20000000000fdffffff5f1787d5d4edce60e926b13ec8e3c2894d757bcb0145ace5539d5fbdcd58c9900200000000fdffffff85f5c8b72fbe754a6435ce117ef4ef66ffd36bc7f80185f5764044d3e9cac4bf0200000000fdffffff03888a0100000000002251206449c9fb89c3c2692205041fe231934a250ff43a8c1f319893e56f6a6bc89fdc0000000000000000496a476262643400f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21c61411d36685bb4b293ab968ad430d591a1a88c3d191139cbc30a914b3423c70096751e000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148970a4a03000001012b9174000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148972116f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e5600008001000080000000800000000000000000011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b20001012bd968000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148972116f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e5600008001000080000000800000000000000000011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b20001012bd968000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148972116f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e5600008001000080000000800000000000000000011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b20001012bbe40000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148972116f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e5600008001000080000000800000000000000000011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b20001012bef23000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148972116f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e5600008001000080000000800000000000000000011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b2000000010520f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b22107f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e560000800100008000000080000000000000000000',
          coin: 'TEST',
        },
      },
    ],
  },
  {
    method: 'btcSignTransaction',
    description: 'Sign a Bitcoin transaction with your Bitcoin private key.',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          coin: 'btc',
          inputs: [
            {
              prev_index: 60000,
              prev_hash: 'b3eb628dd06261805ef2232a704a727c9eb1787bccbc62cf343b05bfd7b882c7',
              amount: '150000',
              address_n: [2147483697, 2147483648, 2147483648, 0, 0],
              script_type: 'SPENDP2SHWITNESS',
            },
          ],
          outputs: [
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
          refTxs: [
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
              // bin_outputs: [
              //   { amount: 150000, script_pubkey: 'a9144204752392de72c50f0591313f98937c67325a3d87' },
              //   {
              //     amount: 116300,
              //     script_pubkey:
              //       '512003b963b69e1b26e56546d9a7a47ef0fbee91573a1c85be8b98ea79b9b83b843c',
              //   },
              // ],
              bin_outputs: [
                { amount: 150000, script_pubkey: 'a9144204752392de72c50f0591313f98937c67325a3d87' },
                {
                  amount: 116300,
                  script_pubkey:
                    '512003b963b69e1b26e56546d9a7a47ef0fbee91573a1c85be8b98ea79b9b83b843c',
                },
                ...Array.from({ length: 80_000 }, (_, i) => ({
                  amount: '100000000',
                  script_pubkey: `76a914${i.toString(16).padStart(40, '0')}88ac`, // P2PKH 脚本
                })),
              ],
              lock_time: 0,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'btcVerifyMessage',
    description: 'Verify a message signed with a Bitcoin private key.',
    presupposes: [
      {
        title: 'Verify Message',
        value: {
          address: '18879Y36oByqgVHCChsES2rFypprRcFWix',
          coin: 'btc',
          messageHex: '0x6578616d706c65206d657373616765',
          signature:
            '0x1fdef26d2134034ec4c00874597be03591a2b16bc3e2cc86f06e4c4dc4df1f00a22eea8efca6446f145e12c5a8064b4f46be57e7ddb42759550eefe4f5d3c7c487',
        },
      },
    ],
  },
];

export default api;
