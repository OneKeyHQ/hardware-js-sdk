import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "filecoin",
  name: "Filecoin",
  description: "Filecoin network operations",
  icon: ``,
  color: "#0090FF",
  category: "filecoin" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'filecoinGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/461'/0'/0/0",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/461'/0'/0/0",
              showOnOneKey: false,
            },
            {
              path: "m/44'/461'/0'/0/1",
              showOnOneKey: false,
            },
            {
              path: "m/44'/461'/0'/0/2",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'filecoinSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/461'/0'/0/0",
          showOnOneKey: false,
          rawTx:
            '8a0055015a2fd22d821d5855e401118fef6ea0373dadbde355018ae51a9d6c9fe1872fd31b10c96df89106790297004900016345785d8a00001a0009354445001730ee6e440001865e0040',
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
