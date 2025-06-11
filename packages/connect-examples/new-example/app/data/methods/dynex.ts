import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "dynex",
  name: "Dynex",
  description: "Dynex blockchain operations",
  icon: ``,
  color: "#00CED1",
  category: "dynex" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'dnxGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/29538'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/29538'/0'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/29538'/0'/0'/1'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/29538'/0'/0'/2'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'dnxSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Normal Transaction',
        value: {
          path: "m/44'/29538'/0'/0'/0'",
          inputs: [
            {
              prevIndex: 0,
              globalIndex: 323,
              prevOutPubkey: 'ff4df9a9fc83e48f2c0242c4d94f3906546a889950bccd8ba4392f3e7886c3a1',
              txPubkey: '0d708b68003ae5fee4c9f9aad56a8cfdb0a5dcbcdd2e3fc18eb813349457a78c',
              amount: '1300000000',
            },
          ],
          toAddress:
            'XwmxTF8FxAy2s5cvtS62oSGxY3fzvDcgo2CiJ6rrpz9te68sApSDs3LQihubFtpsfT5z6NYHZzMKUjavNpTkW46i2dYgHBULG',
          amount: '13000000',
          fee: '10000',
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
