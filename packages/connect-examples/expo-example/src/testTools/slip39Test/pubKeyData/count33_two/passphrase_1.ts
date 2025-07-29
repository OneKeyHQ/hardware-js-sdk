import type { SLIP39TestCaseData } from '../../types';

export const count33TwoPassphrase1: SLIP39TestCaseData = {
  id: 'count33_two_passphrase_1',
  name: 'count33_two_passphrase_1',
  description: '2-of-3 (33 words each) + passphrase_1',
  passphrase: 'onekey',
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
        "m/44'/0'/0'/0/0": '0313eb0b2801a5648d7e3a207cf37ce7582db5f985b94ca4b036d1401d664e1783',
        "m/44'/0'/1'/0/0": '0363e6b050458f1ff2cd349c498750da97f4b99899410b19c445bee34ed6f6a89d',
        "m/44'/0'/21234567'/0/0":
          '029980bd457c2a524fd3e2630b3ffad823435fa89bde97b59d9d198de38d543c60',
        "m/44'/0'/2147483646'/0/0":
          '030676129f52529e8a96306ef110b8bbcd84eb85100d98fde4f58283ba7f921c26',
        "m/44'/0'/2147483647'/0/0":
          '0287fd4a64c873b2f25865b59dccc94e32fa31bec5898adc96df9bedfca40ed455',
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
        "m/49'/0'/0'/0/0": '03c5b99930fdac227d4852c165a8f244173aa6256caf98bb2556664a19cfd0fd3c',
        "m/49'/0'/1'/0/0": '0217f98ae4e9ee30af1c0f909a653f035d5bbb6a545ab002982a99cba4cc21573b',
        "m/49'/0'/21234567'/0/0":
          '025c983aaf8f8aefc8d4a74fb8c1356f277c0f7bcd21f941d43c8617acc99406d2',
        "m/49'/0'/2147483646'/0/0":
          '0326b104b1fb339ae80a87adb62f3ee5b0109be5fe7fdcc214b058892e2a1f4e38',
        "m/49'/0'/2147483647'/0/0":
          '03712b317513fb2c0eea8f9d1701268f3ded4a012c0096e8fe6778dfea9ff95769',
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
        "m/84'/0'/0'/0/0": '02dadad21f2f12cf9603d6e61d7d6cec5d35d3a2c5ea7211a1c46eee17e2113d2f',
        "m/84'/0'/1'/0/0": '0221d5c9c7179b0b507968a2ac2aca4b194977b408d98f438a7725f121624207e3',
        "m/84'/0'/21234567'/0/0":
          '022600e7392430f071811bb887904f283062484db8aeda25eebec92427fac6552b',
        "m/84'/0'/2147483646'/0/0":
          '0229b595ecf2834df5e23301a859f04546301f99f6120362fa9979054fdde9a634',
        "m/84'/0'/2147483647'/0/0":
          '03e16b4926a36c7f99f19e527e98bf56e1cff2fc626cae20c91c0180fc90bea7d5',
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
        "m/86'/0'/0'/0/0": '0241368328d67af432c51754484d9ba76b398cb0ac35a865d3ab13e82442fcde09',
        "m/86'/0'/1'/0/0": '0304d00f7dfefdc0f345bc10c3f237fe195d17830cda2efd7586e5236134bdc53c',
        "m/86'/0'/21234567'/0/0":
          '0382ca276a00cd619b24466b1517a8683e95be0681b978c13da8900414da6cd013',
        "m/86'/0'/2147483646'/0/0":
          '03526c41f33f7972d7d723b6d32559ce4e775022e56babcfebf785a6e0bfd3ead7',
        "m/86'/0'/2147483647'/0/0":
          '03d47a48a47f7b2289ebed82cd51515abec138c7a6c3ace9cc3883dc085aa4295a',
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/60'/0'/0/0": '0x03975cfdda92f3dbc2afed8d2f659c589e8fd2428ac96fff579689bfd5e617635e',
        "m/44'/60'/1'/0/0": '0x02bcee90b49a9b8b463fe159be8baae126c363906fca3638e03f32a0d26c2f1248',
        "m/44'/60'/21234567'/0/0":
          '0x03e8f33eaca2fc79291daeb96b593dad4d85ba5601a0ef11716e12b12eb5511649',
        "m/44'/60'/2147483646'/0/0":
          '0x0248a8dd8c52e37a6a16522798fd3f26751c801f7b700e1eee6ce8648e6c42e65f',
        "m/44'/60'/2147483647'/0/0":
          '0x02363c6703d8515842d54cba714a569409c43749ec14de9fe022132c4b3cf0708d',
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
        "m/44'/118'/0'/0/0": '03111318f730de68f874d786f6cd52c81828006e7c5afe0fa94073307b6d376c90',
        "m/44'/118'/1'/0/0": '03718d1987ba9c0e943a97845d561016ead0ac4087add13c0c1351d721e1734bf9',
        "m/44'/118'/21234567'/0/0":
          '02c5bbec92d98bdb91c7ee971cba4c4eec48484c4f4768113c2455d6b241c469f1',
        "m/44'/118'/2147483646'/0/0":
          '022aa44a071cd64b9f2e941cf997794dec3f36aef3284092e953ee4a4e96f78879',
        "m/44'/118'/2147483647'/0/0":
          '02d0c8797827d9c0e0e70b385eb1f7b8d1f21cd5d4111b74a2be6875960b8e997d',
      },
    },
    {
      method: 'suiGetPublicKey',
      name: 'suiGetPublicKey',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/784'/0'/0'/0'": '00d79997dded7adb9f078196832892a460b0579a710db5d1f667bd6f8d84ef2a17',
        "m/44'/784'/1'/0'/0'": '005529d584e360b42fa5b796484d104c844c1863b13bdb96b2d9047aff9b2a1981',
        "m/44'/784'/21234567'/0'/0'":
          '008757168bdef065f421afe959104648a93f0cadd82e04b713068639d0492d1a14',
        "m/44'/784'/2147483646'/0'/0'":
          '00435b11f98989696641a328aa7612c54ffcc2822de0ba83a4c15fa383353445a1',
        "m/44'/784'/2147483647'/0'/0'":
          '00649ff9bf929b7f6547e78ea3692adf18bfee09d25d6f582501f3b0fb9b1d1ee0',
      },
    },
    {
      method: 'aptosGetPublicKey',
      name: 'aptosGetPublicKey',
      params: {
        path: "m/44'/637'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/637'/0'/0'/0'": 'c136f9f7f484a966d53e939f3285b85ff442c39c48c71e255ff602be4800f215',
        "m/44'/637'/1'/0'/0'": '367401ae88ec4cb5aa715a3d04ab738c2cd02f7872a70a73170061ea3773c87f',
        "m/44'/637'/21234567'/0'/0'":
          '906dfc1caa28f3fa8731e7afc4a0e380abab2270e42371c8305024bdc244db74',
        "m/44'/637'/2147483646'/0'/0'":
          '7b841e71f6f829f2906948d4caff1777cdd81e8c14c5dfff78c46c5685aa9e45',
        "m/44'/637'/2147483647'/0'/0'":
          'e844cebd822002e820fe1e6139f00876a7fa7d4a2a538135667e5084866e022a',
      },
    },
    {
      method: 'nostrGetPublicKey',
      name: 'nostrGetPublicKey',
      params: {
        path: "m/44'/1237'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/1237'/0'/0/0": '9d5ac58f09c12012e0dabdf08245d790582026de8b653836b5e7a5bcd811a45f',
        "m/44'/1237'/1'/0/0": 'a5acee753770333469a0b43922800e90218001d7a7ced46f7687fc73619b330a',
        "m/44'/1237'/21234567'/0/0":
          '5e7d5ca8021e260d47e801c17932e893855ccf76833aed9e881f47f431234909',
        "m/44'/1237'/2147483646'/0/0":
          '5eb5f41a24958a6391200323005b4984a0f906be6e8a69e2c220f448fe0afc15',
        "m/44'/1237'/2147483647'/0/0":
          'c2cd2021ceb6e09304c3bd9dc03d108733ab79e6bb059a9bfdc0ba3d25f3ce98',
      },
    },
  ],
};
