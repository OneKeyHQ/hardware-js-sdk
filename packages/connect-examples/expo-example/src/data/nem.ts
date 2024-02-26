import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'nemGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/43'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/43'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/43'/1'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/43'/2'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'nemSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/1'/0'/0'/0'",
          transaction: {
            amount: 2000000,
            recipient: 'TALICE2GMA34CXHD7XLJQ536NM5UNKQHTORNNT2J',
            timeStamp: 74649215,
            type: 257,
            fee: 2000000,
            deadline: 74735615,
            version: -1744830464,
          },
          message: {
            payload: '746573745f6e656d5f7472616e73616374696f6e5f7472616e73666572',
            type: 1,
          },
        },
      },
    ],
  },
  {
    method: 'nemDecryptMessage',
    description: 'nemDecryptMessage',
    presupposes: [
      {
        title: 'nemDecryptMessage',
        value: {
          path: "m/44'/1'/0'/0'/0'",
          public_key: '0x04e1a0a9',
          payload: '746573745f6e656d5f7472616e73616374696f6e5f7472616e73666572',
        },
        expect: {
          common: {
            normal: {
              error: true,
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
];

export default api;
