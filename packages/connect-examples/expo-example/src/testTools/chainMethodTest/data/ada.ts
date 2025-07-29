import { type PlaygroundProps } from '../../../components/Playground';

const adaData: PlaygroundProps[] = [
  {
    method: 'cardanoGetAddress',
    description: 'Get a Cardano address for your account.',
    presupposes: [
      {
        title: 'Get address',
        value: {
          addressParameters: {
            addressType: 0,
            path: "m/1852'/1815'/0'/0/0",
            stakingPath: "m/1852'/1815'/0'/2/0",
            stakingKeyHash: undefined,
            paymentScriptHash: undefined,
            stakingScriptHash: undefined,
          },
          protocolMagic: 764824073,
          networkId: 1,
          derivationType: 1,
          address: '',
          showOnOneKey: false,
          isCheck: false,
        },
      },
      {
        title: 'Classic Batch Get Address',
        value: {
          bundle: [
            {
              addressParameters: {
                addressType: 0,
                path: "m/1852'/1815'/0'/0/0",
                stakingPath: "m/1852'/1815'/0'/2/0",
              },
              protocolMagic: 764824073,
              networkId: 1,
              derivationType: 1,
              address: '',
              showOnOneKey: false,
              isCheck: false,
            },
            {
              addressParameters: {
                addressType: 0,
                path: "m/1852'/1815'/0'/1/0",
                stakingPath: "m/1852'/1815'/0'/2/0",
              },
              protocolMagic: 764824073,
              networkId: 1,
              derivationType: 1,
              address: '',
              showOnOneKey: false,
              isCheck: false,
            },
            {
              addressParameters: {
                addressType: 0,
                path: "m/1852'/1815'/0'/2/0",
                stakingPath: "m/1852'/1815'/0'/2/0",
              },
              protocolMagic: 764824073,
              networkId: 1,
              derivationType: 1,
              address: '',
              showOnOneKey: false,
              isCheck: false,
            },
          ],
        },
      },
      {
        title: 'Touch Batch Get Address',
        value: {
          bundle: [
            {
              addressParameters: {
                addressType: 0,
                path: "m/1852'/1815'/0'/0/0",
                stakingPath: "m/1852'/1815'/0'/2/0",
              },
              protocolMagic: 764824073,
              networkId: 1,
              derivationType: 1,
              address: '',
              showOnOneKey: false,
              isCheck: false,
            },
            {
              addressParameters: {
                addressType: 0,
                path: "m/1852'/1815'/0'/1/0",
                stakingPath: "m/1852'/1815'/0'/2/0",
              },
              protocolMagic: 764824073,
              networkId: 1,
              derivationType: 2,
              address: '',
              showOnOneKey: false,
              isCheck: false,
            },
            {
              addressParameters: {
                addressType: 0,
                path: "m/1852'/1815'/0'/2/0",
                stakingPath: "m/1852'/1815'/0'/2/0",
              },
              protocolMagic: 764824073,
              networkId: 1,
              derivationType: 1,
              address: '',
              showOnOneKey: false,
              isCheck: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'cardanoGetPublicKey',
    description: 'Get a Cardano public key for your account.',
    presupposes: [
      {
        title: 'Get PublicKey',
        value: {
          path: "m/1852'/1815'/0'",
          showOnOneKey: false,
          derivationType: 1,
        },
      },
      {
        title: 'Classic Batch Get PublicKey',
        value: {
          bundle: [
            {
              path: "m/1852'/1815'/0'",
              showOnOneKey: false,
              derivationType: 1,
            },
            {
              path: "m/1852'/1815'/0'",
              showOnOneKey: false,
              derivationType: 1,
            },
            {
              path: "m/1852'/1815'/0'",
              showOnOneKey: false,
              derivationType: 1,
            },
          ],
        },
      },
      {
        title: 'Touch Batch Get PublicKey',
        value: {
          bundle: [
            {
              path: "m/1852'/1815'/0'",
              showOnOneKey: false,
              derivationType: 2,
            },
            {
              path: "m/1852'/1815'/0'",
              showOnOneKey: false,
              derivationType: 1,
            },
            {
              path: "m/1852'/1815'/0'",
              showOnOneKey: false,
              derivationType: 2,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'cardanoSignTransaction',
    description: 'Sign a Cardano transaction.',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          signingMode: 0,
          inputs: [
            {
              path: "m/1852'/1815'/0'/0/0",
              prev_hash: '311940642e2f1ee1029a59c05f83c78fc27cc8a52bfd1e65721800dd8b026dec',
              prev_index: 0,
            },
            {
              path: "m/1852'/1815'/0'/0/0",
              prev_hash: '416538899e722e49c5a3670461d2bc6ce8aea8b307fae8bcec39d0019ee3c3d0',
              prev_index: 0,
            },
            {
              path: "m/1852'/1815'/0'/0/0",
              prev_hash: '416538899e722e49c5a3670461d2bc6ce8aea8b307fae8bcec39d0019ee3c3d0',
              prev_index: 1,
            },
          ],
          outputs: [
            {
              address:
                'addr1qxfzjswzujgvn70cwpkxdal5dddtasjrljmx8upgzlaehqa2vx9039emchclmwwfmwtar32lp4x558nr8wa3f26rkn7qwne3ad',
              amount: '2613231',
              tokenBundle: [
                {
                  policyId: '29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6',
                  tokenAmounts: [{ assetNameBytes: '4d494e', amount: '27828472' }],
                },
              ],
            },
            {
              addressParameters: {
                path: "m/1852'/1815'/0'/0/0",
                addressType: 0,
                stakingPath: "m/1852'/1815'/0'/2/0",
              },
              amount: '1222487',
            },
          ],
          fee: '177513',
          protocolMagic: 764824073,
          networkId: 1,
          derivationType: 1,
        },
      },
    ],
  },
  {
    method: 'cardanoSignMessage',
    description: 'Sign a Cardano message.',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/1852'/1815'/0'/0/0",
          message: 'Hello World',
          derivationType: 1,
          networkId: 1,
        },
      },
    ],
  },
];

export default adaData;
