import type { SLIP39TestCaseData } from '../../types';

export const count33TwoPassphraseEmpty: SLIP39TestCaseData = {
  id: 'count33_two_passphrase_empty',
  name: 'count33_two_passphrase_empty',
  description: '2-of-3 (33 words each) + passphrase_empty',
  passphrase: '',
  shares: [
    'yoga racism academic acid average silent year kind package pitch bracelet desert aide guilt render belong density forbid spark benefit trend junior fake dough silver spray adequate western liberty hearing strike prepare various',
    'yoga racism academic agency antenna aircraft nervous biology buyer invasion satoshi angry darkness skin guilt market fatal violence item platform painting width involve marathon parking duration pancake wildlife should execute silver metric oven',
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
        "m/44'/0'/0'/0/0": '032eeaeb5cf0b96cb394b694806dad0856427b1935c46d3699c742fa050f8e14ff',
        "m/44'/0'/1'/0/0": '03e878d665e3d8982419f15676db7449dec949ab85ce7f33a82b4c60832550b8da',
        "m/44'/0'/21234567'/0/0":
          '029a0b98cf90e531cfd4d8a727eef8b5e8cbd7a7913c8c412611f4574f3388c8ce',
        "m/44'/0'/2147483646'/0/0":
          '0370fadace8cc227da94c17d65565658716b1dfd06c47a8c4f23319e55f80ede20',
        "m/44'/0'/2147483647'/0/0":
          '0256eb460ae5e1bf16174707c2880f593011c94d2c61899376c695cd23e6e83105',
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
        "m/49'/0'/0'/0/0": '02dea6c5fdc99d5cf13ff9ef3f5e75e2ef3c415f9a35bb2ef4bb8ba36055b558b6',
        "m/49'/0'/1'/0/0": '028ed6f4457fc3f402d7a4e12f51e6548c85214b22351aadc4f28f9676029ef072',
        "m/49'/0'/21234567'/0/0":
          '0346cba82183a75b5b743871618f7915f292a79f7e0b5a0dadc67a15f2800fe282',
        "m/49'/0'/2147483646'/0/0":
          '024efb64f1284a66582ce537d6f0923a8fab5646da683668b8ffdfd69a669e05cb',
        "m/49'/0'/2147483647'/0/0":
          '0368bbe0c3e65bd7ed50c3123df2813548c723142847b4f2050fc71cafd478675f',
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
        "m/84'/0'/0'/0/0": '026fb51e61596ba341bf994f26698e69830cda142d36d7c20b7190fe8cd3fb87d5',
        "m/84'/0'/1'/0/0": '03d0c56b6d802524aa51a623be8d5dc1fd74c4b47a0b61485de987c974b362fca7',
        "m/84'/0'/21234567'/0/0":
          '02b9b3464f8cf45abd9a72a088bf41ef8f3d271e4e1cd843bc0a153bea2a0c7816',
        "m/84'/0'/2147483646'/0/0":
          '02863932f7b3463825815b45a17be39f82eabcedc84cd5d8955daa664787516258',
        "m/84'/0'/2147483647'/0/0":
          '020414321bee58332306974546e12afaf631b375dc0c5b0a4f8efdbd2a8fa8ae44',
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
        "m/86'/0'/0'/0/0": '032060c1428b026aa4f8d8a66efd72345f4c8a68b8ab6433ede6bcda3119121147',
        "m/86'/0'/1'/0/0": '03f2f97c46f3f3a920f1f72a42b9a7c0e89a495a5720236cf5fa8cb7b2b3bdf4f4',
        "m/86'/0'/21234567'/0/0":
          '03adda785f069bcb87059f564f29cc1cf19a29ee88d3f7d736ce269dc3666b671e',
        "m/86'/0'/2147483646'/0/0":
          '028d377d65d86d99dcd1b883766f3eded3baaff4758523740b0e6bcbe9971d0147',
        "m/86'/0'/2147483647'/0/0":
          '034386a16793f36902ef338e33ed47a85a3ffd0dd0457a4350ad60bc841be651b2',
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/60'/0'/0/0": '0x0390c70f4f63b36b67e60120ef8d6028501ff1888358b325072756f65f4b564cd6',
        "m/44'/60'/1'/0/0": '0x021c349bd3dea8d97e804b2bc6d0e694438ea1b7a87d5c04787c2949a98988fbf9',
        "m/44'/60'/21234567'/0/0":
          '0x0358727406a5f75fb844a27ed3608b154bf8b9edfdf0d39a06589604eb31aadd73',
        "m/44'/60'/2147483646'/0/0":
          '0x02c7e350db7dce0723fb4f8925eb83fa19c8f9c1da7ea475610963a37610ef6292',
        "m/44'/60'/2147483647'/0/0":
          '0x03c27ed8d8ec74769065cd72197ebb79d7777a8215516e78da049cd1622d0b53b0',
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
        "m/44'/118'/0'/0/0": '023c792ed5b5e88b0c2223c44162e3c295c4b06603e6e3bf7531e56a879bde71ff',
        "m/44'/118'/1'/0/0": '027881adc499385980680846a0d79657e1fd1d519454095477cc07a272326412f8',
        "m/44'/118'/21234567'/0/0":
          '03c257c3fcbd2ec3e02fdcaf657fc0f0ab34477da8da31248a271543a29fa4ee7d',
        "m/44'/118'/2147483646'/0/0":
          '02c86b334c6a05b49c05d6ec56e7bd47f36d5bdb842189741e73004192692012cd',
        "m/44'/118'/2147483647'/0/0":
          '0250db42fefdeafa9a9043f6add3c2046131a8af06c69697008a18afbf91222e32',
      },
    },
    {
      method: 'suiGetPublicKey',
      name: 'suiGetPublicKey',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/784'/0'/0'/0'": '0082eeedb7980191e19fb54429c00879c72a47dec40055e0f3388751a4df4b40b5',
        "m/44'/784'/1'/0'/0'": '0000a3a860eb893135842949c8c6a59cdc4e7779da4ac4a2d55733fc06b51acf8f',
        "m/44'/784'/21234567'/0'/0'":
          '009feffd50da0b68292f044f8766f25753431b40fe5f3a73c8ec9cb518f78f4f21',
        "m/44'/784'/2147483646'/0'/0'":
          '00063a7c99234428dfa0ffb3cc324f2890a9294fe424a873e0512041016c4ec4a1',
        "m/44'/784'/2147483647'/0'/0'":
          '00985076a406d7d3e311a76060421f52853e28559f18df3ea254850f58f74bff4b',
      },
    },
    {
      method: 'aptosGetPublicKey',
      name: 'aptosGetPublicKey',
      params: {
        path: "m/44'/637'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/637'/0'/0'/0'": '451ed07b4494b84c62b0049e625d43d3195641f44b38aadac4666b4561178f72',
        "m/44'/637'/1'/0'/0'": '64db5ac51b8778e7230ff89b987b6132010d93700222893fb726da0214e15049',
        "m/44'/637'/21234567'/0'/0'":
          'b592cc6d37af271d6023651e916c2e99f1b219cab352956f5921e46db078419f',
        "m/44'/637'/2147483646'/0'/0'":
          '6ac7497c615cfb65de05914efe20f260becf1bba52814fa70ef5ba967b88506c',
        "m/44'/637'/2147483647'/0'/0'":
          'd7c637f684a9bdd02361cae7128827215730c5d24819d8f33acf3cf3c2f65098',
      },
    },
    {
      method: 'nostrGetPublicKey',
      name: 'nostrGetPublicKey',
      params: {
        path: "m/44'/1237'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/1237'/0'/0/0": '54898c201f852b4b5d36ab2a91442e2aeae4b3ba2059678a5fb8dbe2604a1e2a',
        "m/44'/1237'/1'/0/0": '491a9c1be8d463c8afb9690396144b2cfce837c0fe0a48a636985ab3549af766',
        "m/44'/1237'/21234567'/0/0":
          '7aad9885f3e4bb42fb8c8c3dfbf352e5c3c9b4f8f19675787c8564d04cf892ca',
        "m/44'/1237'/2147483646'/0/0":
          'a994f3379fcd30f898059971a15bb39d223cd6e20fbc5a1ea98d7211f64fa0b1',
        "m/44'/1237'/2147483647'/0/0":
          '02fe97a37d7dd623cbbe8c96c0a84c778e77cc07faf621e8de4cb74cdee34b6b',
      },
    },
  ],
};
