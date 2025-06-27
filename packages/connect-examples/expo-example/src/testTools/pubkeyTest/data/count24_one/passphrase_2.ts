import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-密语2',
  passphrase: '$`%@@`&^~$',
  passphraseState: 'moP2GcZKGrjTk35r8BSRD4JTeQagvuKzzS',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162869',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: '9ddcff3963f782c807706fcc65b01ccb8c2755b42732bd287d0ec8f02e0d6cdce84c41b1d3205e2c764dc737104caf9d9d9101d683dfe822cf787cd7db45d3d5',
        },
        '10': {
          xpub: '9f93c0c340f9c9b82c34fb840061e88440fad72825256e496d2729955c52d06fd4a3e07fce49c6af2f2c616b302d93a295774ebf7678237df3b51a974e8d8af0',
        },
        '2147483647': {
          xpub: '709f09b1e1660f77b7b69b56c98b49d08afe9844b3681cce39ebcee8f89fcaf0872a92b743cedc26bff8d66f4af1e68b66ab59ee11e1e73fe594d6805dbc3bc4',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'e476b08becf246d24cacc7a674869f24885f7c875af60fccfd4d03e3445fff82',
        },
        '10': {
          publicKey: 'e820b6ec1f1d1cddb6ced9a7137900a05267de715435be06cf633ce359c02168',
        },
        '2147483647': {
          publicKey: 'fb38b33d771056dd3d2d44162ba56276b9b7afa100b95ede925503ab8bf93f77',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '023ea7c7281f039cda5fb6ff974a83bd185e6935b61ea13c213ca1452d01d135d4',
          },
          xpub: 'xpub6FrJE1Ee18cerzGWNRZQ4Hjemb4c49cKxDMb3BrvLWrKdRwNfAK7EpUBXRRjLvu1Qxr6ifYp7xbc6gXQwCSykAgs2RN91q3A9XFrA7awyZw',
        },
        '10': {
          node: {
            public_key: '022bd8367a49be62c208b18e5ddbcce7306fb6cedb41d358c2ed88a66459271d85',
          },
          xpub: 'xpub6FrJE1Ee18cfJ4bQ9Kcpq6nUzS5ZiSpbLay5TLsn1atmxykVCkNLjPoeXQDEVYNaNwXJ3UJLRjCU3BVM6kvhrurmdSRXMnaT6fiKrh5gPXV',
        },
        '2147483647': {
          node: {
            public_key: '03367b5a75352a6a5d6da81eb54920afdf836e1b333e04a5178e984ffdf0fd7b17',
          },
          xpub: 'xpub6FrJE1EnLo9czb31FK98QSJNKeWK1J7T1vhjV61zQAGHAoR5GQ8ZEygMqCrwgH9ocufEiFpzcsgKbwNr2FDCVrycvDwboqN6Nc1FSFbzbmm',
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
            public_key: '033c689284b057b525b11a053ae2b1dbe9d9cf38856eb7606a0a87779496361b17',
          },
          xpub: 'xpub6CXexMdW6pZJGZnqMfLDiqMiKMDMwvzeLppdpSScedW1VejwfqxHsFcQXfMQ559GXGQVoKnK69tNW5AtFCHnUrq3T6YWRXFPpkaapYBkDe3',
        },
        '10': {
          node: {
            public_key: '0219b44ee55231020f23a967bcd4d5faedd303f50868e11bdd378ca4059df675f3',
          },
          xpub: 'xpub6CXexMdW6pZJhZHLLyAt41tXNudBH9fnJ2M1RL3AuYvNFtK38CEL7zrNVN2S7Vjom2YAxX2qxaj3gXRQB72H988CdJNqKbFw7QDVQLQ33bi',
        },
        '2147483647': {
          node: {
            public_key: '03375cae23bbf9d7863f111015c3feaf7dc67e6468fbeabbab6caaf62590804b52',
          },
          xpub: 'xpub6CXexMdeSV6GQu3koAcgbyMMEHSey8dNGJ8sLtFyY1Dc1snQT9ySpGbqmHCAC2uFuNc36xvYHGfurgVSHXS44afBv4HjXGBx58XFy8v5eyG',
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
            public_key: '03f6f030bf5876df94119998b6b81d61c31191b5331f0a85b270706531d725cff6',
          },
          xpub: 'tpubDDHczvCFfHFYeos3uxcMtGJKBBjhfE8WgWkUitsBvdSeccKAEQTTFGTnFnoKx9wjxWT81H2DPNtfW53HPfktVFE3k4nNprtcGbokXR5HWBh',
        },
        '10': {
          node: {
            public_key: '02e065eed81380eb165821b1a90b0576747f1098657c07d1320796246869fabf2b',
          },
          xpub: 'tpubDDHczvCFfHFZ7D8xyzxfECFmDiVp9NrrLoMEeVdfjxjhvuC7pCBQcEovQW3raSh8m8X8FoJAutrzHbq95F7wMod6EZoG4cyoKHzCFE8FLGM',
        },
        '2147483647': {
          node: {
            public_key: '02f854559e65ba2501605953cb92da55310e98705163671921f1a22777819e260e',
          },
          xpub: 'tpubDDHczvCPzwnWntvmmicewcJLKJ9ngGdA8xL3odgZP1quA28BwNs8ejGDdyRHMH7Wxa4Ky2zkNQTqqYi85bpFsNd3pStSyk17nZXCH2P1Deo',
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
            public_key: '02a264ec8b67838f71f069a1c41a673894ca49b3773077b98bb45b55b0a43c496f',
          },
          xpub: 'xpub6CJJbJZPqQSCY2EBKP7YzjnmGFJKfeG5UaH9a5mPNbYJvNJPTb4YC4t6585RkHjnxG8hwVv1SqnH3ewNC9aKuxqZ2AVXDoJyKrnxyWwZjob',
        },
        '10': {
          node: {
            public_key: '03af8e8fc7b67ce7e30402c0a05be35be09180456761dae8e3c948e8421dac76f6',
          },
          xpub: 'xpub6CJJbJZPqQSCxqb26AjhVK7TfPU9NUbVqyRYZe3kuqECTSmCDyCbHAZ3Wms9NuwFqws1yeyATtKKQmNehFVH8m4Ne46NgQmebTpRkw4thzb',
        },
        '2147483647': {
          node: {
            public_key: '0371b8281a311fc446d9fa412a3cca865d3d5693779b4b2f2b27ba5571321ed086',
          },
          xpub: 'xpub6CJJbJZYB4yAffh3BvCNK9UMpdWhQEJTQeRcmaJMundEmLKG2ZLHXYRAZCRiNyCBUSMWa81K9Ka6Phidf3WnoUJFaiSz2Ejwr9QoTkcJS8X',
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
            public_key: '03017ac34d15fca02147a59992491c2add4087eaafc62268b3ec6feaa32f86c193',
          },
          xpub: 'ypub6WcGBD9Z3Z834sF8LPmLaajXskApVQHhPhYEMutCeDfXTzWgDrATYPQf5Xrm2yF7qpcpM45Wv5uZB5zFDH9jw7vLwd191B943c7wbsZZ7LE',
        },
        '10': {
          node: {
            public_key: '02ed486408377f2b949fbab70a71bbc4f67964f3d719693040267686c0a5f17130',
          },
          xpub: 'ypub6WcGBD9Z3Z83W1qNHY5NcwrhY5zGz1tZqMcMhkdEpkMCftexemUpmrsi7CnPw5t3sVLUnH2bMRRqWtd1WSVAbaLES6PBvBRXqF6qC59uR9E',
        },
        '2147483647': {
          node: {
            public_key: '0236434576192e7f4862a852206d16342a005128601ffc482998e7de992b888e2e',
          },
          xpub: 'ypub6WcGBD9hPDf1AxgdfcMuVNgErqa9dCho9BSVx6WGy4US1CnhewAi6CTD5WZ5QJKxL177PQFGK8F2TBhzFQf4x63ovusKdHAUA3AWnznHeds',
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
            public_key: '03f281d1272a2f59ce95a9bd53f611a53722ca78baa1f1cd126a9b066990e249a7',
          },
          xpub: 'zpub6rDTWuVW3QifVshEbAug9yLkSoYSFPDSQiCf3bCt88uwudm8UoARqrzbANRdc2Y4qPTd7hXzVAhwGLHhRowsm1fhXE4fqNw14qRfzUX2XdW',
        },
        '10': {
          node: {
            public_key: '023ad731a8967a3148e5bd114ce8fbf61b3780a57a0a3229abf94358e11999faa3',
          },
          xpub: 'zpub6rDTWuVW3QifwbHHba38TUGddH5DxSF1mwqRZnNpjoBoMPRfwUcSS9Qa34u3jA8JrW8T3WbmAJhfkRK4RAg86XnDYpebvhD8kWBracBA5e3',
        },
        '2147483647': {
          node: {
            public_key: '025c8414993765e8603853b180ece849986e4e0717de5f57558b372ce00e1a3d70',
          },
          xpub: 'zpub6rDTWuVeP5FdekV88GDLRSbK2C6RDrUJgV6RKPBn3EGJQhxUoHYhA2QKYBnBA3vvjz2cknWEqoSLCmq2N4AQRKU2C6VrWUaruiJqA6eAi4Q',
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
            public_key: '03dae43b44f81fe646f2e71fe1b1b47a6827b2cba12b724ded55b4bd56dfc61925',
          },
          xpub: 'xpub6C69UCPyYcCnKCXmh2RACmw3kv6Aub331kHLV5AeWx9zaDPVvFgymKCCLeTJC8nDev7nXYbVymWQvTFNLpaaZQvTo4XVjdpzUDuA9jmfQ5X',
        },
        '10': {
          node: {
            public_key: '03c32f78a6f2bbf455ef5d8d14e15ad0b9d966c59118c42695c2b6188fa2deee1b',
          },
          xpub: 'xpub6C69UCPyYcCnmVdaftGeBNygH3dc21NoLq3iZ4yGV6e5H413LtojGekf4tXnfceS4HACTrw86WMj5GF7mS9wp3vobQj9dp8TtnhodrMbL1T',
        },
        '2147483647': {
          node: {
            public_key: '0273bf93b50398f25809dca62b57511520bac49ff5b4e2608dd9024b6b3abe8bd5',
          },
          xpub: 'xpub6C69UCQ7tGjkUDVof67KBq6KPLAgerKqaK2hu7tLo2JreJPRmKuLFpDzV21AtZ1MqjaqJazFBaZZkSG4qkaVkArvPsXYNdZqZJzh8EfjprP',
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
            public_key: '03ee4b40b28e393daad2f69aef1897a3e496b32e11e9fcca5309fa6ab22d7edcbe',
          },
          xpub: 'Ltub2Y6d6KWS1rpT9ModnyFbL2hDAWJZTR72PufPYYJknebgSc7weLoCF2FY7UHF5rKtLphW4kYHJ4SrVLN923Pzh4YXuXNKqS5hjRW5sD97b5b',
        },
        '10': {
          node: {
            public_key: '02b1ac4b8a8a465dbf66b71ed32655cb35791fd6f719b265db3ecb5abac367f8c4',
          },
          xpub: 'Ltub2Y6d6KWS1rpTb8h7XuHhZ8p6LeMhvqyqgBPRfj6wbkhnmcLqvQfHzdYxz5xbwjincKTWRj3ysfhT4RGdBkAYx1hc83Wukkb1v96jdgDKQtY',
        },
        '2147483647': {
          node: {
            public_key: '02f641346b267b9e4c99e94ddca03e35047cc09e9ba7b73bba5f14ef2ac4f58c2a',
          },
          xpub: 'Ltub2Y6d6KWaMXMRHJ8PvcrKhZ2GwkNepAqNqLSE6oPDCWrJW5Sb4NVsbYPuLiPu2TndKPKozSLY4gnMEpFVv7yWpFJXAuMTHVc6DtUf4ZCd2Ro',
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
            public_key: '03db8a4552cd253a8e87ed327cad6e6bfead2f1d642cbe98a19322ff279187efb4',
          },
          xpub: 'Mtub2sTCProatMsoVbUBg5a1uGSv98qgoHJrKAuUp3bE3nRkLkxr9331tYdsxUcww9d6qnawZoQfythnSHho2v7qP6mhfCimrLJHqphXm1Zncr9',
        },
        '10': {
          node: {
            public_key: '02e740b2af7a898a4a2cf6301cd260d7bbd3b60854174a65f85de7fbe42f5a933c',
          },
          xpub: 'Mtub2sTCProatMsowEXfiTxHQnrkdFD7uJQCFes6kNXMc7rv7Zh51xzahwWKGtcM65nEBreQ9AF6VLnTd6ZbygeTn98wzD6XK9ZDPDy16EwibB4',
        },
        '2147483647': {
          node: {
            public_key: '03b3654736799148f04940b44383211e2e0f5c171f43afec2f3574de0f34a8d315',
          },
          xpub: 'Mtub2sTCProjE2Qmf5vyoUzeBQaXyeJGyUB4SCVJbDU1PLHAiJEiGsmmV4HZn174L4YY46YTzzcpFs6D9TRNV1dMfp7ERuuScSfLGML44RUpAnf',
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
            public_key: '0297a713528401f83e55b87d7a53ca4940147c5fdcf2ef3e1ce18bdfd7c459093c',
          },
          xpub: 'zpub6ruey9oR7ip3EM74M1a9VFsSWTewrAePtAyvhyYcuJhdsJQURLruzxnRjvyMjQbSW3YpVtDnVZA7psKCfCmeHA8TgjfUPjHGfGWsmk5RMmZ',
        },
        '10': {
          node: {
            public_key: '036fd438a8b958508399cc3b3ed249c34bcd6a3e98d736bd2795c7efd088ee243c',
          },
          xpub: 'zpub6ruey9oR7ip3gWiQLUGUn9p54GFcudMaMtqcYmF7YqjJ1Xqdow5Bejdo1rz2vMerThUBRRTgfuFAtkL5ysm4Z7QidKEurSNepais1jnT55m',
        },
        '2147483647': {
          node: {
            public_key: '03d6d8c154fb0a69b2956fe59315c68c8b1951eca9f488a42628977855e0dcd07b',
          },
          xpub: 'zpub6ruey9oZTPM1Q4TpXDPf2QFAVkosYz13T8w43b1tUPm1cCkpb3V5CkYwzAd22PCRE5pdgJLLLB7nLhJPT5qTtjY2vABcX9jsnCFznB3WtLW',
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
            public_key: '02748fbd086211c3b6417bccac56eebab11f05d3c5f1114e331c4dc0331d24887e',
          },
          xpub: 'dgub8roetfivYVCvvxNXfey2RNtQjoBNaewtnhHgnFRYnvzN8L8Gc3JgsyzxpiT4k9EsVQne3szrouK59KbqU6cPtcHitFQU6a1iRZhsXJVGB7W',
        },
        '10': {
          node: {
            public_key: '02107765f8805f5340b3fd04ce77df99ec423a3159b9a9548c6467eeab244da473',
          },
          xpub: 'dgub8roetfivYVCwMFSHsg1bEbeXbYbpgGt3aNTbZGN9cBvu1N26quxA4kpV5ZkGyE2TEN3tFCAC15dCPQ9TXdYi9WMyTZuoMuAacDDkD56VWgg',
        },
        '2147483647': {
          node: {
            public_key: '03b52242dc4d7456a06f916c2f447f13b6f4dd15405fb19ff09172b58464c60b69',
          },
          xpub: 'dgub8roetfj4t9ju5Jbhb6Z1XHY5y3XcDA52idfaT74rrx1YMvCX6jfnH1ydkWPTr6ce5w166dUK8GvvDVidoyGGWzZsX3F8m55iYzeuALg7S5m',
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
            public_key: '02e42f0b7fe1264b8e0c664803bcefb3e12cc3b7c1d51c1540f8c108abc33206c8',
          },
          xpub: 'dgub8sSMH3mvafhENYf29iaczGpLxYJVCoMr62fdiRdfjJHmYdut62AMgKHHNkdDDTbSNk9obXXXesXNxiKYcmMWLmTF9iqBvpMD8BiA7nAQryS',
        },
        '10': {
          node: {
            public_key: '03496ff991d18202d155774706acfd018e410701ed9797a78e1e7a60cd1d69c2f1',
          },
          xpub: 'dgub8sSMH3mvafhEnXhegSepZCRUERD2fuAVuR2y915vcY1GYXPSjw74YgdFG65ySEgz5jyBYeZaZXGzvT1BQY8yig7yn25MoyeUgCHkxNEAKGF',
        },
        '2147483647': {
          node: {
            public_key: '03bc481f67836f2f8aeadceb66841e06c08c1489d26fcbf2e24ec4068646ad42ef',
          },
          xpub: 'dgub8sSMH3n4vLECTqyrhamYSmzMuc8ZP3vLudRuaFfevWWsAUjSSo5P36AXqffWFLHQ4KBEU7TnzGhJ5SuZAYrWYYPZWnEkVRyqPhzbPRjzDvh',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '026541dbc69cdb6fcbd7076aeaf77d4113ca345091b68688a13051df27925a6644',
        },
        '10': {
          publicKey: '03aa722ca123f0f7167f38e86a74c444346839e922521114a387dae17edc768aa9',
        },
        '2147483647': {
          publicKey: '02ef5042bdc1950715a0eb308157a66ad619e2f942f134781fef8d7d5bc8cd4088',
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
          xpub: 'xpub6CJWam4mosZVsAxdYEJXQEAzbE2Qgb2Ufv5CrzfM23aohtLpvtTyRKRCNWvkiuVFT5n6auErLbeQEf4H53QZXQffK23xT2hCoXNU3NheAqj',
          publicKey: '03bc0cc833db22626c457375696fe7055fbee5183ad397b365fef39655ea9793b4',
        },
        '10': {
          xpub: 'xpub6CJWam4mosZWLAdBvSNJYNBJC1eqQMetFAFBcKzbRBCQE5xPYJEjtPREprBg61Ra3MzNoWUknritFpoqiFZvoeCW1oUgQuZH1XhLdGyLqqA',
          publicKey: '03303cc03794b357c6c6e7e8c651ca119194e76c76bec40ec64ec104a3257287a4',
        },
        '2147483647': {
          xpub: 'xpub6CJWam4v9Y6U1BKNZ76w7roBV4T7e2776iPFRBT4dNnTmVo1mkSoX6o8V6Wa5nTksQckmxLZaGn3Wmu6r46RMrfgph9skN4dmyQXJTFYWym',
          publicKey: '02010407378923110983b0155b0604ceef7d74fdd04c1c48e7f0283b93c22a6bea',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GEsxAWEvQayQHdwBSFDXsBZHDjwbgUm3W4vsuUTYMGjsVWymF6AEgwCZgrMb5uS2tu4XQNwR3DfSnhc9X3MHdzxRFi2syrrJDpRjZPEPyp',
          publicKey: '033581c90f2ad07a67393b6471732d1968107588d382e453cad97b6ff1354f3ec8',
        },
        '10': {
          xpub: 'xpub6GEsxAWEvQaypP7WRiNBcuhjqmBMLMfTj9wK1tFySFwBYf6KafNZeEGtY3zY3b6K4ynVDQ3ELf1fgTBFbKnoafEgJDKwHJLt2mqnxBRNDww',
          publicKey: '037f12c3b6d7ac411213241c8c2aca43e132fa84804626e1b1bff4d549da38a424',
        },
        '2147483647': {
          xpub: 'xpub6GEsxAWPG57wXr7V7xxtco6i6DoqDJ6RSSXPb47RzSgrqTxoVT5RXeRpdqbQ5as4jcuJbEnYc8P52Ynnp5o6EC22P4GewMcm5tvodEwuZBU',
          publicKey: '0261c3e6a3245a854ad244adab94ed8536688b0a6e9365376299b3bfbbc43cf5b6',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1e868f2h0erradt0uawh5jv82rjeh92tqwu4887ef9fq2aryk9yzqcux2rc',
          publickey: 'c9f474aaefc8c7d6adfcebaf4930ea1cb372a960772a73fb292a40ae8c962904',
        },
        '10': {
          npub: 'npub17rmryazqr25u0ssx34zhj74tvuadf9ehd2myq6fll24pdxrtulcq29u57v',
          publickey: 'f0f63274401aa9c7c2068d45797aab673ad497376ab640693ffaaa16986be7f0',
        },
        '2147483647': {
          npub: 'npub149stpclzcsvgu8ns95vwg9ks6yxfldkquk5h9w9vfk5q7adsc78q4p3uj0',
          publickey: 'a960b0e3e2c4188e1e702d18e416d0d10c9fb6c0e5a972b8ac4da80f75b0c78e',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xf8a77117a3d8aab04850bd510780c956b4fe714349736ec79e865afbff766066',
        },
        '10': {
          publicKey: '0x8e1cf6cac90681357c50d6c5bd561f2711d6f110ab858cd9aaa2fd7e94e726c6',
        },
        '2147483647': {
          publicKey: '0xa8310f8d188254158ea09902019f7d4066b0c5e23f605c573b39c2ff36a5ae0f',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '0394112e81b9142e4e1f9855b4e8f7fe72f00aee1aa0aaf50e24de106c6ebc2195',
        },
        '10': {
          publicKey: '032d0b0c248957e7e2e5250ac6d414ce7e2506f7919e0e789db350d60ffe36efc6',
        },
        '2147483647': {
          publicKey: '0348b4df4b39ccb98953f6f5c5cf1a7ffd8ee2bce4ff34af9b02e10dab65245262',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '73ad40311046e1d545a9156d073a29650eef2f132de55c116e54375049a4f2cd',
        },
        '10': {
          publicKey: 'dbab78ab0068d1d89f911bb1a2eace77d7948f7227da8f1ab64f27ab438b1598',
        },
        '2147483647': {
          publicKey: '032be5844f70515b30e98ee6de66b2e22e0f23a04b7d32b15f4ef6017337f930',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
