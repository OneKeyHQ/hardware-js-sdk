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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
          chain_id: '1',
          header: {
            expiration: 0,
            ref_block_num: 0,
            ref_block_prefix: 0,
            max_net_usage_words: 0,
            max_cpu_usage_ms: 0,
            delay_sec: 0,
          },
          num_actions: 0,
        },
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
            bootloader: {
              error: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
            bootloader: {
              error: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'webAuthnListResidentCredentials',
    description: 'webAuthnListResidentCredentials',
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
      touch: {
        normal: {
          requestPin: true,
        },
      },
      pro: {
        normal: {
          requestPin: true,
        },
      },
    },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
          addresses: ["m/44'/0'/0'/0/0"],
        },
        expect: {
          common: {
            normal: {
              skip: true,
            },
            bootloader: {
              skip: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          mini: {
            normal: {
              error: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          mini: {
            normal: {
              success: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              unknownMessage: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
        },
      },
    ],
  },
  {
    method: 'bixinBackupDevice',
    description: 'bixinBackupDevice',
    expect: {
      common: {
        normal: {
          skip: true,
        },
      },
    },
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
        expect: {
          common: {
            normal: {
              skip: true,
            },
          },
          mini: {
            normal: {
              error: true,
            },
          },
          classic: {
            normal: {
              error: true,
            },
          },
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
        expect: {
          common: {
            normal: {
              skip: true,
            },
          },
          touch: {
            normal: {
              skip: true,
            },
          },
          pro: {
            normal: {
              skip: true,
            },
          },
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
        expect: {
          mini: {
            normal: {
              skip: true,
            },
          },
        },
      },
    ],
  },
];

export default api;
