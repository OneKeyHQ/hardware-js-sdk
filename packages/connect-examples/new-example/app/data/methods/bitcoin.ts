import { type PlaygroundProps } from "../components/Playground";
import type { ChainCategory } from "../types";

// 链元数据
export const chainMeta = {
  id: "bitcoin",
  name: "Bitcoin",
  description: "Bitcoin blockchain operations",
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546z" fill="#F7931A"/><path d="M17.058 11.174c.195-1.31-.802-2.013-2.165-2.483l.442-1.774-1.08-.269-.43 1.727c-.284-.071-.575-.138-.865-.203l.433-1.736-1.08-.269-.442 1.774c-.235-.054-.465-.107-.688-.162l-.001-.004-1.489-.372-.287 1.15s.802.184.785.195c.437.109.516.398.503.628l-.504 2.02c.03.008.069.019.112.036-.036-.009-.074-.018-.113-.027l-.707 2.836c-.054.133-.19.333-.497.257.011.016-.785-.196-.785-.196l-.536 1.233 1.405.35c.261.066.517.135.769.201l-.447 1.795 1.08.269.442-1.774c.293.079.578.152.857.223l-.441 1.767 1.08.269.447-1.794c1.843.349 3.23.208 3.815-1.458.471-1.342-.023-2.117-.993-2.62.706-.163 1.238-.628 1.38-1.587zm-2.468 3.461c-.334 1.34-2.593.616-3.326.434l.594-2.378c.733.183 3.081.545 2.732 1.944zm.334-3.481c-.305 1.217-2.189.599-2.797.447l.538-2.159c.608.152 2.581.436 2.259 1.712z" fill="#FFF"/></svg>`,
  color: "#F7931A",
  category: "bitcoin" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: "btcGetAddress",
    description: "Get a Bitcoin address for your account.",
    presupposes: [
      {
        title: "Get Bitcoin Address",
        value: {
          path: "m/44'/0'/0'/0/0",
          coin: "btc",
          showOnOneKey: false,
        },
      },
      {
        title: "Batch Get Address",
        value: {
          bundle: [
            ...Array.from({ length: 10 }, (_, i) => ({
              path: `m/44'/0'/0'/0/${i}`,
              coin: "btc",
              showOnOneKey: false,
            })),
          ],
        },
      },
      {
        title: "Batch Get Address segwit_p2sh",
        value: {
          bundle: [
            ...Array.from({ length: 10 }, (_, i) => ({
              path: `m/49'/0'/0'/0/${i}`,
              coin: "btc",
              showOnOneKey: false,
            })),
          ],
        },
      },
      {
        title: "Batch Get Address segwit_native",
        value: {
          bundle: [
            ...Array.from({ length: 10 }, (_, i) => ({
              path: `m/84'/0'/0'/0/${i}`,
              coin: "btc",
              showOnOneKey: false,
            })),
          ],
        },
      },
      {
        title: "Batch Get Address taproot",
        value: {
          bundle: [
            ...Array.from({ length: 10 }, (_, i) => ({
              path: `m/86'/0'/0'/0/${i}`,
              coin: "btc",
              showOnOneKey: false,
            })),
          ],
        },
      },
    ],
  },
  {
    method: "btcGetPublicKey",
    description: "Get a Bitcoin public key for your account.",
    presupposes: [
      {
        title: "Get Bitcoin Public Key",
        value: {
          path: "m/44'/0'/0'/0/0",
          coin: "btc",
          showOnOneKey: false,
        },
      },
      {
        title: "Batch Get Public Key",
        value: {
          bundle: [
            ...Array.from({ length: 10 }, (_, i) => ({
              path: `m/44'/0'/0'/0/${i}`,
              coin: "btc",
              showOnOneKey: false,
            })),
          ],
        },
      },
      {
        title: "Batch Get Public Key segwit_p2sh",
        value: {
          bundle: [
            ...Array.from({ length: 10 }, (_, i) => ({
              path: `m/49'/0'/0'/0/${i}`,
              coin: "btc",
              showOnOneKey: false,
            })),
          ],
        },
      },
      {
        title: "Batch Get Public Key segwit_native",
        value: {
          bundle: [
            ...Array.from({ length: 10 }, (_, i) => ({
              path: `m/84'/0'/0'/0/${i}`,
              coin: "btc",
              showOnOneKey: false,
            })),
          ],
        },
      },
      {
        title: "Batch Get Public Key taproot",
        value: {
          bundle: [
            ...Array.from({ length: 10 }, (_, i) => ({
              path: `m/86'/0'/0'/0/${i}`,
              coin: "btc",
              showOnOneKey: false,
            })),
          ],
        },
      },
    ],
  },
  {
    method: "btcSignMessage",
    description: "Sign a message with your Bitcoin private key.",
    presupposes: [
      {
        title: "Sign Message (Native Segwit)",
        value: {
          path: "m/84'/0'/0'/0/0",
          coin: "btc",
          messageHex: "48656c6c6f20576f726c64",
          noScriptType: false,
        },
      },
      {
        title: "Sign Message (Nested Segwit)",
        value: {
          path: "m/49'/0'/0'/0/0",
          coin: "btc",
          messageHex: "48656c6c6f20576f726c64",
          noScriptType: false,
        },
      },
      {
        title: "Sign Message (Legacy)",
        value: {
          path: "m/44'/0'/0'/0/0",
          coin: "btc",
          messageHex: "48656c6c6f20576f726c64",
          noScriptType: false,
        },
      },
      {
        title: "Sign Message (ecdsa | Taproot)",
        value: {
          path: "m/86'/0'/0'/0/0",
          coin: "btc",
          messageHex: "48656c6c6f20576f726c64",
          dAppSignType: "ecdsa",
        },
      },
      {
        title: "Sign Message (ecdsa | Native Segwit)",
        value: {
          path: "m/84'/0'/0'/0/0",
          coin: "btc",
          messageHex: "48656c6c6f20576f726c64",
          dAppSignType: "ecdsa",
        },
      },
      {
        title: "Sign Message (ecdsa | Nested Segwit)",
        value: {
          path: "m/49'/0'/0'/0/0",
          coin: "btc",
          messageHex: "48656c6c6f20576f726c64",
          dAppSignType: "ecdsa",
        },
      },
      {
        title: "Sign Message (ecdsa | Legacy)",
        value: {
          path: "m/44'/0'/0'/0/0",
          coin: "btc",
          messageHex: "48656c6c6f20576f726c64",
          dAppSignType: "ecdsa",
        },
      },
      {
        title: "Sign Message (bip322-simple | Taproot)",
        value: {
          path: "m/86'/0'/0'/0/0",
          coin: "btc",
          messageHex: "48656c6c6f20576f726c64",
          dAppSignType: "bip322-simple",
        },
      },
      {
        title: "Sign Message (bip322-simple | Native Segwit)",
        value: {
          path: "m/84'/0'/0'/0/0",
          coin: "btc",
          messageHex: "48656c6c6f20576f726c64",
          dAppSignType: "bip322-simple",
        },
      },
    ],
  },
  {
    method: "btcSignPsbt",
    description: "Sign psbt.",
    presupposes: [
      {
        title: "Sign psbt on testnet",
        value: {
          psbt: "70736274ff0100db020000000141f56bec64ac3ed0a7900b61950525fcf9324f92771cb97f7f3a2f020b7a76000400000000fdffffff03307500000000000022512018ef253e59d4cb24a60607a6fc7c4cac95af3edad70813a198eeb5405c1c29b60000000000000000496a476262643400f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b203d5a0bb72d71993e435d6c5a70e2aa4db500a62cfaae33c56050deefee64ec00096bdae000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148973c2e03000001012bf824010000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f14897011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b200000000",
          coin: "TEST",
        },
      },
      {
        title: "Mock Babylon Staking（Seed3 专用）",
        value: {
          psbt: "70736274ff0100fd7f0102000000059b7e2b54e4d24e4c003f76c87e08efe7b05a12a1eeccee492a035322ec4e03cf0000000000fdffffffa078bbb428d8e2aa30c8c6e624f95a7d5eac2a989e6955a86c284e1cac1218b80000000000fdffffffbecc3c860dd99b902be9c1dfbc4f2c0e431668880a1216a619a9503f8cffabf20000000000fdffffff5f1787d5d4edce60e926b13ec8e3c2894d757bcb0145ace5539d5fbdcd58c9900200000000fdffffff85f5c8b72fbe754a6435ce117ef4ef66ffd36bc7f80185f5764044d3e9cac4bf0200000000fdffffff03888a0100000000002251206449c9fb89c3c2692205041fe231934a250ff43a8c1f319893e56f6a6bc89fdc0000000000000000496a476262643400f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21c61411d36685bb4b293ab968ad430d591a1a88c3d191139cbc30a914b3423c70096751e000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148970a4a03000001012b9174000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148972116f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e5600008001000080000000800000000000000000011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b20001012bd968000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148972116f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e5600008001000080000000800000000000000000011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b20001012bd968000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148972116f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e5600008001000080000000800000000000000000011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b20001012bbe40000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148972116f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e5600008001000080000000800000000000000000011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b20001012bef23000000000000225120c3f45119b701bc0384b45e064a4abbea7949c8c492e278f0f594a1fd83f148972116f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e5600008001000080000000800000000000000000011720f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b2000000010520f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b22107f4b1f1ca7515d009aee696ec84ee76e901139c6ad80269ebe7e6b6e8f42ae7b21900fc885a5e560000800100008000000080000000000000000000",
          coin: "TEST",
        },
      },
    ],
  },
  {
    method: "btcSignTransaction",
    description: "Sign a Bitcoin transaction with your Bitcoin private key.",
    presupposes: [
      {
        title: "Sign Transaction",
        value: {
          coin: "btc",
          inputs: [
            {
              prev_index: 0,
              prev_hash:
                "b3eb628dd06261805ef2232a704a727c9eb1787bccbc62cf343b05bfd7b882c7",
              amount: "150000",
              address_n: [2147483697, 2147483648, 2147483648, 0, 0],
              script_type: "SPENDP2SHWITNESS",
            },
          ],
          outputs: [
            {
              script_type: "PAYTOADDRESS",
              address: "3F6g14r5Z37at7HTvMN5Mmf8QJxLJp2p3U",
              amount: "10000",
            },
            {
              script_type: "PAYTOP2SHWITNESS",
              address_n: [2147483697, 2147483648, 2147483648, 0, 0],
              amount: "128474",
            },
          ],
          refTxs: [
            {
              hash: "b3eb628dd06261805ef2232a704a727c9eb1787bccbc62cf343b05bfd7b882c7",
              version: 2,
              inputs: [
                {
                  prev_hash:
                    "141f43a36d8421b0d30f63b2d98461e5b6172b0be606b0ac0a917fe1aaa08ba9",
                  prev_index: 1,
                  script_sig: "",
                  sequence: 4294967295,
                },
              ],
              bin_outputs: [
                {
                  amount: 150000,
                  script_pubkey:
                    "a9144204752392de72c50f0591313f98937c67325a3d87",
                },
                {
                  amount: 116300,
                  script_pubkey:
                    "512003b963b69e1b26e56546d9a7a47ef0fbee91573a1c85be8b98ea79b9b83b843c",
                },
              ],
              lock_time: 0,
            },
          ],
        },
      },
      {
        title: "Sign Transaction(Big Ref Txs)",
        value: {
          coin: "btc",
          inputs: [
            {
              prev_index: 60000,
              prev_hash:
                "b3eb628dd06261805ef2232a704a727c9eb1787bccbc62cf343b05bfd7b882c7",
              amount: "150000",
              address_n: [2147483697, 2147483648, 2147483648, 0, 0],
              script_type: "SPENDP2SHWITNESS",
            },
          ],
          outputs: [
            {
              script_type: "PAYTOADDRESS",
              address: "3F6g14r5Z37at7HTvMN5Mmf8QJxLJp2p3U",
              amount: "10000",
            },
            {
              script_type: "PAYTOP2SHWITNESS",
              address_n: [2147483697, 2147483648, 2147483648, 0, 0],
              amount: "128474",
            },
          ],
          refTxs: [
            {
              hash: "b3eb628dd06261805ef2232a704a727c9eb1787bccbc62cf343b05bfd7b882c7",
              version: 2,
              inputs: [
                {
                  prev_hash:
                    "141f43a36d8421b0d30f63b2d98461e5b6172b0be606b0ac0a917fe1aaa08ba9",
                  prev_index: 1,
                  script_sig: "",
                  sequence: 4294967295,
                },
              ],
              bin_outputs: [
                {
                  amount: 150000,
                  script_pubkey:
                    "a9144204752392de72c50f0591313f98937c67325a3d87",
                },
                {
                  amount: 116300,
                  script_pubkey:
                    "512003b963b69e1b26e56546d9a7a47ef0fbee91573a1c85be8b98ea79b9b83b843c",
                },
                ...Array.from({ length: 80_000 }, (_, i) => ({
                  amount: "100000000",
                  script_pubkey: `76a914${i
                    .toString(16)
                    .padStart(40, "0")}88ac`, // P2PKH 脚本
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
    method: "btcVerifyMessage",
    description: "Verify a message signed with a Bitcoin private key.",
    presupposes: [
      {
        title: "Verify Message",
        value: {
          address: "18879Y36oByqgVHCChsES2rFypprRcFWix",
          coin: "btc",
          messageHex: "0x6578616d706c65206d657373616765",
          signature:
            "0x1fdef26d2134034ec4c00874597be03591a2b16bc3e2cc86f06e4c4dc4df1f00a22eea8efca6446f145e12c5a8064b4f46be57e7ddb42759550eefe4f5d3c7c487",
        },
      },
    ],
  },
];

// 导出链配置对象
export const chainConfig = {
  ...chainMeta,
  api,
};

export default api;
