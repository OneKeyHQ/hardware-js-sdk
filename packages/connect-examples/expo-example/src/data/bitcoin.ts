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
      {
        title: 'Batch Get Public Key segwit_p2sh',
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
        title: 'Batch Get Public Key segwit_native',
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
        title: 'Batch Get Public Key taproot',
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
        title: 'Sign psbt on testnet (泄漏助记词)',
        value: {
          psbt: '70736274ff01005e02000000018db62b0ee90e41dd4bcf1af5f1418562e502ca6ee4673153233e8ac602d1e6ab0000000000ffffffff01a80300000000000022512003b963b69e1b26e56546d9a7a47ef0fbee91573a1c85be8b98ea79b9b83b843c000000000001012be80300000000000022512003b963b69e1b26e56546d9a7a47ef0fbee91573a1c85be8b98ea79b9b83b843c2116124b79f090c6a758ddeae85b9bb80241be2815b02b5375add84b23703d52bdb41900d0faf72356000080000000800000008000000000000000000000',
          coin: 'Bitcoin',
        },
      },
      {
        title: 'Mock Babylon Staking（泄漏助记词）',
        value: {
          psbt: '70736274ff0100fd7f0102000000059b7e2b54e4d24e4c003f76c87e08efe7b05a12a1eeccee492a035322ec4e03cf0000000000fdffffffa078bbb428d8e2aa30c8c6e624f95a7d5eac2a989e6955a86c284e1cac1218b80000000000fdffffffbecc3c860dd99b902be9c1dfbc4f2c0e431668880a1216a619a9503f8cffabf20000000000fdffffff5f1787d5d4edce60e926b13ec8e3c2894d757bcb0145ace5539d5fbdcd58c9900200000000fdffffff85f5c8b72fbe754a6435ce117ef4ef66ffd36bc7f80185f5764044d3e9cac4bf0200000000fdffffff03888a0100000000002251206449c9fb89c3c2692205041fe231934a250ff43a8c1f319893e56f6a6bc89fdc0000000000000000496a476262643400f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21c61411d36685bb4b293ab968ad430d591a1a88c3d191139cbc30a914b3423c70096751e000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148970a4a03000001012b917400000000000022512024ad201633789999cbe4251018e796acb22ec5d1a6f8a1873adc6363e04d7e7d2116cf304dca0a8bfa8ec2d5331a5c216199c1e9fed3ed7153268f84fd4127d323511900d0faf7235600008001000080000000800000000000000000011720cf304dca0a8bfa8ec2d5331a5c216199c1e9fed3ed7153268f84fd4127d323510001012bd96800000000000022512024ad201633789999cbe4251018e796acb22ec5d1a6f8a1873adc6363e04d7e7d2116cf304dca0a8bfa8ec2d5331a5c216199c1e9fed3ed7153268f84fd4127d323511900d0faf7235600008001000080000000800000000000000000011720cf304dca0a8bfa8ec2d5331a5c216199c1e9fed3ed7153268f84fd4127d323510001012bd96800000000000022512024ad201633789999cbe4251018e796acb22ec5d1a6f8a1873adc6363e04d7e7d2116cf304dca0a8bfa8ec2d5331a5c216199c1e9fed3ed7153268f84fd4127d323511900d0faf7235600008001000080000000800000000000000000011720cf304dca0a8bfa8ec2d5331a5c216199c1e9fed3ed7153268f84fd4127d323510001012bbe4000000000000022512024ad201633789999cbe4251018e796acb22ec5d1a6f8a1873adc6363e04d7e7d2116cf304dca0a8bfa8ec2d5331a5c216199c1e9fed3ed7153268f84fd4127d323511900d0faf7235600008001000080000000800000000000000000011720cf304dca0a8bfa8ec2d5331a5c216199c1e9fed3ed7153268f84fd4127d323510001012bef2300000000000022512024ad201633789999cbe4251018e796acb22ec5d1a6f8a1873adc6363e04d7e7d2116cf304dca0a8bfa8ec2d5331a5c216199c1e9fed3ed7153268f84fd4127d323511900d0faf7235600008001000080000000800000000000000000011720cf304dca0a8bfa8ec2d5331a5c216199c1e9fed3ed7153268f84fd4127d32351000000010520cf304dca0a8bfa8ec2d5331a5c216199c1e9fed3ed7153268f84fd4127d323512107cf304dca0a8bfa8ec2d5331a5c216199c1e9fed3ed7153268f84fd4127d323511900d0faf723560000800100008000000080000000000000000000',
          coin: 'TEST',
        },
      },
      {
        title: 'Mock Babylon Slashing 销毁BTC（泄漏助记词）',
        value: {
          psbt: '70736274ff01007002000000010de21538513d44100cf27cfbed0303884f808074749463526a976400ca3b5bc80000000000ffffffff02ec9d020000000000096a07626162796c6f6e54bd340a00000000225120ec47ecd23739768f3e3b9fa3ee03b7bea57cfdc316acb9c45157f017465b764a000000000001012be0e1380a0000000022512024ad201633789999cbe4251018e796acb22ec5d1a6f8a1873adc6363e04d7e7d4215c150929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac05e528cd4c722bd7e2e07b5d127e642031cec10a723c9cd2c8e29cc2e064dcc79fd790120f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b2ad20374601b4c400b31f3aa78dc16b4e4d589c1284118e2476d83f0c39743881032cad2023b29f89b45f4af41588dcaf0ca572ada32872a88224f311373917f1b37d08d1ac204b15848e495a3a62283daaadb3f458a00859fe48e321f0121ebabbdd6698f9faba208242640732773249312c47ca7bdb50ca79f15f2ecc32b9c83ceebba44fb74df7ba20cbdd028cfe32c1c1f2d84bfec71e19f92df509bba7b8ad31ca6c1a134fe09204ba20d3c79b99ac4d265c2f97ac11e3232c07a598b020cf56c6f055472c893c0967aeba20d45c70d28f169e1f0c7f4a78e2bc73497afe585b70aa897955989068f3350aaaba20de13fc96ea6899acbdc5db3afaa683f62fe35b60ff6eb723dad28a11d2b12f8cba20e36200aaa8dce9453567bba108bdc51f7f1174b97a65e4dc4402fc5de779d41cba20f178fcce82f95c524b53b077e6180bd2d779a9057fdff4255a0af95af918cee0ba569cc02116cf304dca0a8bfa8ec2d5331a5c216199c1e9fed3ed7153268f84fd4127d323511900d0faf7235600008001000080000000800000000000000000011720cf304dca0a8bfa8ec2d5331a5c216199c1e9fed3ed7153268f84fd4127d32351000000',
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
      {
        title: 'Sign Transaction(500 Ref Txs 泄漏助记词)',
        value: {
          coin: 'btc',
          inputs: [
            {
              prev_index: 480,
              prev_hash: '5471c493730cf41e48a46af6c5684fa4c3dede54ccba0ff7d1d3803d9e3ba63a',
              amount: '10000',
              address_n: [2147483692, 2147483648, 2147483648, 0, 0],
              script_type: 'PAYTOADDRESS',
            },
          ],
          outputs: [
            {
              script_type: 'PAYTOADDRESS',
              address: '3F6g14r5Z37at7HTvMN5Mmf8QJxLJp2p3U',
              amount: '1000',
            },
            {
              script_type: 'PAYTOP2SHWITNESS',
              address_n: [2147483697, 2147483648, 2147483648, 0, 0],
              amount: '8000',
            },
          ],
          refTxs: [
            {
              hash: '5471c493730cf41e48a46af6c5684fa4c3dede54ccba0ff7d1d3803d9e3ba63a',
              version: 2,
              inputs: [
                {
                  prev_hash: 'b9d4894235c32f122a7c47dff4bf751bbbaede425b88f010bb9758508621026d',
                  prev_index: 400,
                  script_sig: '',
                  sequence: 4294967295,
                },
              ],
              bin_outputs: [
                ...Array.from({ length: 500 }, () => ({
                  amount: 10000,
                  script_pubkey: `76a9144e20ec718604a211629e42fbe37dda3576bfcd8b88ac`,
                })),
                {
                  amount: 49000,
                  script_pubkey: '76a914cbe71ea01cd0909ac0585098689c045303e6327788ac',
                },
              ],
              lock_time: 0,
            },
          ],
        },
      },
      {
        title: 'Sign Transaction(Big Ref Txs)',
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
