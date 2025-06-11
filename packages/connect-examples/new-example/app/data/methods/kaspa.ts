import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "kaspa",
  name: "Kaspa",
  description: "Kaspa blockchain operations",
  icon: ``,
  color: "#70C7C7",
  category: "kaspa" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'kaspaGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/111111'/0'/0/0",
          showOnOneKey: false,
          prefix: 'kaspa',
          scheme: 'schnorr',
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/111111'/0'/0/0",
              showOnOneKey: false,
              prefix: 'kaspa',
              scheme: 'schnorr',
            },
            {
              path: "m/44'/111111'/0'/0/1",
              showOnOneKey: false,
              prefix: 'kaspa',
              scheme: 'schnorr',
            },
            {
              path: "m/44'/111111'/0'/0/2",
              showOnOneKey: false,
              prefix: 'kaspa',
              scheme: 'schnorr',
            },
          ],
        },
      },
    ],
  },
  {
    method: 'kaspaSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/461'/0'/0/0",
          subNetworkID: '00000000000000000000000000000000',
          prefix: 'kaspa',
          scheme: 'schnorr',
          version: 0,
          lockTime: '0',
          sigHashType: 0x1,
          sigOpCount: 1,
          inputs: [
            {
              outputIndex: 1,
              path: "m/44'/111111'/0'/0/0",
              prevTxId: '1f226507807ff7dc5a7f8f2dec353fffc9dacc2645d8aecd02e5046907e3e2b2',
              sequenceNumber: '0',
              sigOpCount: 1,
              output: {
                satoshis: '990096458',
                script: '207afdae557e69c0040fd4135adffc60f9486fb21f4cbae233fd6db3e84ba47c55ac',
              },
            },
          ],
          outputs: [
            {
              satoshis: '100000000',
              script: '205ca3a7530284e5c5e472544edd6002c3afeb8c8f84d3a728fad255a4872753fbac',
              scriptVersion: 0,
            },
            {
              satoshis: '890094182',
              script: '207afdae557e69c0040fd4135adffc60f9486fb21f4cbae233fd6db3e84ba47c55ac',
              scriptVersion: 0,
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
