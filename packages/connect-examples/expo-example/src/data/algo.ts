import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'algoGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/283'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/283'/0'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/283'/1'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/283'/2'/0'/0'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'algoSignTransaction',
    description: 'Sign transaction',
    presupposes: [
      {
        title: 'Sign transaction',
        value: {
          path: "m/44'/283'/0'/0'/0'",
          rawTx:
            '4301355cc18d85809872bcbd63cb6ea5ac3c2814a1bacf2e50d8ec62367211917b79ecd1f1a98fa0d793d7cb92ebd9a479dc6aba0ae8570253aa87c0da32db5ed2bd401f3bbee52c2bc55761fd8486fae2e28f46499282f4267b8b90fc8c1cc97bb659b6cc927f2ec1701ef2928ddb84759ba5c557f549db',
        },
      },
    ],
  },
];

export default api;
