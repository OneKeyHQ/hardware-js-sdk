import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'suiGetAddress',
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
    method: 'suiGetPublicKey',
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
    method: 'suiSignMessage',
    description: 'Sign Message',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/784'/0'/0'/0'",
          messageHex: '010203',
        },
      },
    ],
  },
  {
    method: 'suiSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/784'/0'/0'/0'",
          rawTx:
            '0x000000000002000800e1f505000000000020e40a5a0133cac4e9059f58f9d2074a3386d631390e40eadb43d2606e8975f3eb02020001010000010102000001010020bc56200b85adb47bed5f4b66c31d7789809f2b87130090fd7a6e8b936be07601023deddea8b27d169f70d9309601fe3a4aa2425acbc1f03bfcc7618dfdc9d385e70c1d02000000002090a0284e4451fc1d476e42faea6eb92ae7b01cf54ef21d762558d25563af44be20bc56200b85adb47bed5f4b66c31d7789809f2b87130090fd7a6e8b936be076ee02000000000000200a35000000000000',
        },
      },
    ],
  },
];

export default api;
