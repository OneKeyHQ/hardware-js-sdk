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
          xpub: '5ff338e2534ae6c7de2526a630344e0d1942597ef534fd75a7cb4e9732ade435e31fa85d96d8d60a5aa47bc5e73f5d117dc0d9510e4b547246b10d2b9d552a49',
        },
        '25': {
          xpub: 'f048d1e64aeab76fa52cf415a77e0c1ba423cdca78e27c367b016902d6937e63a5a6a7f8d195d55cde40d7fdf960fbf7aae72855e931592cd872854e54fb2904',
        },
        '2147483647': {
          xpub: 'd2ed83d0d315aa99dd40afe882ed024822127a881c1e6afd51f2db5734234f81acef1b94dab054c032e7e519ff10e8e7850d2036430ca17b4d8bbd8f7b8f0ec9',
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
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-test-xpub',
      params: {
        path: "m/44'/1'/$$INDEX$$'",
        coin: 'test',
      },
      result: {
        '0': {
          node: {
            public_key: '0375b66e5e9b095632d96fde5667645a8665be7e4a6cca8072f0b5236cda6b6ed3',
          },
          xpub: 'tpubDDACYSr4BXZnd5L5kPiex2NYbf8teirtpFmn9kjJky1ew1qo5H3n1MptNeTJrPZ34taYtetdKYRrdQPiUBqdPcnZ12nszT3hWeSsYtwZgVJ',
        },
        '25': {
          node: {
            public_key: '03a29f840fe2bb8da07b66f3a969e64ee6aaa33527948e5846e13c81dfa75c1b5a',
          },
          xpub: 'tpubDDACYSr4BXZohYUUpr9MCnt4qwHxHMpzUvNDK4YtiYj3nsZ9J4Nm2V1k8FfpeXqaJ6ikAERAqtgjXBtbTU2CuTfJkU1QfE2DT23Z9edVfZx',
        },
        '2147483647': {
          node: {
            public_key: '02441c8613d04ff73b3643b81cb2b494b84db543c9ae17ea448751191fbeecd170',
          },
          xpub: 'tpubDDACYSrCXC6kks2pwXjZ2T97k12BNPYCD1xbLyN5hdU4EP2tbbXoF9RqyenN3d9BwDDRW6aKQ5ELua9reFgJCQSMszGyduZVdJhmvrPT79a',
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
            public_key: '036d09661dd5e63868c657e0dd46fc48f42cc6b1c68d07bf7686764975a6427160',
          },
          xpub: 'xpub6BwNWt3E8shZ9Pw2qyjtgdyW7j7Y8gm9foDvKmnSar7inDXWPoZmJr9pUFTKxiwrpmexKXM2DEYaKo9HRLwkjciNdnvBtwcRCJK7FSoN2TD',
        },
        '25': {
          node: {
            public_key: '028c15cda552706caa0d9dfda1da91e1777d435dab677ad9a9035bc51810f00800',
          },
          xpub: 'xpub6BwNWt3E8shaCt1XDpPNZxTSW6FWFWzaTpvQSCceDcoxCDLApPP9NrqqyERMRRfVuL7UtYmTW6nSL5vW5AdjTt8H9pVTDQjas9NJcVpWkXz',
        },
        '2147483647': {
          node: {
            public_key: '02036524f34cd0063fb8404a2966064460ea70429e521d5ff33ecfe2d89d96e4c0',
          },
          xpub: 'xpub6BwNWt3NUYEXGW4yRfxrFzCj8PGdFbX4QNETens2AFVsGqA6iQhm5Ja8xCibzWKNnvJMGXm6dW3CSSr3wX9GjQAaXaLpjvyMudFtajTk8MY',
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
            public_key: '03dca52469cfdcbf48e8623183c15960f899265b5dbf20facb84356bb80297ed53',
          },
          xpub: 'ypub6X4Wf7iV8kN77sXzkyqAXwqa9t56cwDqtLfWKpqsP34a9H4TU29sxAJRHs8HC2S19RnFraE1jbEwhRWeGQE3SveTVtYiEK9MV5V9Ld7Qyo4',
        },
        '25': {
          node: {
            public_key: '02aa58af58d909b76255853ff6fa5612f98ade9d9dffd955ae8d01b14955b6ec38',
          },
          xpub: 'ypub6X4Wf7iV8kN8DNQ7XU4wETfFwqkMiDjfgFWZZL87FmBcAHyBEtJoTbNV4ocKyFcbD1h6xFP3yHV8uKkoN5YXpmrHbSvpbe6PntPi4Pt1YN7',
        },
        '2147483647': {
          node: {
            public_key: '02d86f21005e5b677a82e44e3fb636f8483f1c62a3e3d95f853e3aca33a752aee3',
          },
          xpub: 'ypub6X4Wf7idUQu5FhMuGjrRyzpir91Fh6meH63NHTLeBCAsi1u2PsWax9qdaCytEg5Ru2Lu9WG7uxgU4Z8sxXwYMND3bi8uUqBagFY686TDmAj',
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
            public_key: '0336215f49c4913cc4f953b496a6d8255b9ecc678df974716f49fa8599f60709a1',
          },
          xpub: 'zpub6qN3qrBhsar6ncQcHN2B7sCsCmKHkGWxBWr5gwXJXhM8ahmusQCKauVNH6eUZyTtBncqkU9dVhQSqNLfqtrcnZEdWqwoDPQ1PQuvJ5YXwGR',
        },
        '25': {
          node: {
            public_key: '02ef4d8c36bb2757494d3a5d2387bd3c798d3abfd654c6c12dbfbfa3e3b3e47b37',
          },
          xpub: 'zpub6qN3qrBhsar7t9o9tfqDGKG8LF5Tu232ReUDHXmqaF2VAwhDXt5rVqPEaYRbLsow6qGa3U8Kddn6hYkcX8U6gqY2hhJ9ZP4Wf3mbdTcN6yV',
        },
        '2147483647': {
          node: {
            public_key: '0342416d7cc6324ce4aeb446ad9e9a0951967b1a414a9b2940b901bd615c1b536b',
          },
          xpub: 'zpub6qN3qrBrDFP4vr87WvemvpodtbLGHQdTK6QNrtc7xDMs5cNri2pz2ukUYQZGTmFwpJJmHiTqoHawoYKgSLf3QSbTFZyDXvg3q2jCbPDdjef',
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
            public_key: '031eecf4e1b59743502cacad833893c337887743a205c2c983efa85771c5db1f13',
          },
          xpub: 'xpub6DTGiJ9WVLrB35GggG7sth2mQ1HSj8VS3LLM92TkeJMFs14exCG9EhsAGG5fspgxHau19Cmxrq4TLo7enSkZWxDtheLp53HMSAbaBCpFXVP',
        },
        '25': {
          node: {
            public_key: '035f459354471014c67eac84947ffddc7f52c619378ec08aa3bec90f425039410b',
          },
          xpub: 'xpub6DTGiJ9WVLrC9RLdJdko5CAste4CiJCgXuoaTdPLPz4j6gr5mhKDsMUpWE35DeiZTnCxAzBLB6dsb4QcazvwaKNtmFqgL5hyfWRpo5Sj6te',
        },
        '2147483647': {
          node: {
            public_key: '03e5411da98ddc968bde1b23ce41272391e4cd993297fc8e3395a0acda65ef5bd1',
          },
          xpub: 'xpub6DTGiJ9eq1P9AM9fojMcAXXsRtg9eHVynyaKiLs9Jg6Kwe36YYtJoiq6zWnw5DtzEpNQUSfNY82MWwfiitwJhxvnqKM5qP63HqUgAwpKCGj',
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
            public_key: '037f841b01b4083fbd81d8c58f95cc7e3b1932d3a3e1d5d7e0fd2e8d730ab2436c',
          },
          xpub: 'Ltub2ZcPBo7H3CnadKxutoeGZjBCFDiq4fFvmxpRDKnm95TuKo546WVaZMkCPJiVoNtwZh1es1jtXeKKxXW8MsezGFq8ioYghBpwRZvyne4QDs3',
        },
        '25': {
          node: {
            public_key: '03872531f75cdb6f6d9f5a45f19fea2d8fb0dc5b83c5a20477dc28c7e650b5093b',
          },
          xpub: 'Ltub2ZcPBo7H3CnbjQ89ciFXTf3ZtE3VSFkNWAZ3Dy67cs6vdkGrbzg2NNRHCTMPpjNYGzFcVQjCTgVofsxDT9Cm5mnvwp2CCLQYhjGGdJkdNNK',
        },
        '2147483647': {
          node: {
            public_key: '02963b602ef04ee3057e36c8ac550e4f9fd55d0281309579794843746ffe101e3a',
          },
          xpub: 'Ltub2ZcPBo7RNsKYmvb7AenYzCrR1pCgCfru1RSreo1ow4Xbnyiad4EmL5i6jiWEgXDSEWjvi9UncqurGw9Eb47rce7Xfjmit8kWYpUbdouj3CH',
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
            public_key: '035c5ba8ca3dcf76abd68ca895f08406004ab116bfc6aca57bf8a8d0415c6d2f8d',
          },
          xpub: 'Mtub2scSqzEohvqLidZw9CPbkuVjU2KsMssB4Ukfhmb1rV2etpMoZpvf3FhtpZJzZgakYY7TQt5syCxjr7NixAFwuHVDYFmRRdYoJaVN3moByZ9',
        },
        '25': {
          node: {
            public_key: '031943d394423af957b85dbfe75540921a0ed2b733b629dc580f4d73fbf425daf4',
          },
          xpub: 'Mtub2scSqzEohvqMpKf6JPAfp3bxS1oCMi2qETutX8BYbFMKTws49C3unVgiBrT5oQiGz4srP8ruPnY7WK6SmPhg1BnQCJUCjCR6cEYLb9qejPa',
        },
        '2147483647': {
          node: {
            public_key: '03cf28dc8b3db34ebb54cd5f5d354e0da8b8a10d312aac6c99173a9dcc47e3d437',
          },
          xpub: 'Mtub2scSqzEx3bNJr5vA6DBTWNmkN4uM6gkpe8T1SoZhsdQLhYk4aTYSaY1eMeZVvt83URH5ADGaXvbvqCKjYQV72CPhVwx6So3nLZM3U2MPJK9',
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
            public_key: '02e68c5da4a9a10c7e32a620e06428109d05a25685df7c3c1f6acab620a02d0956',
          },
          xpub: 'zpub6qqtTmiTP8qqWnLPREtjZTPLzJPmDF17crqREJycuooth6B3r9qG6FVWgnHUwDeWxAPYcA98NGbPXmk2dYZwjFSTfu5WvY2t2mKKFhB6Eaj',
        },
        '25': {
          node: {
            public_key: '02530e6241e8e78a63cc751eb2f440ac230a11f1d5cc6515d3674fd2579d4e0fa7',
          },
          xpub: 'zpub6qqtTmiTP8qrdBBfYuNmNedoMhrJtExKjtAYpb3VfTErak77krQaGrQ75TLLFxRECUyNF4Q53yymkpCLkss7AmVqHJFtL2EJpopntX6SJQw',
        },
        '2147483647': {
          node: {
            public_key: '036f6f1bf80ee27cf4f62fcb68c82307f38ad181c3a5a4216b190be63e217c3078',
          },
          xpub: 'zpub6qqtTmibioNoebRu9hNXcM2wM9U3MCsTecgRwX6Ysm23UV2xXabtv6gLrC1xkw5fLvT4WEEff1o4vTSpZpRE27mY5rn2Em6Gh6J65MTTrJF',
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
            public_key: '035605869cdf822f59ca6ac4aa5367a34170a765710ae20b661af988510bff90fb',
          },
          xpub: 'dgub8rXPBg8AxcrqUSzu8CD1MrUNWz5rMyzpAZyfnymi7LMpcEAHaf2eiFsx6zGJmnNoRDH26BAvagRRv3N2iFGY5M6k4eCoDfjQ92DvSU21w13',
        },
        '25': {
          node: {
            public_key: '021626de776351d3f9e11cf85129dac7a234a640d21cc1e3c57a1db3835c575d43',
          },
          xpub: 'dgub8rXPBg8AxcrrZdLyWCmBMStkj2khL8j4FM21EbFQLmM3YVrJUgV9yYQC1TBWkuzDLyC3N1vPnMms9wm8ukL1NjRxVxaUrUdQzpTYj3G9q6k',
        },
        '2147483647': {
          node: {
            public_key: '0248e13cb37d57a7388cad783012e5c1df3cd9fe7fe00a5a2ed6ed930d67d7d25e',
          },
          xpub: 'dgub8rXPBg8KJHPobbJERLLAZWR73Y94WL16szNeW2wbMrunwuRHZuDNRefTdZ4tXEwqJaPhedPTfRq1djsMv96obcc8wijUthZcYC6DcBYZTkw',
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
            public_key: '02016f4fb36a357d4f0f83b39cf81b32a7852de39fddaef067ca6052268d23dc7d',
          },
          xpub: 'dgub8svhM8fYm5X3zkqqiX1aeZvd2AMpGGYYijK9DBAGJKY485qXZDsW75rxJG88TUGdgmbFDK9TtMvMnzfuGgZsEPeiCx7Z6PHnK8P3EA1i6dH',
        },
        '25': {
          node: {
            public_key: '039c87007fc8cb988e6ecb2bc4a99d5b902035f67e3efd9bed4159c44483cfe872',
          },
          xpub: 'dgub8svhM8fYm5X54uEWs6r5Kfy7f1eTifUcG38E4XiSavzm9RHkeGyi1VsiC3TdaMsezFF3JGtbGjDnTJ2zXv3Bu9zRgHeNzdMLDoNLLE4g8h5',
        },
        '2147483647': {
          node: {
            public_key: '03641f2746c3474e20a61fb39e385cbfb67f94ff93358e9886cd5045375b4b3321',
          },
          xpub: 'dgub8svhM8fh6k426xmXFcC9e7X76v24wYUcxVh9KY1KZTNJm9uqafjje9Cwyox8bACiaPxkU6ii7RPwB9TkM4o8cWybmjvyU2hAa13x2E9yzFk',
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
