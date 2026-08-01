import type { SLIP39TestCaseData } from '../../types';

export const count20OnePassphrase1: SLIP39TestCaseData = {
  id: 'count20_one_passphrase_1',
  name: 'count20_one_passphrase_1',
  description: '1-of-1 (20 words) + passphrase_1',
  passphrase: '12345',
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
        "m/44'/0'/0'/0/0": '0298ecb05a1615ef97cb51e2be92d475ae35b6f469be0fa336c2912e32b14287f4',
        "m/44'/0'/1'/0/0": '036bc08ac8bd391a6538f4b32bd5a399be911292831012ce9c5a5c7653d85b3314',
        "m/44'/0'/21234567'/0/0":
          '025efefdcb3a3b1907c2634b268b61a12fb86fbf08ddbca559edcb339f9aee08be',
        "m/44'/0'/2147483646'/0/0":
          '0255ced5ba2d9aaef27b12a70d94f4150bc732f004f6545aa487c079e3cb82d119',
        "m/44'/0'/2147483647'/0/0":
          '03b8e6311598d0a26531eba2e2d0cc10f7cc6226067d9d2341e9bb0664a293d09a',
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
        "m/49'/0'/0'/0/0": '036717cbca275ee55bb25dc8e4bce4067652ba8740941b8660b9124dcd6b5de441',
        "m/49'/0'/1'/0/0": '024530d8f24afe686b96ff55a315d35696badb43cd2d23308c4c430484d9227c59',
        "m/49'/0'/21234567'/0/0":
          '02deb75c0fb94a8295b39c0ce5158444ed22eca98a80448d91d70f54b744b2a9ac',
        "m/49'/0'/2147483646'/0/0":
          '03a60950ad9af90ddddf2c4a3f6edd6b0bec060a8db798e4bb8d819b7017292246',
        "m/49'/0'/2147483647'/0/0":
          '0279f41108a62bed45958a78410ffff965ce0d42bafbf6467656753bf69dca90b5',
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
        "m/84'/0'/0'/0/0": '02b40f2a9b1f59a900ef0a2b64190ba79d692711f6530de7f540b0e4ef58eefb3c',
        "m/84'/0'/1'/0/0": '02ce85de688780ff91ae33aa4354237a8a5f09382248809a53925279f60c86e6e6',
        "m/84'/0'/21234567'/0/0":
          '02dbc9dab34b1870c6bb873730d5a10e3a2d29c35243a5ae5ffa2384e16488b833',
        "m/84'/0'/2147483646'/0/0":
          '029113fd4beae2f477dfc3fedf8c385d377b46e64442565439af82ec592eab6c2d',
        "m/84'/0'/2147483647'/0/0":
          '028a8a646ad8e3c4d00129d7643a9f4009691e17d4fe7b6ad1ad5557808bd70473',
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
        "m/86'/0'/0'/0/0": '034e68ea1b425359a10dc134c980fc551287a34bb5007f2fe4218ac61d33c9ea98',
        "m/86'/0'/1'/0/0": '0221ad7ac078339c0c6ab5a8f9bffc74d0daf22fd5539c52fbfa6620925c425579',
        "m/86'/0'/21234567'/0/0":
          '035cceda9a302c15c31f7f6a7582e995e97a551b4cf9f131fe8c5ad8cb410e2c79',
        "m/86'/0'/2147483646'/0/0":
          '025f655e8570476ccf7931e6daa49dad423d1a5b0161e550c04edf2688ae6e0796',
        "m/86'/0'/2147483647'/0/0":
          '02104ac324bd0e177a9a20d6066744d675cd11c8180d6dd31b3eef719bd68086ea',
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/60'/0'/0/0": '0x02005e68dc3872fd5686e9ddd561bc94d760c06dd5b83e07685cc0fad1bccb5bd0',
        "m/44'/60'/1'/0/0": '0x02d830471f6435f95db5b852feb9676ab0adc1ef3eddf60107bae2b7e7179c5503',
        "m/44'/60'/21234567'/0/0":
          '0x02bbcda305269122107c80a8a57bc3e5473fc0c359bf857ab676d8e4b9dbe869f7',
        "m/44'/60'/2147483646'/0/0":
          '0x028759fbd56eb3fd175384b9587dbaac5d2eb553197dc5055cef3fa67ab040cafe',
        "m/44'/60'/2147483647'/0/0":
          '0x03d55076f5b376a9dff45abd08cbe42a5ce475622a2330d1359570034812b653ab',
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
        "m/44'/118'/0'/0/0": '039f3eee83eeb69a67aad3f4fbae530f7ea6f585c628910af4a0516f1160087244',
        "m/44'/118'/1'/0/0": '026e46e2cf883a2a5e588904fc561675c92c91190b8c104ce47ec01fc71d823ca1',
        "m/44'/118'/21234567'/0/0":
          '0344da72371a450c733c26edb29f0b6ef2e0abb000a820290f04b18aabd94622b5',
        "m/44'/118'/2147483646'/0/0":
          '0305acc9fedccfd6d671705c8f4259ac66c0b0b95e7b117fb6d1ac768d8e7d986f',
        "m/44'/118'/2147483647'/0/0":
          '036dde82200fda0238869743d5b2783314f28f7e5f7b750f570bb5acf5db9a1e8d',
      },
    },
    {
      method: 'suiGetPublicKey',
      name: 'suiGetPublicKey',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/784'/0'/0'/0'": '0047133adf02b3fe792907dbf2fa987dadb838e5eb3d6fb695b102577cc0cc996c',
        "m/44'/784'/1'/0'/0'": '00be11e1a04f4d01a2197376bf844a485e22215d781d3ab3c941b3fae7689e9300',
        "m/44'/784'/21234567'/0'/0'":
          '0013bafccbbaebccb970128879ff6c93a3b9ceefe26e3a93b27f00e2d5f8151c3c',
        "m/44'/784'/2147483646'/0'/0'":
          '003861be1c8707d6dbb6a38a42774a7155494af00689042656c42c6e0788a1cce5',
        "m/44'/784'/2147483647'/0'/0'":
          '00e0cdd30876616f457a03ecf93adc56150604efc0c4557b4f7ed85977cd0df7da',
      },
    },
    {
      method: 'aptosGetPublicKey',
      name: 'aptosGetPublicKey',
      params: {
        path: "m/44'/637'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/637'/0'/0'/0'": '2b1ffd561d2ebbd7eff5fb3086178b175c2ce608c884fbb691866a7fa43bd73f',
        "m/44'/637'/1'/0'/0'": '60cd641fc4eb1b552453adcf631e9a27c32775dd506065d985cfe86d0d216588',
        "m/44'/637'/21234567'/0'/0'":
          'd305e3579fddf48a7668b19af039b8279045e0d0fe3341c0c587c04a4273025f',
        "m/44'/637'/2147483646'/0'/0'":
          '8e12bc4cdfd049bb2e4a2d50be7e9771f34d68d0e156d816a6a4ca4e3016daef',
        "m/44'/637'/2147483647'/0'/0'":
          '5a38d73ab9cb8102749550ea49c2df014684a12a88cc8d2191dad50631fb1dd8',
      },
    },
    {
      method: 'nostrGetPublicKey',
      name: 'nostrGetPublicKey',
      params: {
        path: "m/44'/1237'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/1237'/0'/0/0": 'e75493255af213cf56215069623bdd389c8e7281e47e68b7becfdd37e96f2478',
        "m/44'/1237'/1'/0/0": 'e48dce2ced50efdd4f45d30a33a8f0ef6900614f1c07ab4ca96ee98ab3e85d86',
        "m/44'/1237'/21234567'/0/0":
          'f75197ac81432f65be38056012361a67d4f2274eb9e51632484b5d3e869f5bed',
        "m/44'/1237'/2147483646'/0/0":
          'b95862bb3074a0531e7886e1b026e621bd50d77b171c098af9ed554a6c581234',
        "m/44'/1237'/2147483647'/0/0":
          'acaa9e805fa0cce7d7cf578ba6207a79b1f6f58cd536a071c3b54e2500fbb343',
      },
    },
  ],
};
