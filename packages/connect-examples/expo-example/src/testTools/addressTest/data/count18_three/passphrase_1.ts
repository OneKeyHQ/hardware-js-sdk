import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'three-passphrase18-密语1',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428114271',
  passphrase: 'fhsdkhf^&%#4366ghhj<<>>$$$',
  passphraseState: 'mkXCUesRyVY1hZCemmXxGqEne6Jc7u9LbY',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        0: 'addr1qyd2h62unwxgq7mdymq0xhh527yh4vpen59lanwy9l606zenfp5atx578pc4hufgmstq4p922mckv777nu8lwnkkcjmqltjjxy',
        30: 'addr1qyrjtu00d5ltctpkwcgnruujr5u9jrs08hf3lar4majx0daneejfxtcd7gk53pnpcq2pv74zvxgj0atrwjanncw37ugqlzewam',
        2147483647:
          'addr1q8ntwcqc0u4wf4mkhwyyl2nd3dts0frfgc2aa8ept7xra9vzst66cwkjwsjm5nah2ckrncuneq0hlp6qstrsx9nntdnsy0kgpj',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        0: 'BCYQOVCEJX3DIYHVLNKGQ7Y6PFTAEOGJCSA3GHGV4NKI7OSUOKLO2EEQCA',
        30: 'GMWBQCFRY2NTTTNGWEPMRYEZATTMYW3EW2ICHZTG73KLC5WBXEG3BFHUBI',
        2147483647: '4LPXKUSCLKXYMPHWLIO6IR2BWTRSCWG4OBLVFEV7COJJZUL5QNQZZRTC7A',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        0: '0xa15f15b47dbb2dd0f1f2ef66fdc4ee3b7ba49724124a24462101c83ebbc9bcdd',
        30: '0x97f9b4895e60fc8ac82cb3adb84cbffbcf3ce2ccd1352024307ad4c071511426',
        2147483647: '0x7781cd83251ee56db5b9fe522c1960def7ddd0ca29ad936c8cbdbe319e741bf8',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: `m/44'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '1KgvAJ6CA8BhzJK1d1CZ32FPTC4GwnrXiH',
        30: '1L3Y83yQbd3GotY54tNPjDQspMdU6M2WVq',
        2147483647: '1DPC99U7ebY883YMXhCwsyVSroaDrsY7TF',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: `m/49'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '3JpbbRQJUnJX3rUxurNo7U87kdZkCKXNQ2',
        30: '3P8yvu1f4ECAYq5oXNkFGo33ddfHmCFfXH',
        2147483647: '3QGFpyrux2QYgDccr9wqmdGFNzFAH4Qiux',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: `m/84'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: 'bc1qg7tkg6pey9gycfuawcj7f8xrzlnn8zsp9q8lvr',
        30: 'bc1q3ktdng0vmulrmhgcy8kx26fj9vvctqxca3kq9w',
        2147483647: 'bc1qvgm7nw80xvtttwlx9lkek54kvw7xr0994f9nm3',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: `m/86'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: 'bc1prtx6yta734ufuuez8pazd70el0d8ea2pr3h9cfk3c4uv28mx0kwq5q5452',
        30: 'bc1p4j95hpl8uq0wsg4wg7gzs2fe3k8zf2v8x7z5dqat4657a4fx2mmq0x8uek',
        2147483647: 'bc1phpjnmtl9sm33t9mswmf4attcphlk9hwl0eekwuymky3ll3lm47nqxy9afm',
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
        0: 'DLKT88bpefYArjEgDqzsnEgYq5g1ApwRcP',
        30: 'DRtRUZU3wh2KmWzshsDfvvcqt72oCWDnUR',
        2147483647: 'D7fH8cmMeAoVFi1N9FRhu844gHX8tMHQ3h',
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
        0: 'bitcoincash:qq43rrxpwa08zjza0vmcq0vrxycezxtaayxxumz49d',
        30: 'bitcoincash:qremaqqjs4uf8utx4kr3psfe8np4xhjfxs3lq8c9dc',
        2147483647: 'bitcoincash:qzgf4szfzl6m3ugrzm62kjf5gjq2up7mmq6c376n40',
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
        0: 'LPjpAAgnDXjScwuesv4JaVZGwVze7fyzT6',
        30: 'LLUhTKSez3LPtx2QTu3mCDGa2vtNd3skQb',
        2147483647: 'LPwEqh47KZGXRD8s6X3QnbehMGZYumx14g',
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
        0: 'MQNfoes3tZwYAvWSH9Ak5Qsh3UVER6H8g8',
        30: 'MTYA9it3xS9epBseKArBHfqE8GE4yrjMZC',
        2147483647: 'MLzQ9eBbAGwnYR4ZYrqhTrp1JJNtwP3yjT',
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
        0: 'ltc1qseqwnyhdm4qvf7y7kmcvnznnr86tkuzysn5g64',
        30: 'ltc1qw3azkf8ph7vjjtz70trd8t5fpq37ckja7aqnmu',
        2147483647: 'ltc1qppychmjy47rult6zslg0kr3udyghg0jz7qkaht',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        0: 'cfx:aaseu43u6fxtj0ut37evrysyfbaa172tz60dzx9d9w',
        30: 'cfx:aats7nn2f8pkhry5s54hxua220ar3rvb725a8k3w4y',
        2147483647: 'cfx:aaksmh7wkee4exz14sf4f0hygts7741hejes0t1d89',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        0: 'cosmos1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgr82vkj',
        30: 'cosmos1xrxvw8as7yhkevppk9xgegu4lxvwje5eszjsxd',
        2147483647: 'cosmos1hvcv8gnpwnueqtnznxpgct4z2u6lkgwn5gcspc',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        0: 'akash1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgwu8t0g',
        30: 'akash1xrxvw8as7yhkevppk9xgegu4lxvwje5eaelhlh',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        0: 'cro1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgmuz42r',
        30: 'cro1xrxvw8as7yhkevppk9xgegu4lxvwje5ege6f6u',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        0: 'fetch1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgs6rg59',
        30: 'fetch1xrxvw8as7yhkevppk9xgegu4lxvwje5erlm5y6',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        0: 'osmo1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgtueuqq',
        30: 'osmo1xrxvw8as7yhkevppk9xgegu4lxvwje5ecepqsl',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        0: 'juno1sy7tcq4nnnf9naxzg8fysg2cyumlxwwg44fh3w',
        30: 'juno1xrxvw8as7yhkevppk9xgegu4lxvwje5exs3tp3',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        0: 'terra1sy7tcq4nnnf9naxzg8fysg2cyumlxwwg9rsv5j',
        30: 'terra1xrxvw8as7yhkevppk9xgegu4lxvwje5ekxgsyd',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        0: 'secret1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgpz79tw',
        30: 'secret1xrxvw8as7yhkevppk9xgegu4lxvwje5ej8xem3',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        0: 'celestia1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgjdmuvl',
        30: 'celestia1xrxvw8as7yhkevppk9xgegu4lxvwje5epgrquq',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        0: '0x570959B3553927DCd0Ce93D5b0D9b99Cd1542EF0',
        30: '0xB297D2C8041B80A6197b2366Ba71F2B089281217',
        2147483647: '0xD115ee6CDe0Ef0b8e3236F9A24d28F54dAf70605',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: `m/44'/61'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '0x5331F8d30C027d0c7F18357eE8937DeE5D3c4E01',
        2147483647: '0x462f523204BfcbF14a9001EA76026962f10cEc10',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: `m/44'/61'/0'/0/${INDEX_MARK}`,
      },
      expectedAddress: {
        0: '0x5331F8d30C027d0c7F18357eE8937DeE5D3c4E01',
        2147483647: '0x8AC544c303F8eCaB3fC302695A15fda38aca1e26',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        0: 'f15hyyr32f43k6s56qrjhvehnxxp7v57mrdbqwibi',
        30: 'f14ugx3jcrsptsz3cx4db73klgtjxfwwlslmshbkq',
        2147483647: 'f1upeklatdiiob5dz4mnywqmu7lm6hymizxtgnzmi',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        0: 'kaspa:qpd5hrfac9v37xxsg37g3kcdddaangaf4hesanvv9f2hnuftemw9vx04dc52c',
        30: 'kaspa:qptfnl5qx88hr452dk3lrqe4ajhpstwkkj66u8weg5arkdrnalpvc42xalxly',
        2147483647: 'kaspa:qqx65x93v56engphef5tpsez4n3wt92xpxdu0d27vrgc6tvtfd7070emqmana',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        0: 'e0d6b78740262aa704f507cfc33dc1131256cd5355460ff52a6a2fe9a949ea55',
        30: 'e91a09126acf0c05e8a65322bf36fa20ebf13cbe7e4ba09e481b889d2083819f',
        2147483647: '106f30cdd79053b99796aa58e5876ab34c79dadefdf85a47e034af4a4ecee518',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        0: 'NC3K362JORSWTMWCJWHCDOVZTWLJJDALOYOC6J3P',
        30: 'NASZUAPZCA5U2DWNBGMYNVOORBENRCH4PEF5PNDO',
        2147483647: 'NBGZHDQSN64AMQ5666CK5AV2DXJD3FCQOKVB6AUB',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        0: 'nexa:nqtsq5g5cet2qn2x40gu552rra356qgt2duzmqpxv57kd9we',
        30: 'nexa:nqtsq5g5meflv9hkvr3het3lddlpqcfkv8sfxrctpmpdqgk2',
        2147483647: 'nexa:nqtsq5g52n56a54lvf58wp4x8avsu94eckt7fw0mzw3xej3k',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        0: '15qYhNQ88zziabtRG1P9G8ctX7N5o7ZPYdTsaLsPVpkHnQDK',
        30: '12MXmDUo4suC1TknwDWU4QKoQVG7TMuaPsc4BTcmhWABpJp8',
        2147483647: '1SRw3u362aX2m1D8im3SocvKtJFBFBeGziicrA5uDDRjMZ4',
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
        0: 'amqzL794TNMMtujnfnG9dx1kY5Z52hzVLEXem5tp6ijC5Ls',
        2147483647: 'WNjE1c41Ux9p42XfPAALJx3ZK1iTALFDhVNhGNbDVBs912F',
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
        0: 'HQsDMUvuakAtihM559C1w9jp5efuUpRvWa8oi9zRXwGMAmh',
        2147483647: 'D1kT2yqrcKyLsp8wnX6Cc9mcraqHcSgespyrDSgpvQQHit3',
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
        0: 'j4WAA85P29wEGygKeaLmpy8VjBsT1bhaRC5MpnbvMNosQFZD3',
        2147483647: 'j4Rm3Mksw6xp5RqSST49j9oVkzePAyqCfvScfq7D3nCLYC8ek',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        0: 'rLuE79ZERXu5eQNSgRm7KkQ1gTdFV5YCcs',
        2147483647: 'r49Ptaw8DpwP3zZaTyxXL4GEqxGW7wd5QF',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        0: '5iinGEhrwhw3o4Hi7BdLzrKMsMhuxfi6WQcDLk2BEJTx',
        30: 'GRzcfsR3AgvddgWoMRBcyY4LQaVu8CWz64p8NbVwkSDc',
        2147483647: '9TT11adSztAECWttwSCd66C2oC4f3rmqwrFFCu3itosZ',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        0: '0x8096a9555942b6525c2abe9d4cec7105',
        30: '0x21adc575d4a2cd8fe97e338321534ff9',
        2147483647: '0x4b9c6b1509157fef6bb7d85b7a46c545',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        0: 'GBJ5MVTOQRSBBQR3UGUEAPTD2LCZ3LUC6DKPCKNVVZTGSDHVI3VBPB4Z',
        30: 'GD2Z4FSG4O3FFOTWJ5BEEVJIFL3BXHSMDYGQ7XSFISVTL3E3KUNKEX4Y',
        2147483647: 'GAX4FBMQKVWO2KKS3SGEIYWTMM3HIPTNH74DGBLNU2LBFTRNSSEJ6NIO',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        0: '0x6fbe51414abaeeabdf227a2f93c9db89605aa1a6585268fd06f164859172d4fa',
        30: '0x8d304a6bf0184e6e277c914b80a146fccd3c45beac98567091fa3651aab5c6d2',
        2147483647: '0x9ad1b7d2c0cd0106141cce49034ad39639963ddaf289bb9b025c02a59ab30e73',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        0: 'TN5feHMrq2RbdpGoSL4Tc5VYnGxwBdpJSv',
        30: 'TXZdykuDznFqXDANWoxssPCSavwmMmasb4',
        2147483647: 'TBzaCCL1tFkncWwMdvgiC9R1V76VW59pEB',
      },
    },
  ],
} as AddressTestCaseData;
