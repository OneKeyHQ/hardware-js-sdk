import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "cosmos",
  name: "Cosmos",
  description: "Cosmos ecosystem operations",
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#2E2E54"/><circle cx="12" cy="12" r="6" fill="none" stroke="#6F7390" stroke-width="1"/><circle cx="12" cy="12" r="2" fill="#6F7390"/></svg>`,
  color: "#6F7390",
  category: "cosmos" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'cosmosGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/118'/0'/0/0",
          showOnOneKey: false,
          hrp: 'cosmos',
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/118'/0'/0/0",
              showOnOneKey: false,
              hrp: 'cosmos',
            },
            {
              path: "m/44'/118'/0'/0/1",
              showOnOneKey: false,
              hrp: 'cosmos',
            },
            {
              path: "m/44'/118'/0'/0/2",
              showOnOneKey: false,
              hrp: 'cosmos',
            },
          ],
        },
      },
    ],
  },
  {
    method: 'cosmosGetPublicKey',
    description: 'Get PublicKey',
    presupposes: [
      {
        title: 'Get PublicKey',
        value: {
          path: "m/44'/118'/0'/0/0",
          showOnOneKey: false,
          curve: 'secp256k1',
        },
      },
      {
        title: 'Batch Get PublicKey',
        value: {
          bundle: [
            {
              path: "m/44'/118'/0'/0/0",
              showOnOneKey: false,
              curve: 'secp256k1',
            },
            {
              path: "m/44'/118'/0'/0/1",
              showOnOneKey: false,
              curve: 'secp256k1',
            },
            {
              path: "m/44'/118'/0'/0/2",
              showOnOneKey: false,
              curve: 'secp256k1',
            },
          ],
        },
      },
    ],
  },
  {
    method: 'cosmosSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/118'/0'/0/0",
          showOnOneKey: false,
          rawTx:
            '7b226163636f756e745f6e756d626572223a2231343136383538222c22636861696e5f6964223a22636f736d6f736875622d34222c22666565223a7b22616d6f756e74223a5b7b22616d6f756e74223a2232313737222c2264656e6f6d223a227561746f6d227d5d2c22676173223a223837303733227d2c226d656d6f223a22222c226d736773223a5b7b2274797065223a22636f736d6f732d73646b2f4d736753656e64222c2276616c7565223a7b22616d6f756e74223a5b7b22616d6f756e74223a2231303030222c2264656e6f6d223a227561746f6d227d5d2c2266726f6d5f61646472657373223a22636f736d6f73313963326d333563666165356c6a38397839303235706c6b6e686a6c68653672616a336d613974222c22746f5f61646472657373223a22636f736d6f73316c387661367364376361786b676b3476736e617a61786176716e363434617971636e39737374227d7d5d2c2273657175656e6365223a223233227d',
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
