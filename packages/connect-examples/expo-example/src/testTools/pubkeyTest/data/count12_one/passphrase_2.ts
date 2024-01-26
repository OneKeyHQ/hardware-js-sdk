import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase12-密语2',
  passphrase: 'jFhC5z@Dk%ya2edpvkECr~qr',
  passphraseState: 'mwtNPp4ak7Cj3bEdDsFqQ3bHityz2mFAT5',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429195423',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            '5ff338e2534ae6c7de2526a630344e0d1942597ef534fd75a7cb4e9732ade435e31fa85d96d8d60a5aa47bc5e73f5d117dc0d9510e4b547246b10d2b9d552a49',
        },
        '25': {
          publicKey:
            'f048d1e64aeab76fa52cf415a77e0c1ba423cdca78e27c367b016902d6937e63a5a6a7f8d195d55cde40d7fdf960fbf7aae72855e931592cd872854e54fb2904',
        },
        '2147483647': {
          publicKey:
            'd2ed83d0d315aa99dd40afe882ed024822127a881c1e6afd51f2db5734234f81acef1b94dab054c032e7e519ff10e8e7850d2036430ca17b4d8bbd8f7b8f0ec9',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '5218f9681bccf03cef71ce03e518459b63cd18c8bc6891388e9ff59ee6bf9066',
        },
        '25': {
          publicKey: '3f5c9f18da6a9d8eb737115835b63319a6b90dbfa1632eca836bb7430e6dee9e',
        },
        '2147483647': {
          publicKey: '3eb0bdb23afb5f81121d3448dc0862432c91b46c5dead432fafabe0b1d09f4e3',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03e97b8fd72f61619ae8427cf11466944ffd47eed4f96ea00ecc4c56a7128e8f83',
          },
          xpub: 'xpub6FzucMBZjErAGwh5oWYajmed6Pkz3K7JJyL6FpLJUottuuMJRHPvQKpD832k7uXDFmNYQr73H9JByJV4YDAdtUfVHjMut1JUFD4jjqD9GHk',
        },
        '25': {
          node: {
            public_key: '03e5130c29d04c9952f6d0353bb8f3880247d10e1e90aa92efc776ddb87e28d6d4',
          },
          xpub: 'xpub6FzucMBZjErBLvZcFAtFgk5T4o8CRGj974YTKBXCARukKRJzj76VJHJZEJG5dh4oan28YFz5ohGeZiGVhpbhCAMLViVJGn2ahyigM1Hy5m1',
        },
        '2147483647': {
          node: {
            public_key: '03c5dc6ba83221fa346e44ef3247b3d1657a04d22ccfd769f2034a71fe852f2a03',
          },
          xpub: 'xpub6FzucMBi4uP8NPHM5K1B6b6saSHwNKKTapNCf1bWkaVUue4Jsg4j3dA8SYhexbQvrsfE3CYRPrDSWhVJvje4BNPCZicbfzzbPHVmuJEYPZ3',
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
            public_key: '0271e31c841687a6be3e99683a1f2323a30523a3cb9c5745061cd9b204e5fec787',
          },
          xpub: 'xpub6Ce5mYTjQvDwMKXcZq5wyo7Ld6usYb7Z7pQyZZiFoYavGr6ymjxqxELtti32MMfcemEg4gCErN4qjVNoFtmAviMZbrKnNjXm7SFgomdN7SA',
        },
        '25': {
          node: {
            public_key: '02d4b57739a103ac7939a41a9c291a5e0b103b03453a90c2c7092938b0a9df4fdd',
          },
          xpub: 'xpub6Ce5mYTjQvDxV5fveCu2ruQ9sdPC3rZPaUM53rzGQkaCVspXhYsWkiF6LhfFpms6ovS2szApUHRRGiEtGyAN5sxpdHSW3asL4PRZoqAce9E',
        },
        '2147483647': {
          node: {
            public_key: '0357b80ea4ca8664a2ce05b346c546c7458ffc109b37ac84e4de58eb3fbffc20d7',
          },
          xpub: 'xpub6Ce5mYTskakuVV4poMuLQSBDUqSE9kR2Wk4xLwYXEdVzovNx2DRbEbvmCxsboj52dSxDuf1iXumWWqVHrLKqnpXurwEi6KyD6adLG3Thi3P',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '029be31c06f3bc39da2f3356c79cfb2686dc421f1ffe101b2746d1cfbd07f43b35',
        },
        '25': {
          publicKey: '03b9198db1a2145120fc4a2d045afaff3366252bc314231d2c923e532cc662b5b9',
        },
        '2147483647': {
          publicKey: '029c7c8b4071d882d8bcfd4f0777d3935365b202c281bb4615cd0a35789e29984c',
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
          xpub: 'xpub6Cv6kXi5dMv7swDr36Ssbgnb6UUMxkFwRNiFN1hUajejEqZMs5gPjDUvpkQXoY8q2mvsuXVnZxLBW8sHNvL5QftxSW6bMNrYD8fPVHf9NcH',
          publicKey: '02d0413d800a2236896bf4028adf6baf1667a3e63b2016cdd8b97380e9341429ad',
        },
        '25': {
          xpub: 'xpub6Cv6kXi5dMv8xmjuf7ztXcgucXw2a98YAW7FYR12asZqGbEV1hLWujux2zqHxs8z3b94Ypm3EobRyqZW679k9ru8Pyq5o2eHv3qbHsMBqFD',
          publicKey: '0385220a869105345819195e18539d1f42d21750a8b8e875f3649ec208c4a02305',
        },
        '2147483647': {
          xpub: 'xpub6Cv6kXiDy2T5zL2TT6Uaruro8VatvuWf3hmitnfvKmwMd6ZcQV1eKZu9BdpJ7YqsWMjqWgPeVeyFRupMEBMZ5hu8Dme4NgC7WjiQAEFmGEp',
          publicKey: '02c0a188bf0e2c7547d99104a2abb1809cfc781886d77045efc6a9d34af7dd040e',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6G768qoMPHSQdVUiEWtiujvW34BazuWVUoW59df2VN6BBJJio82suvjdhZRujU6WgeFPdxrHjq1qcABLgy55hc2eK2U9GDv516jMjYGEeYH',
          publicKey: '03093365e43204429926a4fa78055b9893c84fcf7bb8dd15e6d5bb07c22140197c',
        },
        '25': {
          xpub: 'xpub6G768qoMPHSRincEyfDEwfjji6aZGFzS6aC5QUqjTmtCdsdz6TZMBbPXz6Scrd9uKsZZygSDqcgSH4qdfMNauZsFgzxCYAEetbMRZrrkVsf',
          publicKey: '0258a54a295473dc32e24a6e9c0f7fc77306792336156eb5463ccd55a132f7de9f',
        },
        '2147483647': {
          xpub: 'xpub6G768qoViwyNnk8ZCV8n2iKUHwfrDAzVjTqvyNTAJvzfr8HRkgLeoiGvY4D4MDXNqrggibeRfZR1zqnDF9F4xpqmw4qpcm6E4BCj9wRoWsr',
          publicKey: '025f73d694b780db3d64540fff52793e0213e34b3515e9c47ef45bb99f130c5881',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub12n34xcw2ytr9jle0hepqgml7njwnmml0rqu2q80wvv4gzpel46pssdlzh4',
          publickey: '54e35361ca22c6597f2fbe42046ffe9c9d3defef1838a01dee632a81073fae83',
        },
        '25': {
          npub: 'npub199m5rjqtxwhgk8gz2tw8lluqfts77hkpml748fj960cz052yz6ts66d0pn',
          publickey: '297741c80b33ae8b1d0252dc7fff804ae1ef5ec1dffd53a645d3f027d1441697',
        },
        '2147483647': {
          npub: 'npub15x2q73ynl5e8q9e5077u67j4z3z9qrtxm2kprajhcpelv3ph0qdqnzpj9s',
          publickey: 'a1940f4493fd327017347fbdcd7a551444500d66daac11f657c073f64437781a',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x7920611ec19e4798f3f1c3cda5214bfc50191f09ecf1d2ce9befae0d744080b1',
        },
        '25': {
          publicKey: '0xfd33c517c6ad34a6289ae80dccfded6316f62f5e6e7897baa74e6f890143b408',
        },
        '2147483647': {
          publicKey: '0x16dc5cbfd17cd8ed79c25085299218cf5d431389dd1b8ece9f2ba3cc86b23d40',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '02137f387c4f0318dc2f91b9841b38109c76ce4cc65fe47a842dc4871e382023b8',
        },
        '25': {
          publicKey: '02817ce95ef0ed317baa52136aa60e3e9f32ae11e017e03383285f494fe39960c3',
        },
        '2147483647': {
          publicKey: '03037c832c907e1942ba03d26489dc26b2e3bc84adcddf5b3696b442b0a3a15f54',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '8a2fc010b6ff4ab4b5d3c8e2a0af6ad0ea1049f8de8028b3b4b9d27afacedec5',
        },
        '25': {
          publicKey: '61ab84e79d7198c9b7f7e30e4903bf28fd46b9ba0e6af55ff6d4e643755f98ee',
        },
        '2147483647': {
          publicKey: '1ea1536815ba2f3112bed1689e1203b8c912ead83efdf27465db54b1dc29d227',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
