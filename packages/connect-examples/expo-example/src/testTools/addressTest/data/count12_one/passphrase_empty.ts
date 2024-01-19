import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase12-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162680',
  passphrase: '',
  passphraseState: 'miDg8hbtpECMgje9jQRxhgvN9kQoA29DDm',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qyr8t5k9g7ggfsmfqwkf5gjcxtpag0xjkyctvnx0ljv8cxe0y0g30qkd85njeekrwsfxvt44z3r5drtgywdwnx0a8p5sak4p7t',
        '25': 'addr1q8ehn4xcp5nz4j0qkr53t5j04gysld9zefm3duk5cax3wmr9vqjhgysxdyz3ehfcty0nvzp47a3k056dfx6qfw38mhsqp4hqcn',
        '2147483647':
          'addr1qyj879xfe7ql8kk0tyryc9qg543ha5qf3nq296mmchsk2d0qud7ekc773zxwzjzyn3wj4eggpu25pmnxpl2eaaxeupvsfcwzs8',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': '7ZVKIHADZGRZJ7A52B7DZTOP4JXAOPK2M2FQTXK3D3T3A2HFOPUOGKGAVM',
        '25': 'QD3MZ27TH7537AKKDLWJU7AICQQWCMIRT3TNUM7LVISUJQJ2QZECIMT66Y',
        '2147483647': '2VMU3IKPKELMEDUIALFRVYYDBZW3BFKSRTDVCQGPZTLFKQYLPZLU4M36VM',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x60e800a8839a86be1ca6c0b17ecb10f2a2af8b3b7c5f212bbeb64471c4f00bd8',
        '25': '0xef40c4ccef00f15147c3403b6b8c2417dfeda0cec170edc1ca182b709a16eeed',
        '2147483647': '0x3479d1223e9612d40ee2bc8d540aff11966af9b09fe97995bd2250480c6ef458',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1AztpmzfQdpZNM5Yshczadx5pzcLfDTox7',
        '25': '1J624maH4iktxKdEkeEdJ7JTFV9aUkSxzR',
        '2147483647': '1PJN7cd66B4Y36thasJSfS3K5EZvAfYgMF',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '38Xegnipu2RhZouctnGnwmDRk2bLXfDHf4',
        '25': '3AfzaZqwQgoULAn9qieaV5SMh8Q9DYwqmi',
        '2147483647': '3EVwYDUfFyJTRy27b4Vf4gFei8Q8kU97Co',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qjclx3t2ykepvcqegx8tmn3nwd5ahsswenrvd90',
        '25': 'bc1qp7rf5t8yp6439c265uvqlhtgmlgzv8kvgx8fvm',
        '2147483647': 'bc1qe9f6haplqtl5khz36pjcrzjwl5ma2tjqup34f9',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1ppskree0erhqyptsx8hufkt98wxvuv6gla8hpep8euq6cex2k4h9svg2en3',
        '25': 'bc1pwgh3ah2c2evxur25uaxg5kzxyhcdf7f4vuwjf45ssxjeu07pdx5sz6w7q3',
        '2147483647': 'bc1psylrcjazd3twqy7tgz29k8md6caemv0lfqpj6x5cp0pjy9wnem0q2qtdzq',
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
        '0': 'D5UJ81u33vJBco3fMZxpaHrSrbwCyMejcY',
        '25': 'DTYdbEErk8SPoXt9h3oR7f6vAtbnUeRp5Y',
        '2147483647': 'DEfXtCPcbmKvnFgCTb3TnMwFAGmsageYLM',
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
        '0': 'bitcoincash:qz6kmmtek6vvly474p65cz9n77xfd9tykutafetr5k',
        '25': 'bitcoincash:qzq5fdv75hh5qr92ws4ruj62w7qqatjhwstn4h4yfr',
        '2147483647': 'bitcoincash:qrgxuqea6s503tfp7wmvznu88p5pylhv2v27h66z22',
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
        '0': 'LYVggHGrbF1NxbKySUzkbUHQ6EmgzSo2UL',
        '25': 'LYTwJhFZ1S9PqAxiXz6zsEeVW9ULzzdUMx',
        '2147483647': 'Lf97n3TXB1ZKRT458D53TUkYyTCZatKDNJ',
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
        '0': 'MRTehAWcZgZm6fnVj3kDzizaCtiybPHt3V',
        '25': 'MWUewTyDE8PCEQ4fXVpkQoCnjKYHzB1375',
        '2147483647': 'MJa7Yhin6LtD5bBqucK85LTzwLrvfw27bh',
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
        '0': 'ltc1q5qzknn7arkxvwf53cy6dnjvx8w9ty5u4ujmprk',
        '25': 'ltc1qejpj2k7e2y0xj8l0cvvcy06auhm8cg32py4xjj',
        '2147483647': 'ltc1qhzgskddf2edcy878dj92ucsrgu3xzl52vpj4xp',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aapggywhe9bbab6g7swd9m6r0491g6z3ejup0bkug7',
        '25': 'cfx:aatfghxc9t48y98tdum823tf8sw6dwvuhurxmx1y8k',
        '2147483647': 'cfx:aajpbcy2hk5jtpeag4990ugvrf09p2ry3ah7xe2z2a',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1l65dl2stwxk4w9gf0vt2mnxhst48ygys50evrj',
        '25': 'cosmos10dj5g7m7yknvh69wgyndh6hx2yj7jl4qekvngn',
        '2147483647': 'cosmos1kk249tgf0vre3uj3x9fk2l57xdq7nf9fhyyhmq',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1l65dl2stwxk4w9gf0vt2mnxhst48ygyse55t6g',
        '25': 'akash10dj5g7m7yknvh69wgyndh6hx2yj7jl4q5dp53f',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1l65dl2stwxk4w9gf0vt2mnxhst48ygysv534lr',
        '25': 'cro10dj5g7m7yknvh69wgyndh6hx2yj7jl4qpdy25z',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1l65dl2stwxk4w9gf0vt2mnxhst48ygys8jsgp9',
        '25': 'fetch10dj5g7m7yknvh69wgyndh6hx2yj7jl4q2t9h2y',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1l65dl2stwxk4w9gf0vt2mnxhst48ygysu52u4q',
        '25': 'osmo10dj5g7m7yknvh69wgyndh6hx2yj7jl4q3dlr7p',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1l65dl2stwxk4w9gf0vt2mnxhst48ygysza6hyw',
        '25': 'juno10dj5g7m7yknvh69wgyndh6hx2yj7jl4q0y0g00',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1l65dl2stwxk4w9gf0vt2mnxhst48ygysjtrvpj',
        '25': 'terra10dj5g7m7yknvh69wgyndh6hx2yj7jl4qljkn2n',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1l65dl2stwxk4w9gf0vt2mnxhst48ygysk2d97w',
        '25': 'secret10dj5g7m7yknvh69wgyndh6hx2yj7jl4qmnc640',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1l65dl2stwxk4w9gf0vt2mnxhst48ygys99guel',
        '25': 'celestia10dj5g7m7yknvh69wgyndh6hx2yj7jl4qguarj7',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x4cf1495a7786cEbE16b92671e8Ff98bc710B0A83',
        '25': '0xd84ad17e72Ef5989Cc854c0a245a63A12044A2A2',
        '2147483647': '0xFdFbC4041dDB39C3BbE3861A00a76Ec7F801514F',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x9E29B715Fdf15e9aD7CE4c183ae82bd08aaC4f1e',
        '2147483647': '0x495af699Bf9b9BDF985882bDb3aa98777DEe894E',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x9E29B715Fdf15e9aD7CE4c183ae82bd08aaC4f1e',
        '2147483647': '0x783954f2B55562a29799f0ebfA0137F379ec4F9e',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1qx24etmdkfpaqrxm5daj2cfe6ymu4eh5mbyamyy',
        '25': 'f1oftf6qyi4yeadmauiukku6dsb4i6gmyhko6e4ki',
        '2147483647': 'f1ebycpqukvtqwo5ky2sfhkpwiamup7o3ignn62nq',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qpyzj30sk5jvrh0n6zxwgy8w7h3dnxxgy5yc5jz3eusp7g55wxcx6kcp6hhc9',
        '25': 'kaspa:qphaul76y4shjuhdpdyvs2gjx5jmcj7kghyxtm2czdt0w23wrwmvcff2qkm2f',
        '2147483647': 'kaspa:qrz67k4vc5ml0nggphzv2g7l2zgy7vph8xqk7f7rnxkqz4dshzxrsk84hpmfa',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'd7be27229b157122eae4e1329fabe67272dcb4ba186378f5f788f245cc1c10d2',
        '25': 'a2b0514ad1b59478fab2a7dad53a190bca73f230dfb29fac412cfc95399398b6',
        '2147483647': '6abdf8ce662df010165f57e3f4b8d73bd593b168ad15e074614b1c1949caf0cf',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NA43KIC4SBMGB2ZZ5AJ4VYXNECALFJQALRTP6HHU',
        '25': 'NBH6CQ4VN6OK3VWNXQUNX2WGTDIUFGVV5DRZEJ5X',
        '2147483647': 'NC2GMZ66IARS7ZVN6GV5C6VMIBMEALC2YXDSKXPW',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5e47yv33ek75g5j234acq43u8damwre2mp3zc2trf',
        '25': 'nexa:nqtsq5g5q4mm40kzd5pu4tg6s6xxrjv7m5689ykf3d5r6v4p',
        '2147483647': 'nexa:nqtsq5g5emucd9q54z9jw50ekjc7adkl3jss8z2nvtpgvrr8',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '15Zv9wuuj921BLAVX3iKxHN32gZS21hA4KsA3YsWkc79brEu',
        '25': '14kk58Q5zaEJkeu5UJ1ADtemFrJ99BSgSsCbjKkgk1sMdoBt',
        '2147483647': '13bh26UxZFDeMyESz6Kz6nzhzJjpgZogYkjnK13bWeXqxiGw',
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
        '0': 'aWDSucvebPdxdBp3i7SqnhAG7GuHvqm12dp7y624t5b1Xex',
        '2147483647': 'YXzK4ByUhbH9GFmWkj6zJKqDjTHxUxHVTWSPRG6pvWHNDey',
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
        '0': 'H9EfvziVimTVSyRL7UNi5ttKer28NxCSCyRGvA7gKJ8APBy',
        '2147483647': 'FB1Y5ZmKpy6g63NoA62rbXZHH2Qnw4ivdr3YNLCSMipXD2E',
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
        '0': 'j4VtXaetok5FZaQbiqP71fHEshSeMpbiBhmm7FovUdbEG512F',
        '2147483647': 'j4TvJSoTraBTCm3fgJRifonsYf4pkV9piCCdjXG6ZPdexRkdg',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'r9D1JTDPkWTZ9qfezpALSi2aiTytQ58Zy6',
        '2147483647': 'rJbE86wJ6AsezwWvxfa5LVkwzxxsQgygig',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'FdrzyiRBdL1sNzPYbDdwgMWRfmBn9pS33uvn2vr7NNzH',
        '25': 'EadgeNarDdbQJ7Pn2XKY7aW5AT2B5qrw54p6oHrj7AdB',
        '2147483647': '4PPywjfLFF7goH65Ro7Ad49wz11LZ7a8NtebDJs2wyHe',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x47ae03920bc534f67df801b008be486d',
        '25': '0xd7ddeac86476a1ff08fa8bd23ef32a62',
        '2147483647': '0x4097ec8fea4b9b7daabf2d1fef1d4cd4',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GBMVJNK4T6S2PYIPC5XJCWR2TUVEVYNZ6G6KRRZ5N62K6YTN3OZB77BK',
        '25': 'GBF3LBUBQKPUOH33CIETS5RXYTIY7JRDSNEBKLV3IOA3THKVE4EG3CBT',
        '2147483647': 'GDLALZJOILBMK3ZLUMLLUKQM32XAQMCBN24YRX4PVZ7NRINZYFWHHEOX',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xbfd0a6d5c3dd77bb27e1320e7ccc39d33f53056592f7165031d2893c07812bfe',
        '25': '0xc85905746254bafebc36f1684c4a220f34ea680501304929ebeddd79fbea98a4',
        '2147483647': '0x291c1eef951f188406365c0d8154da4cd0df0b465165ea4236d5e33ef61d3942',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'THXNjn3TN6n58cD1Ry6mmzPzbgQiZ92whR',
        '25': 'TJmH9sHce76JPnRGzncoHDDUSyLetYDECM',
        '2147483647': 'TUKjDFGmLHw6NLbYuy4bpt2d6MBpKYtiYR',
      },
    },
  ],
} as AddressTestCaseData;
