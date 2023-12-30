import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'tezosGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/784'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/784'/0'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/784'/1'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/784'/2'/0'/0'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'tezosGetPublicKey',
    description: 'Get PublicKey',
    presupposes: [
      {
        title: 'Get PublicKey',
        value: {
          path: "m/44'/784'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get PublicKey',
        value: {
          bundle: [
            {
              path: "m/44'/784'/0'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/784'/1'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/784'/2'/0'/0'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'tezosSignTx',
    description: 'Sign Tx',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/784'/0'/0'/0'",
          branch: new Uint8Array(),
        },
      },
    ],
  },
  {
    method: 'moneroGetWatchKey',
    description: 'moneroGetWatchKey',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/784'/0'/0'/0'",
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/784'/0'/0'/0'",
            },
            {
              path: "m/44'/784'/1'/0'/0'",
            },
            {
              path: "m/44'/784'/2'/0'/0'",
            },
          ],
        },
      },
    ],
  },
  {
    method: 'moneroGetAddress',
    description: 'moneroGetAddress',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/784'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/784'/0'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/784'/1'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/784'/2'/0'/0'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'eosGetPublicKey',
    description: 'eosGetPublicKey',
    presupposes: [
      {
        title: 'eosGetPublicKey',
        value: {
          path: "m/44'/784'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
    ],
  },
  {
    method: 'eosSignTx',
    description: 'eosSignTx',
    presupposes: [
      {
        title: 'eosSignTx',
        value: {
          path: "m/44'/784'/0'/0'/0'",
        },
      },
    ],
  },
  {
    method: 'binanceGetAddress',
    description: 'BinanceGetAddress',
    presupposes: [
      {
        title: 'BinanceGetAddress',
        value: {
          path: "m/44'/784'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
    ],
  },
  {
    method: 'binanceGetPublicKey',
    description: 'BinanceGetPublicKey',
    presupposes: [
      {
        title: 'BinanceGetPublicKey',
        value: {
          path: "m/44'/784'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
    ],
  },
  {
    method: 'binanceSignTx',
    description: 'BinanceSignTx',
    presupposes: [
      {
        title: 'BinanceSignTx',
        value: {
          path: "m/44'/784'/0'/0'/0'",
          msg_count: 1,
          account_number: 0,
        },
      },
    ],
  },
  {
    method: 'webAuthnListResidentCredentials',
    description: 'webAuthnListResidentCredentials',
  },
  {
    method: 'webAuthnAddResidentCredential',
    description: 'webAuthnAddResidentCredential',
    presupposes: [
      {
        title: 'webAuthnAddResidentCredential',
        value: {
          credential_id: '0',
        },
      },
    ],
  },
  {
    method: 'webAuthnRemoveResidentCredential',
    description: 'webAuthnRemoveResidentCredential',
    presupposes: [
      {
        title: 'webAuthnRemoveResidentCredential',
        value: {
          index: 0,
        },
      },
    ],
  },
  {
    method: 'getPublicKeyMultiple',
    description: 'getPublicKeyMultiple',
    presupposes: [
      {
        title: 'getPublicKeyMultiple',
        value: {
          addresses: [
            {
              address_n: [2147483692, 2147485463, 2147483648, 0, 0],
            },
          ],
        },
      },
    ],
  },
  {
    method: 'listResDir',
    description: 'listResDir',
    presupposes: [
      {
        title: 'listResDir',
        value: {
          path: '/res',
        },
      },
    ],
  },
  {
    method: 'nftWriteData',
    description: 'nftWriteData',
    presupposes: [
      {
        title: 'nftWriteData',
        value: {
          index: 0,
          data: '0x123456',
          offset: 0,
        },
      },
    ],
  },
  {
    method: 'nftWriteInfo',
    description: 'nftWriteInfo',
    presupposes: [
      {
        title: 'nftWriteInfo',
        value: {
          index: 0,
          width: 768,
          height: 768,
        },
      },
    ],
  },
  {
    method: 'resourceUpdate',
    description: 'resourceUpdate',
    presupposes: [
      {
        title: 'resourceUpdate',
        value: {
          name: 'a123.png',
          data: '0x123456',
        },
      },
    ],
  },
  {
    method: 'bixinBackupDevice',
    description: 'bixinBackupDevice',
  },
  {
    method: 'bixinLoadDevice',
    description: 'bixinLoadDevice',
    presupposes: [
      {
        title: 'resourceUpdate',
        value: {
          mnemonics: 'all all all all all all all all all all all all',
        },
      },
    ],
  },
  {
    method: 'bixinMessageSE',
    description: 'bixinMessageSE',
    presupposes: [
      {
        title: 'bixinMessageSE',
        value: {
          inputmessage: '0x1234567',
        },
      },
    ],
  },
  {
    method: 'bixinVerifyDeviceRequest',
    description: 'bixinVerifyDeviceRequest',
    presupposes: [
      {
        title: 'bixinVerifyDeviceRequest',
        value: {
          data: '0x1234567',
        },
      },
    ],
  },
];

export default api;
