import type { SLIP39TestCaseData } from '../../types';

export const count20TwoPassphrase1: SLIP39TestCaseData = {
  "id": "count20_two_passphrase_1",
  "name": "count20_two_passphrase_1",
  "description": "2-of-3 (20 words each) + passphrase_1",
  "passphrase": "12345",
  "shares": [
    "network vexed academic acid alive forbid database equation average advocate golden careful exhaust dance texture satisfy lair negative earth flash",
    "network vexed academic agency calcium memory elegant merchant welcome oral evidence bulb union company suitable spend loud miracle story withdraw"
  ],
  "data": [
    {
      "method": "btcGetPublicKey",
      "name": "btcGetPublicKey-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/0/0",
        "coin": "btc"
      },
      "expectedPublicKey": {
        "m/44'/0'/0'/0/0": "039bb9398ad358c58c5574a005fc24804d54b99a4b9008012e17882f33d2bf4e3d",
        "m/44'/0'/1'/0/0": "03e4edc14e387286a59a7bc0ec4d9f5bfbbe24e80e56c074a3eb7d94f48c224352",
        "m/44'/0'/21234567'/0/0": "03af11fb0e7d1f488111819dfccadc97a4a434b6f764cced5a65f03fbc682f1902",
        "m/44'/0'/2147483646'/0/0": "025bcd315227dc138220eb19157b91e97f62a3027219dc4b2ab5e5e864b4b42393",
        "m/44'/0'/2147483647'/0/0": "0343a15a9ecbfbc68ffd7bf0ed812677172dbdedd21bb8b461116bb160299457b0"
      }
    },
    {
      "method": "btcGetPublicKey",
      "name": "btcGetPublicKey-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/0/0",
        "coin": "btc",
        "scriptType": "SPENDP2SHWITNESS"
      },
      "expectedPublicKey": {
        "m/49'/0'/0'/0/0": "02b22311c7402a9a8647381e6e31c47e0e6bad00c1aaee0978f22eadce376e8283",
        "m/49'/0'/1'/0/0": "020cd6c727e1359a6e20d95ab4ed876e63db418fab1ce745e95b96be33676e9b1c",
        "m/49'/0'/21234567'/0/0": "0256b89cbf20bfb97acef045d2c7767d03ebfc436ceb85c14315cbabebf50db45f",
        "m/49'/0'/2147483646'/0/0": "033fd1b257e2d92937b9e7a64f71952b96675799ad698b5fc5f5f97664463f60c9",
        "m/49'/0'/2147483647'/0/0": "028b9e073ea79b899aa8b1eaae8f16e9b53e7e307df79bca32d93dcf9c86763e26"
      }
    },
    {
      "method": "btcGetPublicKey",
      "name": "btcGetPublicKey-Native SegWit",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/0/0",
        "coin": "btc",
        "scriptType": "SPENDWITNESS"
      },
      "expectedPublicKey": {
        "m/84'/0'/0'/0/0": "0344aaab9fecee94e3095a864ef54ad3038842158c4908e7f8f882d47c8629e095",
        "m/84'/0'/1'/0/0": "0332e6a55c0f9714afc7dd89232e499b7b2e7329c52a31eb6ab564be01b1c59e0d",
        "m/84'/0'/21234567'/0/0": "031890a5d811a6a9a3887c6eecb1dccea1de9c59aae1f3207cc89957fe1c4de7d5",
        "m/84'/0'/2147483646'/0/0": "03765fc500fc09c1cf326b0f9a1d97bd016f92e50e3fa6070d7c85b58cacc83b56",
        "m/84'/0'/2147483647'/0/0": "03a625671ab845616ce68018fb53e85c600bca09aff351281de29fe02fde22f459"
      }
    },
    {
      "method": "btcGetPublicKey",
      "name": "btcGetPublicKey-Taproot",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/0/0",
        "coin": "btc",
        "scriptType": "SPENDTAPROOT"
      },
      "expectedPublicKey": {
        "m/86'/0'/0'/0/0": "027185ffe92c501d418fd0097e41014bae5e27d042a6e005b1b7bb2501fb002723",
        "m/86'/0'/1'/0/0": "032b94c2eab5524fd40206a70fe3ac9d62948378d97f02263e3b1befa835a519ad",
        "m/86'/0'/21234567'/0/0": "0296e82776c275894ac7d4092d4448158b3999507e95de49cba8c877ee31c0d2ae",
        "m/86'/0'/2147483646'/0/0": "028eeae17051557c626a82b325c45272e783813efbaf80bc14efb63c41e5d23921",
        "m/86'/0'/2147483647'/0/0": "03f1db31526427462ba2173748e2159c7221abc42e58d1bc1618981bc603930cd0"
      }
    },
    {
      "method": "evmGetPublicKey",
      "name": "evmGetPublicKey-Ethereum",
      "params": {
        "path": "m/44'/60'/$$INDEX$$'/0/0"
      },
      "expectedPublicKey": {
        "m/44'/60'/0'/0/0": "0x036d6b17da1cf8cdca71c7fd70c906406bc1537cd02cd280c2952eb47ce82c3de3",
        "m/44'/60'/1'/0/0": "0x02ec04fbf64e8e6987d25859ec28188ab76fe611e273495a14ee7847c739b66039",
        "m/44'/60'/21234567'/0/0": "0x02d1d8e122a48fda3e0d35473ab51edde3248841c5631451a5e156286f3cb6447b",
        "m/44'/60'/2147483646'/0/0": "0x0314cf10764ec69c07ab232c0a135fd258ba56c80deaed5d6664eec35e0c8bfd5b",
        "m/44'/60'/2147483647'/0/0": "0x037c8a46ce02dcaafa92fd6300f5a3a766eb3731e217d0d0076be60902f822f68d"
      }
    },
    {
      "method": "cosmosGetPublicKey",
      "name": "cosmosGetPublicKey-cosmos",
      "params": {
        "hrp": "cosmos",
        "path": "m/44'/118'/$$INDEX$$'/0/0"
      },
      "expectedPublicKey": {
        "m/44'/118'/0'/0/0": "0299dd4df2119bbceacd4133d50040bda69b84a25c9d8aca80e22cd7db85bbc534",
        "m/44'/118'/1'/0/0": "02b6167893f7735cbe4910ab4df8e3ed84e20b6125a5f933ef8d2f3a771b4d4f9a",
        "m/44'/118'/21234567'/0/0": "03e88e4044857d26e3e99623c41f92d6112bd3c47df3341b55d5ce74dbfd1fab69",
        "m/44'/118'/2147483646'/0/0": "03150d3a55730f0ec11ecebe8864bac7557e8be7b980ee88c71d83e3780b0adf5b",
        "m/44'/118'/2147483647'/0/0": "03e7873f4ecf69ad5e3638ca495f7e45cf59a634e308be0b7b43686bd1b7fa5130"
      }
    },
    {
      "method": "suiGetPublicKey",
      "name": "suiGetPublicKey",
      "params": {
        "path": "m/44'/784'/$$INDEX$$'/0'/0'"
      },
      "expectedPublicKey": {
        "m/44'/784'/0'/0'/0'": "00a2ca5f29d927a4daf7225b756e1abc96a1a66a1e550630c4473070ad2020a3a9",
        "m/44'/784'/1'/0'/0'": "002bd2a7d61b397cec624c853c169031d122ecdfb0836cccf5acdc800c36acf018",
        "m/44'/784'/21234567'/0'/0'": "000edc122c17a3a9f0d2fab439dd3d8cc99523c9de843c88e84dc4b7a98ed3f940",
        "m/44'/784'/2147483646'/0'/0'": "006b7d1897f138ab666381921d4ddbc9abf1ec4c4c5a12ba6e8e8bc51696985b89",
        "m/44'/784'/2147483647'/0'/0'": "00ffe57c4ec7eb6ae6b114b8f456ee8751869d8b2edab2d8bfce5c8546c5d930d8"
      }
    },
    {
      "method": "aptosGetPublicKey",
      "name": "aptosGetPublicKey",
      "params": {
        "path": "m/44'/637'/$$INDEX$$'/0'/0'"
      },
      "expectedPublicKey": {
        "m/44'/637'/0'/0'/0'": "03dcc05a38c47f327ca38bc303286dc53e2d4f689c3afdb1f81cb5e1353b795d",
        "m/44'/637'/1'/0'/0'": "42555ed29469bf6152fa9533ff339f05b853796f41bc3817f97524a823bccead",
        "m/44'/637'/21234567'/0'/0'": "e69803e456822233316dabcd3471168a9dd870d7035b356a18d008e9d245b2ee",
        "m/44'/637'/2147483646'/0'/0'": "21ac4d2fbfa2e33c6d5877b11a181fcf2cb0fc8c0496501a534bc71b3057bbd8",
        "m/44'/637'/2147483647'/0'/0'": "10b6fbac063c6f0711b33039908bea52f43f582e6256f61237dbaea188407ba8"
      }
    },
    {
      "method": "nostrGetPublicKey",
      "name": "nostrGetPublicKey",
      "params": {
        "path": "m/44'/1237'/$$INDEX$$'/0/0"
      },
      "expectedPublicKey": {
        "m/44'/1237'/0'/0/0": "9334cd2b6a863fc5eb6d09a24b17f280b793736d5c5f191b026a14ad6d1e1d4a",
        "m/44'/1237'/1'/0/0": "0736a374134c312d25ccd0a78a0f6db5612ef1b9cbfa607d6b4309baff1eb12e",
        "m/44'/1237'/21234567'/0/0": "b23ac0ccf84a8f1240688e9cd9012f081214f187d869b20e7967c724da0bf940",
        "m/44'/1237'/2147483646'/0/0": "9ae88fd9c0a0f184ad9aa4cfd29b49478570039f437e86f280011e9eaa370dd5",
        "m/44'/1237'/2147483647'/0/0": "dda15bd0f289b295777a2e98a2b61d6a1efb8c1a4744d5038109f9e9486bff1b"
      }
    }
  ]
};
