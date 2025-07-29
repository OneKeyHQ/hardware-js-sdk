import type { SLIP39TestCaseData } from '../../types';

export const count20OnePassphrase2: SLIP39TestCaseData = {
  id: 'count20_one_passphrase_2',
  name: 'count20_one_passphrase_2',
  description: '1-of-1 (20 words) + passphrase_2',
  passphrase: "qwertyuiopasdfghjklzxcvbnm1234567890-=[];',./12345",
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
        "m/44'/0'/0'/0/0": '023579e55ee4235886be3e927ea5c997414e2d1440b2097a6e9f587f409d75c538',
        "m/44'/0'/1'/0/0": '032070698f8a37921c6be5ba2b38efb0648962d5fcb6c7eb482927e85ef079aa13',
        "m/44'/0'/21234567'/0/0":
          '03b688df5a9d8ea04b1a06270805d54b935dbe8bbe8d6a23a859c75a06866c9dd1',
        "m/44'/0'/2147483646'/0/0":
          '0211c4cae098e0c31b7a873f8ec42eda2b1229827a74819e6daa66bb5fc261d27d',
        "m/44'/0'/2147483647'/0/0":
          '03029f5bcab74a6d9c39eca596a309337630d616409aeddc7398f77f7d46537e07',
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
        "m/49'/0'/0'/0/0": '02a63585e7b4eb981c6b7267bc00c8bb66046667d9057306780cdc850d9e2dade0',
        "m/49'/0'/1'/0/0": '0312f9832e3f480494cdf50af0a8f4ea6d35ba293ea6824906670924bf9c605025',
        "m/49'/0'/21234567'/0/0":
          '028dba4c91314c0c25be1db0ed7e145b7d87b55d26380c4994220f41b719be47d3',
        "m/49'/0'/2147483646'/0/0":
          '03d395da7abdb9f892b6e7c6430ab3e8dd94d747e61a0d1f50cd93a63651f5a941',
        "m/49'/0'/2147483647'/0/0":
          '02f580346fe3462276bbdff00301c64ea104643d346810b80d38bcfe764e3b8f3a',
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
        "m/84'/0'/0'/0/0": '02601cefeda9302155913d6fa012a1eebd097fcab4ffbff2ce8e027f3ee02002cc',
        "m/84'/0'/1'/0/0": '0382dcd855913bed840b80e9b8c246b07326f98e0f64ef627b7baad9dfaa40bb9a',
        "m/84'/0'/21234567'/0/0":
          '021fdef8a5d54b2745bd90679ad2bfc1a6dae5c96369c548e2d2ae82f6bb1a5755',
        "m/84'/0'/2147483646'/0/0":
          '039c2600f87c9c1bc36894a9abf3e3bb136ae1ce80f62e8c6378b133262ce57eba',
        "m/84'/0'/2147483647'/0/0":
          '0316bc1a2e38b03b5d7d65902523e987c7b6a031100480563674d50b3f9fae39ce',
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
        "m/86'/0'/0'/0/0": '03d94da5243c4ebc0f279ecbdb1d190a874c584738bdd398444c7bc4802e603baf',
        "m/86'/0'/1'/0/0": '031013ecb79b4710defb9206f1186fa087afdd104b5a3d3a86d64e9c03c3a208fd',
        "m/86'/0'/21234567'/0/0":
          '028e85e477e70cdb8b6b517f6195304c280d1513115c0815e4d08da27ecc1e5b5b',
        "m/86'/0'/2147483646'/0/0":
          '03e730f9e700ff36ec9df3e49f825426e048f5267cb9bab9663f7541d6b476d9c3',
        "m/86'/0'/2147483647'/0/0":
          '03691738d50fd259ec4fe09e49b7514ee4de61a1916be0af3f8063b7bcc15daca8',
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/60'/0'/0/0": '0x03bb09efc64a487a02e5eed6c0c14390b356a2ae185cc99342d4f8e78d9baceda5',
        "m/44'/60'/1'/0/0": '0x039dd84cc0c40a41cd6efad55dfacb8b39033359a74a2847132b18261970308f5b',
        "m/44'/60'/21234567'/0/0":
          '0x028d4e453a1dfe9f87e27891b8d705ae1795226e4be8fe5c17bad0245f77aa16cf',
        "m/44'/60'/2147483646'/0/0":
          '0x03ad7169bc229c1534e839071e451054467ba4f9a1cef3b9e2b79c5ea268f909ce',
        "m/44'/60'/2147483647'/0/0":
          '0x0300843f48d7eac0645c4cc54d4f30e5c99133efac63a7c0c4441e44cd601bae78',
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
        "m/44'/118'/0'/0/0": '03b961c8fc59ad8f6bc30582cd12c0f4ba19f33976763981e8f53cb0c2a51ac1e6',
        "m/44'/118'/1'/0/0": '0371217287d274d147e61256959c56531b66008bcb48c0bca393ee288b5c759e36',
        "m/44'/118'/21234567'/0/0":
          '03d8a30f9611827c99de894d67e4dc4c56115a9f01b82b05d072b4b555eee98aca',
        "m/44'/118'/2147483646'/0/0":
          '03f03aeaf9bdbeefcf934cf9dbff84a2973b91c1fcd85bbb4babeffc9ba01168dd',
        "m/44'/118'/2147483647'/0/0":
          '021560375947edcba2c1d942d9e30dc40987e4a1b2b82d1c16a4692172722e55f4',
      },
    },
    {
      method: 'suiGetPublicKey',
      name: 'suiGetPublicKey',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/784'/0'/0'/0'": '00c74387458be04f878b96c5980e9098c21c614c5a79151782b0b970b3e4be109b',
        "m/44'/784'/1'/0'/0'": '001a9b9f2a8b0464d64d34bbba0c905267e46d1f2b18e2b9bc5f7ee71ef050c5d2',
        "m/44'/784'/21234567'/0'/0'":
          '004aa9ec29234b2e5e8460bfbdf0a9cb37a1527fc9c1cb9a1df3ed6f29313b3985',
        "m/44'/784'/2147483646'/0'/0'":
          '0078744521e6ec682b97de3de5d3453fa52b7c4116edc31b52b8bc4c3bb82baf1a',
        "m/44'/784'/2147483647'/0'/0'":
          '004e6389de4ac9a53a5694dc42bce48f2fcd5ffc1e648d1dfceb3ec852a417dfa4',
      },
    },
    {
      method: 'aptosGetPublicKey',
      name: 'aptosGetPublicKey',
      params: {
        path: "m/44'/637'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/637'/0'/0'/0'": '396548eb853ef5170887394fd6219bcf21dbb079996415f5b5cec65cc074d969',
        "m/44'/637'/1'/0'/0'": '81f984940f0449c373eec532c8af990f5c531c7b4ed4cdec0940b2fd0ee74d4e',
        "m/44'/637'/21234567'/0'/0'":
          '4656b43205160de2bf7c589bbd09bf25c75de922677dfa5979764f5a5551e5aa',
        "m/44'/637'/2147483646'/0'/0'":
          'c1065d0a0ea97d2d1c874ed2f71528a43e2f7d2c0c49e025bd725a89586ada84',
        "m/44'/637'/2147483647'/0'/0'":
          '1ef4fd9fbc2e4e397cb88fd5dea2bc24b82bd5558b902ffb17d98c092681f3fc',
      },
    },
    {
      method: 'nostrGetPublicKey',
      name: 'nostrGetPublicKey',
      params: {
        path: "m/44'/1237'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/1237'/0'/0/0": '29e4c907bddbde1208fe92a4a580223503f64e74cea9f69822628ea6500f964b',
        "m/44'/1237'/1'/0/0": '8fdd83053491223c262d53fb2efb7f0eb58dbc9e27cc147169df175a9b948d76',
        "m/44'/1237'/21234567'/0/0":
          'eb4bb448b220f4994a19334fbb5a89df102844afc86f5d2e41235f01427223af',
        "m/44'/1237'/2147483646'/0/0":
          '53ebc06bfa4ad73f139d00239b87803746ac473708cf60159a325391cddc6f49',
        "m/44'/1237'/2147483647'/0/0":
          '0ca0c6653842c249dffc7405aac57564b2493c459ba57b9eaa970ef924d94ff7',
      },
    },
  ],
};
