import type { SLIP39TestCaseData } from '../../types';

export const count20ThreePassphraseEmpty: SLIP39TestCaseData = {
  id: 'count20_three_passphrase_empty',
  name: 'count20_three_passphrase_empty',
  description: '16-of-16 (20 words each) + passphrase_empty',
  passphrase: '',
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
        "m/44'/0'/0'/0/0": '02143fc4f6a694616d567936fe3a38620ae96deb8ddee2e367a2fe9ba6c38a6e24',
        "m/44'/0'/1'/0/0": '03cfac6b9d15b41da43d8da5eb985117270412e86f6c340db82d0bbe669fed783b',
        "m/44'/0'/21234567'/0/0":
          '03e9cbef3f02bd238d5ced4586f2004656bd34cf3b047e27796277f4d54b677b8a',
        "m/44'/0'/2147483646'/0/0":
          '020e49b30a5ff2478152444875278897db2d9ef4189b826cf058a011ac615ad532',
        "m/44'/0'/2147483647'/0/0":
          '038331bfaa73fc3ae8735471694fd4828e5c32a06cbce6867eb9ce3b2c88fda9db',
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
        "m/49'/0'/0'/0/0": '02f929d186ef402d2b503d03534c667fa7ca2e5ed4d035e491674ad28692af9ab9',
        "m/49'/0'/1'/0/0": '0235e2f44affc9481f0165a19d04791553bf89cb38236a23e18e7b9775254bb493',
        "m/49'/0'/21234567'/0/0":
          '03d72acb4b0dfc43181200984cfe5f34a304b25e27f9f71bcec6cf001481b7442e',
        "m/49'/0'/2147483646'/0/0":
          '038a55f1e02402ef27f507cf869213e24937cd98a10450ecaaa359f55641272126',
        "m/49'/0'/2147483647'/0/0":
          '0232cef290700ed47f4b3ed382b61a626cbf6a81a72dec51f315e0feffce859479',
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
        "m/84'/0'/0'/0/0": '03a99e99b159711e43def2ed4bc068bec8d07b954c36f2c6e8f823aa82bcc60312',
        "m/84'/0'/1'/0/0": '036ef761383115f20884a3fd5179b60b000c55675b9814152f4431da169f878bc2',
        "m/84'/0'/21234567'/0/0":
          '02f845c5cfcb0aa4b788a33a03f35a513434b79b80579b1e89b7b050480893b82e',
        "m/84'/0'/2147483646'/0/0":
          '02c731869bb639b12f47ff64fc0c88be0a6ab2705073cec372e2ab59ad89ab3f45',
        "m/84'/0'/2147483647'/0/0":
          '02c7232468690848d3533cdef2884c07bbaf661ec3e0b6f77ada7e9a95e7daf5d7',
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
        "m/86'/0'/0'/0/0": '0371562350c7676c96dc4cfd13e3784977d3b851dbb44d987b84e5201f80aac72c',
        "m/86'/0'/1'/0/0": '035b4c5fc522838eefa1987b2e81d3765491fb1f141e9d0bb826edd399ab509507',
        "m/86'/0'/21234567'/0/0":
          '025b6f25a7516d37bc1a1fd4aa65d18fcb98a16f558515fb2bdd6d899c004f3492',
        "m/86'/0'/2147483646'/0/0":
          '03ee280f9f293555d0abbdbd53622148d9b5a6cf4b5e87fe720ef05cf8145c36f3',
        "m/86'/0'/2147483647'/0/0":
          '025cd7c45e789e9e7854700c5a00436eeadfd81fdf4720cd786d2fb932d9b8ba22',
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/60'/0'/0/0": '0x029027e33e221084e230f8a2bbf3a524da453aa3ce192307ee4b4853f1009ff30a',
        "m/44'/60'/1'/0/0": '0x0245bbe25ab666144cdb6b835b88685ffea515b9d53f366cf861a421d4295434c2',
        "m/44'/60'/21234567'/0/0":
          '0x024713f6c1e5bf0bad5723985f9769b486e973598b5534de7df5eadc14685f98b6',
        "m/44'/60'/2147483646'/0/0":
          '0x03dd3db9ac528149c86c58b8b6144cba82ccf5f25715da56f77a4d93be43cd6bbb',
        "m/44'/60'/2147483647'/0/0":
          '0x034fd968a161143aa198e8ae356b4d4afc7b2a19ffcde5a24a614dfe400781abe3',
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
        "m/44'/118'/0'/0/0": '0389e15511f680e6392fc0d99c8ca70e3b2ccab097229a39632f888502d980e0ad',
        "m/44'/118'/1'/0/0": '031eec40a6724f64f4b9a656bfc9b5502356f19987091d30f2d5fa0cb8a4c8f85a',
        "m/44'/118'/21234567'/0/0":
          '02102d129eea49ac302afc320ae0a93928e7e7ad62f1a4ef4d67165b664dccd1b9',
        "m/44'/118'/2147483646'/0/0":
          '02fa73cbfa48cbc744f14d2022a4271738c8a6821498102420e55ec96ca42353a6',
        "m/44'/118'/2147483647'/0/0":
          '02f07d1f7d1dc8ce8fd3ea631b495c97a9ee9e5450855ba1712fddd5b806f3cf64',
      },
    },
    {
      method: 'suiGetPublicKey',
      name: 'suiGetPublicKey',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/784'/0'/0'/0'": '00b5e2de24066e5c57f65fe520a6b6838b5080863c5c0c11227ce62738b09c0def',
        "m/44'/784'/1'/0'/0'": '00d8139d689c6d3d261fb98cadfdb81e96c227967f4544bdc927a543ba62a6ac7b',
        "m/44'/784'/21234567'/0'/0'":
          '004820ad6031284d95a365ecbee67086aac67fbaf88b022a6f6b5d7833851a7e00',
        "m/44'/784'/2147483646'/0'/0'":
          '00abe52959336c19a10d6c9ba345d12a297b1c448a8fb6f39222bc2b8730d607af',
        "m/44'/784'/2147483647'/0'/0'":
          '00418356448284c912c1d36b729f1817f0b8d1a6d38bfd8907d4fc3fdd606887da',
      },
    },
    {
      method: 'aptosGetPublicKey',
      name: 'aptosGetPublicKey',
      params: {
        path: "m/44'/637'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/637'/0'/0'/0'": '85fb2801343dd5705d7901226d30706ed64ca4bcbd5ef5edcaa8df31bafc12e9',
        "m/44'/637'/1'/0'/0'": '0ccbbd34b0cfde7b10768a1103faf36e0f765325587ce26bfcc379c9c45d9f64',
        "m/44'/637'/21234567'/0'/0'":
          '306a1d4c71227b3f06b215050d3a6a539a78adb29ce59173937492e527a31bac',
        "m/44'/637'/2147483646'/0'/0'":
          'bdba0e946a3e36729097a8982d6af16821831abd2bd742a2633140961e81f08d',
        "m/44'/637'/2147483647'/0'/0'":
          'c88500335427fc67ce3221ff65cff0d6ffc26b0c40e352451ecd9ea99f1c5507',
      },
    },
    {
      method: 'nostrGetPublicKey',
      name: 'nostrGetPublicKey',
      params: {
        path: "m/44'/1237'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/1237'/0'/0/0": '7150ca9f944c8dfad335ce6b96af6bb92daac7384b133f243095d68fc39c9c16',
        "m/44'/1237'/1'/0/0": '96e99d2453959a0ae361209013b931878d894012faacb52e9cec69861712700d',
        "m/44'/1237'/21234567'/0/0":
          '0fade7a7cc98361585b22c4fe9452f6236a1ae6aa81d17889cb6b352b9c148c7',
        "m/44'/1237'/2147483646'/0/0":
          '5d5472f5c362cd60061bba5341cb71b09bd1fb11923addf3e1d42ca1d2403fa0',
        "m/44'/1237'/2147483647'/0/0":
          '3b946459fc2e0d57a9bd57dc6349f24c70c1e6d3762665668fc5eca9ef9683a6',
      },
    },
  ],
};
