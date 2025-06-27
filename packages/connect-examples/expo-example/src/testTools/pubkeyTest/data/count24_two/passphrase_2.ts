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
          xpub: 'c32c95e16cbe8a3cdde4eb6e2dc71895876c9e83dec945f575a41f114a18e9d165d47125d72a39240fb6bfafe48d3551176a09e807e51a902bfe37dbfd7be8d8',
        },
        '100': {
          xpub: '16d9cc98027606fe4fd38adfbfe8783a7120539cf2596541b340dae1a6f01373137d1375b7d832e92c019581ccfe611df3469d3cfffaf238bce08a5d71d5f788',
        },
        '2147483647': {
          xpub: 'a94e856c5206bf3f3fa77c558c043afb93541c94b323da89390658e127be5b296d68175f9cdff4a5692b863bacdcd0a6e4940ce2d65992e93d6df202dc6ed681',
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
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-test-xpub',
      params: {
        path: "m/44'/1'/$$INDEX$$'",
        coin: 'test',
      },
      result: {
        '0': {
          node: {
            public_key: '030fc82e3b237747b37b6ad377ed983884b72ebe3cdfe2c3bdda7bc3437f5adc5c',
          },
          xpub: 'tpubDCES5ad8F7Xp5BDVPuov1fssvy2v9memqJ2SnmSfzsfdni5RoWLQRgmnams5b6Wyo4VbpL7dAdezTyP2YyJfgr11PuzbBqnvpjvHvEFtTWV',
        },
        '100': {
          node: {
            public_key: '021a78a15dd078f9229bf9622137d6a3f22917127dba382fee3e9671d341816d5f',
          },
          xpub: 'tpubDCES5ad8F7XtV6RTsF87uHqsr9cJ8zqZHnQXc9YoWJRhkpq6yaKSzK9o66sYo6AAGgo65dFJQFjf2mYNAbmh4jL5AjFhUgGhpGGqYfYDLjq',
        },
        '2147483647': {
          node: {
            public_key: '02f66b559cd1f064349fd9bd0a49f74d700da45d305200173501a4ba1dd2752b40',
          },
          xpub: 'tpubDCES5adGan4nDksa9sb7qL8rSG7QVMHGKvJHa5Y8CoR6kkcPkXLz28DNTvdX4gpkXkHbpY18HitBLVoppQwtZUtABMPSNMoUUdMdHTQtHx1',
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
            public_key: '02881fe6f4d27c743f1f6fa5ff854d6db3855992edac46c70040f6d8256888d981',
          },
          xpub: 'xpub6CZgRvfmxxA9nXdBbWpyYyTHZQ5TjrQZVeou8iN6JCD7t1jsvzLMy8PvVXvYJRh4g7QoQjVbieCMCZA9JgisTouksye3psnznnvawC34VyJ',
        },
        '100': {
          node: {
            public_key: '02a670d4d07979a750673e906f7e1093c1fd1d0404c50329fa8f29283dcf6d60bb',
          },
          xpub: 'xpub6CZgRvfmxxAEBUbP5y6rSiV4MRfn9jiMCStDKKQj2dQK7btPjuMn4ks3hj3bXqfF2xfExdw6fXAGhVqiCJD6BaZGEmgtepoZiTB7fQVjZYU',
        },
        '2147483647': {
          node: {
            public_key: '02e9754b77e86486f66b461887ab66643700ebea15ab126cf8d373be327e803188',
          },
          xpub: 'xpub6CZgRvfvJch7vAm9bL4wNYA381SgVUNbno4osrS2Gw8mtibhJfzf8fLjMmCkzyfg385ofMEmGjgLJBLBFtsdhEggidcgxCw8sTGKoWEPsG3',
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
            public_key: '021c71b57e69d8e57829588560f4b78c5c63d41c9ede9ee2aa4cf7cc1324c73e3a',
          },
          xpub: 'ypub6WXTsntCWy1w9t3NGzmuLQSPnroHFHf3eHMEjfJQPzxYXT2n2CYhZQjuWJb7Ne3RKXhePgfd7WisRZngA3YVFcTH45HkrvazXvyzGKk2aX3',
        },
        '100': {
          node: {
            public_key: '038dab091be360a83f9175f4c9e8d4992a6c23fa635619dd5091f46eae8187f733',
          },
          xpub: 'ypub6WXTsntCWy21WYtT17UnXywZLp4mR9ai2ufn3mR98pa4Wc9VosGVTSxVfFxg4uYjQ8ahTukuBdp8cvWvc5zMq6mfARfftDGhwLGYJaUDVUa',
        },
        '2147483647': {
          node: {
            public_key: '038029d83a2a11e8238a945d80dc16db63407a8b8a9f7e82de053a3191a6955aa4',
          },
          xpub: 'ypub6WXTsntLrdYuH4CfeGRsYEU2CJBKjoJVD7uCgDV1AhFMnEVci3uKHepQrmEvebmtmA4PXm62YkM7XvpxfhaqVg9F8GiPki1qA2syAtZKpiW',
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
            public_key: '039dacb886fff257955f94e0f98015484ffe74ed5906b812b2e813e6ec38939ba0',
          },
          xpub: 'zpub6qP84D4JmEu4GtYST9gAmofZpg8UFaoe2zavgJ2onoV9v4BGQ5toWV6s7HcauXFKp9zt2xvoFq9bAnM5wCfB158p9dew7ZV2ewAY8J5Ww53',
        },
        '100': {
          node: {
            public_key: '029574229036e1b94c2c40f4ee03fe14e6285c322847385ec8e36745cb13c9cf20',
          },
          xpub: 'zpub6qP84D4JmEu8ejUQnjCJ5BZbapGzeneTBtmwajpsvXatTDUF2Tt5RV99jQobbNaDWH7BLXbERD6BtS8Az7F7MxvJq6ieyUuXwonQ8xyW7V1',
        },
        '2147483647': {
          node: {
            public_key: '039de3d99e28522f967927ec5b09073ef7e77f77de593e1e7f7f19e17cbce08f14',
          },
          xpub: 'zpub6qP84D4T6uS2QTVqyUBMm5MTPDFdXSHpghb4akxUvSgfH19QXP9McFTstDDTqrS3QZuy6Ed8EjRS3smnD89vX3TTamngXbTaUfdj4u7km2D',
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
            public_key: '02c4442d707fb0d86684c94a74f6b459f565bd8a7ff3d9c62dd403e6960d5a6c55',
          },
          xpub: 'xpub6BxUP1bVL7tNLPiwoW2bAbYUojpGT9jKNYiwTvoxgoQpxmyhmr7Lcq7qTcfiXuDN35Jwxzjjx4vA33jFkdZcgWvxvvXVmi6Jtr2vGRnreeS',
        },
        '100': {
          node: {
            public_key: '03757cffadec9f5f23aa3579ad36e561031c0bbe3a87b1fd190c0e63b0bb727312',
          },
          xpub: 'xpub6BxUP1bVL7tSiwhZsXuchY15ncxtZJTS3moLjmpbgShYXdXshpKZreJTE3uUKeBuuZRkACRmQ9REtmAQEgxnda4oJggDWaQpAhuoRazc6iS',
        },
        '2147483647': {
          node: {
            public_key: '0315c905f368ea3122f1f600818db0f069b08b3fc64eeda866a617638857032640',
          },
          xpub: 'xpub6BxUP1bdfnRLTLmrWZJGPF7A4myCWvKNr9vDMhRynH7Tp2dXjaB5p5sXZZuSBTBoPUXumwKnXkDDLHGNQ1KQgU7DadTzrhRfF4sxM5fDw9i',
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
            public_key: '024e1a4df47bd766919b4bb31142a4924eaf6182fcaab18d57d1b1e9eb556efda8',
          },
          xpub: 'Ltub2YfbG77S6a8SADz7wZ3hEsjdv6wJVNhXiVtedVHxXUgov9dp8BeMpcHrVLKfs9ZRWSK3gUULF579XPpuKftEZVysgH3SQvsaG622Wqyk1aY',
        },
        '100': {
          node: {
            public_key: '03e06ae8055eb09b8c0054e5364b2537011b8c74e8454cf4cbad8ab86639f235ff',
          },
          xpub: 'Ltub2YfbG77S6a8WY5Fj5GG7Q6WzG3Q9DyysKcWAdTozLcmhzxyKRrK8iAjUcF3XfaQMT15NC7TtPoEqTJoTBu8bZDDYJpMR33GgcEgpyzTyyz5',
        },
        '2147483647': {
          node: {
            public_key: '024587bf2cbcdce2f6dcb5782415d5de285b4dd98921de1bb94dc33378acba934d',
          },
          xpub: 'Ltub2YfbG77aSEfQHkBuWAVVSSEdxKNKeXKKXWNWdBdMqYLFJwVKCVfFpDNaZ7Ksrck9x2PeBPev6PiuNoQE81Agq8BncMiLbvGm1HTV6ty8iN6',
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
            public_key: '02de50cac4ee424a6802a1c7dcf297f353922645a3b9d228c2c71ae73f05dbe91e',
          },
          xpub: 'Mtub2s6xkr3m36sTfySYbf2YtQUou29uiK5EznrzyiakEyrWjqrtsQ41HAiqSHJCkTeD71e4RXdY85teTvA69BV39cM22gWD12qbSM8Vb522nfR',
        },
        '100': {
          node: {
            public_key: '02c800355cf02d1679259b20fa0778fc0406d012a711a1a9b6d9552076e0fecb3e',
          },
          xpub: 'Mtub2s6xkr3m36sY4nmPLy4AdwDiAEhF3eKd6cBXH55NzH4sgUWZXAQcoSTvWjobpM42wfghaQEajF7cVywW76N8hCY6cWGmLiAwgzjLhzuNgei',
        },
        '2147483647': {
          node: {
            public_key: '0333e4e5233d026fbdc9de7d5784afa6a4d4bb58d5ab46d2185c675bb514b18fb0',
          },
          xpub: 'Mtub2s6xkr3uNmQRnBWdSctcyzvHQ8jzMMkddkafMhQgnJ8Ku7XSq8Vm5CiyfmYoStknsnp4KoV28hmpJqKB4c2z53jrPRJP8K5f9B55tbSBEyM',
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
            public_key: '03c49811051c27b48a3a8a11a9c740ceb4b1b4d94e175aabe76eaecb17d64f9822',
          },
          xpub: 'zpub6qnBAktW3ZtHqvoaAG6h71HrwT4aBX9CUxqtB4KuM1B5mpvyJjuMFFnktJkTWHX8oe7PnSxs1dLdtocERh5vRE8cRuvnGs2SGG2TJqhbHjP',
        },
        '100': {
          node: {
            public_key: '02062f3cc09e689270aceea9c1dd7b32637938a2af5e214b54b71792cfd870f81a',
          },
          xpub: 'zpub6qnBAktW3ZtNEPhb3C3DVB9oZXfyhvyLQ8Nm3eebptY1fZWrKFiiMvhHXQbFoD8nYB18we32Yt4e2htBYX7HNt7x4RruFXt1k3J9diGRwwb',
        },
        '2147483647': {
          node: {
            public_key: '02b441af77fb7e64a0ed99b85274d447bd46b3959f5963e421a63eeb491b7d5da8',
          },
          xpub: 'zpub6qnBAktePERFyyzghsLLDLuyVi6G8tFhdaa8v9SqbEz22sDSR8LLFCFmBqTi6sTqA4d7sYuu8x29GjRLDMNTP8CPihSboRGBmZNpKy1PV3s',
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
            public_key: '03657977225b1b6fd9edb805a8d32ef729faf4b9e56d807d06c98cc0c8164242b2',
          },
          xpub: 'dgub8sCSZaLBZKP4PgEMDFAcSorYgBf8ednMZB2UXLLHUKqTaQkbLL4oascmvcpfeLUmma7SMdXdfqQkL5jqNi4Fm9osdx1zp2KuvmWXkwBeFmu',
        },
        '100': {
          node: {
            public_key: '03c4c5ce255cffa8c5475c78a138b8c1358ba3af1d2d77902497e2d29b753a1150',
          },
          xpub: 'dgub8sCSZaLBZKP8pD6k1mvx7rtbwBWJonWsBWk2nNwPrZZNxccFQNLaJ9ULt6XSD5WrQBqiNstdgkAYfxLpEh5xJfA5PWCgim5SGeeKfp4GJvj',
        },
        '2147483647': {
          node: {
            public_key: '03d97933ced1295f542cbabbf4feff312d5170605fcdc55fdee9f1d736dcfaaa28',
          },
          xpub: 'dgub8sCSZaLKtyv2Xn4o8kJbPzvuYeKJ5YQRi9bR3etoqHuetJuEnFANREeVtpTnCghJeZhoT9foGwAUP3DdEZzmJoenw9f1AuLbjD6WSUYgq42',
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
            public_key: '02e9870ae2caa404d73aff4756a1d65862d2b2343d6cd8bfa8af1855db15c55409',
          },
          xpub: 'dgub8sDmPutMNXSuSQJWmxfRFjnnxqA7G4jq1z3DNtMpDx6Z5iiTGAw4C4biJFHksjr8V3C6AWqUJoMYsLR9U3rsD1bYsyRSRyCVp71K1iU7pyH',
        },
        '100': {
          node: {
            public_key: '0396a106ce0da1b6ca2529f7d66c31212a3c1471d55fe4670afb6ad2e84277d5bb',
          },
          xpub: 'dgub8sDmPutMNXSyrx2jXiMSFtmNuy2mEsarRd1V2V19X5SwR92ydNGdBuTL9aRo2dLyf4PDhoebSZf4w7gB7yKxrLgXXU6mArhtWaQeSmwz41c',
        },
        '2147483647': {
          node: {
            public_key: '02dac76076a05db20ce71c3c8aef2c7c4d18460d141e8767917afa6c448275c79d',
          },
          xpub: 'dgub8sDmPutViBysaieLpBebGnepsKDBTuM9zSsUAxZPMVaRscSqTDXTG7xa7pGJupXRWdz2wyg3XaqeQZt9pKywz79UWFPxkaeN2F4AgD2iTWP',
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
