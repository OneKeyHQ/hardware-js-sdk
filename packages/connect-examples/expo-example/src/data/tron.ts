import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'tronGetAddress',
    description: 'Get address',
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
    description: 'Sign Message',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/195'/0'/0/0",
          messageHex: '0x6578616d706c65206d657373616765',
        },
      },
    ],
  },
  {
    method: 'tronSignTransaction',
    description: 'Sign Transaction',
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
    ],
  },
];

export default api;
