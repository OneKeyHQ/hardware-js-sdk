import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'neoGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/888'/0'/0/0",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/888'/0'/0/0",
              showOnOneKey: false,
            },
            {
              path: "m/44'/888'/0'/0/1",
              showOnOneKey: false,
            },
            {
              path: "m/44'/888'/0'/0/2",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
];

export default api;
