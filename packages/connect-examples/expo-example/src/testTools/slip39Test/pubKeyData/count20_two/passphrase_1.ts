import type { SLIP39TestCaseData } from '../../types';

export const count20TwoPassphrase1: SLIP39TestCaseData = {
  id: 'count20_two_passphrase_1',
  name: 'count20_two_passphrase_1',
  description: '2-of-3 (20 words each) + passphrase_1',
  passphrase: 'onekey',
  shares: [
    'network vexed academic acid alive forbid database equation average advocate golden careful exhaust dance texture satisfy lair negative earth flash',
    'network vexed academic agency calcium memory elegant merchant welcome oral evidence bulb union company suitable spend loud miracle story withdraw',
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
        "m/44'/0'/0'/0/0": '022926ec93a6350c651cd4a24c9dd04eefe986deecd9bbb34d78c543df3bb3b171',
        "m/44'/0'/1'/0/0": '02535c0b824ec1f0de4c8e93adf5fb3802953ea465e25a1a358f6322ed868620d5',
        "m/44'/0'/21234567'/0/0":
          '03e69f5b062d4913ae3c69419f8ce719d805c3eae9e615f8164362708469040f11',
        "m/44'/0'/2147483646'/0/0":
          '0327128a7e64d376bbc0b97641fd0bacccd89c286fd6fcc54eff0e6e685a1c943e',
        "m/44'/0'/2147483647'/0/0":
          '02de2c58c1f93b034d1e1bcaef1829cb817635d0ff1b650ae7addcf18e281a0981',
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
        "m/49'/0'/0'/0/0": '03afb324054ba060b1582638439d86cf4cff778a9008dbedfbe8efd01e91b52c3a',
        "m/49'/0'/1'/0/0": '03e91535a2608a3dd40642caf3d6361b76c82f4e2bd87ed04c3de8fc46af5cdc60',
        "m/49'/0'/21234567'/0/0":
          '0271a4cfe6c373be9a16dcd13c47500ff4431703d23ad193fa241de6e75cfcd62c',
        "m/49'/0'/2147483646'/0/0":
          '032c346d5a190f926a947e71884aa060e756a3b29b40e1e9009ea269dd9ca62e86',
        "m/49'/0'/2147483647'/0/0":
          '0248f42c9af61752c09a7d8eabf17a18cd6eab0b41e76e8ec8c4725f70d863b94e',
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
        "m/84'/0'/0'/0/0": '0216f18dc0411cf267e8fd1667b99b33e830dafb8a045f94a1bc920dc6407bd7b0',
        "m/84'/0'/1'/0/0": '03cfa69227f4abb0428a46806f9546fa2d17ad60ed296735f4448aff14cd1c8659',
        "m/84'/0'/21234567'/0/0":
          '02c5b495e53e4899e08ac2351789c772f95b1790733a77b4321d6db62dcc2b81ff',
        "m/84'/0'/2147483646'/0/0":
          '0360e49a6805ca56fffed7d145dc42dc0210e73393677c4b2438d74962ea19c8a3',
        "m/84'/0'/2147483647'/0/0":
          '039d5aef74c9661f095ade6dda392d4faac0cd719a035a1f289a30c0438a7577ae',
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
        "m/86'/0'/0'/0/0": '02f9e2ead6cc285d7732f1aa8f02be8d8a12ee543c87bd77d9dda7e615026f328f',
        "m/86'/0'/1'/0/0": '02dc7e79b6e4d2a2d43bffa35f71dce35c167426868087d361675e4f1d75f6faac',
        "m/86'/0'/21234567'/0/0":
          '03284246761976af1d896fc6eb49bf77d941fd7d20a647d0327fac0745721ed5c5',
        "m/86'/0'/2147483646'/0/0":
          '026d75a3ebd8bb3acd837c8c665b81a7110ae7dbe76b134db6e05da01d59b659de',
        "m/86'/0'/2147483647'/0/0":
          '021a784a480b67dce072083a81f0aa5f4b6a38abc6ec608bbf676c49875fd0a62c',
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/60'/0'/0/0": '0x03149223c6988ea893a618731124e2c69dde282426c08d241f656d5abd6819388c',
        "m/44'/60'/1'/0/0": '0x032c18d87969e418468b079c8ad402a46a69e4417940b68be4fba81f4200f8acb7',
        "m/44'/60'/21234567'/0/0":
          '0x02bb38ab8d52b2c28329de9db7aae498159b342c23e7064df0411cac2c74d0761c',
        "m/44'/60'/2147483646'/0/0":
          '0x02fe1d1a98d30c288c1a661e7fafb90f9064b954c2936e54452e01e3fa17282309',
        "m/44'/60'/2147483647'/0/0":
          '0x027f6f6fd7320fd4d0d8165a1abf030f90e02fdff90aa258096ca47950ef30740a',
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
        "m/44'/118'/0'/0/0": '03559f0977dcc7c84f169f87bb59fcd0706e4ecf627286e59f0a0437ef2461dca2',
        "m/44'/118'/1'/0/0": '02fc84cae49cdf01b4aa284d88ce730c90e5883af6f1272c03d222d5e634203564',
        "m/44'/118'/21234567'/0/0":
          '03d7ea3a7ba9a7760da0560ee01488f89e0d87137abb768d9cf4c3d2dc2fe32369',
        "m/44'/118'/2147483646'/0/0":
          '031b41967752e30a9b1996b0b62a120bced35a1befea90912f8a999fc131e85bff',
        "m/44'/118'/2147483647'/0/0":
          '0201eb3c3cfc44aabc53197c14c46b220a6d2068e6ee00707cd7ac00eb7a20424d',
      },
    },
    {
      method: 'suiGetPublicKey',
      name: 'suiGetPublicKey',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/784'/0'/0'/0'": '0075bc84ebc9c06d0e77d00dbc8658dd5bc3960b00610171d923745902c468c0c8',
        "m/44'/784'/1'/0'/0'": '00b00162e180c6e685d518efdc96ac281de98dd1b7c9a93d313128dba8123c1087',
        "m/44'/784'/21234567'/0'/0'":
          '00dbfef1aecff88f9864458627ebcf796ab40be91077464d0898ea87b8a5b604a0',
        "m/44'/784'/2147483646'/0'/0'":
          '00574b23a59df14a6efa033abca36536a388128e72251dd932df00222e90778a49',
        "m/44'/784'/2147483647'/0'/0'":
          '004631644c19ce3fae6f01c31cdffa644d308f86df51e63de50bf925028c05e856',
      },
    },
    {
      method: 'aptosGetPublicKey',
      name: 'aptosGetPublicKey',
      params: {
        path: "m/44'/637'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/637'/0'/0'/0'": 'c33a4f26bec9419f6cb269d5b008af6b7f21f80aea8428bbc6a218d9e6247990',
        "m/44'/637'/1'/0'/0'": '4d2e71fcbb91134835372459b1076e8462639686c9fd137547d3d320e673706b',
        "m/44'/637'/21234567'/0'/0'":
          'dde177c6eb7a1a924c48c4287bb5e439ec9cb7d6a53c1257d2c3ca0234a4053e',
        "m/44'/637'/2147483646'/0'/0'":
          '9d7b87ea04966ca8c02a2278d05434191b64edd3aa6c6615fd08dab00255aecc',
        "m/44'/637'/2147483647'/0'/0'":
          '3af02d9a371b4ee44a983f76a410293e265b391b704b77301bbd7bf89d6be6c5',
      },
    },
    {
      method: 'nostrGetPublicKey',
      name: 'nostrGetPublicKey',
      params: {
        path: "m/44'/1237'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/1237'/0'/0/0": 'a367ad9b8eea3cfe2fb0ffdca9326fa93ae7de07c5a4942b8d701e87e82193cf',
        "m/44'/1237'/1'/0/0": '03897631ef7c5f4605e92f0290d724516ab6535b3fdf97a5398015843dafa055',
        "m/44'/1237'/21234567'/0/0":
          'be19297de9dd07dbd1375300215b6a40d51320033dfa3193844a260b76ef58d6',
        "m/44'/1237'/2147483646'/0/0":
          'bfa481a61ea7ce3209c70c3594c603ccfd05902b80a254e8b88881b7283fc2e3',
        "m/44'/1237'/2147483647'/0/0":
          '1e48ae95ef9a0671d8b7a83ee11ad980f731b647fc25e034c28fb12f8d0c5d88',
      },
    },
  ],
};
