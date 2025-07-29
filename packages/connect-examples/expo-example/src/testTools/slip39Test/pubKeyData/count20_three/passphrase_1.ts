import type { SLIP39TestCaseData } from '../../types';

export const count20ThreePassphrase1: SLIP39TestCaseData = {
  id: 'count20_three_passphrase_1',
  name: 'count20_three_passphrase_1',
  description: '16-of-16 (20 words each) + passphrase_1',
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
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
      },
      expectedPublicKey: {
        "m/44'/0'/0'/0/0": '0356688a8c67084ffa53be9f2653711f103b996ddd35fef6d52bf131ef45130066',
        "m/44'/0'/1'/0/0": '021d147e05d5bce7ef3b97290e2d94f5f5cbe7a6d1958663032c57d9f444f3eb3d',
        "m/44'/0'/21234567'/0/0":
          '028957384c110d555cbc943c6934c1e9f0f129db65265b1b42620a0ca05945dd11',
        "m/44'/0'/2147483646'/0/0":
          '03e31bb50650875e3e4659aa8d7ea0f3520fe6d2bea1ed48998288562b15658a72',
        "m/44'/0'/2147483647'/0/0":
          '02d79c1a6f72155356a8fc926d7a06ce14c54eb13ce27facea76d62960121ee167',
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDP2SHWITNESS',
      },
      expectedPublicKey: {
        "m/49'/0'/0'/0/0": '03eccc59d5f5fa7698fbf7591e2279478b092154d60983c4e0261520945843dfff',
        "m/49'/0'/1'/0/0": '038c7bcedc2c9bb90c9eb5f0c7ae8492db1dadee901695bad959f4ce3ea089e248',
        "m/49'/0'/21234567'/0/0":
          '0344f3131842f6ed4f18d1f0adb57530ceb200f4d91924135419ff8047d75f8d78',
        "m/49'/0'/2147483646'/0/0":
          '02b3e0e35cb34c0346c30ab5e2801e66a79bdf9790a3ef470224d47bd56848f8c8',
        "m/49'/0'/2147483647'/0/0":
          '02b652e6d915aef0f22fa15d1e5bf56322e1509928bb597d29619db94eeff51f56',
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDWITNESS',
      },
      expectedPublicKey: {
        "m/84'/0'/0'/0/0": '03df4862ebefd7284c318b61c02194d2ab4636a42e10d90d642516684e1d71286c',
        "m/84'/0'/1'/0/0": '03e3d395f9661004d7149641793affe914afee92b4825dbc72da1b8960f9559215',
        "m/84'/0'/21234567'/0/0":
          '024ce2f9f67af4d17f0c8c681e787379706668dabc60faa3a1bc7938ba4a16a6ca',
        "m/84'/0'/2147483646'/0/0":
          '031359812abd98a50524efd6776d5aa6f55c2b45fdc7c0253992ac0ec04e85f6e8',
        "m/84'/0'/2147483647'/0/0":
          '02e33eb999f99ddfd8ec8c5badb9787d7a667816f455e09ff3abd53194e40c437d',
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDTAPROOT',
      },
      expectedPublicKey: {
        "m/86'/0'/0'/0/0": '02727fe10fc10670b4bdcda80a6cc25bd8984f241f1765159a67e10702b7629b25',
        "m/86'/0'/1'/0/0": '02c8f11c62bd99783e3328a0fae0c1be56bdbeb6c18f60c4d24ef9b161eaf0e7e0',
        "m/86'/0'/21234567'/0/0":
          '0329db8072ed6c21c651c51f967428751b5d957ef4e9d6eca42711f0d2bed52304',
        "m/86'/0'/2147483646'/0/0":
          '02bd10d34744503818812ceb7f43b8ebbd73f3d73e41a858fde79c2f1898411e5b',
        "m/86'/0'/2147483647'/0/0":
          '020f01959e7273e31b2f92325ac52c2cd5f04c35114cfa720fdeed2d8bf64dee3c',
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/60'/0'/0/0": '0x038f20805ab8990d709a10c82198a64cf1664c63384c9a5ee5bb2b0796fd3e3e28',
        "m/44'/60'/1'/0/0": '0x03ad4e51562da8084dee4e636ec6adfc6b646fd41c88a1ba738e5147c285641b92',
        "m/44'/60'/21234567'/0/0":
          '0x031db49ca6a3e3fa61a53ec64cfac8519a7c7609e8ec3f812ab7341b8faa45f470',
        "m/44'/60'/2147483646'/0/0":
          '0x03fe778c08f8d3c6c76a47d9a7a5a4999b1f13ecadd030efcc1ba6676fa8ea60e7',
        "m/44'/60'/2147483647'/0/0":
          '0x02d7b03289c1c0095c1e4117ac4e25f18328e0413adbd577c599ba8798a5b2abee',
      },
    },
    {
      method: 'cosmosGetPublicKey',
      name: 'cosmosGetPublicKey-cosmos',
      params: {
        hrp: 'cosmos',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/118'/0'/0/0": '0288d7d13214d85ba36cd9655ce7e4ca371c6bdc877d9a9eea36ada268fca34465',
        "m/44'/118'/1'/0/0": '0394ef29e6af2a0ab8d7060ff1952c57e7f71a236d72472aeaa2ee18124d06ace2',
        "m/44'/118'/21234567'/0/0":
          '0287f43073ed8a1756a20fab826bde36442a0c94335bb2d2d894ea58adfa5c3fe7',
        "m/44'/118'/2147483646'/0/0":
          '029fa60102da0e2d9191c285af7e506e18a6c1d1895f456ff6370e43a9416671cb',
        "m/44'/118'/2147483647'/0/0":
          '02baf478eebe8df992baaaf09f68a85ba04d74954ac511f23b12f1d61b7f0115c7',
      },
    },
    {
      method: 'suiGetPublicKey',
      name: 'suiGetPublicKey',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/784'/0'/0'/0'": '00a4aaeaaf7121348e571e6f5456904ab125d4c06af0b55329de54173ee7b8f3c6',
        "m/44'/784'/1'/0'/0'": '007089dd807c52488b4841c3add304ed2152462c9952212f4e4d743c4470502337',
        "m/44'/784'/21234567'/0'/0'":
          '000273b21eb768d8c1e27a3e078786c5602474aef6190c428693d608ab29106741',
        "m/44'/784'/2147483646'/0'/0'":
          '000d82b61e5c8b46d78bf7fe23e0e967e73c7adc6244c2875ed2276c60735f4b7e',
        "m/44'/784'/2147483647'/0'/0'":
          '0012b1259ffea08ae7653b62d7dac7b1c396d8421b07e4c8698b72ed80dd1ac41d',
      },
    },
    {
      method: 'aptosGetPublicKey',
      name: 'aptosGetPublicKey',
      params: {
        path: "m/44'/637'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/637'/0'/0'/0'": '022c3d08691444d49808e507894c568024a7e7f3a1bea88213cfca93b5663919',
        "m/44'/637'/1'/0'/0'": 'e668c52e3983985bdffc3a1f44db083b54f7140f4620dbef7c981003a637f923',
        "m/44'/637'/21234567'/0'/0'":
          '67c2bfa1a9e8008ce2f1468db336826f3cfa16d27e4c9377a86b3ca127f4d059',
        "m/44'/637'/2147483646'/0'/0'":
          '8f6f9835e142c4a2ed28980757f35498994fb4fe611736248bd49789258fd81a',
        "m/44'/637'/2147483647'/0'/0'":
          'afda99b5c655bfb55e0da4d44b6c3c2da4cd6a8d28dc37cfe3bef6f92dfbfb19',
      },
    },
    {
      method: 'nostrGetPublicKey',
      name: 'nostrGetPublicKey',
      params: {
        path: "m/44'/1237'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/1237'/0'/0/0": '1edb159f21d7939454c8ccf8f74af3662e14e7e451f18a20431072d951e06499',
        "m/44'/1237'/1'/0/0": '3c7aa65f16034d79b90b4ca404d7e6d394be807a4bc3e763a323b0addb64c7ff',
        "m/44'/1237'/21234567'/0/0":
          '846a3db69b2e29d3b0498bdd5341aefe5052cfe8b175ac9a65d30e2e0b6bd14d',
        "m/44'/1237'/2147483646'/0/0":
          'f24daaed21e9694e1af9ba613d8cb61f834eb31cae89e4fe47c7d94f3be82979',
        "m/44'/1237'/2147483647'/0/0":
          '8c8530a839eed5ce0bd0de29fef0a44071617a51bce007cf7b5a241cdcd325de',
      },
    },
  ],
};
