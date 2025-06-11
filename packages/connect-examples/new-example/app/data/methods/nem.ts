import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "nem",
  name: "NEM",
  description: "NEM blockchain operations",
  icon: ``,
  color: "#67B2E8",
  category: "nem" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'nemGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/43'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/43'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/43'/1'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/43'/2'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'nemSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/1'/0'/0'/0'",
          transaction: {
            amount: 2000000,
            recipient: 'TALICE2GMA34CXHD7XLJQ536NM5UNKQHTORNNT2J',
            timeStamp: 74649215,
            type: 257,
            fee: 2000000,
            deadline: 74735615,
            version: -1744830464,
          },
          message: {
            payload: '746573745f6e656d5f7472616e73616374696f6e5f7472616e73666572',
            type: 1,
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
