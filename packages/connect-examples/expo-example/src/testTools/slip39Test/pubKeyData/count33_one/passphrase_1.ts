import type { SLIP39TestCaseData } from '../../types';

export const count33OnePassphrase1: SLIP39TestCaseData = {
  "id": "count33_one_passphrase_1",
  "name": "count33_one_passphrase_1",
  "description": "1-of-1 (33 words) + passphrase_1",
  "passphrase": "12345",
  "shares": [
    "station industry academic academic aunt similar picture filter chubby vintage insect hairy charity priority ugly mandate credit faint segment mobile cage junior receiver reject crazy sympathy extra helpful expand force counter lamp rescue"
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
        "m/44'/0'/0'/0/0": "02d6821c1ca15bbb943833a80f298b6dbb7b05e9d61555e60e4fff2040ad2cb91c",
        "m/44'/0'/1'/0/0": "035bd5772c39435fefdce6e152b6d602453949c1dc6e32da97f0d4c7cb6f5100cc",
        "m/44'/0'/21234567'/0/0": "03782541bee1ad35bbbf2ad475b96d52138f843613867d724ce22230d0a68f0ae4",
        "m/44'/0'/2147483646'/0/0": "039f890ab81d1e1a289b1638302539b5b6898f6d9f70895c8b565a97461b174b51",
        "m/44'/0'/2147483647'/0/0": "0324e318e7a8fdd73048f21218a728dbdb3069562ed1d7ffeda8ef659cacb512b0"
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
        "m/49'/0'/0'/0/0": "02437e6141f650bf6a64a0bd1dba6a1d32d1d18c83c14173af877d7c849e2cccb1",
        "m/49'/0'/1'/0/0": "03bee6b08af279a660b49671dc171bd789c8498f07b5e236c111700dc703d10049",
        "m/49'/0'/21234567'/0/0": "02710e10ac5d2d44c9c2b2ef862675566f05de8401deb32c6bf24e3785ea26e099",
        "m/49'/0'/2147483646'/0/0": "03d5737dec5d52bfa3d6eb4ae6e83c9d50f1f2af696fbb709e4ef1789a43f1b6c6",
        "m/49'/0'/2147483647'/0/0": "03623ba3d12ef3ce8c64096f64efafcbd21e321c7676e4bdfffb65cbd691ae1f9f"
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
        "m/84'/0'/0'/0/0": "0257b6413ebe2d2948806ced07248bf8a787b1304674aa3ad6485cea2481cfde9b",
        "m/84'/0'/1'/0/0": "02be36d135428d6d6fec3806fa300453e592e254da89e2050c9bf10669ad079a2e",
        "m/84'/0'/21234567'/0/0": "02a3e1cee6be44e7478d9a07715b0e97b4a92ac96bc8d70767bd7c47cfeedbb957",
        "m/84'/0'/2147483646'/0/0": "0312ed81ac5b589cc8b57405cad28ced25e218c2732d84733fd5965fa55a3f4cc3",
        "m/84'/0'/2147483647'/0/0": "023d0ebbedc5550ac2634686fc4d08d863fb9390f62fc72998b9ac63df35e1833f"
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
        "m/86'/0'/0'/0/0": "02c9cc33da794d21d1959477ed3de32b9b16464c997021fd88e509bf91b1cb60b1",
        "m/86'/0'/1'/0/0": "03e7c4767fb0541b3dd8ec2fc954499a85c2a65acd68ec830e526719dcf490b508",
        "m/86'/0'/21234567'/0/0": "03c0a8fa45065030e45f2c8cef44679c749479e169e0d5c9d6bb9692f65870cac7",
        "m/86'/0'/2147483646'/0/0": "03ef64965128ebbb8aaf75875fc8b103faf85edecae2662dbc40019f7651fa6dd0",
        "m/86'/0'/2147483647'/0/0": "039147f8018d14221bfe5da3c42bb2db627719db950bf0d4cb64a86040a52af0c7"
      }
    },
    {
      "method": "evmGetPublicKey",
      "name": "evmGetPublicKey-Ethereum",
      "params": {
        "path": "m/44'/60'/$$INDEX$$'/0/0"
      },
      "expectedPublicKey": {
        "m/44'/60'/0'/0/0": "0x03a47c6fc2ceb5bfb2d87e86e03c295a1376a0fbb73cc8ad1496739b71a86d9c2f",
        "m/44'/60'/1'/0/0": "0x02ba3093c02b2842cfdcdd9594f43aea67c4a2caba7de92eae15e03a7b5ebda37c",
        "m/44'/60'/21234567'/0/0": "0x03ba064e950b0915a700ea09ec13472d6de24cb4a2d3fecd5b2294e31024155c30",
        "m/44'/60'/2147483646'/0/0": "0x039022c2779644393b3bd1644c85cdee178a907290e5e0f6e78b354be83775bdba",
        "m/44'/60'/2147483647'/0/0": "0x02be5369eef72c5bfcfc0316e3f5a1fe5095b3b5beebefa20892d67af26e01c003"
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
        "m/44'/118'/0'/0/0": "037f43945b461215ef6be4806932fd3b5a8d8739a09227e3158a8197313d88421c",
        "m/44'/118'/1'/0/0": "034d3f01acc1d62c524c353ed6cee0781f80c0820a238c42af7ee8e5fb76799c08",
        "m/44'/118'/21234567'/0/0": "032fbb3e1b1e5fb8b2be3e1fd71cdeb890749ffcd376f67fdca2af6efaee41befd",
        "m/44'/118'/2147483646'/0/0": "02fb0079e483c10a45f5d1fc61e837070c30d9055156f9cc2d0763390773b215d9",
        "m/44'/118'/2147483647'/0/0": "03636a83e34835ec9f65075f0a79728056f701dea729540579788e0d68a55e090d"
      }
    },
    {
      "method": "suiGetPublicKey",
      "name": "suiGetPublicKey",
      "params": {
        "path": "m/44'/784'/$$INDEX$$'/0'/0'"
      },
      "expectedPublicKey": {
        "m/44'/784'/0'/0'/0'": "0099b128049cc5b3888275da7dc8429657f21f5706f9af15c3b448f474890d9d90",
        "m/44'/784'/1'/0'/0'": "00447d8fbe0620d409743f21c2b179380d339dbd0da664027275d3a4bc4d494470",
        "m/44'/784'/21234567'/0'/0'": "00e6e1af4cf3fcdfeeac9ed1f24cf2ef60a656dc7b91d3f5179c1fe135d2e9eae5",
        "m/44'/784'/2147483646'/0'/0'": "00c4c9a894fdf7bf2dbbc1c9483e58598712548eb436415a19d2f946050ce3fadc",
        "m/44'/784'/2147483647'/0'/0'": "0027d739db03c884fa91350c2c2cf699052ef34938c8472216a30a03061ffa9629"
      }
    },
    {
      "method": "aptosGetPublicKey",
      "name": "aptosGetPublicKey",
      "params": {
        "path": "m/44'/637'/$$INDEX$$'/0'/0'"
      },
      "expectedPublicKey": {
        "m/44'/637'/0'/0'/0'": "cf2a131132e229887b2bc306c48d902583f30be40178a830b71e476c8b0872a7",
        "m/44'/637'/1'/0'/0'": "56a5d37f348649f99bb75166e43a10c8548f4bb105380b84d75caecaed93cb42",
        "m/44'/637'/21234567'/0'/0'": "e91e2cdb1a2d71a85da75a289d74c4a70e716c8b2a847ad700f993f8e03b28d7",
        "m/44'/637'/2147483646'/0'/0'": "ae956c82d8d0acaa85c74cdca007c19618231ec77b0dc58a5c1dfdf98a6b1b71",
        "m/44'/637'/2147483647'/0'/0'": "31d3e6adde7d92eefe51c3429b9b829770bc59aa656fe86b836a9265d1d0aed4"
      }
    },
    {
      "method": "nostrGetPublicKey",
      "name": "nostrGetPublicKey",
      "params": {
        "path": "m/44'/1237'/$$INDEX$$'/0/0"
      },
      "expectedPublicKey": {
        "m/44'/1237'/0'/0/0": "5a8a97f74738266eb5f70c6c7c465392e2f58834d0a9640402b0855e8853e9e4",
        "m/44'/1237'/1'/0/0": "0fdc2cdef3e79cb87e7a903833758de51f1d13cdafc21f67fe07be6eec3e052b",
        "m/44'/1237'/21234567'/0/0": "414803080632992345c36434bf8cf748b3c124ccab7f53d9de4e2f53a06a44f6",
        "m/44'/1237'/2147483646'/0/0": "dce1e80e6369bd38f9f2d1944bd98c7583ea4dc7cf332de55337904fe3b71997",
        "m/44'/1237'/2147483647'/0/0": "42b1a8d969441e898253a432e9ef792fc7f4a184d2ab3cddd6b90882ff7baee4"
      }
    }
  ]
};
