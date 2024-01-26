import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'three-passphrase24-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428736557',
  passphrase: '',
  passphraseState: 'mv8SRcYZ8vcfWnx1KjtHeEYpiuXweaHm9y',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qy2ek3t3fwug4pjnz9y5w0p4hcghwwyv56z556kh94ymzckl0qsm8jqyuuuy9cztkrdsqducf45q4cff5lz80mxh84xqe7dnu5',
        '50': 'addr1q8v2zna5k65x2psgnq0kzqdsdt0yvcelsrvg00hveng84lv283k7cp0tmm0uefqmj4cftvz8w4mmk3pfxax9sakcn0usuxtcwq',
        '2147483647':
          'addr1qxdmx2jz5fnkhhxtct6s9vmydpwpyvjng7ee79z9fxdvtgpcmhfgreemqtrvdduxchawzw7wm5prc6wv39tkx7x3d2ssqg3pmc',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'SIMDNNP4RRYYUSX5C6YGDCKJCENFMRYT4AG7B573YWVY2INSXYCOSBTSOY',
        '50': 'MBBFR6GVYQCBLPGLB7GCQ5AZEGEEZGDU23J3W6SZZTGGOSSGFZYRBWLGR4',
        '2147483647': 'SNAO7EINTOZ36RIXAPWH6A2L5HIIAWE4GKKOUQB5ZAJEZUYAVBFER6NWRM',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xd08a0eb4a2d0b05aa54964ec079550757518bd1830cfbcd36cee23cb46dc9912',
        '50': '0x7a16847d00ea048d0132e9c90b40e6a851850a83500cce7518b476c7d62d6273',
        '2147483647': '0x862763488e9358a417b08a530ba02c0b6c1d0531a0bdb68f21d4c49f98377751',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1UDNS8rLn8AoeGk8fGn994DLbeDpoyQbT',
        '50': '1LNkYasSVCb25iskMBkFpAuzhw7Baz5vqu',
        '2147483647': '1GuKMy9wuqdoxR9LeEC4s1aaDUSk5TQDde',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3BzST7Grp5waBxh6h4XU9dwsXGbN6KEi7Q',
        '50': '3HafPaVKUZHxWSoKMFH1DecfW8kcZMKeKN',
        '2147483647': '33ZCEpM5hERjcBNbjh5mZubow1jD4CiUHd',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qmy2ea9p4ty8n95pfw0u72xm4qvg0xhmzn0hzts',
        '50': 'bc1qvdjkcmccm0lahadkajy3y7wfv00yh68nq257cm',
        '2147483647': 'bc1qps5zuykc40x0aqwhzeg5ckw2avrnn09pty8r2e',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pg5qz70zeutk26rvskkvf7837dr4xmcj3m99jlwp8y59qy4ppkxvs9n33zs',
        '50': 'bc1paeg8fjw4s83hvkwads0q2l5advlfk99pnp9kdhhz4jslm0dgkr5qdxwq02',
        '2147483647': 'bc1ptcw99c79dfcl2ep2xq5an93auw8qnksktnl8g4wx7wg2x25ksjdqpc5z4d',
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
        '0': 'D8G3U5n1asHESj1ZtbZLVcwozZ5EWt6t42',
        '50': 'DTLmyBxBrf8745yJNibbMtTuekZFuAdJMq',
        '2147483647': 'DLPGLmLQSKdmnU2cWXBF2PaEX66Zmf9tbP',
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
        '0': 'bitcoincash:qq8vrk53s7nwxuyue8pl83ceem3t68g3esmq8khy0n',
        '50': 'bitcoincash:qp6u65mkeuljqcnvk2uyphp3dtqkpmqjcy6am4nnfg',
        '2147483647': 'bitcoincash:qzgfqpuz3kaav5qcstj3jy9tk9j4alw4cyjsjdctp9',
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
        '0': 'LccoYVwi7fh1bnme2YkksWRLK7stNmGn9P',
        '50': 'LRh4dWCNvU9RMiANM4EV7nXmref6JjkHSK',
        '2147483647': 'LLpUKeZQYDsvZYmTjyWsRD49iW7b7JALcM',
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
        '0': 'MUHBMvscGLyjL3ATtL9vEkH7Ls5Ygcrtak',
        '50': 'MGNs1y8SUFXmDP4Q7g2BqVoirPKEFPnomu',
        '2147483647': 'M84LzespviqjVzfJtWDkneZzMQhSNoBRf7',
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
        '0': 'ltc1qr0dws66h4k08fs2atk8mkh40gvj54uzuy0fv22',
        '50': 'ltc1qz9xe3s4te4papnw3tm6eq9npflwc4yzngr8zvq',
        '2147483647': 'ltc1qrdrmenlj6fhj666zc7x7ugzuzvnmt4cenhra4a',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aaj4k46d3cf588tb4f31bzhb9vkt73jfajwye99w9b',
        '50': 'cfx:aapg8y7h27tzgnrutrpd335735fat3up42tnuuwke7',
        '2147483647': 'cfx:aak85hxac1nsjfdse4d8k3m1yej074fv2aam99yg6r',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos19yj63dhxzntvvnq0l2qt7utvp4d34f6hlt3mu6',
        '50': 'cosmos1qf4krq0e90g3zf4s8ggwupenlfdj7jumd6d3h3',
        '2147483647': 'cosmos146hjsu5n9evtm4jwk4eh5ya50h77jsn9606gum',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash19yj63dhxzntvvnq0l2qt7utvp4d34f6hjsuu9q',
        '50': 'akash1qf4krq0e90g3zf4s8ggwupenlfdj7jumqpqkwt',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro19yj63dhxzntvvnq0l2qt7utvp4d34f6h8sezqt',
        '50': 'cro1qf4krq0e90g3zf4s8ggwupenlfdj7jum4p9gtq',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch19yj63dhxzntvvnq0l2qt7utvp4d34f6hvkcl7d',
        '50': 'fetch1qf4krq0e90g3zf4s8ggwupenlfdj7jum78y44x',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo19yj63dhxzntvvnq0l2qt7utvp4d34f6hhszt2g',
        '50': 'osmo1qf4krq0e90g3zf4s8ggwupenlfdj7jum9p7ppr',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno19yj63dhxzntvvnq0l2qt7utvp4d34f6hfejqmx',
        '50': 'juno1qf4krq0e90g3zf4s8ggwupenlfdj7jummgw2sd',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra19yj63dhxzntvvnq0l2qt7utvp4d34f6he0tm76',
        '50': 'terra1qf4krq0e90g3zf4s8ggwupenlfdj7jumt7h343',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret19yj63dhxzntvvnq0l2qt7utvp4d34f6haw9jpx',
        '50': 'secret1qf4krq0e90g3zf4s8ggwupenlfdj7jum0lec2d',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia19yj63dhxzntvvnq0l2qt7utvp4d34f6hwpqtxh',
        '50': 'celestia1qf4krq0e90g3zf4s8ggwupenlfdj7jumusupdu',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x545c335A5F07aaeD1D7976bb4377a055C72f451f',
        '50': '0xeDEABcFb60354cA6F3da0e905524E3d58A296EF1',
        '2147483647': '0xd667d3A2815Cd51a014517393Ff9C2Aa80e5949a',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x7584AbDa4569eA240606aC262e17F521a9675e5f',
        '2147483647': '0xDeEa54afAB170418eC071A8364E020A3bd01d710',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x7584AbDa4569eA240606aC262e17F521a9675e5f',
        '2147483647': '0xD636aD70A69560AB7aefdE23ea6Ee1fd57dE7868',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1t2xmuw2do6l4s6jsxeyygrxbb6r4zmb4z5kn4nq',
        '50': 'f1df266sno7o7db4gwumspynrxcpqjjilynglv3dq',
        '2147483647': 'f14ybmr7j4ugmctcgw6pikz7zg76grgfvryurxaiq',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qzpgdu8pefv2n40c6dryzyf3kcnw5yy0xae5ffgsvhfq0uqunrw4723820al8',
        '50': 'kaspa:qpr2trggznn0ga2vjyzvcmandcymdvh5q2znevmerlfc8df3epjnch9u0dxme',
        '2147483647': 'kaspa:qpm2hk9pxgurh6gv9r8fg3kc3vjzyxy3fxdrmmphn48eux8kf83jgcl8ddtmc',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'ae0bc6eff889db44742575a2bd1878c4e959202283c1aca14042e21398439dec',
        '50': 'f1a4e4c756be1db9f0ba5325a5529d6281f844ce1e23c34c6ea92e624483e685',
        '2147483647': 'c685fd37acaeae73ccd652075b754e0a8189b106715e7f1bb60d6efc69c5de85',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NB6DIUS24WDKFY5JQCI5IPUDMGDQWVKL6TNA7OEK',
        '50': 'NAEZ764E6FXYT6AOH4CMQ5WKP5Y2YM2LENRIPEFO',
        '2147483647': 'NDLRTEAJTWDSXYZ5OZ5GQGC7L5UWHKRP5C4YU4LB',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5z6ud08th9uv296kc07t04gezy3k64svvr5hrh8g8',
        '50': 'nexa:nqtsq5g59rknae668xx73y4uzyya647warhrqsjynl486evp',
        '2147483647': 'nexa:nqtsq5g5wyayyv40e8s69vtq8huzg4vhnw2n5qzlju34vl5y',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '13YeNfSEG39vU2v9t91zu5GoBDNe16sgCvTNoSQVbY117DWb',
        '50': '12SH7CUB1gkikfMdYnf1R1Jv8TufnT16YogaGXmXwcLZsziP',
        '2147483647': '1vFg9WJjq6EwD9Yd7R831XdxULk8hZYYGQmxPHoU3yP4MrM',
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
        '0': 'YUwfd9FBVXZFKwUQoR7nabvQe67H22H9dE2srczuoySWoZn',
        '2147483647': 'WrYy7DKfHTsiWAs9mpEvWrmBu4DQci9UyBS2oWJnKwpTp7Y',
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
        '0': 'F7xteX32cuNn9j5hCn3esoeUBfE7U8iaoZe2oh6XFByfsUN',
        '2147483647': 'DVaC8b7WQqhFKxUSBBAnp4VFSdLF4pav9X3BkaQPmAMd31R',
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
        '0': 'j4TsFoNR8GyPUs7MPCUQgc59dqyTZogthrNML1hTTUX87a1sP',
        '2147483647': 'j4SEs6rVCkmKoLHamwSook1QUdERfwHaaBiJjAeLmM36VXLCH',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'r34cePgFyg8CBfHj5inkZT163qrU2diTk8',
        '2147483647': 'rM9NEQCT1CsitAEMPcNa4e3d6T2QZhGXa1',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '6iztJV2dCKzoUcHn5UrxLD6CUER3JmXZj439kNENK7q4',
        '50': '5QDq8Gaw45coB8ZN7cvFm4UhZceH9FfEwwxD9HBtgvCv',
        '2147483647': '7r1NwW5LVuqgkE9MA7J5UEQTcxBRWSjpUJ32hYqf5ckH',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x3c6b782eafaaa580b2f2ec381ef3ba0d',
        '50': '0x38239e6a7f07ba23b6671cdc321722d7',
        '2147483647': '0xc68cdb027de38238559d51cfe2fffef7',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GAURMELFM3ESO7QULKDQB6NNJ4I7Q6SNMHJHTF2BUPHX7WHR243JVQS7',
        '50': 'GDFVQL7FVEEZRU7ZQD6LW2N7SU2HHSM7VYEQEPKCR76ZYBQ7HWXCUORS',
        '2147483647': 'GALAHP6IU4GMARUYCDU3ARVXZUHYEXSYHCSCIKJVAPBB57VHMPROPV7M',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x0e098183d6741b1b97234fd0b560c508b124dcc6edc02e11eec7dec72b30a453',
        '50': '0xc4ee23bc264d4ec246346ff61784fcd3c9534056ee0634980e1398e3c8135834',
        '2147483647': '0x18a51d0fa595c745a82658eeb8e50028ae979b4a89877c73848e3d6595539f20',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TC3jzPssaieN1kD7AffyWK4aQQFkSKaEYC',
        '50': 'TMHukjFw3qXJycytzXjiiXmogSnV7izU8T',
        '2147483647': 'TFdzHfhH8iFpVn3AoLT9RS87wvCbjCqz5W',
      },
    },
  ],
} as AddressTestCaseData;
