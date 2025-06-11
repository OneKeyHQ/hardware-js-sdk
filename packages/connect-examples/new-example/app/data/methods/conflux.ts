import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "conflux",
  name: "Conflux",
  description: "Conflux Network operations",
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#0B1D36"/><path d="M8 8l8 8M16 8l-8 8" stroke="#00D4FF" stroke-width="2"/></svg>`,
  color: "#00D4FF",
  category: "ethereum" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'confluxGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/503'/0'/0/0",
          chainId: 1029,
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/503'/0'/0/0",
              chainId: 1029,
              showOnOneKey: false,
            },
            {
              path: "m/44'/503'/0'/0/1",
              chainId: 1029,
              showOnOneKey: false,
            },
            {
              path: "m/44'/503'/0'/0/2",
              chainId: 1029,
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'confluxSignMessage',
    description: 'Sign Message',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/503'/0'/0/0",
          messageHex: '0x6578616d706c65206d657373616765',
        },
      },
    ],
  },
  {
    method: 'confluxSignMessageCIP23',
    description: 'Sign Message CIP23',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/503'/0'/0/0",
          domainHash: '7c872d109a4e735dc1886c72af47e9b4888a1507557e0f49c85b570019163373',
          messageHash: '0x07bc1c4f3268fc74b60587e9bb7e01e38a7d8a9a3f51202bf25332aa2c75c644',
        },
      },
    ],
  },
  {
    method: 'confluxSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/503'/0'/0/0",
          transaction: {
            to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
            value: '0xf4240',
            data: '0x01',
            chainId: 1,
            nonce: '0x00',
            epochHeight: '0x00',
            gasLimit: '0x5208',
            storageLimit: '0x5208',
            gasPrice: '0xbebc200',
          },
        },
      },
      {
        title: 'Sign Transaction (Big Data)',
        value: {
          path: "m/44'/503'/0'/0/0",
          transaction: {
            to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
            value: '0xf4240',
            data: `0x${'01'.repeat(3072)}`,
            chainId: 1,
            nonce: '0x00',
            epochHeight: '0x00',
            gasLimit: '0x5208',
            storageLimit: '0x5208',
            gasPrice: '0xbebc200',
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
