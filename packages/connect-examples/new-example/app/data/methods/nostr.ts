import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'nostrGetPublicKey',
    description: 'Get a Nostr public key for your account.',
    presets: [
      {
        title: 'Get Nostr Public Key',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            value: "m/44'/1237'/0'/0/0",
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            label: 'Show On One Key',
            value: true,
          },
        ],
      },
      {
        title: 'Batch Get Public Key',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Parameters',
            value: [
              {
                path: "m/44'/1237'/0'/0/0",
                showOnOneKey: false
              },
              {
                path: "m/44'/1237'/1'/0/0",
                showOnOneKey: false
              },
              {
                path: "m/44'/1237'/2'/0/0",
                showOnOneKey: false
              },
              {
                path: "m/44'/1237'/3'/0/0",
                showOnOneKey: false
              }
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'nostrSignEvent',
    description: 'Sign a Nostr event.',
    presets: [
      {
        title: 'Sign simple note',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            value: "m/44'/1237'/0'/0/0",
          },
          {
            name: 'event',
            type: 'textarea',
            required: true,
            label: 'Event Data',
            value: {
              kind: 1,
              content: "Hello Nostr!",
              tags: [],
              created_at: 1750749405
            },
          },
        ],
      },
      {
        title: 'Sign other nostr event',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            value: "m/44'/1237'/0'/0/0",
          },
          {
            name: 'event',
            type: 'textarea',
            required: true,
            label: 'Event Data',
            value: {
              kind: 3,
              content: "{\"name\":\"Test User\",\"about\":\"Test profile\"}",
              tags: [],
              created_at: 1750749405
            },
          },
        ],
      },
    ],
  },
  {
    method: 'nostrEncryptMessage',
    description: 'Encrypt message',
    presets: [
      {
        title: 'Encrypt message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            value: "m/44'/1237'/0'/0/0",
          },
          {
            name: 'pubkey',
            type: 'string',
            required: true,
            label: 'Pubkey',
            value: '2118c65161c7d68b4bdbe1374f658532670057ab1bb0c99937d0ff7cff45cb5e',
          },
          {
            name: 'plaintext',
            type: 'string',
            required: true,
            label: 'Plaintext',
            value: 'Hello world',
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            label: 'Show On One Key',
            value: false,
          },
        ],
      },
    ],
  },
  {
    method: 'nostrDecryptMessage',
    description: 'Decrypt message',
    presets: [
      {
        title: 'Decrypt message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            value: "m/44'/1237'/0'/0/0",
          },
          {
            name: 'pubkey',
            type: 'string',
            required: true,
            label: 'Pubkey',
            value: '2118c65161c7d68b4bdbe1374f658532670057ab1bb0c99937d0ff7cff45cb5e',
          },
          {
            name: 'ciphertext',
            type: 'string',
            required: true,
            label: 'Ciphertext',
            value: 'VpWFJ7JDFv16jL7pBZ1shw==?iv=$1tPpwGD3Ic1RTVXJx1ZG7Q==',
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            label: 'Show On One Key',
            value: false,
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const nostr: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'nostr',
  api,
};
