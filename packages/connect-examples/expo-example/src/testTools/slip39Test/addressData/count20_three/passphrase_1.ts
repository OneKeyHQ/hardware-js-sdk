import type { SLIP39TestCaseData } from '../../types';

export const count20ThreePassphrase1: SLIP39TestCaseData = {
  id: 'count20_three_passphrase_1',
  name: 'count20_three_passphrase_1',
  description: '16-of-16 (20 words each) + passphrase_1',
  passphrase: '12345',
  shares: [
    'platform helpful academic afraid custody blind shaft burning visual prune knit clay mason genuine march crisis smug wits woman taught',
    'platform helpful academic alto armed theory alpha paces welcome quick quiet device craft strike chemical ocean briefing space phantom legal',
    'platform helpful academic anxiety cage sympathy dramatic western acrobat transfer oral spew package style scroll pajamas curious grant center alto',
    'platform helpful academic award cards category salt guest pharmacy devote pistol focus identify infant evoke recall shaft empty hazard romantic',
    'platform helpful academic bike clogs estate duke thank bolt floral race phrase preach seafood strategy industry crowd length grant yield',
    'platform helpful academic bracelet clock daughter memory visitor result blanket garbage starting speak clay junction pitch ladybug jacket fluff ultimate',
    'platform helpful academic burning credit install sidewalk level museum evening permit duke cards findings aunt document improve woman general august',
    'platform helpful academic carve ajar edge similar glance darkness random envelope glen ancestor gums view venture wealthy learn ivory exotic',
    'platform helpful academic class depend gather story empty harvest overall craft leaves nuclear reject kernel that temple width presence speak',
    'platform helpful academic company adequate western resident dismiss mortgage emperor coastal sack example ancestor mason length mama timber rhythm buyer',
    'platform helpful academic crucial domain bedroom violence mental multiple language sympathy grin beaver salt excuse pants worthy vegan prepare unfold',
    'platform helpful academic deadline crush depart thank pregnant treat salon ambition miracle sidewalk speak practice taxi soldier scholar vitamins junk',
    'platform helpful academic deploy chemical afraid justice undergo deny excuse famous entrance scene early photo glance salon platform wildlife ladle',
    'platform helpful academic diploma cricket trend loud replace rapids payment paces theory easel spine cultural dictate hormone necklace blimp exact',
    'platform helpful academic dragon company true volume carve dough endorse force plot cinema remember skin transfer criminal hunting axle mayor',
    'platform helpful academic easel deadline evil museum spill funding muscle retreat smart timely oven transfer grownup deal armed merchant flash',
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
        "m/44'/0'/0'/0/0": '1L6qT8uLdNWxnFdVtdMrsFEj5a9kTTawbt',
        "m/44'/0'/1'/0/0": '138okb5TrcDnb6MdtFVUNfVLTVsTcVcfgH',
        "m/44'/0'/21234567'/0/0": '17LuTxPnMaf8gLXX4UDNzUWcsoRUtiRLSR',
        "m/44'/0'/2147483646'/0/0": '14Gc3rEcWTaH3RuAdaG1u9jUM6dJCeaABf',
        "m/44'/0'/2147483647'/0/0": '15XfXisnLipciPzDDzANijCPhc1RznVTKd',
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
        "m/49'/0'/0'/0/0": '38Qjm6HeB6mJ5nkbxMc8q2bv4V96UWmB36',
        "m/49'/0'/1'/0/0": '3PfPW3MKpwMyzH8Wru2oKvxHHuEEyRVz9x',
        "m/49'/0'/21234567'/0/0": '3JfhM2aYpQsfSKfC3h7HFiWukMRzHJYwBq',
        "m/49'/0'/2147483646'/0/0": '3PYvayd4qVRdiepuVt5WeBQgg5ESCFHgXy',
        "m/49'/0'/2147483647'/0/0": '3N36SenH2KGjYAF3jVwStuY4BM5ox2kh7H',
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
        "m/84'/0'/0'/0/0": 'bc1q6y4nze9se48ksu8y5fvgy590jwmlj4fvlz4kev',
        "m/84'/0'/1'/0/0": 'bc1qk2z7ewvaeatucmxcpdxv93m8uf5ktd5lptu2kv',
        "m/84'/0'/21234567'/0/0": 'bc1q46ss2m50t2pg9tjtehv57mnxdprznvgn8whk2a',
        "m/84'/0'/2147483646'/0/0": 'bc1qlhmku4veq28nrp8j76vx9mgag76muvqw33wxe3',
        "m/84'/0'/2147483647'/0/0": 'bc1q0l8s6d76vqnxutr97edltn4c0pevp720w5246t',
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
        "m/86'/0'/0'/0/0": 'bc1pjn2k6v7sckhhax7xex0j2dpm9ugseqtqzcmdzlqu2ft92ue2jfast5cqcd',
        "m/86'/0'/1'/0/0": 'bc1pnvl655k2r00vuu8x5h0q5a8xrn7gz72tgy5nhkmrqf0usch79kaslxdh6c',
        "m/86'/0'/21234567'/0/0": 'bc1pj9p0gepprm3a6d8p3gmaf5thuzqt2x6v0qv3qwqnap756fg7xtcsm6jp8f',
        "m/86'/0'/2147483646'/0/0":
          'bc1p7zcaktujyx0glpv27la0yru4je349qcpg0mge0q2rl0xt8dwljvq5k2csy',
        "m/86'/0'/2147483647'/0/0":
          'bc1pymp07l03m26usrz5988hk562ag9r4j9qlhedf2u3acy8frz3epnqjagsgm',
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
        "m/44'/3'/0'/0/0": 'DUDhYeVbne3drQHeRirpnYUMDQkXZTbkHh',
        "m/44'/3'/1'/0/0": 'DSQ8Gdb1eUCEMPK58VuEmS1hLDxffscH5T',
        "m/44'/3'/21234567'/0/0": 'DULtvpDy7AUvVgRmpxyZmvAqY7wwY5A6j6',
        "m/44'/3'/2147483646'/0/0": 'DA5E2vy2eFRfFUUeQiprqHYJ7oimZpieoB',
        "m/44'/3'/2147483647'/0/0": 'DLJAdteRppyw8YaUVbmpL3vjyekEzNQ5Wz',
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
        "m/44'/145'/0'/0/0": 'bitcoincash:qzyg93psh2f6nukngtz4es5zfd8drwrqkurg2v7338',
        "m/44'/145'/1'/0/0": 'bitcoincash:qqqczn8sftegngj3nge6g807ps9s25egrsmvhae0r2',
        "m/44'/145'/21234567'/0/0": 'bitcoincash:qr303tzygq7jjzndxklqlghc2evvw7vk6uutxe2s62',
        "m/44'/145'/2147483646'/0/0": 'bitcoincash:qrg4eczpqjtydxps7fdrer5n0x0v286m5vvryldyg4',
        "m/44'/145'/2147483647'/0/0": 'bitcoincash:qrr56592ceuczhrw2qe0tkk2qwdwcdhukge3987ndx',
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
        "m/44'/2'/0'/0/0": 'LhuGTVqtkuDtcm6DxoFbM3Rwa6qLe83e8e',
        "m/44'/2'/1'/0/0": 'LdUXJvcBD3HC2pMbsMuPrX2yRUh7kW3nYS',
        "m/44'/2'/21234567'/0/0": 'LU9YhB5j5GMM7GYJ2D8NWrmmWgBjCTWNvp',
        "m/44'/2'/2147483646'/0/0": 'LW24TG29wN1m574Vmcu7RvxnB9WEHR4U1u',
        "m/44'/2'/2147483647'/0/0": 'LU2jXbp2kG29L2nnAishKWMVnfN3T1rfv3',
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
        "m/49'/2'/0'/0/0": 'MC8eZTCih4Q1kTf1Fxt76t5e4NtQv7stqZ',
        "m/49'/2'/1'/0/0": 'MEkP1RNxjQcQ9xKB6kpbf33MPXYNc1iWJE',
        "m/49'/2'/21234567'/0/0": 'MEzh5gH2d2HfRnH9enaB4MzZXUCKjizpMC',
        "m/49'/2'/2147483646'/0/0": 'MPKkQfS5Xt4PrnNdexHj5EVsQu9JerB4LA',
        "m/49'/2'/2147483647'/0/0": 'MNcD7rNURB7tF8AeWLBdb9R7iheL5CRhQK',
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
        "m/84'/2'/0'/0/0": 'ltc1qehgr6ld2z963l8uquaervavv9uyk0hjscexsmd',
        "m/84'/2'/1'/0/0": 'ltc1qr3w4uyvte2xwv9wy0nwmce5wlsdfj64z5j4cd6',
        "m/84'/2'/21234567'/0/0": 'ltc1qhdj3h6yf5fts3r5htsme3e5pnfqyky6tjepjek',
        "m/84'/2'/2147483646'/0/0": 'ltc1q6ghw325pqj6u24627zwlc7t58hghzzxucdaahz',
        "m/84'/2'/2147483647'/0/0": 'ltc1q6c98rvfs6z3zkf4tzx9wkyf37xg7rxyz4emhuy',
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
        "m/44'/1900'/0'/0/0": 'NPhTSAY2VjcjvWjYmFxrBTR3eifq6NKHzn',
        "m/44'/1900'/1'/0/0": 'NVAXqJ9aUkhuwCrMEVVJz449JJzTA9Nevi',
        "m/44'/1900'/21234567'/0/0": 'NitDpDaf7bL8fCaMw6wTYGvvh2vDgpHhgo',
        "m/44'/1900'/2147483646'/0/0": 'NbB99RrdMrYhqUUwTBUbahaXECMiHrwH1a',
        "m/44'/1900'/2147483647'/0/0": 'NZS9t6TchvCvzjudCGeFiVdZ6GKJbEaqcY',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/60'/0'/0/0": '0x86BD0D59f6dA7e07bBB6f72BCBe11Cdc7f395BDc',
        "m/44'/60'/1'/0/0": '0x6c06c27fBC6d548F8485Da7b3EFEde94981b35f9',
        "m/44'/60'/21234567'/0/0": '0xc273a7941b7670F3635532e3BCB23fdc82067af0',
        "m/44'/60'/2147483646'/0/0": '0xFB7C6F167724397d83d13d774D1C0b61AD48353A',
        "m/44'/60'/2147483647'/0/0": '0x09a07C427b57e8fE636737DB97334de53E8ba124',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum Classic',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/61'/0'/0/0": '0x4e2934286398E4e7BDD4D6696b0cBB1952029553',
        "m/44'/61'/1'/0/0": '0xb0d86cc10685c2278931DBb8A8D56794FE6f7D17',
        "m/44'/61'/21234567'/0/0": '0x8545b27EB6Ee96e89Fb1A7d231Dbb84E01615A8F',
        "m/44'/61'/2147483646'/0/0": '0x93a29281423dAbe8D6834D7cE48f4d9199D93d77',
        "m/44'/61'/2147483647'/0/0": '0x42Abd4984be9DefEC285C4c6EdEee8b34e543ca5',
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
        "m/44'/118'/0'/0/0": 'cosmos137ge69zu4nsd5g7xveclflq36ptnwevvl7hkyp',
        "m/44'/118'/1'/0/0": 'cosmos147ln7mhcd3t9gewqyzfzqlcgpsv9ehwq8sf7st',
        "m/44'/118'/21234567'/0/0": 'cosmos1uceyd8k5cnu2al7sz7g6zeperyu5gqh0mvsls2',
        "m/44'/118'/2147483646'/0/0": 'cosmos1vnnva252t4metdj5a8t752h4mdazs6u9lqv9jf',
        "m/44'/118'/2147483647'/0/0": 'cosmos1s95uy64km0ahz295c24unctulyd4tr4ffatsku',
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
        "m/44'/118'/0'/0/0": 'akash137ge69zu4nsd5g7xveclflq36ptnwevvj963am',
        "m/44'/118'/1'/0/0": 'akash147ln7mhcd3t9gewqyzfzqlcgpsv9ehwq2tyef3',
        "m/44'/118'/21234567'/0/0": 'akash1uceyd8k5cnu2al7sz7g6zeperyu5gqh0khacfs',
        "m/44'/118'/2147483646'/0/0": 'akash1vnnva252t4metdj5a8t752h4mdazs6u9jmpztn',
        "m/44'/118'/2147483647'/0/0": 'akash1s95uy64km0ahz295c24unctulyd4tr4fyxxh0x',
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
        "m/44'/118'/0'/0/0": 'cro137ge69zu4nsd5g7xveclflq36ptnwevv89l0cs',
        "m/44'/118'/1'/0/0": 'cro147ln7mhcd3t9gewqyzfzqlcgpsv9ehwqltp8v6',
        "m/44'/118'/21234567'/0/0": 'cro1uceyd8k5cnu2al7sz7g6zeperyu5gqh0rhcxvm',
        "m/44'/118'/2147483646'/0/0": 'cro1vnnva252t4metdj5a8t752h4mdazs6u98myuwc',
        "m/44'/118'/2147483647'/0/0": 'cro1s95uy64km0ahz295c24unctulyd4tr4f3xrf2d',
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
        "m/44'/118'/0'/0/0": 'fetch137ge69zu4nsd5g7xveclflq36ptnwevvvr7jxk',
        "m/44'/118'/1'/0/0": 'fetch147ln7mhcd3t9gewqyzfzqlcgpsv9ehwq5dq6ju',
        "m/44'/118'/21234567'/0/0": 'fetch1uceyd8k5cnu2al7sz7g6zeperyu5gqh0g3emja',
        "m/44'/118'/2147483646'/0/0": 'fetch1vnnva252t4metdj5a8t752h4mdazs6u9va9ps7',
        "m/44'/118'/2147483647'/0/0": 'fetch1s95uy64km0ahz295c24unctulyd4tr4f6qz55t',
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
        "m/44'/118'/0'/0/0": 'osmo137ge69zu4nsd5g7xveclflq36ptnwevvh9yxjn',
        "m/44'/118'/1'/0/0": 'osmo147ln7mhcd3t9gewqyzfzqlcgpsv9ehwq0t6wxe',
        "m/44'/118'/21234567'/0/0": 'osmo1uceyd8k5cnu2al7sz7g6zeperyu5gqh0nhr0xc',
        "m/44'/118'/2147483646'/0/0": 'osmo1vnnva252t4metdj5a8t752h4mdazs6u9hml4ym',
        "m/44'/118'/2147483647'/0/0": 'osmo1s95uy64km0ahz295c24unctulyd4tr4fpxcqqw',
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
        "m/44'/118'/0'/0/0": 'juno137ge69zu4nsd5g7xveclflq36ptnwevvfv5dra',
        "m/44'/118'/1'/0/0": 'juno147ln7mhcd3t9gewqyzfzqlcgpsv9ehwq3z29hh',
        "m/44'/118'/21234567'/0/0": 'juno1uceyd8k5cnu2al7sz7g6zeperyu5gqh0d7nyhk',
        "m/44'/118'/2147483646'/0/0": 'juno1vnnva252t4metdj5a8t752h4mdazs6u9fj0744',
        "m/44'/118'/2147483647'/0/0": 'juno1s95uy64km0ahz295c24unctulyd4tr4fl0gt3q',
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
        "m/44'/118'/0'/0/0": 'terra137ge69zu4nsd5g7xveclflq36ptnwevve6dkxp',
        "m/44'/118'/1'/0/0": 'terra147ln7mhcd3t9gewqyzfzqlcgpsv9ehwqp5n7jt',
        "m/44'/118'/21234567'/0/0": 'terra1uceyd8k5cnu2al7sz7g6zeperyu5gqh0ag2lj2',
        "m/44'/118'/2147483646'/0/0": 'terra1vnnva252t4metdj5a8t752h4mdazs6u9eyk9sf',
        "m/44'/118'/2147483647'/0/0": 'terra1s95uy64km0ahz295c24unctulyd4tr4f0e3s5u',
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
        "m/44'/118'/0'/0/0": 'secret137ge69zu4nsd5g7xveclflq36ptnwevvamrlea',
        "m/44'/118'/1'/0/0": 'secret147ln7mhcd3t9gewqyzfzqlcgpsv9ehwq94ahdh',
        "m/44'/118'/21234567'/0/0": 'secret1uceyd8k5cnu2al7sz7g6zeperyu5gqh0efykdk',
        "m/44'/118'/2147483646'/0/0": 'secret1vnnva252t4metdj5a8t752h4mdazs6u9a9cv04',
        "m/44'/118'/2147483647'/0/0": 'secret1s95uy64km0ahz295c24unctulyd4tr4ftcletq',
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
        "m/44'/118'/0'/0/0": 'celestia137ge69zu4nsd5g7xveclflq36ptnwevvw5xx7v',
        "m/44'/118'/1'/0/0": 'celestia147ln7mhcd3t9gewqyzfzqlcgpsv9ehwqk6cw2x',
        "m/44'/118'/21234567'/0/0": 'celestia1uceyd8k5cnu2al7sz7g6zeperyu5gqh02xp028',
        "m/44'/118'/2147483646'/0/0": 'celestia1vnnva252t4metdj5a8t752h4mdazs6u9w2a4gy',
        "m/44'/118'/2147483647'/0/0": 'celestia1s95uy64km0ahz295c24unctulyd4tr4fch6qv3',
      },
    },
    {
      method: 'suiGetAddress',
      name: 'suiGetAddress',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/784'/0'/0'/0'": '0xd8ffd81f34a43dfcfbf49f392450715d60622e159a336d17ef79be410d880b8a',
        "m/44'/784'/1'/0'/0'": '0x0e0bcbb3cb5802c599e408ac38b4b83105497e070dd008beac33d34d87fd1adb',
        "m/44'/784'/21234567'/0'/0'":
          '0x1b65cf924f1d88c01d9b8efb24f16f98517a1d1ebeeae46671851d976047c5e9',
        "m/44'/784'/2147483646'/0'/0'":
          '0xc2d167c9cf6cbff2e053907dd10817b4e1eb5b588a610a7abd8d1ce4fe42a0dc',
        "m/44'/784'/2147483647'/0'/0'":
          '0x1b9b1306f30380cb4cc2794923dd0089da5ee41385748470ebb6843d73826495',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'r4LiUvC9xsrTkPemk1J67PZpJx4wzqGNrP',
        "m/44'/144'/1'/0/0": 'rULrXxRCARz6s2FnaTczL5H6CiPsQJdohK',
        "m/44'/144'/21234567'/0/0": 'rNz3RtFFjapAxdLSArnQQo1w9LBS5LQzgB',
        "m/44'/144'/2147483646'/0/0": 'rLhEFuHitx6sGeJN4bP2H5esjw86WwFNuy',
        "m/44'/144'/2147483647'/0/0": 'r4FJrLsA3EH6LvniRjKnuYd7XhidB4t5tN',
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
          'BFC0cdcd9a0604ea90008e21ba31f1b21fe060a87c91d4bd48748d8a36dfe17df79ff60',
        "m/44'/728'/1'/0'/0'":
          'BFC6f76d68c2a04b94f1339693ab52d9f94720c6bc0c70bfa4a0b9db767077d9a2c9ef3',
        "m/44'/728'/21234567'/0'/0'":
          'BFC124ee8a9ef34ef8bea75a1f7673c97a3e7e8d3b3b424fb9a048f78da213f9e30620c',
        "m/44'/728'/2147483646'/0'/0'":
          'BFCbda28162bfea593359235d05c22313be8369e184762152cd95186f8726d7fa3ae014',
        "m/44'/728'/2147483647'/0'/0'":
          'BFCcad522c83a67baf568021517088157bcb06662cd14c9284cbeeeff59eb643419d068',
      },
    },
    {
      method: 'alephiumGetAddress',
      name: 'alephiumGetAddress',
      params: {
        path: "m/44'/1234'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/1234'/0'/0/0": '15Wd1AjvvVCZ1g3EasdqVAMzxhzmyk96YpEs9CJJZpc3j',
        "m/44'/1234'/1'/0/0": '14iYg2nfR4oKgJuzhgMGdg3TMaZ9bT222rscNJw6tXDYi',
        "m/44'/1234'/21234567'/0/0": '16N9hfSNwAYZ5jVZgLRdVPhoGfTzTWD1k24byZDAk6JiC',
        "m/44'/1234'/2147483646'/0/0": '1BXbLbwe2Dq7xEPFLJRHqCzHywcFRop5VadaHaAVRXrKy',
        "m/44'/1234'/2147483647'/0/0": '1DgQLbqyf6pYCXvBPu79CibgpFtH41UgTS3dUkki68puL',
      },
    },
    {
      method: 'algoGetAddress',
      name: 'algoGetAddress',
      params: {
        path: "m/44'/283'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/283'/0'/0'/0'": 'GWUQZDKTDAFI4G7SEWY5TUSNWTAYSG43EOSHPNPMV4634SH7MGYV47IG6E',
        "m/44'/283'/1'/0'/0'": 'N3S2CU5TZYUHFKYKIDLCBHEF3B4SSLASUDMGHMSIKWLGADJ2KHTZWCOHHA',
        "m/44'/283'/21234567'/0'/0'": '22WOJMJDWWEWO4VCAVBRO5476EYIVAT2MM622ZJLSIBAVDU3Y6QCOLFCBI',
        "m/44'/283'/2147483646'/0'/0'":
          'ULS6QCUSNAGKV2L6XHA7CQX2FJHSM5LWPKQS4ZIG436PKRABAMSJ7ETEJY',
        "m/44'/283'/2147483647'/0'/0'":
          'RFWOJ3D7GFNZFZL7JBNOYXRYWXPSFE3DVKFJ6OA4SUGSU74HQ3DJYRKP2E',
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
        "m/44'/607'/0'": 'UQDM2ZjUSvBAWgvT3xD-2Yz6C9N1yDQPJwdFQdPMFv6uykNa',
        "m/44'/607'/1'": 'UQADel9VBmMppufVZSygQllvSGza5Oq6Nwx9p_8K4OMrTjDK',
        "m/44'/607'/21234567'": 'UQAO_eQ-RwX_O9q05Gq6zBfLRHtKL1HmWsn_VjnFCwscD2kQ',
        "m/44'/607'/2147483646'": 'UQBQMpT1qfgCv0kY1X0Y-9NGkKPP7PkYrEPDHekK-60dEeBu',
        "m/44'/607'/2147483647'": 'UQCrmINgi4mKm_kXY0NpMErui_V-OzpJqcJKIWCqPxxTMK26',
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
        "m/44'/309'/0'/0/0": 'ckb1qyqt3reax67g3v8wgrtulgdjjmg9m4kpmftq39aqk2',
        "m/44'/309'/1'/0/0": 'ckb1qyq9ahdmy8vws3rpsk8acy9udzw4ph5e8lus89dyxj',
        "m/44'/309'/21234567'/0/0": 'ckb1qyq89qckdvphkvwn26xtqxr9l8glvz3kzcyswhwmkw',
        "m/44'/309'/2147483646'/0/0": 'ckb1qyqzr9htxyg2ukzmgwxfsen669sp3pzx2shq2p06z2',
        "m/44'/309'/2147483647'/0/0": 'ckb1qyqd92yv862fuegpk835jwp35d38j3p3u53qnmmny3',
      },
    },
    {
      method: 'nexaGetAddress',
      name: 'nexaGetAddress',
      params: {
        path: "m/44'/29223'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/29223'/0'/0/0": 'nexa:nqtsq5g5mv5e8fp5zzezyz73vjap05k3g7lmf26ra0g07c6r',
        "m/44'/29223'/1'/0/0": 'nexa:nqtsq5g5mf5mgg5zwe5xgew9g4988vmf66cxc545eqy7vlw6',
        "m/44'/29223'/21234567'/0/0": 'nexa:nqtsq5g5xe3097q5k4jlaf887ggafkx8dc5qpq8f7htd9tvc',
        "m/44'/29223'/2147483646'/0/0": 'nexa:nqtsq5g5vmarfmzt9jr0lpk7vvlzkjdyqdcrp0tj4lxunng2',
        "m/44'/29223'/2147483647'/0/0": 'nexa:nqtsq5g5guut062dpwq3qz9gm5ey73qppfdnk4xnmwvcf0vj',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'r4LiUvC9xsrTkPemk1J67PZpJx4wzqGNrP',
        "m/44'/144'/1'/0/0": 'rULrXxRCARz6s2FnaTczL5H6CiPsQJdohK',
        "m/44'/144'/21234567'/0/0": 'rNz3RtFFjapAxdLSArnQQo1w9LBS5LQzgB',
        "m/44'/144'/2147483646'/0/0": 'rLhEFuHitx6sGeJN4bP2H5esjw86WwFNuy',
        "m/44'/144'/2147483647'/0/0": 'r4FJrLsA3EH6LvniRjKnuYd7XhidB4t5tN',
      },
    },
    {
      method: 'scdoGetAddress',
      name: 'scdoGetAddress',
      params: {
        path: "m/44'/541'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/541'/0'/0/0": '1S01719142f8cda1396a004aad2cb6b0cd2a6e77d1',
        "m/44'/541'/1'/0/0": '1S01a2cd0a1aa267d99ae89518908350966cf29e91',
        "m/44'/541'/21234567'/0/0": '1S010642e173b434f590c4b7ddea164007775a6561',
        "m/44'/541'/2147483646'/0/0": '1S01f6562cdb733f228143646ecb37aef1f0854ac1',
        "m/44'/541'/2147483647'/0/0": '1S01605f456dd77689d9f5e0ace75763f3fd55edc1',
      },
    },
  ],
};
