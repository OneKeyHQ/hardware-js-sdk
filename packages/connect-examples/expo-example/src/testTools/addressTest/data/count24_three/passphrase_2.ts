import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'three-passphrase24-密语2',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428736557',
  passphrase: "ADxvB0383*3*%^%~./,';L",
  passphraseState: 'n1Kg8udanaFFE48Y8im6GmgCSzSUmGHxV4',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q840pns0w6rmpe2h4lh8tltx7tt7cayzk9ymnm8w4v6gqk7r5pepx5ryse9gs42hytmschdjmv0qsrv4rs8lllysqccqxfx2zk',
        '50': 'addr1qyvwvgztzhnusmm3r7xsclrne6fgl6qrz86qafwt6r8pwvy7h3hrxysk4w67jskxzrej56cuuzk2d3hkmx0aer8fdj4sx337hm',
        '2147483647':
          'addr1q9emde7qjex5qrv3t8gvjejjz7zhg25qvm2gwah0n8d422d9xwdefxk6va65sdp4ztqhcqcpea32s36r3az54mzw3a4sr4em2g',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'DW6ZSEO3BYTPGFGWLAWIWK5CHHS74XMDIDK4C4WC6NZ7EHPN5HBMU2ILGA',
        '50': 'QUNESM2WN52O5T726QCRIR46GYAVZUH5FK23YCDO6HMOR4BSQPIZFV4JOU',
        '2147483647': 'IOE2WXLZ57OVVEEQQCVA2MP5YDCBL5QINSUQJSSQPBLTINDOIZXS6ED5IA',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x2381cf671ac742b5459abf1b4d5b54e09bfd3b050b99a3a379de3479c2a5733a',
        '50': '0xe01074ce91b89cfc493146f74fd77606c3b0babfe35652f28bc2f926504b0b3b',
        '2147483647': '0xb348133d9430a94c9c88c602f47aa3ab589aae3e6dda1bcb87087ecf877b96ef',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '12mX8CbpusXunASe5h3gtrSENEeEMFvgrE',
        '50': '1ETJGZkTykM89JoMCwNQB322D9T63n5X8A',
        '2147483647': '16t7pfApbUEGyweNf76cZ8gErqwgtmvAoE',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3EXCE7hMQTxS67QXhukEcruGBWStrga89L',
        '50': '3GfUcWWpnpM3hVVQSvSKB81Tm1PnfFwGn1',
        '2147483647': '3P5ZmQBWPQNhJoMnjJghHr67QRASPCKKY8',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q372wlk367ulgmvsgr86g9zhpgcxhhqhqdnvm7k',
        '50': 'bc1qlagkjumdq20hptqld3lafzz5f6vq2pfc7kyf9x',
        '2147483647': 'bc1qny4twcmyseqe4fdd2jjg0dvjc008q7nedt6thn',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pzuah6y8lsxyttjgkywtzjrh5t05sjvl8l8p2uur4u2tnhrr69mrqpn2e9c',
        '50': 'bc1pta9aq7kxl3c09ryaryhg68g2pskvfm0w855xtxyfsv73xw7gmxdq6nghye',
        '2147483647': 'bc1ppzvqy9ve3dvvwxzhrsantknn8glh9xtvt29kqtes0cg6ezpck9hs57cydc',
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
        '0': 'DTVh18oaTsu1AETCUzcBAHTTmzG8fmFPs4',
        '50': 'DR76ksSJLfx7SjzCxcZhK9fhkYHgYu6F9R',
        '2147483647': 'DBTyD96Y5XPVRnXY1e5xmLdnKEqWCStvrE',
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
        '0': 'bitcoincash:qrc5lj5nzf86637qrnaq399u0e7qzxshk5cclvxh43',
        '50': 'bitcoincash:qrdwl3uk7m2nem7nvwzdzc3lwu8yxwqjhcghz0aa9e',
        '2147483647': 'bitcoincash:qrq87f4lt3wwu7g7sqvn2zgtc2gsnjusksyz8nl7a3',
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
        '0': 'LKHAzJHumyXJNdM7ZTiH9XyLu44WU1bYro',
        '50': 'LVZWBD1aS8GcEoHZ1dkFWm53mErew7EBjf',
        '2147483647': 'LKWhJkWwjxQneBySMfPncB1WFe7yxRWd3R',
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
        '0': 'MTzJUUXTwGLaoXHjvn9g8w9gB31qjJSnet',
        '50': 'MPrTvrFyQGuLq1Pg8su2DnEfmbYuT1jE2Y',
        '2147483647': 'MAzrr7Y1vtAbSy31TUHA7ugv1WK619VnBb',
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
        '0': 'ltc1qskgn9ug30w7xcjqf255ex6myapv9gng6t7jw7j',
        '50': 'ltc1qnpywrq3hqz49yy2fannwq85llspt37hu5mzhqv',
        '2147483647': 'ltc1q5aydkzv5guf8ff93pnjxqppddyy56sjg4fav80',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aam9b3vpzvj0v6hhrfnd214gfesvk8dbv2d8jnj2xx',
        '50': 'cfx:aajmhn4rjwaj3zfxprefp740nex5ayxrgpzfc0pr54',
        '2147483647': 'cfx:aathd38z9hyy7yznsvwsmd9pu6vb53t5mjnccfkpej',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1frk93uca7jadua23au8mfqfhhez2nt565mg75k',
        '50': 'cosmos1pfwzjdpxd7f64t9687jsmx3gvhy79xfd8ky7c5',
        '2147483647': 'cosmos15e4x5v0wjcr5nhfjjyz7qwhv0wjlyeukh97hjj',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1frk93uca7jadua23au8mfqfhhez2nt56eq9edv',
        '50': 'akash1pfwzjdpxd7f64t9687jsmx3gvhy79xfd2dfepw',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1frk93uca7jadua23au8mfqfhhez2nt56vqq8g8',
        '50': 'cro1pfwzjdpxd7f64t9687jsmx3gvhy79xfdldv8y9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1frk93uca7jadua23au8mfqfhhez2nt568xp6kp',
        '50': 'fetch1pfwzjdpxd7f64t9687jsmx3gvhy79xfd5td66r',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1frk93uca7jadua23au8mfqfhhez2nt56uqmwzy',
        '50': 'osmo1pfwzjdpxd7f64t9687jsmx3gvhy79xfd0dhwwx',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1frk93uca7jadua23au8mfqfhhez2nt56zft9n2',
        '50': 'juno1pfwzjdpxd7f64t9687jsmx3gvhy79xfd3y89lg',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1frk93uca7jadua23au8mfqfhhez2nt56jlj7kk',
        '50': 'terra1pfwzjdpxd7f64t9687jsmx3gvhy79xfdpj7765',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1frk93uca7jadua23au8mfqfhhez2nt56k7uhf2',
        '50': 'secret1pfwzjdpxd7f64t9687jsmx3gvhy79xfd9nsh9g',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1frk93uca7jadua23au8mfqfhhez2nt5693ewwm',
        '50': 'celestia1pfwzjdpxd7f64t9687jsmx3gvhy79xfdku4wze',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xf80A597559eE9c6b03aED9c3774554f10E468898',
        '50': '0x088D9870B957620099F89cf7305eA19B5b9eBC97',
        '2147483647': '0xF2d161cd89CD33A064236dD4a91Db5b480F7c9c9',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x67129178F69B5C390D83f7E420A61520ac26c50b',
        '2147483647': '0x9A3DaecEE8f26F040369FF9da34837896617714b',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x67129178F69B5C390D83f7E420A61520ac26c50b',
        '2147483647': '0xbF8A37643440667f4B0831c62678c1d1E4aC38D5',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1rvbe5oiljcf4udexhmbeacfxxv6lbnwr3j2crrq',
        '50': 'f1djei3emeisl6yrx2aismeccvwh3ezxgyqcg6wri',
        '2147483647': 'f1u3kec7sv7nur7xpjm6g6zey2pgxnlqaztlqmb4q',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qqz98vv7rkl00vmss76mcn45t62zjnd2xpr67xf9xnhtr0dez3qs5t0tk8mkr',
        '50': 'kaspa:qz96jtwn40jqwhj57hxpl2s2432xxvlmd0kumk0fvee459x89vz86jh83f4v7',
        '2147483647': 'kaspa:qp6lrsrg4z2m6emlxdtes5xmp7d4cgjq35myypdqnyrklq8d3uk4wxdh8nncd',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'efcdf7b580f627e1215e08855855f092f835c5ce83098fefa12ee8f0b6406044',
        '50': '47d1ca0a5f78a2f56b49419afaa2d2e5c408d6b1587a5cb91f2d192085c5432e',
        '2147483647': '61eb03eddf593b4abcd8bded6f27496868e0cac2e87fef93cd1675c2f5c781c7',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NAMHFUFEXIIFK25757XISKKKOWTEAZIEGH3AISYK',
        '50': 'NAD6P3KO5BUNCPUVMF4THKKB4IKTBYNOH3G4IUNK',
        '2147483647': 'NA6CGHNSA5BZRFRHFVLY4HAZLXFDE2SI5EQXCYBN',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g58dlygh5excmtxp2w6q33xlfpdkg6muthulw2w94f',
        '50': 'nexa:nqtsq5g569j6s65ur377hzrcqh2n63e35t84hu5gwgaqmy3y',
        '2147483647': 'nexa:nqtsq5g540u42fgtwdhyapzsqwztqfcyvdxukrdph8lrm0qw',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '1CvTcEz5oaUTQqC2S57LvsBegkEjh2BqoRqWjixyZhxq2bS',
        '50': '16bqwFE1hSELXasQEEpyVsRQ4k2Ceiy4ETPmX3ZWijreWZbb',
        '2147483647': '12fBHwNBWve1Fprw9UnDtiQMU8gAefKNuzhR5KfsKMQmaS9T',
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
        '0': 'W9DkZx11Fx7EhrWZ6UEESCJt7Ti1cAnnWCVb9wUHqgQEW2p',
        '2147483647': 'XbUau5CSP1e37tFg9BLnDjUhZPdvaTyrhU59jtNddPCzCYW',
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
        '0': 'CnEybKnrPKvmXe7qVqA6jQ2wf2pr4HEDgY6k71ZuGtwPmdK',
        '2147483647': 'EEVovSzHWPTZwfrxYYGeWwCm6xkm2aRHsogJgxUF4bk8weX',
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
        '0': 'j4RXXtKDt6jp2rVGRLmTo3vk2KSqAYH3DVFKnizmvrYq5J6jX',
        '2147483647': 'j4SynieM5XrsZeuJATpAubiHC8tm6TFLQZSbNHaiqCLXt3Rhf',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rNohzjkx1ZuMoV9J9DSUWSvskp8rKG5cUF',
        '2147483647': 'rhC6oaFzwpAD8bpy8NdK6mbUwG6NzyRV5S',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'Fhh3QwnzYg3npyBkpD1Li1GYKJH9yRj9Lp5MsX8emfEH',
        '50': '8d1WjSv4gKW9uHrUntocudGhwYZNPbLDBC8SxEHuYN4f',
        '2147483647': '4JaLyB592gV6Ga53h13Fbn1fd77DcAcFfqpCrsePUrZC',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xb76507bcb761ea6946e71b7fc229d94e',
        '50': '0x87da7037db2663defdc92f3e985bdf83',
        '2147483647': '0xca09280c6f3e74daa8d46e3efe302290',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GAXF4JH32VIIZISCFVQO3PMGSCLTOYWOSZT655SFMV34YOPWNSUJIPR6',
        '50': 'GCO2JNVGQ5CCXD47OWGNXHTT677J3HNRRAJDDYO4WNUSDX4ENNTG7SAD',
        '2147483647': 'GCBTPV5PZQMISTBA762TNBEBDEUXEH245O7RG6RPFRORGL65NKGFY6FG',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x110760c5e1b016330ee3bd809fe07e7ade05a6f6b0c0aca8e89779d5e52ef6b0',
        '50': '0x514a4fa27f63af7f6edce8047717d8d4ac49d61d9cb7024d2cb71a6cb19d831f',
        '2147483647': '0x726383d1c621335b9f530d720028e30d195a5e0f841d9646da3506f43b0b6212',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TWVsCKw4fB59qdf1pUUKU3gCrkf6nNy5xr',
        '50': 'TJWM1EvngBVfdixsqcmwnH98XfmXw8dGne',
        '2147483647': 'TLLpBsrj1uuLtQZTPWfqBm2zLX5Nqt3rkK',
      },
    },
  ],
} as AddressTestCaseData;
