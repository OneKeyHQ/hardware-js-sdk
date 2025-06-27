import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase18-密语2',
  passphrase: '@CuihsC5',
  passphraseState: 'moZqDJs2wgTz4TY39eXAhhrWGD5fQZo46R',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162750',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: 'e2b4010a1671cd7fb9075c271a8b577db3da5c97a7fd24e1d46f0ccd3915990ba6b4eb9a52f043cb95c80b23761b3196f4c072bc0a4d2ac4c2075b98f9e01fd1',
        },
        '100': {
          xpub: '806fd933d26bbdb91e3a7473cfe6f6c2517efa12368859be2e61b0b621a2a908157e3d13a1efda33926e5a3c28c6712d02ac35a9d3bc4d77cb49c72ca8c954f4',
        },
        '2147483647': {
          xpub: '273257998e69a2de91b5c555c5cb98078e8ed40d3e0623c2c15b3da92c763ddac4a6c8e543b9049cda4580c2660bd4a43582aa52f20ca3bf0f3b8b9a32ddaf19',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '49c3dc8e41f0d7d1fb0601e09c9de82d6686e43f95db2c92eda9b1090ae123b9',
        },
        '100': {
          publicKey: '16477b73491bb60ba62686133168bb7335059d93b8a78ab036101746b9835ccb',
        },
        '2147483647': {
          publicKey: 'e561e7e0704cf1dc371ce5ad85525adea2ffd3ce96cd014b25dcd4f13bbd1efb',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03c2e01ddb49b7fd513095d0418cf04a2ce299b81a36eeb70f83b8efef725a79b6',
          },
          xpub: 'xpub6GJuqnv7SngBqrsWnuFEWHxDZKP228mm4W17xBf8juQHGJ6ZjwSQEefBdFoXk4yzTnzRav3PvnDHV4hC49CLPcbbPS9SzUkE49i1h5nhG7U',
        },
        '100': {
          node: {
            public_key: '03253c358302be3bf3a8dae6d234b7a3b768ab4db0e598314cd7390b08da9e59c4',
          },
          xpub: 'xpub6GJuqnv7SngGEim7wzYMPCVyw6T35JxEhWhWc2Y8MGxMAY31kBZfq5chKXX616V3mMw5GbG5DDX3YMF9Sar9rUTAf2EF7rn9FictZccQbaf',
        },
        '2147483647': {
          node: {
            public_key: '03acdcc455f42a5fae4e874569d106d667e1fab2b3b13556ee9b520dbe7905e926',
          },
          xpub: 'xpub6GJuqnvFnTD9y99AnnKYh6Py2VURx484iMiA9jMWiy1KXKpzushThD8ZHTQ2f8EmmQQd4rdsE2ExMyxto95s1yK6RTuhm2yVLSVJ1VfbZnL',
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
            public_key: '025984da639a5aabe2b176469f0d4e4ebc085cfc7397a5b42a510fc3adff220f2a',
          },
          xpub: 'xpub6Bg7pU4ppNtqMKDNF1h953KJaxinEr4aNmWpRy8QvdP7Pazz8YLXE9Um7qJMptHs3cDndzWaWAV2WQRF8DHDfvfXDmCrFdHmZG1Xjh82cFr',
        },
        '100': {
          node: {
            public_key: '03b2ad4ac1c79c986cfbc1d9b0c3ee6ed5363826b7dd3b9ec9fce5dd2860aba641',
          },
          xpub: 'xpub6Bg7pU4ppNtumUFx4t2QQJhFcZvvyNpso8L53DM7weQXZt1KPNnaTnzt8EQMdh8n8xD3QiYifyV9fysUmbeWLas4yFrWURniBo7iQLpwRar',
        },
        '2147483647': {
          node: {
            public_key: '0306a8088b9d5c3ca7cb9282533bd565dc6c60ac0c6f33db6c0fa9c26f63be8f37',
          },
          xpub: 'xpub6Bg7pU4yA3RoUNmByGLT3XYpm65bjoKq8ztx1E6mFpGyedoVFVUCuhGS7nSYExfAAn3aiQkyvdaQ3U18edwCUYmEL4PZjfxVPV4bPTwaJ7K',
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
            public_key: '02736f715dc81179f386bbc8543bce88db091edac2bd29e6c92b2c8836626627f2',
          },
          xpub: 'tpubDDLKVzePhvFrJkzK98WHvbpSscbKULCqdX9wiAK1Ya5iqRNXYmCE2vDwk6hsNs6S3RMvdRsUwNPpi8WShqJasYcPURHrcznzUi117rjMhbK',
        },
        '100': {
          node: {
            public_key: '03cd95d777e223d27984ea0b2c2383af57a316c8514cb004c08f453c7fb585e06c',
          },
          xpub: 'tpubDDLKVzePhvFvj8EhcT3H9HwcbjKVQAF5YMghTnD8H1uk3EAN1nktNNKt8pqzbsxkyPfZmU3zJdeUJmo19NWWKPZ2MgEyohjT2brEH1eNQaa',
        },
        '2147483647': {
          node: {
            public_key: '020f03c6c53323904908e558481211b327f89a353e36719232e285d0bd1fc69e15',
          },
          xpub: 'tpubDDLKVzeY3anpT9aWTdHNaSjoryUF7YYu9t1giEwz6Q27La9MBFburVN85XiPtysCvkUkt4bGobMD6jRVwPqzp7qjRMTL95X4dhYmMSvGyzm',
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
            public_key: '02144c814929e7f88992a22b49b2d180da27df7a2bb4dc700a9a710016d005a19b',
          },
          xpub: 'xpub6DCCGFGKKPttipkPtimt7GEbM7ZkafAiNMYYF1T2Cj6z72xKrZn98ZXu31RaCjXjbpGWziiATLMQdGx3B6mQhNzqksuVNQPXM4qhj83uSeU',
        },
        '100': {
          node: {
            public_key: '02100e959c244a1e789c321514591534f43266edfae4a00334e6e94caab5129b94',
          },
          xpub: 'xpub6DCCGFGKKPty8N4XarPoiBbETZAEn6JwKQVfVessFAPHJpcbEMM4YMNu6bJPS5ArjC2pggVq34EPQVHFRJkKPovK1LrWfxD3HKpyy8tHWBR',
        },
        '2147483647': {
          node: {
            public_key: '02b132db2e5d39801cc0c41cc05b3667965508763254a071898f92af86f63c57e1',
          },
          xpub: 'xpub6DCCGFGTf4RrrELbi3EMNgCGNJvU7Gr4Hwjsv23y2dLfvLdje8ow6v3wKv2Ss2G2P7UyGMGehzAA9T3PFJs95LE71ZZjkiEvMduj6CLESmL',
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
            public_key: '027c3ae72d55cdd6782b8b0447c558e962b25ed575757a3a321c4f94cbca215c47',
          },
          xpub: 'ypub6Ws3bHjKuV7pbnuBZAVMqkTBfVp7wJg6NUctyciBabHm2BUfW13NsxbwJsCGSQqbaBnspT4pdU9N8eUxJcEfdtwJCZ3mRf43JAEvgK9SUUR',
        },
        '100': {
          node: {
            public_key: '02cf327d349e66e9c08f8a8b09cb2f67c618692792ccd1d78d03d7e47ed5b47608',
          },
          xpub: 'ypub6Ws3bHjKuV7tyjU6TU6mzf1WiVdtyrAGeBr6s2dHaoN7EVumsVumSDALJRchzBFQEYkUuxaTdXJgmVK2xpeFSKYKRsaV1FqcWUDnjBM76or',
        },
        '2147483647': {
          node: {
            public_key: '0353bb5981204af62e8e2991ba0134539d739d9cb0c2549e7d3a36b4e5cbcda02d',
          },
          xpub: 'ypub6Ws3bHjUF9enjjwDtyoizer7YtePHyC9zZ8Bvh1J6SnFXQPcWYLTMT86Z143uAH1BqAfki1VZAVxbx3Udxg1MUouarE3D7ULReZDitGPi2Z',
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
            public_key: '03c8a1237dbbd0d9dfd39ce70a6cce0d4864985683ae325d6354bc122bcf1d71e3',
          },
          xpub: 'zpub6rYtZqoSNkAVVZXN5QUGZa5qfMqBjkUhaj5BZp5dTfYMeo5XGMyU13V1Eu6Xanby2ZdVV3yMKCZwcTnHTYn14QTFwykW4wnhwSzVtM1wSYS',
        },
        '100': {
          node: {
            public_key: '0389aaf271d49a1c886177565d50709d1dc6d6f65a0890c25bfa384552ad843f6d',
          },
          xpub: 'zpub6rYtZqoSNkAZubTeQLjEv2JbFwD4aTddKVH2NN1Aj8z3usnAs2hkxebVHUt4Rf3hGvP77JC2Ed9f4BTTVm6af45t1p84yZW6YppthyYq9Px',
        },
        '2147483647': {
          node: {
            public_key: '026053afd4b35bc5d417e56069970209337c82d783216972b37379e7583ac8be7f',
          },
          xpub: 'zpub6rYtZqoaiQhTdofVHaJ1uZH15HqdRFMmYgi52WYHB3mdv4N5t8b2YbB3d6yrbPjBqji2Q5y3VRTK74rYXt34KHuoM8WGoiEcoR6tvZLVb3F',
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
            public_key: '031f9046d352404292b6aa9fdcba6cbb5afb0083c50f507ee7d5ee83d016ebf849',
          },
          xpub: 'xpub6BniuF23A7xR1J6r5LPpQxuY2YVdYRFTLisf6ZYASMmLAug8yKt7XqeYTVMvR27Zufm3K3fA1gNAgSRrsT6vDLu1wFrDyqojhYtTda1MAPD',
        },
        '100': {
          node: {
            public_key: '03c0d30d7c638d0e17855fa318e4a38f560e270f1b9d5731a546109e53e1603454',
          },
          xpub: 'xpub6BniuF23A7xVNkoiLBqfpqLKU9xhWNkoctxeRdXgN3sjSDWXfa1QRx9uPRWEyaCyrtkW85zR44ZVvWdxvqpxzFC9bCmtkZ5rPDMB41vGwxi',
        },
        '2147483647': {
          node: {
            public_key: '03a3d5b744a28ac7536bf2588e14e60c7ea5608a11af98b91a6d9633cd1c9d3343',
          },
          xpub: 'xpub6BniuF2BVnVP7bZdcRpvZVr6sMqAvw9d1jqbfgkFMVu5CUXDtgahGdXJ6BMvrReJmmXhWx78urHtRyjYJpz9C9t6Mp1eVmGrT18StHrKSWk',
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
            public_key: '03ab827b12f149646930c9c540e2aee73c17c3d04599fa88d6b4aeac5a8257b6a5',
          },
          xpub: 'Ltub2ZFBeejoYKknudTBJcJrjRcfG5DFYiHrvy1fuEJFQtiF9DSDgUNLcGHDzh5eRZVehHSCka8WpyrwtLrcnRub4sbVNHbnGz3spFghVz9r2oD',
        },
        '100': {
          node: {
            public_key: '03f4f77bd9bb3177c2eaa3cf7d5b3da4d75972b9483ed714a8ceda17901b502137',
          },
          xpub: 'Ltub2ZFBeejoYKksKnjjX6FzC8DJV6HGuBZ87e5DrpGzhvbduJnSyrDSuKVK9QbC9rP2GjJ9KkdUN52xMqEabhsi5Bv8rhLD6UUdf3QdFouMnsc',
        },
        '2147483647': {
          node: {
            public_key: '025d0ea039c75592c5ef1a63f2cde9649aba23eaf7c41e6b32526f43069ca0c3c6',
          },
          xpub: 'Ltub2ZFBeejwszHm55fzDg1GhuXKwyxGGL6SFUbXkLfR2CXXXVWP1EstGzhgwWx1jYtYkgMyxTfVuw9jXqX7cneQeHDW9q6eU8eQbS5E4BbguPJ',
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
            public_key: '03b9a774ce11d7bd999ba05618c16e9ac395bfff696fb169e46a85bc27fd9a0331',
          },
          xpub: 'Mtub2sP9pgXn6CVGqeXu3R2RV6rVn2673Lnywu35xZmpLHLfWj1wWGWjYJKsJ8KFhdgZVWfKmr9Gy8ZCeRsxyKDSD13RRJuWtfJBnL6erbwBCXK',
        },
        '100': {
          node: {
            public_key: '034c9fb2a37f1d972f163cef5e980bbc06b8e08c06eb949dc3c51ce5650fe12942',
          },
          xpub: 'Mtub2sP9pgXn6CVMG8MjjvydcMKpySMqL7vaZmVHSaPYTwVzFdvpgbA5oMuq5USAWbBLHob54TwUX6ZF4vWGGTW7vc7srQhTjdzALt5Xoxhhbpc',
        },
        '2147483647': {
          node: {
            public_key: '036f6bbf0f67161f6a6aa909181c30b03ecaa5c14e2141d4eede64ece7e8335d31',
          },
          xpub: 'Mtub2sP9pgXvRs2Ezgc43W1RqnYg2uDVeVcDLv1vbmwtsnPvaC2R24rHT8kXiG6deZxMrLfG4x3Cqh7grC1HuFKDk5k9EwVBPHss8k4o9HMtEKs',
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
            public_key: '02435fa63982a5f652d3d82314876142ee88a63e1a2ac1912f1285150a2bb55f43',
          },
          xpub: 'zpub6rrRwKak4vpZmGQCaQ6Mu9TbzzfpPLmKjdTkDSAZ51uR9xKoYZGrAgUFBKZfyAzcqYKhP5Biehzz1WddUMd5Xf2wUbibKciV6bpLc8bSVEt',
        },
        '100': {
          node: {
            public_key: '033a6b235a63c99c87d0e9a9495057bda56bbeb75a7dcd87383d76ccb36f3a73b0',
          },
          xpub: 'zpub6rrRwKak4vpe98LMfJ5cGEnJMtDmKFg7KQAXnEQ7irJ9JjUEmwzuh7w5UguHJsNvrCebWZe4N4oDVAq67JTsHpMHJpXzabvqKCWhhnVqmWE',
        },
        '2147483647': {
          node: {
            public_key: '0380e88b844b150019e4c9003a6eb1f78d29b5b9b4dffa7727f522c1c7354313b6',
          },
          xpub: 'zpub6rrRwKatQbMXu11DQRj5jjjitDWEd4u6ATgGiQ9fBDiUCtPbjwRAKbva8sevZYMZw461vVyjV8cu4zgSLe4FFvTwT79KAjweiWrHyK3kGUU',
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
            public_key: '0310c550d76b396f791c6d0e2e9aae813d587d205e4846754985e941debe3e1c07',
          },
          xpub: 'dgub8sULqdR92k8w49nLtFyuUwWAfBBDpE9sbKDXAE3s42DjbTCWwUHK6jTZzQzwapHc2ewt8NxMCNyiCukzAhCC6QiPL4SGLQUYiBvuuWfDvci',
        },
        '100': {
          node: {
            public_key: '031e35cf1371e3867f86a6f25673ce2bf4462728eb0a7163116ce55ed52182e523',
          },
          xpub: 'dgub8sULqdR92k91TG3GY9E8gtzrkoY89S1yusyzhiF18p4n83b1vegcZteG2nFVLyiQ7sZTXiW6KpaUvaCbngrBYDkWLKyk15vd1HDsQczzE7p',
        },
        '2147483647': {
          node: {
            public_key: '03de71d00c7828ccba685db3375b9449dad16b027c98868e46c716137f042edae4',
          },
          xpub: 'dgub8sULqdRHNQfuDug6gTszDGBep6PJfu1oAup2wZMTtzwWCvbvd6vxDvgaZ84kf2rApkBg9NKvDCZqeqqVo8H9qouCMyZkBZgDUXtVwS3Sewc',
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
            public_key: '03271d77fbb95e3559c66a329062b90c226eb4fcc0f5a699553bfbdf5cc66b2d71',
          },
          xpub: 'dgub8rFj69XqVUJQSXavngcCfPJSFLphQJdgYXpN8S5TuaCbtbd7FyRnkZFdt1wvejC3GYki5mSf4BRH5GFLivDwZRkGEDE8nPnwujNYwnTUX15',
        },
        '100': {
          node: {
            public_key: '032eca32d14d81fa56c247c1591dc5969e9a4dd52e83db514e2dd70ea2758f9954',
          },
          xpub: 'dgub8rFj69XqVUJUq6AqjxNhtLssRoKAJEkgwxzmjSVVcnfJPqkBWh1DZiSBX1GgquNFPY7UEWofHgHecGhWzp7XxpAqgnM9ANePrmz5ALMXZvM',
        },
        '2147483647': {
          node: {
            public_key: '03042b87bd5021519bd863e8b778e374b84c525f6c2e8911e317f2d50e85c9d404',
          },
          xpub: 'dgub8rFj69Xyq8qNYxQU7QmnCdbysUgF3bQ2R2LEd1SYAET4xMDGRgwtHcYYjjXjhsKjPqE3Cukqom7cjezEHkUzNmPawRNZw6DjkrzCJgGH9UH',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '02485e59a4a19dbf740ee5409c5b20889db3102e957785213dd254c07019b56e09',
        },
        '100': {
          publicKey: '02b912935f58f91b17dcddccede31e2a36bf6c05b1ba6cdd63854143da5830861b',
        },
        '2147483647': {
          publicKey: '03f166b542d959ed2db4dcff73c22723dad8fef0022bc0118a9956b5bc16563453',
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
          xpub: 'xpub6CMNR36ADaEsrSAJxerb3SGWWwZsnQzDy5entazJGtbBxiAwHsQUBeVU8fagmNPma6iR5HUSns4RwaSh7S67gXJGcwVAyP2bd8dMDDy5zBf',
          publicKey: '0224da62960a287a1efdf6287f25d13ef86dca8323948244e5ee412212b8afd6de',
        },
        '100': {
          xpub: 'xpub6CMNR36ADaExE4n2mzDZK5CRUppKJveB4iq4NYxJm9Ln4KNN8HetKusgLfBrR3QiZ3jtHGuGnDSsytpFqWV8LC469m1yMPqYGGksKEtM4ed',
          publicKey: '03215ff0cf2f1f824591656ab20ec545a6751255503f68d91adae33343c457f91e',
        },
        '2147483647': {
          xpub: 'xpub6CMNR36JZEmqzfgx2bZ55g7ihetePDfsWUWEFc4kUqXq5vzJ5LyerK193zrXQeRnZhpaoQrih8nroBjqY9SSd2ARcugXbxQ159w2VzC5vA2',
          publicKey: '0338023e45a3a2987696394692d5faffd70ef8ded43b6cfac7e7a4d8adb984802f',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GjUEXaCZts7eyTUQ7FbLW9S2raJLzQs8cLvqA1SZsGTufgMMZ4Amcodk9neXaT4mKDDqpdj4tKcujryVQJJqEoX9Fsgv4xWXZwjtJL6Dd9',
          publicKey: '0207e0e709d52daf65fb9c5a8ab486b1251f1b7b1dc55a9657c5180b0ca03ec2dd',
        },
        '100': {
          xpub: 'xpub6GjUEXaCZtsC4x4trZLXo4tQyL8MY5V1AVS4nwY2pSD9N73w2NkD7VnQ7f8oFMdU9XdB9MNh5SMe2bKoFJpTfJ1zGMpHkzEmXSam4ayN7Aa',
          publicKey: '0243b2af6dc3b40256e8a6a06bbe924194bdc870f4e71379361067187e5dd11811',
        },
        '2147483647': {
          xpub: 'xpub6GjUEXaLuZQ5o819mTym3WAaigSwqVFDFEZRgVbKVM3x6xSqdHk4isXprCScRjM1LgZgU5ZFHDjjMy5TcCvmAjFRaBSoRMmfnHhBP6ZoEpe',
          publicKey: '025bf40ccdfb2a2e1f6170cc9116d7261ef9dad5d61943a3a15579ba58580fa063',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1pne84dh5723y2uynr0sptkpz27lpv834gwzl5580gg8myl9xpmyqfmajj3',
          publickey: '0cf27ab6f4f2a24570931be015d82257be161e354385fa50ef420fb27ca60ec8',
        },
        '100': {
          npub: 'npub1a5l9v3e2ryuhp00etwzk6aruchynudn4rps77a28plc0jg2zahxswqd60d',
          publickey: 'ed3e56472a193970bdf95b856d747cc5c93e36751861ef75470ff0f92142edcd',
        },
        '2147483647': {
          npub: 'npub1w23lh3qhyejlkwhjdys6auxpj2xpxyusk344v6jgduv8dvpcgkrsn5m3t4',
          publickey: '72a3fbc4172665fb3af26921aef0c1928c131390b46b566a486f1876b0384587',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x3ba0ac97275a225ffa5d1de4b5a0ea4988ea80590192f343f42630cecafba5ef',
        },
        '100': {
          publicKey: '0x810a5406db9d98b8afb8193002a1fe3312cdd8458433c591e1b6a67c7a2cb6b2',
        },
        '2147483647': {
          publicKey: '0x3ecd79c221b46fc0b6233f4c0fad71b72ecf399e1e212f6c6b79a7d66742c755',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '03716ff4058a5d4406ba493127bc08772040b1ed6e2034d098869c3e2afc6393d8',
        },
        '100': {
          publicKey: '0274ede07763035d9ea824a1f30f3c276668cafb9e8f36a7cc49fe6d1f2b203e20',
        },
        '2147483647': {
          publicKey: '0393b6841aa53e31af46a3d8c057025cd7ac23f5e3c5c03ec78ed4d4be6045f3c7',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: 'b5f7d1a6884d4911cc7f8d3d4d80be04988181445efea14070efc3e86a47f9ce',
        },
        '100': {
          publicKey: '87a38888da4ca4e374e5fe0b1b6e587f2b546d7ea0ec96a4b1e69179252005ad',
        },
        '2147483647': {
          publicKey: 'c5daf0a4a522cb02a9aacda2b00b0574088f25ef24aa7e257131fe7f0f4cfc95',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
