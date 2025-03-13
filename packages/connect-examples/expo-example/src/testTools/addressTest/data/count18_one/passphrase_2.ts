import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase18-密语2',
  passphrase: '@CuihsC5',
  passphraseState: 'moZqDJs2wgTz4TY39eXAhhrWGD5fQZo46R',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490322',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q8x70jvdqmzc2nm3e54zpt3zl9r7h9vptme7tsqwan79mds8k7dacw0zd4377hh54l66kxl8t9a6stg8lr0zzuz07nyq6rrvcg',
        '1': 'addr1q8ry4jea28jc5rjc3mejnwvwd8ud45my722j2wjrcsaqu2h2058cgejvs3z56kjjym0caxu57ju2qkgja6t2ka2nyvyszgs8a9',
        '100':
          'addr1q9vphn5n97x8pptjyp7wykypytjylw32j6k24qpzc2j40jj744mq8rfz26k4xu6s2l3ldxvthazntglcvhagzp09efxq73sykp',
        '2147483646':
          'addr1q8tpasprdkm50yhawgwsz5zza5609t66f4vg42zd5720epz2fqrct53vs8xepyl3n09ylx9h6avt5l6cnt0tz5f79d6su083m5',
        '2147483647':
          'addr1q8dyhvxpypzpy2mmsx7ss0x4ue2wcpsfcd5ssylnw7yvlsag2g2zmprc8d23j7tlwajlz278p0yapzuhazntkwa974rqvxjysp',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'QZIJR3QXB7NZMFOHI4LRMV7WDFM2PGO3QQVQAIOXJWZCNUEPPTFTAZ3TPQ',
        '1': 'HM2X7NCUZPN74S2KKZJESC7YX64WS6YY5XMMQ5AEMJZMDSNM7B54UHFSRM',
        '100': '7GXYYBH6HEW5GDAGBSCC2JQFKZSKX7N5VDKRBDIJ6MKCYCKT4WCT5OCDEY',
        '2147483646': 'BTTTXTCBQFYZ6C3CMWUFAOVT6EYR65MUAUBVEPJAQY34II5ZRASF7TSJIM',
        '2147483647': '2NGL7AFNPBEUFWHQIVB3BEFKYMY2XBBMGK76EWCWMP6HUIJ4OOUD5TMIEY',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x175a9c11c97f1b7679e6edf6e94c0902653cc7a2c182afb5d394c318cad0d6b3',
        '1': '0xa73c932ccab34e3d224cb09cb80f12dd73afc2a1ef1a051955467c2855b9409f',
        '100': '0x8183df3c33aaafdbe8dddf32692fd7f97fe3a157a24535ef94c754b73f787b70',
        '2147483646': '0x9011d91ed30646cb90781bbb7a3fce7cc4a71e0960e11a7088b454e3fc6fb70e',
        '2147483647': '0x667a6266e2ec3c02563b69a12b8f275d72da9cb6eb31adbb94c2e0e96e8b2993',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '18FZXQPsQVJYDPsY8P6D2NcXTdzHBBFdCD',
        '1': '14gSXiT7sWPR8xDsTNurPnuT2sCqgTTaok',
        '100': '1L2cP6DsDDcC4F1L5L44qy8pfv6W85kVtz',
        '2147483646': '1Esh9QViut2jvqXS5Mfkh43wZoZNzxxCE3',
        '2147483647': '19vNgdcgLr1FZBJB9QxU87deKwy5Y6aTWB',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '35dYPAyzMouKK1Zn2FyCgBqmAp5HKuMTvJ',
        '1': '3MQGjy4exJUL74GGG6DsYQDr8FGobBBTxD',
        '100': '3F1d7cCYxadVyFpfSEmsiUoUPXoWbaoxtV',
        '2147483646': '32i8a14ymZ2wjYt2ZReM5P7AjQSrtW52Qj',
        '2147483647': '3F3otePsp6ehFwG83mkzLuMjmGC2UWHiaK',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qe40gjdf3nguzcy5t64k7h2vg59al6l207cy4uc',
        '1': 'bc1qe0vx89f3ms3c69cevrwy6w86vspwymu4j8z5ea',
        '100': 'bc1qge2velfcwt05s842qygjjf7f2c9lakj4dkcsqp',
        '2147483646': 'bc1q20l3gr59qatdg6w9mnwshufh5qjmn90fw9hglv',
        '2147483647': 'bc1qgecjz7yq9xupg44fzl3v9mehj9nmnwk4lssa4z',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pyjfqxuefk2tf67etgr5p9cgn4g4622ygcxry93srn09lazv4c03qay3plx',
        '1': 'bc1pl6nem37mu249y2lmqxfll5xyajrts65pd8nsk7m0pnlap92um5tsr2kwe0',
        '100': 'bc1pfjukt0r8qzfc72880r240lx4jj30l5j2wxdz6dymx3ptes8tyzksa4r042',
        '2147483646': 'bc1pexeqnrsljhf2l96pxfzck0t7zl60mmmzc5nmupu0knpnsdp020zsh7ra6g',
        '2147483647': 'bc1px907y80lcy9fwgdwcxmnxutvtwj6g7np3yaxrlewnaxeexruj48q5usc2j',
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
        '0': 'DL4MqG4H4bsYQXEupJb1TQs3yyp4XJb2Ac',
        '1': 'DJCSiDvjGxVpA8o22w5YdoBVR4MovAha62',
        '100': 'DCEi47uc2tjLD7F4rhaVgTbCZA3gXdfAah',
        '2147483646': 'DRDDQE8bVJzx2PNiFJEoEHXLmKdAXz7GgG',
        '2147483647': 'DLSDgrNar1BBUrmJpKBGHMrqd8hZad4G4x',
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
        '0': 'bitcoincash:qrxaem7zu5jva3ehqudppmmsklkrd4lss55ffv9h3m',
        '1': 'bitcoincash:qq6pdvk9rcn6rkagv06p5yt4cm0rdt7nd50k56mu0a',
        '100': 'bitcoincash:qqae7hdxnk74uuwetasd82ts7zgv7982rcfvc3s9zt',
        '2147483646': 'bitcoincash:qrqkw5dgrfqulv5ajrjadh92cr0dl7l84g4pn9s2xk',
        '2147483647': 'bitcoincash:qpk70sc40hhlax5etw9r4ymmufudhlqnn50pn93nej',
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
        '0': 'LLmA3cMpq2VWJvueaovfnzMDAuYh3ETfTJ',
        '1': 'LeHHHAtqaiRBnKE36vMrhEgLgnYoJF6ZvT',
        '100': 'LUojx9avuMwVWug2zVi9mtTK4faFPEg7TH',
        '2147483646': 'LgNptwbNoaGJZkYxtrhDWYxVSUcRAYur5o',
        '2147483647': 'LRQLDh8rEspeFZ99etyqdchxeWF71NU4aK',
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
        '0': 'MWpnE7KGECKjEkD4F38FGRDusCzE6Mpudq',
        '1': 'MQz6o6cs9SzPfPdPfzgoR1C3Dnde8D4sEQ',
        '100': 'MAxiprKxuayCnZoJuZLdRMTPwHFZG2GapS',
        '2147483646': 'MDjgh5eL4oBo9LLJVyvtReU33TcGQYSbu7',
        '2147483647': 'M9otZ93jHKkL5kgw5fqNCsFvnBrouynv7t',
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
        '0': 'ltc1q2uhdy893sd6eypdzed97yf5jlkerjhr0vwqlmv',
        '1': 'ltc1qh5zt5rkmatqpyeptapa6zlr04e3ttwzkrf7dpl',
        '100': 'ltc1qlhgxx84nezvl49gx2r43z3ys520fgqcz6u0pa4',
        '2147483646': 'ltc1q37mxfqxsm2kapeg3wdpe3wyt57t994jdvfkynk',
        '2147483647': 'ltc1qyq3q4vjcspug4mdamud36jljxk9n4q3clymawa',
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
        '0': 'Ng2rvJ1j7Z4qxNrJUsxXL3kkH6XUU2Pgof',
        '1': 'NdFV45mVU7dLq9eXJGo7vhwVWFPHKMvqwd',
        '25': 'NRo63BM4nAqLwFKMXCj8gGNBZemHBHKhap',
        '2147483646': 'NLVz1QT7BhykQUQvw7do7Y2ezPyJrp8UjY',
        '2147483647': 'NZZ9TDbGaBpW6ZGS7WK9Cf3CJYo64s8RaD',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqf9yzcw3qez8gxsvxak3exz6aj2yz7nxmqkdzlhz',
        '1': 'ckb1qyqgkgq4uyfcms9uyk4qqhrzv3sj496ay3xsnhur6p',
        '25': 'ckb1qyqz2e43qech9jf8kyt4d0j8uknqh4zgrr4qvtxmqr',
        '2147483646': 'ckb1qyq92r9wwtye25z9la2zzz6rksuf4uhjcfrs7kpxaa',
        '2147483647': 'ckb1qyqfk3uqqxuq96aw9p6hwt08sc4n7akwnsxshamjqk',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aasj94vyw80x9bx4nazf26ddsdptbxexdaynva5c9d',
        '1': 'cfx:aajye6tsmw9uwm6t7ma5wgu3pj5mtdxkxyensgxuvk',
        '100': 'cfx:aakhy76m4t39u7xghnsnuw3cp6jw21usxankbmcrfn',
        '2147483646': 'cfx:aakgva2cynx8h5m8427wfh8nm9hjku1wh270tpk6ux',
        '2147483647': 'cfx:aakkjypjr4nnbb9nu5jsprys6z3zu8zpw6793tsux9',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1e9qrvm5qqd49hr539kmf5gt0w3s0n33wfgxten',
        '1': 'cosmos1t3cjy5cn8crs2nm5ezhkuqaynuhqnn2pkmnlpt',
        '100': 'cosmos19eke5xdl3d72h84caywuqyaw903gmehq5yjj93',
        '2147483646': 'cosmos17pln76j6p9hynlunep4ss7y0jqx6f8lkwaqt5k',
        '2147483647': 'cosmos1xe346wqnk2z2yfzaexads5wnt3z98p84y2gfuv',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1e9qrvm5qqd49hr539kmf5gt0w3s0n33wyntvqf',
        '1': 'akash1t3cjy5cn8crs2nm5ezhkuqaynuhqnn2pmq7cc3',
        '100': 'akash19eke5xdl3d72h84caywuqyaw903gmehqell4ut',
        '2147483646': 'akash17pln76j6p9hynlunep4ss7y0jqx6f8lkrxdvdv',
        '2147483647': 'akash1xe346wqnk2z2yfzaexads5wnt3z98p84f39w9k',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1e9qrvm5qqd49hr539kmf5gt0w3s0n33w3nwj9z',
        '1': 'cro1t3cjy5cn8crs2nm5ezhkuqaynuhqnn2pwqmxa6',
        '100': 'cro19eke5xdl3d72h84caywuqyaw903gmehqvl6teq',
        '2147483646': 'cro17pln76j6p9hynlunep4ss7y0jqx6f8lkkxgjg8',
        '2147483647': 'cro1xe346wqnk2z2yfzaexads5wnt3z98p84u3qsqa',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1e9qrvm5qqd49hr539kmf5gt0w3s0n33w6400my',
        '1': 'fetch1t3cjy5cn8crs2nm5ezhkuqaynuhqnn2p9x6mru',
        '100': 'fetch19eke5xdl3d72h84caywuqyaw903gmehq8emk8x',
        '2147483646': 'fetch17pln76j6p9hynlunep4ss7y0jqx6f8lkaqf0kp',
        '2147483647': 'fetch1xe346wqnk2z2yfzaexads5wnt3z98p84hhpd7m',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1e9qrvm5qqd49hr539kmf5gt0w3s0n33wpn4m0p',
        '1': 'osmo1t3cjy5cn8crs2nm5ezhkuqaynuhqnn2p7qq0he',
        '100': 'osmo19eke5xdl3d72h84caywuqyaw903gmehqulpznr',
        '2147483646': 'osmo17pln76j6p9hynlunep4ss7y0jqx6f8lkxxnmzy',
        '2147483647': 'osmo1xe346wqnk2z2yfzaexads5wnt3z98p84v3me27',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1e9qrvm5qqd49hr539kmf5gt0w3s0n33wl69s70',
        '1': 'juno1t3cjy5cn8crs2nm5ezhkuqaynuhqnn2pqfsyxh',
        '100': 'juno19eke5xdl3d72h84caywuqyaw903gmehqzk3fzd',
        '2147483646': 'juno17pln76j6p9hynlunep4ss7y0jqx6f8lkc0rsn2',
        '2147483647': 'juno1xe346wqnk2z2yfzaexads5wnt3z98p84jctjms',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1e9qrvm5qqd49hr539kmf5gt0w3s0n33w0vutmn',
        '1': 'terra1t3cjy5cn8crs2nm5ezhkuqaynuhqnn2pslflrt',
        '100': 'terra19eke5xdl3d72h84caywuqyaw903gmehqjqgj83',
        '2147483646': 'terra17pln76j6p9hynlunep4ss7y0jqx6f8lkge6tkk',
        '2147483647': 'terra1xe346wqnk2z2yfzaexads5wnt3z98p84zwjf7v',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1e9qrvm5qqd49hr539kmf5gt0w3s0n33wtdjzy0',
        '1': 'secret1t3cjy5cn8crs2nm5ezhkuqaynuhqnn2p578kuh',
        '100': 'secret19eke5xdl3d72h84caywuqyaw903gmehqkpxmcd',
        '2147483646': 'secret17pln76j6p9hynlunep4ss7y0jqx6f8lkvc5zf2',
        '2147483647': 'secret1xe346wqnk2z2yfzaexads5wnt3z98p84x0uqps',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1e9qrvm5qqd49hr539kmf5gt0w3s0n33wczhmr7',
        '1': 'celestia1t3cjy5cn8crs2nm5ezhkuqaynuhqnn2p83z0mx',
        '100': 'celestia19eke5xdl3d72h84caywuqyaw903gmehq9wrzlu',
        '2147483646': 'celestia17pln76j6p9hynlunep4ss7y0jqx6f8lklh3mwm',
        '2147483647': 'celestia1xe346wqnk2z2yfzaexads5wnt3z98p844qeexp',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwnL38jHN2RM2jNjYkxm4U2BK1qSBZw1P2fuwsjKfxmqdbxdqrRExngi3J2KtuGCYMLx19uCcQEPYWJQpGKGGqj42YnZ53zFi',
        '1': 'Xwn9g6HkxvBZrtqhVD9UuZEVaLc16ocKJJzWV67hR1AHPRs7XzdDQC5BMqb6itAwwhV3dRZK4Tp91FHAnNZqys3V2oS55zprs',
        '100':
          'XwnvR8BrmuabChyjftKdsYjWCi9Pa8e7Jgr3dftrPbQhDqNKPXWys95eJBxwPBpKX4Z5VGoHUYxwzexwFsuWb6Vh3C7GUtayE',
        '2147483646':
          'XwnM7exbGpDG2b9rkvPmBudRBaF3jpmha28LnkNn9EMfKCqmmussAEE6aGZd3WLaEQUyPsRj4fd3g6BJHYvUqQ8B1dFnsX9Zu',
        '2147483647':
          'XwopVC2eUXYHzSmHDTJvCrDZfodBKoP9Y5RjPAeGthiwZtfLATm95AyJ96HFCQduDb7gb2rhdRyMgF94srxN8XMf1ucXD2kSG',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xeFfd8A66C828a33a6d6992627119803bB2F5934D',
        '1': '0xb130597C8D2E84079aC2f9E527714597f96c33dd',
        '100': '0x5fFf925637aE709C354d9831C105899FfF002628',
        '2147483646': '0xea1aB8911b2B4EA05bB3Ab3796ED9dEc8e29C392',
        '2147483647': '0x41e3399b9EC104c98490729148b96E6A55c703e3',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x4271D907b6aFb624E7411f6a0809ec995e63b7e3',
        '1': '0xd2b5CB10b3b4263c253444aB0Fdb254Aa7b611Db',
        '100': '0x906D41805Bbc3298D7Aac07dfEEa5f16EdEcc154',
        '2147483646': '0xaCB2A56271Ac4e8b4bFeB4Ba02954c33C98ca5b4',
        '2147483647': '0x99E579c86DaCCD631B6C13bb1b2BeD1082EEd987',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x4271D907b6aFb624E7411f6a0809ec995e63b7e3',
        '1': '0xE75Ecd543908cF3051DF83E56C89d67d5F6fbB39',
        '100': '0xE443DbB5E2ECA449524C8F8e25dDDC5c39C955fc',
        '2147483646': '0x8BDa5076dE64d82915Ba509916283D0a45Af2cD3',
        '2147483647': '0xC1E58d5f6164Bd13d4d8A338Df33375388Dee79a',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1uite4vmbdbmv4f3fxudhakisxezijppjwuaobrq',
        '1': 'f1gl73wgrqhixebexd7a4tghh6x5cl2hhnycrb7fy',
        '100': 'f1sl4nv7hnxvb4jyvtlzdsygu3k5vockjcb3ondci',
        '2147483646': 'f1aiy63joydatek42dufhdfwera6kbsjcmqy2tj5a',
        '2147483647': 'f14egymvd4tmnad3kbxvpkc2ho6at2onmpwcqtz3q',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qpx5rwhd373myyk9kwz9dhp76ju590qm3e9qkxgs8esvs6q4vddcsf4tgxtpt',
        '1': 'kaspa:qrr4tk4ukjskkmldzq3fxdja9s72zfrh4dk7whs6uruetkfs78qk74ctln6y8',
        '100': 'kaspa:qps7fyd9kg0xx2yr4tvjxr7a5gcuqw66eeeuj7v3c5jpw553vde8y4kyyf7m7',
        '2147483646': 'kaspa:qrckcyf0ljzd6nkw5jc66566jrvlekq0hwdnzlk8cvd5l8njcjca6nlx3573u',
        '2147483647': 'kaspa:qrhsn77spqsfgk9strhpsjyy4jhexukutpql78ekhnt6px787j0w5gjah7qay',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'e8d546f078945742d8edac6dce992bfa42c419f329ea33cbe184109d2acb0cec',
        '1': '7a545f6e7e4da159023a8b5bb689491447ad239f720f352f1b03adc48118e7fd',
        '100': '23938c083570cd1fc77908aeac63f116112923aa9dcb8550dcdd1b3bc43b38b9',
        '2147483646': '5ee6a93b4ef29dbc09cc21032b21c5ae760878d018e32152e64ec24542ac6fcf',
        '2147483647': '3de406c630e8764c7fc8222919cbce45fe53a3e5dd8fbfe68cda0813535b59c2',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NATMABIBD37SQ3F7E3PO65VMXQBDGAKHH2YVKJGK',
        '1': 'NAI5A7TRD3OKYTOJXWVLDH56YGN6SQ3TIKPGUHWD',
        '100': 'NA5672Q7OSBDREUZS42LDC2OFW3TFOJX6AFFYEHR',
        '2147483646': 'NDY2GFACOKWI275PTAJROV3IZF2F4EIUFZYVXRTE',
        '2147483647': 'NBECQIOFLK3LIVP3CLXVPINC23ZXYBTU4H5XTKND',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5qrgj783f7vq0pfgx26ueedxnysn80lh9krugeg3n',
        '1': 'nexa:nqtsq5g58q43nnqlyewg0l676guf6jxuxaezql24y38c2q47',
        '100': 'nexa:nqtsq5g5x0lpz0e9c567qv5k4zh29uhlug4me99my7aer4en',
        '2147483646': 'nexa:nqtsq5g5l54kpnrq2qzwk6e5evt8q9h42kl4s5cv4hec9exk',
        '2147483647': 'nexa:nqtsq5g5cnjttm044hsuy5n045tm6jeh5sp9muv66rwdmkzh',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '12MBZDN483tDxUp64Mwy5NmByeLMLfgmH9rModFYaNe37EaH',
        '1': '122D5riaYF73W9vc3JYGPzhZjNkbGULhY12dFpV6fMb4sC5W',
        '100': '13vCFE2bohZmdPfnbgNokJ7fyaZXstZWXJu3XUELmh7s5EuS',
        '2147483646': '13dzPGiedsgPxfpAqq1MYH41Zif7zQPQ91krnFZ6gWvVMwEq',
        '2147483647': '12RM1TSbGSGbc6UL5TkeqzafJGfQCCvMU75iiYyRvEUTGd8u',
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
        '0': 'XHUrB553WFrjmqQb2M5xt6KD53pcaqNDrd1t3U3tecUWwNm',
        '1': 'WxWNpRbThUgHSwvZxwPHW2gxoU4YPVJUhoHLEhbydZWGsUb',
        '100': 'YrVYBjcj9wQQgh78LmvdoSoD1H19oi7U1fhbtSr5y6JUgpw',
        '2147483646': 'YaHgERfZL42jxqVNVQURnP8o9NbGKY15iXWrfmbzntvmFH8',
        '2147483647': 'XMeJR9cBteEPPVec89mjVunXhNsU84xQorNnyBwEWStgFrj',
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
        '0': 'DvW5CSrtddgGbd1sRi1qBJ3GccwT2wof2xd2zY9W5q1g6u9',
        '1': 'DbXbqoPJprVpGjXrNJK9oER2M3BNqbjut8tVBmhb4n3Runf',
        '100': 'FVWmD7QaHKDwWUiQk8rW6eXGYr7zFpYuC1JkqWwhQJqddwj',
        '2147483646': 'FDJuFoTQTRrGnd6etmQJ5arrgwi6meSWts81cqhcE7TvREJ',
        '2147483647': 'DzfXSXQ3223vDHFtXWhbo7WbEwzJaBPqzBywvG2qwfRqGJt',
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
        '0': 'j4SfnyvLx8z7nMZFKNhLenNe2eQRH9FhnvbkK1tJWTMm9aKzN',
        '1': 'j4SLpWZhUZBLbuEMqMdvx6zaQQ8qX54MjBSvaU5Y4YLiBLG3S',
        '100': 'j4UEofw1VpdoL2U71v1mVTHzWeLeTgUaYAknzjjHJegEyY3zy',
        '2147483646': 'j4TxboyhYeouxMkFQAAQ3FGvrEUk3nzQRnTeozWc4ZW3bpfck',
        '2147483647': 'j4SjxSARVHNWA1AuZPo9LYzTVy2kKznwP7Yyfvp2PoDbZjwKx',
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
        '0': 'dfXuCNiQatbNSZUaZ14YAcQdRrjy92X5XNvSZeRUJRq411Ntt',
        '1': 'dfXaDuMm7JnbG79h4z18Tw2ZocUPNxKjTdmcq6chrWp12mHCX',
        '25': 'dfbTbAoRj8T7JknimdGxHG97jd8mJ6pUKXWN7nzFrW17qW7aD',
        '2147483646': 'dfZC1CmmBQRAcZfadnXbZ5JvFSpHugFnAEnM4d3mrXyLTFhiF',
        '2147483647': 'dfXyMpxV82ykpD6Eo2ALrP2SuBNJBt4K7ZsfvZMCBmgtRAfki',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rLXCtuRfS1VUjt2HxiERXiJ6dY73SkeTN',
        '1': 'r43FVm3Ge5CQKVuwAwE9n2SAkEmk75wBkN',
        '100': 'rp7HRQRe4PhfEA6TikFx3VhTqLweMBxZfK',
        '2147483646': 'rGET5vewNBURkwUT5NRonmz5eDnVAUHYKu',
        '2147483647': 'rfQZF28trQ67vo1AFjEv213mJ7oNzdL126',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '3A3FoffnMLFacoFHPMWj2HGes9USHk1H43b4oqVKRkiG',
        '1': 'GcsH4opJgMUfJjCWeAC7R1d5XeehtojEGD3qE8AXfk86',
        '100': '9tqeb2qiaqD9MgUcnQcSMczLJFuxsM87w1orf3vhYjG5',
        '2147483646': 'G577G16TJevW9hewSmjVaHD2kSFrRo57W68287JQuFdB',
        '2147483647': 'm3Cet2yN8VJmfvujibMQW361Ejbc25D9NtAFx8C5vBA',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x9f507e06aee8a9ad05b88b6f1741f191',
        '1': '0x1420fe23789aa8c868bab45bae10e7e4',
        '100': '0x07be53ad41c69b3b8ce797f437ba2611',
        '2147483646': '0x35250d73a58aca32217359d2e6a4ba59',
        '2147483647': '0x90c60d9b348f4706b30bfe375eb378d7',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GD4AQHM2BBMMJVZ3XB4LVU66AVODZ7HRUWCKYZQBPR452VKCDZ7KYD4Q',
        '1': 'GDHOBA5WIEXN3LQSZ33BXAPXL4WUVKT4O6CPV35VODR5GQRSM7FYSBRB',
        '100': 'GBAFXLM4DYQC4ZLSQQSI4AVDXK7DUMW4F7Y73SBSOVETMFBQUFXWN4EO',
        '2147483646': 'GDMSCL6FCPHHWDWEBZEQI7DFDTOD4NFPWUGJU5UYN7F4ZLOS3RFASUXV',
        '2147483647': 'GB6NKKB3N46ACPBDXHVXLQZ4GM57JZOUSIGIGYETQ5KVD3DJNZEX3XCU',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xdb1d3ffd7c9ef75b7d99b21f074999f2c2b44efc9dc2e159575ac6a4a85b1f84',
        '1': '0x4777133bfb414c632f4c5d603c8d4d9e1ff5a8a9c74fd8c10b227fa8cc794dd5',
        '100': '0xe316f986fb840a741e1c7254944b74278c8308843121a51a615e4bcb25b266af',
        '2147483646': '0xb37303289e805d16d3568b48025dc396a2b00a9607a86b6afae49c5d06333419',
        '2147483647': '0xda166d33b7ce10031e88b3fa1c7cc1b8da6ffd243d53ad533205eb90340f335e',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TH1od77qTkDhPqDbm2XS7wQpRsEdpND6Zh',
        '1': 'TLAQCvgMVdAYSZYJmatkTaNMqZVWWzn4Lp',
        '100': 'TX6BKwFySh9yLgzRsy5in3FQN1UMzm4rmu',
        '2147483646': 'TPCXHD9crBNrJbWEVJzpSq6UrQSwX6bc6L',
        '2147483647': 'TP3cQWgbq2kopNkXHjHDvJXGo6a15j3zmi',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC5a6464236476bf2bedd6eba0629d83aa0f7c8ce74e51733a8b1f20081fc279ef66b0',
        '1': 'BFC8c9f9d4cf8c9828379c0744d68b0d3478b17989e42d9d80aab0bd0a66f4f93dda2b8',
        '100': 'BFCfca709d9c44629f4a9a1b6b5c9458b3735c4fc8b872ff36a6f32325550725aac4a6a',
        '2147483646': 'BFCd136df3783e0902d4673bcaf51911eb326be16cde4941e624da998d75f72641d0882',
        '2147483647': 'BFC702b092829741fd123e5054168f66ca53b19aa6ed626e84b3d3f1489889b98fcf33e',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NShu1G16hG8pHyuK6B69eLh1Mk6womyeMK',
        '1': 'Nc6FpoNaaUTQYysi717QCN41M24pqu1Ruf',
        '100': 'NdaP4SRQKBXkuLCnjJ29VCg3N9nwrSiyhE',
        '2147483646': 'Na1J7mMeDrZzb6jEzaNMAgSRJtJxoE3gQz',
        '2147483647': 'NMPEMjdk6qN2ggtnFojhLGgT7FzxRRKZDh',
      },
    },
  ],
} as AddressTestCaseData;
