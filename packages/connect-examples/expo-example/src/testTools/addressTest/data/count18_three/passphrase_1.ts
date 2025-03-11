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
        '0': 'addr1qyd2h62unwxgq7mdymq0xhh527yh4vpen59lanwy9l606zenfp5atx578pc4hufgmstq4p922mckv777nu8lwnkkcjmqltjjxy',
        '1': 'addr1q8c3nuvsa22fgg5ch7faya0s02pwfljyq48jhcq65s8hmgg5spej4gdghwvzxasy50wpccvjfvp8nffucwpl5kcnr4tqqn09du',
        '30': 'addr1qyrjtu00d5ltctpkwcgnruujr5u9jrs08hf3lar4majx0daneejfxtcd7gk53pnpcq2pv74zvxgj0atrwjanncw37ugqlzewam',
        '2147483646':
          'addr1qycz3h5wcq35zygzjyt9h7dlvaqqdhdt03d84xp40auku75egfrxc2ry44ywm66m2pfl5tyxla8znmuxs52xmcpa7lpszcrk6h',
        '2147483647':
          'addr1q8ntwcqc0u4wf4mkhwyyl2nd3dts0frfgc2aa8ept7xra9vzst66cwkjwsjm5nah2ckrncuneq0hlp6qstrsx9nntdnsy0kgpj',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'BCYQOVCEJX3DIYHVLNKGQ7Y6PFTAEOGJCSA3GHGV4NKI7OSUOKLO2EEQCA',
        '1': 'RGYWMCATDJXTK72OCUNXJ2UV6W5AQWPXK3PAGJHT4FPPSAY3RY6BFAUU6Y',
        '30': 'GMWBQCFRY2NTTTNGWEPMRYEZATTMYW3EW2ICHZTG73KLC5WBXEG3BFHUBI',
        '2147483646': 'EQBLW46RLARETYKKGXZQ2ABYN5DUTNAQBSR5S5PAJKG4FBI4RKBODRK6P4',
        '2147483647': '4LPXKUSCLKXYMPHWLIO6IR2BWTRSCWG4OBLVFEV7COJJZUL5QNQZZRTC7A',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xa15f15b47dbb2dd0f1f2ef66fdc4ee3b7ba49724124a24462101c83ebbc9bcdd',
        '1': '0x28cf0fe5fe04264acb739772333d2ed7289c5871f631a03492424d1dd8de5d50',
        '30': '0x97f9b4895e60fc8ac82cb3adb84cbffbcf3ce2ccd1352024307ad4c071511426',
        '2147483646': '0x843585d05c4b16009b76ac56f2e6fb23bd24dc8d4a12e9f920935e4e969738b4',
        '2147483647': '0x7781cd83251ee56db5b9fe522c1960def7ddd0ca29ad936c8cbdbe319e741bf8',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1KgvAJ6CA8BhzJK1d1CZ32FPTC4GwnrXiH',
        '1': '1HCpjDgfejrzoukduumQwwCDv5pZcpBd2d',
        '30': '1L3Y83yQbd3GotY54tNPjDQspMdU6M2WVq',
        '2147483646': '192bvXfpUXsU2vSsb3hzT65gi4o5NWCvV9',
        '2147483647': '1DPC99U7ebY883YMXhCwsyVSroaDrsY7TF',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3JpbbRQJUnJX3rUxurNo7U87kdZkCKXNQ2',
        '1': '39y38p2VT3rYfoxhEDGYXwWu53eJio9bk4',
        '30': '3P8yvu1f4ECAYq5oXNkFGo33ddfHmCFfXH',
        '2147483646': '3E9FphBzB1S6PmrMdwfqweymiz6RZeDrXR',
        '2147483647': '3QGFpyrux2QYgDccr9wqmdGFNzFAH4Qiux',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qg7tkg6pey9gycfuawcj7f8xrzlnn8zsp9q8lvr',
        '1': 'bc1qkuwdu6cefk3t73dqyrjng4skfkjtatg9uu6gvx',
        '30': 'bc1q3ktdng0vmulrmhgcy8kx26fj9vvctqxca3kq9w',
        '2147483646': 'bc1qlf2ys037ulkxz3p3acvqg4rpask9yk6x88evpw',
        '2147483647': 'bc1qvgm7nw80xvtttwlx9lkek54kvw7xr0994f9nm3',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1prtx6yta734ufuuez8pazd70el0d8ea2pr3h9cfk3c4uv28mx0kwq5q5452',
        '1': 'bc1pv4rr8ucdavcmglzpx658l42vmw3ungarw7r2e52qmccnv2n665fqv8upzc',
        '30': 'bc1p4j95hpl8uq0wsg4wg7gzs2fe3k8zf2v8x7z5dqat4657a4fx2mmq0x8uek',
        '2147483646': 'bc1p5ct63a6nhcg74c7c0eys6wfa8epm3vs3eqfnsv80khpgnd7xswdqx7sfkv',
        '2147483647': 'bc1phpjnmtl9sm33t9mswmf4attcphlk9hwl0eekwuymky3ll3lm47nqxy9afm',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Doge',
      params: {
        path: "m/44'/3'/$$INDEX$$'/0/0",
        coin: 'doge',
      },
      expectedAddress: {
        '0': 'DLKT88bpefYArjEgDqzsnEgYq5g1ApwRcP',
        '1': 'DFJgrgTFwmCemubjawPe5gCWfUGQR1e662',
        '30': 'DRtRUZU3wh2KmWzshsDfvvcqt72oCWDnUR',
        '2147483646': 'DEaHLKeGjkBz38Hckf9ZatwFniZem3JjLZ',
        '2147483647': 'D7fH8cmMeAoVFi1N9FRhu844gHX8tMHQ3h',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-BCH',
      params: {
        path: "m/44'/145'/$$INDEX$$'/0/0",
        coin: 'bch',
      },
      expectedAddress: {
        '0': 'bitcoincash:qq43rrxpwa08zjza0vmcq0vrxycezxtaayxxumz49d',
        '1': 'bitcoincash:qrfj2sangczjvg6m98lx6de0hm85xpjy7vpfg7k73d',
        '30': 'bitcoincash:qremaqqjs4uf8utx4kr3psfe8np4xhjfxs3lq8c9dc',
        '2147483646': 'bitcoincash:qzj6l2apg9qhh4u64f563wk8ksp3t6mm6qnr788wn0',
        '2147483647': 'bitcoincash:qzgf4szfzl6m3ugrzm62kjf5gjq2up7mmq6c376n40',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Legacy',
      params: {
        path: "m/44'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'LPjpAAgnDXjScwuesv4JaVZGwVze7fyzT6',
        '1': 'LL287MytyGSj57AGLJstwn5bWh7g3PdfcC',
        '30': 'LLUhTKSez3LPtx2QTu3mCDGa2vtNd3skQb',
        '2147483646': 'LVTcSfk6H4Hcjwjpw7vW5Bgz4BvBu2vpcV',
        '2147483647': 'LPwEqh47KZGXRD8s6X3QnbehMGZYumx14g',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: "m/49'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'MQNfoes3tZwYAvWSH9Ak5Qsh3UVER6H8g8',
        '1': 'MQRP5VNM7mbxjTYWUymcBLcXQw9x8RS3t7',
        '30': 'MTYA9it3xS9epBseKArBHfqE8GE4yrjMZC',
        '2147483646': 'MPmjq9Tq6cT5WbpDZZZnPKaLmgvs25UuuH',
        '2147483647': 'MLzQ9eBbAGwnYR4ZYrqhTrp1JJNtwP3yjT',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: "m/84'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'ltc1qseqwnyhdm4qvf7y7kmcvnznnr86tkuzysn5g64',
        '1': 'ltc1q6rgrcn2del9tdkyp7k3m9ywvhvx05tr8lyvdrh',
        '30': 'ltc1qw3azkf8ph7vjjtz70trd8t5fpq37ckja7aqnmu',
        '2147483646': 'ltc1qluagfewqn002yfeslhfvu3rqy29e30uure9edw',
        '2147483647': 'ltc1qppychmjy47rult6zslg0kr3udyghg0jz7qkaht',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Neurai',
      params: {
        path: "m/44'/1900'/$$INDEX$$'/0/0",
        coin: 'neurai',
      },
      expectedAddress: {
        '0': 'NTMVf5hXbsZ5gtX967gJ23BPhDD9FMyDZn',
        '1': 'NMaJnXAANpWjM2Jggg7RLU3eKQnWb1jxx1',
        '30': 'Nj1fCNuX3WTvwfDRipUpHBmwcDMPW1vf31',
        '2147483646': 'NSnvjJTiVVh1m8T5qjRkaWJL4bFyZtYqDP',
        '2147483647': 'NXx3TNQ2jjWakkff13i1BJTHLhWvqSmEkD',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqweyaqp6nr7a0q6k7c5h08sw5fnlvm5h7qtr6kyg',
        '1': 'ckb1qyqt9hg829g8l00a4mst0fwfvdwl8kneavrq65w509',
        '30': 'ckb1qyqf35z9qkevdkluvl0frzshw72rspstqk9qqrmtzm',
        '2147483646': 'ckb1qyqr4rwmmhfcd4a0825dszptx04wnfr8uyqsw7hjw8',
        '2147483647': 'ckb1qyqz8vcl0s304ug3w0zzzv9v4z80wg6jh5nqdtt7en',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aaseu43u6fxtj0ut37evrysyfbaa172tz60dzx9d9w',
        '1': 'cfx:aamv1ufj2p5xxtjfn6rnsyazrbmffzfhgax6xcrhas',
        '30': 'cfx:aats7nn2f8pkhry5s54hxua220ar3rvb725a8k3w4y',
        '2147483646': 'cfx:aas4xgswgf3sgry3ut9vfxh1r6hbpe7gc676x857ak',
        '2147483647': 'cfx:aaksmh7wkee4exz14sf4f0hygts7741hejes0t1d89',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgr82vkj',
        '1': 'cosmos1u4sf7aqzz2s8hpetg2sfy2sscuacydfj340zh7',
        '30': 'cosmos1xrxvw8as7yhkevppk9xgegu4lxvwje5eszjsxd',
        '2147483646': 'cosmos1qcygz58sq8zpmdges2vvw2fz0g5x4ulzw85sjd',
        '2147483647': 'cosmos1hvcv8gnpwnueqtnznxpgct4z2u6lkgwn5gcspc',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgwu8t0g',
        '1': 'akash1u4sf7aqzz2s8hpetg2sfy2sscuacydfjuwz9wy',
        '30': 'akash1xrxvw8as7yhkevppk9xgegu4lxvwje5eaelhlh',
        '2147483646': 'akash1qcygz58sq8zpmdges2vvw2fz0g5x4ulzruehth',
        '2147483647': 'akash1hvcv8gnpwnueqtnznxpgct4z2u6lkgwnen4hcz',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgmuz42r',
        '1': 'cro1u4sf7aqzz2s8hpetg2sfy2sscuacydfjfw8mt0',
        '30': 'cro1xrxvw8as7yhkevppk9xgegu4lxvwje5ege6f6u',
        '2147483646': 'cro1qcygz58sq8zpmdges2vvw2fz0g5x4ulzkuufwu',
        '2147483647': 'cro1hvcv8gnpwnueqtnznxpgct4z2u6lkgwnvnsfaf',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgs6rg59',
        '1': 'fetch1u4sf7aqzz2s8hpetg2sfy2sscuacydfjzgxx4f',
        '30': 'fetch1xrxvw8as7yhkevppk9xgegu4lxvwje5erlm5y6',
        '2147483646': 'fetch1qcygz58sq8zpmdges2vvw2fz0g5x4ulza6a5s6',
        '2147483647': 'fetch1hvcv8gnpwnueqtnznxpgct4z2u6lkgwn8435r0',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgtueuqq',
        '1': 'osmo1u4sf7aqzz2s8hpetg2sfy2sscuacydfjewujpv',
        '30': 'osmo1xrxvw8as7yhkevppk9xgegu4lxvwje5ecepqsl',
        '2147483646': 'osmo1qcygz58sq8zpmdges2vvw2fz0g5x4ulzxu8qyl',
        '2147483647': 'osmo1hvcv8gnpwnueqtnznxpgct4z2u6lkgwnuntqh2',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1sy7tcq4nnnf9naxzg8fysg2cyumlxwwg44fh3w',
        '1': 'juno1u4sf7aqzz2s8hpetg2sfy2sscuacydfj88vesz',
        '30': 'juno1xrxvw8as7yhkevppk9xgegu4lxvwje5exs3tp3',
        '2147483646': 'juno1qcygz58sq8zpmdges2vvw2fz0g5x4ulzc4ht43',
        '2147483647': 'juno1hvcv8gnpwnueqtnznxpgct4z2u6lkgwnz6mtxy',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1sy7tcq4nnnf9naxzg8fysg2cyumlxwwg9rsv5j',
        '1': 'terra1u4sf7aqzz2s8hpetg2sfy2sscuacydfjh34z47',
        '30': 'terra1xrxvw8as7yhkevppk9xgegu4lxvwje5ekxgsyd',
        '2147483646': 'terra1qcygz58sq8zpmdges2vvw2fz0g5x4ulzgrwssd',
        '2147483647': 'terra1hvcv8gnpwnueqtnznxpgct4z2u6lkgwnjvzsrc',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgpz79tw',
        '1': 'secret1u4sf7aqzz2s8hpetg2sfy2sscuacydfjnsmt2z',
        '30': 'secret1xrxvw8as7yhkevppk9xgegu4lxvwje5ej8xem3',
        '2147483646': 'secret1qcygz58sq8zpmdges2vvw2fz0g5x4ulzvzqe03',
        '2147483647': 'secret1hvcv8gnpwnueqtnznxpgct4z2u6lkgwnkdveuy',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgjdmuvl',
        '1': 'celestia1u4sf7aqzz2s8hpetg2sfy2sscuacydfjql7jdn',
        '30': 'celestia1xrxvw8as7yhkevppk9xgegu4lxvwje5epgrquq',
        '2147483646': 'celestia1qcygz58sq8zpmdges2vvw2fz0g5x4ulzld9qgq',
        '2147483647': 'celestia1hvcv8gnpwnueqtnznxpgct4z2u6lkgwn9zfqm4',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwoT1UxKfuZBqqGvJ2vDE5B6VUzf9ksv99XM9kCoZXaLgCJMEwZKNaZLcbfrmSiwEcS2jDgu6J3fJh1AAqBV3EPx2RzBZSJCX',
        '1': 'XwohtD1rCuugBYLg2yAHWt2sqtqAM2RNy2iWzGq49r6g2jMXAtjPTNSLjNS7yhvBTRg3eoW6Nh2nDieLchkMuCJJ2pDA7RDcP',
        '30': 'XwnR6Eyb4eufRwe1FVeAKF66PMEWF3tsJACVgjbuyPBYGo2gThHejEw43ecEdgqV5y9MMtGZr7t85TBRrGe12bV51NZYnWLvp',
        '2147483646':
          'Xwojc1fHHH1RuixZukLwMpQ6xHETS5aWcHc6DdMjzrtx6fKfaSDsVYY9nfYktcUEmtJS55JhncFfW2z3L79ZLZcF33baALzP3',
        '2147483647':
          'XwnXGr5eYYBEdCfA2cfAYECS47aXPazNWKdSVpmPYH2eL3wGHev5Et7hbnLLXc1mMbPfeB1246Rh75fbavQ743L526ruuRD6F',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x570959B3553927DCd0Ce93D5b0D9b99Cd1542EF0',
        '1': '0x03143EA230f0F41314E19B853c01FDd8B819074d',
        '30': '0xB297D2C8041B80A6197b2366Ba71F2B089281217',
        '2147483646': '0xdfa0C2d3122Ef5c912D7992F013ec74dAf957324',
        '2147483647': '0xD115ee6CDe0Ef0b8e3236F9A24d28F54dAf70605',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x5331F8d30C027d0c7F18357eE8937DeE5D3c4E01',
        '1': '0xe5A2FA9075cc4a2646bCC2Ecb0634bb11c9f799D',
        '30': '0x540A873e9331aeB5b304a60F779327C8e669597d',
        '2147483646': '0x9BDb495Ce545E0ed87885eaE3c4f2dcc1a5E1E5e',
        '2147483647': '0x462f523204BfcbF14a9001EA76026962f10cEc10',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x5331F8d30C027d0c7F18357eE8937DeE5D3c4E01',
        '1': '0xaB97197cd2579E377c2673c18Bc0FA025352E7Ef',
        '30': '0xE4C5C1afb3CE2aE3e502d5D2936a1BC9DC0eBcBe',
        '2147483646': '0x13E62DEFD55f58A9242381104a327f1052C211d0',
        '2147483647': '0x8AC544c303F8eCaB3fC302695A15fda38aca1e26',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f15hyyr32f43k6s56qrjhvehnxxp7v57mrdbqwibi',
        '1': 'f1cw6tbteuvlund7livkogpyezippf4pctk5xckvi',
        '30': 'f14ugx3jcrsptsz3cx4db73klgtjxfwwlslmshbkq',
        '2147483646': 'f1aohmlyprbek5ecareon63y5xrdao5cfrolmnzbi',
        '2147483647': 'f1upeklatdiiob5dz4mnywqmu7lm6hymizxtgnzmi',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qpd5hrfac9v37xxsg37g3kcdddaangaf4hesanvv9f2hnuftemw9vx04dc52c',
        '1': 'kaspa:qp0nx0w8k6mty4l976uf3ruh06ww5aluqzpdxwv2jes6qad9f8aj2ddem8qv3',
        '30': 'kaspa:qptfnl5qx88hr452dk3lrqe4ajhpstwkkj66u8weg5arkdrnalpvc42xalxly',
        '2147483646': 'kaspa:qqedw48cmgeys8ltw3tutd8k5t02sp0scvz4zqlv4kl3jwzvwsrrvhzqcwl6u',
        '2147483647': 'kaspa:qqx65x93v56engphef5tpsez4n3wt92xpxdu0d27vrgc6tvtfd7070emqmana',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'e0d6b78740262aa704f507cfc33dc1131256cd5355460ff52a6a2fe9a949ea55',
        '1': 'af52d6e92c0560e2feec1ffc19ce50a88256d88cef748ed966ea23680c30314b',
        '30': 'e91a09126acf0c05e8a65322bf36fa20ebf13cbe7e4ba09e481b889d2083819f',
        '2147483646': '31b5dd41e325b8d5661bd73b9bed232789e340a0d46cafcdd6affd9074b31848',
        '2147483647': '106f30cdd79053b99796aa58e5876ab34c79dadefdf85a47e034af4a4ecee518',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NC3K362JORSWTMWCJWHCDOVZTWLJJDALOYOC6J3P',
        '1': 'NCBP6JB5HOOWPPQ4DGYR2OEIVFNRDDPHXW3JBO5Z',
        '30': 'NASZUAPZCA5U2DWNBGMYNVOORBENRCH4PEF5PNDO',
        '2147483646': 'NCHFCPL354GIR2COQ2L6GEIYR5IRVV3TEFS7WJUN',
        '2147483647': 'NBGZHDQSN64AMQ5666CK5AV2DXJD3FCQOKVB6AUB',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5cet2qn2x40gu552rra356qgt2duzmqpxv57kd9we',
        '1': 'nexa:nqtsq5g5qjltgjhsc85c7ey5h663n97m6l6a8jp6zsmgtrj9',
        '30': 'nexa:nqtsq5g5meflv9hkvr3het3lddlpqcfkv8sfxrctpmpdqgk2',
        '2147483646': 'nexa:nqtsq5g5clnyem0z5pyl8h2eqjk9qjh5jy4067k5cqhkyq3k',
        '2147483647': 'nexa:nqtsq5g52n56a54lvf58wp4x8avsu94eckt7fw0mzw3xej3k',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '15qYhNQ88zziabtRG1P9G8ctX7N5o7ZPYdTsaLsPVpkHnQDK',
        '1': '16B4nhZTc3oJi7uMdZPfmLUSfTLrvcsevi4a3JFqLStKcVn1',
        '30': '12MXmDUo4suC1TknwDWU4QKoQVG7TMuaPsc4BTcmhWABpJp8',
        '2147483646': '12zuRVDDURnrnvomwtb4ZjTBxKwCKG7LW1NGEFE7gpwwjTy5',
        '2147483647': '1SRw3u362aX2m1D8im3SocvKtJFBFBeGziicrA5uDDRjMZ4',
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
        '0': 'amqzL794TNMMtujnfnG9dx1kY5Z52hzVLEXem5tp6ijC5Ls',
        '1': 'b7N5fGUXWAwVQvgADnneqoZtt4LCY2FsQqE7iULeirm1zSx',
        '30': 'XHq4BBozLGpnkn7TsuawuevduyajH4BLaNiFsqH1n8dDqM5',
        '2147483646': 'XwCiSvEPtAVaDq6UYzBTEnKBkefbBFwSi8vJfSd16vP99dm',
        '2147483647': 'WNjE1c41Ux9p42XfPAALJx3ZK1iTALFDhVNhGNbDVBs912F',
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
        '0': 'HQsDMUvuakAtihM559C1w9jp5efuUpRvWa8oi9zRXwGMAmh',
        '1': 'HkPJgeGNdYm2EiHSd9iX91HxRdT2z8hJbAqGfYSGA5JB9Bs',
        '30': 'DvrHCZbqTeeKaZikHGWpCrehTYhZjAcmkiKQpuNdDMANpMW',
        '2147483646': 'EaDwUJ2F1YK73chkxM7KXz3FJDnRdNNstUXTcWicY8vHwFW',
        '2147483647': 'D1kT2yqrcKyLsp8wnX6Cc9mcraqHcSgespyrDSgpvQQHit3',
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
        '0': 'j4WAA85P29wEGygKeaLmpy8VjBsT1bhaRC5MpnbvMNosQFZD3',
        '1': 'j4WVgDQYMcz2s7CLawtnMULMHLDRnjCtga9xXFZJoDS1S5c9A',
        '30': 'j4Sg9BvTh5p8kQYC2FYu9mQCe5FM3Fwvc3KW1PifjaVHJHBHt',
        '2147483646': 'j4TKWrCC7VN2RC1F1GDykGjL2d6287r8N9TGDSWH5Zp54CViR',
        '2147483647': 'j4Rm3Mksw6xp5RqSST49j9oVkzePAyqCfvScfq7D3nCLYC8ek',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-manta',
      params: {
        prefix: '77',
        network: 'manta',
      },
      expectedAddress: {
        '0': 'dfbPZWsSeuYUwBbetChyLoAV8QCzsUxx9eQ45R969MHAFgGPP',
        '1': 'dfbj5cCbzNbHXK7fpaFysJNLgYYyecUGR2Uemt6UbBuJHWHii',
        '30': 'dfXuYaiXKqRPQcTXFsv6fbSC3Hatu9DJLVeCG2FqXYxa9i4uu',
        '2147483646': 'dfYYvEzFkEyH5PvaEtbBG6mKRqRZz17W6bmxU53SsYHMudHJi',
        '2147483647': 'dfWzSkYwZra4jdkmg5RMEyqVACyw2s6aQNmJvTeNqkfdPcvZC',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rLuE79ZERXu5eQNSgRm7KkQ1gTdFV5YCcs',
        '1': 'r9CsP8YW6aZyTDyi6c9LWFHMpqeC5HiYzJ',
        '30': 'rJbyKY7QyAAae9PMxFZdvwG6TYgKBffDn3',
        '2147483646': 'rn32cqcBemZhyjEVCAgHCEYf4vHWVghra7',
        '2147483647': 'r49Ptaw8DpwP3zZaTyxXL4GEqxGW7wd5QF',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '5iinGEhrwhw3o4Hi7BdLzrKMsMhuxfi6WQcDLk2BEJTx',
        '1': '4aumLcu2EC4ptAjDvwBN9hoymD9FXcV7HD4Sx1Fkt8MV',
        '30': 'GRzcfsR3AgvddgWoMRBcyY4LQaVu8CWz64p8NbVwkSDc',
        '2147483646': '9E2DyvCzm6A9n87BTde4ZXjHoSsbGGxeVaLWTAy4sKjz',
        '2147483647': '9TT11adSztAECWttwSCd66C2oC4f3rmqwrFFCu3itosZ',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x8096a9555942b6525c2abe9d4cec7105',
        '1': '0x3366c451c9a144b0decfc014b682be64',
        '30': '0x21adc575d4a2cd8fe97e338321534ff9',
        '2147483646': '0xb95c19fdfe88f2ab0988eacfaa73cde8',
        '2147483647': '0x4b9c6b1509157fef6bb7d85b7a46c545',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GBJ5MVTOQRSBBQR3UGUEAPTD2LCZ3LUC6DKPCKNVVZTGSDHVI3VBPB4Z',
        '1': 'GBZMVILGSOCV653G472Y7F3VQMYLQO23IC4UGTM6SVCGYTZA66JJFGN2',
        '30': 'GD2Z4FSG4O3FFOTWJ5BEEVJIFL3BXHSMDYGQ7XSFISVTL3E3KUNKEX4Y',
        '2147483646': 'GB7PHTVONNE2BVQXCR5CGNRVQUW3663OH6V5O5Y23LFMX5XVDTDZHPCA',
        '2147483647': 'GAX4FBMQKVWO2KKS3SGEIYWTMM3HIPTNH74DGBLNU2LBFTRNSSEJ6NIO',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x6fbe51414abaeeabdf227a2f93c9db89605aa1a6585268fd06f164859172d4fa',
        '1': '0x27532a15bbfb77b0630ab9668de283e4fb953ba51332326529bb674b15f0cd0e',
        '30': '0x8d304a6bf0184e6e277c914b80a146fccd3c45beac98567091fa3651aab5c6d2',
        '2147483646': '0xcfa15f88c5cc3d693dae9cf9324b9007b036acabaa2066b39f2c5ace62c6c246',
        '2147483647': '0x9ad1b7d2c0cd0106141cce49034ad39639963ddaf289bb9b025c02a59ab30e73',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TN5feHMrq2RbdpGoSL4Tc5VYnGxwBdpJSv',
        '1': 'TTKfZqZi3dMyv8CjANSJ3SP7nUC3vCHpt9',
        '30': 'TXZdykuDznFqXDANWoxssPCSavwmMmasb4',
        '2147483646': 'TZJEYKyuuPcu47NMB8YyygeUKMtEApbGXG',
        '2147483647': 'TBzaCCL1tFkncWwMdvgiC9R1V76VW59pEB',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC40f466801bd4c9e98e46898c1ae72474fa12ba931ab65c6628515c35873427620469',
        '1': 'BFC01aae53e15ee0b50510ba2e1e73aa41f44893d9a0825b67c25444524c1ced8ff0655',
        '30': 'BFCe2c14591424f3295f38f4479ceb976b815a4f54e29551b80d0c126b66ef1b8f964dc',
        '2147483646': 'BFC5e9e1b64c4b1b95c9dc01ed72fb350fcbf4c30b90262bf3a06d5adbb308c7e386779',
        '2147483647': 'BFC6cc46b63073b89b96499a43c3b78826260ea41df042ecd3101f4240e7193fea42fc5',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'Nhhra3pmmNsAfzZ7xorCwzSgQ6G6z7cLNK',
        '1': 'NLbRANDxkzo8Hf8EZn5PtmWS3TjzKG16gW',
        '30': 'Nh7TLG8rtCZrV7RBDL7a8ekUFreBoxykxs',
        '2147483646': 'NNUYZRW6XPERwEWTXxFJC64LqyudzRkvpw',
        '2147483647': 'NfenhkECyc376av3ux7NmDrqtVmUutsVPe',
      },
    },
  ],
} as AddressTestCaseData;
