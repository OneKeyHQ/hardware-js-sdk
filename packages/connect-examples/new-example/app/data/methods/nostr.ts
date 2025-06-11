import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "nostr",
  name: "Nostr",
  description: "Nostr protocol operations",
  icon: ``,
  color: "#8B5CF6",
  category: "nostr" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'nostrGetPublicKey',
    description: 'Get a Nostr public key for your account.',
    presupposes: [
      {
        title: 'Get Nostr Public Key',
        value: {
          path: "m/44'/1237'/0'/0/0",
          showOnOneKey: true,
        },
      },
      {
        title: 'Batch Get Public Key',
        value: {
          bundle: [
            {
              path: "m/44'/1237'/0'/0/0",
              showOnOneKey: false,
            },
            {
              path: "m/44'/1237'/1'/0/0",
              showOnOneKey: false,
            },
            {
              path: "m/44'/1237'/2'/0/0",
              showOnOneKey: false,
            },
            {
              path: "m/44'/1237'/3'/0/0",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'nostrSignEvent',
    description: 'Sign a Nostr event.',
    presupposes: [
      {
        title: 'Sign simple note',
        value: {
          path: "m/44'/1237'/0'/0/0",
          event: {
            kind: 1,
            content: 'Hello world',
            tags: [],
            created_at: 1702268010,
          },
        },
      },
      {
        title: 'Sign other nostr event',
        value: {
          path: "m/44'/1237'/0'/0/0",
          event: {
            id: '6ea5ad0c84597800da1326d1c23c7c29777faa6a750dcb358e0a228dc666c3a4',
            pubkey: '0b3df6d98a46e9c9204bb9302303f7956461feda90bf00b153892bb9e9d454c8',
            content: '',
            kind: 22242,
            created_at: 1702521824,
            tags: [
              ['challenge', '4b1fd2cc-a212-4fb3-a844-bc82ecd005eb'],
              ['relay', 'wss://nostr.wine/'],
            ],
          },
        },
      },
    ],
  },
  {
    method: 'nostrEncryptMessage',
    description: 'Encrypt message',
    presupposes: [
      {
        title: 'Encrypt message',
        value: {
          path: "m/44'/1237'/0'/0/0",
          pubkey: '2118c65161c7d68b4bdbe1374f658532670057ab1bb0c99937d0ff7cff45cb5e',
          plaintext: 'Hello world',
          showOnOneKey: false,
        },
      },
    ],
  },
  {
    method: 'nostrDecryptMessage',
    description: 'Decrypt message',
    presupposes: [
      {
        title: 'Decrypt message',
        value: {
          path: "m/44'/1237'/0'/0/0",
          pubkey: '2118c65161c7d68b4bdbe1374f658532670057ab1bb0c99937d0ff7cff45cb5e',
          ciphertext: 'VpWFJ7JDFv16jL7pBZ1shw==?iv=$1tPpwGD3Ic1RTVXJx1ZG7Q==',
          showOnOneKey: false,
        },
      },
    ],
  },
  {
    method: 'nostrSignSchnorr',
    description: 'Sign schnorr',
    presupposes: [
      {
        title: 'Sign schnorr',
        value: {
          path: "m/44'/1237'/0'/0/0",
          hash: '2118c65161c7d68b4bdbe1374f658532670057ab1bb0c99937d0ff7cff45cb5e',
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
