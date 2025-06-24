import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'nemGetAddress',

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
];

export default api;
