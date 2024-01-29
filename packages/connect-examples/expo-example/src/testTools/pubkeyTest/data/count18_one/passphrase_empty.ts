import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase18-empty',
  passphrase: '',
  passphraseState: 'n1xWjoRozJunfJ949rNixAWMCh4Vwj4L9j',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162750',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            '291e1610162989b42e41d7aec6b7f699ecc36a09bee5f6d096b153625f2108b6f6dd53227cc9ed5a1e1886f5305a525d347d5ad4470e1c9560f434b862e0c42c',
        },
        '100': {
          publicKey:
            '3070803925ec7a58a21fac845c526b078b01dc86ca39db3dbcf228da636a612e838f704e064aabfe8b7cd1cbafcbd081554691a671f71ed28488544a608d8c52',
        },
        '2147483647': {
          publicKey:
            '1d9fd2edc203bc4ba7e966bc5545ee5f7ca5eeeae1cbe61d895e2234a4375f0e5fd7c324f4c00e3f7ed76288f89145511309098300f072fd41839ff9f448c473',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'f7901faf562fe12aae57fef882dcb396ae8085a3b34760da71e37078d8b61bcf',
        },
        '100': {
          publicKey: 'e3a416a3131a5dd7f20912491ff26a1253018448052f89eb31548564ed21227e',
        },
        '2147483647': {
          publicKey: '824d7a16031b75ee545124c6b37850105d7300a13cf27ee607e68e8ddee1fac5',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03d868940b4bbc242c1312eb429cf63d6e3b079e46f00bc5607552528e2cf8e75d',
          },
          xpub: 'xpub6FZ2vZ9KvC416kPGUg4Jffzkx2Xtj6uruhnC1w6EJT8dZfiXD1ZNJMch6GB4oLYbL2iz6BUmYM2MMbmkbWxoAjsoc5j6U12r9LPy4UbsKBv',
        },
        '100': {
          node: {
            public_key: '026c65a34434be483153d3955e97df34ed47db501990ccc25a01ce0246bccfc91a',
          },
          xpub: 'xpub6FZ2vZ9KvC45VfdUAcx7BVZGLLC1BqEypWveXRGu4AxzhFqWPtHuuwsCLY8zDA9Loj4ptzYWCfVKX9774YLqBPLmFfF8ZxMpjnvskK3tRcB',
        },
        '2147483647': {
          node: {
            public_key: '02fd13c0fb443de156e757b5bde81169f44a50d3556eb7cadddeb08e31cb6ca2b2',
          },
          xpub: 'xpub6FZ2vZ9UFrayFRHdyJPiShLEzBjhna7sg4kaG3kHZtFcgZFGZZzAvfjmgLTZuqbgZKXs53cBxe4sUjn7cN88fRkxSURPbm5GteuGK1LpYoK',
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
            public_key: '026fc1cd2c4f5d36317a05dae18fed7e7f6cfb2b4e9445a16501921c754ecd7f92',
          },
          xpub: 'xpub6CrrJ9mMXduabKLcZTNvFXKV17ZtHY9KEBzuzdRbyWAiCGMmKU4TBqzbEFz2TME8rSTkGADTemtNroob2iTT2qr37ScBf5EZzNJa5gArTdQ',
        },
        '100': {
          node: {
            public_key: '02fcf048622b768676d315f336863a47ff000c299a31c9687a91e03ff51989297d',
          },
          xpub: 'xpub6CrrJ9mMXduezAVP1TVEszpFeyXQim6nbjD59Hd4i1rkjboyBFhLLxhqeVZcy6sxPHrndTkm7Q38GsvW7e49FWeVyLVafTw8taroR6wpr1d',
        },
        '2147483647': {
          node: {
            public_key: '0248b707598ec64de10d1d0568a86629ef41e7030704948e0613bb9157553f52ec',
          },
          xpub: 'xpub6CrrJ9mVsJSYjivvo6JVEywEQTNqm6XsR3xLN1oXtTdyiiXAmNrMpuF4Mdv6x5xRFs4oab4UVk8orUBtgUetYr3R3fs15ihNAuKdSSWjAt2',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '022c45dbbb612096bf508ebc05a8af8c28093bd3fdb80a12dcc34c1c2a57d6eee0',
        },
        '100': {
          publicKey: '02457bd1e010c51722b48fdfc78d4d3ed0bf9efd901f969418bbe05b2b55b77107',
        },
        '2147483647': {
          publicKey: '034f979e399c1d8bff49c21b69838f6f9fb1c99dbb45949371c05743d6a8de2827',
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
          xpub: 'xpub6CUdBa3ZBJNT3pNK13qgpVzun87pcJyvebRHVGHTzAcvGYTmGaijYesdv4FrLAL8RqNdKPwK6nyCsE2NkYVoubCQUaHXkwfN2fUcMq2KnD9',
          publicKey: '0368b97d1058965e73fe744986cdeb583cc9a88b469be1ea01220c919100242968',
        },
        '100': {
          xpub: 'xpub6CUdBa3ZBJNXT4gKekyweyvcfPLQEJJK8atVjbNUCrMgiwVPG2X495h5U6mjp3BepbL7PWY1bFLh6tj5EHavHcLLMvGNE9JMAsTpQ2E3ny1',
          publicKey: '03ce80dce9518b1f9cd3962c1eefb16adefc167b93069a8004c8cb7a151c475d61',
        },
        '2147483647': {
          xpub: 'xpub6CUdBa3hWxuRCXPoxzJqr3ACgpjMyMemf9mctW9YfJNXf9krbFXe9kChFhcUsr7QLwEkqCmhZuhHFaFxLHXYCPg613rfgVU4LP5izMpvzDM',
          publicKey: '0333be14233c10855a5a6cf476dd171c015fc7446c12262dc5e316648376a6b33f',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GyKbZoWX1mUAqBaQE4kJTJqsijbjUbZ9Ydd7kMWVnSR4cYsQxaTBSrqJUcFCGtPHxBN1VectS7k765fzHkpZZ2Di9DdmfhZEjavjkqoZ3y',
          publicKey: '02e8344bd06de5e1590c40ae9d9d1a856558e81105d71ab34b62b07ab92529a6a3',
        },
        '100': {
          xpub: 'xpub6GyKbZoWX1mYYwUEUQjpQ9RxF8oQbuvoC6wDKT6EjriGdEHMcv4wys21gMb3LV5JVVajCtpdJWeEQbxfiVBvfuXMmFuqxJGC6eS6ZUiycxp',
          publicKey: '03e7c3a2cfd06c3a79345e412cf1aa6ebcd57c49eeeada2677edd86c1ec9763f89',
        },
        '2147483647': {
          xpub: 'xpub6GyKbZoergJSJKUUpSP8uEeZ5Sp3KnJZrKrxJjdpAb5TJdEbfuhnZTXpGg5gZrXmZkKjSqMg3KPYWVdSL8tZmLnsQQ6QNTVTNxsEU6xKDyP',
          publicKey: '0266db4202ccfc4713930997dfa9f788b07fe387986461ee59c41bf8275c487fca',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1nnxsrr0cy85tecv2xnn09g3g2mt4lwgea3n3zxflammjj5606pgqvhl8le',
          publickey: '9ccd018df821e8bce18a34e6f2a22856d75fb919ec6711193feef729534fd050',
        },
        '100': {
          npub: 'npub1au2lj4u4fv5qmetp9ptc883twqn3htdaes43vf427qyxlke3hvrs6k983s',
          publickey: 'ef15f957954b280de5612857839e2b70271badbdcc2b1626aaf0086fdb31bb07',
        },
        '2147483647': {
          npub: 'npub12ek78jnhgukf8ua0d3y7z0sah70zmz6qyd4mz7njas982y70xskq8cx707',
          publickey: '566de3ca77472c93f3af6c49e13e1dbf9e2d8b40236bb17a72ec0a7513cf342c',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xb3c8d13a826ded7161e1af02d0be7d8e1a1b1167e646a9eb2e62eca4af8e9c93',
        },
        '100': {
          publicKey: '0xab2759b234cb645648f4f8c9e159cd880d0e860209275cb17af118a33df924ff',
        },
        '2147483647': {
          publicKey: '0x7910731a4172283564d596d2a42c695f45dea45d1539749a3f2e95668c2e08ef',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '020e4ef3b6bb6beb39b1fc7259623dfc15fc78389bac54936a413118af20cb990d',
        },
        '100': {
          publicKey: '0218e08ee62add5b2e96a953f774387681c8fd0ed169a4e895dcb1985cf0979075',
        },
        '2147483647': {
          publicKey: '0311d6a4a102cd0d635d89de2bec028bee92af2ad15a7d285b099a6c80fc67c5a9',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: 'b77e59fdb9e06740eb0bc21861cfb88ea7e5b682267c3f89ee7edcba04e26c58',
        },
        '100': {
          publicKey: '37288973cb1de51e3d9f2f33b3b2d548a03a15a6e20263379e4657c944517167',
        },
        '2147483647': {
          publicKey: '439757d14f696884f5fd0aacd154168662522318b62869c76bbc75ca5c6899cc',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
