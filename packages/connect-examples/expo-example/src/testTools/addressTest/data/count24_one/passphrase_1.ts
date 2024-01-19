import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-密语1',
  passphrase: 'asdfg7890',
  passphraseState: 'msySLzWLsiGnZVfcQCNBeLV4LaTxeoHFZj',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429392156',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q9l2m0672zypay8quw4q6ppha0cj8wmyuz3y4ld9txgg8e46cr2kvk0m6cs5lwfn9es2vsd8ft9pw952pf0xe78sukmqftt08q',
        '10': 'addr1qyl7ely6yvy0jxz2ajw3zdyv5rs4mz3ckd530zmqqmgv0gg5a90m5gdu2dptt9m4gv4mazc7qpkqsgvh92aeq5ae0ftqug6wsa',
        '2147483647':
          'addr1q9f20luymzdf2nslah903fxpltw8lt8ppe0ec8j0u2xa0l3p5lds9cs2ztldrk6hzac4gnzagf07j35qv2jw4qfnq64stq395n',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'EYLM2UFBHT346V5ZPUUI25GNGWU6USNVIGJILEFAHOSQWI3DE65GDPS4X4',
        '10': 'KDXLGRXJLD63NLXB4XGYFFDMINJMYIVIGJBVNSW4TYDI3NF6H3WYOLCYUI',
        '2147483647': 'ZID3TBICZHZHMI5R6JCDS3LK54UCSZAO2TOOW3GCXD6DTHXNLPBV4IAQPU',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x0376df4eacdb442eb0ad9b39a80f9bff33a95baba9dfd5ccabb405bb486832be',
        '10': '0x2a17c7d08e428c8104e0219b876c726c1a9346f703eaa66bf635da65b4ba6b90',
        '2147483647': '0x5a86a4f7b5bcf34a8f5633cecec304e8d1c923b98d5cea49c1538b6840e71a64',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1JGZrqeihowYCw3sP2VNapGCmUEP8mzv4K',
        '10': '16q3WNWuTFQDr1XUjk5g7kD54Pxh1xS5SK',
        '2147483647': '1GGqGd3U9yamK7f4AHGLFPvuksu6RgbQFW',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3K9QAT5qziT6UKNaid83G9xhChcJT5ci5C',
        '10': '33GmJwe8zx3yG9TZJpR8dP8Zz6rdTFniDd',
        '2147483647': '3JHWGkwzxNGgmfsTggbE7yRt8h6jrMryqs',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q84krwwp73s54f3m6tl54kx93hhh77gsprzkz93',
        '10': 'bc1qt7m6z3h9uluna34t8xlv8p8rr8s85rclk0mcjg',
        '2147483647': 'bc1q4renmek6j9rczjgtu25uukuw9r7rx95w7y0d9m',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pv6wypgzxt9htpuy48gc0hkwnukj6auh5cmyqy7udz2lknrg85exqav3kjl',
        '10': 'bc1puwjrp5y7804v6392fslqep8rptnnjxcmgyz334h6erl5f0y4azusxza3hc',
        '2147483647': 'bc1pm6zyfwx68pamtr6wwealkq3a7uy7qa3jcq6mkuqc5xcgdka5ye8qseh6p0',
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
        '0': 'DAEdbGLnkUHjsqvwhjdf5PRpuavjqBzueF',
        '10': 'D61bTQa196RsdXawJpEYvHSBrE6wsk7bwc',
        '2147483647': 'DTyg6zPozjDYnrNSrdbMm5swVjo1TiYn1n',
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
        '0': 'bitcoincash:qrxtkvz5nrjeyhczn0chvnkq3dq0cut2gvyjvatjlr',
        '10': 'bitcoincash:qq28mr3wye8at24lqz2dv2de24h609qggumugj6l3t',
        '2147483647': 'bitcoincash:qruurht3rmeds5j0dr09s5ln68pdw53k0gpkrvus9e',
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
        '0': 'LNKVwG41g5GqJ8FMmFVBMKTgZFZP82GJrF',
        '10': 'Lg573dRoZ1yVkhGhhpodKzxkSQWNru6vPT',
        '2147483647': 'LbyM5H7kgqdwRrzPPS2aUStWkL5CehxE9v',
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
        '0': 'MVQkiWCCDCd3xEwr7jug2P113GeAANzFR5',
        '10': 'MN7tVvd5yTa92WPYzsYSHigNnuaGBW4KG9',
        '2147483647': 'MCq4jcuw5HppUu4LyXRVAqEPG4ScveHmgk',
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
        '0': 'ltc1qvakwx9gf0w3g0psatfvevnsqvym4s3sse2j5s6',
        '10': 'ltc1qgmpc4d40puhsk9stgurczqqg96hyfa4rhfzf6w',
        '2147483647': 'ltc1q2sm4r6989ppvq63wgaveg44d6clygz4g299679',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aardbctc7zapuexayrf19zwr2bb3w7e2kp7v3whevv',
        '10': 'cfx:aamfvamed8wvbktnbhp0b385vvkk7ktfmu0k0gr5g4',
        '2147483647': 'cfx:aarbeepd1gpr1v5pxbky10ekt96wgekj364s9c9kxb',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1d6w6dpcnypma2ded4ktsqwzdjza9nre0hksptu',
        '10': 'cosmos17pa24tk39jdzehusrp2zhnpjcxc9sgq2rt8hx9',
        '2147483647': 'cosmos1fwm9rkxq55znms2t0rv2uc03s3qrk7naza804a',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1d6w6dpcnypma2ded4ktsqwzdjza9nre06daxjx',
        '10': 'akash17pa24tk39jdzehusrp2zhnpjcxc9sgq2ws2sll',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1d6w6dpcnypma2ded4ktsqwzdjza9nre00dcchd',
        '10': 'cro17pa24tk39jdzehusrp2zhnpjcxc9sgq2ms0w65',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1d6w6dpcnypma2ded4ktsqwzdjza9nre0yte9ft',
        '10': 'fetch17pa24tk39jdzehusrp2zhnpjcxc9sgq2skwnyj',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1d6w6dpcnypma2ded4ktsqwzdjza9nre0ldr3aw',
        '10': 'osmo17pa24tk39jdzehusrp2zhnpjcxc9sgq2ts58sh',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1d6w6dpcnypma2ded4ktsqwzdjza9nre0pyn6vq',
        '10': 'juno17pa24tk39jdzehusrp2zhnpjcxc9sgq24eyvpe',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1d6w6dpcnypma2ded4ktsqwzdjza9nre03j2pfu',
        '10': 'terra17pa24tk39jdzehusrp2zhnpjcxc9sgq290ahy9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1d6w6dpcnypma2ded4ktsqwzdjza9nre04nygkq',
        '10': 'secret17pa24tk39jdzehusrp2zhnpjcxc9sgq2pwn7me',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1d6w6dpcnypma2ded4ktsqwzdjza9nre0xup333',
        '10': 'celestia17pa24tk39jdzehusrp2zhnpjcxc9sgq2jpk8ug',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x0580afDe2aDac2EAA6eA6ed2043F5AB980dd8307',
        '10': '0x6723B0D26A19E88f7F6A59146Ff9D672C51CE118',
        '2147483647': '0x2Eb4A16aF31DC59E8aAAfdC5B5e126D66789d8aD',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0xfD766A021D799446AAeEC9919016EC4ee184Ed11',
        '2147483647': '0xf2de6320f7ef40420d04eEFD253A3eD8F8748a00',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0xfD766A021D799446AAeEC9919016EC4ee184Ed11',
        '2147483647': '0xd9AbC1134a1EcA5c620267EffcbF8a3C10483f56',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1bbgczqrpkxig6l4zxhmlsvyuckzmyhxz2t4fbiy',
        '10': 'f1sjkfcyv5tiuatijewhdlzq7dinf7ay3x3n4bq5y',
        '2147483647': 'f14t23csq7dbckmn6fdv6o4j7xisrx5qc7r3cqb2y',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qz99y65e32n93pngrfzk9urgpnjxktr3xzkelga6z9pnz580ky96uarw3euwc',
        '10': 'kaspa:qzg8w2x3v867yk2k4efueps04al4fp4uvnzh8tend8mcwc9a5zfwkdvtm8u8n',
        '2147483647': 'kaspa:qplz0yc2h4fzdw2unwdw70sgreapvnvhs8ahg0eppv206ra63zqf7v0tjj0gh',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'ded444916ba2ec8997a5b2481ad0d40794c41465afd12a347c3c6764e9c3a087',
        '10': '322a59a5eb5b26a91884a74f605565cffdf20d208d30e0f43c0475115ad6c2cd',
        '2147483647': '84855fa3e0fe771e732e24b73c5ddf7ecd100a5527cc391314af8720be368494',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NCNFAFHLRZAWCB43EXEBSVQ3LZS6XCRXIRWJ4AQU',
        '10': 'NDBNVBBIRW3OTNS5MYZZYFDKNTQQWWSPD4R3PWMG',
        '2147483647': 'NDRIDHOAHSTWFJ7DRFD64DTT6TR6B4A2XOCLPWSA',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5l42tkgjfyvu8d68q0p0ljqj6yfr4cwkfxtd3mw3w',
        '10': 'nexa:nqtsq5g5ar4dsv3dskaeydq0l8s2h3093lsp7wnsnt6eazdc',
        '2147483647': 'nexa:nqtsq5g56wh6vh9cumpj2jrzgasdkp8yu5dlg0kp3uwh8jhm',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '16B1V7Zmc3Bz3EiS4aKt8wjd71Ay1RfcmSztmMr6j3BTp57b',
        '10': '12aV9kfHshFTnj5zoTXQu1Q3rr1jm9xgvYq9QNn8UJixzHfR',
        '2147483647': '12dBgMZWPwtfnCgG4HMtZY493EpttZExKQpVrjCusLPCNGeR',
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
        '0': 'b7Jn5GnXVZcpXjkbEj12T4kLRtSHLpDi9mYqn4c3K9uDqwY',
        '2147483647': 'XZUyKGXKQGJZVhaawm1T3PGGfYNAUPZG7b9w9RRBcMdmpgr',
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
        '0': 'HkL16eaNcwSMMXMse5vtkGUPyTZ7nvf9L79zj8hekNSNiYe',
        '2147483647': 'ECWCLeKAXe86KVBsM7wKLazLD7UzvVzhHvm66VWo3aAvoQg',
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
        '0': 'j4WVcupYfcyRYSK9fNuiZqwcTmmFtp1geQttqycu4c2JaH7sh',
        '2147483647': 'j4Swo74YQQt8EBH7VNckaGXvyhzuph9FyxriT4zFskKWJqAQB',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rHfhtv3uw3wVcaWwxhemvF8o1ePuG5SCVp',
        '2147483647': 'r3gKSioZZP7YCCtGoDEdMvJjCf5TEQ9ahC',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '8kxzYEY5qySM1PX9GDCYyGHaBfdLHYb3EuRcTasTLW9T',
        '10': '69tLJR7CA5N5Hfgywn9odfnbBsq4KxDApomSqEnWfi42',
        '2147483647': '4H6g9uwb4zVPtgq7KuYR16cEdkSnatfyj7LjudTgbXNL',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x6498ce371d8a5f976092dc15abfdfe31',
        '10': '0x98cad6082038584f19b1bf54a3831022',
        '2147483647': '0xa4ad8cbc0cc6270fd9536c914416f5d3',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GCLZ3QEJUMFAYYJACUQ7VTQB32MNG7HVSSRPSVOAXGMYVSJC67GRZN7I',
        '10': 'GCYPQPE6GML36T6OR6QHDSBLPUBDSLF6VA7DKIPMRYUWT3X5OFVEW3D4',
        '2147483647': 'GBR44EZXYIURIPLXGMJH3RALCOAG7YHHD5GAREESS5LPRXUCZTXNUFEW',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x2ee810c115135af679de6630c0ef468014ef81107e13de1750f35a97b38e0676',
        '10': '0x664b13dd9731dc3c3f0e67be3b7728926dbbc460d17914976fbb9d32413e1ac4',
        '2147483647': '0x557d6cac6e91ee6dddb6f2c0a7f04241442b6a00471a455072e5e8c36b460a17',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TAgCXmto6s6dvpncbRDF9gGgMsYF2fv1RX',
        '10': 'TART58zARiD7Nyz7aks3Tc8zk2wb6PvYoi',
        '2147483647': 'THf7z1ZyMQRCgwEar6sLZDiC6JRqByeqbs',
      },
    },
  ],
} as AddressTestCaseData;
