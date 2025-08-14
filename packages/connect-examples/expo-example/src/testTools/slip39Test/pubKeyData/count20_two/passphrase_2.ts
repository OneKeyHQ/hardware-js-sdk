import type { SLIP39TestCaseData } from '../../types';

export const count20TwoPassphrase2: SLIP39TestCaseData = {
  id: 'count20_two_passphrase_2',
  name: 'count20_two_passphrase_2',
  description: '2-of-3 (20 words each) + passphrase_2',
  passphrase: "qwertyuiopasdfghjklzxcvbnm1234567890-=[];',./12345",
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
        "m/44'/0'/0'/0/0": '0359f52a39fce3ba44e8a84866bc4fe9233cd9a1cd4c699b54d26192dcba579adf',
        "m/44'/0'/1'/0/0": '02e380ec44f1639dc7bdf48451d7a02f5fd7d80250c1cb23da527f4a03be3285bd',
        "m/44'/0'/21234567'/0/0":
          '039c374a836a9e0da87ddc56391fbf3043bcb82c76af1bf856051f8423c9e107ba',
        "m/44'/0'/2147483646'/0/0":
          '03f728d24540ca8db8216573743428bc05f1b579d4781b44ece1f97dc58e71e0a8',
        "m/44'/0'/2147483647'/0/0":
          '02bf2cda28556b749630738eeb02ae7f161b6485553f1cf4fea44c7a35f3846188',
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
        "m/49'/0'/0'/0/0": '039829bbac25babf180604495c3b1eae84aba6e0b22b568f8b3c5943598544b7d5',
        "m/49'/0'/1'/0/0": '03ebaaa1885cc5111aff630b90e301c09e61542e54901478aa2346f69b94a658b7',
        "m/49'/0'/21234567'/0/0":
          '03942a7c122ff8fc9b8afdd0b9c791c52da9da7028d5c95fb01797f18ecc803872',
        "m/49'/0'/2147483646'/0/0":
          '03166d16e853de6d7ad0fddb41f32e3029bd28d7a95f0939f27d93748cebd56fc9',
        "m/49'/0'/2147483647'/0/0":
          '0302a78205ba2b6fbe7ee789e3aea620d6f0a72c729a8a5d74afcf82a972ad3723',
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
        "m/84'/0'/0'/0/0": '027492aa01fbd13561c63b3c351a634e09b28b17e69d539f6e525059d42d41c172',
        "m/84'/0'/1'/0/0": '024ef8c1502bdb403ddf72ea83e9e3b6d6e92e9e123f63eb7b277ffaf5cb7fa9b8',
        "m/84'/0'/21234567'/0/0":
          '038696121b4445582e0b8898b0c826f1bc36de9d01056e8fab4129902962332f63',
        "m/84'/0'/2147483646'/0/0":
          '034ac50abaa5b98ff1c5707a2a2bdec03dd2c0582971ad1cd8f1be66ba1a8abf22',
        "m/84'/0'/2147483647'/0/0":
          '02034404bb8cb3ff8844721d48c2cd51aac08b35fd560f367c733c238efe1e4fe6',
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
        "m/86'/0'/0'/0/0": '03c88ab32769682fa86a2386da20aea66f63f0c40dbdbd2d6b74d83a1f972c3521',
        "m/86'/0'/1'/0/0": '021e29f6cf975dce0f8c91a752a0a685b2e8e98d3e6f53afe513f69d01e850a3e1',
        "m/86'/0'/21234567'/0/0":
          '03b4a4081f2b7182490c107e2184d8cbb83b3a552f4a96781272e89b67d49e6a8f',
        "m/86'/0'/2147483646'/0/0":
          '02db41c22f92dd861b632517eb911cc7edcdf03549b7d564bdb8ac3aef078e5c3f',
        "m/86'/0'/2147483647'/0/0":
          '02af09290d655b4eeb906b1608cfe4a74f2e479879fd3442933bf22fca92781737',
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/60'/0'/0/0": '0x03a01c8a6fbde0cbde94c9228383fad1bd54f09aa85bfe9e087c6b783ec286a33e',
        "m/44'/60'/1'/0/0": '0x0396aedb44990b4892172d3c22b57889394889b75784ab8ad8b1179303ed38e70c',
        "m/44'/60'/21234567'/0/0":
          '0x02c854e2c7cf0ffef1e4577837212c966ff1ebfdf8aa4afe6c18dd75fe0ca4ed5e',
        "m/44'/60'/2147483646'/0/0":
          '0x0334a60fc32dbbb18ca666229e6d14dfc2f3d0568f6da20aa0dd86bb2d994f924d',
        "m/44'/60'/2147483647'/0/0":
          '0x03e20b557daf9b8f32a3650468b1975abc850a4173269990f8f3f8a51e9e5f149f',
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
        "m/44'/118'/0'/0/0": '03d5e2fb2f18a61c45c64ee625c1543e09bf2eacec1fb1a050660bed36732fe0ca',
        "m/44'/118'/1'/0/0": '0231a68788fb436ca64bb2530249bfc819efc9963c9d568c949ffbffb78840c334',
        "m/44'/118'/21234567'/0/0":
          '035c2118f818cd15dd4c51e7d5f6dcd27c08a08d96c0d5f4ec44c4249bd5c84c03',
        "m/44'/118'/2147483646'/0/0":
          '03d265c66abbfd28fc2a0b960356975db62685209e854c60b1fca5c9957c5b208f',
        "m/44'/118'/2147483647'/0/0":
          '028a34d1965af0a2bd2130aa57b89c98f0b5f0a2d0ec0d61b0fffb03e20ace294d',
      },
    },
    {
      method: 'suiGetPublicKey',
      name: 'suiGetPublicKey',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/784'/0'/0'/0'": '002b9b3794c6bf3e1c92181d9c84fd78db9bc735961e5453d679e17b48d9381870',
        "m/44'/784'/1'/0'/0'": '008c52a765b2ded6108807e67354330784fe45b008098bfde103164fabb00bf19d',
        "m/44'/784'/21234567'/0'/0'":
          '0095473c62c8c34326c7939b0f9b547bc39452c7fd20753f261ff5b8ea58b4ded0',
        "m/44'/784'/2147483646'/0'/0'":
          '0075270d4ea439f84ce2f6e8fe25cd9b9d5152ab216bc01d1eba0ed82e69d25173',
        "m/44'/784'/2147483647'/0'/0'":
          '0088b06025ac61537e9fe3a0e58075b6b73a47b0a52597663dcf850338a53d0227',
      },
    },
    {
      method: 'aptosGetPublicKey',
      name: 'aptosGetPublicKey',
      params: {
        path: "m/44'/637'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/637'/0'/0'/0'": '8dd24ec86d1f3ca54101701d94e2aa30988f60b03b8363aca92fa5c3a5d724fc',
        "m/44'/637'/1'/0'/0'": '23c39fe161231cf2dce239978622d03e09da8c48164ea367d3368c507480c40f',
        "m/44'/637'/21234567'/0'/0'":
          '7a6e982e5380d85dafdadd2f346d28a7c02c071f4d40358a10856ec09ae03529',
        "m/44'/637'/2147483646'/0'/0'":
          'dc9612bcc11c427474ee90b192b8536b17dd61a3842d0efb83e3bacef36a37cc',
        "m/44'/637'/2147483647'/0'/0'":
          '664876a664436d37804c89b24e874064bedeeee71fdcc291101f1ca03fe8f7df',
      },
    },
    {
      method: 'nostrGetPublicKey',
      name: 'nostrGetPublicKey',
      params: {
        path: "m/44'/1237'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/1237'/0'/0/0": '9405b4fca5cd4b9219b292753af19caec2961b7f74cb0186f46d08b944526b7c',
        "m/44'/1237'/1'/0/0": '7f10509b1db61923fffecfb697b7f9712d97849a80b9d8fe1dc77e11bc6867cc',
        "m/44'/1237'/21234567'/0/0":
          '17c7febab452684168c22d0a3bf64377e46ab8b0e1886a57334ccf6435e1ab30',
        "m/44'/1237'/2147483646'/0/0":
          'c081651d3e2d2e3b7dc2fa9713602bf1b19649ad641fc555610ab7b92b06421a',
        "m/44'/1237'/2147483647'/0/0":
          '702e79ba82ef47d1c92ff2846bf7162d4ee25b1e87bf6a696ca5fee77db34158',
      },
    },
  ],
};
