import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'tonGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/607'/0'",
          showOnOneKey: false,
          walletVersion: 3,
          isBounceable: false,
          isTestnetOnly: false,
        },
      },
      {
        title: 'Get multiaddress',
        value: {
          path: "m/44'/607'/1'",
          showOnOneKey: false,
          walletVersion: 3,
          isBounceable: false,
          isTestnetOnly: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/607'/0'",
              showOnOneKey: false,
              walletVersion: 3,
              isBounceable: false,
              isTestnetOnly: false,
            },
            {
              path: "m/44'/607'/1'",
              showOnOneKey: false,
              walletVersion: 3,
              isBounceable: false,
              isTestnetOnly: false,
            },
            {
              path: "m/44'/607'/2'",
              showOnOneKey: false,
              walletVersion: 3,
              isBounceable: false,
              isTestnetOnly: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'tonSignMessage',
    description: 'Sign Message',
    presupposes: [
      {
        title: 'Native',
        value: {
          path: "m/44'/607'/0'",
          destination: 'UQBYkuShkZzRYAWX_HrK3kFpeAixiRKd-K7QBXYxl9OBXM0_',
          tonAmount: 100,
          seqno: 0,
          expireAt: Date.now() + 1000 * 60 * 60 * 24,
          walletVersion: 3,
          isBounceable: false,
          isTestnetOnly: false,
        },
      },
      {
        title: 'Multiple Native',
        value: {
          path: "m/44'/607'/0'",
          destination: 'UQBYkuShkZzRYAWX_HrK3kFpeAixiRKd-K7QBXYxl9OBXM0_',
          tonAmount: 100,
          seqno: 0,
          expireAt: Date.now() + 1000 * 60 * 60 * 24,
          walletVersion: 3,
          isBounceable: false,
          isTestnetOnly: false,
          extDestination: ['UQBYkuShkZzRYAWX_HrK3kFpeAixiRKd-K7QBXYxl9OBXM0_'],
          extTonAmount: [100],
          extPayload: ['48656c6c6f204f6e654b6579'],
        },
      },
      {
        title: 'Token',
        value: {
          path: "m/44'/607'/0'",
          destination: 'UQBYkuShkZzRYAWX_HrK3kFpeAixiRKd-K7QBXYxl9OBXM0_',
          tonAmount: 100,
          seqno: 0,
          expireAt: Date.now() + 1000 * 60 * 60 * 24,
          jettonMasterAddress: 'UQBYkuShkZzRYAWX_HrK3kFpeAixiRKd-K7QBXYxl9OBXM0_',
          jettonAmount: 101,
          fwdFee: 100,
          comment: '48656c6c6f204f6e654b6579',
          mode: 1,
          walletVersion: 3,
          isBounceable: false,
          isTestnetOnly: false,
        },
      },
      {
        title: 'Token (Big Number)',
        value: {
          path: "m/44'/607'/0'",
          destination: 'UQBYkuShkZzRYAWX_HrK3kFpeAixiRKd-K7QBXYxl9OBXM0_',
          tonAmount: 100,
          seqno: 0,
          expireAt: Date.now() + 1000 * 60 * 60 * 24,
          jettonMasterAddress: 'UQBYkuShkZzRYAWX_HrK3kFpeAixiRKd-K7QBXYxl9OBXM0_',
          jettonAmount: '500000000000000000',
          fwdFee: 100,
          comment: '48656c6c6f204f6e654b6579',
          mode: 1,
          walletVersion: 3,
          isBounceable: false,
          isTestnetOnly: false,
        },
      },
    ],
  },
  {
    method: 'tonSignProof',
    description: 'Sign Proof',
    presupposes: [
      {
        title: 'Sign Proof',
        value: {
          path: "m/44'/607'/0'",
          appdomain: 'onekey.so',
          comment: '48656c6c6f204f6e654b6579',
          expireAt: Date.now() + 1000 * 60 * 60 * 24,
          walletVersion: 3,
          isBounceable: false,
          isTestnetOnly: false,
        },
      },
    ],
  },
];

export default api;
