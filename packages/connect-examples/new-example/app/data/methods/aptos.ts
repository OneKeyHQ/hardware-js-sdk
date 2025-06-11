import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "aptos",
  name: "Aptos",
  description: "Aptos blockchain operations",
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#00C2FF"/><path d="M8 12l4 4 4-4-4-4-4 4z" fill="white"/></svg>`,
  color: "#00C2FF",
  category: "aptos" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'aptosGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/637'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/637'/0'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/637'/1'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/637'/2'/0'/0'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'aptosGetPublicKey',
    description: 'Get public key',
    presupposes: [
      {
        title: 'Get public key',
        value: {
          path: "m/44'/637'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get public key',
        value: {
          bundle: [
            {
              path: "m/44'/637'/0'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/637'/1'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/637'/2'/0'/0'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'aptosSignMessage',
    description: 'Sign message',
    presupposes: [
      {
        title: 'Sign message',
        value: {
          path: "m/44'/637'/0'/0'/0'",
          payload: {
            address: '0x1234',
            chainId: '0x1',
            application: 'OneKey Apps',
            nonce: '12345',
            message: 'hello',
          },
        },
      },
    ],
  },
  {
    method: 'aptosSignTransaction',
    description: 'Sign transaction',
    presupposes: [
      {
        title: 'Sign transaction',
        value: {
          path: "m/44'/637'/0'/0'/0'",
          rawTx:
            '4301355cc18d85809872bcbd63cb6ea5ac3c2814a1bacf2e50d8ec62367211917b79ecd1f1a98fa0d793d7cb92ebd9a479dc6aba0ae8570253aa87c0da32db5ed2bd401f3bbee52c2bc55761fd8486fae2e28f46499282f4267b8b90fc8c1cc97bb659b6cc927f2ec1701ef2928ddb84759ba5c557f549db',
        },
      },
      {
        title: 'Sign transaction with transaction type',
        value: {
          path: "m/44'/637'/0'/0'/0'",
          transactionType: 1,
          rawTx:
            '4301355cc18d85809872bcbd63cb6ea5ac3c2814a1bacf2e50d8ec62367211917b79ecd1f1a98fa0d793d7cb92ebd9a479dc6aba0ae8570253aa87c0da32db5ed2bd401f3bbee52c2bc55761fd8486fae2e28f46499282f4267b8b90fc8c1cc97bb659b6cc927f2ec1701ef2928ddb84759ba5c557f549db',
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
