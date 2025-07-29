import { type PlaygroundProps } from '../../../components/Playground';

const btcData: PlaygroundProps[] = [
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
            ...Array.from({ length: 10 }, (_, i) => ({
              path: `m/44'/0'/0'/0/${i}`,
              coin: 'btc',
              showOnOneKey: false,
            })),
          ],
        },
      },
      {
        title: 'Batch Get Address segwit_p2sh',
        value: {
          bundle: [
            ...Array.from({ length: 10 }, (_, i) => ({
              path: `m/49'/0'/0'/0/${i}`,
              coin: 'btc',
              showOnOneKey: false,
            })),
          ],
        },
      },
      {
        title: 'Batch Get Address segwit_native',
        value: {
          bundle: [
            ...Array.from({ length: 10 }, (_, i) => ({
              path: `m/84'/0'/0'/0/${i}`,
              coin: 'btc',
              showOnOneKey: false,
            })),
          ],
        },
      },
      {
        title: 'Batch Get Address taproot',
        value: {
          bundle: [
            ...Array.from({ length: 10 }, (_, i) => ({
              path: `m/86'/0'/0'/0/${i}`,
              coin: 'btc',
              showOnOneKey: false,
            })),
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
            ...Array.from({ length: 10 }, (_, i) => ({
              path: `m/44'/0'/0'/0/${i}`,
              coin: 'btc',
              showOnOneKey: false,
            })),
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

export default btcData;
