import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'two-passphrase24-密语2',
  passphrase: '^~$5@237~##94$$@',
  passphraseState: 'mnGZUpnZziAxyG449oZh3yzytw1igfS4N5',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429359364',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            'c32c95e16cbe8a3cdde4eb6e2dc71895876c9e83dec945f575a41f114a18e9d165d47125d72a39240fb6bfafe48d3551176a09e807e51a902bfe37dbfd7be8d8',
        },
        '100': {
          publicKey:
            '16d9cc98027606fe4fd38adfbfe8783a7120539cf2596541b340dae1a6f01373137d1375b7d832e92c019581ccfe611df3469d3cfffaf238bce08a5d71d5f788',
        },
        '2147483647': {
          publicKey:
            'a94e856c5206bf3f3fa77c558c043afb93541c94b323da89390658e127be5b296d68175f9cdff4a5692b863bacdcd0a6e4940ce2d65992e93d6df202dc6ed681',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '96a25028ff33777cdb8bbf9416415b3335a4a9247f8cd8d038c2546d46db8727',
        },
        '100': {
          publicKey: '17c42f80c78dc1d42de3b25960fcf77d8fdb893c2b716d7021e0e3586ee3f1c0',
        },
        '2147483647': {
          publicKey: 'ae815687324e4f01d9523dc084c0544b141152b9ca4bf5d3fd4e2763797113f6',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03fb30c83f58aaf55fb316af746cd8fb8f8d9d34d7e6bdaa53f97d71835b91c8f2',
          },
          xpub: 'xpub6Gnfrp3U4EeX4cqBjkcPVSbC4KCZTvhiVYtU68knRcXFBdfYL5qPxQiSTLc316G5PD6hPbKPjMm9TwBM3gWXu89LsoBTJEGNom7nMtLM6dY',
        },
        '100': {
          node: {
            public_key: '034a25bfd3c9d83ce2cd71415e03af339a5859de34c1802ff778b9478a96b8875f',
          },
          xpub: 'xpub6Gnfrp3U4EebU8BcxyqeRnw286NMNmFazRbYGus8VxqDd9qFDwkNfxH71x82Vj2MZSMx3Qu5911foL7n2woaR7L5b3eof4yD6UuBUwzkRzy',
        },
        '2147483647': {
          node: {
            public_key: '02d6fcc6519a23bd3336d3774685c5dd82b8276076bb448d83bd695e54bf6ae4bd',
          },
          xpub: 'xpub6Gnfrp3cPuBVAew3WbkLHiCWAhdHYinHvtD1nXgQYummiyyX66u6vZRBuUyLpz3rXnDpLbzhfXc7BCqZjuFkbJ5abrZAPTh7WvV3A3o9GVj',
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
            public_key: '02e41578df57369f137c0c9b697af7640478097841bde767b7e02324637594e7ab',
          },
          xpub: 'xpub6Ceg5t3hFUfKAR3NNUbCHKtbj79WeTJbBGB6DRv1wSDsqwjr7bUuKrDqXa6C67mWE5S6Kz4Uu6SxdEXmVnw4MCrgLjPSfbTZyCXPQ7ZJVke',
        },
        '100': {
          node: {
            public_key: '0239875f5eaeb2f7bddd07b586673650e8d99db88290924a5a63474dfb6b0921d5',
          },
          xpub: 'xpub6Ceg5t3hFUfPZ1nKtfRahnM5EomebCuRd1BNMAVHL9uPqcPykMpBwJuXX9STKxUFdLs11d3wrV1tbCEEcWpw4TPqZgE5twUbspKEnnaeXnq',
        },
        '2147483647': {
          node: {
            public_key: '03e0a0e3aa1b70a36ca860deb67b6d29f0c3756d126c3bf38f1d6ce8e18fdb422c',
          },
          xpub: 'xpub6Ceg5t3qb9CHHpjTjwYbYtDHuSFN1RcY6fHja1EoQu7ftG1ezGJ5x6gB71YRK7BZmjGyraXhK9EGrPn7VB9NuP4Pxv4A3L1YSxDvpvLS4VW',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '030b62ea5faf14af2237a2dd682b96d915447629138fe956ba21e3ff52c8a399cb',
        },
        '100': {
          publicKey: '02604f4c8a388031b6e725ed65534df9270edf741cd00a5036836a9aa2c8589441',
        },
        '2147483647': {
          publicKey: '0207e65414b9e589a24ea04ea54e40de3331aa4813e8afded977a502ee484867cb',
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
          xpub: 'xpub6CQfYuu8DdbhjEWi2mSckkDUPKMB2jbKRhtc7P9CU12urnvhMHUsAKjNu2QFHCa7qgKTmaB5tZg7G1YF8tdhsew9GAoTgxRtXoU8foa2yc5',
          publicKey: '039623b9f561e81e324779b5fe03ede6bb6f7d9e6294d396825d057b04d2dac4c7',
        },
        '100': {
          xpub: 'xpub6CQfYuu8Ddbn8T2NSVi8WwZEZCfH1BV6frqCk36wFZ3tpY3D7VaV5cF73UYCm4xzyZDVu148vSZpCEr5oG91KybVhtDVv9P7FRpb4pdfzTz',
          publicKey: '03b2fa2c037da495498adca3e69b74833a3ed53e8c248be6568d40ee8897a6a896',
        },
        '2147483647': {
          xpub: 'xpub6CQfYuuGZJ8fs8wvTWRYS6ouGPJAMeMePbUnDk8DFTJa2AW618fzomZ7erGdVkMtdV7Z4WxtHFVLQq7vUrgy4JBkr7mHMBPnvjycpEdPdJi',
          publicKey: '03232c8d52833b55c37c7d174286e2d9c49bd774d902e774acf2e1b1ac29a7d991',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6FbRREpa8RjyN98qXRk4QaaGKX7f267guzV5NpztPmkPbWYEVkZHoC4b2qMZ7ZFXW2Mgbf95C23rQmvkdsBx5WcqYX9cA1oq8xAu4htbaBW',
          publicKey: '0268f125655ff4f4e6e13242b2bbb3c4f5209ecd5f90663451150fc5e72ce0987c',
        },
        '100': {
          xpub: 'xpub6FbRREpa8Rk3mAH6YZ5aw3KkjU8jh3scbfsVwztSeKae8F3V5Matob1brktnjDYgomzBXaGtd321KFqbUuyjtoB5J5KgaB7Pkn4jJtCrQQS',
          publicKey: '0224a3989d9f911bd713f431fd37797dc3b3f424f0400cb975ed71465383ed840f',
        },
        '2147483647': {
          xpub: 'xpub6FbRREpiU6GwWVr6Pv7bbX2bkXZAtkVgSwK8Wxt38atnJoXz2TTaYtHFjcygkL7NM4hQM6DTAkcoZWxn9s2xuFcJAV2eujiCekMmndp8fqC',
          publicKey: '03cf3f4db6693d227686b74ea64b960fa08b57050476c1c13e4a504837816ad4be',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1lf66qhsyy0e73fzhg0y2mqsqqskdme3wzjffng4q7ts2h2rxxwys3f304r',
          publickey: 'fa75a05e0423f3e8a45743c8ad8200042cdde62e149299a2a0f2e0aba8663389',
        },
        '100': {
          npub: 'npub14836389vy5vqh5wfswcudvaaslzal7l3scquwxqe7px3q6656sms6k4pdg',
          publickey: 'a9e3a89cac25180bd1c983b1c6b3bd87c5dffbf18601c71819f04d106b54d437',
        },
        '2147483647': {
          npub: 'npub1uwhcp2p390gxawf6ys54zagdw5zxlrntdhjy3hnt2h0jfgnvtwrqr7f7q6',
          publickey: 'e3af80a8312bd06eb93a242951750d75046f8e6b6de448de6b55df24a26c5b86',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x49bc307d2774db3e14b02df6ddc8fb254eda183cfed20c160728c19be01eacab',
        },
        '100': {
          publicKey: '0x3352e402209823c7a1089812b0b77074a111f408b5ede8ec2c1f37d8b78cea46',
        },
        '2147483647': {
          publicKey: '0xfa567d000fada2539c3a9cf665e6d066b0ed17932e3dbff245fa8ac2408a3ac8',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '03e7ad2b9b9d22f02c774b57fe185a507a6e2757b203b1c095bc159e0fb6af5e63',
        },
        '100': {
          publicKey: '03196fe22a3a2ef10c19bc5fc222a02413f8a5e874f0f094a7942f8836304d9103',
        },
        '2147483647': {
          publicKey: '0290bb91d290decb9962f0b231a1f44388102db08358f4c2b9c75bd5b1e22c4a17',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '3d2c2f82b320966b5a3698b0a91095197a03e0174c0ce4698e49990f8dbc1fec',
        },
        '100': {
          publicKey: 'c876ef663a2ff44baf7e8359bf7ef221440b358a7ca26dbc9a66d3bf2d061d41',
        },
        '2147483647': {
          publicKey: 'cc2db4f9adc0985ec84574c7a5b69aa949ab147131f4da46e7096ea3d8d77cfc',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
