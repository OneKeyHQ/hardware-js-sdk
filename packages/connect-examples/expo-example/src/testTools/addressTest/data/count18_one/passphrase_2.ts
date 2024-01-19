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
        '100':
          'addr1q9vphn5n97x8pptjyp7wykypytjylw32j6k24qpzc2j40jj744mq8rfz26k4xu6s2l3ldxvthazntglcvhagzp09efxq73sykp',
        '2147483647':
          'addr1q8dyhvxpypzpy2mmsx7ss0x4ue2wcpsfcd5ssylnw7yvlsag2g2zmprc8d23j7tlwajlz278p0yapzuhazntkwa974rqvxjysp',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'QZIJR3QXB7NZMFOHI4LRMV7WDFM2PGO3QQVQAIOXJWZCNUEPPTFTAZ3TPQ',
        '100': '7GXYYBH6HEW5GDAGBSCC2JQFKZSKX7N5VDKRBDIJ6MKCYCKT4WCT5OCDEY',
        '2147483647': '2NGL7AFNPBEUFWHQIVB3BEFKYMY2XBBMGK76EWCWMP6HUIJ4OOUD5TMIEY',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x175a9c11c97f1b7679e6edf6e94c0902653cc7a2c182afb5d394c318cad0d6b3',
        '100': '0x8183df3c33aaafdbe8dddf32692fd7f97fe3a157a24535ef94c754b73f787b70',
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
        '100': '1L2cP6DsDDcC4F1L5L44qy8pfv6W85kVtz',
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
        '100': '3F1d7cCYxadVyFpfSEmsiUoUPXoWbaoxtV',
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
        '100': 'bc1qge2velfcwt05s842qygjjf7f2c9lakj4dkcsqp',
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
        '100': 'bc1pfjukt0r8qzfc72880r240lx4jj30l5j2wxdz6dymx3ptes8tyzksa4r042',
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
        '100': 'DCEi47uc2tjLD7F4rhaVgTbCZA3gXdfAah',
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
        '100': 'bitcoincash:qqae7hdxnk74uuwetasd82ts7zgv7982rcfvc3s9zt',
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
        '100': 'LUojx9avuMwVWug2zVi9mtTK4faFPEg7TH',
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
        '100': 'MAxiprKxuayCnZoJuZLdRMTPwHFZG2GapS',
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
        '100': 'ltc1qlhgxx84nezvl49gx2r43z3ys520fgqcz6u0pa4',
        '2147483647': 'ltc1qyq3q4vjcspug4mdamud36jljxk9n4q3clymawa',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aasj94vyw80x9bx4nazf26ddsdptbxexdaynva5c9d',
        '100': 'cfx:aakhy76m4t39u7xghnsnuw3cp6jw21usxankbmcrfn',
        '2147483647': 'cfx:aakkjypjr4nnbb9nu5jsprys6z3zu8zpw6793tsux9',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1e9qrvm5qqd49hr539kmf5gt0w3s0n33wfgxten',
        '100': 'cosmos19eke5xdl3d72h84caywuqyaw903gmehq5yjj93',
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
        '100': 'akash19eke5xdl3d72h84caywuqyaw903gmehqell4ut',
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
        '100': 'cro19eke5xdl3d72h84caywuqyaw903gmehqvl6teq',
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
        '100': 'fetch19eke5xdl3d72h84caywuqyaw903gmehq8emk8x',
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
        '100': 'osmo19eke5xdl3d72h84caywuqyaw903gmehqulpznr',
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
        '100': 'juno19eke5xdl3d72h84caywuqyaw903gmehqzk3fzd',
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
        '100': 'terra19eke5xdl3d72h84caywuqyaw903gmehqjqgj83',
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
        '100': 'secret19eke5xdl3d72h84caywuqyaw903gmehqkpxmcd',
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
        '100': 'celestia19eke5xdl3d72h84caywuqyaw903gmehq9wrzlu',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xeFfd8A66C828a33a6d6992627119803bB2F5934D',
        '100': '0x5fFf925637aE709C354d9831C105899FfF002628',
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
        '2147483647': '0xC1E58d5f6164Bd13d4d8A338Df33375388Dee79a',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1uite4vmbdbmv4f3fxudhakisxezijppjwuaobrq',
        '100': 'f1sl4nv7hnxvb4jyvtlzdsygu3k5vockjcb3ondci',
        '2147483647': 'f14egymvd4tmnad3kbxvpkc2ho6at2onmpwcqtz3q',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qpx5rwhd373myyk9kwz9dhp76ju590qm3e9qkxgs8esvs6q4vddcsf4tgxtpt',
        '100': 'kaspa:qps7fyd9kg0xx2yr4tvjxr7a5gcuqw66eeeuj7v3c5jpw553vde8y4kyyf7m7',
        '2147483647': 'kaspa:qrhsn77spqsfgk9strhpsjyy4jhexukutpql78ekhnt6px787j0w5gjah7qay',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'e8d546f078945742d8edac6dce992bfa42c419f329ea33cbe184109d2acb0cec',
        '100': '23938c083570cd1fc77908aeac63f116112923aa9dcb8550dcdd1b3bc43b38b9',
        '2147483647': '3de406c630e8764c7fc8222919cbce45fe53a3e5dd8fbfe68cda0813535b59c2',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NATMABIBD37SQ3F7E3PO65VMXQBDGAKHH2YVKJGK',
        '100': 'NA5672Q7OSBDREUZS42LDC2OFW3TFOJX6AFFYEHR',
        '2147483647': 'NBECQIOFLK3LIVP3CLXVPINC23ZXYBTU4H5XTKND',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5qrgj783f7vq0pfgx26ueedxnysn80lh9krugeg3n',
        '100': 'nexa:nqtsq5g5x0lpz0e9c567qv5k4zh29uhlug4me99my7aer4en',
        '2147483647': 'nexa:nqtsq5g5cnjttm044hsuy5n045tm6jeh5sp9muv66rwdmkzh',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '12MBZDN483tDxUp64Mwy5NmByeLMLfgmH9rModFYaNe37EaH',
        '100': '13vCFE2bohZmdPfnbgNokJ7fyaZXstZWXJu3XUELmh7s5EuS',
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
        '2147483647': 'j4SjxSARVHNWA1AuZPo9LYzTVy2kKznwP7Yyfvp2PoDbZjwKx',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rLXCtuRfS1VUjt2HxiERXiJ6dY73SkeTN',
        '2147483647': 'rfQZF28trQ67vo1AFjEv213mJ7oNzdL126',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '3A3FoffnMLFacoFHPMWj2HGes9USHk1H43b4oqVKRkiG',
        '100': '9tqeb2qiaqD9MgUcnQcSMczLJFuxsM87w1orf3vhYjG5',
        '2147483647': 'm3Cet2yN8VJmfvujibMQW361Ejbc25D9NtAFx8C5vBA',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x9f507e06aee8a9ad05b88b6f1741f191',
        '100': '0x07be53ad41c69b3b8ce797f437ba2611',
        '2147483647': '0x90c60d9b348f4706b30bfe375eb378d7',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GD4AQHM2BBMMJVZ3XB4LVU66AVODZ7HRUWCKYZQBPR452VKCDZ7KYD4Q',
        '100': 'GBAFXLM4DYQC4ZLSQQSI4AVDXK7DUMW4F7Y73SBSOVETMFBQUFXWN4EO',
        '2147483647': 'GB6NKKB3N46ACPBDXHVXLQZ4GM57JZOUSIGIGYETQ5KVD3DJNZEX3XCU',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xdb1d3ffd7c9ef75b7d99b21f074999f2c2b44efc9dc2e159575ac6a4a85b1f84',
        '100': '0xe316f986fb840a741e1c7254944b74278c8308843121a51a615e4bcb25b266af',
        '2147483647': '0xda166d33b7ce10031e88b3fa1c7cc1b8da6ffd243d53ad533205eb90340f335e',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TH1od77qTkDhPqDbm2XS7wQpRsEdpND6Zh',
        '100': 'TX6BKwFySh9yLgzRsy5in3FQN1UMzm4rmu',
        '2147483647': 'TP3cQWgbq2kopNkXHjHDvJXGo6a15j3zmi',
      },
    },
  ],
} as AddressTestCaseData;
