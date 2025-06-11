import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "starcoin",
  name: "Starcoin",
  description: "Starcoin blockchain operations",
  icon: ``,
  color: "#4285F4",
  category: "starcoin" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'starcoinGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/101010'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/101010'/0'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/101010'/1'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/101010'/2'/0'/0'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'starcoinGetPublicKey',
    description: 'Get PublicKey',
    presupposes: [
      {
        title: 'Get PublicKey',
        value: {
          path: "m/44'/101010'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get PublicKey',
        value: {
          bundle: [
            {
              path: "m/44'/101010'/0'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/101010'/1'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/101010'/2'/0'/0'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'starcoinSignMessage',
    description: 'Sign Message',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/101010'/0'/0'/0'",
          messageHex: '6578616d706c65206d657373616765',
        },
      },
    ],
  },
  {
    method: 'starcoinVerifyMessage',
    description: 'Verify Message',
    presupposes: [
      {
        title: 'Verify Message',
        value: {
          path: "m/44'/101010'/0'/0'/0'",
          publicKey: 'cf90aea8962229869bcba527f0cf0de73ad4c22fe27ad2875007e967db7056f5',
          messageHex: '0x6578616d706c65206d657373616765',
          signature:
            '447d2c3131c32d176106482d8fc780d933f13b37b0f06beee27de5e73a945e8c807f7764d269a196306f53383a26ab632913f4076457e3230b9defafe1c6ba0b',
        },
      },
    ],
  },
  {
    method: 'starcoinSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/101010'/0'/0'/0'",
          rawTx:
            '3b967f5ed62f0773d5f96ae5ceb55a2d780100000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f7632010700000000000000000000000000000001035354430353544300021068e843ca9b370dd84a8b567ed60afe691000e1f5050000000000000000000000004b9c01000000000001000000000000000d3078313a3a5354433a3a53544315bb48650000000001',
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
