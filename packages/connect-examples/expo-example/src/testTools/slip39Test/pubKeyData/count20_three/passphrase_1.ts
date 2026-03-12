import type { SLIP39TestCaseData } from '../../types';

export const count20ThreePassphrase1: SLIP39TestCaseData = {
  "id": "count20_three_passphrase_1",
  "name": "count20_three_passphrase_1",
  "description": "16-of-16 (20 words each) + passphrase_1",
  "passphrase": "12345",
  "shares": [
    "platform helpful academic afraid custody blind shaft burning visual prune knit clay mason genuine march crisis smug wits woman taught",
    "platform helpful academic alto armed theory alpha paces welcome quick quiet device craft strike chemical ocean briefing space phantom legal",
    "platform helpful academic anxiety cage sympathy dramatic western acrobat transfer oral spew package style scroll pajamas curious grant center alto",
    "platform helpful academic award cards category salt guest pharmacy devote pistol focus identify infant evoke recall shaft empty hazard romantic",
    "platform helpful academic bike clogs estate duke thank bolt floral race phrase preach seafood strategy industry crowd length grant yield",
    "platform helpful academic bracelet clock daughter memory visitor result blanket garbage starting speak clay junction pitch ladybug jacket fluff ultimate",
    "platform helpful academic burning credit install sidewalk level museum evening permit duke cards findings aunt document improve woman general august",
    "platform helpful academic carve ajar edge similar glance darkness random envelope glen ancestor gums view venture wealthy learn ivory exotic",
    "platform helpful academic class depend gather story empty harvest overall craft leaves nuclear reject kernel that temple width presence speak",
    "platform helpful academic company adequate western resident dismiss mortgage emperor coastal sack example ancestor mason length mama timber rhythm buyer",
    "platform helpful academic crucial domain bedroom violence mental multiple language sympathy grin beaver salt excuse pants worthy vegan prepare unfold",
    "platform helpful academic deadline crush depart thank pregnant treat salon ambition miracle sidewalk speak practice taxi soldier scholar vitamins junk",
    "platform helpful academic deploy chemical afraid justice undergo deny excuse famous entrance scene early photo glance salon platform wildlife ladle",
    "platform helpful academic diploma cricket trend loud replace rapids payment paces theory easel spine cultural dictate hormone necklace blimp exact",
    "platform helpful academic dragon company true volume carve dough endorse force plot cinema remember skin transfer criminal hunting axle mayor",
    "platform helpful academic easel deadline evil museum spill funding muscle retreat smart timely oven transfer grownup deal armed merchant flash"
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
        "m/44'/0'/0'/0/0": "038a5f5a8cab1f0d972c3dcb61f9972a244f8568bc730361293c288bb9b2d9c5c9",
        "m/44'/0'/1'/0/0": "036981a04faa3374c5701b52c79bcbd89082b2d8f5ec63c500c2d5a4508ce7b95e",
        "m/44'/0'/21234567'/0/0": "027d250eb33485e67c118ecc51aa2c435f7606a60677f55b06f3a44d8186b1df98",
        "m/44'/0'/2147483646'/0/0": "030e3a99dc65addc2322a6550834a8b8d49ce7de1ee12a91cdbeac5c1b74aef693",
        "m/44'/0'/2147483647'/0/0": "0321e6f86bd76b8ad93280658a70f3d6a68ca68b010e45a087f0efe01d3ecd5dd5"
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
        "m/49'/0'/0'/0/0": "02c9653bcb33dce181579f625734c94eb97e6a10df0fa4958df9a3e686e9c456e5",
        "m/49'/0'/1'/0/0": "03c22ebda44dca847a6bb181c5f1cd079a85512ff42128f9586dadf24dce7d059a",
        "m/49'/0'/21234567'/0/0": "022d214fc9bc74868e5d42113b550f5cd1e5c1c93b170e19aa1d6c7cf68217a7dc",
        "m/49'/0'/2147483646'/0/0": "028369dbc217758e378f2efa8f5506cd71fb9774d8779cdc8e66398c542d69e8f1",
        "m/49'/0'/2147483647'/0/0": "02c7286a49e361aa63a2b861c9fb919fc579fec0c43fbca1c9ef8a955c7ab8c9b6"
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
        "m/84'/0'/0'/0/0": "030d898772dcf65f597831d05ef8139c4656bdbf43fb61bbdd5408c9a562d5759a",
        "m/84'/0'/1'/0/0": "035737728fd41a2e4293a04b7255ea22f571796c1056bd39650e3c49728f4d0298",
        "m/84'/0'/21234567'/0/0": "028fe47d7fdfbb30146b0d8bda2e0c44e41a98784bea0619f2ee1651ae5d1e71f5",
        "m/84'/0'/2147483646'/0/0": "03cbbd5324ce9ea2bf29009b115d50e520a7a1a8fa5e3da3b6860f24f3c45a25ec",
        "m/84'/0'/2147483647'/0/0": "036467aa286c7f1ef2bab75696111be63d86febbfd25dddc940504051470039f1f"
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
        "m/86'/0'/0'/0/0": "02b7cd15a7099c70f1217fbf0adafedae46e30abb2dcd222340701dc4e63bc7519",
        "m/86'/0'/1'/0/0": "03e38d3a9a3d482a354236426673718c3e8d4edce2058e348622384daae0f5f22c",
        "m/86'/0'/21234567'/0/0": "022e3555e43febc25f80991167ca9dabbf96a9b302d13ab805c26198e834000ba9",
        "m/86'/0'/2147483646'/0/0": "036039d0f2e61c641237a0690c8415ee84bd7df6bab716f25a64146d98e69b440f",
        "m/86'/0'/2147483647'/0/0": "02aac7a8100b41ee495c94fceb6a9c552d96ceb9270af0e6392ab80dd816435653"
      }
    },
    {
      "method": "evmGetPublicKey",
      "name": "evmGetPublicKey-Ethereum",
      "params": {
        "path": "m/44'/60'/$$INDEX$$'/0/0"
      },
      "expectedPublicKey": {
        "m/44'/60'/0'/0/0": "0x0343dbb11709dc0fca56fe0f901f15af4333728563e89dd077dba3df76920a5843",
        "m/44'/60'/1'/0/0": "0x02960c087e1e2d1b78b21453897bd0eadef4ecbe9b6069dc1838620b009cb809a0",
        "m/44'/60'/21234567'/0/0": "0x030ad67e36315f1b7a610e52d0f044072d27bd9a36fd40bf5925b54da430072e01",
        "m/44'/60'/2147483646'/0/0": "0x038dd4e27dbf8216b46acf43ea7559bda9aeb6b4f80b9d783931583568da5ba40b",
        "m/44'/60'/2147483647'/0/0": "0x03bd5d253750a122591b6662ac49c19d437018945a7e50e4bf096703fa267b3be9"
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
        "m/44'/118'/0'/0/0": "02222e1fd25ff9e5572bd2ee395ba30c824f97ef5ed72d100427cb344f0de3e9ef",
        "m/44'/118'/1'/0/0": "033548e7a331ef1738706474ff80b4b2d323b7933e94b076fcf5558a66647715be",
        "m/44'/118'/21234567'/0/0": "02dda997d53ca03e964814429e7fbbba8980d336044b607667fa796b0a4ccb9853",
        "m/44'/118'/2147483646'/0/0": "037eaaf2ce5a90f48562cc4463800fefb4e367f6d5cd9364702084d7f797ea3743",
        "m/44'/118'/2147483647'/0/0": "03718fdb4ff97e6b86c847ea5dc2c9f0fd6140477493e122637878ba5e3cc1f839"
      }
    },
    {
      "method": "suiGetPublicKey",
      "name": "suiGetPublicKey",
      "params": {
        "path": "m/44'/784'/$$INDEX$$'/0'/0'"
      },
      "expectedPublicKey": {
        "m/44'/784'/0'/0'/0'": "00aebf8272fdac41d5822b13274c05a31761eb8da454aa9d3df8114cd3a59b0bce",
        "m/44'/784'/1'/0'/0'": "00c41809bee42d6cb8f5fe664909c38e152956dd5fc748053902901d418473521c",
        "m/44'/784'/21234567'/0'/0'": "00c42e6ed1ff52e91c55ab383f398ae548cf66783b03f31ef421f2de6d40e6ea43",
        "m/44'/784'/2147483646'/0'/0'": "006a3b6f3445be3dde993ab1986fcb6b84c058284b23041f26d590a24d4ffd81f0",
        "m/44'/784'/2147483647'/0'/0'": "00d58506810d93619b5f0a252d5d0fddc3e7787bfaa465112d1bf358aa6f0d5ff9"
      }
    },
    {
      "method": "aptosGetPublicKey",
      "name": "aptosGetPublicKey",
      "params": {
        "path": "m/44'/637'/$$INDEX$$'/0'/0'"
      },
      "expectedPublicKey": {
        "m/44'/637'/0'/0'/0'": "c032d0586bfef49345e293fde436813637c7b97adbe92c9aa4f5ce3e6f319043",
        "m/44'/637'/1'/0'/0'": "50c3f9d400374a300ef820cff7c49a6e4ea16cd9e1b995610e04317068699397",
        "m/44'/637'/21234567'/0'/0'": "103086a0bd0c163195eb333d29b2749d494818ff0ebf69f3d06fdf80f32b2c42",
        "m/44'/637'/2147483646'/0'/0'": "19a3ce975d1fd0a1d74462b72f89091a1ec1b54d9cf15e2bc47aecb1e08a1de0",
        "m/44'/637'/2147483647'/0'/0'": "a538629b8f74e680fc578756a9622cd67bd5c53407cc31589c58ca0339e923ba"
      }
    },
    {
      "method": "nostrGetPublicKey",
      "name": "nostrGetPublicKey",
      "params": {
        "path": "m/44'/1237'/$$INDEX$$'/0/0"
      },
      "expectedPublicKey": {
        "m/44'/1237'/0'/0/0": "9a0313b8513df65cb869a35083fec37c3a80761f6d91ed8b2e24f90674d354b4",
        "m/44'/1237'/1'/0/0": "9e84f801800c56bdb9edc112f24d9282a8fa09ac44aa40ad2514a2670792be62",
        "m/44'/1237'/21234567'/0/0": "b8a58d1d4e68999936074f5a7d7563e79512fee0fda99ccdf94a74c7508ff3d1",
        "m/44'/1237'/2147483646'/0/0": "2bb24de2ab08b2e074b4089dc6a8ba23138551dcddc30547a69410b9bf988a3d",
        "m/44'/1237'/2147483647'/0/0": "d095df76249786a9bef2d78548c0628a270e90301095ba46745d4e07ca49d630"
      }
    }
  ]
};
