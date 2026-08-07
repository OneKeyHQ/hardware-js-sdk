import type { SLIP39TestCaseData } from '../../types';

export const count20OnePassphrase2: SLIP39TestCaseData = {
  id: 'count20_one_passphrase_2',
  name: 'count20_one_passphrase_2',
  description: '1-of-1 (20 words) + passphrase_2',
  passphrase: 'onekey',
  shares: [
    'fake kidney academic academic dwarf orange primary secret mixed auction priority daughter script smell smear judicial ceramic glen theory emphasis',
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
        "m/44'/0'/0'/0/0": '1NJa3ThmmGUEYQx4AgxanvB93Rn3TW5mF4',
        "m/44'/0'/1'/0/0": '17WZaU3rgvV9Fw61eaUWaQwpcPFjzDaavz',
        "m/44'/0'/21234567'/0/0": '143mQ8DiAkM2XNYVSVYmEnssQphYzqfXns',
        "m/44'/0'/2147483646'/0/0": '1LmAqWJMY4gNwaneHRafzWhbzYgqR53exv',
        "m/44'/0'/2147483647'/0/0": '1K7ZzHthuP72ptYhWr6R2qVPLoxT2sc6rh',
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
        "m/49'/0'/0'/0/0": '3Q2NC1SRRUySyLAKK6faYexLzuFGRMggAZ',
        "m/49'/0'/1'/0/0": '3DuagrbvVyepknkz2mQZn5rfrd5bp2TTUg',
        "m/49'/0'/21234567'/0/0": '34rkZTsyBD7cUtnZrnFKjnZiZTo63r1wmo',
        "m/49'/0'/2147483646'/0/0": '3HzKQ8yAueGXwU6tp5MJnXFiQw5ziMc73w',
        "m/49'/0'/2147483647'/0/0": '3MQYX57zwqP6AbGFS6Eap2PrLUMecuN2ZM',
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
        "m/84'/0'/0'/0/0": 'bc1q029zqf667jrlgu24ne792wjvwrxges0zaf3y0e',
        "m/84'/0'/1'/0/0": 'bc1quvqsnhzc23csa349qrq70an4pl5yyvxs5ftswa',
        "m/84'/0'/21234567'/0/0": 'bc1qqgqxkez5h0am5mgkq6mcn5rf0zyp85q4uyklmu',
        "m/84'/0'/2147483646'/0/0": 'bc1qh9e8hdczedn8p6k8ml67q8dmagkpamxalk8wdx',
        "m/84'/0'/2147483647'/0/0": 'bc1qvrzljsdm9dkt9k9y8p6ems538eg4ydalxkwxtm',
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
        "m/86'/0'/0'/0/0": 'bc1pn9kvchyhnk2h63f00lzjkcm5saphv0avjgwk6kjxj5euztje2gfqfckyn3',
        "m/86'/0'/1'/0/0": 'bc1prp8ndpw5dpg2pegzdq82vntz70nmm3l2gf28qqfy4pptwdgx5r7s9xflcy',
        "m/86'/0'/21234567'/0/0": 'bc1pcf53nzuggxfhdjx06zaey6aqtv8k8zed9tuj7trwhdvxp85a6q9s8jq7r6',
        "m/86'/0'/2147483646'/0/0":
          'bc1pflcwtvu24ruf86337g6ptjvgwf3lyt2wp87fwcl8l2cz7x82tkrq7zuu2h',
        "m/86'/0'/2147483647'/0/0":
          'bc1pc0wq95e8v4uhjkw6pj5tx2vl6k5tsf82elkxg7ts0yurj9q2n6aq3q7eqq',
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
        "m/44'/3'/0'/0/0": 'DTTEdqTZwuP24xSyMtmDKp5c2D3ec9HGqy',
        "m/44'/3'/1'/0/0": 'DSk8r2bdbRLbCbm71Dv65a3cRkMuZbN8kx',
        "m/44'/3'/21234567'/0/0": 'D91fignHC2qxczs6jqRYqyHzRheX4YhjgM',
        "m/44'/3'/2147483646'/0/0": 'DRQ3aq7T4Toe2e12RHKqGfSJWax8n46NhZ',
        "m/44'/3'/2147483647'/0/0": 'DARuPkqHqNJdkTbm2YLqfYhSeiMXXoYipK',
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
        "m/44'/145'/0'/0/0": 'bitcoincash:qr6yg8lzvcyd5rar0ufqdxsm9mf6r2dy45yldc7qm8',
        "m/44'/145'/1'/0/0": 'bitcoincash:qrmfy9lvdx93su0can983aztedk7kzht8g92usu5ac',
        "m/44'/145'/21234567'/0/0": 'bitcoincash:qz3yp4qcuyqw622m7ypjf2fp0q6wvv0xms6fs8uav3',
        "m/44'/145'/2147483646'/0/0": 'bitcoincash:qqye0dkruyn359fm0heaf7lk0l5rqsatuc9hh9mrpt',
        "m/44'/145'/2147483647'/0/0": 'bitcoincash:qrpwum22t0qk59nhc49qyv7e5cg972qjxg4vxz5m7h',
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
        "m/44'/2'/0'/0/0": 'LgavSbfLU8WVFu6RcN9Ux8xksHKFbAHunr',
        "m/44'/2'/1'/0/0": 'LUxvyVkvhsy44XEx1sAHf3CySQjvVG3Mbk',
        "m/44'/2'/21234567'/0/0": 'LhUVVhrENT8RKenK6ndu6rc2PUBNiicKqH',
        "m/44'/2'/2147483646'/0/0": 'LgtGD7fXDe4o8uBKrE6CtzzAXryzfmPrKr',
        "m/44'/2'/2147483647'/0/0": 'LLk74YsyuBsgciozvDHZzYe1a78S1unmSy',
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
        "m/49'/2'/0'/0/0": 'MMwaLoHcR7dTDjP8esX3NTM7XefafgsVUx',
        "m/49'/2'/1'/0/0": 'MX6dxRhnG28fhcwHJ2nJ9voipC9vwUGgZC',
        "m/49'/2'/21234567'/0/0": 'MF5kgwFPNd6c1tFw1dpFB2xMzd91uKG8ZS',
        "m/49'/2'/2147483646'/0/0": 'MWSs1cRmByKZdVhzojtdSLMZFdVp67pUnE',
        "m/49'/2'/2147483647'/0/0": 'M8K6CLmvXnjigRAUKHcHyVDWKQPsx9X8qK',
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
        "m/84'/2'/0'/0/0": 'ltc1q2660z67xqz3mg49r5p7hx0qqsdw40aagmf0ek5',
        "m/84'/2'/1'/0/0": 'ltc1q4tq80f39ewyme2rrpha2qhn7ay8yz26qr59sta',
        "m/84'/2'/21234567'/0/0": 'ltc1quyxzxu4r74whhrd7cchux36rj4d3ecfpcunrv8',
        "m/84'/2'/2147483646'/0/0": 'ltc1ql8xcwgsyngzsvnnzvgzn8lqe8d6z7ymakykwul',
        "m/84'/2'/2147483647'/0/0": 'ltc1q8erugqgt65fr2vqj3g77hd8hx06ucmajn664zv',
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
        "m/44'/1900'/0'/0/0": 'NbEdjwK5MXd87Zh4cJ5bVmDAmT6ejgjXLT',
        "m/44'/1900'/1'/0/0": 'NXdnvXZioChoRf8JGfQWqqNHFRQVRizHae',
        "m/44'/1900'/21234567'/0/0": 'NdCu6ngQ37LBr2NKjNiWMky6zp94KsVwLB',
        "m/44'/1900'/2147483646'/0/0": 'NZHXMyyBMQY9uR1rWvnmecc6Xe3mBQwG5t',
        "m/44'/1900'/2147483647'/0/0": 'NfXXjHyjwAGoHyrahjoHhmDHvrLRfkhVzQ',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/60'/0'/0/0": '0xDEC6446F0C266F25FB835497de50f78Cd2c241c6',
        "m/44'/60'/1'/0/0": '0x5842029ab2bD6963c440D94E20aA1CE8523f5e35',
        "m/44'/60'/21234567'/0/0": '0x460a5d1af94cF26ae35491f9C5cf27Db9302948a',
        "m/44'/60'/2147483646'/0/0": '0xF92886D5Ad0B0ACb7Aa3007070BF7D24E6D888CA',
        "m/44'/60'/2147483647'/0/0": '0xa4ebD8b632E9DF0985B352fE18aeabfCC2a74940',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum Classic',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/61'/0'/0/0": '0x331faA8f4eB1Bb173eEEd6Cf8Bd6f4A46C1Db1Ab',
        "m/44'/61'/1'/0/0": '0xfD71083DD493d0C05695222D84f52400F9e12970',
        "m/44'/61'/21234567'/0/0": '0x7408BB820904DfBe9C116BDdCB9A8d2a59B22F74',
        "m/44'/61'/2147483646'/0/0": '0x169dE9E2e5e9810C1f1FC09b63895bcdF2CF2dBf',
        "m/44'/61'/2147483647'/0/0": '0x1472C51e03E6fA6f4f70c208250c624C17959e18',
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
        "m/44'/118'/0'/0/0": 'cosmos1vz3ycwyzvq75vz49ym9tkszax3v7uyuur9j6ed',
        "m/44'/118'/1'/0/0": 'cosmos10xvphz5w4ch6q39vafgnkwfka5574uav44qe7p',
        "m/44'/118'/21234567'/0/0": 'cosmos1dz8p0663gtats0dxy8qp3gpaypsyn8slclqqs5',
        "m/44'/118'/2147483646'/0/0": 'cosmos1ksahua2y5fk8y6rahncfhmdqxmkuuqhjjha9ar',
        "m/44'/118'/2147483647'/0/0": 'cosmos1nxf677drac3qva2335pgz0tftun60lfcyzrv77',
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
        "m/44'/118'/0'/0/0": 'akash1vz3ycwyzvq75vz49ym9tkszax3v7uyuuw7laqh',
        "m/44'/118'/1'/0/0": 'akash10xvphz5w4ch6q39vafgnkwfka5574uavcwd78m',
        "m/44'/118'/21234567'/0/0": 'akash1dz8p0663gtats0dxy8qp3gpaypsyn8sl4yd8fw',
        "m/44'/118'/2147483646'/0/0": 'akash1ksahua2y5fk8y6rahncfhmdqxmkuuqhjlvszye',
        "m/44'/118'/2147483647'/0/0": 'akash1nxf677drac3qva2335pgz0tftun60lfcfewt8y',
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
        "m/44'/118'/0'/0/0": 'cro1vz3ycwyzvq75vz49ym9tkszax3v7uyuum76r9u',
        "m/44'/118'/1'/0/0": 'cro10xvphz5w4ch6q39vafgnkwfka5574uavdwgqzs',
        "m/44'/118'/21234567'/0/0": 'cro1dz8p0663gtats0dxy8qp3gpaypsyn8slqygev9',
        "m/44'/118'/2147483646'/0/0": 'cro1ksahua2y5fk8y6rahncfhmdqxmkuuqhj2v4upj',
        "m/44'/118'/2147483647'/0/0": 'cro1nxf677drac3qva2335pgz0tftun60lfcuet4z0',
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
        "m/44'/118'/0'/0/0": 'fetch1vz3ycwyzvq75vz49ym9tkszax3v7uyuuscm7m6',
        "m/44'/118'/1'/0/0": 'fetch10xvphz5w4ch6q39vafgnkwfka5574uavxgfauk',
        "m/44'/118'/21234567'/0/0": 'fetch1dz8p0663gtats0dxy8qp3gpaypsyn8sltzfyjr',
        "m/44'/118'/2147483646'/0/0": 'fetch1ksahua2y5fk8y6rahncfhmdqxmkuuqhjp25pl5',
        "m/44'/118'/2147483647'/0/0": 'fetch1nxf677drac3qva2335pgz0tftun60lfchl2guf',
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
        "m/44'/118'/0'/0/0": 'osmo1vz3ycwyzvq75vz49ym9tkszax3v7uyuut7p20l',
        "m/44'/118'/1'/0/0": 'osmo10xvphz5w4ch6q39vafgnkwfka5574uavawnfgn',
        "m/44'/118'/21234567'/0/0": 'osmo1dz8p0663gtats0dxy8qp3gpaypsyn8slsynsxx',
        "m/44'/118'/2147483646'/0/0": 'osmo1ksahua2y5fk8y6rahncfhmdqxmkuuqhj6vw4t3',
        "m/44'/118'/2147483647'/0/0": 'osmo1nxf677drac3qva2335pgz0tftun60lfcvesugv',
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
        "m/44'/118'/0'/0/0": 'juno1vz3ycwyzvq75vz49ym9tkszax3v7uyuu4h3p73',
        "m/44'/118'/1'/0/0": 'juno10xvphz5w4ch6q39vafgnkwfka5574uavr8rzea',
        "m/44'/118'/21234567'/0/0": 'juno1dz8p0663gtats0dxy8qp3gpaypsyn8slwdrmhg',
        "m/44'/118'/2147483646'/0/0": 'juno1ksahua2y5fk8y6rahncfhmdqxmkuuqhjy9776l',
        "m/44'/118'/2147483647'/0/0": 'juno1nxf677drac3qva2335pgz0tftun60lfcjsqhez',
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
        "m/44'/118'/0'/0/0": 'terra1vz3ycwyzvq75vz49ym9tkszax3v7uyuu9pg6md',
        "m/44'/118'/1'/0/0": 'terra10xvphz5w4ch6q39vafgnkwfka5574uavn36eup',
        "m/44'/118'/21234567'/0/0": 'terra1dz8p0663gtats0dxy8qp3gpaypsyn8sl7m6qj5',
        "m/44'/118'/2147483646'/0/0": 'terra1ksahua2y5fk8y6rahncfhmdqxmkuuqhj5n89lr',
        "m/44'/118'/2147483647'/0/0": 'terra1nxf677drac3qva2335pgz0tftun60lfczxevu7',
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
        "m/44'/118'/0'/0/0": 'secret1vz3ycwyzvq75vz49ym9tkszax3v7uyuupqxny3',
        "m/44'/118'/1'/0/0": 'secret10xvphz5w4ch6q39vafgnkwfka5574uavhs5sra',
        "m/44'/118'/21234567'/0/0": 'secret1dz8p0663gtats0dxy8qp3gpaypsyn8sl665fdg',
        "m/44'/118'/2147483646'/0/0": 'secret1ksahua2y5fk8y6rahncfhmdqxmkuuqhjsjfvql',
        "m/44'/118'/2147483647'/0/0": 'secret1nxf677drac3qva2335pgz0tftun60lfcx8h9rz',
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
        "m/44'/118'/0'/0/0": 'celestia1vz3ycwyzvq75vz49ym9tkszax3v7uyuuj0r2rq',
        "m/44'/118'/1'/0/0": 'celestia10xvphz5w4ch6q39vafgnkwfka5574uavyl3fyv',
        "m/44'/118'/21234567'/0/0": 'celestia1dz8p0663gtats0dxy8qp3gpaypsyn8slf43s2e',
        "m/44'/118'/2147483646'/0/0": 'celestia1ksahua2y5fk8y6rahncfhmdqxmkuuqhjrav48w',
        "m/44'/118'/2147483647'/0/0": 'celestia1nxf677drac3qva2335pgz0tftun60lfc4gjuyn',
      },
    },
    {
      method: 'suiGetAddress',
      name: 'suiGetAddress',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/784'/0'/0'/0'": '0xfdd2e2d631156364dc0555c05970467b197cc9a620c3fbd59ebf9778f529c7be',
        "m/44'/784'/1'/0'/0'": '0x719dcbd84539c3693baecf1ae547ec5e135bd5ae3c90f8aae9d57432a7166db3',
        "m/44'/784'/21234567'/0'/0'":
          '0x69957ec71d062b87a9cba96d4e4a786b471a24355f211dac5b0b6a5f5d0335c6',
        "m/44'/784'/2147483646'/0'/0'":
          '0x382a75757d467412fcf029eb4aa675d909a42bf8b391677955b5e94a3bd351b4',
        "m/44'/784'/2147483647'/0'/0'":
          '0xcf05f2223720d9a266ba96d5b142d90b2020afc88a1a3d5a12f1c53a5586a734',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rGLN87wzj2czoGwaBXmEvn4C8a7XstWAF2',
        "m/44'/144'/1'/0/0": 'rssck8Gt5VXixq68GtaMrkoaaaCnAPLnYa',
        "m/44'/144'/21234567'/0/0": 'rEFKypmMmGYrPJoXsdgWttSzwMwCK39xbj',
        "m/44'/144'/2147483646'/0/0": 'rJ1p2GHxqddEfsJbcKTxJpJaKebhy8G7CX',
        "m/44'/144'/2147483647'/0/0": 'rNTaWZQKmeLo8KxhWqigLLBucvk2ZCNvSj',
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
          'BFC968c93e98d777295948168da1dc8e07ebad3c4527dd31ac89f324aa88650f4ae9da2',
        "m/44'/728'/1'/0'/0'":
          'BFCf3ad7064ae94ad6ebbcf92bcb2fa74c569a207d3af5208a54181c74e98f1a60d7965',
        "m/44'/728'/21234567'/0'/0'":
          'BFC8dd511c27c7559886c8b9a52b7d8bbe6a50d529b589b0ff31f9522a4995aff5688cc',
        "m/44'/728'/2147483646'/0'/0'":
          'BFC4b42d7fcc4dead99f66bed7d7fcb9524e9252a2e729d32b14067fc14ccc5f76039a2',
        "m/44'/728'/2147483647'/0'/0'":
          'BFC82d9908a06ff149e6af3746fdd06faf41f9d2db466d1f769bd7ba7737c1b9bb2b3f4',
      },
    },
    {
      method: 'alephiumGetAddress',
      name: 'alephiumGetAddress',
      params: {
        path: "m/44'/1234'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/1234'/0'/0/0": '1LRQVfbUR2RJAbg73i4wAHiuagDq9dBVk1ueGyiRSASx',
        "m/44'/1234'/1'/0/0": '19trBbayb9DngdJCeTKBAujU3APGY96TmfQFd2timEu4g',
        "m/44'/1234'/21234567'/0/0": '1FNqeuA7f8bFPF2qkrJ9FpojB7oHdRUyzS4fr3yTrWCqu',
        "m/44'/1234'/2147483646'/0/0": '139EQizVJTJuYT3owq9ozCu4ipSddUsCSpM7sEXRY9PH6',
        "m/44'/1234'/2147483647'/0/0": '15anT1xEYD9WkeJMo21vdbamKASECDhWJRa3tb3gvpWiP',
      },
    },
    {
      method: 'algoGetAddress',
      name: 'algoGetAddress',
      params: {
        path: "m/44'/283'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/283'/0'/0'/0'": '43M35COET54AR4O7BDO4RAC3PA6SLUGRKNAYLHZVYJBSL5EMTAO7UVJN2A',
        "m/44'/283'/1'/0'/0'": 'Z6JAP4K65O7AS2FXMSV2OVXYTTULISLUT7WZD3ZA3RRQXL7BFUB6VJPSWQ',
        "m/44'/283'/21234567'/0'/0'": 'YCI7NJJA3P766CTPZT4Q4IMBHXIACKSHKLS3HEL2ROT574DLYWRLZTFR7E',
        "m/44'/283'/2147483646'/0'/0'":
          'SNEOT74KTLL56YZK5WXIJJGJ7U7MTNMGOLJR4OIDQYBJAOTU5EJP6BGX6M',
        "m/44'/283'/2147483647'/0'/0'":
          'VGHATIYYDOYUMXEDEY5C37YBBR6DWI67J2XC4MUH5B5G5JBFSUL5RP4CUQ',
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
        "m/44'/607'/0'": 'UQAyHJvPGQjZ6PXKfJvq3mUxiCnn3OFovYQJclEzXBMZBLFq',
        "m/44'/607'/1'": 'UQDVqYojX5d-EaZFP-u4zGphXmGQO-0PCozHv9azn_uvWZFw',
        "m/44'/607'/21234567'": 'UQBtywR1uRfjgxMNpSruj4xtxebuwalzw5DIzpmbM3JpJaf1',
        "m/44'/607'/2147483646'": 'UQCOPAbhsnyhKcIsA8osDjmxQH0SFt_f3BcGXL0MdPSa7z9w',
        "m/44'/607'/2147483647'": 'UQA7vF5UDLzAR6NBAf-Y7UQx4QYKyMk7VGSt5katPRj4vumq',
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
        "m/44'/309'/0'/0/0": 'ckb1qyqtfa0ch6fw4rthp4qesdkswe9dmtvukwdqs85h3z',
        "m/44'/309'/1'/0/0": 'ckb1qyqpxjy97sttfk0248fjpx52l2s38344z54q8x0de0',
        "m/44'/309'/21234567'/0/0": 'ckb1qyqynsxysjum5fs6v45rtjxlangr23fpnrdsnanh74',
        "m/44'/309'/2147483646'/0/0": 'ckb1qyqx2ytpxcpy53ge3ful5zym4tt2fz7zurgqdj7qtz',
        "m/44'/309'/2147483647'/0/0": 'ckb1qyq8rp40haujpzwz3y64kt0gdwqyd0f99khshuqk6d',
      },
    },
    {
      method: 'nexaGetAddress',
      name: 'nexaGetAddress',
      params: {
        path: "m/44'/29223'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/29223'/0'/0/0": 'nexa:nqtsq5g5wefxa37kw3nu89n6mpfadmj4xd5vwa0rmy58ulyj',
        "m/44'/29223'/1'/0/0": 'nexa:nqtsq5g5f5x2pvznh4nspxk67atlxm7xnd0cjaxyamwuvkv4',
        "m/44'/29223'/21234567'/0/0": 'nexa:nqtsq5g5fftyyu6zr86tdhkfxp6qcfe233la3q5a3ymrp27m',
        "m/44'/29223'/2147483646'/0/0": 'nexa:nqtsq5g54aq3qqwkf3ku8vfm623cdtcknqyrrh8vk39lnmnh',
        "m/44'/29223'/2147483647'/0/0": 'nexa:nqtsq5g50p7s3jflaqdedy9jfga2jl9tnznvcl9ptaeexqng',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rGLN87wzj2czoGwaBXmEvn4C8a7XstWAF2',
        "m/44'/144'/1'/0/0": 'rssck8Gt5VXixq68GtaMrkoaaaCnAPLnYa',
        "m/44'/144'/21234567'/0/0": 'rEFKypmMmGYrPJoXsdgWttSzwMwCK39xbj',
        "m/44'/144'/2147483646'/0/0": 'rJ1p2GHxqddEfsJbcKTxJpJaKebhy8G7CX',
        "m/44'/144'/2147483647'/0/0": 'rNTaWZQKmeLo8KxhWqigLLBucvk2ZCNvSj',
      },
    },
    {
      method: 'scdoGetAddress',
      name: 'scdoGetAddress',
      params: {
        path: "m/44'/541'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/541'/0'/0/0": '1S01787d06fba3097c19ad84e43d37396fb8cdca91',
        "m/44'/541'/1'/0/0": '1S012a84ab01c2389358dfb6f0621e70fa8e8d1d21',
        "m/44'/541'/21234567'/0/0": '1S018609a9f56b2ff360993e694c6178dda2976081',
        "m/44'/541'/2147483646'/0/0": '1S01b2464f7c291f8e019f0ec13cbf83ae947992d1',
        "m/44'/541'/2147483647'/0/0": '1S010fbf9e9be4b06f57b51b944dae73f78eb3f6c1',
      },
    },
  ],
};
