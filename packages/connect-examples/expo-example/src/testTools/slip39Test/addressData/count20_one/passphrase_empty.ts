import type { SLIP39TestCaseData } from '../../types';

export const count20OnePassphraseEmpty: SLIP39TestCaseData = {
  id: 'count20_one_passphrase_empty',
  name: 'count20_one_passphrase_empty',
  description: '1-of-1 (20 words) + passphrase_empty',
  passphrase: '',
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
        "m/44'/0'/0'/0/0": '1E2ymXPaABRPPy84McDRxWhJ3qVU7hVW1x',
        "m/44'/0'/1'/0/0": '1HFRCWfjTcuPSm1U656D61z5uXyPP9pbjp',
        "m/44'/0'/21234567'/0/0": '1L7B35znryG7gaQjiNn5Cr6ha2jbrN4jyS',
        "m/44'/0'/2147483646'/0/0": '18Mcy6hd14Lg3qQx2xbQes848DyrFa8M8',
        "m/44'/0'/2147483647'/0/0": '171sSEnmQNAGWY4QexJ9WPucYEtpXmnhJa',
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
        "m/49'/0'/0'/0/0": '36HRc53LTjz6nELk8mvyEYjed8dNBmFZFh',
        "m/49'/0'/1'/0/0": '3AyGUoXttCrrYcZw7ArqAmKQiFiQ1gRf3m',
        "m/49'/0'/21234567'/0/0": '3Po9qQaQWUV2hUo1FB2yWJXomLphVLay6j',
        "m/49'/0'/2147483646'/0/0": '3HmS7UFtyiCZNZL91i5V75yeXyJb6mPB8w',
        "m/49'/0'/2147483647'/0/0": '3EiLdx7Zqyi3vJ1K3zxQ5NLwPsV5LZaxMd',
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
        "m/84'/0'/0'/0/0": 'bc1qxm5z86crrad57jtfkc4tn3kpvquhnyak4rnmdj',
        "m/84'/0'/1'/0/0": 'bc1q4lqkk6f2zcaw65ukxrj2kdwwu92lhy4hpqarpa',
        "m/84'/0'/21234567'/0/0": 'bc1q65v0ftz5xntmswn0gs33lqk6duhq8e4srswgty',
        "m/84'/0'/2147483646'/0/0": 'bc1qznuruypc4xp89fm9dtspe50p9d79tcawr7t3km',
        "m/84'/0'/2147483647'/0/0": 'bc1qz2c8565mztrnwcke4fltfqhzs3fn5puqvyn95m',
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
        "m/86'/0'/0'/0/0": 'bc1p73eyp0qezuhn2aaytawenq9pdu9ygvgvtegrwnunpryruw28czjq3ma3nc',
        "m/86'/0'/1'/0/0": 'bc1phfegeulnhg2zgr2tevg60gnjzge77fd386t6uhas3zxtewcpj6wsk7vu05',
        "m/86'/0'/21234567'/0/0": 'bc1pxcpsjxfh8j02a6wmgc9m77lrhmw6rnuens052ne26vmf26q3kdqqke0cxu',
        "m/86'/0'/2147483646'/0/0":
          'bc1phap3cms24p5449k49farmm8w2mapd5t49x2p6k4aewu0kgk0mhks6wgfw5',
        "m/86'/0'/2147483647'/0/0":
          'bc1prvkj0xfzypvj49sx4rycc5crvfmfnh3m088vq3ft355zyu96qvesfdel4g',
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
        "m/44'/3'/0'/0/0": 'D9GoogTWg7zTNvYw4w2buedUN8U8uD1LQX',
        "m/44'/3'/1'/0/0": 'DDbcWUwvNs2dgic8KtvnKskDTR9hfHZkCv',
        "m/44'/3'/21234567'/0/0": 'DCSg3SLHZrR49pnccRp5JQm6VjM4zsnMQM',
        "m/44'/3'/2147483646'/0/0": 'DJPo8FtKZer4zXtyQqNmiRXmwQJLUZFJPz',
        "m/44'/3'/2147483647'/0/0": 'D9KvGSuEzLKFu3oRgYTsLWn8jm1frwCGvR',
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
        "m/44'/145'/0'/0/0": 'bitcoincash:qqlyylpqmfy4wjrjukc3n0m4f864zkaum548da58d4',
        "m/44'/145'/1'/0/0": 'bitcoincash:qplrr260znex4q9j99ch6ncsx004hnhxusse57z676',
        "m/44'/145'/21234567'/0/0": 'bitcoincash:qzjmyz08p4nn92gvapn3s4x2hf42eya05swpey26f8',
        "m/44'/145'/2147483646'/0/0": 'bitcoincash:qrngejl0hmyt5qn8nrvq65aph0sl4x5p8cgks6d8j3',
        "m/44'/145'/2147483647'/0/0": 'bitcoincash:qrs9ww5rgk8k5a07nzjplxcfnmkkuwc2gskky2k272',
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
        "m/44'/2'/0'/0/0": 'LWrVYxFGxNBGjQ2yjucQZfNWXa9GLMaLX5',
        "m/44'/2'/1'/0/0": 'LYDqZW8Ys7zAJiQorpZcmPZxxe43qxCbaH',
        "m/44'/2'/21234567'/0/0": 'LZHPZVxJurQotfry2HeZTtiWbhv5QXPa9c',
        "m/44'/2'/2147483646'/0/0": 'LgW4ZNwRZme1Hi452KZ4vupfGwRihkp8Gj',
        "m/44'/2'/2147483647'/0/0": 'LaFJGRtWDN1wPG2P5wnbqWUdEAAfC5xvuh',
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
        "m/49'/2'/0'/0/0": 'MKGK4KJb6AqPgs32JayohX3a5gAVTLxw1j',
        "m/49'/2'/1'/0/0": 'M8znzMFsLKXNihsXiUMshoSbNANZrGaxod',
        "m/49'/2'/21234567'/0/0": 'MUvu2yhp2Tqc9kN7pwoxSbnR83LQbGkpvS',
        "m/49'/2'/2147483646'/0/0": 'MHbxsvL4eZSjv6etT8cv1bTm7sib3BLFaw',
        "m/49'/2'/2147483647'/0/0": 'MBT2igPbhapu4oZeMRiwSsjMFGc8cSCCMQ',
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
        "m/84'/2'/0'/0/0": 'ltc1qyw6nqgjg26mqdmpzcs2ns2z3a40acywe7ydcqy',
        "m/84'/2'/1'/0/0": 'ltc1qdldpt3r38mg5ed70s8paml37tyvflawjqhjt3d',
        "m/84'/2'/21234567'/0/0": 'ltc1qkspf8cy385ksqvah0th5ulvcad5a7v469f8cgh',
        "m/84'/2'/2147483646'/0/0": 'ltc1qrh25cppd9l3fa5hdyw70n8jvcxh7s87kdfc2fd',
        "m/84'/2'/2147483647'/0/0": 'ltc1qkx6pssft834axg68z3w2enq8l9nlvcku2gjkym',
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
        "m/44'/1900'/0'/0/0": 'NRcFZa2GzoF3M8igDM79GEVjeE2HdyT24H',
        "m/44'/1900'/1'/0/0": 'NY6nNGexkGjoasD583yU4Skarj5BXPB92P',
        "m/44'/1900'/21234567'/0/0": 'NduSo6qAWMwanYMiRrvQbjbUzb7Dcm8w59',
        "m/44'/1900'/2147483646'/0/0": 'NXKDmwHztPUspaZ63SLzKr6rsGQiBvZJG1',
        "m/44'/1900'/2147483647'/0/0": 'NVnTzG4bJuhpiqzQ2Shs38CUMPVaARDB8H',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/60'/0'/0/0": '0x9176D80d064575875e242723F427e91DcADeFe26',
        "m/44'/60'/1'/0/0": '0xEde7827e5bbecAF18e602714a15e58dbAf4883D5',
        "m/44'/60'/21234567'/0/0": '0xfB7Ff45554Dc2493CbE3B192cACc240C0083d6dB',
        "m/44'/60'/2147483646'/0/0": '0xADE6E74cfa00cA1bcE776C72B5aD5BF5fEEb551b',
        "m/44'/60'/2147483647'/0/0": '0x99E19dB7196d67FC681DD38aF8447883EB56598d',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum Classic',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/61'/0'/0/0": '0xbA1f8e5Df9620a42e0C0D6a01aA2B9915B4A945a',
        "m/44'/61'/1'/0/0": '0x211231B672b1D5D3b41a39C9b30b91a4bE719db2',
        "m/44'/61'/21234567'/0/0": '0x0b8958B85CBBd929591903F8a29d3Cbb509423ad',
        "m/44'/61'/2147483646'/0/0": '0x6DF7a10326EE07a022Fb60724D40510ee2E991FC',
        "m/44'/61'/2147483647'/0/0": '0x15687755a2114702a201a808e73fb1aA305237ef',
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
        "m/44'/118'/0'/0/0": 'cosmos15ngat80aqs2n8g5umpejvs0h0snpac9jt0ct5r',
        "m/44'/118'/1'/0/0": 'cosmos1wtdd7cxy204gqede9jcat0evunq3hqlwf363me',
        "m/44'/118'/21234567'/0/0": 'cosmos1l5a5kgpxtdhgxpdwf77c62s2hnlc5kpmvj9sl3',
        "m/44'/118'/2147483646'/0/0": 'cosmos13js0cj3fazmnaqxrxn4cxda7ggcv8y6y95zfuj',
        "m/44'/118'/2147483647'/0/0": 'cosmos1t7xe8g8lql8cs90x9qyx4sjvp6r50e34v2psg5',
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
        "m/44'/118'/0'/0/0": 'akash15ngat80aqs2n8g5umpejvs0h0snpac9jx54vde',
        "m/44'/118'/1'/0/0": 'akash1wtdd7cxy204gqede9jcat0evunq3hqlwy2hkzr',
        "m/44'/118'/21234567'/0/0": 'akash1l5a5kgpxtdhgxpdwf77c62s2hnlc5kpmpfghxt',
        "m/44'/118'/2147483646'/0/0": 'akash13js0cj3fazmnaqxrxn4cxda7ggcv8y6yg00w9g',
        "m/44'/118'/2147483647'/0/0": 'akash1t7xe8g8lql8cs90x9qyx4sjvp6r50e34p3vh3w',
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
        "m/44'/118'/0'/0/0": 'cro15ngat80aqs2n8g5umpejvs0h0snpac9jn5sjgj',
        "m/44'/118'/1'/0/0": 'cro1wtdd7cxy204gqede9jcat0evunq3hqlw32jg8g',
        "m/44'/118'/21234567'/0/0": 'cro1l5a5kgpxtdhgxpdwf77c62s2hnlc5kpm5fdfrq',
        "m/44'/118'/2147483646'/0/0": 'cro13js0cj3fazmnaqxrxn4cxda7ggcv8y6ya02sqr',
        "m/44'/118'/2147483647'/0/0": 'cro1t7xe8g8lql8cs90x9qyx4sjvp6r50e3453ff59',
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
        "m/44'/118'/0'/0/0": 'fetch15ngat80aqs2n8g5umpejvs0h0snpac9jcj30k5',
        "m/44'/118'/1'/0/0": 'fetch1wtdd7cxy204gqede9jcat0evunq3hqlw6vn4ew',
        "m/44'/118'/21234567'/0/0": 'fetch1l5a5kgpxtdhgxpdwf77c62s2hnlc5kpml0v5ax',
        "m/44'/118'/2147483646'/0/0": 'fetch13js0cj3fazmnaqxrxn4cxda7ggcv8y6ykftd79',
        "m/44'/118'/2147483647'/0/0": 'fetch1t7xe8g8lql8cs90x9qyx4sjvp6r50e34lhg52r',
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
        "m/44'/118'/0'/0/0": 'osmo15ngat80aqs2n8g5umpejvs0h0snpac9jr5tmz3',
        "m/44'/118'/1'/0/0": 'osmo1wtdd7cxy204gqede9jcat0evunq3hqlwp2fpdt',
        "m/44'/118'/21234567'/0/0": 'osmo1l5a5kgpxtdhgxpdwf77c62s2hnlc5kpmyfkqfr',
        "m/44'/118'/2147483646'/0/0": 'osmo13js0cj3fazmnaqxrxn4cxda7ggcv8y6yd03e2q',
        "m/44'/118'/2147483647'/0/0": 'osmo1t7xe8g8lql8cs90x9qyx4sjvp6r50e34y3jq7x',
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
        "m/44'/118'/0'/0/0": 'juno15ngat80aqs2n8g5umpejvs0h0snpac9jaamsnl',
        "m/44'/118'/1'/0/0": 'juno1wtdd7cxy204gqede9jcat0evunq3hqlwlre2u9',
        "m/44'/118'/21234567'/0/0": 'juno1l5a5kgpxtdhgxpdwf77c62s2hnlc5kpm6qxtcd',
        "m/44'/118'/2147483646'/0/0": 'juno13js0cj3fazmnaqxrxn4cxda7ggcv8y6ynxpjmw',
        "m/44'/118'/2147483647'/0/0": 'juno1t7xe8g8lql8cs90x9qyx4sjvp6r50e346czt0g',
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
        "m/44'/118'/0'/0/0": 'terra15ngat80aqs2n8g5umpejvs0h0snpac9jdtztkr',
        "m/44'/118'/1'/0/0": 'terra1wtdd7cxy204gqede9jcat0evunq3hqlw04q3ee',
        "m/44'/118'/21234567'/0/0": 'terra1l5a5kgpxtdhgxpdwf77c62s2hnlc5kpm2klsa3',
        "m/44'/118'/2147483646'/0/0": 'terra13js0cj3fazmnaqxrxn4cxda7ggcv8y6yrscf7j',
        "m/44'/118'/2147483647'/0/0": 'terra1t7xe8g8lql8cs90x9qyx4sjvp6r50e342wms25',
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
        "m/44'/118'/0'/0/0": 'secret15ngat80aqs2n8g5umpejvs0h0snpac9jf2vzfl',
        "m/44'/118'/1'/0/0": 'secret1wtdd7cxy204gqede9jcat0evunq3hqlwt5wcx9',
        "m/44'/118'/21234567'/0/0": 'secret1l5a5kgpxtdhgxpdwf77c62s2hnlc5kpmwh3ezd',
        "m/44'/118'/2147483646'/0/0": 'secret13js0cj3fazmnaqxrxn4cxda7ggcv8y6y83kqpw',
        "m/44'/118'/2147483647'/0/0": 'secret1t7xe8g8lql8cs90x9qyx4sjvp6r50e34w04e4g',
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
        "m/44'/118'/0'/0/0": 'celestia15ngat80aqs2n8g5umpejvs0h0snpac9j69fmww',
        "m/44'/118'/1'/0/0": 'celestia1wtdd7cxy204gqede9jcat0evunq3hqlwcmtpp5',
        "m/44'/118'/21234567'/0/0": 'celestia1l5a5kgpxtdhgxpdwf77c62s2hnlc5kpmac5q9u',
        "m/44'/118'/2147483646'/0/0": 'celestia13js0cj3fazmnaqxrxn4cxda7ggcv8y6y57nexl',
        "m/44'/118'/2147483647'/0/0": 'celestia1t7xe8g8lql8cs90x9qyx4sjvp6r50e34aqsqje',
      },
    },
    {
      method: 'suiGetAddress',
      name: 'suiGetAddress',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/784'/0'/0'/0'": '0x1800714ad662c8abc309d7419e469618106d1f86eef88b8e4f9f826039949318',
        "m/44'/784'/1'/0'/0'": '0x9d5ab711e91ca8ad190693e25ae3cea84e6cf856bd51b3d2a786f8b6850fc0c0',
        "m/44'/784'/21234567'/0'/0'":
          '0x3d1bbea2eb35eac37ab4eee86992352e795428868a9f82af0d76653314b9b385',
        "m/44'/784'/2147483646'/0'/0'":
          '0x9b7a0dcd6e59bcfaf46c078c1ca2da50e74ce64c60d0ab63d223aa4ee19383ca',
        "m/44'/784'/2147483647'/0'/0'":
          '0x90d805b55fadc421378815d4ba7b293ebcd503e0e5d6ec0e06064c3addecbe45',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'r4d78ChYM9uqaX8ETar62FdcyhUkFgk1F6',
        "m/44'/144'/1'/0/0": 'rGbQYWs5WtKgBuD28jqCcwh5L2LNRPWb1J',
        "m/44'/144'/21234567'/0/0": 'rHZWXmDpg7iNnepQ6doq41XyzkCRgBsNBT',
        "m/44'/144'/2147483646'/0/0": 'r9yVncbHyfrodZ3ssVo5EQkjd5ocGHhgUE',
        "m/44'/144'/2147483647'/0/0": 'rnDEU9yvwP2yqbuBnkemy94itm2bq2CuwX',
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
          'BFC750ef68c35006320666d9d52b36821f7738a537933e4bc029ce3c3a03f5c0d2b3948',
        "m/44'/728'/1'/0'/0'":
          'BFCb0924e82d25eb944327f231683c04743e6d167fe1df39e9e34c44d3ca16bf67b11df',
        "m/44'/728'/21234567'/0'/0'":
          'BFCacbcb3996a60324b2b0c7931afa743cf1685ab05e031d569236181b7aebf4111f2ac',
        "m/44'/728'/2147483646'/0'/0'":
          'BFCb0f5d8d4735753a9367f31e1c680fe5bbe39401be27903255c0698504a20766c41fe',
        "m/44'/728'/2147483647'/0'/0'":
          'BFC6765740e0ad86c689aa414b9331a2abdb574a62d530b904ac7f2ce5c807255987469',
      },
    },
    {
      method: 'alephiumGetAddress',
      name: 'alephiumGetAddress',
      params: {
        path: "m/44'/1234'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/1234'/0'/0/0": '13RLNhuqPMZR4W44yxPTFmkpP6bexaBNE6bznePfECer8',
        "m/44'/1234'/1'/0/0": '1HUiVEXoCSgwZr69xiryAvVBK45WEBQLhfnbeZP3HzjfA',
        "m/44'/1234'/21234567'/0/0": '14R6EcSPyYCMQ4GEUmCbHe1G8t3jxrzPcokxESv8psN6Z',
        "m/44'/1234'/2147483646'/0/0": '18y9AxjxfCSomrrGg338TLcQETt2X67BrDZ5mHvsgUP4Y',
        "m/44'/1234'/2147483647'/0/0": '1DaJ5qpEuAL6nd3oxCK35VhVDjijLACd93XhZMdFUDnMs',
      },
    },
    {
      method: 'algoGetAddress',
      name: 'algoGetAddress',
      params: {
        path: "m/44'/283'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/283'/0'/0'/0'": 'SRMCYSF2DTCPOMUWDZ4DX4LTCB7UOIOQIP2NICABLG4O4LFR5MBZJBZB6Y',
        "m/44'/283'/1'/0'/0'": 'NY76F5BCHRRQU43OHF5RYEPNN3FH5QP2GVPJHN7BUKBOG3LGNPRQNZQPYU',
        "m/44'/283'/21234567'/0'/0'": 'IFRRZL7RY5YFHJ3BIO5GH6P3FL6ZO434ZQ2GKDDMVYCYNBM76BFWUYUSQ4',
        "m/44'/283'/2147483646'/0'/0'":
          'NY6R3UFH63XS2NX5WXBIXGL2GGSZFR3VHUDIONQXYS5SGDIIZTJQOQLJ4Q',
        "m/44'/283'/2147483647'/0'/0'":
          'SV4ATNTW532TP3WJE4C32DGAA57J7ANZ424NH6MQ6FPQUDIYO6Q5BR3ZSE',
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
        "m/44'/607'/0'": 'UQA1cG0jIgoa0QoXhXMCdYV5aKK5CQ4kg8AfBIOUK7CjkK0A',
        "m/44'/607'/1'": 'UQDtvzZfgnJeo7nvPTiABSiHxgWwBssWJsNCaD-VVxxhwgDx',
        "m/44'/607'/21234567'": 'UQD3YW6XcyNIjfMf7HhUVRtW_zD1fCsbk8KGmMu8iUJO0nq-',
        "m/44'/607'/2147483646'": 'UQB313Q75YjN_iBGtF_eRNtB-owlDVKrN63Rq-iIVnvrm1js',
        "m/44'/607'/2147483647'": 'UQAPM18KfvrFeroExN3kAFfhxtfghCvrPZRdk3crpyJoKLXQ',
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
        "m/44'/309'/0'/0/0": 'ckb1qyqzdtr8dglzrm5lx7utrcpvrf4wtsvd22xs8xtacl',
        "m/44'/309'/1'/0/0": 'ckb1qyqqm48pugmrn453khxr0vcn7rht33zkq4es9enf0p',
        "m/44'/309'/21234567'/0/0": 'ckb1qyqy32dy97eqtm6npezt6fhrl83kx3m76x2sjfrkvg',
        "m/44'/309'/2147483646'/0/0": 'ckb1qyqf8w7658e2tdevjp4vak2jdd5249v7qe5sy5asgn',
        "m/44'/309'/2147483647'/0/0": 'ckb1qyqfcfzavpvvmr906dghzwyah2tfr08nq7ws049tha',
      },
    },
    {
      method: 'nexaGetAddress',
      name: 'nexaGetAddress',
      params: {
        path: "m/44'/29223'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/29223'/0'/0/0": 'nexa:nqtsq5g5mcs9yd26yy028032mf363g0cj2s7vtas4ce7ha2j',
        "m/44'/29223'/1'/0/0": 'nexa:nqtsq5g5pmltxghefuhu0jt07605unjn4wht4wzmv4mrwqms',
        "m/44'/29223'/21234567'/0/0": 'nexa:nqtsq5g5nqzsxngqs3s8zrstnaj2th3pwmuw95eatdm5eyml',
        "m/44'/29223'/2147483646'/0/0": 'nexa:nqtsq5g5mpqpdtz5v8mmc6qtlzxjea07rf9gddd96cmhadl5',
        "m/44'/29223'/2147483647'/0/0": 'nexa:nqtsq5g58kmger26n3qayvfdwmxspl5fvgj0l2vpez2amh6v',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'r4d78ChYM9uqaX8ETar62FdcyhUkFgk1F6',
        "m/44'/144'/1'/0/0": 'rGbQYWs5WtKgBuD28jqCcwh5L2LNRPWb1J',
        "m/44'/144'/21234567'/0/0": 'rHZWXmDpg7iNnepQ6doq41XyzkCRgBsNBT',
        "m/44'/144'/2147483646'/0/0": 'r9yVncbHyfrodZ3ssVo5EQkjd5ocGHhgUE',
        "m/44'/144'/2147483647'/0/0": 'rnDEU9yvwP2yqbuBnkemy94itm2bq2CuwX',
      },
    },
    {
      method: 'scdoGetAddress',
      name: 'scdoGetAddress',
      params: {
        path: "m/44'/541'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/541'/0'/0/0": '1S014b949e1afcf18c37db6a5b455de26ef617dc51',
        "m/44'/541'/1'/0/0": '1S01bef934279a81837627d18009d0173d482626e1',
        "m/44'/541'/21234567'/0/0": '1S01fd94730ef99038045800a6f3b387c8905cdb91',
        "m/44'/541'/2147483646'/0/0": '1S019ce88e007fbb1e63743122b386c09710af3271',
        "m/44'/541'/2147483647'/0/0": '1S015a65ce630ccbea1f3c91f5947dbe9e8de238b1',
      },
    },
  ],
};
