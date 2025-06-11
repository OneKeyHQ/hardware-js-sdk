import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "neo",
  name: "NEO",
  description: "NEO blockchain operations",
  icon: ``,
  color: "#00E599",
  category: "neo" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'neoGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/888'/0'/0/0",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/888'/0'/0/0",
              showOnOneKey: false,
            },
            {
              path: "m/44'/888'/0'/0/1",
              showOnOneKey: false,
            },
            {
              path: "m/44'/888'/0'/0/2",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'neoSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/888'/0'/0/0",
          rawTx:
            '006108a1fd000000000000000070930000000000004d2169000120f4258023fc60fba495bcaa5d7148529734e93101005a0b02809698000c1420f4258023fc60fba495bcaa5d7148529734e9310c1420f4258023fc60fba495bcaa5d7148529734e93114c01f0c087472616e736665720c14cf76e28bd0062c4a478ee35561011319f3cfa4d241627d5b52',
          magicNumber: 860_833_102,
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
