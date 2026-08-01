import type { SLIP39TestCaseData } from '../../types';

export const count33TwoPassphrase1: SLIP39TestCaseData = {
  id: 'count33_two_passphrase_1',
  name: 'count33_two_passphrase_1',
  description: '2-of-3 (33 words each) + passphrase_1',
  passphrase: '12345',
  shares: [
    'yoga racism academic acid average silent year kind package pitch bracelet desert aide guilt render belong density forbid spark benefit trend junior fake dough silver spray adequate western liberty hearing strike prepare various',
    'yoga racism academic agency antenna aircraft nervous biology buyer invasion satoshi angry darkness skin guilt market fatal violence item platform painting width involve marathon parking duration pancake wildlife should execute silver metric oven',
  ],
  data: [
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
      },
      expectedAddress: {
        "m/44'/0'/0'/0/0": '1E5vFVWP9GJnxR6vigrMViWEqdYJganJoy',
        "m/44'/0'/1'/0/0": '1AbtFxp2SGXU8eMKi1zNqRzzmpdFqFqfvt',
        "m/44'/0'/21234567'/0/0": '1PpjQs7aS8CAQikR4ivGLUaDyfgxkbm7Y6',
        "m/44'/0'/2147483646'/0/0": '1H6f6BC22ARERpRk1njCRtCMgjbhjFH4gM',
        "m/44'/0'/2147483647'/0/0": '1QEieceRdq9SaoTPMWk4UhHk5U5Kign1Wf',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDP2SHWITNESS',
      },
      expectedAddress: {
        "m/49'/0'/0'/0/0": '3LCEvF9gZ59ii2TMUg1qKb2hjiy4df8zey',
        "m/49'/0'/1'/0/0": '3Ap7RePRANvNvNBRfMpWCoP8TatPhNnKvB',
        "m/49'/0'/21234567'/0/0": '39THJN72144g31JWXLbjcnuERu4N3rLBJv',
        "m/49'/0'/2147483646'/0/0": '3Ns1kgmw41soYR7CPr27KP98WGZfSPjH8U',
        "m/49'/0'/2147483647'/0/0": '35SPPLmZTATzcd7oojMqQwHE6HavR54fRY',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDWITNESS',
      },
      expectedAddress: {
        "m/84'/0'/0'/0/0": 'bc1qw8hl3ax2djawv25p3dd3exzp3mmunha9ravra5',
        "m/84'/0'/1'/0/0": 'bc1qrnray7q6vvc5lkhdvzxjfurcm8rft3fk8w7t2m',
        "m/84'/0'/21234567'/0/0": 'bc1qpvswkj50mscls75wuhhuuqsnc0ltc58nw9vz79',
        "m/84'/0'/2147483646'/0/0": 'bc1qakr3gkhff23rhxnx2wt5lsxld9ehh00wlg3zmr',
        "m/84'/0'/2147483647'/0/0": 'bc1qpjmcqxjvpypwz04qn2qwddazqpf3qdrzndkmlc',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDTAPROOT',
      },
      expectedAddress: {
        "m/86'/0'/0'/0/0": 'bc1pxd8s0u0jr7wzhvfx34q3le43sjzgz23sd447vprxhj49v0ccku5qpchjag',
        "m/86'/0'/1'/0/0": 'bc1pq9jw9zfatac5s89qk9flthq39ulaz5pf9dhqzse9tepjnc74uxkq4umae0',
        "m/86'/0'/21234567'/0/0": 'bc1pt5p3sh6wc7t9uy53q8pwr8vjr92xndz4nphd642m8e2shyvkp3usczqzgw',
        "m/86'/0'/2147483646'/0/0":
          'bc1p3a5jrklfpu9rw4mg8exvf0ccrrkjkhwh48v78j8ljktpy9zgfxyslumz9w',
        "m/86'/0'/2147483647'/0/0":
          'bc1ptzkxhdqxkwpj20jmjteag4wdfsk26lkwxmljv8qkpayyyhqa68xq996ta4',
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
        "m/44'/3'/0'/0/0": 'DKpDCwvoqWG2NnpHGJFkR1B4oNXiCvhk9e',
        "m/44'/3'/1'/0/0": 'D79hXN7zLxNn9DoARrE68hwcNWCXe49fim',
        "m/44'/3'/21234567'/0/0": 'D5bbTZmdA4ZngYr6CayATHBYp2SJq9zVKm',
        "m/44'/3'/2147483646'/0/0": 'DMJ5pboKuAwF1qmtxV7fud7BJGAV83HYxU',
        "m/44'/3'/2147483647'/0/0": 'D8M4G2xgUm6ggbRoopKAFurDwA9V7j8gtm',
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
        "m/44'/145'/0'/0/0": 'bitcoincash:qz8zw4fy60fvfq0r46cmfjcdarlcgykk65mtj9ra9e',
        "m/44'/145'/1'/0/0": 'bitcoincash:qrjyzvhtevz2g2z8r42cjujp29h9p42htc64prhrle',
        "m/44'/145'/21234567'/0/0": 'bitcoincash:qrjdaxdqzvf7y8nj6ajwcfx0lg338wlrlqkmp2ph79',
        "m/44'/145'/2147483646'/0/0": 'bitcoincash:qqlwrg5wr45uvac82k3nzs0ypq5carw6kup3ltul3j',
        "m/44'/145'/2147483647'/0/0": 'bitcoincash:qz8dnqntafxw5dy4780q75qwhuau4y7wxumrf0tv0g',
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
        "m/44'/2'/0'/0/0": 'LLGZGBMUSRHyauwt54CnqAoKnucMDET1Y8',
        "m/44'/2'/1'/0/0": 'LhqPMikXQtdDvh9xFb2kuMMrLnvL8c2wLz',
        "m/44'/2'/21234567'/0/0": 'LWjEvTdLkQgR23QAmMm7djKGTbsaHBn7Tx',
        "m/44'/2'/2147483646'/0/0": 'LR4TCSvU1dUBCz6ymNFzk3VQZLjoEsdfVC',
        "m/44'/2'/2147483647'/0/0": 'LhyDdPyXH7dGThELMKfG2KdSe3PcDWEYj1',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: "m/49'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
        scriptType: 'SPENDP2SHWITNESS',
      },
      expectedAddress: {
        "m/49'/2'/0'/0/0": 'MW53azMx66tsfC4Y9ACvh72yGGo9zmk1sm',
        "m/49'/2'/1'/0/0": 'MLL86HMWe8c3CA5VAzGNwsiCeniShwHr1W',
        "m/49'/2'/21234567'/0/0": 'MQZsdLkajEtfCt632zqkvb3XLYTXsTW6CE',
        "m/49'/2'/2147483646'/0/0": 'MBDKXbCCYe1sFjjRQzQGEtaaxbwWvjaXjJ',
        "m/49'/2'/2147483647'/0/0": 'MEReg8VotfmvxfE9a4YUvrGu9yWeM1HBr8',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: "m/84'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
        scriptType: 'SPENDWITNESS',
      },
      expectedAddress: {
        "m/84'/2'/0'/0/0": 'ltc1qreqnrvlfgwr0duttqxwr5sx7l72v7029jw0086',
        "m/84'/2'/1'/0/0": 'ltc1qp7gen2x3jajxghm77amjsyv54c7kdrjv45v6fv',
        "m/84'/2'/21234567'/0/0": 'ltc1q77v9mpm3f3hzwxnhfag370z7u8lwfefqw3twyv',
        "m/84'/2'/2147483646'/0/0": 'ltc1q90u090m6kk7zryh587pdjep6kxaaf9zd8rzafp',
        "m/84'/2'/2147483647'/0/0": 'ltc1qrx6gyp45fp3dqnj64l6edaxpjg7zym3x3unqeu',
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
        "m/44'/1900'/0'/0/0": 'NgVsuVcqEa5Rgfkf2s4F4Dz57Ua46a64Xa',
        "m/44'/1900'/1'/0/0": 'NbPPPqLA9nThmiVDryqtwR6oqFpndEKKfq',
        "m/44'/1900'/21234567'/0/0": 'NLm5XhzGaxxNTntc1sUfPx7GR8gJjt5pZC',
        "m/44'/1900'/2147483646'/0/0": 'NQCRXurFYF33jwaSiDKqZ5ZH48JpdAXXZA',
        "m/44'/1900'/2147483647'/0/0": 'NggJXurJMCMGh8qctgu9jfcuaghVAhYqyG',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/60'/0'/0/0": '0xB9D902e65B81E9858ec1098aA15F1bcE9853bf44',
        "m/44'/60'/1'/0/0": '0x2F3Dd2Fc9c391dD0081ad50644f5aF44F9Ed8B35',
        "m/44'/60'/21234567'/0/0": '0x39eb58bc83AA5B4fe75B2fdBE2aAb5D763b3FD05',
        "m/44'/60'/2147483646'/0/0": '0xd1585f2145c8127d2e86bE577c381d9E61Da6DF0',
        "m/44'/60'/2147483647'/0/0": '0x49a892Cf77AbA2e8f905112347dF920418e70725',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum Classic',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/61'/0'/0/0": '0x2e56e4927d6d17282c00F14A8de7A3224f22578e',
        "m/44'/61'/1'/0/0": '0x13A8c8F1392Dc65C8165a52C3d5721D20da71d23',
        "m/44'/61'/21234567'/0/0": '0x10b10A65224816238cc11AC1ae9Af5f7be47851F',
        "m/44'/61'/2147483646'/0/0": '0x455261B52A9226F8aF0BF067B2441AD2064b8f9E',
        "m/44'/61'/2147483647'/0/0": '0x418Fd89EA9d76a150d5226dBbDFBfdab3c00dDEC',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-cosmos',
      params: {
        hrp: 'cosmos',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'cosmos19adgjm20qvarkauz94h7rskv4h0pakw3hqp9da',
        "m/44'/118'/1'/0/0": 'cosmos1vc2zv96vppw0n5zetu49zxvsgemrqnkyv2vsy0',
        "m/44'/118'/21234567'/0/0": 'cosmos1e6kq6ulgpzgcqd3gv8lh7mn4v3rl35zqndt9zp',
        "m/44'/118'/2147483646'/0/0": 'cosmos1hndyw72fuufvc2dzmg9fj0cpe02ctwuhela5hj',
        "m/44'/118'/2147483647'/0/0": 'cosmos1ley65htm3yy69f8vdazemgjfd0gh688zdus4nt',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'akash19adgjm20qvarkauz94h7rskv4h0pakw36mvz58',
        "m/44'/118'/1'/0/0": 'akash1vc2zv96vppw0n5zetu49zxvsgemrqnkyp3pha4',
        "m/44'/118'/21234567'/0/0": 'akash1e6kq6ulgpzgcqd3gv8lh7mn4v3rl35zq7kxzmm',
        "m/44'/118'/2147483646'/0/0": 'akash1hndyw72fuufvc2dzmg9fj0cpe02ctwuh5ysnwg',
        "m/44'/118'/2147483647'/0/0": 'akash1ley65htm3yy69f8vdazemgjfd0gh688zq8aj23',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'cro19adgjm20qvarkauz94h7rskv4h0pakw30mfu3v',
        "m/44'/118'/1'/0/0": 'cro1vc2zv96vppw0n5zetu49zxvsgemrqnky53yfc7',
        "m/44'/118'/21234567'/0/0": 'cro1e6kq6ulgpzgcqd3gv8lh7mn4v3rl35zqtkru7s',
        "m/44'/118'/2147483646'/0/0": 'cro1hndyw72fuufvc2dzmg9fj0cpe02ctwuhpy4dtr',
        "m/44'/118'/2147483647'/0/0": 'cro1ley65htm3yy69f8vdazemgjfd0gh688z48cv06',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'fetch19adgjm20qvarkauz94h7rskv4h0pakw3yagp02',
        "m/44'/118'/1'/0/0": 'fetch1vc2zv96vppw0n5zetu49zxvsgemrqnkylh95xc',
        "m/44'/118'/21234567'/0/0": 'fetch1e6kq6ulgpzgcqd3gv8lh7mn4v3rl35zqqszpqk',
        "m/44'/118'/2147483646'/0/0": 'fetch1hndyw72fuufvc2dzmg9fj0cpe02ctwuh2z5s49',
        "m/44'/118'/2147483647'/0/0": 'fetch1ley65htm3yy69f8vdazemgjfd0gh688z7pe33u',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'osmo19adgjm20qvarkauz94h7rskv4h0pakw3lmj4m0',
        "m/44'/118'/1'/0/0": 'osmo1vc2zv96vppw0n5zetu49zxvsgemrqnkyy3lqja',
        "m/44'/118'/21234567'/0/0": 'osmo1e6kq6ulgpzgcqd3gv8lh7mn4v3rl35zqmkc45n',
        "m/44'/118'/2147483646'/0/0": 'osmo1hndyw72fuufvc2dzmg9fj0cpe02ctwuh3ywypq',
        "m/44'/118'/2147483647'/0/0": 'osmo1ley65htm3yy69f8vdazemgjfd0gh688z98r99e',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'juno19adgjm20qvarkauz94h7rskv4h0pakw3pjz72p',
        "m/44'/118'/1'/0/0": 'juno1vc2zv96vppw0n5zetu49zxvsgemrqnky6c0trn',
        "m/44'/118'/21234567'/0/0": 'juno1e6kq6ulgpzgcqd3gv8lh7mn4v3rl35zq9lg79a',
        "m/44'/118'/2147483646'/0/0": 'juno1hndyw72fuufvc2dzmg9fj0cpe02ctwuh0d70sw',
        "m/44'/118'/2147483647'/0/0": 'juno1ley65htm3yy69f8vdazemgjfd0gh688zmwnw5h',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'terra19adgjm20qvarkauz94h7rskv4h0pakw33ym90a',
        "m/44'/118'/1'/0/0": 'terra1vc2zv96vppw0n5zetu49zxvsgemrqnky2wksx0',
        "m/44'/118'/21234567'/0/0": 'terra1e6kq6ulgpzgcqd3gv8lh7mn4v3rl35zq4f39qp',
        "m/44'/118'/2147483646'/0/0": 'terra1hndyw72fuufvc2dzmg9fj0cpe02ctwuhlm854j',
        "m/44'/118'/2147483647'/0/0": 'terra1ley65htm3yy69f8vdazemgjfd0gh688ztc243t',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'secret19adgjm20qvarkauz94h7rskv4h0pakw3494vsp',
        "m/44'/118'/1'/0/0": 'secret1vc2zv96vppw0n5zetu49zxvsgemrqnkyw0ceen',
        "m/44'/118'/21234567'/0/0": 'secret1e6kq6ulgpzgcqd3gv8lh7mn4v3rl35zq3glvla',
        "m/44'/118'/2147483646'/0/0": 'secret1hndyw72fuufvc2dzmg9fj0cpe02ctwuhm6fa2w',
        "m/44'/118'/2147483647'/0/0": 'secret1ley65htm3yy69f8vdazemgjfd0gh688z0eyuwh',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'celestia19adgjm20qvarkauz94h7rskv4h0pakw3x2s4hs',
        "m/44'/118'/1'/0/0": 'celestia1vc2zv96vppw0n5zetu49zxvsgemrqnkyaqaq7z',
        "m/44'/118'/21234567'/0/0": 'celestia1e6kq6ulgpzgcqd3gv8lh7mn4v3rl35zqz864cv',
        "m/44'/118'/2147483646'/0/0": 'celestia1hndyw72fuufvc2dzmg9fj0cpe02ctwuhg4vydl',
        "m/44'/118'/2147483647'/0/0": 'celestia1ley65htm3yy69f8vdazemgjfd0gh688zukp9fx',
      },
    },
    {
      method: 'suiGetAddress',
      name: 'suiGetAddress',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/784'/0'/0'/0'": '0x761f440c1f53eb1a31e8bf9f1e1ab3893c2a5aa116f2a6bf1422bf989ed5dbd4',
        "m/44'/784'/1'/0'/0'": '0xc7c11e9bbdd9368e78166422ebe99c5b33eef2f0506794e28d9b2919b5d25619',
        "m/44'/784'/21234567'/0'/0'":
          '0xc363b6a97f4841fb28db9c775498d23f40b611b5eee8c4d1b2e7575e43ce33d3',
        "m/44'/784'/2147483646'/0'/0'":
          '0x5ef1ecc07415a1cfe7e336245c650794bb85b3a3e42870f513f4d65b1445f21e',
        "m/44'/784'/2147483647'/0'/0'":
          '0x6e3d7f3e51c9ebd458b4a2d60ef1de766c1496331e652122a2d727bdf7aa23b8',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rNK46yNGcZ1pT4Q9iYRv1dsNvN7GiFKxez',
        "m/44'/144'/1'/0/0": 'rhHRi2G9h27A8FWsQdDzQxbvNHn3F35WWU',
        "m/44'/144'/21234567'/0/0": 'rfZUx5iK9K8CjvQ8PpHuUyJzCSCg4G5zTP',
        "m/44'/144'/2147483646'/0/0": 'r3pmAgXwXbjBTPmeCG1f3ujgWPiz863ipt',
        "m/44'/144'/2147483647'/0/0": 'rM2qxmjWL7LKRJgi929KhkrPff3vTspjBw',
      },
    },
    {
      method: 'benfenGetAddress',
      name: 'benfenGetAddress',
      params: {
        path: "m/44'/728'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/728'/0'/0'/0'":
          'BFCf55001a305d52965cd99d35992af5137c89895a1694d54df805b001af6af9f6c880c',
        "m/44'/728'/1'/0'/0'":
          'BFCf407e2fa4a07de88daece3e19b5ac4f189d43a561bc4e5431d4366b1442e49edca04',
        "m/44'/728'/21234567'/0'/0'":
          'BFC81a950c05540d9e35e781936590997bae7746874a5aba1ed8615a987100ba353c39f',
        "m/44'/728'/2147483646'/0'/0'":
          'BFC4e035b3ea594713b5dfe4d3d0e14ac1a42facf134526469f741553ca29f31851b32e',
        "m/44'/728'/2147483647'/0'/0'":
          'BFCefe31ab16c582996f80275cc1b6bac8533c604989943dfa330da208aad1043393b04',
      },
    },
    {
      method: 'alephiumGetAddress',
      name: 'alephiumGetAddress',
      params: {
        path: "m/44'/1234'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/1234'/0'/0/0": '1MnkhQBoA3DGGseCq6wBo4wa1xQwDhHn6hfYJNWmQm15',
        "m/44'/1234'/1'/0/0": '18VMx47p6BvpeDHdQDBvsNzCLhTV9uy6qWNKHVyLmLiQN',
        "m/44'/1234'/21234567'/0/0": '14cWtLmShwiUY5aNJ95vePa1LEb4aKzE9xgCH3xoSaUjx',
        "m/44'/1234'/2147483646'/0/0": '1usH77nv8ZM7MMiAQ6Sw5by9U1AxGPAgwDergA5xa2G1',
        "m/44'/1234'/2147483647'/0/0": '19ij8NoWMFK7j465HxgLkHcP48fyjqJzDr5SatTBww3EJ',
      },
    },
    {
      method: 'algoGetAddress',
      name: 'algoGetAddress',
      params: {
        path: "m/44'/283'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/283'/0'/0'/0'": 'W2EDUY2LWL7S73ARZL5ZSUQDVBE6MIRBKG2NSS5PIWMS3XHA5WBA3BEYTU',
        "m/44'/283'/1'/0'/0'": 'FVTFHAYKWSRDPCDUBX3ZCNKX3AZ3CLCPN73Z453WC5WKXN6U7ITFQSWQHA',
        "m/44'/283'/21234567'/0'/0'": 'OB6IKT5GPS2IAJTQPOOPIONSTGMMCLO5EEUCCIANAX3AAS5BIJL7ACNTNI',
        "m/44'/283'/2147483646'/0'/0'":
          'JJ6DCHTH6GJ2K2EMLLYQAFDTNVSYYY3OQFJEH7OLYUAORTAR2VJIESQ4XQ',
        "m/44'/283'/2147483647'/0'/0'":
          'MHSF27V4VZE6BF7GFGOT3DNT566NLF2OHKQBAKWPJ6KZGHQAPQFDSHLU6E',
      },
    },
    {
      method: 'tonGetAddress',
      name: 'tonGetAddress',
      params: {
        path: "m/44'/607'/$$INDEX$$'",
        walletVersion: 3,
        isBounceable: false,
        isTestnetOnly: false,
        workchain: 0,
        walletId: 698983191,
      },
      expectedAddress: {
        "m/44'/607'/0'": 'UQCP7oQ0PLkfEQVwlJ6rnJSUFvTjgmRs8u4PGxSaLNr5CD8W',
        "m/44'/607'/1'": 'UQBAcVgF2uZzDUlr1qa-3V88Rx4keBLVHFcWLtP1nuc3UgTV',
        "m/44'/607'/21234567'": 'UQClOHxrJUTRs-jxTv3W0LhhDANzoc8N1BOfxNng0abXZ0kY',
        "m/44'/607'/2147483646'": 'UQD_N7hv_tjPdqOdGeJC6lT5Qptpj2VjrJwXPfAaeR8dFmKs',
        "m/44'/607'/2147483647'": 'UQDagJN_vlImTX_JHsxwZFW3CtiTR29gWOxyKSg-uFxw6U9W',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
        network: 'ckb',
      },
      expectedAddress: {
        "m/44'/309'/0'/0/0": 'ckb1qyqd392yfreprkaue0dvtga0ghxr40vwqq6q5zcfnt',
        "m/44'/309'/1'/0/0": 'ckb1qyqpwv70vcq0eaata0l5fjapqegz4cv0g73s4jajv8',
        "m/44'/309'/21234567'/0/0": 'ckb1qyqwphpcpkdccxykz0n8tphx5smhd6dptc7seyl0gx',
        "m/44'/309'/2147483646'/0/0": 'ckb1qyqflyy0sdafzkcwfucudexsk70t8jq9jz4qpusvkf',
        "m/44'/309'/2147483647'/0/0": 'ckb1qyqw74ryw3jp42p0l0cezd4fmkzppk0k406qmdaye2',
      },
    },
    {
      method: 'nexaGetAddress',
      name: 'nexaGetAddress',
      params: {
        path: "m/44'/29223'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/29223'/0'/0/0": 'nexa:nqtsq5g5k0njelul3ne7qldkg2lzueaxnh5t9u3pl93kzxn4',
        "m/44'/29223'/1'/0/0": 'nexa:nqtsq5g5as8qyn9vlltvrdlhpvclv6eynveg7rwxf3ycpyg8',
        "m/44'/29223'/21234567'/0/0": 'nexa:nqtsq5g5few0g6h6lq08avaqjqnt22v2qqj4lgy6fqvcccmj',
        "m/44'/29223'/2147483646'/0/0": 'nexa:nqtsq5g5elr82vh5p2lehrgq4ha7uvv6d39e93lhxc3r9fu7',
        "m/44'/29223'/2147483647'/0/0": 'nexa:nqtsq5g54mraxvaq3v0l3za4qcnqx6fh2wq062kfmdn8taxm',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rNK46yNGcZ1pT4Q9iYRv1dsNvN7GiFKxez',
        "m/44'/144'/1'/0/0": 'rhHRi2G9h27A8FWsQdDzQxbvNHn3F35WWU',
        "m/44'/144'/21234567'/0/0": 'rfZUx5iK9K8CjvQ8PpHuUyJzCSCg4G5zTP',
        "m/44'/144'/2147483646'/0/0": 'r3pmAgXwXbjBTPmeCG1f3ujgWPiz863ipt',
        "m/44'/144'/2147483647'/0/0": 'rM2qxmjWL7LKRJgi929KhkrPff3vTspjBw',
      },
    },
    {
      method: 'scdoGetAddress',
      name: 'scdoGetAddress',
      params: {
        path: "m/44'/541'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/541'/0'/0/0": '1S0185e8795782a4dc1eaf373c0123984bc433b831',
        "m/44'/541'/1'/0/0": '1S014e28bfb040e2d9a72462de3459a5b190982bc1',
        "m/44'/541'/21234567'/0/0": '1S01485d4b464b91bd3dad378c2cb6927f320cbca1',
        "m/44'/541'/2147483646'/0/0": '1S01ca36eb8e169c40cc85ae10b8f00b7ba5be1411',
        "m/44'/541'/2147483647'/0/0": '1S01a8afa15ef4672076a7c018d26022f55c93dca1',
      },
    },
  ],
};
