import type { TestCase } from './types';

export default {
  name: 'passphrase12-empty',
  passphrase: '',
  passphraseState: 'mpERhxif9Eaovvh3PfStVMDKrwCc8ELwS9',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649/passphrase-12',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qxcmtg5ynpglewg99tazga5ldg8meev65udzq8ytkknsp2ehs88lvux5enct3grg69z74jw626apjnscc8gqpxr7f2xqh4q87w',
    },
    {
      method: 'algoGetAddress',
      expectedAddress: 'H2YV7OSMNOGAE4ZZDE27SIPAV27AH6TMCTMEPKEOP23ACJHCXHFFFSQDKQ',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0xd5fe41294bfcc0a75d4ccfff0e9f0edfeb55655f55ab63709b2d574d685df896',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/0'/0'/0/0",
      },
      expectedAddress: '1BwB5Ccg2bpiaeDZVGe4C9ZfEaKsAdo5QP',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '3ABPiv2fTPqfxZ8FFGc9RwKVAqRHrLdGtq',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/84'/0'/0'/0/0",
      },
      expectedAddress: 'bc1qcaj8l36vx0hlc8j74kpdrkxue8t4ljf75cfxfe',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/86'/0'/0'/0/0",
      },
      expectedAddress: 'bc1pzqwafdyrw23ugksee8y509rkst4qjhzqqw8zmjdt6asx59y5amdsx53up4',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/3'/0'/0/0",
        coin: 'doge',
      },
      expectedAddress: 'DHHsFpmTCA2EpKhNRygBvgUmfm93m7Bank',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/145'/0'/0/0",
        coin: 'bch',
      },
      expectedAddress: 'bitcoincash:qztls2ggkjl85xkk5u7y7g3qdkeqzceum5g295yxyw',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'LWy9rHqqhzTm3Cr5S3K9zP1pFYeq6b8zkM',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'M8urAAuYSQRvziAo5CXnwGfpW3k5NZVnTT',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/84'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'ltc1qlsqhvkw8y65xuv089t8e7s0h2vny4cmuvte0p4',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aat74vz8k8f6m9mues4cfgd3785hmswjvu6jgbnh47',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1k786mn207hngdhena6zzcz9uvastmzu6dv4xfa',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'akash',
      },
      expectedAddress: 'akash1k786mn207hngdhena6zzcz9uvastmzu6qhcps8',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'cro',
      },
      expectedAddress: 'cro1k786mn207hngdhena6zzcz9uvastmzu64hal4v',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: 'fetch1k786mn207hngdhena6zzcz9uvastmzu673uzt2',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: 'osmo1k786mn207hngdhena6zzcz9uvastmzu69hxkl0',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'juno',
      },
      expectedAddress: 'juno1k786mn207hngdhena6zzcz9uvastmzu6m7kawp',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'terra',
      },
      expectedAddress: 'terra1k786mn207hngdhena6zzcz9uvastmzu6tg0xta',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'secret',
      },
      expectedAddress: 'secret1k786mn207hngdhena6zzcz9uvastmzu60fp05p',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: 'celestia1k786mn207hngdhena6zzcz9uvastmzu6uxykns',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0x6b0d57bF95EaBC628c4F75787F6C34E1557636A0',
    },
    {
      method: 'evmGetAddress',
      params: {
        path: "m/44'/61'/0'/0/0",
      },
      expectedAddress: '0x9ADe1Cc93E9d4314ba5CBbe5B18aBa8E12c343Ca',
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: 'f1awicce5q2wcromgudhsyjasfeigefak2cy2hb6q',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: 'kaspa:qza30x4puc9cdcrraeysextzjqdsfymvnw7cqq6gr6qps67yasg5ypgu85evv',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: '6ec13fd902ec7a5889306f11f9271016944f6fade5ee5c4f82a7b183e1d2afb3',
    },
    {
      method: 'nemGetAddress',
      expectedAddress: 'NANC2VUEPALSK5M3QURNHWBOFJ7HNVRDAG7HJXJC',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g5efrq0d0gp9s3zatjcrpcesvawxm588arnywwkley',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '15UazL3RuRbu9CQX55hZ74K2kQtKZwBoi1YPQTWPv5n7QxLE',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '5',
        network: 'astar',
      },
      expectedAddress: 'aQtHHkSpsyXvVRqbk6fzZe9yqbnqrLQeiK3UsiuEMkYpM88',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '2',
        network: 'kusama',
      },
      expectedAddress: 'H3uWK8Eg1MMTKDSt9Tbrrqt3PAugJSr5teedpnzqny5yaVv',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '126',
        network: 'joystream',
      },
      expectedAddress: 'j4VoCR32KvMqTYGqkPR6Ep4BsRAyFNXCqMTSLciZMo4uDsp9K',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'rGnrDDju6H3JGP8PAcnMs1JKioEba8iWs1',
    },
    {
      method: 'solGetAddress',
      expectedAddress: 'B5tqDNGk8kfdVwv3BMui6bSKnGwAe4hUchc86fjkfNTX',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '0x98c4cb28bb180d213799f01dc6568113',
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: 'GD6SWO2KIJS2K5PCA5EAYL2JHOCTGNPVPTLZAM4XGOAGXN7VCBHPZ543',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0x16edeeb71fc7dfb39a83c36df4db6972112ebdd9d09a6e082938d01d9bb65e90',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TVaY1kz1gqbyGETTaLTnrdhusVuiFCUNfR',
    },
  ],
} as TestCase;
