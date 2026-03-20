import type { SLIP39TestCaseData } from '../../types';

export const count20OnePassphraseEmpty: SLIP39TestCaseData = {
  id: 'count20_one_passphrase_empty',
  name: 'count20_one_passphrase_empty',
  description: '1-of-1 (20 words) + passphrase_empty',
  passphrase: '',
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
        "m/44'/0'/0'/0/0": '023b56ad511a1bb36109bb38d26b90257544606347c2d74985f6b62dfada7d8057',
        "m/44'/0'/1'/0/0": '02b1509bae399ba44f62143a1124040e4b29e17e17931fc20eb4c9d01990640625',
        "m/44'/0'/21234567'/0/0":
          '02cb00b5d48d19108d81ce6107a2d7ef1f422dbbbb596f77058bef0b2725c72f18',
        "m/44'/0'/2147483646'/0/0":
          '024d99ee7dab3579d823e882114df11955814eb63953e5001b9e2f88fc18c5c453',
        "m/44'/0'/2147483647'/0/0":
          '025ddadfd93ba71156c69828d12a196f9c39e0715d0ce276e70c94e79edfb942cc',
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
        "m/49'/0'/0'/0/0": '038590480c9dfea4fc2acfc211472410eeefb7be82cb4ba525d5a1fb26d4912eae',
        "m/49'/0'/1'/0/0": '0281f3e6610714f338e8f6076a93d788b6b6552225555e99ac1857f35d48834e4e',
        "m/49'/0'/21234567'/0/0":
          '0260f5b5602d052ad78d3b5f78f812932ccf7a2d057dce40da89c774fdb24801f9',
        "m/49'/0'/2147483646'/0/0":
          '031bca0510449495a354ae302f8adecc488edbfdb04f8f2d6e0afca98e8c69a5de',
        "m/49'/0'/2147483647'/0/0":
          '03a79bafe3ffb9756116f9398c3c4a40cf513e8db07b6c3967a8091ea5ff69dc5b',
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
        "m/84'/0'/0'/0/0": '02077d532889074478a89b707cf5f09228152e093d499d95674fa80a52fa3206d7',
        "m/84'/0'/1'/0/0": '02a866564591c5a25eba0730cd26564a41145e09de07f64897413730acd71c6b95',
        "m/84'/0'/21234567'/0/0":
          '0205732cd7a6056699a38f7b6b4327c2103f382f67e6a3c71f008f5db6ae4e8277',
        "m/84'/0'/2147483646'/0/0":
          '03871f1a1f245090c49fdccbcb61af1fe9339ef819d4aa213f70542ca3ac9d5678',
        "m/84'/0'/2147483647'/0/0":
          '03bdf20b5a0af9e22aaf68d4bae2ff98f5df12ea52e4a6be4ecad491f1983bb9ee',
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
        "m/86'/0'/0'/0/0": '03ac922f162c4c423215e5b015a7462553c2dd9d2adcf5ac1f5db1c485c047511c',
        "m/86'/0'/1'/0/0": '02c08285d7dc83aa24de96976e9a4ceeb4a51d6cae1e2ec1d96fd341030e7bbd0d',
        "m/86'/0'/21234567'/0/0":
          '025dc37549fc4cc6b1d0909635ad7d6184c82bff1683f9bad6145ce78825d3fd87',
        "m/86'/0'/2147483646'/0/0":
          '02b8ca271c6e1f81233f506456599129d33538fc1c675d22cf0a78e4d3a58b9985',
        "m/86'/0'/2147483647'/0/0":
          '03044978ce92166c4557ac313ba3e9ea9538bb5c231fb62a7b4596e00af6cedd13',
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/60'/0'/0/0": '0x0323e2bad2e6d341a997a8290b5f6d0e52720c34bc7193ea8cfb0e537925219466',
        "m/44'/60'/1'/0/0": '0x025ce17cf54c64252d2ae46c4c0aab8abaa929bf78b2ba4b9f6dd1f73bf5c8e18b',
        "m/44'/60'/21234567'/0/0":
          '0x022fc0b5ef9f9ef7b27407581981d14b100700c278dd806ae8649d4ec2140d4138',
        "m/44'/60'/2147483646'/0/0":
          '0x0210bf9ea441eca8b22f16a0dbb2024d5df80a79d0b8fc9a27fb6985074840183f',
        "m/44'/60'/2147483647'/0/0":
          '0x03d4f4bc0c45129485c4bdd991d78f75e9e972cfa0ff187cdb9c799d297d86452a',
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
        "m/44'/118'/0'/0/0": '034821b4744dbc8c236b1f0b392a4ebb195340d78cd0e228b12febbe21cecda810',
        "m/44'/118'/1'/0/0": '02a880a46a4d6ffacd7e8cf167473d5b573e0f63786bb7abef9f12c52f3d107f7e',
        "m/44'/118'/21234567'/0/0":
          '033d45aaaf2adf92e0fa75bf82f61c424b50554af9a478dc5441c9dcb887b8d94e',
        "m/44'/118'/2147483646'/0/0":
          '022cd9a33eaa89c529d36088e40a2816970f30ac0f6a052313c12be91437e7bfa5',
        "m/44'/118'/2147483647'/0/0":
          '0227d6f9b5f410decf982ca541fcd23aa138bcf1209e6a2f9dbcc6cbb2f41efaa6',
      },
    },
    {
      method: 'suiGetPublicKey',
      name: 'suiGetPublicKey',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/784'/0'/0'/0'": '00da569eee03fba319e6bc5bef5cf95a49d58b86ffcda1cc6a524a75e0681f413f',
        "m/44'/784'/1'/0'/0'": '0002d74b86ce645627c23ac9c369d688700530ac4617a3d00c62cac64b5db7b72f',
        "m/44'/784'/21234567'/0'/0'":
          '00d567a5bd823b8129570092efdf8a663096d77abe36aaf84492c7271843e51bdc',
        "m/44'/784'/2147483646'/0'/0'":
          '005cf429f9b6ff963a2497accce278c574a999f0e902a6b48436c1daca6f1059eb',
        "m/44'/784'/2147483647'/0'/0'":
          '00cd8306ecdf880e6eb60b4e8880f724ca8a70c4d1fdccb2d1ad7e2215b61d96f7',
      },
    },
    {
      method: 'aptosGetPublicKey',
      name: 'aptosGetPublicKey',
      params: {
        path: "m/44'/637'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/637'/0'/0'/0'": '4a88aa7b9ce75aa29cb39984ab6a796bddaeb6233d8bcc2111ee8a46c98e8f2b',
        "m/44'/637'/1'/0'/0'": 'ed60216f1d95e754e9d309e704162cce2cb4fd9e2f7c80e959e7cb5ee688d356',
        "m/44'/637'/21234567'/0'/0'":
          '89b93285e84a00bad8e95f62332756619b0c22927816c8cdb0bed2cd6cc8bd50',
        "m/44'/637'/2147483646'/0'/0'":
          '35bc6b69a35dcc6e4878b6c9756eaafd164f7f23be7d06d0a2b9f39b3c4da6cc',
        "m/44'/637'/2147483647'/0'/0'":
          '631ebb93880d6ca548e1cf7906fe1280452a5a6f2928dfe703e3160e37faaedc',
      },
    },
    {
      method: 'nostrGetPublicKey',
      name: 'nostrGetPublicKey',
      params: {
        path: "m/44'/1237'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/1237'/0'/0/0": '1f0c649acc7c805d1152810f59f0f092824d44c9e2550cdd30ae7ebd22732f01',
        "m/44'/1237'/1'/0/0": 'ec8bbaa405af8b959786eac67f47c3ca69ca64a8e142a3576966d4fdbe493ae8',
        "m/44'/1237'/21234567'/0/0":
          '0949eee87279a86a65cd76b04c2d54074da54fc81b6b97181aae3f120c16a940',
        "m/44'/1237'/2147483646'/0/0":
          '8c0b1a3b9c6aa52997580630fb056928c7ccc9c34f60386146b69f1b83695fc2',
        "m/44'/1237'/2147483647'/0/0":
          'ebab4fd360a5cdff30c3298e5e965b75c93fd16a540d97bf7945b784deadc827',
      },
    },
  ],
};
