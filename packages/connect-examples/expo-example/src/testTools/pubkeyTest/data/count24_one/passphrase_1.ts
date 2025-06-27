import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-密语1',
  passphrase: 'asdfg7890',
  passphraseState: 'n4kk9unKaT8HBt5CgnarZLZSMyhk2SrsQE',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162869',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: 'd8f950e075473883d94d286ac9f9893275c15baf06498a5d827e4f7ea8ff43300cb0fc2e1511f3f8757075ef3175fd14c3e4782fbc13b2073f4303d24ef77003',
        },
        '10': {
          xpub: 'b0a5810b2d7f14b3c198176558fe1234427db1c22538ec475b7dfcde740c3d63bee3321a8013dda4362e6c2bc008ecdae101ea7703d638d98384378202eb640d',
        },
        '2147483647': {
          xpub: '0b0dccbedfca6250c474baa5e940c7aa9a0f68a16831b1efcdae908924a99d21f5e6263187f1cb9c10a397cae47a79da6339b98318337f09e714c221579e302d',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '16328a77c23f15b22ab5402a6e3d8b9c02d92701560d002f26cc2aede1327e6a',
        },
        '10': {
          publicKey: 'b70b4d599ce93aefd60bdefbf3f7bbd779cb86f6d6a65e0ada9a967952d7f2db',
        },
        '2147483647': {
          publicKey: 'ad4ce5c1d7c7c4072e68b19858b40757da7764505bbbd7e10d671bfcc94a0422',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03d03ced3231541169979861dab50010419d2ba6ea6d8963b2a63271e27126a840',
          },
          xpub: 'xpub6FZKzFURDCbNYTtoZLddLh6wQaBYU8u7D3imHEZnJFnbjGzBMVRmT6qu4ehmf7EAhaJV6Matk7wbbchsUFeku1s2b2HdiEQtZkFfBjvBhpF',
        },
        '10': {
          node: {
            public_key: '02abd39b3194e922afb04348bd35d01bb1d02b3a132549ff306b95cd8f7b823255',
          },
          xpub: 'xpub6FZKzFURDCbNxdarq69M82E61megqog7nESumNj3WLiokMcwdfnMjF9JpEEp9P2pNs48bMycqK4Fw6dbrq9e4M4SabhvdUtPMUajZa8Rk88',
        },
        '2147483647': {
          node: {
            public_key: '02a685a726b50bb28dbb979177c1ffe237754656f884d26563c544a575d6ecfc58',
          },
          xpub: 'xpub6FZKzFUZYs8LgATP6WsJXWGUvNyZpEP2tbTK2S4mpKBD74hCyiVMfaQZXpLsrmwLeyr1HTqASraWy4DJzF5pocGD7K2NJBn1gJ6vvNa2mm8',
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
            public_key: '030b8dd210e5a593228a2b333f8c3fb67528fec63b3f26a038ca389a3b820c84b3',
          },
          xpub: 'xpub6DAR1Vpbvfv4NXmpMGUznPLDKuiwqW94HTdhwvLFX4QpvRmPurCJeumXETf3hq1PfaA1ppf3KfdBYP1ftBe1BEyPjukJ2HUbFj1fyFxfuTn',
        },
        '10': {
          node: {
            public_key: '0388c4e37ba18a561cff2ccb727be3f79a6e40f00739a35fcb8356fe37bc1bd9b8',
          },
          xpub: 'xpub6DAR1Vpbvfv4p2PuqaKUxLBR9qtVKse8Y8go2DaZneHzUvrPCogAEsXbbtKDZK6g4vmk4fskcEcm396KmqXhW5vYT8HdkUiTTnQ8b5Vgus5',
        },
        '2147483647': {
          node: {
            public_key: '027924c43d45b9c38c4bed90ee9a44a705131ecb5ebc90d4d35dd1784ab4c63853',
          },
          xpub: 'xpub6DAR1VpkGLT2WBXjweAqkTFnF8yPPVewtC3S3LwL4V7mZkMU88Afd76AE7CK3pEmb2ETmHMZFraag32gvfE9THYh9FgvHQRqKNVaYHgfMWm',
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
            public_key: '026bc5774ca874eee8a24d5d0ae5e3dae34b2c48fddd22305b242ed72ab18ecfc2',
          },
          xpub: 'tpubDD6h3C2PuSmKVeuJmjSjVrxfKgLSXB8pBNq1XfJJECg5cSvHVfFtEr7xrCDXS5ZQQVbPpveKfroKBWZwB9d7jFkFGzSCPzeCe3VWMYrTJhF',
        },
        '10': {
          node: {
            public_key: '0324f5a31d9b87d38bb06cbac037ece10e92d021a1b6518e0ec647c073c69e16d4',
          },
          xpub: 'tpubDD6h3C2PuSmKv7wRyeLHzrBaqPhBaX46CJKSWmPJeSd2jhVTTL1QQomoXJ3MvarjDRjhirSue6tSEY2fK8J9tWAK84yJQD6AUyV8uVMcPEy',
        },
        '2147483647': {
          node: {
            public_key: '02f05ec302c64029a45f1760d48bc4f56c28a39f6e02f2a3464af2a46d8c4ec8e5',
          },
          xpub: 'tpubDD6h3C2YF7JHcgnN7q7XA84A7mA7fdwqLdzpuNCVCn5fBxJ664ebFsrCzBPXf8PaSUyqxa3McAb9QHGxRzWiuNDFueGH2tLoob18ZDkJRwW',
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
            public_key: '03d128fb586b3c4430a265ec6eff27236d2aadbb69a292e044e48bde11e45de0d3',
          },
          xpub: 'xpub6C5Mtp7G6B1fJt8pBNQrLZtHncqFJK52njRoL36UQRCiG4fRWJBWFyC9YRxkmNmGkCoKpysS6wrzNXLcAfsinJA7prxLNiZBQrFmqZBeayz',
        },
        '10': {
          node: {
            public_key: '02efa50d281cd8ec253f33c35a995f428b9fccacf8abe0e23b2c8b5284e63242aa',
          },
          xpub: 'xpub6C5Mtp7G6B1fko46K8YDLgbBsz2FETnafxHWRU5j83hmxnK8TgRk2cGbk47BeEtNAUKo6AFMMrh51Vy3CYABebT3Usr9uXjs2GKJqnGPkMg',
        },
        '2147483647': {
          node: {
            public_key: '0328e39a0d3f5f8d6d473128b1dfd3a1edb2d145aab591b5f33b7fb6fd32433dfa',
          },
          xpub: 'xpub6C5Mtp7QRqYdQfTYgbLAhW25q33MN444j11pFibUUUX8yz1jUcvpu3h3cxiWE6mqT3PZkxZ4sGNbm1yQg1UMdfpK9cTn6Tp2WUxn2iVfMRk',
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
            public_key: '039bf3cf493faa0f3616cd40de1ce1b93d7a12b5459d1a194060a0c37acee73473',
          },
          xpub: 'ypub6WsY3BUhhXfKpojHTuTis7Nw31Uf6mmcZeeYCGzamp653WF5Ftbc2tMKwA6CXoCA1jKT2r1LdFwi9fLwYHxXiYVxqyM6LSp4pKbQgEhzy6B',
        },
        '10': {
          node: {
            public_key: '020bad4d295049343df6ce2edcd5053038c2c100bbefc7bac9cdaf26441c311d29',
          },
          xpub: 'ypub6WsY3BUhhXfLHJZqHQUtdzPgzoeffEPD96c9EjtboQbdrsjBV3Jog1pKPsn2di12pLTtMV5qgxVdDo7yBM8MiHZuG38NyktDAn2xQLRDh1F',
        },
        '2147483647': {
          node: {
            public_key: '022095aa85a2ff1962e2ff23d91254285e8d20f5fa07d8a12b48ebab737a18a65d',
          },
          xpub: 'ypub6WsY3BUr3CCHzLqz6c8sFT8d8agcZx2H3Km6LVxgzi9YUgjzprHLHFf5ekkDUKGg3dF6uFUHi1H5Z9ZBENu6bwXCzcCo2yyZdo6RgvKToBh',
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
            public_key: '0307872f05fd35cb5e98bba016b6d33b3d6c3fc7c264f97aa67bc819883ebacb05',
          },
          xpub: 'zpub6qiQfUTVTE8gWsnqanzhko3GS4WBjjtByFYMS1MxfjWJA3FAvvoLAoCCoqouV4iH8PE77nbYQCfPZWjJhFN42MZJe8T29kkQrGx9xgXzwcp',
        },
        '10': {
          node: {
            public_key: '026097d13922036788b4d724615ccf3b1ee754253b04f85708dd46e54ea40a0891',
          },
          xpub: 'zpub6qiQfUTVTE8gwW47bFTjdau8Ajm5EN3E7fQb66acNfh2JMyWMLahcjN2EX72jAJsUNdmiRcMKdb22swAfHgKJZEbxXM8RHQuuYDh9meJrj6',
        },
        '2147483647': {
          node: {
            public_key: '021ffd029faf6109fed694682a4efd5cff094d78e7305e2c1eac0530d241c64220',
          },
          xpub: 'zpub6qiQfUTdntfeeokBsKa3xABnY1gL3axQUMPHYELpYciFGG8eb2kKB31wXjTzrnVsJKfwgPeb2LyhoBx7VC1szpaZBZ5twEWsvhaxqrbKPAX',
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
            public_key: '02925bc7538a75ec5c91d9cd49036eeecc58c402fbf93fa60f5eb41e0f0876e6c6',
          },
          xpub: 'xpub6D1osMY2gDAVShmcnGNcCf3G9QYkSN1s8NhUu8uRzHRWLjsDXrDREiPgRt8w3rfmDERyJthMivUWiqfeBq3eXrkFjCZEFa1caVmWdfiQFEJ',
        },
        '10': {
          node: {
            public_key: '0345e8f672b94bb92e9f2a852a615393505a2fdae3849d3ed5ce0daa02374b616b',
          },
          xpub: 'xpub6D1osMY2gDAVtRbSm35MPQUseU7uFc66u1x4Pp94mYrKQfXzxBNvCGxxB93DYLAGeGbaktXMuAMaTJPGLavfnqTbRg8cfpmp7YPmQBuiR2g',
        },
        '2147483647': {
          node: {
            public_key: '022addad614c1aea0093398f33734fc37a3079cd79ddda1a4893d28807093bb4f4',
          },
          xpub: 'xpub6D1osMYB1shTaSTpVUDy5dPPAkvsjBMuKPCre6QZLNfiPzx1gtWe3tAjftJ4BP8M9M71Z8DkgFz8PcbVAxfnhm5p6onh5t8tZzFpjbmXRYJ',
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
            public_key: '0355d10cbbfc4ccccb00855fd1da04977e0103d38eb881befbe91660477a86f4fb',
          },
          xpub: 'Ltub2ZjLUDXTDwnwMfeUbUQtPhJkHHCZtLvUsiGHmxgxd2VNxRm6sHDW8KxcnEty6SmdjSqdFLHcdoJW8619V7M613A4sYMBrE96hZZ66UDZVaA',
        },
        '10': {
          node: {
            public_key: '022285d49c1def7fc349851faaf0829cbd29185fb1ab8e2a50377565c3864fc01b',
          },
          xpub: 'Ltub2ZjLUDXTDwnwmoKVJ9Hs1w13sfaMgo8gZ3K7sxKX1KYmqP7SFzvtXxoKHAaZg9C9fbPSTdDk8vQeEBL9AV7RYAVFcpe8nCY86noC9ZCjSud',
        },
        '2147483647': {
          node: {
            public_key: '03b5c420eef9f021fdee34fc516f2a665de72591ecda2dc14a89730a350689769b',
          },
          xpub: 'Ltub2ZjLUDXbZcKuV8d8hW3RwRPK2LLQyAVDCps1uu3dEp94ErxuFH2agbYUVLgoXSdgr3spKaW3dCxJ3NHsPGipLSgLYowhjVccQzToWGM5ESi',
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
            public_key: '03390e9e3414abd232310427abf5b643e36e71c2db2db51e1ff26b235bd5a4ecc3',
          },
          xpub: 'Mtub2tbrViPLq93XFRR11P4Q9gwitQrop8cwSF39mhUHXpyKYnuwPJES5AXzpSDzVGcVywUtnutsRhnGkf75zRxHwcemKYk2bfoXx8mejLFLLBd',
        },
        '10': {
          node: {
            public_key: '03680ef2addf201c4c53fff9de83d191b1d09566301ee7f990d2002518d098dcf6',
          },
          xpub: 'Mtub2tbrViPLq93XidHGrSYJK3QNdXV7GWnLe62ugK1LXSnMRLU3og1EEK2ecR6WP41dv6B2GdzgbtLYFSt3Q51bF1HXsP138YTJ6eSjKLTD9Ck',
        },
        '2147483647': {
          node: {
            public_key: '0220dcd054e5fa4e70ea7751d4f2ab6e926312361d0dec6bd03d3f801b931c584f',
          },
          xpub: 'Mtub2tbrViPVAoaVQBrFXXPxWt23GNU5RroRsQcuQTEj2utpcEdx4wAu5NxzbGV17vhrXrbqYdhmYQMFg2ojPY63WtgGWSQL1u7LbduoQGgrowj',
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
            public_key: '02d7a326a33d3b54a61e4c1fffed7252694316abf89cedd5b8b2e9931787f6439b',
          },
          xpub: 'zpub6qnrRbJnjpDrPv6Gqk8CnsLjeHMpVzbGmiVBU3NxdtLjs6dBL6BZjFnMwXECihhZFhwNu4LuCyeo7vEy6RDsBGeztFGbF4RDs8Xab8mKuGU',
        },
        '10': {
          node: {
            public_key: '02b445d6bd995bbb517620a9f486ef8823545d8763ffda5725c90fd91aa001fdb8',
          },
          xpub: 'zpub6qnrRbJnjpDrqwtZDqfWf8L9kyDcq6ghLSyYNA5rd4WBQKKUKYxFMERQBbazs3BF1ZNMJy78yT6sBQq2LUzgLpDyYtrkAhddSLjmYPaGAJK',
        },
        '2147483647': {
          node: {
            public_key: '037adc35440d977f0598fc931d4069ca82470513fd2f89e8b3756f8b22c8f1d1c0',
          },
          xpub: 'zpub6qnrRbJw5UkpWNdDcKUQKWNfRQpruAK1hSL71412UnW4gAX7YPSdv7qW2LaDowFfLLUUhnNRj52GC8TLdk6Rm2QLFTviaMQdaDTB7u9seYx',
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
            public_key: '02e1bd6ffcfa374fe431f4ff01fad518ecb201bd244df781574d753b4b491b5450',
          },
          xpub: 'dgub8svmgNX74Znh3eoZ8pQf9fTSqSczbjnAQNkWgCY4qapnuL86p35CpJ2GWpWX4nBKSu56C4wtYwgU77ekWeawxiB3wTrBzZZ1hZrxjuNZsiM',
        },
        '10': {
          node: {
            public_key: '0204a1e04a015bee9bcf98e284e25777572e8bd4b7d4493b9d470736b88f84bc40',
          },
          xpub: 'dgub8svmgNX74ZnhWH3BZbQDwwMRQkVLwvqtb3BAoggaKYMVMy8sqSoKUjUjekZEpkDPJgcYzeQWn4UjjYFAPNXEvTrLj5xMHxSWyrLE2whqRvD',
        },
        '2147483647': {
          node: {
            public_key: '021fbb3b1774a3ba258ba57c9398375abe259568f0e4842776c7aa5020b758b313',
          },
          xpub: 'dgub8svmgNXFQEKfBavKnMY1LRzYvNa7tLvVu4J1YMap8abMVhxUvHg6F2GQAihRrk5A4r7i9ZfEChbL8AZhihyJfp2VMhe8zUyd7on8iyEz5Vd',
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
            public_key: '031cc14bab54cd07698dc81c8ab7c3b6aadaf3f5d5bb24b59d98ba58dfb1a027f4',
          },
          xpub: 'dgub8svxEU5mw2PYFYVMfLAcNYuQ9nGaceXti7t8tn5J2vHfvBQkbTT6Q85hN6z6ietfQsqGgvvYMWCnPMsR5GwiVnkxszvVPs6jry9zBe9yTW7',
        },
        '10': {
          node: {
            public_key: '0327a22fa6bfe39654723f73b4af79a4b35fe64c8a0292648770dc18a4d5cdaf0e',
          },
          xpub: 'dgub8svxEU5mw2PYfc9czxNeoerBhVu1TsAa8QKahs6KyZvPeLuYjefipjeaJXAwQ5JyiPoHrPw3CkmN27ZDgtR7nqhqV4m2oqLPExpg6zUcsix',
        },
        '2147483647': {
          node: {
            public_key: '03726353fee4ec7b0d0403e2b8bd33830b1c79eb9f280d207032f53ae8f6f2bb07',
          },
          xpub: 'dgub8svxEU5vGgvWMwayQfS7X84UwQfym1dCQ1o5uGJeQSjgve8W2QwykZFyuMvhDgLvkRHYqaCdYGCmXnjjVTcqJ7D6N1DvjN61MgZn2kGVKnt',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '02d3665af442be1c832838612f435f9606c8fe61962867c7dbcbee584ed864276d',
        },
        '10': {
          publicKey: '023fa118cd37d13b45f7e06838847eaaddcb133d5565329ea72b30763a8ba43f95',
        },
        '2147483647': {
          publicKey: '02fe75db5eebc2dc655514b75fff9149a7221f6acd313227a07f9220607475fd02',
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
          xpub: 'xpub6CxQt11HqqGMotT83MVLS6Rppgq6ZRsQUHWsZ9C3obCkU7MHiiqUnJdT74EMv7ZSDuXg9dMuNPJgowsHfcYAg9Ag9o53b3D6q9ySU4RyryF',
          publicKey: '03b77ad8974356e616123ab8ef240ce1d244ccfc132a9432183f778c6736d90296',
        },
        '10': {
          xpub: 'xpub6CxQt11HqqGNDdGgD3UbwtEkzt537wLdib8p2qMeRpZuzDpg1MHYUncUGbMCfGMXcuPTGnj3pf3a1vjAfzoieRnUVZYC7AyKwB22tat9mFp',
          publicKey: '03d5b3ab7b3739b6840238b3a994e04127cd6afa646e703a2af293b44744099bac',
        },
        '2147483647': {
          xpub: 'xpub6CxQt11SBVoKwKEyb1muRBH23oFrRbhMkqrhataSHQXK5A8DCVyaGDXR3sTcXhWFsEeqk58CJenjEuSYPiGHNLLTNj8cgCcjTGuD448UgJL',
          publicKey: '03c263c44b16f482f09eee27055764b2d692439fca9b3f7f6be9e7d0e1dd85fe8b',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6FoVGu5AGoctTiKfC5WfY5XSW6sAoueCCC8mEPbaQPkjmo4imQZcnjR6jtPqmYJHdcYqpTMTXAxkJPRHC3vVFjZ2v6pEZJUysoHH3FjRYJt',
          publicKey: '034ca842d84d9b8228e679c2fb8842778c736e7cd2001790b2772ed7c12e623188',
        },
        '10': {
          xpub: 'xpub6FoVGu5AGoctuJjgtssxZNfL2Z7pXygdrsnugrHMXF26Uu4SR4g7DuHyCUVkYMexxrXc7RpXDs9Do1mYnRFtJg39BUxJmetYra3BEndRZVk',
          publicKey: '026fa312953551564cfa5133413e61fcbee6d4028367b9bee886ab9c469ce6278a',
        },
        '2147483647': {
          xpub: 'xpub6FoVGu5JcU9rb55XmFXVpUXrPR9gTBPhmSLoUe7FSCuGrRmq1udA8WCLLQisFc4egNg1xRENSPt3dQ922SeMJWLD8Mora3Xhivoan6T2x29',
          publicKey: '0205b1d4af2e2a22b6db88847a54851f1dcf384d1bd120cf5daa8c356a8b824f0b',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1dwh20lwmhmy3np3w0e4nn4mw8szgdkzl3pwfcf8tx7vera4mqceq37funy',
          publickey: '6baea7fddbbec919862e7e6b39d76e3c0486d85f885c9c24eb379991f6bb0632',
        },
        '10': {
          npub: 'npub1t3wy2lmn2jkjkquhcu0puftdyfqgs2h3gq0fu797ccjv75dewp5spn9vwz',
          publickey: '5c5c457f7354ad2b0397c71e1e256d2240882af1401e9e78bec624cf51b97069',
        },
        '2147483647': {
          npub: 'npub1yvvcnkpn2kasqw3a4wwh39fuhfajga8ctujseajc4443gphj5kss5g8n0q',
          publickey: '231989d83355bb003a3dab9d78953cba7b2474f85f250cf658ad6b1406f2a5a1',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xec2a90e9227af944fd084467d8e6d8015750e3d587f28ee57db0a916c194954b',
        },
        '10': {
          publicKey: '0x95c7fe291c22534a650d6964ea4cd1a0847805f598905759f98f7fe6a040eaaa',
        },
        '2147483647': {
          publicKey: '0xe498fe1ee3034092740afbaaadb50105e98f17e925beee53a8ef06246dbbe7e1',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '02f686a75b19559cf06324cf4d66016acfbfa3b7d108e837c18948e78257bd4950',
        },
        '10': {
          publicKey: '034f0a049e4126264694fc46de2b0a01b5590b3313af08476657603e1d56688332',
        },
        '2147483647': {
          publicKey: '02a53c12fd42b188ae95610cda1313b8d5902422f4641e742f88e3d10bc99e1bb9',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '789b942372ae3c6357f05816a14ac802c503361fdcfc6e14b3b3c196ad2f9b6e',
        },
        '10': {
          publicKey: 'becb190dd9dff9e1e845eafd59eebc9176918ded931970fc7a996c0dd127085b',
        },
        '2147483647': {
          publicKey: '18afe85dda33baa6f96bb202a03cabcf2b9d968bf2d9647cf119b4667ef195d6',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
