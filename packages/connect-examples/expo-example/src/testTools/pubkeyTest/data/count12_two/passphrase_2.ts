import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'two-passphrase12-密语2',
  passphrase: '~~##^$$~^`',
  passphraseState: 'mrMdgz2K5pePtQEJvu2VvMkfDh7vS9oAnP',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429457507',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: '5aa50ee23e0a111e24a4873dc269e1e876f2fa8ae42da9e6cf0daa10879ee6df335d65c52ad5cff6707efa5b06564fb2e763e1600aee0d9caa980ed5ad575f00',
        },
        '35': {
          xpub: '69e1cbaea7f2dbb3a4596aea050e351bccbce200650be2bcd7b82f20648a28d877f4061ca8069274a4012125fd0b54d5715019c32301f2e131d86c46d3d4f648',
        },
        '2147483647': {
          xpub: '13775a8a579d14c9e1c72ee04ba8a616b3b4aaf0df42f30c950a350ecc1bad9714257d8e7fa0e6c43e2cbecca12d4191da2cc785181197988b18d0c87a48b256',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'a273837c3f60a9028386b0869e1056920376e9bd3dd27333716b771b5a5b9fbf',
        },
        '35': {
          publicKey: '04a92e7a60180952d98409c3e6cd621505edea660da113567fbb17166e19e7a9',
        },
        '2147483647': {
          publicKey: 'cb3ba1ae128499c1e442d06530f6055ad93feb70a2fb222490128fcc701ccd21',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '027c59d9291dd8ff0fcffd5f4703bcb9af993cf31a37f31ddb92c9e8cfc61b68d7',
          },
          xpub: 'xpub6FcKvS56VoykjgXVpBw3Ho2X1tis1WUbaWhGsApy4nPVTsz6vtS8NDdM3APU9y9nmaSRhXNJnXVLuBkwHQcwahJCfMLdfmL6CFGiUVeSwCS',
        },
        '35': {
          node: {
            public_key: '02b9dcdac5610dcd07ad4d7e369125df7933039a706b49b0238c2b42554da63b61',
          },
          xpub: 'xpub6FcKvS56VoynFqgB8M5xbb59Fx8Koqrx3HAFTPLk3EEHw3zpzxdkNitTr415FJh1ir9cm7M3gUHg3TwVCPc5NFbERMKkzgfs3MbbtiSZXWV',
        },
        '2147483647': {
          node: {
            public_key: '02e323765c9c0da68c5fc848af5786ef98e4f86be3e82082462e319c05c0571c9a',
          },
          xpub: 'xpub6FcKvS5EqUWiqwwp49FEHTvpCSBLTywPSzLkB6sTUWmD8TG2vyEenxhxoc5yXD7RUp1ZV2G1vjH5Asf7CJz6obL9NfZWfhZnwRkzWHcHuvw',
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
            public_key: '03f013861a689248980a1136835b4385656b3a18d7644d3692c554c16c5e3b6396',
          },
          xpub: 'xpub6BqPYuhZBhdLR1rUZUKvWxmu3Utkmo3w9TGa2LsGnpD7gxySKRh7xse3qMULUMTiDG2Gg46hoqtYukcm5BqkUoeBBx7iyRhLLAwzuQ4vRe1',
        },
        '35': {
          node: {
            public_key: '038e0fd55d8a18feb3c0daa4674735ffed7fdf835c60fa38220133254810ead55b',
          },
          xpub: 'xpub6BqPYuhZBhdMxPrzbzAXpeyb9EXhUSAyVqwxjq4DMqhgoxkt7pcRRtiorDGwVQgkB4sJP5TZHcaCX7gB7bzoVhTqDa5HR1JyQgGbSNLCnmR',
        },
        '2147483647': {
          node: {
            public_key: '032363ac309deb018f413479347971947b892d07bdd6626c7808f0839aef06e233',
          },
          xpub: 'xpub6BqPYuhhXNAJaKEnh4d7VtFdrrkJG3c1ap9junN2dD3dNy7Q6WJZ17nymgEiLc679BNJKWCbM4snvpY1RDosWhr3SRCDyHcHZ81ZoCuDXjx',
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
            public_key: '036aa48de82453f561d32490c38d96b5da72222c29da397d9729d0fab707b03c9b',
          },
          xpub: 'xpub6BwctBbQ1UAiCcWiroaKnAghe9iwkyST5fqK536Bp7Y9gWr9TzCkZgrnKb6rtCjdEMBn6QCDJL9Xjv3yv8pqYLWFE8AxfzMEu15n8UznyPj',
        },
        '35': {
          node: {
            public_key: '022fd958c790ae9873b9be0b894bcadf408ed21c23ad72823f7adbc6131b77ef72',
          },
          xpub: 'xpub6BwctBbQ1UAjjsJQtMt9SFDJQdn3w9np9uK6mGmq7S7dzA2yWmhPDSL3nBCcuY3zzYpk5ACXwyRK7g62JvVMrGedXYxff3cKyVEkBF4YzCV',
        },
        '2147483647': {
          node: {
            public_key: '0287fb3dcbaeb4a0c97149647c0dabaea5f6b8904ed5bc09b7845e0a6b74fdd8f8',
          },
          xpub: 'xpub6BwctBbYM8hgKYv2ARDZCsjbK5PKUVdMyszGjb9RA3NiDy2sBhFzuT5PAWyeRsNujGx9Axod8AtMF9gXhiBxNfpcQRY8tznaHDucamhyDWA',
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
            public_key: '03ff8ee4ec67959b50f9a70159a7758b90e3725f7f20144687e831b2cc19bbcd22',
          },
          xpub: 'ypub6XPaCs24UXGejKcMz6CfkDbVAU5rSXQRMu28JfuhK4DqtgnKwAjkqeeF9s1QKoTTWCTE7uqcRvU71Deyv6KPVbZ7KJAfphz1NmZ4tui1UzJ',
        },
        '35': {
          node: {
            public_key: '03609e992561af6fc2c44b10e228026d1cbe1b2cfad0967ab59fe3a2ac120c6d0d',
          },
          xpub: 'ypub6XPaCs24UXGgF3Nw6RMerMrdnt8sgUUwNa9Dk831yfShcW6FqLtRR1Sd6h5HuX19X733V2evp1Cvh61XKCSz7uBGa9RkUWsZQVD4w9ceAbW',
        },
        '2147483647': {
          node: {
            public_key: '02c4bf54a7c4fb88e61d2499596f7dd72615531e074232936c5bfd6b5177da693c',
          },
          xpub: 'ypub6XPaCs2CpBocrK7RWjyqQuLRuaJtMFapX6rYWab61vVVBNwctffWAWsQLxmJJipVLwBoDxJ13QV956gpmRCzNm7Gn9gatLEJTiMnVs66f6g',
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
            public_key: '025382830ca32b87d5f3e2448b1935874141caacfa010d27ae55b1cbbc73d50f3b',
          },
          xpub: 'zpub6qZaHCeBpgcFwWyLJFCGyFJhVJjXT3atb5Lwgy2ezztCMefZ5vAGsFRFHQjb1jiEdp7eNuXHk9HL6NcnUAAyuBCwyf8CtVGKVRWL7ef32bi',
        },
        '35': {
          node: {
            public_key: '02080649e8c292577c90754a2c1fcc67a04223d6779fd0cd9010b3daef3cea7cdc',
          },
          xpub: 'zpub6qZaHCeBpgcHVQU7f65zocS8WsQccMA6Qz1nozB9vwkVfXC9EKaJ8iJVbNhnpPy5LV6uJ1T4ioFijNZyJGaSxhD1m1irK9VvfFUz8NhdHcz',
        },
        '2147483647': {
          node: {
            public_key: '02e53859bd1ed3584ddf41266f2658cbacda2f913e9a248309835bbaf954e9a079',
          },
          xpub: 'zpub6qZaHCeLAM9E5niMS5P9oz5HGZ6UUaR2Ajx6fvEuXTqgVAKHebJ5yz6aw54uPUrrZ1K5ytLZ9d5FrqeYqz2hoXRy9zTvwfDT6uk1e3FVH4a',
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
            public_key: '038b323f734791e70d284a9cc85b6b5aee07ff71dbdef77707a27a64931192132c',
          },
          xpub: 'xpub6CzZ8Vtbu6zKsPZNmMHLoMxkBD6rVL2z742RK4nKkEzZRwVPwZELMbnLE48nqGJP7pXmq6JfGHUaJQd7UUcx5cHALYevp1b9a4E8E2TRLfs',
        },
        '35': {
          node: {
            public_key: '0346c0abf156cc7378c2bad8b79eb46c1a42c61520483ba4764e4da8538e6bba5d',
          },
          xpub: 'xpub6CzZ8Vtbu6zMP1kJtZpEH2mvnGf9GK2fs1FrtDhxJYEVUW1K5sr3tq5hhsw4sSiNkdUrnEpnzJpEGw86HDYsuMy4dbL1yGDM16D1zyU8nz7',
        },
        '2147483647': {
          node: {
            public_key: '03132d0f6e4696baaae8dca68701ffbef41533d7920a5a7427749a6bf5744b6518',
          },
          xpub: 'xpub6CzZ8VtkEmXHzFCZWGVzwei6J8eCBZZgFRRPiL1LHJGjQS4jXvkpYJKerm2cc231uTQCBfrv6byqfpnKku31QiYgRGyf8RDbTb5W5DPazXx',
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
            public_key: '0328d9fc2ee6fe0f6bb5483fb93f47a5eb4e22dbe0dd5dcd04d53880837eaf114f',
          },
          xpub: 'Ltub2YTnW76CJwFtXebnha7EN41mxXrmyD1eqJ1ceJwLFa2LmHRKbqGyGso1JQkKpLVSMsj4oiRnVNtjQxH7KVAiyE73S96c1DAer2pHerEaVuP',
        },
        '35': {
          node: {
            public_key: '032c62c0adbfd7683a68d80ad68f382db590ec959c28b5994f7821bce0ffd6a021',
          },
          xpub: 'Ltub2YTnW76CJwFv4nWvmAdhp6ZH1wQWnG2P2nG8vWG8iRUvnS4j3xbnygncJccF8NS9dC32F4vLvQBv9W72B68tk4FfUitJayYs7wtgpRtgQie',
        },
        '2147483647': {
          node: {
            public_key: '02cb5c9abe6c84fd2e416cf7dcb2e30b4305fe127a2718873b8e05dc2bd925c528',
          },
          xpub: 'Ltub2YTnW76Lebnrekw8zoYEjYPWf1jbUsUUntLGeamiaGNPMnpDZiBqsb4XJP1FxCMqzBU8xeWi7E7U6ryNhsfzGz7cEAqcbjBbp6NDvrWFDoh',
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
            public_key: '03cd42210e8b9d257ef5096308202fb122da2000873548d3a7126dde4587dade3c',
          },
          xpub: 'Mtub2tRC598znLfNX444Woz1y8nnnoK1cpH1oKKJA7S47NADCKF4EAa448Mnr1gHadudtnGxsgqKeUaXoztKe8Y2Y93AT1fuvmZdUE85zbCYBqE',
        },
        '35': {
          node: {
            public_key: '02ad88b920413b09ba33bd453d121679fd7e1d4b562bd19ed4b33689b60cc43bb6',
          },
          xpub: 'Mtub2tRC598znLfQ4B49MShhr9nZyFYnrhiydMpHFgpbuxZbRyJAEofRidhwC5bZ5MEggk86gkkaMCFhjymn1StCAHx9visFxnit9XquhmWKn8k',
        },
        '2147483647': {
          node: {
            public_key: '02775e503176f7f9108b736c927a08e9f7cf38c3ac4a5a237f467aa0e0af93f26f',
          },
          xpub: 'Mtub2tRC599981CLdgNmeUfnFJYeAk4dEDCD2LVh5PsimJ3MbEiaatNUZa6hvyyPHWb2D7ucTuGvkSptPN3KZbKyK1c66ZxtwCW5zsS2WUjUVZC',
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
            public_key: '03be5981f1e8f0a33ecde09cb79ae3c39af53b9cc37b5e2a3a2aefc2be065464e6',
          },
          xpub: 'zpub6s6j73fN51WQvFcBxoqzzJ1G5QUnLQEjXQiUeYXZEubURuMbCiWHLFSttHZpnpfPpLhDF5pjb5A8BK3uKSEn41DKwfi2gNqovWsLDkjBc8J',
        },
        '35': {
          node: {
            public_key: '0261ef41b96d12913896044eaae53258084dddd79ae8029b267dd381aa5986af70',
          },
          xpub: 'zpub6s6j73fN51WSUjaWNi1qTc7RHiQcMMbkyWVWzGHXqNAUNUgShBEMsSCyHR9M5RDqfpWBKH8865EzGJQdEt3Vk4NiERzhYTRZrb4ZZU46Pts',
        },
        '2147483647': {
          node: {
            public_key: '0274a20b5216bf7676d5f44fcd016a85632f2b8a3748212ee0188654622198bbda',
          },
          xpub: 'zpub6s6j73fWQg3P31cyyeFrSLGxuyAxvKNnfg4dvJCRJqNUTK7YKShViAivQZUK4hf2A6p5VEyUbXAESgLB2VpERh21ZL6ThXduwk6wf5mHy5h',
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
            public_key: '02ab46e3ca60a28ad4f79d08c876f10caa9e886709a270fd77a02a6c1ca5a8bf96',
          },
          xpub: 'dgub8sXrZny5FeTJcyJWATkiyvap1XPUJDa25VEAxZEn4u4MpGbp4pgphKfvwpUbuHMd7k19Yrem3sAtz7ss442iArwWfL38mw893GD1Fcu7jyi',
        },
        '35': {
          node: {
            public_key: '020a5544f24b3ee9601ae8644885b22964b1982a5660e89f06b0e792ca07bba6a7',
          },
          xpub: 'dgub8sXrZny5FeTL8nFG4P1eq2p9DVko9X4oFaN8Y7fXJMhLdBDw3pUV5LwDqjs4ip9ekpjhe6gRQDeiSRFGJjr5KYgwL1wnc294TTEnTJbdvHG',
        },
        '2147483647': {
          node: {
            public_key: '02a84f688ba52552f71b55f37b717955fa368604bac17392f78773c86ba03b34a1',
          },
          xpub: 'dgub8sXrZnyDbJzGjKja8dZiUZL17q9tMAfpF2cGUrqJQ191mgCyZpSneCPY7fY2Nzh4JSz52dB8dvZpdWWqfUSXqimffDWCopBAdvD6nvoWKEW',
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
            public_key: '02909d7fde46f3124f6fc03a51230683074596f09f6f9b603419fb59aeb9bbf8b7',
          },
          xpub: 'dgub8sxvVWYJ4D8DCMuH8eC3NeQKFLNHjCF6ru2rfmNEaBkuZkQfoTfBRzeYwBebvjvuGHzcoiDejxYD8xJrJhbwH4xFc77S4gvwSL7K8ciJ7SC',
        },
        '35': {
          node: {
            public_key: '023a203a12facbf2feb810f65a589c5048263f7a7c38bc2398aff9c6e075b9d47a',
          },
          xpub: 'dgub8sxvVWYJ4D8EjaWEhs1YzDj7M4Nuds7gQYUFPa6etmdys7uStAFgF2NNbFdiartnpcyCrmvbrWm3wfXvhQw2utws3We6VQ6Sw5uc5fDiKUU',
        },
        '2147483647': {
          node: {
            public_key: '03a886ad2c80ac9562ef5e10bbe94cc01b198c8eb31e1845927e6be59beb8025a2',
          },
          xpub: 'dgub8sxvVWYSPsfBKihfyC8sVYae921tYBb2VKV6BVV3EcRa4h8VZTby8PMpXFY2RvdPFv93FVgqNDR2Hv3SCmwU994nUkVoLpTTEgusLcmmS7h',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '03d632729d95dba64d1c046aacc629f76e43a053eb610d5d96dcd585f2b8a6bf3f',
        },
        '35': {
          publicKey: '020b225b1bc16892fc955ad1d9c23011d2f02465df06fde98293a1799aa3b0d406',
        },
        '2147483647': {
          publicKey: '03836a9429813e60866319820f4b7dea209baa0dc37c1268fce18bfc30094450bb',
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
          xpub: 'xpub6CMfu5fLXZ4Ni2nSLWgFW6Ltq1XbNRTyBfbb6Vhxxk99VzvYfDnqyLYTaFCvwnwTbwPfND8WkoAjfVB8aSjSawAEjJbgMW3BQnE7PjMpi3h',
          publicKey: '02279e80cdcb05e8aecb5c60d7353cb4b298061e64277089bc12f2f44c60ef46ec',
        },
        '35': {
          xpub: 'xpub6CMfu5fLXZ4QFYQG3eTeDEEmb9UVQErMMC9wypN8Wd8Hfn9y9nTfEKWzYU9bfqT2Zwc6Z5rpyLUXegoseQQJrhn3vECQ25aj9xLUtDvYPue',
          publicKey: '02bedb03a13b3b833f6ae83683ded76296752015451e1db236479aab445407dd06',
        },
        '2147483647': {
          xpub: 'xpub6CMfu5fUsDbLr7vFFMydFwfkPdopVpcpvRFKDrDa8k7d8qa1Lxjc3LgC1e7AusjCyEDLLKZAuHGhQzgTH4EkFLcrfosqN2byboM4h5pMFwf',
          publicKey: '03b7dd8d7c4601c16eadd49bf50f86f1f03f59f621745724a8fb076949735b985c',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6H4UJWd8BonKBHALgnQkHPB89Fa2ZJDWJ1aWXYAM6tZBnTB3JmG73D6VnveSFTPwNkX5oQLZRT8NNk2Btu2nDJytNsfFANnUoDJfhRLyscB',
          publicKey: '034c37c62fb8c8123ce1535b76437d9895fea24674c378b5b385a116d1edf22b0c',
        },
        '35': {
          xpub: 'xpub6H4UJWd8BonLgfULXpJa4jEXF3XvThMp4ET6qgUN7oQZosn6QrXGEJTPbQNk4KpT1AP8WGpHUyKoSLCEHF2txk6pY8YVsCe6x4yucyT9rLx',
          publicKey: '03d95b88133fa370a218c77f0635db199c88f1d0aa62c2512ba3b777596361448e',
        },
        '2147483647': {
          xpub: 'xpub6H4UJWdGXUKHJhecVQpFxB74wZ5FAQwgQc3vQQXPEkgcqsRwUZev8iUU1UxnQPpzHz7dvgH1w8o38Py2mdcBoyzEUZRdQxhVwr1Yf8QDTfx',
          publicKey: '0200ab3f32874fc98cd1b108c5bbce5198bf8d4ac413de9dc5005607fc99530c0d',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1jayl84gtc54lfkrp699lahzdlj349vfvkgx85dkc4s67dqvyhlxsedav2f',
          publickey: '9749f3d50bc52bf4d861d14bfedc4dfca352b12cb20c7a36d8ac35e68184bfcd',
        },
        '35': {
          npub: 'npub1tpxdfnu2v80zrua2r0sd7jy5sueaacafk02cnlchws62g8mrgpnshpz252',
          publickey: '584cd4cf8a61de21f3aa1be0df48948733dee3a9b3d589ff177434a41f634067',
        },
        '2147483647': {
          npub: 'npub1e3d7u68uwr3xvpmza9upykap7uutyyh0umjkf2kph0k7pkgfl8qqvpa3mt',
          publickey: 'cc5bee68fc70e2660762e978125ba1f738b212efe6e564aac1bbede0d909f9c0',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xf1161094ae2ef90d73b24b8612a248b357424e64ab3806d3ecd91f72efa50d3b',
        },
        '35': {
          publicKey: '0xa04e2e8cbeca48884751fac4e6200adc5e60512566645a246a578441a1f4a155',
        },
        '2147483647': {
          publicKey: '0xe9db73a5d5c81a638494024e4fece21f13becf5e99bb56869aca39be1969f83a',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '0285794017387aff8ea09084b19c0e63796e241dcbf43ae047bb8dc56db85bddc8',
        },
        '35': {
          publicKey: '02283c0e7798b3c69aca1f9233a5ada7fc2a97cfb123e4886fd1aaba8083c9a098',
        },
        '2147483647': {
          publicKey: '03e5df4172c341de5ba160f36649c29ba1554ba7800f819f6c3377cd3bc48f5b7a',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '29e31749f3316914cea1bfd907999fb26da7075e6684aa059d0c2d9362619c92',
        },
        '35': {
          publicKey: '3cf7afb8c0fc27304f6199b9e3dadabc9d6a0f6cdcb0d3f17b310477922ba5ef',
        },
        '2147483647': {
          publicKey: '5b41dd2a5ac3f118d608bce22f3e217495851e9a0ed2c701fddad3372b42cee3',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
