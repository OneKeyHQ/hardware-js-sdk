import type { SLIP39TestCaseData } from '../../types';

export const count20ThreePassphrase2: SLIP39TestCaseData = {
  id: 'count20_three_passphrase_2',
  name: 'count20_three_passphrase_2',
  description: '16-of-16 (20 words each) + passphrase_2',
  passphrase: 'onekey',
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
        "m/44'/0'/0'/0/0": '1LHdVcgcW3hWaRTaAg2zxUegt2M3AWPcbr',
        "m/44'/0'/1'/0/0": '1JY5aMs7JrEQ6aXx3gokxYXeCxKKHtKpY9',
        "m/44'/0'/21234567'/0/0": '1DD68tLG6kBxMiB6Ypn8pUenRofrdgfJg',
        "m/44'/0'/2147483646'/0/0": '17Sz9j7YLkf2umW98oFzRRYQRGqodzptbA',
        "m/44'/0'/2147483647'/0/0": '12TFLEqvtjcx3JBUf4WFADVzP5CBUuxHAd',
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
        "m/49'/0'/0'/0/0": '34bJp2njvVsfTQqAB6Jy7QxYwegnqN2PdL',
        "m/49'/0'/1'/0/0": '3NGYD3RY85bCS2pK3PZX3SyaKqHM4p2GpA',
        "m/49'/0'/21234567'/0/0": '35uviZe1Tj4eBBUYEcSUR852nSh6s4rpb2',
        "m/49'/0'/2147483646'/0/0": '3LeVHyxVjtBb9525xuLXLL9ThPH3xKkc3R',
        "m/49'/0'/2147483647'/0/0": '3LCephiuE1KMZ5a7sxuGKECQiPrnGTHbPA',
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
        "m/84'/0'/0'/0/0": 'bc1qp60vkmwfjqpguehaakxk7vvks38xmrm6ufv596',
        "m/84'/0'/1'/0/0": 'bc1qhm3sugwc2j679e298fhs2g5ue9mnkrh9wj8jzr',
        "m/84'/0'/21234567'/0/0": 'bc1q0fkvshkwx7wj8mskteh3zldn0nc4cehmtkdx5t',
        "m/84'/0'/2147483646'/0/0": 'bc1qswce2n2aw0gepw43ca0xws45e7q732wxp042tj',
        "m/84'/0'/2147483647'/0/0": 'bc1q0ledcv7zdqpf34z8q66gam9rs5t3v4c3u9fzyg',
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
        "m/86'/0'/0'/0/0": 'bc1p2m48mtglv6jl27qrmz4xegzxlnrzh3lv3q520qntwzywx59k3nkqkhtzmv',
        "m/86'/0'/1'/0/0": 'bc1pfxnnvdpl9xer5sv08lvppqjd78j564xsd46f9r5gfgezgwjx50uqmact5q',
        "m/86'/0'/21234567'/0/0": 'bc1p2g88fplpdukepmyfehwgyccq4yjateaguj3llzxm4rdtuvgn0q0qmnmzw9',
        "m/86'/0'/2147483646'/0/0":
          'bc1py0kc6eukrtpnlx9nl99j8u2lhh8tsapvmrm4u5wssvyktgheqaqq4gu6f7',
        "m/86'/0'/2147483647'/0/0":
          'bc1p3hrvuqhczp9paxytlqwmvkd9n2ha6j3nxnkx3wtjqqu7eaqe6s3q7xks0v',
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
        "m/44'/3'/0'/0/0": 'DEceNr93q8h55v8yrDDGFfPDnEQva34XTg',
        "m/44'/3'/1'/0/0": 'DH4u4juNvj3zPFK2y4jTD9F81zz4om2eKU',
        "m/44'/3'/21234567'/0/0": 'DE8dDcCfXYu9zVpafYc7hGBahD77rqTSwf',
        "m/44'/3'/2147483646'/0/0": 'DPABRBQPUZB71zKDr5NQiniQudqDSZf8Mj',
        "m/44'/3'/2147483647'/0/0": 'D6df1PJPJ9yjbLWy7yNgFQjEFJTP7RLw4M',
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
        "m/44'/145'/0'/0/0": 'bitcoincash:qz0pkdkq5zsprjqxvwmd7mgpjd9meqkwkgnk3xwrg3',
        "m/44'/145'/1'/0/0": 'bitcoincash:qpntdfqw5wfcr8n8wlkv9dsfhn3xdf74wck993qqe7',
        "m/44'/145'/21234567'/0/0": 'bitcoincash:qrmpua796uhhyd6lmptvf76zrgzareefkqc56pefee',
        "m/44'/145'/2147483646'/0/0": 'bitcoincash:qq075uezvedsdfyj34yx6chzqutf5t96p5v26xmw9e',
        "m/44'/145'/2147483647'/0/0": 'bitcoincash:qzvtu45v9m9tkpxleq2vuwhwzx4gp6tuwcgyf8krsv',
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
        "m/44'/2'/0'/0/0": 'Lh8EqETSzVzjzDbZzcsCbNiUNsXLXeykeK',
        "m/44'/2'/1'/0/0": 'LRPp2ksbgtpTJLW63LWDEdNDkw44aMvkCJ',
        "m/44'/2'/21234567'/0/0": 'LTMxiEUcUxf7CMZ6ScMkxK1pDWDGhR6ZUS',
        "m/44'/2'/2147483646'/0/0": 'LhhKnwWhkcLbAq2FrhjzHdvhtBUVCECUfs',
        "m/44'/2'/2147483647'/0/0": 'LdYGjM8q7a12fkzuJGFbXyAycouUwbdRSt',
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
        "m/49'/2'/0'/0/0": 'MVKkx8uFNpLqpRaDrzC8j1aHQsPhP9kZJ2',
        "m/49'/2'/1'/0/0": 'MCu2bQzXTtSCvyrnVmPEm9WfbVkA8R2QNS',
        "m/49'/2'/21234567'/0/0": 'MMnTg8BRUqd6QsTCPwFkpKqTqBtKwKLQVt',
        "m/49'/2'/2147483646'/0/0": 'MLDg8L8qNPLHjY4LM1oGfMySUAAu8bEjZq',
        "m/49'/2'/2147483647'/0/0": 'MWEiRNruV2fsYt2zktjAQzznaQ9HBaSrpk',
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
        "m/84'/2'/0'/0/0": 'ltc1qkath8805yrssk0eyql00c6vvl7z73y4s46hgq6',
        "m/84'/2'/1'/0/0": 'ltc1qpwz9mvtkt3z8eyfpuc8rseerzmr8rmysgfmnwk',
        "m/84'/2'/21234567'/0/0": 'ltc1qmszzdppqnj43c7p2kwn9xergq28wtzuuexzmz4',
        "m/84'/2'/2147483646'/0/0": 'ltc1qdg64hn55cl6nda7nkyhqtczfm4ndfy6hznrds4',
        "m/84'/2'/2147483647'/0/0": 'ltc1q97fl656389ual4msdvtv9jk5squjwjgj58c096',
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
        "m/44'/1900'/0'/0/0": 'NXW3Yi81fsjfVP2CY7LrNiKW7uaJVX7aWG',
        "m/44'/1900'/1'/0/0": 'NaFn3T9Rgw8EdxSa1pRxVUd6PxaAseLmq4',
        "m/44'/1900'/21234567'/0/0": 'Nbs1RPoznu7xWYz1udVMzfoS4AR65n9nGZ',
        "m/44'/1900'/2147483646'/0/0": 'NiUkNm2Lrsr4RrFN1AMn7HRGBFUKj7gfnn',
        "m/44'/1900'/2147483647'/0/0": 'NVczJfhvpTaUccapJSEWttG8N3n7BKkyK2',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/60'/0'/0/0": '0xdd3B9c5f92C2D86aA1b0575409E141C8670aa3A8',
        "m/44'/60'/1'/0/0": '0x0e8E658Cf1CFe5822f15D25572D6B97927f54272',
        "m/44'/60'/21234567'/0/0": '0x6Ed04B935d104C2e23A8C03e67ee94A0e3e6860A',
        "m/44'/60'/2147483646'/0/0": '0x36C7D52f3bE668E10469Cb3386Fe969c7686B4e6',
        "m/44'/60'/2147483647'/0/0": '0xd73957780959480fb1FBa23018287e007eBa4a87',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum Classic',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/61'/0'/0/0": '0xC818Aa3fD9e8A6BcfeA0e0A477374397Eb0294f5',
        "m/44'/61'/1'/0/0": '0x372E2a08eA09fbF8f436300d34A8Adf64E5F1037',
        "m/44'/61'/21234567'/0/0": '0x19E7cBD1091cF2601C2d89EE7BcD85826dF4302e',
        "m/44'/61'/2147483646'/0/0": '0xDA3F262267c46b54782d86C85f87CF19a2C50163',
        "m/44'/61'/2147483647'/0/0": '0x7C25F92A69ED12cb092274868FF057F7592cEa44',
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
        "m/44'/118'/0'/0/0": 'cosmos1c8re46rcely9a62zrpmwr4x0wqg2ntgl4wtwh2',
        "m/44'/118'/1'/0/0": 'cosmos1mh4y0llnnyfgt2ccdhafqwv7gxnhl4jwurdwzy',
        "m/44'/118'/21234567'/0/0": 'cosmos1xjcz0arp2jfm02swxjx7h0u0q4ry7x7vx6vnrw',
        "m/44'/118'/2147483646'/0/0": 'cosmos1rqz9mxhkr990zet9v3nzr7rdngkpmvkgry3s08',
        "m/44'/118'/2147483647'/0/0": 'cosmos12gsdkmxadlrudk3xajz24mr53602w4fvfugt44',
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
        "m/44'/118'/0'/0/0": 'akash1c8re46rcely9a62zrpmwr4x0wqg2ntglc4xfws',
        "m/44'/118'/1'/0/0": 'akash1mh4y0llnnyfgt2ccdhafqwv7gxnhl4jw3cqfm7',
        "m/44'/118'/21234567'/0/0": 'akash1xjcz0arp2jfm02swxjx7h0u0q4ry7x7vtpp565',
        "m/44'/118'/2147483646'/0/0": 'akash1rqz9mxhkr990zet9v3nzr7rdngkpmvkgwluhka',
        "m/44'/118'/2147483647'/0/0": 'akash12gsdkmxadlrudk3xajz24mr53602w4fvy89vv0',
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
        "m/44'/118'/0'/0/0": 'cro1c8re46rcely9a62zrpmwr4x0wqg2ntgld4rhtm',
        "m/44'/118'/1'/0/0": 'cro1mh4y0llnnyfgt2ccdhafqwv7gxnhl4jwyc9h74',
        "m/44'/118'/21234567'/0/0": 'cro1xjcz0arp2jfm02swxjx7h0u0q4ry7x7v7py2ll',
        "m/44'/118'/2147483646'/0/0": 'cro1rqz9mxhkr990zet9v3nzr7rdngkpmvkgmlefnk',
        "m/44'/118'/2147483647'/0/0": 'cro12gsdkmxadlrudk3xajz24mr53602w4fv38qjfy',
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
        "m/44'/118'/0'/0/0": 'fetch1c8re46rcely9a62zrpmwr4x0wqg2ntglxnz24a',
        "m/44'/118'/1'/0/0": 'fetch1mh4y0llnnyfgt2ccdhafqwv7gxnhl4jw07y2qn',
        "m/44'/118'/21234567'/0/0": 'fetch1xjcz0arp2jfm02swxjx7h0u0q4ry7x7v489hpe',
        "m/44'/118'/2147483646'/0/0": 'fetch1rqz9mxhkr990zet9v3nzr7rdngkpmvkgsec5ds',
        "m/44'/118'/2147483647'/0/0": 'fetch12gsdkmxadlrudk3xajz24mr53602w4fv6pp0hz',
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
        "m/44'/118'/0'/0/0": 'osmo1c8re46rcely9a62zrpmwr4x0wqg2ntgla4c7pc',
        "m/44'/118'/1'/0/0": 'osmo1mh4y0llnnyfgt2ccdhafqwv7gxnhl4jw5c775k',
        "m/44'/118'/21234567'/0/0": 'osmo1xjcz0arp2jfm02swxjx7h0u0q4ry7x7vwplr4u',
        "m/44'/118'/2147483646'/0/0": 'osmo1rqz9mxhkr990zet9v3nzr7rdngkpmvkgtlzqe4',
        "m/44'/118'/2147483647'/0/0": 'osmo12gsdkmxadlrudk3xajz24mr53602w4fvp8mmr8',
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
        "m/44'/118'/0'/0/0": 'juno1c8re46rcely9a62zrpmwr4x0wqg2ntglrug4sk',
        "m/44'/118'/1'/0/0": 'juno1mh4y0llnnyfgt2ccdhafqwv7gxnhl4jw23w49c',
        "m/44'/118'/21234567'/0/0": 'juno1xjcz0arp2jfm02swxjx7h0u0q4ry7x7vsg0gyj',
        "m/44'/118'/2147483646'/0/0": 'juno1rqz9mxhkr990zet9v3nzr7rdngkpmvkg4kjtgm',
        "m/44'/118'/2147483647'/0/0": 'juno12gsdkmxadlrudk3xajz24mr53602w4fvlwtsjf',
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
        "m/44'/118'/0'/0/0": 'terra1c8re46rcely9a62zrpmwr4x0wqg2ntgln23w42',
        "m/44'/118'/1'/0/0": 'terra1mh4y0llnnyfgt2ccdhafqwv7gxnhl4jw68hwqy',
        "m/44'/118'/21234567'/0/0": 'terra1xjcz0arp2jfm02swxjx7h0u0q4ry7x7vq7knpw',
        "m/44'/118'/2147483646'/0/0": 'terra1rqz9mxhkr990zet9v3nzr7rdngkpmvkg9qtsd8',
        "m/44'/118'/2147483647'/0/0": 'terra12gsdkmxadlrudk3xajz24mr53602w4fv0cjth4',
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
        "m/44'/118'/0'/0/0": 'secret1c8re46rcely9a62zrpmwr4x0wqg2ntglhtl82k',
        "m/44'/118'/1'/0/0": 'secret1mh4y0llnnyfgt2ccdhafqwv7gxnhl4jw7xe8lc',
        "m/44'/118'/21234567'/0/0": 'secret1xjcz0arp2jfm02swxjx7h0u0q4ry7x7vylc67j',
        "m/44'/118'/2147483646'/0/0": 'secret1rqz9mxhkr990zet9v3nzr7rdngkpmvkgpp9ejm',
        "m/44'/118'/2147483647'/0/0": 'secret12gsdkmxadlrudk3xajz24mr53602w4fvteuzgf',
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
        "m/44'/118'/0'/0/0": 'celestia1c8re46rcely9a62zrpmwr4x0wqg2ntglyy67d8',
        "m/44'/118'/1'/0/0": 'celestia1mh4y0llnnyfgt2ccdhafqwv7gxnhl4jwdfu7cf',
        "m/44'/118'/21234567'/0/0": 'celestia1xjcz0arp2jfm02swxjx7h0u0q4ry7x7vhsarer',
        "m/44'/118'/2147483646'/0/0": 'celestia1rqz9mxhkr990zet9v3nzr7rdngkpmvkgjwqq42',
        "m/44'/118'/2147483647'/0/0": 'celestia12gsdkmxadlrudk3xajz24mr53602w4fvckem0c',
      },
    },
    {
      method: 'suiGetAddress',
      name: 'suiGetAddress',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/784'/0'/0'/0'": '0x52ecdffbd1fbf50642be929597b16ab5fb4f610ba60ffdadcfca6c97f2d6e00e',
        "m/44'/784'/1'/0'/0'": '0xb2c91688bd2ca257482949b6b1841f1ba431f535749ac63338567b0e78c5ec3d',
        "m/44'/784'/21234567'/0'/0'":
          '0x1e024b321d5cc6cf1f19fd62b2f4a7a6ea05ea8b864dd77d7366ed2849d8cc5c',
        "m/44'/784'/2147483646'/0'/0'":
          '0x7cfc40b0267de889770b8927e4bd79d9263393a1bd7e5f2ed28829342130aad1',
        "m/44'/784'/2147483647'/0'/0'":
          '0xa2a4d9b9c22156b4cf064ba4e623abf95b3cfc8ad7ffdbc3518b285e284efd43',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rGyLvBkJafgH3FRSvajqZJnX8ekbVJ5Kzh',
        "m/44'/144'/1'/0/0": 'rBfgv5nESDHPnoTdJa8c4nSxitxXjwF5JP',
        "m/44'/144'/21234567'/0/0": 'rNuemXeHJdRhhDW6ddZEPGqerTDBEt6m4E',
        "m/44'/144'/2147483646'/0/0": 'rUpiHJbtCcteRK84yYwCyNDnernsQnXmM5',
        "m/44'/144'/2147483647'/0/0": 'rJyRRWV1ratQ5UaqkipUdVkG8TsPcg2PKJ',
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
          'BFC1740e2d478a3ced3e1fc0b89fa28029026a376ce0b2897bd90b9dc2bbdac464f5231',
        "m/44'/728'/1'/0'/0'":
          'BFC0792edc493fd5ce719a55b91f92df14070c784e597d2c6326e6d810742f3cf6dfb6e',
        "m/44'/728'/21234567'/0'/0'":
          'BFCa1de0bc895dccac8afb94e1caef958926f022bc1f4e5f510d2daae95257b7fea9151',
        "m/44'/728'/2147483646'/0'/0'":
          'BFCf2241d38497011951a53c40115d4a611cc02cf458290fb531e2c6d846a51b91a2122',
        "m/44'/728'/2147483647'/0'/0'":
          'BFC456890724f4bdd212cd71eaa5187fca342a852749b45516935236e2193411ba4d9db',
      },
    },
    {
      method: 'alephiumGetAddress',
      name: 'alephiumGetAddress',
      params: {
        path: "m/44'/1234'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/1234'/0'/0/0": '1DSfkGfAVLB4H9SNFoqPmndRDtViB4bjDCfg44ZnaPJSG',
        "m/44'/1234'/1'/0/0": '1HDZbdZNUSDDDR2PJgsF2ruuAXmnkTmNjxdsJvRkxVog2',
        "m/44'/1234'/21234567'/0/0": '1BmpfTPWamF5KcVfkVcXK6qVvmTYFWXGDHqkCRnecSv1x',
        "m/44'/1234'/2147483646'/0/0": '1B5qhdawEg3Eu36C4MonjkZpHJgbbeMTbfDs6EKaWJEk7',
        "m/44'/1234'/2147483647'/0/0": '159GhjnqviuMQ89Zj8LU2UxAEucwHvEyFc7LtBYJ4sURK',
      },
    },
    {
      method: 'algoGetAddress',
      name: 'algoGetAddress',
      params: {
        path: "m/44'/283'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/283'/0'/0'/0'": 'QN7TQHNLRZVYKXGQUE3WNT2E3XBLWM6LSGVFOCABZQWEGPQOKHNT2TMCJA',
        "m/44'/283'/1'/0'/0'": 'ZEAOIZ7DF74IER5DMLSHVQQVXIDIBATADOYAT3UEVMJVGJ3YC2Z4FRRK6Q',
        "m/44'/283'/21234567'/0'/0'": 'AVHN4RYIKFLXAHQEX5DTXUA7QABUOAIXNJ2CMWHVMPCEF37FMGDVTXH7P4',
        "m/44'/283'/2147483646'/0'/0'":
          'Z43BFJ3LU6IJ3R3EZDEK7LHCZJK7MOHKRF7CW7AGPBWT3HPSWQY76LMJ7I',
        "m/44'/283'/2147483647'/0'/0'":
          'ERPJIID6OTDE45VMDW74MEOOP2DWVVBK3EX4K6KRJW6LZ64JPFYUEHLUQI',
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
        "m/44'/607'/0'": 'UQCOl-V4mboi81YysUx-WVmPCuo-BuFOpUDNUhax2jju28YE',
        "m/44'/607'/1'": 'UQBjktWPwMjCLACYpNqYq3lxQNsRj3ttOsdaqu1YH4yn8VDr',
        "m/44'/607'/21234567'": 'UQBqGUxdRdpdGGtmBwIZJRSid_YgbxmrjQe1pm-_TTMiKANo',
        "m/44'/607'/2147483646'": 'UQBS2-BGcZN5G27g8B9Ji01aqJx0W_fXRwTEJGKlBvQiTinV',
        "m/44'/607'/2147483647'": 'UQBc7_JJAMGJlWcixb6E3R0lIsVzDQxhnpo1HUGoWRf097Wp',
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
        "m/44'/309'/0'/0/0": 'ckb1qyqfw3k6a22fdjdya66whn8ag64twkuw0txsqpkr38',
        "m/44'/309'/1'/0/0": 'ckb1qyq07mh5shheefxxgd9jtgvvavl8lrzv8ryqtzkz9f',
        "m/44'/309'/21234567'/0/0": 'ckb1qyqz3y77wdak0z9s0g47fue2y0228a4v623skj7daa',
        "m/44'/309'/2147483646'/0/0": 'ckb1qyqpvp79drh00c47ykmar9qeqcclwvxfm7lq4v58e3',
        "m/44'/309'/2147483647'/0/0": 'ckb1qyq0tqeh0pp5gznjge9l3zslhu8a083gdmgsjs2n5x',
      },
    },
    {
      method: 'nexaGetAddress',
      name: 'nexaGetAddress',
      params: {
        path: "m/44'/29223'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/29223'/0'/0/0": 'nexa:nqtsq5g5ctt2kwnz59snrg8edvydjs8vza4tk0xhrdwfsjee',
        "m/44'/29223'/1'/0/0": 'nexa:nqtsq5g52q07p08zjt8k8md7wuu3a34lhy349uce53w4py82',
        "m/44'/29223'/21234567'/0/0": 'nexa:nqtsq5g5d9ek3l3gehp0906ysdzhyd0zcfc5xspuue9fl2jg',
        "m/44'/29223'/2147483646'/0/0": 'nexa:nqtsq5g5ks6p9wkcs7zu2yazy04tltmzq84assfdcm3mzf2d',
        "m/44'/29223'/2147483647'/0/0": 'nexa:nqtsq5g5hwhxs6r8ja89d04s64xkfdytwn5z43xnne6pujy8',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rGyLvBkJafgH3FRSvajqZJnX8ekbVJ5Kzh',
        "m/44'/144'/1'/0/0": 'rBfgv5nESDHPnoTdJa8c4nSxitxXjwF5JP',
        "m/44'/144'/21234567'/0/0": 'rNuemXeHJdRhhDW6ddZEPGqerTDBEt6m4E',
        "m/44'/144'/2147483646'/0/0": 'rUpiHJbtCcteRK84yYwCyNDnernsQnXmM5',
        "m/44'/144'/2147483647'/0/0": 'rJyRRWV1ratQ5UaqkipUdVkG8TsPcg2PKJ',
      },
    },
    {
      method: 'scdoGetAddress',
      name: 'scdoGetAddress',
      params: {
        path: "m/44'/541'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/541'/0'/0/0": '1S0111cd31be56bfaa5b6d3616e71b7c0c18dafed1',
        "m/44'/541'/1'/0/0": '1S01788f4b8583a31eb3affb51449a8d22fc0ec591',
        "m/44'/541'/21234567'/0/0": '1S01a9b34d6faea5b047d908bf6ce5a8bf3492b1c1',
        "m/44'/541'/2147483646'/0/0": '1S017b5729e6a6b2789246e14dd2a26cfc336ecdc1',
        "m/44'/541'/2147483647'/0/0": '1S01fef8e293c135ad447b9db81981668cf9c21f71',
      },
    },
  ],
};
