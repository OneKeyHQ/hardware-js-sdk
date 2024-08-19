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
        title: 'Sign Message',
        value: {
          path: "m/44'/0'/0'/0/0",
          coin: 'btc',
          messageHex: '6578616d706c65206d657373616765',
          noScriptType: false,
        },
      },
    ],
  },
  {
    method: 'btcSignPsbt',
    description: 'Sign psbt.',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          psbt: '70736274ff0100db020000000141f56bec64ac3ed0a7900b61950525fcf9324f92771cb97f7f3a2f020b7a76000400000000fdffffff03307500000000000022512018ef253e59d4cb24a60607a6fc7c4cac95af3edad70813a198eeb5405c1c29b60000000000000000496a476262643400f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b203d5a0bb72d71993e435d6c5a70e2aa4db500a62cfaae33c56050deefee64ec00096bdae000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148973c2e03000001012bf824010000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f14897011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b200000000',
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
              prev_index: 0,
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
              bin_outputs: [
                { amount: 150000, script_pubkey: 'a9144204752392de72c50f0591313f98937c67325a3d87' },
                {
                  amount: 116300,
                  script_pubkey:
                    '512003b963b69e1b26e56546d9a7a47ef0fbee91573a1c85be8b98ea79b9b83b843c',
                },
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
