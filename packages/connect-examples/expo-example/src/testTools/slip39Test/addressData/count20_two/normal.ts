import type { SLIP39TestCaseData } from '../../types';

export const count20TwoNormal: SLIP39TestCaseData = {
  id: 'count20_two_normal',
  name: 'count20_two_normal',
  description: '2-of-3 (20 words each) + normal',
  shares: [
    'network vexed academic acid alive forbid database equation average advocate golden careful exhaust dance texture satisfy lair negative earth flash',
    'network vexed academic agency calcium memory elegant merchant welcome oral evidence bulb union company suitable spend loud miracle story withdraw',
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
        "m/44'/0'/0'/0/0": '14X9zG8nvzgxugBzqBt9f13vDtCFLdbTMm',
        "m/44'/0'/1'/0/0": '12P7d2ciP514Lo6kztqKJ2YCTxXwirVdsk',
        "m/44'/0'/21234567'/0/0": '1Kqsi3vTDjp18rCZUb2F595uNUFuXWkDua',
        "m/44'/0'/2147483646'/0/0": '1BrJcPCCgoYWtoGHFVhkLqyz5fdiJSrrt6',
        "m/44'/0'/2147483647'/0/0": '1MfgbYLv2w794NQGsc45s28TdnmFDsVc7s',
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
        "m/49'/0'/0'/0/0": '3CWC8JjzC1SLtVf43XCHRTBJPwK65v3dqN',
        "m/49'/0'/1'/0/0": '32qATyAA18EDSEPUCMxvUkbU87kdW9bYWu',
        "m/49'/0'/21234567'/0/0": '3NLMhxZqV5tdgroBFWny9XfszQqJ6PbCxx',
        "m/49'/0'/2147483646'/0/0": '3HeVxgJ3uPEwSowUBQXQHCLggubUW8Mq9B',
        "m/49'/0'/2147483647'/0/0": '3DLXSNXXSq1HpGqNbZNm9wADs3z61m9KCt',
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
        "m/84'/0'/0'/0/0": 'bc1q2duevw8dps5p9yf8hmuxaace9xlzz9qk7tcw9e',
        "m/84'/0'/1'/0/0": 'bc1q06g2spsrdze5eaaf366f6vyf7r77ykcgfvj4wk',
        "m/84'/0'/21234567'/0/0": 'bc1q2wa74l33nsm2eqtaa4jcq258zss07wjmh5qefx',
        "m/84'/0'/2147483646'/0/0": 'bc1qqt4dcu0k3uysrtkevhk6mha59eumcxjygwxu2r',
        "m/84'/0'/2147483647'/0/0": 'bc1qtyxxntc9hxzsvxzx72xguds840vxvyp0m0wta9',
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
        "m/86'/0'/0'/0/0": 'bc1pxc8x020txshxjnklnq33ftsjzcflp3d508ceyluk5tysw6jqsszq8g7hxl',
        "m/86'/0'/1'/0/0": 'bc1pxy83s4xtt8006x5ptg669av6xs9fs9ac63zkurqr3hsrmcdlm53q44nqc0',
        "m/86'/0'/21234567'/0/0": 'bc1pl0mcccmtrg8rhpggyel4zw4cjsgvnpxudlksavfsflmzrg33autsrdfk8c',
        "m/86'/0'/2147483646'/0/0":
          'bc1pkqlssuvf44u3r83q93746nrf6slw4sksx2r722743xvj72jstghsc3nh4m',
        "m/86'/0'/2147483647'/0/0":
          'bc1ps34hegykjqmr7gypd2u0tqwa8p76fns6veprjnrwlveq6rv45ehsvr9nt8',
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
        "m/44'/3'/0'/0/0": 'DTKToV4b3qzL6Dtm2K9pj2e31V9gXgF6u1',
        "m/44'/3'/1'/0/0": 'DKWBgWPtLpfqtS9Eu3fZXaN8FfxbYFinbX',
        "m/44'/3'/21234567'/0/0": 'DD3pAtDEwLtNkVtqCoMAEJrUUzL8StnTcp',
        "m/44'/3'/2147483646'/0/0": 'DHnkyVdUKCg9PoZsip3Ua9tZC8K2B9JHkf',
        "m/44'/3'/2147483647'/0/0": 'D7vBb9X9Q4qbMMLDVQ9Rw2XLQdDGiG5BVA',
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
        "m/44'/145'/0'/0/0": 'bitcoincash:qqceuerman7hwyptcmftm94cffu5682qwg40mfw43f',
        "m/44'/145'/1'/0/0": 'bitcoincash:qz9n8n0k76y2apgucu9cw22n0ag87ax89c6ag3mttx',
        "m/44'/145'/21234567'/0/0": 'bitcoincash:qrt59hpdq57904qksydgvu8dvmx9gafkjyych05c5h',
        "m/44'/145'/2147483646'/0/0": 'bitcoincash:qq3psxz0jzmf42h7h579rk8m52x5smhpqv8y3t4awu',
        "m/44'/145'/2147483647'/0/0": 'bitcoincash:qqj5w8ekkdvl8334lt3cp05t7gme67cmuu2dpwweu4',
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
        "m/44'/2'/0'/0/0": 'LZUPvah5jvmQFUhAFZbHxtbwuFFxhBXe6L',
        "m/44'/2'/1'/0/0": 'LdPABFmLEgp7deqjcQ1aeTuyhuQC3y9xRj',
        "m/44'/2'/21234567'/0/0": 'LU6DfZDmXmeRLr7AghNLEKeHTjMR2jqmbB',
        "m/44'/2'/2147483646'/0/0": 'LfvKFgPqEGfMWFzkExDe62eaZKhBqwzNw7',
        "m/44'/2'/2147483647'/0/0": 'LgXr25WGDtxsDYHTwhyBqtHYrDm61coDiQ',
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
        "m/49'/2'/0'/0/0": 'MLKkY33LYWJk1py1efvPWqPJqhHDhGygVQ',
        "m/49'/2'/1'/0/0": 'MQKyT6bUga1PkZCKkxd4kPhkWmoa1Q4KqQ',
        "m/49'/2'/21234567'/0/0": 'MHxAr6WPxFX9he5bLHZpY2mKfKgmbgp34M',
        "m/49'/2'/2147483646'/0/0": 'MBmLQ6Gv2zYhQqcUtduzPN7fbKK1p1GQeX',
        "m/49'/2'/2147483647'/0/0": 'MXEA9EQ8PDMFYaLakfMn52xJyFFFHqh5UB',
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
        "m/84'/2'/0'/0/0": 'ltc1q9g356d0h5ty0cxz6qe0men3s0xwqfcrvxwc66d',
        "m/84'/2'/1'/0/0": 'ltc1qtqzcyvn760ylv69nclvdcq0wwvta2qkm33waph',
        "m/84'/2'/21234567'/0/0": 'ltc1q8kut4cx5x8aedvw05f8kq5g89u5z3hjmg4q66t',
        "m/84'/2'/2147483646'/0/0": 'ltc1qq4eh5jpkhmmlkg5rda0kulm2k87mvxrx69kz7e',
        "m/84'/2'/2147483647'/0/0": 'ltc1qwy90trh2jmm2uc4cmrzx7fs5gr5fpde5rqyqch',
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
        "m/44'/1900'/0'/0/0": 'NZvn7YxfMUTMZvacd6XLs2EBdJiQGTjf1m',
        "m/44'/1900'/1'/0/0": 'Ne5fCeQzwscnn18tP22BDLhrNmtVMV3fo6',
        "m/44'/1900'/21234567'/0/0": 'NNVGDPvqyCCPcUE6vHEL1yQeVCWfQ2YLFe',
        "m/44'/1900'/2147483646'/0/0": 'Niqi9MLo4ogHZGSHZpuhELrV4HHk48skdJ',
        "m/44'/1900'/2147483647'/0/0": 'NdstUwksNiDmAhfD5rmGTnjXv2gX956MkA',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/60'/0'/0/0": '0x10B9B06FE61d9D5Dd78A1352FC277420cC8e38cC',
        "m/44'/60'/1'/0/0": '0x434bE59Fcdf79BfDfA882C56A53dD8800ad83C97',
        "m/44'/60'/21234567'/0/0": '0x3544DeA84245194484ed4dEAB096dCB22A5977F5',
        "m/44'/60'/2147483646'/0/0": '0xA1a56f752870A1f459a2664265EC311F59961004',
        "m/44'/60'/2147483647'/0/0": '0x5aFAD49F56cF63FBA76999699A401cd0C532a90D',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum Classic',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/61'/0'/0/0": '0x712fd85377c6bdD1A42ed4406948E3c9f15d285d',
        "m/44'/61'/1'/0/0": '0x7E65F236b88793fe513607d28E7307CCeE05D2c4',
        "m/44'/61'/21234567'/0/0": '0x919A8f38D260A05c3E4898902116e5ED7a01B835',
        "m/44'/61'/2147483646'/0/0": '0x8b0F5fBedBf93b76335a6038384437E40f562F6a',
        "m/44'/61'/2147483647'/0/0": '0xa47E9C23EA071F9523c4fc2125b719D61d3E46Ef',
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
        "m/44'/118'/0'/0/0": 'cosmos1npt5apg6v4eh7nk4hu7442dkzkm7uk03p6nczd',
        "m/44'/118'/1'/0/0": 'cosmos1m5kztl9hxr7fqvdltsdkas3jgs5s7a2etp82lx',
        "m/44'/118'/21234567'/0/0": 'cosmos1uez8x4sgpeqe45e90e4kkhc29dcltd4spayy7t',
        "m/44'/118'/2147483646'/0/0": 'cosmos19e7z0kafw7wjtmdzw9hzeltgh9vr3mt3elmdcf',
        "m/44'/118'/2147483647'/0/0": 'cosmos1dk5l3aelqpq09mhxtpwk6wraptken7kqfx7cqn',
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
        "m/44'/118'/0'/0/0": 'akash1npt5apg6v4eh7nk4hu7442dkzkm7uk03vp7lmh',
        "m/44'/118'/1'/0/0": 'akash1m5kztl9hxr7fqvdltsdkas3jgs5s7a2ex62dxu',
        "m/44'/118'/21234567'/0/0": 'akash1uez8x4sgpeqe45e90e4kkhc29dcltd4svxfr83',
        "m/44'/118'/2147483646'/0/0": 'akash19e7z0kafw7wjtmdzw9hzeltgh9vr3mt35yk2pn',
        "m/44'/118'/2147483647'/0/0": 'akash1dk5l3aelqpq09mhxtpwk6wraptken7kqyanlef',
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
        "m/44'/118'/0'/0/0": 'cro1npt5apg6v4eh7nk4hu7442dkzkm7uk03epmp7u',
        "m/44'/118'/1'/0/0": 'cro1m5kztl9hxr7fqvdltsdkas3jgs5s7a2en60nrh',
        "m/44'/118'/21234567'/0/0": 'cro1uez8x4sgpeqe45e90e4kkhc29dcltd4sexvaz6',
        "m/44'/118'/2147483646'/0/0": 'cro19e7z0kafw7wjtmdzw9hzeltgh9vr3mt3pyn5yc',
        "m/44'/118'/2147483647'/0/0": 'cro1dk5l3aelqpq09mhxtpwk6wraptken7kq3akpuz',
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
        "m/44'/118'/0'/0/0": 'fetch1npt5apg6v4eh7nk4hu7442dkzkm7uk03j86uq6',
        "m/44'/118'/1'/0/0": 'fetch1m5kztl9hxr7fqvdltsdkas3jgs5s7a2ecuwwa3',
        "m/44'/118'/21234567'/0/0": 'fetch1uez8x4sgpeqe45e90e4kkhc29dcltd4sjqdquu',
        "m/44'/118'/2147483646'/0/0": 'fetch19e7z0kafw7wjtmdzw9hzeltgh9vr3mt32zjf67',
        "m/44'/118'/2147483647'/0/0": 'fetch1dk5l3aelqpq09mhxtpwk6wraptken7kq6mhuzy',
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
        "m/44'/118'/0'/0/0": 'osmo1npt5apg6v4eh7nk4hu7442dkzkm7uk03fpqg5l',
        "m/44'/118'/1'/0/0": 'osmo1m5kztl9hxr7fqvdltsdkas3jgs5s7a2er656f5',
        "m/44'/118'/21234567'/0/0": 'osmo1uez8x4sgpeqe45e90e4kkhc29dcltd4sfxh5ge',
        "m/44'/118'/2147483646'/0/0": 'osmo19e7z0kafw7wjtmdzw9hzeltgh9vr3mt33ygawm',
        "m/44'/118'/2147483647'/0/0": 'osmo1dk5l3aelqpq09mhxtpwk6wraptken7kqpadgkp',
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
        "m/44'/118'/0'/0/0": 'juno1npt5apg6v4eh7nk4hu7442dkzkm7uk03hgsr93',
        "m/44'/118'/1'/0/0": 'juno1m5kztl9hxr7fqvdltsdkas3jgs5s7a2eany3c6',
        "m/44'/118'/21234567'/0/0": 'juno1uez8x4sgpeqe45e90e4kkhc29dcltd4sh08leh',
        "m/44'/118'/2147483646'/0/0": 'juno19e7z0kafw7wjtmdzw9hzeltgh9vr3mt30dckl4',
        "m/44'/118'/2147483647'/0/0": 'juno1dk5l3aelqpq09mhxtpwk6wraptken7kql5ar80',
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
        "m/44'/118'/0'/0/0": 'terra1npt5apg6v4eh7nk4hu7442dkzkm7uk0387fcqd',
        "m/44'/118'/1'/0/0": 'terra1m5kztl9hxr7fqvdltsdkas3jgs5s7a2ed9a2ax',
        "m/44'/118'/21234567'/0/0": 'terra1uez8x4sgpeqe45e90e4kkhc29dcltd4s8e7yut',
        "m/44'/118'/2147483646'/0/0": 'terra19e7z0kafw7wjtmdzw9hzeltgh9vr3mt3lmpd6f',
        "m/44'/118'/2147483647'/0/0": 'terra1dk5l3aelqpq09mhxtpwk6wraptken7kq0zyczn',
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
        "m/44'/118'/0'/0/0": 'secret1npt5apg6v4eh7nk4hu7442dkzkm7uk03rl83l3',
        "m/44'/118'/1'/0/0": 'secret1m5kztl9hxr7fqvdltsdkas3jgs5s7a2efynrz6',
        "m/44'/118'/21234567'/0/0": 'secret1uez8x4sgpeqe45e90e4kkhc29dcltd4srcsdrh',
        "m/44'/118'/2147483646'/0/0": 'secret19e7z0kafw7wjtmdzw9hzeltgh9vr3mt3m60y94',
        "m/44'/118'/2147483647'/0/0": 'secret1dk5l3aelqpq09mhxtpwk6wraptken7kqtr23a0',
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
        "m/44'/118'/0'/0/0": 'celestia1npt5apg6v4eh7nk4hu7442dkzkm7uk03sszgcq',
        "m/44'/118'/1'/0/0": 'celestia1m5kztl9hxr7fqvdltsdkas3jgs5s7a2e6tk69t',
        "m/44'/118'/21234567'/0/0": 'celestia1uez8x4sgpeqe45e90e4kkhc29dcltd4ssh45yx',
        "m/44'/118'/2147483646'/0/0": 'celestia19e7z0kafw7wjtmdzw9hzeltgh9vr3mt3g42azy',
        "m/44'/118'/2147483647'/0/0": 'celestia1dk5l3aelqpq09mhxtpwk6wraptken7kqcv0g67',
      },
    },
    {
      method: 'suiGetAddress',
      name: 'suiGetAddress',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/784'/0'/0'/0'": '0x84088f78448db43e9d2d25461baca28a7506895d1fb092d0f60774c6ec8c7752',
        "m/44'/784'/1'/0'/0'": '0xf31fc42ec03a5eacc21b74646d1198b09734583cda1282ffea1ea4e395e736b7',
        "m/44'/784'/21234567'/0'/0'":
          '0x6165572f86e6b8bada59e6292ea15a55f637e4196d8ad3f11ef664e0a2b41457',
        "m/44'/784'/2147483646'/0'/0'":
          '0x5c3c6b049f825cc5f87a3ad629170729a97b40a411c3c9c1a85a23ab74b4e922',
        "m/44'/784'/2147483647'/0'/0'":
          '0xb7f62b10f0860712e73057d5e14565e578cc5e1db0c35d27eea7c5a9ee0aa523',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rHtsE9gBKmWnASdFDqQBS9jZJVGcuf7aVY',
        "m/44'/144'/1'/0/0": 'rEceVh1Qj8RsxEMQAvgnfNZSN3fZ36jB2n',
        "m/44'/144'/21234567'/0/0": 'rs2smrDiihRdmec7AZZVdcstp6BVwN3eC8',
        "m/44'/144'/2147483646'/0/0": 'rfvyED8aHvaJdrXphMCJAWhe1wFEwJ9i9n',
        "m/44'/144'/2147483647'/0/0": 'rMhA2TFmoWk2jM4syPTSzuC96EUbpKppeF',
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
          'BFCfc2e5f8b1ed2c10a1d88d9c1c4a481343c4259176e0664fad2606c31f092c2dcc338',
        "m/44'/728'/1'/0'/0'":
          'BFC60dd603652e29cd4b78c12acc7f18f20d1ab1005c8cd5c661f2ef5ed10b38156a13a',
        "m/44'/728'/21234567'/0'/0'":
          'BFC1c60e9eecad319d1ef5dea9e91bf7aae09f8338af93f972ad80e5996e76c3f1b6c41',
        "m/44'/728'/2147483646'/0'/0'":
          'BFC574e4390373f59710cfa273d4af6027ef7e529158668941ad179dd1c988fb68241e8',
        "m/44'/728'/2147483647'/0'/0'":
          'BFCa06fb5bb90ad02d6264a242101eba1bc509a8a40c0e4841139cc1ad6c2b279a48c2e',
      },
    },
    {
      method: 'alephiumGetAddress',
      name: 'alephiumGetAddress',
      params: {
        path: "m/44'/1234'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/1234'/0'/0/0": '19j34SyArz3vn6gsTe7SKB7jgmiNEDzixex7i3Py25heb',
        "m/44'/1234'/1'/0/0": '15QyaNAK6kKudLUTZdtTfStghahBknJkz5cDpXJppDfKu',
        "m/44'/1234'/21234567'/0/0": '15bSeJvHWaggpTSqMhbtNDDESJMcswVGHg4UGnAjzsLJ1',
        "m/44'/1234'/2147483646'/0/0": '15vUYAToEiWPDoRtBqXRJCPyLRgWQC8iCtK2gbbeyEZUc',
        "m/44'/1234'/2147483647'/0/0": '18Faz6rN3f4iozk5W9zQVCiTgEHoLx7G7rhPwjnmSyqRa',
      },
    },
    {
      method: 'algoGetAddress',
      name: 'algoGetAddress',
      params: {
        path: "m/44'/283'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/283'/0'/0'/0'": 'PUNO62CHY36TT77F3GUOG2SPS4AQQXCVQDCGWW2TMMM4WZ5C32N4YQEXAM',
        "m/44'/283'/1'/0'/0'": 'NR3O5ZO7YZK62GNF3BXY47VWWZORCJUPZRZ7F5CVMCNX6EMOSOUXS5VFFQ',
        "m/44'/283'/21234567'/0'/0'": 'IMXOAXZZDJOGEOYPUZJYAMT74CSLAZMVOILAPO2B67KAEVLSD3DQXA2SCA',
        "m/44'/283'/2147483646'/0'/0'":
          'ANE2DGOPKYAFBTL6J2CZOSNZ5OYOJYHW7IJNNTVAYIR2NKXXJBXKUWYIXU',
        "m/44'/283'/2147483647'/0'/0'":
          'IMXMBHROZDKQ623DUAEXMEHASCCPWNFJXN2JQWKLZE4OEZVOSWUFOTSY4E',
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
        "m/44'/607'/0'": 'UQCgCbdfEC9Gmpvso-Y_fp7WLlzW0_hAFkBWacUXgjo091V8',
        "m/44'/607'/1'": 'UQDiJuwTMx7uJcbMr3ZYKwtpvpFzOjxIPlkpOc3r1VSPSUUM',
        "m/44'/607'/21234567'": 'UQC4yFdjKqnOlxvqKZ8CHyT4loN7d8_40FA0p2KgEHHOgXku',
        "m/44'/607'/2147483646'": 'UQD-KF6TuvGA4IBdzwFsl5nATcwZiNMWyhZCua2LH2H2_OZE',
        "m/44'/607'/2147483647'": 'UQAR6dfIzYVDecTg1ViUWJYHfkM1qcFv9b8-4Xwybw1-ii3F',
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
        "m/44'/309'/0'/0/0": 'ckb1qyqdunhneuelg7s3nt9zkvpux5703w5mulaq3hsegj',
        "m/44'/309'/1'/0/0": 'ckb1qyqzkh9jj3sm3daxvqe8d0sm778q99zrpnnq4mpqqf',
        "m/44'/309'/21234567'/0/0": 'ckb1qyqv3lm65h8mftma6r7z6gjt6qf3r0xgkhesadsam6',
        "m/44'/309'/2147483646'/0/0": 'ckb1qyqvw7w2tavmal8l4gqlak8da0pczx4x4zesj02nh2',
        "m/44'/309'/2147483647'/0/0": 'ckb1qyqgw3dgglla5k7aca6jhvpmkpthux2nez6su095pr',
      },
    },
    {
      method: 'nexaGetAddress',
      name: 'nexaGetAddress',
      params: {
        path: "m/44'/29223'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/29223'/0'/0/0": 'nexa:nqtsq5g5s8lzs8lhjsw84c42l5snquxm5hpny8q9dstnp3s9',
        "m/44'/29223'/1'/0/0": 'nexa:nqtsq5g5fequq668s850hlntkmwwhxz46ktpt725g2hqtu9r',
        "m/44'/29223'/21234567'/0/0": 'nexa:nqtsq5g5653ua95lv5ldj0gpjnvwhpc0d2l9hvxdexz8suyj',
        "m/44'/29223'/2147483646'/0/0": 'nexa:nqtsq5g5g5xpsm6gr923h4wsz5ha36575w565gvsxw7y9w67',
        "m/44'/29223'/2147483647'/0/0": 'nexa:nqtsq5g57zxf75dy2eduh746j8ncrupdh4cu9ykjdssvh8x9',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rHtsE9gBKmWnASdFDqQBS9jZJVGcuf7aVY',
        "m/44'/144'/1'/0/0": 'rEceVh1Qj8RsxEMQAvgnfNZSN3fZ36jB2n',
        "m/44'/144'/21234567'/0/0": 'rs2smrDiihRdmec7AZZVdcstp6BVwN3eC8',
        "m/44'/144'/2147483646'/0/0": 'rfvyED8aHvaJdrXphMCJAWhe1wFEwJ9i9n',
        "m/44'/144'/2147483647'/0/0": 'rMhA2TFmoWk2jM4syPTSzuC96EUbpKppeF',
      },
    },
    {
      method: 'scdoGetAddress',
      name: 'scdoGetAddress',
      params: {
        path: "m/44'/541'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/541'/0'/0/0": '1S01b3fe46c1bbeeceae60bc15a3c6f359a89a6551',
        "m/44'/541'/1'/0/0": '1S01a6c3b3a149b6486c96d525e5b49776c7563e61',
        "m/44'/541'/21234567'/0/0": '1S017885a304591f5e285c130801cb2cc04ed4baa1',
        "m/44'/541'/2147483646'/0/0": '1S01a34d7a44b6d993c19a1d9c1ceddbf651ac4911',
        "m/44'/541'/2147483647'/0/0": '1S013a1e747e2eb32915db02557e4fdf3a5cc77e71',
      },
    },
  ],
};
