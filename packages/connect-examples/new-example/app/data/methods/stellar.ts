import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "stellar",
  name: "Stellar",
  description: "Stellar network operations",
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#7D00FF"/><polygon points="12,4 16,12 12,20 8,12" fill="white"/></svg>`,
  color: "#7D00FF",
  category: "stellar" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'stellarGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/148'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/148'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/148'/1'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/148'/2'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'stellarSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/148'/0'",
          networkPassphrase: 'Test SDF Network ; September 2015',
          transaction: {
            source: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
            fee: 100,
            sequence: 4294967296,
            timebounds: {
              minTime: 111,
              maxTime: 222,
            },
            memo: {
              type: 0,
            },
            operations: [
              {
                type: 'payment',
                source: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
                destination: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
                amount: '10000',
                asset: {
                  type: 'NATIVE',
                },
              },
            ],
          },
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
