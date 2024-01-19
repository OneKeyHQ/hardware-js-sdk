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
          publicKey:
            'e2b4010a1671cd7fb9075c271a8b577db3da5c97a7fd24e1d46f0ccd3915990ba6b4eb9a52f043cb95c80b23761b3196f4c072bc0a4d2ac4c2075b98f9e01fd1',
        },
        '100': {
          publicKey:
            '806fd933d26bbdb91e3a7473cfe6f6c2517efa12368859be2e61b0b621a2a908157e3d13a1efda33926e5a3c28c6712d02ac35a9d3bc4d77cb49c72ca8c954f4',
        },
        '2147483647': {
          publicKey:
            '273257998e69a2de91b5c555c5cb98078e8ed40d3e0623c2c15b3da92c763ddac4a6c8e543b9049cda4580c2660bd4a43582aa52f20ca3bf0f3b8b9a32ddaf19',
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
