import type { TestCase } from './types';

export default {
  name: 'unsafe-passphrase-12',
  passphrase: 'aabb',
  passphraseState: 'n42AqiHxSnYkcrJXZjfGWxggXoCqa9Kxwm',
  description: '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/218726488',
  data: [
    {
      method: 'algoGetAddress',
      expectedAddress: 'ZZPUL4LEABN4XXLOMHTGMUD6TXSFRN2XUPSWOMOXEZ5WOSMTGZDCWVBVLM',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/0'/0'/0/0",
      },
      expectedAddress: '13oqySYYkAgoPc29qPj4jNezGXZEyKHzGg',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '3HiSbuGFJ5zEyeKgQq9CQh5YYTkVeezoLX',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/84'/0'/0'/0/0",
      },
      expectedAddress: 'bc1q8mlr84kyl390weqtxv63k4aq9pzrven99j6fkx',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/86'/0'/0'/0/0",
      },
      expectedAddress: 'bc1px6znzrmfuxfvevuvtkgdwye999dg2vmfvzc53eytak90ghva9fyqknpl8w',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/3'/0'/0/0",
        coin: 'doge',
      },
      expectedAddress: 'DTKhZmXT1xNR4Kbcdb5LvksK97ryEA2Z7U',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/145'/0'/0/0",
        coin: 'bch',
      },
      expectedAddress: 'bitcoincash:qpyuttga9llp8pvlcpdv0weggdfngszd9sm44st668',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'LbyGj6XMxMmXMHksLmz8oviK187DV73TBC',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'MTdY1fcKJnGroJB9zAsRGWkDc61RCxjwmr',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/84'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'ltc1qauhxjntfzz0kunn4yln8wj3gtrtz8w779dwcxg',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1q9ltp9tg050csesd0v3j39hg78htp7yqeh57dprzkqww3h6hfkehqha339x2574lmnzr9l833f0xr34pd5gnrrjyw84q4n32z9',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aapd4v4em9zs6ztcmj4g06wx4p9zu20jrpgekbpb5p',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1vjkm5uqkfdxaqtu04gkwtfmgqw7x2y2z8nrrzv',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'akash',
      },
      expectedAddress: 'akash1vjkm5uqkfdxaqtu04gkwtfmgqw7x2y2z2gwymk',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'cro',
      },
      expectedAddress: 'cro1vjkm5uqkfdxaqtu04gkwtfmgqw7x2y2zlgt67a',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: 'fetch1vjkm5uqkfdxaqtu04gkwtfmgqw7x2y2z5w28qm',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: 'osmo1vjkm5uqkfdxaqtu04gkwtfmgqw7x2y2z0gsn57',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'juno',
      },
      expectedAddress: 'juno1vjkm5uqkfdxaqtu04gkwtfmgqw7x2y2z3pqc9s',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'terra',
      },
      expectedAddress: 'terra1vjkm5uqkfdxaqtu04gkwtfmgqw7x2y2zpherqv',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'secret',
      },
      expectedAddress: 'secret1vjkm5uqkfdxaqtu04gkwtfmgqw7x2y2z9kh2ls',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: 'celestia1vjkm5uqkfdxaqtu04gkwtfmgqw7x2y2zkejncp',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0x38DdEca9073c207FA252A85DE37c7d61A40FbE15',
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: 'f1w2m3pqt7biyopweah3hqsjkhxdxfv3tx5bij5ri',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: 'kaspa:qrj2h6xn8v50htfg9k4fpfg663y9tvvkce224aa2s622frm058p86lxc3e4qh',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: '026938fa8d99d6ce2f441360605b0e58acdbc077b14fdbdce2cb12550953a101',
    },
    {
      method: 'nemGetAddress',
      expectedAddress: 'NAEW36OEODAQT44FJA62MA324F7KYWHY6PVQMRHF',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g5vdhhsywnhgcw0q7079wjtzkg3yqydu9d46mps448',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '136N7fzaS8kfDYhviS9XcYy8Go2VUFUPW2RYVM1EisSMHAyV',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '2',
        network: 'kusama',
      },
      expectedAddress: 'Efgdf5PCiW7XfWrXVuaNMVyZmK5acjRsuXoiiHqeadKqk4o',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '5',
        network: 'astar',
      },
      expectedAddress: 'Y2fQdhbMb8HzqjFF6YeW4JFWDjxkAczSjCCZmDk39QngqKh',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '126',
        network: 'joystream',
      },
      expectedAddress: 'j4TQyYNyUT4zDcd9A2mYDKYqxwZ7RGqVR9UKVhc4CbrZTk852',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'rJBGZT41LK4xAwRoWKGZTqU163n4VYVCPa',
    },
    {
      method: 'solGetAddress',
      expectedAddress: '8obi3RVwkVm7Vtd8bF9EmNzihtiEEXAKMJ7ZtYK7scA',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '0x0b9446fcc99f046886be30ead3f5e56c',
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: 'GDLIMLLISQ3Z5VGD3LY7TI2QJBQTASP5O472EGWSU3VVDNUDHXSNSIM2',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0x27c692a029bbad21a9ed3fd3beb326fe2be1560960c852d27514fd21889613be',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TUVFDxi6iXUcYsWGjctUodPY8GVhDKqcsa',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0x9ba747ba92a1ac0725511a18ab50d8ab78a6413931ebc3b2a136dbffece8f597',
    },
  ],
} as TestCase;
