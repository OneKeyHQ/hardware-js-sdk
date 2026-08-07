import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'aptosGetAddress',

    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/637'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/637'/0'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/637'/1'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/637'/2'/0'/0'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'aptosGetPublicKey',

    presupposes: [
      {
        title: 'Get public key',
        value: {
          path: "m/44'/637'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get public key',
        value: {
          bundle: [
            {
              path: "m/44'/637'/0'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/637'/1'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/637'/2'/0'/0'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'aptosSignMessage',

    presupposes: [
      {
        title: 'Sign message',
        value: {
          path: "m/44'/637'/0'/0'/0'",
          payload: {
            address: '0x1234',
            chainId: '0x1',
            application: 'OneKey Apps',
            nonce: '12345',
            message: 'hello',
          },
        },
      },
    ],
  },
  {
    method: 'aptosSignInMessage',
    presupposes: [
      {
        title: 'Sign message',
        value: {
          path: "m/44'/637'/0'/0'/0'",
          payload:
            'localhost:3000 wants you to sign in with your Aptos account:\\n0xeb2d1d9bbfca9d892e124e858f1dc449935a3f785f8860892e03fb9820db1839\\n\\nSigning into demo application\\n\\nURI: https://dapp-example.onekeytest.com\\nVersion: 1.0.0\\nNonce: 0.72024fabf0bbd\\nIssued At: 2025-08-20T08:58:22.851Z\\nExpiration Time: 2025-08-21T08:58:22.851Z\\nNot Before: 2025-08-20T08:58:22.851Z\\nRequest ID: abc\\nChain ID: aptos--1\\nResources:\\n- resource.1\\n- resource.2',
        },
      },
    ],
  },
  {
    method: 'aptosSignTransaction',

    presupposes: [
      {
        title: 'Sign transaction',
        value: {
          path: "m/44'/637'/0'/0'/0'",
          rawTx:
            '4301355cc18d85809872bcbd63cb6ea5ac3c2814a1bacf2e50d8ec62367211917b79ecd1f1a98fa0d793d7cb92ebd9a479dc6aba0ae8570253aa87c0da32db5ed2bd401f3bbee52c2bc55761fd8486fae2e28f46499282f4267b8b90fc8c1cc97bb659b6cc927f2ec1701ef2928ddb84759ba5c557f549db',
        },
      },
      {
        title: 'Sign transaction with transaction type',
        value: {
          path: "m/44'/637'/0'/0'/0'",
          transactionType: 1,
          rawTx:
            '4301355cc18d85809872bcbd63cb6ea5ac3c2814a1bacf2e50d8ec62367211917b79ecd1f1a98fa0d793d7cb92ebd9a479dc6aba0ae8570253aa87c0da32db5ed2bd401f3bbee52c2bc55761fd8486fae2e28f46499282f4267b8b90fc8c1cc97bb659b6cc927f2ec1701ef2928ddb84759ba5c557f549db',
        },
      },
    ],
  },
];

export default api;
