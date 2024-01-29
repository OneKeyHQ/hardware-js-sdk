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
          publicKey:
            '5aa50ee23e0a111e24a4873dc269e1e876f2fa8ae42da9e6cf0daa10879ee6df335d65c52ad5cff6707efa5b06564fb2e763e1600aee0d9caa980ed5ad575f00',
        },
        '35': {
          publicKey:
            '69e1cbaea7f2dbb3a4596aea050e351bccbce200650be2bcd7b82f20648a28d877f4061ca8069274a4012125fd0b54d5715019c32301f2e131d86c46d3d4f648',
        },
        '2147483647': {
          publicKey:
            '13775a8a579d14c9e1c72ee04ba8a616b3b4aaf0df42f30c950a350ecc1bad9714257d8e7fa0e6c43e2cbecca12d4191da2cc785181197988b18d0c87a48b256',
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
