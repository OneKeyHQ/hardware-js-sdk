import { type PlaygroundProps } from '../../../components/Playground';

const dotData: PlaygroundProps[] = [
  {
    method: 'polkadotGetAddress',
    description: 'Get a Polkadot address for your account.',
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
      {
        title: 'Get Kusama Address',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          prefix: '2',
          network: 'kusama',
          showOnOneKey: false,
        },
      },
      {
        title: 'Get Astar Address',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          prefix: '5',
          network: 'astar',
          showOnOneKey: false,
        },
      },
    ],
  },
  {
    method: 'polkadotSignTransaction',
    description: 'Sign a Polkadot transaction.',
    presupposes: [
      {
        title: 'Sign Transaction (Polkadot transfer-allow-death)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'polkadot',
          rawTx:
            '050000c5b74b18e5e691d0a0e1b816044ad44e6fefff7acedc4ac8d0a7276581d37a30821a0600950174002a460f001900000091b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c306b34ce8284df2022f7abc88b0fc5da4b5458b87cbd3b68d8275d6f0b00bb995',
        },
      },
      {
        title: 'Sign Transaction (Polkadot transferAll)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'polkadot',
          rawTx:
            '050400c5b74b18e5e691d0a0e1b816044ad44e6fefff7acedc4ac8d0a7276581d37a3000d50370002a460f001900000091b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3ca5e4b41f5ff148bf3066ce94631e9efcdbdf48fad241e6762ba0ac146b290f2',
        },
      },
      {
        title: 'Sign Transaction (Kusama transfer-allow-death)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'kusama',
          rawTx:
            '040000c5b74b18e5e691d0a0e1b816044ad44e6fefff7acedc4ac8d0a7276581d37a30025a6202250060002a460f0019000000b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe6a42b0dcf813ea86260d76b92d38961a97e810c646a83226e8fd9dc1b26169fa',
        },
      },
      {
        title: 'Sign Transaction (Kusama transferAll)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'kusama',
          rawTx:
            '040400c5b74b18e5e691d0a0e1b816044ad44e6fefff7acedc4ac8d0a7276581d37a3000250060002a460f0019000000b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe6a42b0dcf813ea86260d76b92d38961a97e810c646a83226e8fd9dc1b26169fa',
        },
      },
      {
        title: 'Sign Transaction (Astar transfer-allow-death)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'astar',
          rawTx:
            '1f0000c5b74b18e5e691d0a0e1b816044ad44e6fefff7acedc4ac8d0a7276581d37a300b00a0724e1809d501ac0052000000020000009eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c64e25ba8813f8dae541acdf19b1f2ca015dca53bb4d6b2f73cacc0b35a3091cd2',
        },
      },
      {
        title: 'Sign Transaction (Astar transferAll)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'astar',
          rawTx:
            '1f0400c5b74b18e5e691d0a0e1b816044ad44e6fefff7acedc4ac8d0a7276581d37a3000d501ac0052000000020000009eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c64e25ba8813f8dae541acdf19b1f2ca015dca53bb4d6b2f73cacc0b35a3091cd2',
        },
      },
      {
        title: 'Sign Transaction (Manta transfer-allow-death)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'manta',
          rawTx:
            '0a0000c5b74b18e5e691d0a0e1b816044ad44e6fefff7acedc4ac8d0a7276581d37a300b00a0724e1809b50020000212000007000000f3c7ad88f6a80f366c4be216691411ef0622e8b809b1046ea297ef106058d4eb6fcb239efbc330a4d8c5114fc2d65bd9033103d51d6e24fcac7e554b01d7540e',
        },
      },
      {
        title: 'Sign Transaction (Manta transferAll)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'manta',
          rawTx:
            '0a0400c5b74b18e5e691d0a0e1b816044ad44e6fefff7acedc4ac8d0a7276581d37a3000b50020000212000007000000f3c7ad88f6a80f366c4be216691411ef0622e8b809b1046ea297ef106058d4eb6fcb239efbc330a4d8c5114fc2d65bd9033103d51d6e24fcac7e554b01d7540e',
        },
      },
      {
        title: 'Sign Transaction (Joystream transfer)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'joystream',
          rawTx:
            '0503c5b74b18e5e691d0a0e1b816044ad44e6fefff7acedc4ac8d0a7276581d37a30821a060025005000d2070000020000006b5e488e0fa8f9821110d5c13f4c468abcd43ce5e297e62b34c53c334646595689bce43d8079257b0abf50fcce6476ea5705adef978c6318faa9c5ba66269b66',
        },
      },
      {
        title: 'Sign Transaction (Joystream transferAll)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'joystream',
          rawTx:
            '0504c5b74b18e5e691d0a0e1b816044ad44e6fefff7acedc4ac8d0a7276581d37a300025005000d2070000020000006b5e488e0fa8f9821110d5c13f4c468abcd43ce5e297e62b34c53c334646595689bce43d8079257b0abf50fcce6476ea5705adef978c6318faa9c5ba66269b66',
        },
      },
    ],
  },
];

export default dotData;
