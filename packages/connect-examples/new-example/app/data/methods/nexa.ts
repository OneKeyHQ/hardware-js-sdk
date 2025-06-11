import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "nexa",
  name: "Nexa",
  description: "Nexa blockchain operations",
  icon: ``,
  color: "#00D2FF",
  category: "nexa" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'nexaGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/29223'/0'/0/0",
          showOnOneKey: false,
          prefix: 'nexa',
          scheme: 'schnorr',
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/29223'/0'/0/0",
              showOnOneKey: false,
            },
            {
              path: "m/44'/29223'/0'/0/1",
              showOnOneKey: false,
            },
            {
              path: "m/44'/29223'/0'/0/2",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'nexaSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          inputs: [
            {
              path: "m/44'/29223'/0'/0/0",
              message:
                '000578c6c76f10156fbc7ee4a8faa7a4e92b6adadc978abf66ae70f13a03b75d36cd7a6acc0967cc9f2f632f585cb7b4297873858c23233792767fd4ae662ec1093bb13029ce7b1f559ef5e747fcac439f1455a2ec7c5f09b72290795e70665044026cad0dba749a112e0d2ea420fa68e0218453db6bb0744e44eb51edc76af8bb6871190000000000',
              prefix: 'nexa',
            },
          ],
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
