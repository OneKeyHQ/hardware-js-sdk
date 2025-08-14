import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'stellarGetAddress',

    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/148'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/148'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/148'/1'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/148'/2'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'stellarSignTransaction',

    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/148'/0'",
          networkPassphrase: 'Test SDF Network ; September 2015',
          transaction: {
            source: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
            fee: 100,
            sequence: 4294967296,
            timebounds: {
              minTime: 111,
              maxTime: 222,
            },
            memo: {
              type: 0,
            },
            operations: [
              {
                type: 'payment',
                source: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
                destination: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
                amount: '10000',
                asset: {
                  type: 'NATIVE',
                },
              },
            ],
          },
        },
      },
    ],
  },
];

export default api;
