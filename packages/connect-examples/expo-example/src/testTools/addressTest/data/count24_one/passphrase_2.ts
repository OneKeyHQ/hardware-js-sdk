import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-密语2',
  passphrase: '$`%@@`&^~$',
  passphraseState: 'mw38WWF5QNSdvWKiZmHQVrPrada3ARc8f8',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429392156',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q9aey6k522e4dtexcz7dcjqrpzvn5raaru4hjw9ufeh2ksm05ehyv20jl3h73r8c8hn2l2yh4c42uvzwj82f5z853rpqclg0f6',
        '10': 'addr1q8ft3jr8g7plkzv58pxtum8z3qlp0r522zccfzzk83q9aggjdme24z3w4u2f0p2cmg435gy7punc89w2xdrz5n4rxkgspxjwvp',
        '2147483647':
          'addr1q9a2mscr3fcewt5q933gred23ujxwmur7l6gqf55a6mal47hle5epglq8gjl50vq5lmlylag37gcarq3rcq6qznflwdsfca3je',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'VMY74NJPN2TBPGFAEZN3UDQ47ALTRGBWVIFENRYHFX7PR4TIESAO7XIOXA',
        '10': 'CWR44VUIY2RKXMK22T5T53JZLLCZ7WKT5D3ZTHZJWZLRBCGEFZSXGZHXUI',
        '2147483647': 'CUTLYLG7K5B2CU4SLW2K4FRVUDW7LY3BPLRZ53MRCYGPIXBXU5UK4TDLYA',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xabccbf709a1912356205b73cb24dcaa6b7d95acf1d0088453919d4e13d8e249a',
        '10': '0xc1bda126db8be77ac4474ee9f8e3f534f4f0908f3e362c3bb89c341029d02579',
        '2147483647': '0xaeba2a4e606fd2fba11d2de261aa74d565c5522e8ebf4e711f3a6369e1076d6d',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1FL5fGuZxGTmgigtk1CocX6gpUuZjouNFw',
        '10': '1CbTaPzmYfrid2e48x9NvnBKCy2znhwTFf',
        '2147483647': '1JcGHj5fRRiaWqFN5Z62gsbqy1omedFktP',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3H5Zn2Z8D4uWeQGSouMKPJzmQPo95RBgD5',
        '10': '3CAFAiQ4tdgCAUXcVdX525LE96uWnuEyKG',
        '2147483647': '3LFPY6ZW5B27BYPMKsAB65bnEB4EDqMcBM',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qyxp2gl36vvwlfm2mp0etxmvchpfmt8lv8suyg7',
        '10': 'bc1qd0zclae7jvd3c5sq3xkjdffyjj74rz9ah6y5jh',
        '2147483647': 'bc1qjg50cw203ehppv7x3tyhlynnfwqq4gnh2v6gdr',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pntzy8kpw030uz7thy4xgy9dv04xyme5d2jq2qqghc6x7e8c544dsmxamwj',
        '10': 'bc1pl2gkyfg8u8kxrpcvvjlx0xk7x2kta43cvpqd5zl4slfvk3qxjh8qq90svd',
        '2147483647': 'bc1ptlm944ewddlpdfstqfqcrd2cqrwmghugrg8wsk9pdakwrun5hmcq8njd7q',
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
        '0': 'DNbeqxpqCPfVxwGX6cAgX7m31n4RamX8zh',
        '10': 'DLruL4sNVTGzGTixB796ZG7Upbai9u3rWK',
        '2147483647': 'DDn5UsYeR269pSUMxK1ccuGgXoWpXyyGzw',
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
        '0': 'bitcoincash:qqphalgwy8c2nja30plluszanv2qmmzj8sxuxpl6jw',
        '10': 'bitcoincash:qpyx6qqwxythwd8swvre9a8d9jp6z453tsuyqsdgyq',
        '2147483647': 'bitcoincash:qzl3rhpwmnpjfpendsx3aa5432qv0u2mjqule8h957',
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
        '0': 'Le9R2uUi2wtQJDQwmRkNwTjUMBBrrnzcHy',
        '10': 'LVkUDSLorBxCepNbfRVYH6RYD5QXPn5nkS',
        '2147483647': 'LSu2QP5KiN3s4TM3QVtCLroJzFA97nJ1kv',
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
        '0': 'MUq481EcDVx6BzGRYB1RoPtHfitorZdExY',
        '10': 'M9UiXzbdTD98Ju2UqEtSy4H9iCNmEh7NZv',
        '2147483647': 'MFg55uVdJuhCogxv1GzM2u944KSAc7xN2R',
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
        '0': 'ltc1qsc5rx6fh4a45zz3e0twsulkp7s58g7y6y0jnq9',
        '10': 'ltc1qvhahvgx2d6sp4hzcnf78yg8jsczn4k0pfzdkk3',
        '2147483647': 'ltc1q2s5fwqsan5m9ewan27738nwy6su3s32a97ku7u',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aatxj7p4274trveb6bcjfu5u3n6c1p3b829sp4kvk6',
        '10': 'cfx:aarn7vz9by2xwu3ezw66vgjubjacxev3jj6t7tyuyf',
        '2147483647': 'cfx:aaj4p64x7vgcs22xnfryea1f9zuvs7v8s2px73x21x',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1ur74cpxk6x0pwn88xag95qrah6h0mvs080xrky',
        '10': 'cosmos1shxlmq9zgtk3llhj336nf6kfk5r3e0rhgtr03p',
        '2147483647': 'cosmos1el9j2p34n6vlrv4ezhcz5js9mxftyr5245gtta',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1ur74cpxk6x0pwn88xag95qrah6h0mvs025ty07',
        '10': 'akash1shxlmq9zgtk3llhj336nf6kfk5r3e0rh9swggm',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1ur74cpxk6x0pwn88xag95qrah6h0mvs0l5w624',
        '10': 'cro1shxlmq9zgtk3llhj336nf6kfk5r3e0rhsstkds',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1ur74cpxk6x0pwn88xag95qrah6h0mvs05j085n',
        '10': 'fetch1shxlmq9zgtk3llhj336nf6kfk5r3e0rhmk2tnk',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1ur74cpxk6x0pwn88xag95qrah6h0mvs0054nqk',
        '10': 'osmo1shxlmq9zgtk3llhj336nf6kfk5r3e0rhqssl8n',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1ur74cpxk6x0pwn88xag95qrah6h0mvs03a9c3c',
        '10': 'juno1shxlmq9zgtk3llhj336nf6kfk5r3e0rh7eq5ka',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1ur74cpxk6x0pwn88xag95qrah6h0mvs0ptur5y',
        '10': 'terra1shxlmq9zgtk3llhj336nf6kfk5r3e0rhw0e0np',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1ur74cpxk6x0pwn88xag95qrah6h0mvs092j2tc',
        '10': 'secret1shxlmq9zgtk3llhj336nf6kfk5r3e0rh2whxva',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1ur74cpxk6x0pwn88xag95qrah6h0mvs0k9hnvf',
        '10': 'celestia1shxlmq9zgtk3llhj336nf6kfk5r3e0rhepjltv',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x573461C4307e83896944eC69CF4389529D068D93',
        '10': '0x6e06251D66a6CFE4e14A0008486a8839Ca759c28',
        '2147483647': '0xcC15E44B2d25F1EcA5a02eCA3bfaffd43f6DB59E',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x9968ec0f6BB17EDdCc9fC2fDD8FaB1e7fC03f623',
        '2147483647': '0x3386D5bD51D7Dc8ee1eA4ce393fbb157C4eCc60D',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x9968ec0f6BB17EDdCc9fC2fDD8FaB1e7fC03f623',
        '2147483647': '0x30816CC2bAF40f98523c9191ECA9B35E3d9A698e',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1yfboy53ay7fegyjl3bdzg6yu6ozonhsot7zs3ha',
        '10': 'f1yyuxbrgqht2bmg6vt26echzvqdopkqze4lha33q',
        '2147483647': 'f1grw63vniwengemlctxmsfsoxsc65p2qhqz7i4la',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qrgcxrktrlu50dren50rqnlpzw0z58ukrsazmf826hxq794wgc5x7ul9qskv4',
        '10': 'kaspa:qzydksj8jakyyk68v0gkh26qycmy9dxv99e9gnrjvw4cgfwwvnrp7pz3zc3ys',
        '2147483647': 'kaspa:qrs33pk9lxqyk0qnqmpf6hr92333jm5ukrxc5j9zqvzjfdx53wvcz0yxtznm3',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '4bf980d957577ff45d7537b284bc8669ef034a6aae7304503886b856507868df',
        '10': 'c054ad6ffe015add5f68531a840b0ab458a0773b0424cb4df8b6d3528dce18ae',
        '2147483647': 'b2959c3c1cc6647d3ac4f41d4e2e39553b9d7ffd4359302e0ed72d1bbe2b611b',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NCMJ56AUPNK4DHYJOOGLXSPAG6QUOGWOG4PLJXJH',
        '10': 'NCHWKXWZWMP4GOZESHH34KZOIHMK7GCPHJO7SVPC',
        '2147483647': 'NDU45KE4GQCZU6S5HMO5XQQ4IOUZJYAZIOFYONXD',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g530ayu6nwet0njgmmgp4l7jd03xf8vt3pvnl0fze4',
        '10': 'nexa:nqtsq5g50hs36xk5h6pzwg69muhxvaewzyh3nsys5xk4hndh',
        '2147483647': 'nexa:nqtsq5g5qnwn40p39hsk37vf3q0p6feffhp5sp243m364rzq',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '1zxDKrQHVwoMrKzC7eLrvBwhxSsgfsiHoEhup1LVirC1fZw',
        '10': '14c4jLvtMy1E1GjpfA2wVsKVYHV9eD21GZMDs58EnqUXcWtM',
        '2147483647': '14iVYehkTHu83J1zWDmuhHwfqV2atXWxDzmgC4jM1PWdz9JG',
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
        '0': 'WwFWHZRCxKS99MJin3TkRX4wPALxb2KEW1MzEDqozpdR6X7',
        '2147483647': 'ZenqcQmNkGkpb3K2tB2aoGo4uk4ASfZAhYLGUwrKfV5PvEx',
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
        '0': 'DaGjJwD45hFfy8v1BQPciinzvjTo38kfgLy9BHwRS3Aa5aJ',
        '2147483647': 'GHp4dnZDseaMQpvKHXxT6UX8TKAztmzbsswRS1ww6hcYnfH',
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
        '0': 'j4SKZe2qJJSBMkvmDWT32Zv4nNiXoVFtjwF8f854JNhyJUgWy',
        '2147483647': 'j4V36yMgeUE8gSNTDpZAbQHpWWF7Wh7XysSfdQKnJtNdkTMhZ',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rMQsKUP9xz3xGJGs4fynnURqW38ba8J4pg',
        '2147483647': 'rLxhs9Xjk9GzSZELHF2UvdrVCPGzLWZTP1',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'FSDCL9XcNN1YXFnwmTSt1N2HRefETePVHXhQTAJH6Wyo',
        '10': 'Hsn9UoR4EQ8e5Htmcb83VVz8aqkXzGrMu1YWJsufTKQ2',
        '2147483647': 'E8Lfh64r5AY33Q7BVKvFE5ELSr8m5KnQC5g2EW6xGMr2',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x026d4c7c9e4204821b39001ef6126c12',
        '10': '0x5be3e01813b7dae807c8812efa31eb9c',
        '2147483647': '0x0d774a840b4617734298c0bd57e46277',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GCGZB5OO6CADJ66UH337CJQMU2AWJ7UHQBGO3UMI2YMQMG7H56G5XU72',
        '10': 'GDU3E67N4OWZ7E55YMKATWWMU6XH42U5HFX3QHCM2FNHOHKRJIQ5Y5QW',
        '2147483647': 'GD4E2FGX7KY3KZ2BTBALPUIUPC7N6VUIXBY2VV2LSS2HQU2S4FK23KLB',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x8855ed0e14b98d09668fe43012fd180fa598452ed9fea6174b15ef25e007af73',
        '10': '0x2a300a7bd1ee51bdae03e9fc9240afc255ca4fc215e6ea0878968bac7657e9ef',
        '2147483647': '0xdbcd51475aedc4150b43053ee201c7be9bee16e47d2d95d669e61889a7d23404',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TNg97CAHbLsFLWL82Pf5korUJdZnjfmSsA',
        '10': 'TA6Sd7JCzmqu6rS3UKaxbg8iVEq9sziJ2b',
        '2147483647': 'TEPPVPzcQJQEXgxt2Lnv9fXyXb8JXQUeYh',
      },
    },
  ],
} as AddressTestCaseData;
