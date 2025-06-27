import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase18-密语1',
  passphrase: 'abcdf12345',
  passphraseState: 'mw4kcXbdNjkf6Zu7nU3oHpajXXCc9wkZNR',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162750',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: 'c753af8b0ce758d40fc2f715f60fad450ba79fb102693a37682ac8a068ec214ec0f01035ee183826872dc96f83f99371ff23d54f971fff93d327c4d98899fba6',
        },
        '100': {
          xpub: '434caca3193510365050b4c7797d2c5e4525cc5fed9ebfceae53fc55ce76cb2734651d1feeb7782865554a4b6dc600518156580ce6d05c38104624a8924c0a73',
        },
        '2147483647': {
          xpub: '9774bf83af1cb74724501be3700b388d0dcc3bdc374b406b942f3c093ce933553dda05edb8869f5a283adad6504924fda1f04d8f6fb1fc6c7e66e8d9e1dabfd0',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'e2641b19aab78464ea5506a1c58ac48f4966d1d6e8be2b25044af969208e0e49',
        },
        '100': {
          publicKey: 'fa6dd807ba5305fc88b82029f7a8d59f5ae57742a3a94d70c9ef03254256fbca',
        },
        '2147483647': {
          publicKey: 'caf87ea846780b03beb3a3c207982a102d3bfc1722b02ac3deb9b30cc2e73abb',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '02041e65bc963d4d85e0b38d9331fdb35bb931ba88edc4df0090fb0154743f2bb0',
          },
          xpub: 'xpub6HGvcbATY1CXic7z8YCAmeZEeHTAmFJFPriWBxd1r34RzXiRDnBqWyfFCMTLi5QcdPn2jqcm95bVjMu3SMbF32CoZuTybgTVyMhaUo2D3FV',
        },
        '100': {
          node: {
            public_key: '035858ea9287886ef8359abd2ac45b7d15987d11a9482b66730f5b166d74c4bfcc',
          },
          xpub: 'xpub6HGvcbATY1Cc769WJvxr7BQdpXfLSSxM6NE1rhqy5xRby2WC2GsZMQBpKvEuMGEvZLVBeJcNq6jQxY828NGJxMwtCmRrNmJK4EyAKgnrSi5',
        },
        '2147483647': {
          node: {
            public_key: '0397c9368f33ab53827832b5d26dad3094b0bbcd5fa0aa7c904338e10c932bbbe4',
          },
          xpub: 'xpub6HGvcbAbsfjVqTBMj4BEsZiXf1YQnvqKtWibdEyM5wK4beMRGRsbCyMSTForoTm535v341R6DwNUR3dLEKmDuboHnriSbJpPsUZQt9vufeV',
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
            public_key: '0379b90c3d6aef2c08b32395d4c71c72fcd06474ca6b26a9c109dee6b5c0ddd6bb',
          },
          xpub: 'xpub6CwYJknAy9pWtGu4mfcLtfqbH2czEuqnTcPBBidvzgjx1xmTnsW5d1cx9VSCo4kL6rS8ZFFKvcHCdu4URuCrhZJE6u2yYQYfCJhWFee2eB8',
        },
        '100': {
          node: {
            public_key: '0211fd405b53a3d63c3fc3e529159ef86a55064df0ca993fdaeeae107619888285',
          },
          xpub: 'xpub6CwYJknAy9pbGeD3xi3VxbYLAtmBqqU1MpP2xqZa9XYYFxUFztvp9MwPQn26aNNSQaJtr4XwLC6ozSNks5nTKJMxpnifwnD1X3rfHs46rER',
        },
        '2147483647': {
          node: {
            public_key: '03caac673270d9bb0eedf4e077be9a31d8b6bcda1a7695a0ae075ffb5c7fd3aaa1',
          },
          xpub: 'xpub6CwYJknKJpMV1fWhF8qatARfoXRN52Reo98oJRktpkEn5AaGCJVgqgXu6Rf3mt6jH6BKv9GKG2Hexn2VqBC6jbN7adC87APYMybqSbraene',
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
            public_key: '02cc5a491aa485ca61a5790b156e93613c5597cc768eaac3f66e93de8b683621fc',
          },
          xpub: 'tpubDDBEv7BKz4nfzMVf5NvRoEQW2Gg4mRM8CzGZJFNAknZPBjhRFbEou45rkpi7LABCcrNScHBGwwN2q2ocQjugGRepp7vKiSuxJzLDMd92mn5',
        },
        '100': {
          node: {
            public_key: '03815316f951e38f5b5d0f522c71f5c1b36acc3b7b8c0fece91a08746545c7b7f7',
          },
          xpub: 'tpubDDBEv7BKz4nkR8KRoZRBYELerHwWzHgTFJg35zF8cSNrNWevFt7pYijbp1w3beaNvJn9BNqDojk1RUS2ZVX1bxbRpbihJz6ZXtPgJQdWdur',
        },
        '2147483647': {
          node: {
            public_key: '0352d6188972304b6764d90be07838817122b2da750028b05a4275b681a43f0af2',
          },
          xpub: 'tpubDDBEv7BUKjKe7ykKZq5sD2cE7BmuttNKZhNd3tKptMgb2Mun56GR7SpXrr4uzDvjeFvjJ1A9zhktAFXu2ESuaLtKLQ4eR6t92FKhQNCAnSq',
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
            public_key: '0272df0928680402c5911677beed8ae7442d09f6cf02d9d19377e79a6cbf38e2ce',
          },
          xpub: 'xpub6DLeeA78sde9VQDxW25j3brL4mkoUi9ygjuHiXdgfZDp4MSbMTT9UzrJLSJyzPgQ4db1CTifgbdLYXX31oQtP8JisPvhUiKXAzYF2Ki1Udy',
        },
        '100': {
          node: {
            public_key: '0231d06fda1e0c3ce5d3b2d11491fbc133716007aaf15042196210f7421547908b',
          },
          xpub: 'xpub6DLeeA78sdeDtpJrdh4D11DwvckbwoaP3KkNtQeCRap1EzK6HY5H9e5EJKxXACigG2ykdA1NLfcFkD3Vo9SWHva9Dt2AWajEWEQX1fNHAhm',
        },
        '2147483647': {
          node: {
            public_key: '03809a4b19fa93cfbdf150f053b4a54a443e2ec9f494c1cd17dca34e6dcb7938bb',
          },
          xpub: 'xpub6DLeeA7HDJB7cXDzUADDGX4hLYvh8NVjnk6mzQF1hwaMfoz5VWT9ZaV8rEUExt9yynJjhohMxofP5LpgDU6eAipXguo3cYu2d66qkmBmcDo',
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
            public_key: '02ace7368f2905365285ffadd618bdb825068d3099c02e3df4606029f130a8b6fa',
          },
          xpub: 'ypub6Xhpxb1cyyzYhUHfDdi3f5AKDt79bp2qdVwy8SyaGvhgqJwMB45FfsAHXJeEUivvKdAbCUCy16YpPBPXYX2k2ZTJ4qpqseYV64BwQqQ3owp',
        },
        '100': {
          node: {
            public_key: '03af1eedbbd1818f870eb88beb04094f4f888f3fdb79571d9b52b49b5325ff4323',
          },
          xpub: 'ypub6Xhpxb1cyyzd6oNWuXqVdgqy4QCj6DXx5pitbALKaKw2NNc1P2Er469QP14XHn65vHMdX4kZFnmigo5VUdTUiqNmiKwtHby6aitYbB4uS1g',
        },
        '2147483647': {
          node: {
            public_key: '027f5858d63ac59e0b706db93656c5cfaff87aba6ff368ae34754a8b3c8349e6cc',
          },
          xpub: 'ypub6Xhpxb1mKeXWp98J7UX3HbVCQy91zAD1ScY5T6uW5rtWqFpc1dfoxZZTfKMtqLrnktRjsnB8WMgeCdFr58kwfe7gKBGDMASYVjtNzAsvcBg',
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
            public_key: '02344230881f8a0dad42a64efbb927c2771c4429590fbe70d35366192fca66827a',
          },
          xpub: 'zpub6r3oaubBGW8WKR1UvfZwxcFuG8D2ij4Sr8M3asQj2h1uT8g1LmKHLqHnxVptKQGfHTgwEy2bEvNyy91JSsiXdj22naE5fh5egi8DxXCJbX8',
        },
        '100': {
          node: {
            public_key: '02763b39a09ee3439ccffdce451710135c04fe2a5fe709e4939ab98fd59d5cc6cc',
          },
          xpub: 'zpub6r3oaubBGW8ajXfZVgJMwoVsLBhDZCEgfqUbpvXVDWTtoLquic6ftz5YXbZXVm3U8voqgCJd36SnA6PVFXUS1k47EkKwhg1Ke66YEivXqbm',
        },
        '2147483647': {
          node: {
            public_key: '0258eb0d7b6bcf1f627138e91bd9767037028271dcbeb4aa58ae3bf556b254e030',
          },
          xpub: 'zpub6r3oaubKcAfUUoKFnNMaesgak8x3vKaf1fWDVtRgGo4ZFssNJyQdAZ7fct8pdV6WiNWvv9NgGp1WqQ2fCpNnwPzhrHBiLrMDR3sqKQyDw17',
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
            public_key: '031297aeaee80b53da4dad940acd9e83c1bf2c543a51e1537463fa844fd4c381c8',
          },
          xpub: 'xpub6C7E2qEAk2MPaaW7qyrLZLPiz2kzVaHU4x1CCXzTuoq6EkwJTebxZM3kU1JZNZsw4yynrDmLEbQw2s7jcbaaJKNwqEcTbWo6bWzZ9ZYtncm',
        },
        '100': {
          node: {
            public_key: '02f047400c2388d55de9999edc1aad2577bbfbe59341d938e535f63cf4abb58116',
          },
          xpub: 'xpub6C7E2qEAk2MTyv65cvmCQHrwBpzrdvyJrjK4bciM7SYAomctH8gPX67ESXjhUacVwNY32pe2f28pq5teP3hAj8ZFvo2YgCZw3HZQASonSxU',
        },
        '2147483647': {
          node: {
            public_key: '03074dbbc780df0a06dd819d034d6fc1549ce2d5f312893f8487a21661ae811da5',
          },
          xpub: 'xpub6C7E2qEK5gtMiEChsCMpqAb9uBXYCmpjg1mRBpx7dRBm1nQfXGsrHfQg7shT4nspviaqHMr6QvAnDqwT9A7VWKM2X2Y19dCZJYYk3MBkHos',
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
            public_key: '033d649ba64881b68983311a53beb91172d4767d7d6ec4578f3a629108ba00477e',
          },
          xpub: 'Ltub2YQSnt9soDzAxZNQTg9xrMZEeapvFV6UtMy7CUa3YA8bmbzs4RMR79MMvtNH83FnANkVpZU1tN4j2b8avhtPNLXk3v2uuefCedPuss3YNzs',
        },
        '100': {
          node: {
            public_key: '03104ee7dd2224bc22ed1fed1acec74d638c97922791500a3b3a3ed502a0203773',
          },
          xpub: 'Ltub2YQSnt9soDzFMic2BENig7JFjBc2ZV2EdRS8YQCrKJXfcs78C3Ex48oq5g4XSq7A2UtTqvNZm3dXKAAgbe8HttCmdVx5eRUVxBbWWVTT34z',
        },
        '2147483647': {
          node: {
            public_key: '039aca01978a8dae3643c805e3fd00a42257bb36dace45d766a3d5a9b26b665a1a',
          },
          xpub: 'Ltub2YQSntA28tX95Q9CwLNFFCrfD3suYiosMWv6j9sgp3DVL9L2XexFunHeRz3Ci1haEdr7J43Ney139RKwX54ekqkZ1fMnL7z6N6rXZ87qHe9',
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
            public_key: '021f69c52cb187719ba1b849f5b8c8946061036183e98c3ec90fe7facc7dc908e2',
          },
          xpub: 'Mtub2thYRJ5RQmnv9ofV4iuFwSqFFWkGVqbyv5ec6u2x93akSJYA5NwHuRJmGhZtVqRwyn5eYfXbAiNCWPcxVvDnEARoyG6sXdo45g2rTnKVYQ4',
        },
        '100': {
          node: {
            public_key: '026318ce0cb736ee315871c72cacd4ab74c21ccef2d466af505bd10f2f6ac768b8',
          },
          xpub: 'Mtub2thYRJ5RQmnzYXGRy6QKFFDafLQFdGVUTVJEWpRWNFXA6u8PpxVtYBTnFDX3MNxKMyLd3z7Zvecy6NDponShwiyDUKyqHDcW3aSq4fheGHf',
        },
        '2147483647': {
          node: {
            public_key: '028a0769881af67546bd22f1d3027e0e312dc0820314cefb41ab9e43fc2dcd33fe',
          },
          xpub: 'Mtub2thYRJ5ZkSKtGeSz4oUKRRmCSxQ4Axy6Uj6zox1zVmsP2XGXwxejiq4YFAUUMzywLZFg6vBKPzCcvCCndBVtwovHBKqQbQdwr532W49VaTr',
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
            public_key: '0338e566d378cfa1702398376d4acd7dbf9bb0201d097d4ad3330b03bd226eeae0',
          },
          xpub: 'zpub6r1DuDL1pwCjdAN4p1qftCtnX5yqUDWEF56q9okoLdyCjSqyaUuzmnKU9uvebHdfu98iHRThNsAAVhYZ3LVgtFqHyhT1iedCqNRnZR5wk8X',
        },
        '100': {
          node: {
            public_key: '029a30a09a1d615b76da1d693bdc71945a09e14ad231a742173dc7fc77ba60916b',
          },
          xpub: 'zpub6r1DuDL1pwCozd6M6sufzGwXR4iJwVvdfCUN3RjC9PLhm2jn7wfYLBDhdtXCPAKL2tVviV86wkaa3hGG6xozfyt9aFxoLi3LjVGnjhncL8o',
        },
        '2147483647': {
          node: {
            public_key: '039e06459f2a5337f50dad107b45fff9d36eacdb3ca4cfac21f56d009a67a6c8ba',
          },
          xpub: 'zpub6r1DuDLAAbjhkbL9W7K9ZP38DjdxS3GUVJdeXENqBf7Vjs2gb2NZahHTp1Qj5RXV9nqqycMvXMvrgML4T5Czt8sKsRSpZkn5uq6ZQrgntkS',
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
            public_key: '0349d7920d458fb4042e4d93aeb6569021385a338c2d9ff299ef3149c7ce3d4f85',
          },
          xpub: 'dgub8skomHT5Co5gnETH8SZBnSvn7HPLAbBcTAXeyoWSUcahQxNxZmjeqtLMqNzYxSPGcww2nwmy4mZy9H1Kf83fkX6br1JJdyLcCmudWXfZY6g',
        },
        '100': {
          node: {
            public_key: '026bcfdbffbd286ef3e5157b859a2c4efb5face0caf58c17197d947738f05a5761',
          },
          xpub: 'dgub8skomHT5Co5mBeP8DVmTmqvj6Eyy4Rycuf97bd7NFvidzCsjHL6ACLVvX25BV6cvMtBR8HzwMGX2dTddT1n3Fg1Psc4mK34zD5pVGtVtFJR',
        },
        '2147483647': {
          node: {
            public_key: '02837f6f3719d897248830faffb028cd6af74d16dfd6a8716c13fda7dd536b1a70',
          },
          xpub: 'dgub8skomHTDYTceuEmDeKwWZe2WrFRqisvrPHWdPhttJeXdrTESH22Ffd8KPGu86fEHnAAjkY3nEVFgEaUmbvqBPdEnshcMx4rU4SMUy9Trjxi',
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
            public_key: '03025f40bc5202d0299308807156002d47b49f71e81817cafedab970239cdd57f7',
          },
          xpub: 'dgub8rohxLAGU4TFBnBVevP7aL1G9RZxwWVeFqu54L9qseD62zDeTrCP5bhtELLqPGf6A6gKfxdKEfrG3oaSZvTRt5TVeWPWydX1BjHKNSasy6f',
        },
        '100': {
          node: {
            public_key: '02b915be734e9d7924dfb69da11b38823afedc136e637bd2838ef95c0325fd1592',
          },
          xpub: 'dgub8rohxLAGU4TKbWTgxpTtPRvnZ1xjnVYptwsQvjLCR3GEHWVysbXzeEMjXujT6oNGHP1kNeJjoVQkdrE2sir1n8B6XzTJVFnQYDAEgmdnGeU',
        },
        '2147483647': {
          node: {
            public_key: '03391686881135dd0d36bcc222d9b5591c69c883289c7f8301d8f837ba5deee1dd',
          },
          xpub: 'dgub8rohxLAQoizDKeypVHw4D6teVBEmX8jWivzCvhJyLhbbNjJjNhuHcfWYzsctmuWSvsJYh8rww24MXJ7393MoaSXHwSfuN3tYF8uMitjX4bj',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '022793828296be9addb9b6a0813cfc633ffe05be233118bb44d630ed57d6e5802a',
        },
        '100': {
          publicKey: '03856e7a5ec82e92874a6986423985342f8a302695f0ec8b8340f0770e4b523b6d',
        },
        '2147483647': {
          publicKey: '03c9640aa2050a377f3b4413c1ea10c4f228f7fd475274059ff2a6b50660b972da',
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
          xpub: 'xpub6CSx8EYkACrjM2kdUt3sWgKxaSkiWDo8V1te6PbPVR6a7VPmYkYGuF6pMfUEww5CLZyghfcGNpqnYeNjBm8nJPKaJyF4SrbufnQdmN41EbT',
          publicKey: '02a7b68a83d2aee30879aeadf40840ef8e0864698a657b6f604779cdc1e986b6fe',
        },
        '100': {
          xpub: 'xpub6CSx8EYkACrojLn4CvjAtFLYJqK5M2Ud1Yi37P2JUoWjmSX1ysiU2DJv86o5ATKyygXvAvmUoVhDVBNrL7bSRsqECXpfLH6sbMKu8yp2JiE',
          publicKey: '02217ce9e284ddc8d5f70320b2dc04212a695956cb80fb339a426849f0f418bff0',
        },
        '2147483647': {
          xpub: 'xpub6CSx8EYtVsPhUWS4E3xRsbo2PAGnNNAuojMkPvN95C5MjiXw7hixsE6n6jTrwExVT1rs5cLCk9LMQdhzgK1hcvu3dR9ZWxyWWMveTUNDn68',
          publicKey: '0246e2a5bb8357f5fe333af620308febbcdad3903b915e9a2c121521110fcd4b2d',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6FnohFvKW85EBLMizUxJk8wT3VoG56uqPfgxqZhjdPaEvxyGhfwB7iyQCrZdSyFvcqTzQF46EJ18Eetpb52ka2MKe9osVFCrxLoLWyzGgYg',
          publicKey: '025458a2743a096700c267094bc1448fbcfc91258e6e5d84fd9f1734eb2e6312d7',
        },
        '100': {
          xpub: 'xpub6FnohFvKW85JZBrYvRAhEspQ3RV2giZqbKuoESmED7sEGAVDwtUqTseHsCSmLBkfarxf9XAiVGd5zeoqfTynJFn8BB7zK1o5zBM91KQ8uLx',
          publicKey: '03b39c9f957be3110cfffbcaa28d8b8ba55dc50e6f97f36876392c7a99559ed92e',
        },
        '2147483647': {
          xpub: 'xpub6FnohFvTqncCKnVvQ2e2JXf44HoYBQj3LMTEbGpJEnLX5yBiLGGirThesy3n23ey6igpWWPwjY7CAj6vnEyt1fWBtcvF2mydJ2LDzyne6LP',
          publicKey: '038bf5cfff34161078e26b29ffa0e4f9f2cb2c5af5f5e74e699535b921054d5c3b',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1g5zkm3e6p8wxu74j4d2h7stx5yu0pwz4qrxzvyke95w44audx4ssyz2twj',
          publickey: '45056dc73a09dc6e7ab2ab557f4166a138f0b85500cc2612d92d1d5af78d3561',
        },
        '100': {
          npub: 'npub1duw7lnst94n7nxymm5lqv79s3y5vfjkk6a4nkahlak2q8wrdtmsqp9lg7f',
          publickey: '6f1defce0b2d67e9989bdd3e0678b08928c4cad6d76b3b76ffed9403b86d5ee0',
        },
        '2147483647': {
          npub: 'npub17nrk55qydgwjalp4n99ps47urpv8ud8x5xlkl2g2p8nnk0pn4dqsd2445p',
          publickey: 'f4c76a50046a1d2efc35994a1857dc18587e34e6a1bf6fa90a09e73b3c33ab41',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xf444ea93b0e6a8b95e8a5f188c1054a9eebd297764d68f55b1845eb718d7fad9',
        },
        '100': {
          publicKey: '0x2a3843913da16cdc4f33ad12eb35d4abf5729cdee3878bf0dbe881721d9fde5f',
        },
        '2147483647': {
          publicKey: '0xaaa80613addefddcedb33b6ad73a97d3b37fd2fccdc5e5dca2be69372f1cbb10',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '0316d01c9f31b78fa94f5fd53f62b40804b0210de50f361fb6aa07b56b818c1083',
        },
        '100': {
          publicKey: '02e29c4e5675d208e95345dff58cc7b37ffa24753d5489f5abc57bda3906478de9',
        },
        '2147483647': {
          publicKey: '03e77f49c1beae8c86af33b4cc26d2b9c6510b0972167ad644740b4c0f5d40e57e',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: 'e4182788ab8614a6ef4602e3b5e9cd9b117c89002b1dc35c9ea0c5fb2a5c0ace',
        },
        '100': {
          publicKey: 'd30e16c86d1acdfc14af21f41a6f5dd32443fdc10a7ea827c2bf21dbf6920399',
        },
        '2147483647': {
          publicKey: '59d4bbe92cb437dd9bf131c22fd7f58df8540386275d7309a49314e3e3a87d6d',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
