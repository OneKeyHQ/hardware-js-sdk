import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'passphrase12-empty',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649/passphrase-12',
  passphrase: '',
  passphraseState: 'mpERhxif9Eaovvh3PfStVMDKrwCc8ELwS9',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        0: 'addr1qxcmtg5ynpglewg99tazga5ldg8meev65udzq8ytkknsp2ehs88lvux5enct3grg69z74jw626apjnscc8gqpxr7f2xqh4q87w',
        1: 'addr1q9h2kd4dlc9q8hu7y4jwp7rr23eawk4knt5nam4n992afh03mht73lfx4c72f56z4zdn0up7sm09sf4kt7e7cdcycw0qzwc7h2',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        0: 'H2YV7OSMNOGAE4ZZDE27SIPAV27AH6TMCTMEPKEOP23ACJHCXHFFFSQDKQ',
        1: 'SHBPGWIQA2K5EA2YWZA5C3DMLDDWF3X4SI6H6OHC3EJMHF7GY3F5WBUPTE',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        0: '0xd5fe41294bfcc0a75d4ccfff0e9f0edfeb55655f55ab63709b2d574d685df896',
        1: '0x836121416600e37846b420dbcaf518d4b5c91a0fad0fbf17d65c01346e7289f5',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: `m/44'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '1BwB5Ccg2bpiaeDZVGe4C9ZfEaKsAdo5QP',
        1: '1A9PrrHTndPdmU95eF3GF96s7oeUFDsNN9',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: `m/49'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '3ABPiv2fTPqfxZ8FFGc9RwKVAqRHrLdGtq',
        1: '3BzeLyighXkD1h1rnjUG5iphFDSFaAFxfX',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: `m/84'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: 'bc1qcaj8l36vx0hlc8j74kpdrkxue8t4ljf75cfxfe',
        1: 'bc1qa6sz3kz7xgrk3uhmhhpd729wssd0xv8h395sxu',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: `m/86'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: 'bc1pzqwafdyrw23ugksee8y509rkst4qjhzqqw8zmjdt6asx59y5amdsx53up4',
        1: 'bc1pzvu58wyvsalnrj0v5dla7vgpg4su9xa4c4khncdjmmu49v2zv09snd5unu',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Doge',
      params: {
        path: `m/44'/3'/${INDEX_MARK}'/0/0`,
        coin: 'doge',
      },
      expectedAddress: {
        0: 'DHHsFpmTCA2EpKhNRygBvgUmfm93m7Bank',
        1: 'DQnGi5jAZZD24y1XV1aEPomeEAxgaochvB',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-BCH',
      params: {
        path: `m/44'/145'/${INDEX_MARK}'/0/0`,
        coin: 'bch',
      },
      expectedAddress: {
        0: 'bitcoincash:qztls2ggkjl85xkk5u7y7g3qdkeqzceum5g295yxyw',
        1: 'bitcoincash:qqkh3rpecqewewlukwulw52ecprfwt5nd5astx8hz3',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Legacy',
      params: {
        path: `m/44'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'LWy9rHqqhzTm3Cr5S3K9zP1pFYeq6b8zkM',
        1: 'Lb1BVsiownwH2uYQ7A75qX3oG7aViNizVJ',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: `m/49'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'M8urAAuYSQRvziAo5CXnwGfpW3k5NZVnTT',
        1: 'MDWL3esB1iFQJpqJ18dvL6U1hoHSfQ5LTn',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: `m/84'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'ltc1qlsqhvkw8y65xuv089t8e7s0h2vny4cmuvte0p4',
        1: 'ltc1qq3484hw7dtgen8qf47ekz736spndnrlryl4e3y',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        0: 'cfx:aat74vz8k8f6m9mues4cfgd3785hmswjvu6jgbnh47',
        1: 'cfx:aan4mfmvpnszpdew9kz88v6mjvvwd39twuw92z8hag',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        0: 'cosmos1k786mn207hngdhena6zzcz9uvastmzu6dv4xfa',
        1: 'cosmos1934m0rl4y7wgv35hc20drfc7ytac5ufedzr0hs',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        0: 'akash1k786mn207hngdhena6zzcz9uvastmzu6qhcps8',
        1: 'akash1934m0rl4y7wgv35hc20drfc7ytac5ufeqewgw2',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        0: 'cro1k786mn207hngdhena6zzcz9uvastmzu64hal4v',
        1: 'cro1934m0rl4y7wgv35hc20drfc7ytac5ufe4etktp',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        0: 'fetch1k786mn207hngdhena6zzcz9uvastmzu673uzt2',
        1: 'fetch1934m0rl4y7wgv35hc20drfc7ytac5ufe7l2t48',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        0: 'osmo1k786mn207hngdhena6zzcz9uvastmzu69hxkl0',
        1: 'osmo1934m0rl4y7wgv35hc20drfc7ytac5ufe9eslpz',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        0: 'juno1k786mn207hngdhena6zzcz9uvastmzu6m7kawp',
        1: 'juno1934m0rl4y7wgv35hc20drfc7ytac5ufemsq5sv',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        0: 'terra1k786mn207hngdhena6zzcz9uvastmzu6tg0xta',
        1: 'terra1934m0rl4y7wgv35hc20drfc7ytac5ufetxe04s',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        0: 'secret1k786mn207hngdhena6zzcz9uvastmzu60fp05p',
        1: 'secret1934m0rl4y7wgv35hc20drfc7ytac5ufe08hx2v',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        0: 'celestia1k786mn207hngdhena6zzcz9uvastmzu6uxykns',
        1: 'celestia1934m0rl4y7wgv35hc20drfc7ytac5ufeugjlda',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        0: '0x6b0d57bF95EaBC628c4F75787F6C34E1557636A0',
        1: '0x0A37CfC3b4BceB44F2FCD203B1F6Cd1F2F47503B',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: `m/44'/61'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '0x9ADe1Cc93E9d4314ba5CBbe5B18aBa8E12c343Ca',
        1: '0x7eb5B989f6F082D8B1718aE37334612Ea5275A78',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: `m/44'/61'/0'/0/${INDEX_MARK}`,
      },
      expectedAddress: {
        0: '0x9ADe1Cc93E9d4314ba5CBbe5B18aBa8E12c343Ca',
        1: '0xE5F2Fad605F4FB38225a56A03062aB34cCb92EF7',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        0: 'f1awicce5q2wcromgudhsyjasfeigefak2cy2hb6q',
        1: 'f1ttafmbemigfz4fgttm52sc7qafpy6qhlhdbuuuq',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        0: 'kaspa:qza30x4puc9cdcrraeysextzjqdsfymvnw7cqq6gr6qps67yasg5ypgu85evv',
        1: 'kaspa:qpsdm6590wz9av5snxcy7ukagv49zaawz826waftu23ktum8e83425n80dntr',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        0: '6ec13fd902ec7a5889306f11f9271016944f6fade5ee5c4f82a7b183e1d2afb3',
        1: '1708142a0e85217f657089267e29c37d6984212451c0b22c4b06f69d85838afb',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        0: 'NANC2VUEPALSK5M3QURNHWBOFJ7HNVRDAG7HJXJC',
        1: 'NDMO7J4ADICHDGLMY323MGJBBNV6VKZWV634UVFO',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        0: 'nexa:nqtsq5g5efrq0d0gp9s3zatjcrpcesvawxm588arnywwkley',
        1: 'nexa:nqtsq5g58glsng8eyx6e07va07fz70dgwzg8gafz08mvvm92',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        0: '15UazL3RuRbu9CQX55hZ74K2kQtKZwBoi1YPQTWPv5n7QxLE',
        1: '13XQPTm53kzTjWcxSh8kbhkDbBbWndoaRCfZvAiGFFbt2NZT',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-astar',
      params: {
        prefix: '5',
        network: 'astar',
      },
      expectedAddress: {
        0: 'aQtHHkSpsyXvVRqbk6fzZe9yqbnqrLQeiK3UsiuEMkYpM88',
        1: 'YThgRU5yDN6WoeGyMXsVD5LpcJz4YxBMuSDzavmZXaKS6hP',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-kusama',
      params: {
        prefix: '2',
        network: 'kusama',
      },
      expectedAddress: {
        0: 'H3uWK8Eg1MMTKDSt9Tbrrqt3PAugJSr5teedpnzqny5yaVv',
        1: 'F6iuSqspLjv3dRtFktoMWH4t9t6u14co5mq9XzsAxnrawnn',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-joystream',
      params: {
        prefix: '126',
        network: 'joystream',
      },
      expectedAddress: {
        0: 'j4VoCR32KvMqTYGqkPR6Ep4BsRAyFNXCqMTSLciZMo4uDsp9K',
        1: 'j4Tr1pAjy4hE28b4Bm2XSJhd4FwgSbDpc4eZX8RmE8EizVHKy',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        0: 'rGnrDDju6H3JGP8PAcnMs1JKioEba8iWs1',
        1: 'rf2PXE1fxTStgUjFiiUKXVeS1jCa6v1JuY',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        0: 'B5tqDNGk8kfdVwv3BMui6bSKnGwAe4hUchc86fjkfNTX',
        1: '38s2HV7P7nCu3C8abU2yqjUhK2GS7bVjzLEc6RTwhhgm',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        0: '0x98c4cb28bb180d213799f01dc6568113',
        1: '0x8bdb61e0a53d6747380fd60587d45e31',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        0: 'GD6SWO2KIJS2K5PCA5EAYL2JHOCTGNPVPTLZAM4XGOAGXN7VCBHPZ543',
        1: 'GBO7RNYUDJNRKY3G5TTJIPDXK2DJ2K5T6TWUWNBHH2AZPL4T4ZEX6XIZ',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        0: '0x16edeeb71fc7dfb39a83c36df4db6972112ebdd9d09a6e082938d01d9bb65e90',
        1: '0xd59b70f522fbf09f6c4a5bb36ad2dddd30dda50b5261405745ff2452390d7e3b',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        0: 'TVaY1kz1gqbyGETTaLTnrdhusVuiFCUNfR',
        1: 'TYxrJuywFChf4HzXjmQE1FPmBrAx7ZKGJH',
      },
    },
  ],
} as AddressTestCaseData;
