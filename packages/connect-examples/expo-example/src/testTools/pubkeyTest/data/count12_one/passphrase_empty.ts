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
          xpub: '148435e290f5231554e4a54b1877727a487e632d62690cacfe6880048f8c0b2e07c055fcd23caa784839c8e65775873c4ccdafb7a3b898e066edfaa4ca69ca34',
        },
        '25': {
          xpub: 'c21938fb2831cb70d228eabf79f8ee75cfcf982ed541dde1f12f0cc4ccbd604ddfa66a5682517539c4ff0294b64de6ea1d58d73adc7b64043e31ba63e5a3516b',
        },
        '2147483647': {
          xpub: '14cb1f850e424c00adc8b7d856af0e46528860328d5eea4eb7b5b6a81073a4456910cd7debffc07680502d1794c9227f3e1dae40d19e084e003af0efb19c1d89',
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
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-test-xpub',
      params: {
        path: "m/44'/1'/$$INDEX$$'",
        coin: 'test',
      },
      result: {
        '0': {
          node: {
            public_key: '0387086ac074e08927e88e36a0dcae53b7072ac1b0251fc651064537ed108030b6',
          },
          xpub: 'tpubDC7v6135myNA9y5MNonb8DHnXPqz7Z1cAvMC9hcombPx3KzyWwXRV4uToUSTboto3JBpUfc6m4G7Pnj9MzGCGR3v6zCnJgpZzcgybw3WFGx',
        },
        '25': {
          node: {
            public_key: '0307893e7351aa10486d15b9a55ab20baf64f17d5b56e13759d681ad6a136e0da3',
          },
          xpub: 'tpubDC7v6135myNBFVciKrkBTmUivfhyiqX71uXtDnoq4kzit6MmjpWXtXPUEGzKCr2oCm1M4q7P5MmCLPZKRykry3LiyNaECe1qVAWpuhDPFnx',
        },
        '2147483647': {
          node: {
            public_key: '024580c59fac0a935b8e80702cff351b20927b39bd3de76df715249a66b4ba15c4',
          },
          xpub: 'tpubDC7v613E7du8HDtjXoZCiVFKmWJsw4UxGrGpXhwJjoP7vjxv8yg1tfga9T4tb8RmP8GXQtZgYfgwmEBKAkW6z27UpZTMMGv3f4HDVmdncab',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-48',
      params: {
        path: "m/48'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '0272c06dcf1f6d705e44822a08b476635b30f5a8e91818aa04b09ecc5e42d7853a',
          },
          xpub: 'xpub6C9bggW22J5UkHmTeZr7PJMYma2WhmihhcATopUZh3x5pWXJJVupgyEAUJLZUEyRBftq522H8QiUHQKfVN1J1mfXFrmE4LsaELwxpyWTC2L',
        },
        '25': {
          node: {
            public_key: '02d2cff2340e61614f9ab8d449ff36e5d404665f9d23730562b5e9da481ccb7ee8',
          },
          xpub: 'xpub6C9bggW22J5VqeZ4CvNoFL6EgP32AcN3ewHqR1AAZJqUqELeCoMojPm9d19QEyXABj25GBFxkNrkxQC1AkfvQqajAzeArE9GBYwxwhMNNeh',
        },
        '2147483647': {
          node: {
            public_key: '031079a3dbda3acbe7e6d1afc87c8c07ca909f2ab32da33c3a57a995afe0412910',
          },
          xpub: 'xpub6C9bggWAMxcSuGDQ7W7HhRe6WQRo7i6faTNdbUV9apFUmUchwRAzp7rRMgTjE9KFBRD6CXbCoCtPxCPsC7TZAR9zFiymMUtGLynrDyVNGTL',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-49',
      params: {
        path: "m/49'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '03b3be5f07d8596b4d77deaee79269853b04539f52ab3f8e3321d77650f41ec0e3',
          },
          xpub: 'ypub6Y1AvPkbhWKxiJtEQcdf1Kf3XuM6ZTJCtcbzEXDYMFeCdbMGjpC4ByJjSvWzUC14vULqHj4JM9j1Y3CNMe4g6eaBVR98t5UHZ8yyRvhVb3D',
        },
        '25': {
          node: {
            public_key: '02008f0a215d741fc6c4d6f970d6a6bb1e28536d21c272333615b6eb0b54de7f3b',
          },
          xpub: 'ypub6Y1AvPkbhWKyoYbCM3dwQx7JQSRx8tseevVakKsuVJq5YK2w6yjQ6NjYt2dyKZS8iT3fcxJvGw8fCcY4cfuviFX731e8VweoWZ3FVBzPNAv',
        },
        '2147483647': {
          node: {
            public_key: '0219d57ba004ad12cf86dcc67169007f667d2ecdf78be75055ad292c30edc047ac',
          },
          xpub: 'ypub6Y1AvPkk3ArvqBiQUhCrLo64dEvjShc9PfsAJGD5sqmSYH7nBBMCXumNpFdtKv7MEYh3LgCi1fXtW2JdEbVBfQkpY4mLG5xuYi1TYG87kNS',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-84',
      params: {
        path: "m/84'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '03de5df3fef9c7c36244aa2593e0f13f368014375bab1432838b868ebd7f7471b6',
          },
          xpub: 'zpub6rL9BJR5EdhGQUCH6BivHDKLQJptCv55KuUsmd2tejjqtxxHj4vLQZKZmWj9NssjhELuU8s27d571yC6ndUmdYRnLWnbjXniFDdLVQbDyYo',
        },
        '25': {
          node: {
            public_key: '03b2e431d627ba33be593a17b583e35933fbd56f50b7c233809887db6aaeb601b8',
          },
          xpub: 'zpub6rL9BJR5EdhHVdaViTweUQ4FUZsWuF2fH5ynDdjHiU2YGG9Vg49nFLscnEhLPbCzN9fR3cQqrdkrfFwD7SBv9Y4GG1A3nKFA8DkeGGWRWoS',
        },
        '2147483647': {
          node: {
            public_key: '030b3de1cf0b2f69dc44f8fb62730fb5d01fc539c121ef581eeb74ef016490b8ab',
          },
          xpub: 'zpub6rL9BJRDaJEEXnEs5b1CYLS4X1CsmGq7cXgrE2NpMcr25vYVZYEJg5h22ijTEMJyDfsVhYKYxr2HHRRy7oPbkuJxST1vLDq7Uwqxwf3sz49',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-86',
      params: {
        path: "m/86'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '03e5804643ae537e0e38d91674807fd71f9e9084863abe5ce344cb0a7c0d2146a7',
          },
          xpub: 'xpub6D31TWDuLSvotnAY498vMWykkj1BrUtoYSXGrbu2J3WHdvHE2co1kueMPfdv4fngEMLp6rEiun2LFNBKoC5fGyahYG3R7wjoZQ8ezP5WTXa',
        },
        '25': {
          node: {
            public_key: '03114404e7317ddc3c015d2a89023195861e6ee12bb07a6accab2542f95d18fc9f',
          },
          xpub: 'xpub6D31TWDuLSvpzmNE4pHK8tK65Vm4Huk7axfQjwUR7UPYnXgWi3VxXgUXMkb6pRe5SEH4Mw54VgvM6bCGU26aMWLYVBw4yNWukR14nCcVYbx',
        },
        '2147483647': {
          node: {
            public_key: '03827ba1005c42f878da713252d9e2ac5cc42cc8a19e3da5f25e8987b2bb685934',
          },
          xpub: 'xpub6D31TWE3g7Tn2MmYK5BJ9GJsy6BGaGH3vGLWxG9seyoaoQfdVkdYAFZ7U7QFARQmZcgg3F4N7RDAfKdFVYnZs2AqANQVeTBPKfp7U8HiJ91',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-44-ltc',
      params: {
        path: "m/44'/2'/$$INDEX$$'",
        coin: 'ltc',
      },
      result: {
        '0': {
          node: {
            public_key: '02cef1110ade39824f44759053d6637186b8a00087fa025f8ff575a6c1941b20e1',
          },
          xpub: 'Ltub2ZWDULvcFmcJrXZ918sUPFCUhksnfx7HUjAxmJLbZUHi7F3LTBvGJeJsrTw1kRfZPnYUEYTKPm35jfYGJAhA7Z1QtkR6BoiK1XeFrHjNr68',
        },
        '25': {
          node: {
            public_key: '03b6a80490a1003fd2a32cc203c05d391925202181c94f896b87ff7d6995f59b75',
          },
          xpub: 'Ltub2ZWDULvcFmcKxLTM9zhz96vogfiqsB45DRU8CXU2A8sZz7n4S3XhSLiHthun7Z88nmJRxBz1fTBR7k9gtr6jLN9ff4U3EMUaYqnWCUjPFj1',
        },
        '2147483647': {
          node: {
            public_key: '027be23c214f063300454b56f6d897bdb6cfbc15b048f1a620b432705d5fdccd1c',
          },
          xpub: 'Ltub2ZWDULvkbS9GxtfkaWigMjPe5rabWSSQH4uzVdfBxUohPtUyZLtPEDjHEG7DNzGskgMjDSS9UFiFWwREK5wXT4B6ng221kPzUsxJCfAvuBS',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-49-ltc',
      params: {
        path: "m/49'/2'/$$INDEX$$'",
        coin: 'ltc',
      },
      result: {
        '0': {
          node: {
            public_key: '0247669b55f5ab39322d228f09e021aa9c4defd3787e4c4c63564e15687b3583b0',
          },
          xpub: 'Mtub2tbf2e9b9BirJVM7eFew25typjH7Wy918LApSMj6gQWXwhg5hEDj6GbDkW7NT6AwTYvDo72FrmTsBZU8kF8vMquwqhPBxXFgDFVtJHypLBL',
        },
        '25': {
          node: {
            public_key: '020e32341a8229b7289d3523548eb227d8b75cc1d5525b47a563c008c77758398b',
          },
          xpub: 'Mtub2tbf2e9b9BisNp2Ctf1QoDBokJuCHmv92Wi5aC57gEZjWhzDyd2kJLFp18bQqJsKxZqKV3RYehH1GDYh22DBiZVgfgVVCRhjGVa6viXo1qa',
        },
        '2147483647': {
          node: {
            public_key: '0386bbbaec27f00777fb7286fa41fcd1c54c8155b9671d6f06d45d2c9c1345b6c6',
          },
          xpub: 'Mtub2tbf2e9jUrFpRH8sH8ZV1nqUxMrsFwV7nRgiSW39UHfY33vUxhCjyabLGv2wLry5ySicomF3BvNFkJmtY5ouCULzQK5ZGdjTnEoviMbGTeW',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-84-ltc',
      params: {
        path: "m/84'/2'/$$INDEX$$'",
        coin: 'ltc',
      },
      result: {
        '0': {
          node: {
            public_key: '03954ff147017f673ec6c7603c2428e25b464dad4b4238998fbf8cee1175eaf123',
          },
          xpub: 'zpub6qqVZue4BfyzrVXpdGawY1yBXEVkggvoWeqCthwHbAcvcmarpR1e1bPWq3BZvd79kYUZ8NY91GoHegwob3VD2Uaww82S6jiCpb2oTUQNRfM',
        },
        '25': {
          node: {
            public_key: '03e3a845bfacbb146d88161ef2b7e81a2b71859c21b50eb9f8923e74d3d0374424',
          },
          xpub: 'zpub6qqVZue4Bfz1vbWxWiFYAJn5cTRtg9AfLMwBzcoWXbgFViLe5YuxnE33jnkv48WxVyhhmvDRXVQSwpsA4xKAfy2qA9ACWgj43jtBy8Uw72i',
        },
        '2147483647': {
          node: {
            public_key: '0285e9967c151d5531ab66a595e16658e8ab98ba7aa83be80786fd7a036f71a535',
          },
          xpub: 'zpub6qqVZueCXLWxydLMQoBrcfGtGGJ1uLVe1Mek8gLkfK73xnwB7B1pTrQqS1bn7FYw8PkVGNJFCJYxPv3CzePEcVzYZGbHXgVbLTfS3sRLJ3r',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-44-doge',
      params: {
        path: "m/44'/3'/$$INDEX$$'",
        coin: 'doge',
      },
      result: {
        '0': {
          node: {
            public_key: '02a487437b0002053134adf65585460602c0ff273166970385895ecbb2f41597a1',
          },
          xpub: 'dgub8smnANp2Tn1x8dy1F7ZPfEQu6hFAwcbU9Ym2Qwc6BSWwv7ZLPqA75mkGVVDb6tGqHQS8NBMzQ3TGGvZrv7EjRqTeHidQHBwXioiTcWpvJ4g',
        },
        '25': {
          node: {
            public_key: '03f4789a25d1a34a743227478e54991d6c34cb506ca9ae5370cce60c0e3de1bad1',
          },
          xpub: 'dgub8smnANp2Tn1yG2JssPKxXFhjffkv32nvmNa6WCL1UV7JQfjdHN5Nb9PWc7aAmsDnpjP1DspNRXSFZfUACDHYEwgnyeqXFjuPCNY1ysAFw2t',
        },
        '2147483647': {
          node: {
            public_key: '02f35cbab643fb0fc7d949c7872fda293b8b224f50cd23b7991e68652e252d23c4',
          },
          xpub: 'dgub8smnANpAoSYvFgJ7EoX3JcnFFJQkpjLpqiDHo3cy7pxz2etLP8L23tux14jSTukgsm57a3v4FtNXJf5DVXG9Hbe5xts8rNgwZJRhfut3NX6',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-48-doge',
      params: {
        path: "m/48'/3'/$$INDEX$$'",
        coin: 'doge',
      },
      result: {
        '0': {
          node: {
            public_key: '038b231d2d3977eccad182825a6386eb5284afb963873ec7fdcf0bdda27422c938',
          },
          xpub: 'dgub8srhHnWa5ZmmBvQ1N5FGfddfRN2yaFker6PvkuGc6mm4sXdMxRNkGKBv8YRMKmQ5MzvJNxrFBJCYGzUnVVr8gDoWrPJvXLVcuBgPFPHqVhd',
        },
        '25': {
          node: {
            public_key: '03f6639079ee5b5b8b437a675b65bb40557842d87b29ffda10c25c445511f41119',
          },
          xpub: 'dgub8srhHnWa5ZmnJFMwA8sjf1DNLcT5RpkhyrE7syKhDZww8YQ3FgMX9mQkMYSHAQXc1Wq1AT5ELkCUwrJHSqVYZtFnhLwnNJUcSZuKnbWqrCn',
        },
        '2147483647': {
          node: {
            public_key: '03ad59307620bf874fb4a9f0740ce74a89d803f1f468e6674415cd8a0fde1ab1b4',
          },
          xpub: 'dgub8srhHnWiREJjKVhSxhR3Z6ybbsuJsxZKRMwP2kWd4BVpX42sUtn1MSnVxFhDLvipYpq4XWZQ2LhoZCS3pYjba86o74i9cbwYKbtodjB56Sm',
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
