import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'polkadotGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          prefix: '0',
          network: 'polkadot',
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/354'/0'/0'/0'",
              prefix: '0',
              network: 'polkadot',
              showOnOneKey: false,
            },
            {
              path: "m/44'/354'/1'/0'/0'",
              prefix: '0',
              network: 'polkadot',
              showOnOneKey: false,
            },
            {
              path: "m/44'/354'/2'/0'/0'",
              prefix: '0',
              network: 'polkadot',
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'polkadotSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'polkadot',
          rawTx:
            '050700388671dd546ba19495211c8cdc200600f9798cf078fca0fb4749ebbc0579c12a0700e40b54020500d000d72400001800000091b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3f8928b6c604b52a16c5b08be0a0390a454c1c2523f3c6d98a510b064a523a580',
        },
      },
    ],
  },
];

export default api;
