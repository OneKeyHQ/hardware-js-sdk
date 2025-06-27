import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase18-密语2',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428736640',
  passphrase: '7789$$$add@@R@H',
  passphraseState: 'mp5EXTXF5h4QB2APmiRSEBi1xAX3H5ga3B',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: '8004345b3104d85bae7520be35017d88e83e8192333502f76fc63ee7945a6323460c1e6de94a0ba12f60a7eb2e2dca82ef2a1f41cba5c4e2bd9af272a01a475a',
        },
        '1': {
          xpub: '4c4662992df1777a268f6bfe193080043967c1a2eddc6a2de9df0f1b6ae1f927d69fcc74373b3047ad690ad3189e52960f9141ad01453c15571c98a827ccc15a',
        },
        '2147483647': {
          xpub: 'e88207778bea33cc6678d85d9bc775f843da6ebc6df3d681b1d8947552f43c5b1bdbca61fead963b00f3cea5f1578d0dce0143614cd8dbf247747e9f1b8e3b15',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '94f3a198a94f6b86f63dd412b437d9d4696dbad3f82bd614ca61768aef1f333b',
        },
        '1': {
          publicKey: '795b63944f4fe0f6fc59c8ce000464ecae1aa397b4ddcae964822457d41993a6',
        },
        '2147483647': {
          publicKey: 'd9c954a6cffef1839b8b0fff7fae0d3e09235f2efaf2eb999c30259b8e40f75f',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '034bfcdbe0147d2e9eaa46796953c05012579a50009bde602c98ee5f15d47074a5',
          },
          xpub: 'xpub6GjEj6EU1PHaWbCpBdd1vjoZUmsJPZL1Zs8HwXxAuWPoAQm4KAWSGw41jEFzXBdMrAMedjrr5zSbPuaGj8FjSutSFBmBn16GjWcdtYXqhqG',
        },
        '1': {
          node: {
            public_key: '02186ab232a84df2aedf1714cf77aa6da74bbb057e2348b24ce49c973025fc1ff9',
          },
          xpub: 'xpub6GjEj6EU1PHaXWXsgQMNQRfSEJtzoXYsEiXhnK5ghdmeMmjNhfeV9GECsDohcvuDoK17tcQnR5ikuimtp8cHVzafHsbjFBspP4MxrUmT69P',
        },
        '2147483647': {
          node: {
            public_key: '02f767180117c8e3522f88d02200423e74aa6d7df4f12ca997d937c959501143a0',
          },
          xpub: 'xpub6GjEj6EcM3pYeYqcKhPFFRLMBz32fknTCC5q8HjzWK65y8sAQWGPFvfShW38RsoiYPuk3myHPaK2dQr6RRov1EHAFcS4Vgy18eNk79hUiUD',
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
            public_key: '02f0e68d0c35863df03bfa365625a329547ca6ecb8f2fad3f9620f5cff487c8e91',
          },
          xpub: 'xpub6CVxQDdgVwD2xEifnuUDZtFBq6TLRNt6yDdiNEnHuYTozTKmmSz5cwyNLtSrJqPCRrn8iw3fGETRcvme4SG7TGgaBEmiLWNX6U9KSkK6Aaa',
        },
        '1': {
          node: {
            public_key: '036c2860191bd63c308294f66f3ef0ab11addad3984e9ff4e48df0f5df7ebd49c7',
          },
          xpub: 'xpub6CVxQDdgVwD31HTF3s9C3znRrjDkHcUSGomNHL6sDeq9qa4nBWVriCCii5WCCEs5FJmRGTBDU9cyCpUxn527p6mjCBCGsV3NzbYHTBme3yc',
        },
        '2147483647': {
          node: {
            public_key: '03ab560a1896bce6cc61f989a7ff99fb018d1c4c6c3829a0b74bde07741bafd0fe',
          },
          xpub: 'xpub6CVxQDdpqbk14vX8k8xAgusQ6mfwryxKtiRGgFis8psmTMDbrVZBfK4iabDai9iE98gzxUYwF5Za7QPgvxUTtwfrUuqe7sbjx8hNx4BdDwR',
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
            public_key: '02ccaf6e2fcdcd27e1ef127d0b47d24dce9556311328d378647beca24741554d9d',
          },
          xpub: 'tpubDCpXavgjVg2GBUG3cH6v7ji2cRTMbLrz8NK9MPsxTo7t4a6ZXd1m8fke5xcsiTh3dmgTTYXsCpqscCmnRpZgTqFvrrraYsppdcMhwogTHzt',
        },
        '1': {
          node: {
            public_key: '0217a0e9815c937fe3c5e9369cb73414fe6f27b8599c513057d954356854a023a4',
          },
          xpub: 'tpubDCpXavgjVg2GEKZyz79TbQUNPSbAw2hQeg416nST5seBj3tJ5G7AJoUwSTR2G2HRNBHPoYrJJaZYCf6banmbJryMFiiGirwkSvK7uNEP4Zt',
        },
        '2147483647': {
          node: {
            public_key: '03cda09761b45a2fb54eeecbe8e0b539373753101bfa55eef350755d83f9edd0f1',
          },
          xpub: 'tpubDCpXavgsqLZELG1Ad14ouH6nvt9J152LXxea1KpVhxbfBqFVFA4vytpRjS648otEjY5X1315PBwXdtq1r6V2YqkmTDE4XkD1nFdXLUJ1uM6',
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
            public_key: '026f67d1b671dd1bf36588f27dba3eea0beb5bb6f863617e1287b9ad05f1d6412c',
          },
          xpub: 'xpub6CDaAafTco8jh6Gz2b9cbHuz3BR6URHKaBMrExYL7FVqZHwAGKVowdLwTXvkyPRHv4YvDBiBGHLJjKj9zsvdJA3uaXioN69WSN79P76wSbJ',
        },
        '1': {
          node: {
            public_key: '03ad32e57fd7fb85c7995f13855c3f18ef8ed714959b20b310e42e70a1b13b54cf',
          },
          xpub: 'xpub6CDaAafTco8jkw2fiomxwQTbQ4NaE8SaD7vceSwLkcHCa77m8KjrGRqeqzmqvdvLo39AN3nYRFmreae25RNJLvWaJFhz5d3SLfkFzE18RzA',
        },
        '2147483647': {
          node: {
            public_key: '031e6e1ca2f1b50fd3175facc4d35d036d6fd4c6582c115438e3a31eb7e6afcbd4',
          },
          xpub: 'xpub6CDaAafbxTfhrZ8YQY8EyRwQKL8nC3DRWvhpQUXeABwFoypNnrMAuTu7GrtWqqMoiqteKhwFSzrABNt81UwtpaPXGT88VrWr116MsiRpbxX',
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
            public_key: '0365f664344ca4ced72725eed9a78ec5893702c312f610ad15e05bfb8355483acb',
          },
          xpub: 'ypub6Wh1kuUoAHi7Ldct5R5NfZ3AG8AbD8rGBp4ET5z75Nezkkv47SNXtTKiT8FWZFZY94MUXgnw679dCBPN94dGo73hCfXt2UwVaTS1C5BfZPb',
        },
        '1': {
          node: {
            public_key: '02325c5fe4dd7c874541a22ead46631a307f69ed091abb5ea956716bd1d9434cf9',
          },
          xpub: 'ypub6Wh1kuUoAHi7PBshLCbY9LBtm3kzqEcAJC7PKr2EBE7SENvcgzUQMMTQR9XyLNYRXLnMrFWJRf1hq2AVCZTHCMXox6Q9D8tLvHewNBaCZJ7',
        },
        '2147483647': {
          node: {
            public_key: '039a0b2db2f8c24a7713dea57759e02b50a6b700f58e19e1e14a2de2486e336202',
          },
          xpub: 'ypub6Wh1kuUwVxF5VcKEN9GpKF9PeXqkqVMuzGooKciZY2umpCsEcZkkrp1prAttrD1qfrdTYsTkMxkMsfKX1SF3YhbbFm3oqdzTHQYXP89HT5d',
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
            public_key: '02967e13e18561ec87a132541719a2459eccc34c257e6d6f707b409b8645679314',
          },
          xpub: 'zpub6rtAiQGhKwcrRDafAWPsECf7x6DdTRQ9CwUKtup49nSLndpiiN7cqncoiun14NBW3tLxzoanb48AkPY7muwwdT4RbSWnkMfaF2GaBGH3jTj',
        },
        '1': {
          node: {
            public_key: '0283512eb4168044e90f75487ed1ee9cc0c1736390b74e3ce49df8fec044d1f69e',
          },
          xpub: 'zpub6rtAiQGhKwcrTpzKK3bK8gr7yfBSYYvyBD39kQPPFxAsf3qTfF36Tsus32G9ee1ynts3yN7JmYX4NcZgfMTafCstFuBiW5jtC5gFwJdZCP9',
        },
        '2147483647': {
          node: {
            public_key: '035192aa0398e64745bc01c774280d7d993286e1f8eecb05a18b1bea01962828ab',
          },
          xpub: 'zpub6rtAiQGqfc9pZ2A2Hk8RdQF1VK6HhBAvNRUgjM6SDpND3AZnzUWKYKPxnuEfyS5aiGzi4GnTpyF3w1MKWaZG666DuoNX7V1WQYUotM8w5y9',
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
            public_key: '02b9277de9bc47b741926a408c6141818c25a95e87fab9e50f54c26661b4340f64',
          },
          xpub: 'xpub6BfAgL5HbvQu8vpgqrQoD7HmFQud2Ees7PsfX1eir8mtoABRVZH6nctK5juwMR937sxWLm7vSs6NZYHdTPhWw33qqWuWSkwSBQCoATmuTx2',
        },
        '1': {
          node: {
            public_key: '02250c337ef15c9b8e6f4a7c7cc429441337fd43b03c4059230db206aa461be3a5',
          },
          xpub: 'xpub6BfAgL5HbvQuCXoNmSQEFJh758V53rDde2riSTxqKDcpnqfZ1rvDSUra1mUxGrwrqmbbuJ7R7cin5RoKZTu1zUdxJpVCq5rRxFopjyom7M7',
        },
        '2147483647': {
          node: {
            public_key: '02f2f228d06ebdb0ebd620db79d7fcbad7de70cbc2a4d537cc4d8feb4645036ea9',
          },
          xpub: 'xpub6BfAgL5RwawsJ81Noagd88zB7RMM5TDN7X83ts5n1KKnzzJoAN6wEMW7S2QXqwG5RRy7wMgLxmvgmhUL3RDunbcW8mkGGSUBigAanQNNZgP',
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
            public_key: '03f3099e514d7de5868bb46f62662f71aee49400029ef71f708e3b810233579598',
          },
          xpub: 'Ltub2YL62jJNYd6vAb8yi4RY2oMk1VbeNk7nQ6iWFTzhH8ng2s8YCY5inAh9g4MS4pt33ggPYjAKG1ydJeMa9NkyKHtkVuWehfRAiB1Wgtx7nfY',
        },
        '1': {
          node: {
            public_key: '03fb6d7f3857054793f74534ed546ccf791f95e9d60e77dfc6806c504e41830529',
          },
          xpub: 'Ltub2YL62jJNYd6vCqDRoic6JM9MB9aEh33Rn4Es8gMnbE7jYLc29p8c196BbSt9sHsJSKNhXoc8KcLBcsP8wM653EEjUr94b6KR1iScvpr8nHj',
        },
        '2147483647': {
          node: {
            public_key: '035ff1d285d80a3da833a492bc116f6f5d8c2f9e5306beabcdf51521d40152f4ab',
          },
          xpub: 'Ltub2YL62jJWtHdtJs4gTE3b19msYp7BF9TsLnv3iUuqQfEN2bB149sMgR5Ht7fMSoQAxRE4XprggXw7yH1w6MaVzJ47qmHQRtjkLC5U5NTbZWY',
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
            public_key: '03a8e2fb114fac1d3aa5e1c0a51374e4895e6adc8121cd2ccd6927ad6fd85911aa',
          },
          xpub: 'Mtub2svLvrED8GSZ6FdHkbAiXgJ6WDM5Liee7L3t3tMF3qtcucmhnDeoeMKygwx1DC4ciwJadGKMqw5KcRWasBtLHurrbxHaioh739JjPgvmNBp',
        },
        '1': {
          node: {
            public_key: '0385f8f8603990bc8d6b569470084e398e92037c1732e4c55811bf342f01962200',
          },
          xpub: 'Mtub2svLvrED8GSZADEg5ehGyUQPUBRppsYjipzixy7NYpuj3ccK75kVNYZUrkT26LLjkwYmsUXXXDDUsbpgN8Z7wN6W2xa35csCZmF4egHZKQa',
        },
        '2147483647': {
          node: {
            public_key: '02d4be0c1f382ab4a89d587f0d49bd818fe7571208a3262a56999e2a835edf6037',
          },
          xpub: 'Mtub2svLvrEMTvyXDtB2xgmBrGUNS12meBy7XnVUW8eutRwxeMS9m7e1DqpxDQQLPQqcwvRMiwNCufPka7hHPuLo3Z2Z4GgT6PbUhvmukPNymM4',
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
            public_key: '0251509c1791bd72454f5f9c0fb65bbd99ff33b9ddc27822e9a057a149358fa8f5',
          },
          xpub: 'zpub6qwHrCZvBm7ak3AuSwtE7Hu8HuTUG739eDZF4xfHdNcUR56CYEp4cGcARxcfyRSDfXY6HtvUtXq7VX7naXTnmVeVFEx4SaD7vHTXphYtQiS',
        },
        '1': {
          node: {
            public_key: '02fc935291e43e70280add66ac91f479d134c1a5ba25988c503bdeebfdd11546c0',
          },
          xpub: 'zpub6qwHrCZvBm7apJ5q9FjZYqwnoegk1KusGpdLFftab95STGqAvLGH6yMfk3Xc7RLP63Hy7tmeJr1JxpLEf5GzPQcqfegLUEBu8s7wX1PMPtM',
        },
        '2147483647': {
          node: {
            public_key: '0314320323f52ead6f8d84f6a77dfec185756992fd214e977cf77941b521f5926f',
          },
          xpub: 'zpub6qwHrCa4XReYtGMD9bXqBZ4UrhejLHWSEBFCjNUKadCrUj5b9G7rTzYNjSUNwqDbqEpEvyuJnY3r6vMdtdYwsiuHXLdFLuU8CsB23JdX6qr',
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
            public_key: '02d8b2b0d18b4d9b7a779d20a26bd044117885ca4f0f2812ab7be03b73449a1c5b',
          },
          xpub: 'dgub8sAkGBhL69YrLoVhojbcbZWb4QGWvuKmu3cGY65sMNHYSFJ4hJNmSXk1BwfkdP1eyL1BVhiNzLPK3LAghVuiTFeRcNMgMCYTDxKp8UkE1VC',
        },
        '1': {
          node: {
            public_key: '0203c158e56b18cb1af81281fa0a8269c924aaa9f3bbf4a7fe1ce76c07112b8f99',
          },
          xpub: 'dgub8sAkGBhL69YrNvNBqYaiPNCpbH6xkNe5Wz88uCMpvNn4djqfqTYZkoxhc5zbNCSQVxCN7uizaCMNYc7Q8YHVrvaWdGVDzoXaWiA5pZBm18u',
        },
        '2147483647': {
          node: {
            public_key: '02c7265134a31b3759386a7cce39be15c95ca32e9e54262b72f31a76968b50c187',
          },
          xpub: 'dgub8sAkGBhURp5pTnDmFRwPS263YEnueG4M3bgG6UzKvtNEDdem5WNdxTh59vtLcNyV8FM1uUCLEotEEmUp7N5JNQ6q1ZL3mkNw8rV4Mxk4y3z',
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
            public_key: '02a501bf718dddab9922b793628030970643222af47150f7301a9481f5d9e5f308',
          },
          xpub: 'dgub8swHwNj5vjPe3nxCoFoVsXY7beegTwvW2E6t9UP8fEx9BpGGT3QfvSugWYL6iNXcmGo4zvbFYRdbEntw3QBthcWzrYWGGEgkmbRGv7eQjQZ',
        },
        '1': {
          node: {
            public_key: '03fc142d3ff9d6a0b77725e06886a00de0e7c3c74331f2a4ca05817287d0094d50',
          },
          xpub: 'dgub8swHwNj5vjPe4QZAzf7zXCRe7k8zmiCbREPi8rHQ95VhFFZDNfgiuowZafoy5b5ZzsRMNBZ3K8PgDzADAhbQ4XYKr6wrqFv8buA8v7qz1WN',
        },
        '2147483647': {
          node: {
            public_key: '025340570ed5f2bacf8bb36a08bac8a38ad5c69e4ccb2520315e515cd0b7d7d403',
          },
          xpub: 'dgub8swHwNjEGPvcAFCCum4ipAqfm7sZ4Tzr9cLihjQoK2qSBbw6YLwjZSzwT5YusuCauYuJDeccV7BHqkBbmhfdeX4Zf1Aw4yRgkdcve9H3uCc',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '035febdef9e8462dfa8c61dee783cc9848b447ecc2230ea43432ed69114b50199a',
        },
        '1': {
          publicKey: '03f8a095479fa2e0229580a420f8d894bc5ba19cc45c9d3ab5b479d126dd3c3c2e',
        },
        '2147483647': {
          publicKey: '0280e27d0696db9d1a4cf9dd5d6ac2f955f9464988b364060f3da7272509d1608f',
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
          xpub: 'xpub6D2vfSNf2h9UFk1inVFPKoqkmgbN6ZUzduhiK7fm3pF3qdDtZU8qnGwEHA9SGpwWeNbnZkVjFFdRuqyiDw1z4exZETqXby5ksex47m7vGM1',
          publicKey: '0367232df4eb05102cdc2a2e2b8d1cea2926ae1d5be965abcefe6437366523b10f',
        },
        '1': {
          xpub: 'xpub6D2vfSNf2h9UKfiESuh7wcwJ74qZWtTGMw1Smw6btz8rHAkigHHF2KzdL6TKSdbtNU995zjs5LKgdGNEKJMGHs9fsGJ21nwkwn6ahc5na7G',
          publicKey: '03fb0511280b356d7710cb215e9f9fbea2dd4e4f440767ddc9b4d3f3fb44d8494a',
        },
        '2147483647': {
          xpub: 'xpub6D2vfSNoNMgSPBjWnXPVMEDUZHsFb4kPPbDtShXHRZ1gxsjVmMshzyma7yUiEuXpCWodUk6GC7yL8Hbz2ocMjKExXVjgLqoXvbtXVyap2tP',
          publicKey: '0378b9ebfaec31ea46a1f3da6ae130ba0e8bb98bb3b0e0e59ad90290245b23d2a1',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6H5CUod7pEzubyZ3PTyPvHWQhrGEhvvknemow47zYbip7BMdqfX3f1WmUqotDib9V57Eh9uSN8JeUGTFpsLLbnka5WN2CHbgs85xwCR5ufF',
          publicKey: '03de2fb3499a1f7ffde47aaae776fbea1b9fa612bd4ca85f8b59bd2266575ea3de',
        },
        '1': {
          xpub: 'xpub6H5CUod7pEzudcHrALaWRHVKXankKa8tP6UK8fY4S1xUSdWVTiSHEvfPB6gdSBjwMrgwBD9GdqjWXQ5sQNp2YJaRYhLokSQhHH1FMeRd13a',
          publicKey: '02edc97f4fe10a2cb1d27ab204e2665ab3c2244171423651cb985c7ff66fefff03',
        },
        '2147483647': {
          xpub: 'xpub6H5CUodG9uXsi5aY6CpX2JHNVrSndx9h39c5WcCyVHTjiAEv1HTS3pqo5rX18P9RpHkBCrGRrByZxWBvryvdqTYJ32169SetdnxEtLPPjcM',
          publicKey: '02a307f8741502d51cd23bc44f8b516f82b80e0e158ce3edc90f424b15aac24d70',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1gvdwr68t9r3s076m3l7qv5au9hpv6t3vh8xeqme07pal9rntf86qj882cz',
          publickey: '431ae1e8eb28e307fb5b8ffc0653bc2dc2cd2e2cb9cd906f2ff07bf28e6b49f4',
        },
        '1': {
          npub: 'npub1awhrfz50tpvt7uex9h8cam654rqujxzknntvn6j3rvmsp49vcr4szf02gj',
          publickey: 'ebae348a8f5858bf73262dcf8eef54a8c1c918569cd6c9ea511b3700d4acc0eb',
        },
        '2147483647': {
          npub: 'npub1a3pm7egvf3ysa29z4vlmd4g68r0mud3z6tw0sn29pz68wk72fw7s26zguk',
          publickey: 'ec43bf650c4c490ea8a2ab3fb6d51a38dfbe3622d2dcf84d4508b4775bca4bbd',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x3635296e1eb28710f4bc3ee0883ab72a68d6318bbb307798637a17d2bee90de3',
        },
        '1': {
          publicKey: '0x3628477dac2f7c019db8147e7b360d15b07bff50fb126854488c4b1312da1aa6',
        },
        '2147483647': {
          publicKey: '0x2f2b2b76db0ad294174d14a36daf2455c89ed1252ca1cd19929eaa7c94ccef68',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '03b84e68331a5cabf652a63cf5e2b6aba549d14381082d1c46afe2f2fdc55b85fb',
        },
        '1': {
          publicKey: '0324714ebeae7c1883ba2b47954957c5f37957f04c9b22fc26eb8307ca332b821b',
        },
        '2147483647': {
          publicKey: '02c35e6ab9c8a1927d82cf5f12c4e0ad241e14e7ad113c3e3281eee0b6ec2b75f6',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '6d46cbcd2708e9d75216fe95a511c98caaad1607a8b61ca205707b7bce1e9db3',
        },
        '1': {
          publicKey: '390375100411f56d7c0c0b62ed508d08883a8f23617cdb78062bc8113dbcb79b',
        },
        '2147483647': {
          publicKey: '26118c977a4466da5a662fa2bbbced932bf0990cb01b15cb9079b3c32c7c2a65',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
