import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "scdo",
  name: "SCDO",
  description: "SCDO blockchain operations",
  icon: ``,
  color: "#FF6B6B",
  category: "scdo" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'scdoGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/541'/0'/0/0",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/541'/0'/0/0",
              showOnOneKey: false,
            },
            {
              path: "m/44'/541'/1'/0/0",
              showOnOneKey: false,
            },
            {
              path: "m/44'/541'/2'/0/0",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'scdoSignMessage',
    description: 'Sign Message',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/541'/0'/0/0",
          messageHex: Buffer.from('hello', 'utf8').toString('hex'),
        },
      },
    ],
  },
  {
    method: 'scdoSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/541'/0'/0/0",
          nonce: '0x0',
          gasPrice: '0xbebc200',
          gasLimit: '0x5208',
          to: '1S0118a02f993fc7a4348fd36b7f7a596948f02b31',
          value: '0xf4240',
          timestamp: '0',
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
