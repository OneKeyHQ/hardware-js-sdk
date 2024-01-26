import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'two-passphrase18-密语1',
  passphrase: 'xyz456',
  passphraseState: 'mwdeVF48d9APXPFNUcZD71JEGWHCKerED3',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429817885',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q8ah658m568qvrmywma5rfk0x00rnadv2nxtw3cgpxnktnfpvukqmvh09vqqg8thtc0a42pdu9duswwxrrttuqf6y0mqawyg8y',
        '30': 'addr1qye6aqv4xds76seaad6an2zr2yacn2906ldkqj2mnw8u2gdqkx3rfkwwweysnhnjxms2hvem5qdca50c2242xvzy2zvs7vc06x',
        '2147483647':
          'addr1q8kjl5f3ee3eql67qt2gt3qpulnz7vvqecpu24sztp520kz2qluje38juxrvnp7spctl65m6grkv64uykhy8zcj9zekqqqjzr0',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'XY4PBTXT7SXK6T4V4IFEYFJUNJCQ25QLNGBFT5KC65ZORV2WCZOWEBTIWQ',
        '30': 'OUQGAIJFSIMDF7B53CU7D4QPBTVN4MC7AMKTKEKH6JDF67XBR2XNYUUQNQ',
        '2147483647': '6VCT5FTYQHPGWSQ6VTGGSCG67F2ETKZTMMGFRIGLK5DMOFUXXYEWUNNGNY',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x3f824ba4a988611c022a5a5de9e7335b463546fe15fe5e64c02cccac495d58d2',
        '30': '0x260b8c9c3bb5a9262a43b28ab965dbe7ce9ad5b318c4383bd04636c1089e6fee',
        '2147483647': '0x593b762a85b925ae46d95ce18d4894bdf30cdb3275ef76f2403a4a7dd6a102ca',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1JLttAPMai8qNfJHPqLmTAE6Sfmj2fsb3p',
        '30': '18GmDeahwXbpvquFPZ4aspH4GLft8ZH8e3',
        '2147483647': '17Hwaw4S38hwbuqcSQueZUFBvvmbfc4B4H',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3KGedkWCBC8iZHU3ncLAaPbJfMKU5DYCit',
        '30': '3D9rLow4wN6Pj97FXVChrKesirxkVMzACj',
        '2147483647': '39VJVgfaoMY3rbx78Z9gzDoEd1YZ4nP7Zv',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q2ua42wp6wx22kujkulwpl75fnndp5rv3fv3eng',
        '30': 'bc1qw0kwdq5rcengu04tejmwft786f9y53g3uvvest',
        '2147483647': 'bc1q00repv73sng2frg5l2ypvx7450yu072ggfr9jv',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pg9hdqquzk6daje9qvnmehnhdelw8j3pqwrxqh50r9d7l8pfwrlusklctyt',
        '30': 'bc1pjeaftpr5fkpz6feja073uylj9ctayvaswqkvy5rmzzq3cduha5ushfjrw8',
        '2147483647': 'bc1ps2trxwzzsw3dxes7yq64g8g80ne3ylrz2aru8quur2t4t6h7yqmsv0m3e9',
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
        '0': 'DNbEVjytWGNfPtz21P6XKYwcUFo7rur6ms',
        '30': 'DATw8f9D15oqxqZyipksjxAToQLQA4mDeL',
        '2147483647': 'DJMtoXZ3rvaBqkA57FoXnWkLDs8DwGjTqE',
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
        '0': 'bitcoincash:qzn85h4uuv9nz3s0vm4cn47uz377m72ajspxk82vhj',
        '30': 'bitcoincash:qzl369wntk2zluhdxcaya2dwkf2wa9f6jg89w346ad',
        '2147483647': 'bitcoincash:qzurkasdgkh444dzp0h20328kragjhmmcuflvqs4gj',
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
        '0': 'LTNKV9mCqAdZdA4H4S2QNTaEXeJWz1zNyY',
        '30': 'LNLF5Zj8Hvku8Zinsun4r5QmUZYFjWsFyv',
        '2147483647': 'LdgAwBamgBLPeuiFeJWrNVrd7uFiNUv61K',
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
        '0': 'MUV19qnPacxiRQSDAAmKnxZLTqy2rosk6m',
        '30': 'MNeVNnpPfDor7o5NqamVLm8MGHVDtpqpG4',
        '2147483647': 'MATyzC4TeadCMXwUFz1jFcV3xhjauZhv9e',
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
        '0': 'ltc1qyqexhz2r8rql5mqx6fjl4snqy0dne3mnfzlz3n',
        '30': 'ltc1qcrn0h7s7sj7326hmc3fvf6s6eerph7vvdvq90g',
        '2147483647': 'ltc1qy9gjuenezdqkctq6n8zt4xm5ye24v0gp6wdx25',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aapupkcrmue1vu3vjdj0ygsvcw4zb5f04au5519gct',
        '30': 'cfx:aakg9vez67rw4sdc1wmr7f7wn8yryyhg8edxyj5gw5',
        '2147483647': 'cfx:aarzfynsnnta4j2878dxcm139zkbe88fjjs8wu5efh',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1s9ysm322cen0peqrm7nfrxha8kpp5jp3xz0dvg',
        '30': 'cosmos1j0hmjky56qe25xrak5scqzzlwf3dgxa9qz8q59',
        '2147483647': 'cosmos1u89fm984hrz4hf34wxhnram0f75me62q4k80f9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1s9ysm322cen0peqrm7nfrxha8kpp5jp3tez24j',
        '30': 'akash1j0hmjky56qe25xrak5scqzzlwf3dgxa9de28dl',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1s9ysm322cen0peqrm7nfrxha8kpp5jp37e85se',
        '30': 'cro1j0hmjky56qe25xrak5scqzzlwf3dgxa9ce0eg5',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1s9ysm322cen0peqrm7nfrxha8kpp5jp34lxfwl',
        '30': 'fetch1j0hmjky56qe25xrak5scqzzlwf3dgxa9nlwykj',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1s9ysm322cen0peqrm7nfrxha8kpp5jp3weua66',
        '30': 'osmo1j0hmjky56qe25xrak5scqzzlwf3dgxa9ge5szh',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1s9ysm322cen0peqrm7nfrxha8kpp5jp3ssvkt5',
        '30': 'juno1j0hmjky56qe25xrak5scqzzlwf3dgxa9ksymne',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1s9ysm322cen0peqrm7nfrxha8kpp5jp3qx4dwg',
        '30': 'terra1j0hmjky56qe25xrak5scqzzlwf3dgxa9xxaqk9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1s9ysm322cen0peqrm7nfrxha8kpp5jp3y8my35',
        '30': 'secret1j0hmjky56qe25xrak5scqzzlwf3dgxa9z8nffe',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1s9ysm322cen0peqrm7nfrxha8kpp5jp3hg7ak9',
        '30': 'celestia1j0hmjky56qe25xrak5scqzzlwf3dgxa93gkswg',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xc55DdBEAa298633B630dCECCc72471cF5bCEc036',
        '30': '0xD729CCd128505f4001c4eDD63d3A4Fb6AE70Ba3d',
        '2147483647': '0x1a40696D12922eb01dD5b7747bF9F475088e7B26',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x013C7ac1B9ae82Cc1A253e25055582994D7EAee5',
        '2147483647': '0x57F11cfe4BbbdD4A81C4e2aa6609dC2cd03cb3CE',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x013C7ac1B9ae82Cc1A253e25055582994D7EAee5',
        '2147483647': '0x6a4b19996be6C683f2B8a5724C7f06E1E62b8769',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1mgtnch3rqvgzctkn2ybusgyhwwi6c7ehy37l4ta',
        '30': 'f1o45sdidxqshlwvmpos5y2n2fnwxqf7eu6qdkq7i',
        '2147483647': 'f1mnpp7uagezmcfk7u6o33ibbrwewehxas5k4snni',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qqn53w6mjsr4mmvrhnfxjjrzy0nru89mjn8jtz7x5de2pe5vr2492mw24rupe',
        '30': 'kaspa:qpwahjwj049svm55fx2chfvgtpm3578agyue40n4tzq4cx093neukq0jtm7qm',
        '2147483647': 'kaspa:qr4hz93gudu3wp6cg27wsvj0wrm6l8tr6mfw9q8eqtgmd5u3xthz2w0nwvk8p',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '1d426075fc509f0a7e242b473d5ef1c4cfdad037c22076d903f3aab5ccec2ce1',
        '30': '51088ff39359285155de328716e7b37cb094f0c652ffa79b7c6574a59e59548e',
        '2147483647': 'abcf4efe9da5990de50944975c852d10055a3d8c59190ff7a70659d932636462',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NBPZ7VOHFLF7JMUOD46C2BH7XZ4GCNBLWQFOE2M7',
        '30': 'NBKO6XM4Y737NDLOBF5VG4LBGUXR7JNKGFPKO7GX',
        '2147483647': 'NAIFEGOJVIL5GXHIUMMAHF3XF4QZNCFGB5GMMUWJ',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5jh82r223vtylkwecevdzj6pujj960gh9n53hr3wr',
        '30': 'nexa:nqtsq5g5pma739axd2l90czlwahf7fufvwh83hhddspwun09',
        '2147483647': 'nexa:nqtsq5g55e9vjw33nw3cl7wcavjdl67pxy9qgqhz843wgyh8',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '12NBnxeh4W8QAebnb5uGp6ywstpuQ7b31xchxtGVtnyHJUp6',
        '30': '168KdAyNmmWhEHKeKUXSUDVLzJ4zouUQAkKLs7LkBPk3Unc9',
        '2147483647': '14TygvLwZRhWXrf5CwvfCFTj2i4fAnqDZ9sK5zSv9wpT1cUf',
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
        '0': 'XJV5vMhyxW2wwd77kJPhcK57KYNg2jdxfPN3JV1D4wii7m7',
        '2147483647': 'ZQGyt3xUt59K9gPjcKn5knrG8n8ShypVrdyAQfRUDntRAY4',
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
        '0': 'DwWJwjVq5srUmQiQ9fKZuWoAs7VWUr5PqiyCFZ6pWAFs6t2',
        '2147483647': 'G3JCuRkL1SxqyU121ghx3zaKgMFHA6Fw2yaKMjX5f1RaHtk',
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
        '0': 'j4SgoDfdb5SMxZj31uRHxX6rnYeuqChc4fQWfB9KTmn6PmRew',
        '2147483647': 'j4Unb7dKqaMw4vw6JXHKLuFLZhU9ayNrFCbmGJFVt2vwZUaRQ',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rotCRtqCsad9ggx5AX5XJ8dATE6NuK4LC',
        '2147483647': 'rUwN9SpRh4ahaHg7kupHANrmuyvRyrRrt9',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '37AhiStLrZZp5Zk32tTubnPZ2Utf7VoupzjB88ve7A7B',
        '30': 'CftN7RpH1k24LRRVKy1pUKDisn31C4RX4hxgKYtF9YGr',
        '2147483647': '9k9fxaP2oRHkLiWHQQxZezMyFd897K6onzNFNjzFqqh3',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xd77c7acc68c7c452b4258c9e5e486880',
        '30': '0x5d2aa38e6f8d9c9fdc4296abdb85d655',
        '2147483647': '0xc7c299f08c98eb41e942917b33252fcf',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GA4D5BS5QKSBQWEIKSCLL5O752ZMECCN446LDMHV3BBPJHG5ZKTCUPX5',
        '30': 'GCFPQRTKMLZ5HBSW6YDR5K2EI5VLBVYRFDMCWMIYJDWBS6HQ6IQE5T27',
        '2147483647': 'GDFA6LAZSMULSGN2HWW7F6OOTXSBHQJGCUCAJSBNCKN2UWQDYVCQ6ZSM',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x074f198a2389cd529d6cb7f8bb29ce47cebb0ca65f135da0e0c45de682017d04',
        '30': '0xfe8ea815d4de2b0e27df5dd1f2d45c8151cb1bef940484b50f54a69417cb3e81',
        '2147483647': '0xb64d6e66434a070fce3766be8459debe7fcc2b855f745e795b5ce485c866b8bc',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TKPE4uiUABtNg3Mz91hrXe1SbmpRpJfe86',
        '30': 'TH5KNPdn2uT2AowFjtykNtKKgNPXwzzssn',
        '2147483647': 'TUDLQpX75UCku4vCAYccj29GC563dH33bZ',
      },
    },
  ],
} as AddressTestCaseData;
