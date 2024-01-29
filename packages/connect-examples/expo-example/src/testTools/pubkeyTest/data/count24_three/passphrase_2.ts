import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase24-密语2',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428802119',
  passphrase: "ADxvB0383*3*%^%~./,';L",
  passphraseState: 'n1Kg8udanaFFE48Y8im6GmgCSzSUmGHxV4',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            'd6caa5a3f04f0136a492c6e38ccd9c1fcf40ca7e91a64f6e465d637b20dae1249f6dd650fffe5679aa569a8752f53d92a73eea64bdf077ef6129eb4a2d607d0e',
        },
        '1': {
          publicKey:
            '595356ee87d49cdd76d0d674fb09c050938278b120c95fb0c5476ec94000b649dab39e150055d2c92331d60c1fe4764b5b679560aa1b88b370e32607f64c3c3a',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'f838ff9649076055e6ede9bba31fbda28549993c4d528ee0d209ab904ca23f75',
        },
        '1': {
          publicKey: 'a765892c0064a0a0776e6c41c91539a9053532baa5f2118f71c93db78d2170a5',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '024a43683f552ad96f427dd89e3b9fc6f2e1cddfed54bd5d3cd462bbd051b75168',
          },
          xpub: 'xpub6FgtREk4bZvRgx9SHwEBjA2xWcWcZp9xnVJeoGK9Gy2rXeAUd2txkgwQvvyPHQnRKt3thZMUw7mLeeCqdBDDREyfJdKogokttPngaatCDu6',
        },
        '1': {
          node: {
            public_key: '0317aa6694008741fdab9e5f47671e338e455b9e3bd94b65f93f5a1ee0ed13242d',
          },
          xpub: 'xpub6FgtREk4bZvRk8VfrZq9F1YnjDfoQEFqajnwNAWy1vMBamTESg2tMmC8dRk8JHJEqZnhumRAbaUCXJqrxcNFEJivNpduF9un9fiAh2rsX6L',
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
            public_key: '02984f09df06742c136323b345b7a8a6c09237f622eeee75c1da48be45e2d943e0',
          },
          xpub: 'xpub6Bm1FFrRh7DVuAKzFVphX1twsAVnHxsVWrBj3S8jTSt8zHtuGqizyf2cFMCY2C6dBcm7F3PA8WkEvxB1NWY8thb7b29mkqrfp3CTMnrLAwt',
        },
        '1': {
          node: {
            public_key: '03ea6b9a98850fb97863892ec8eae82f5757d53eb91a11f06a8fec49bad3a0aa40',
          },
          xpub: 'xpub6Bm1FFrRh7DVw7y5FJ71rcr5Jx7js8rXnGXv4hxd93GhSQSXyfu4JVfqGk3ssLHpjQZswUB44cx5mXRfvJQ2p7LNFPR2CWqDa1EsZiMmqbo',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '0366522264344fbe5b6b24d6a6a643d58e40ffcfada7d55ccef42bba742b063a8b',
        },
        '1': {
          publicKey: '02941f27a608ee07cd0ab89ba77a280cd5875264b0e5f3763c049dd48a48601bb3',
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
          xpub: 'xpub6ByjrPQBmHTWV8dEesZ6jqLy6sjCL4FCXLv5TNP98xanmA1ZhXGmKe4h4TkCxayhaYLxtXB6osEiS2TKT2ikU7ujATrZWMYot8VXbJur9Ac',
          publicKey: '036217fc28bbfa8bb419b1d3d9d1a74ef5d71902bc763cb6f31511f12624e7a5c0',
        },
        '1': {
          xpub: 'xpub6ByjrPQBmHTWXzRwpMu15BxifNcVPLqDygykUzKK24oQ6Pm21GjdFLK28vXBU63ZoYNwJ5z8hj46yeow1qbwLF3cro9wzYm3F49rENazVAf',
          publicKey: '0295357d9da40afb3097c591711d43a253c7827dceffaafb31f5dfe92a033a7a66',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6FybcaNQnTJkMqvKA7TN4KSc85yAqXU4AukVLozEubgjKVSMKhZZ1V1KpHEAhUgZpjkAzQzBAPNFCkHLBc6aqgxHFeszP6aDwtGPFN8kyKM',
          publicKey: '0295c1c956ca1eb3deba10cbf6e0658156b1ea0ea7f8ee8cd9546507a7ae2a3c6b',
        },
        '1': {
          xpub: 'xpub6FybcaNQnTJkRtumeWyVHyQuoH75dMNmB5xxDLby9csaDRhiv3mHnwMPLaTmSKFvZijXgUJJoGF5gcGB3jtGihDvPv5VQbUwFFGHz6usLH9',
          publicKey: '0285f005b8c2b6a7ab7ceff39e72e4c2d6aba25f776ee056603deae4d44da4d509',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1hm6q7m3uexc8j4ggfz6sfldmn3ygj8qmzwr6709agp8398tfm03q2t5hcm',
          publickey: 'bef40f6e3cc9b079550848b504fdbb9c48891c1b1387af3cbd404f129d69dbe2',
        },
        '1': {
          npub: 'npub1mufl08kxe0fe2g78cvq3hlwxc0lsdflt0jhr2d9ygr590wvzfx5s4pvllr',
          publickey: 'df13f79ec6cbd39523c7c3011bfdc6c3ff06a7eb7cae3534a440e857b98249a9',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x0917a85ba27d39a41301ea0a66305ee39a26e2f3de7bb2d80d33e625af5cf6d4',
        },
        '1': {
          publicKey: '0x6b29edf152ebe9ba3ffb318379ce0335074860d4af5a2ae0fa895d33d1ca0b3f',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '03287b8d50a8576b4d7789b5e8059bba8849855b8e1238b1116a0a3694b5cad4a5',
        },
        '1': {
          publicKey: '03b2071b1a4766fef2aae513f25a204b21bb7f5d77346722e0eb06f0d0bf1d1897',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '9abd059d2d572766dcc38ffd0efa8bdcd15bfe5263d7b64e437d7f71338f2f96',
        },
        '1': {
          publicKey: '61127c2948a5f61e99e92a596d8724f8642a17c56306fac3a804c693a925dac1',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
