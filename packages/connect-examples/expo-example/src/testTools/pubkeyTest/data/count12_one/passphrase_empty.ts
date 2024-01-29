import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase12-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429195423',
  passphrase: '',
  passphraseState: 'miDg8hbtpECMgje9jQRxhgvN9kQoA29DDm',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            '148435e290f5231554e4a54b1877727a487e632d62690cacfe6880048f8c0b2e07c055fcd23caa784839c8e65775873c4ccdafb7a3b898e066edfaa4ca69ca34',
        },
        '25': {
          publicKey:
            'c21938fb2831cb70d228eabf79f8ee75cfcf982ed541dde1f12f0cc4ccbd604ddfa66a5682517539c4ff0294b64de6ea1d58d73adc7b64043e31ba63e5a3516b',
        },
        '2147483647': {
          publicKey:
            '14cb1f850e424c00adc8b7d856af0e46528860328d5eea4eb7b5b6a81073a4456910cd7debffc07680502d1794c9227f3e1dae40d19e084e003af0efb19c1d89',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '33f78095c397cd6792c1e173aa1c503a59dc0a29ad8fea85467449a2383b2ab3',
        },
        '25': {
          publicKey: 'bb8d18d0e2e3a816c245d0b65e01bec51163cb7f3fe88fe3563607239f0f0216',
        },
        '2147483647': {
          publicKey: '17a87ac6f3d6f935708602c378379ddef167fabf61e031e65e610c09d5678196',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '02b57978004310fc69d2e7b730c24cd79a0732849b3055287576b80c99f5e6c2b0',
          },
          xpub: 'xpub6GVGRiR8db2os799VyYZN4dLEe4PewaLr6uWkh86CFGiDJrUobC3FDKfgUHTLjq9wt5xbWsqxU5EYDLdqyP1wgqGijGB1VQMt6QwHMJrFRH',
        },
        '25': {
          node: {
            public_key: '02338852225dac377d322f062e163859a41869cab1d56202350f67878301953ee3',
          },
          xpub: 'xpub6GVGRiR8db2pxSiPJHMiKMCNbuxZbG8h6YE3DPChUb7bmDFoSqZyQEKAunKPCspJxQVjJ6VJD5JkvNL8DguPZuUYFr9RKUx9HAckK5tKYjZ',
        },
        '2147483647': {
          node: {
            public_key: '03c89907c03eabe081cda74c1e763c54c7cc10b484cd39fb2616c3807b066506a7',
          },
          xpub: 'xpub6GVGRiRGyFZmxvwY7KQdwCQkhSkLKC6wHNgxfP5A7orKvxgPi2W5c7iSYyWi2XzY5ZYhKEffP56F821rmyEwpM6XhhUAA8NXecfekHRbd6S',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub',
      params: {
        path: "m/44'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '0200856f215c42eeec50173c7dcfc582a35557004a9eab2fdb26fb384cb81f4d94',
          },
          xpub: 'xpub6CgU4MYip9obRSrH3odLWT6h7CFzGyz6VXnosEsxYgx7RWzZ8aKVhrEAD2pQPqcsFDbBDkogETWd8RVeybGkKs7gakb8KyQdsUBqXhpiqRj',
        },
        '25': {
          node: {
            public_key: '02c63deed70ccd63e556339f12f6c971ca3085a91b0a66bd6d4074390ac478341a',
          },
          xpub: 'xpub6CgU4MYip9ocXJBYFko91qMLoBNTMorqqD3TGyu5Tinr9ovhvf1pqSUm41kx9kz2tJEXJwaUAmNrGNsCczx5joZUgJSmX9DZCcvJimMgxNs',
        },
        '2147483647': {
          node: {
            public_key: '03a778eaa08981ffb8e6cfc1c15105bea4463d3eb0096cc31a17b1ad7c2b64ff2b',
          },
          xpub: 'xpub6CgU4MYs9pLZYjdgbJ3N6CstLsTSbPgBZ76Qr9c2nHgnAjiysbz3bw4GqXQzT53CjK3G995f6x1EuKPrLCAfMvAFqKjCCqAGgDsCHtee4iL',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '02fce1615d3ba37bdf49929710b047a68a9d26cd8068a6035c5d40968463000868',
        },
        '25': {
          publicKey: '02efc4ca68d4fc27dd178e08b2cf3fd83258b8e6f0fce1d4b4962929efb147b22c',
        },
        '2147483647': {
          publicKey: '02997fb0740919fcf2593a3f6e7665ba8cf6c1a93e57ecdb1b5332516006c3ffe4',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-xpub',
      params: {
        path: "m/44'/60'/$$INDEX$$'",
      },
      result: {
        '0': {
          xpub: 'xpub6BzVvH9KmZXkXLa1guj8XTwb6H1ecUEAVxQL9zt52Be37WPWPPiCfayFWJFZw3Q5egMpk1m4ATyVtkDbwikmTggpPdWQwQVs9i4wXU4Gico',
          publicKey: '026dbdae0f06e445598f07b3ee49989951b7549c1d0568b48be21fbea55fec5ab0',
        },
        '25': {
          xpub: 'xpub6BzVvH9KmZXmcRgmxmjNy1vWDtiqCurZ38ygwtDDNUchVDBLmGLVvhsv19s3crkUoWTBcRNz2YiSkgmyiPpXCWKoVyBvKFSwKGRqkfknuhK',
          publicKey: '036072fd63c71071379dc9b0e4d99f45953283a14920ea2861274fecb43dac2f40',
        },
        '2147483647': {
          xpub: 'xpub6BzVvH9U7E4iebVuafxSp1VcjGTNQPL6iFPLMGSP1G7yaa2tm3ZrNkcnvBs7EFAQbhFWMYcwcAwFkTPAPys6nNqetVWxyfmM3M31vot33JE',
          publicKey: '02864b5d10576fcf1b1794ce69d4294bda127edade89f9b47439961e25e95277aa',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GUvHRW3QKqcAMsi67dkudwgNxzQCWwnEchpTGBapepu8omoWQTQjLtwJKD39XFTTCCRKRpAYLvtZiDmNaLCWHTp6TvuvAkdyCXzYdq97Bx',
          publicKey: '024106cbf35664c10708e652abe149b1973425173d530a0840b7363e81a3892f48',
        },
        '25': {
          xpub: 'xpub6GUvHRW3QKqdFYjvB7XmFNB6phgExUzEYgeGz4FjEdkUUrLpJUCedLJM1bhhYAvPwgtKPX6Jb56QsRDPRefTYdUt4aZU9XFN3PPmuW35LxT',
          publicKey: '034ee531788b22ed39b37728b4cb863d9f4e0f6c0dc6689cc572c1e6c9c041fcff',
        },
        '2147483647': {
          xpub: 'xpub6GUvHRWBjzNaJTZoWDSmTo78EW2Me6fYA8rtoRWvMcMnzbgX3aJ8FLEDDbetLbdc2PQAtarvThpgR8DL3v3t7DbQtPGKRFYiHEh8rJsNzxS',
          publicKey: '02ce264af71f7bb4d6a2c90f45530d5fc31d14d73712c1709c12cb43870cbd898e',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub18y7frnjuwms9mah0llf928lpnfqa796pll4svh02fcqkufn02e8skypa2t',
          publickey: '393c91ce5c76e05df6efffd2551fe19a41df1741ffeb065dea4e016e266f564f',
        },
        '25': {
          npub: 'npub1mfl0094r0uv4p2y3aedr4vzc22evy83hwgk37ayt88uczdz5nrjqkv0gwk',
          publickey: 'da7ef796a37f1950a891ee5a3ab05852b2c21e37722d1f748b39f981345498e4',
        },
        '2147483647': {
          npub: 'npub1fpgs4zn5qve3esec5qxu06fyex46ekxd6cw2qlcvkmemfm8x3aasxwncfm',
          publickey: '48510a8a7403331cc338a00dc7e924c9abacd8cdd61ca07f0cb6f3b4ece68f7b',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xca0bb84cd74dee971df380620d6a08d2d9ab8b8b754a768df52e790bc22c8755',
        },
        '25': {
          publicKey: '0xa6113e431af67fb41ac4d26b3af48cd6a5e25d7a606210575b657f30208fbd1b',
        },
        '2147483647': {
          publicKey: '0x72ed86b3e8d9bfef98cb7f6f75ea6aa32c44b97608bc4c1f605afe33bf396def',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '02da5fc68d90ae9d4de8bb57fce8cd25f2bea3a076d8c483fec3c31e05ee4f0708',
        },
        '25': {
          publicKey: '02f34e3ef4f75ac664168c61217a0a823d57491f7edba15e422f81bce8f2369bcc',
        },
        '2147483647': {
          publicKey: '02fa6d6d768d8cd9d7d9d570757b8e7193e25d956ef1d6ed0d01d152633996e7f7',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: 'b71a97eef1e1cc42268257bc1eca84bd9908eb787d60d74f2ef730a7cf037b07',
        },
        '25': {
          publicKey: '434107a74dc710125dfcf6b9c84e446eb7822f60483ec9fb4edb1d585a1d5d38',
        },
        '2147483647': {
          publicKey: '1d25792f180cd0c794ec31670d6202f9d43f71ab63b745f9c38bfd1e242574bf',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
