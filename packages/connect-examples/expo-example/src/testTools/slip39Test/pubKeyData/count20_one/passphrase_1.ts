import type { SLIP39TestCaseData } from '../../types';

export const count20OnePassphrase1: SLIP39TestCaseData = {
  id: 'count20_one_passphrase_1',
  name: 'count20_one_passphrase_1',
  description: '1-of-1 (20 words) + passphrase_1',
  passphrase: 'onekey',
  shares: [
    'fake kidney academic academic dwarf orange primary secret mixed auction priority daughter script smell smear judicial ceramic glen theory emphasis',
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
        "m/44'/0'/0'/0/0": '03be111fbad39e11d7f90c2a1f78078d318a8f0c782ad67bfa78377c83bc2e3040',
        "m/44'/0'/1'/0/0": '02c819a0710b75f1cbbe39d2349a71b6098f0efb9d198a2e25aa3dd84122c99b58',
        "m/44'/0'/21234567'/0/0":
          '0389939283a3dc3fbcb53e5b420eb4cd0920e8ed57a33e445b6b9321464daebab8',
        "m/44'/0'/2147483646'/0/0":
          '0212442b8b57d26e7759de58169ad2b1736a6ee8b69a4d6142a296bf8297dadefe',
        "m/44'/0'/2147483647'/0/0":
          '02205128b3af64b1070aaaf63700662fab529a41ad0666e3315b7d90338972f5a6',
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
        "m/49'/0'/0'/0/0": '03c9b19dbabe013b1d58a2fdace7db2ea8de6b29b269290f8ad371b4ebb42b091d',
        "m/49'/0'/1'/0/0": '032beafc2aab5eb5c9da9be241209035e3b03c37000e6770164ebde80aedfa40c6',
        "m/49'/0'/21234567'/0/0":
          '02079849be4e8faf358344e46f5dd86b6f003e0b97ed65f1e1e084c2ab554e675a',
        "m/49'/0'/2147483646'/0/0":
          '02599b01a3ccad69304d273fe19ee3fa344215480f68e3c11cfa40f8e20d1f6bd6',
        "m/49'/0'/2147483647'/0/0":
          '032ba319d92ec8af6fd5b0ccc0974f0c6a83114bbfe7406b870e00fbaad4e30c5e',
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
        "m/84'/0'/0'/0/0": '025d66b3c08f678fdb82be314d64feef72758449a5c00972d101663a99dc9cc0a5',
        "m/84'/0'/1'/0/0": '03e3acd42ead311915b2a01e15676a94c9eee7c23f131f5f56b39e5e56bc64e787',
        "m/84'/0'/21234567'/0/0":
          '03c018f5ae1908f85a3e9d14c298525019162e55489a58be66884650c2dbc66adb',
        "m/84'/0'/2147483646'/0/0":
          '03029abf7eb2d9467b43d95e384faa91b9c90bbe40a0e0e8c0afbafba42448c385',
        "m/84'/0'/2147483647'/0/0":
          '039cff6e2457a4e6299709f9055b4764026800846229d6593748a974265cc5a9c9',
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
        "m/86'/0'/0'/0/0": '02d28400c80f5445a63d492bceada6a994e5a70c6bfd4c8597705c1cd70df2a7e5',
        "m/86'/0'/1'/0/0": '03a8bee36973eed67b79a8ae3e310f572781e9e9a7627b1edbd6315e9008011637',
        "m/86'/0'/21234567'/0/0":
          '03fcd5c5f0be41107019281d5de218dffc6c011b0333756e2e598c937501e374f2',
        "m/86'/0'/2147483646'/0/0":
          '0222690d5186466a89a24d3d65bd6e6c4bcb1597ccf683cd5b2c7cede692aa0cf4',
        "m/86'/0'/2147483647'/0/0":
          '037860a9860a7a0d2b0536074dc43e643a7333351a94e15b05f4fc3ec843d06834',
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/60'/0'/0/0": '0x03410b9d1ab2104f77b15bf79bba78c1081edef4361e992054dcbded7e54a9ea55',
        "m/44'/60'/1'/0/0": '0x03ea527915362097066d294a44ae8d8181f39d1f51103f19bc17e72a8f33e791b4',
        "m/44'/60'/21234567'/0/0":
          '0x03d8490674fb481c6115de959d54763724e19a757a56b6aa449e9231d261f186dd',
        "m/44'/60'/2147483646'/0/0":
          '0x026c983e54f9e98ca6bbed829ed4d755ad066f0e66fd347b0827691f5bba9e8fc7',
        "m/44'/60'/2147483647'/0/0":
          '0x0210fd8bb8b569f1f9a967d28b7edbfee9675c7336c2829b44d90c89313dccdc01',
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
        "m/44'/118'/0'/0/0": '024f4b89fd931d7a54947c0ae217f29d236d50eb43f5156406b1f9381d6a95b7ea',
        "m/44'/118'/1'/0/0": '022e629ecdcaf261f1f47c7ad00ddc52a566878641a568257dc5dc029de5cd597c',
        "m/44'/118'/21234567'/0/0":
          '02c3bf26ac01c1aea618e125f6ef7f2e5933957930289f2215c2f6bd3c9f1f71f7',
        "m/44'/118'/2147483646'/0/0":
          '037b5bff23ef35c3f431a1b6636d1471723781f3c8952828403daa0df85dab3a48',
        "m/44'/118'/2147483647'/0/0":
          '0230eaf6b8760b0721aa7855280f545731ddbcdce180f5d73567b569d207d2f809',
      },
    },
    {
      method: 'suiGetPublicKey',
      name: 'suiGetPublicKey',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/784'/0'/0'/0'": '00abf95e5f4a6579425d2366f73a5277853812fa7ea36b4af03d86fdbe99f27014',
        "m/44'/784'/1'/0'/0'": '0041206cbc51e57b1187105c2af8bc7f1fafd5eec97e526e7ed48f72ff024d91e5',
        "m/44'/784'/21234567'/0'/0'":
          '0032d76f592b5278477ec6837d72860b95c41d87a2001d2eb1d3a3de5a8f310267',
        "m/44'/784'/2147483646'/0'/0'":
          '006f6dfe374c1ed75aa422130d3a6ac09bd63999c7a3a19705132440d317f7cdc3',
        "m/44'/784'/2147483647'/0'/0'":
          '00fac46a8bff78370f0c70b880833057c1886a2a228f0dd60523f57a776bde4e79',
      },
    },
    {
      method: 'aptosGetPublicKey',
      name: 'aptosGetPublicKey',
      params: {
        path: "m/44'/637'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/637'/0'/0'/0'": '98d4821c46d40b8a0b9f03ee0fe9846bd537ba748f59a510acd93974efb38a41',
        "m/44'/637'/1'/0'/0'": '0a5bfac5aace42ed9ed56a8a3428ef0992387bd66561fc69c8ed6a499ed467f3',
        "m/44'/637'/21234567'/0'/0'":
          'b4d9d83f02f26218291781c8d7d70d591b17c877d344caebdaee044a57712030',
        "m/44'/637'/2147483646'/0'/0'":
          'd5f66aea9aa666b670ab20bc22f3604170b2bf11f23239d733e93cc151398ab6',
        "m/44'/637'/2147483647'/0'/0'":
          '99306d437b0260d999474ed9f521585988a8ebee2c2cda4eff172349b4ef3496',
      },
    },
    {
      method: 'nostrGetPublicKey',
      name: 'nostrGetPublicKey',
      params: {
        path: "m/44'/1237'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/1237'/0'/0/0": '1c252494c111d5010b9ede740bed2e62aaa4d31dc74646464f0b099608f4f89d',
        "m/44'/1237'/1'/0/0": '798f431edd48481920d7baa1236bec0f9f7195abaab7a877826443c00ad38e9b',
        "m/44'/1237'/21234567'/0/0":
          'e79eb83961f571ccf78f3281eafb7969c5d85b454a656dbfadaecb6d81e0008b',
        "m/44'/1237'/2147483646'/0/0":
          '41121af7e15848408716e00e68c6fb5621bfcbc9c8be8babf14263eeb55b2282',
        "m/44'/1237'/2147483647'/0/0":
          'bfb875bdcb2576a74f3ba6be873919e81df39f1f48b8e761850798e0f22e435a',
      },
    },
  ],
};
