import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'xrpGetAddress',

    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/144'/0'/0/0",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/144'/0'/0/0",
              showOnOneKey: false,
            },
            {
              path: "m/44'/144'/0'/0/1",
              showOnOneKey: false,
            },
            {
              path: "m/44'/144'/0'/0/2",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'xrpSignTransaction',

    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/144'/1'/0/0",
          transaction: {
            fee: '12',
            flags: 0,
            sequence: 32841006,
            maxLedgerVersion: 32841630,
            payment: {
              amount: 1000000,
              destination: 'rwgumKP89VhMrJ4dRkGVS4tafRfAmZmKf8',
            },
          },
        },
      },
    ],
  },
];

export default api;
