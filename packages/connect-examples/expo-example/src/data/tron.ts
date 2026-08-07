import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'tronGetAddress',

    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/195'/0'/0/0",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/195'/0'/0/0",
              showOnOneKey: false,
            },
            {
              path: "m/44'/195'/0'/0/0",
              showOnOneKey: false,
            },
            {
              path: "m/44'/195'/0'/0/0",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'tronSignMessage',

    presupposes: [
      {
        title: 'Sign Message V2',
        value: {
          path: "m/44'/195'/0'/0/0",
          messageHex: '0x6578616d706c65206d657373616765',
          messageType: 'V2',
        },
      },
      {
        title: 'Sign Message V1 not support',
        value: {
          path: "m/44'/195'/0'/0/0",
          messageHex: '0x6578616d706c65206d657373616765',
          messageType: 'V1',
        },
      },
    ],
  },
  {
    method: 'tronSignTransaction',

    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/195'/0'/0/0",
          transaction: {
            refBlockBytes: 'ddf1',
            refBlockHash: 'd04764f22469a0b8',
            data: '0x0',
            feeLimit: 0,
            expiration: 1655692140000,
            timestamp: 1655692083406,
            contract: {
              transferContract: {
                toAddress: 'TXrs7yxQLNzig7J9EbKhoEiUp6kWpdWKnD',
                amount: 100,
              },
            },
          },
        },
      },
      {
        title: 'Sign Transaction TRC20',
        value: {
          path: "m/44'/195'/0'/0/0",
          transaction: {
            refBlockBytes: 'f37c',
            refBlockHash: 'aadfb347dabb84de',
            data: '0x0',
            feeLimit: 1000000,
            expiration: 1657770198000,
            timestamp: 1657770139291,
            contract: {
              triggerSmartContract: {
                contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
                data: 'a9059cbb000000000000000000000000f01fad0beb95a0a41cb1e68f384b33b846fe7d830000000000000000000000000000000000000000000000000000000000000001',
              },
            },
          },
        },
      },
      {
        title: 'Sign Transaction Stake',
        value: {
          path: "m/44'/195'/0'/0/0",
          transaction: {
            refBlockBytes: 'f37c',
            refBlockHash: 'aadfb347dabb84de',
            data: '0x0',
            feeLimit: 1000000,
            expiration: 1657770198000,
            timestamp: 1657770139291,
            contract: {
              freezeBalanceV2Contract: {
                frozenBalance: 100,
                resource: 0,
              },
            },
          },
        },
      },
      {
        title: 'Sign Transaction Unstake',
        value: {
          path: "m/44'/195'/0'/0/0",
          transaction: {
            refBlockBytes: 'f37c',
            refBlockHash: 'aadfb347dabb84de',
            data: '0x0',
            feeLimit: 1000000,
            expiration: 1657770198000,
            timestamp: 1657770139291,
            contract: {
              unfreezeBalanceV2Contract: {
                unfreezeBalance: 100,
                resource: 0,
              },
            },
          },
        },
      },
      {
        title: 'Sign Transaction Vote',
        value: {
          path: "m/44'/195'/0'/0/0",
          transaction: {
            refBlockBytes: 'f37c',
            refBlockHash: 'aadfb347dabb84de',
            feeLimit: 1000000,
            expiration: 1657770198000,
            timestamp: 1657770139291,
            contract: {
              voteWitnessContract: {
                votes: [
                  {
                    voteAddress: 'TXrs7yxQLNzig7J9EbKhoEiUp6kWpdWKnD',
                    voteCount: 100,
                  },
                ],
              },
            },
          },
        },
      },
      {
        title: 'Sign Transaction Cancel AllUnfreeze V2',
        value: {
          path: "m/44'/195'/0'/0/0",
          transaction: {
            refBlockBytes: 'f37c',
            refBlockHash: 'aadfb347dabb84de',
            feeLimit: 1000000,
            expiration: 1657770198000,
            timestamp: 1657770139291,
            contract: {
              cancelAllUnfreezeV2Contract: {},
            },
          },
        },
      },
    ],
  },
];

export default api;
