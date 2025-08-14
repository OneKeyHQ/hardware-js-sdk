import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'two-passphrase18-密语2',
  passphrase: 'E4j4fjFFA~',
  passphraseState: 'mssaQmy8Mt5LoZQaEdqJQbQ4RwUojJGjwL',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490398',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: 'b8f1925815877bcf2da4eaa512944601fa17c35ede8c78ae011af681896e1919b607eaedc97faf7f0689b489d6faf6a9afd84ef66ae2209654ba47a960c4c65c',
        },
        '100': {
          xpub: '4cdb3e54d02367ee43fdd7dd1a4ef5502dd08c4eb51b945d244bff3f829df0fac86936c45803db0619169d2b99edec573f8611d2a05dd4a802fbe8a7c452bfdd',
        },
        '2147483647': {
          xpub: '62f101f0b31af0a525cc8d8ced3562fe5776e7f8275b6463480dd7693c02d03fa605ec4982787fe18c8646d3312c20dc9e84a3c35982a892e397316db23719fd',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '05be55ccb902c23e28036abfeeeaca548fb880932a70602d22d643462d15160d',
        },
        '100': {
          publicKey: '010ae157655590b982fc7df769094cb5624339f6b1c8812470b8633404fa5cad',
        },
        '2147483647': {
          publicKey: 'e94e7e98d9ce60b99490e93d9eec83583c9734adfa714aeb45a3f45f96223e8b',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03a62dd09b023d7ec8e4c984a230773f8c17a010d362b289540421100dbe956347',
          },
          xpub: 'xpub6FuCWk9sh2xF5Pm3yMQhrpNfrBsrX7aed3jLxz3A4Cwe5NRTQM7PfPZffQ8oULrPMpzATsfgybiiR4mkC6EMtHNfQz9ungXAXg1FGgxzge6',
        },
        '100': {
          node: {
            public_key: '03d07624c7aac79390c88042fdf5bf37eab11fd01fe4bff1cc97ed228974c68bdf',
          },
          xpub: 'xpub6FuCWk9sh2xKVV5rBGQrf2qnFsmLw9afDhVU94cVmRrWQsH1BUnno39ahXaeEY8N3ZbUTnbsLgGyEzGaTvSdPiVo9K18HnjjEGY6zpn2kEJ',
        },
        '2147483647': {
          node: {
            public_key: '03849fa139b64332e1695bfce0b941d65d4fcb72e67df5630af30c5254dcb94682',
          },
          xpub: 'xpub6FuCWkA22hVDE7bN17T7Eao2Sn1bqzirrojAaz27LAyxK3Wk6xT6QuTUGRCB5gi4kiu1yHbDw5VsJDiZvyD6o6H9f4pdtPGHzh7YEo1XSGr',
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
            public_key: '0346dbfaf172925e054aff5ce3b326ebff6fc5026145b50f1fc1bdf059ff6db4f4',
          },
          xpub: 'xpub6BshZEttbn9PkBjzMPsujErGXFs7kdGbN5CQgT4uGgKcWLC8Lnw922n9A16erHzndcmvuk2hHZXkkF5aGKX4VCUDQ8YuHCzevMAMTkfCaaC',
        },
        '100': {
          node: {
            public_key: '03f8c37bf07888b282bc570859ad615895453af4e6372ee7f6e750baf2d238698c',
          },
          xpub: 'xpub6BshZEttbn9U91zommAfMxkX7seJChMovv6JwnnS9k3p3oKFJTBdTXh5SagNfzqVpsNPiCymq3tWWYnHt7uVuTKcKCeVu3kQLjDUPDmWPME',
        },
        '2147483647': {
          node: {
            public_key: '02a464f0e30efd5595131ccfeb3b08b826db92da691a2edc497026cd6e47c8b54c',
          },
          xpub: 'xpub6BshZEu2wSgMu7mJKKbaDsNDDVQgwrv2LCPhnLifLZv1JeRne1moPaySDDug53wS5VSQUtpySKMEZLhiotED6THXo7RGEuMKJrHgnRQhgT1',
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
            public_key: '0292daaa9b9a0efd841d59a3e8be3d02c81ffd8a5690b0d73f50793c98806c9c80',
          },
          xpub: 'tpubDDqRVpYPR1V6YudyxnopZgTjSDwNZ7reF5CSrLNVor3FSonz5EKDyy7UFKxaTmQUMfvBaG344t1zcxLLWXb9FiGMC37s8RFAxbTNkxAkJyi',
        },
        '100': {
          node: {
            public_key: '02194b05ed92f7048b05987bbe220ed38df35cc5012384184e16684643a88a2eff',
          },
          xpub: 'tpubDDqRVpYPR1VAvy9oZ8hnsmyiMCe4VwoetFHM2UyQ2yU5vBxdrYReWqGzjHkg6c8yjAHXCQxeGVYhvvx86gfr84h266osa8Fw9gKnsCXNBBC',
        },
        '2147483647': {
          node: {
            public_key: '02c136f797f8b6c8480e29da40bc74b3fa8b9e2c3646ae3a851b06466c9710f88f',
          },
          xpub: 'tpubDDqRVpYXkg24g9VAy6f9L4ENDsgoP1wyA9oPe3sDuZAPVDs5Khijo7WxULMz9USBsG6fvKGRz6Jyx3QGUNFoWwrZsUiTjWPtCzhSpgtgw2M',
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
            public_key: '02f700b68df4659023c7ec2186e7568383895763030249960bce959e0841d14dec',
          },
          xpub: 'xpub6DKxhxut6hnjQPUXmRVWBgquwrg6LUNuo1XqxUHic6hZFCa2SiV1g8ADavMyix9YnCJP6iDsJYkVCA3byNgsGtk7xf6xW3oYbt4H7ixJMaq',
        },
        '100': {
          node: {
            public_key: '03902126efdc039a60a8e3eb7007b60d2818d66d6d31e8f2cbfdce009472712f9e',
          },
          xpub: 'xpub6DKxhxut6hnoo9GGsAXNg8fvJZavXYn8Ltp7tRR1hYi5ztTSN2Sn3v1YNGCKCxEPXjcAAXx7pHLYAoRvT2GMYPhYAh7K1WTyFCLMvfM78Wh',
        },
        '2147483647': {
          node: {
            public_key: '02110efd3f32a1c68d3c079adb0298457086f5d9e7ddb58a26d215e2a6abe301a6',
          },
          xpub: 'xpub6DKxhxv2SNKhXrKxZMC5mmsu9FWvE4gNDwX3Tsv5aUKxqXVHk79op5QCQ5CACkSkiZuyohdu6yBRjYVboDHDVh3YzTPR8sRnYvC8BGZDEgo',
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
            public_key: '03df66f7d77aa1519d659534334d30bf8923225046a361147b45677bd9bc2463c7',
          },
          xpub: 'ypub6YEaJHFWFu6d5wrwE17amLHeDfGLNSJdXEYKjgC9LY7X6x9Pqz4tRkitpxfvEro2JK4pD6FXyeQkJ2ZEacVh6xtCqEgpCrTGtbJuWwS9Hm1',
        },
        '100': {
          node: {
            public_key: '027c4c07ceb43811217215246f020a2c0e0115084310d769055a9b72ada62bb2c5',
          },
          xpub: 'ypub6YEaJHFWFu6hVmbMEn7B7e1KBBo12eBz4hwKhZpSnN7QVrzf7u9Trf1ePgNx4gSA8xcnB1jPyWBk9iqSD7Js1EUzgbcZGVaQK6rLcrqZskk',
        },
        '2147483647': {
          node: {
            public_key: '02866a3af6effa3da8e924bef27600c64316667adf04b43662beab8eb0c503c3f6',
          },
          xpub: 'ypub6YEaJHFebZdbEyAyBMCc1Rfdv1oN2Vg2EASGyky8iTHXKkz1TVZzeSVUGjYoSJxuMafAUDSAokah5eKdp8WX3uRyPp4Fqoh3n785bm11Dy1',
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
            public_key: '029a430d5637d2cd2e0a0ddb27d497eeaf221c3137f9f002297525a527ae115f96',
          },
          xpub: 'zpub6rme1gRbAz3HDPHpwDpAYaPUqD6cCS1vkgdbvdvoFe9rS7KNbqDtxLYQg3evEFdjRm6qsPRuG9nQ28YJnXknk2mZeECA5LDBNAboXcdMtkj',
        },
        '100': {
          node: {
            public_key: '0309ff932136ab4dc7474cfef71f0021b7459c60e3d03338042f50b1ae7c517065',
          },
          xpub: 'zpub6rme1gRbAz3MdfqPY2K2vkfMiutoZxxGzp6HMEYySej8bNQvh8nng6gxeKrG91tbfEys8FdqcLbnbCbmzhRdGVud62Uksvi2SmSCARguw7T',
        },
        '2147483647': {
          node: {
            public_key: '035df7dcb53499285f21c68aebf09915ccb60b04c987f5ea2d8ce5c018a930d1c1',
          },
          xpub: 'zpub6rme1gRjWeaFMbxSw7f3XSiemmjZnv84uamej2Zq28g4cCjkCafdyUCmvMEPikZbLx6GsRT3BhoFhDBBfu3Sc2xY4Q51yZ5pgLfGse3sb6h',
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
            public_key: '03d95c535d3830e47b91080b2f21a0ff36efad1bd2d77e68feb7439e0a2982cacc',
          },
          xpub: 'xpub6CTMX6Kk8ZNdD55Bcv3XnpCFuxiXhr5Jk72xXyyDU4iZiP6kgi1sSx7di9fPVeX36iRsT3hiTaCLFf1CUeQAowPzzyBSfzZqBUqEvo5guQu',
        },
        '100': {
          node: {
            public_key: '039f432448f2573354ab8d12c00b10246896a9e6b66fcaad08f482cf09dfa9ec9d',
          },
          xpub: 'xpub6CTMX6Kk8ZNhcWL1Q5jdGTyDzRBsRu6rZXjhqSjTfmfbCZw8UYdESP8U2PvWYNN88HVFjMHUe39kqLCMmMnf2eHrZQWK163p3mKaAz3FjBm',
        },
        '2147483647': {
          node: {
            public_key: '03e979fc8a58b3921d5ebefc72a96d83339848243431272cec514a3865878ff99f',
          },
          xpub: 'xpub6CTMX6KtUDubNmD5j9KNR9RGUQGXotZkKwTngsWtZY4gyGynSZZJSCaVEpeTvyjeL5HzG7Y17E857rDv78FxQA3JeQ61aSZX2ynp1CQjMfv',
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
            public_key: '03370a7e3e3d82baf1c13fdb5517093b99bed2d5b4628f1c6a0c47b8645994fdd0',
          },
          xpub: 'Ltub2Z6mbeZivAXQkX8yS4pL93S2myD4Gr6F1QeWDLDXvx5yBULDg2zwVeg3aSmju7Q1zEdkBJd69ypyWC7LUJXyhxwpfEHBiSZDhA2XpjGzidh',
        },
        '100': {
          node: {
            public_key: '024521fde36d382c217f4a6b923010cccda6645ffe292d84ba49313bfff07db18b',
          },
          xpub: 'Ltub2Z6mbeZivAXV8Cdwd8oXmakshgdfdr2iHTAFpFJPBdQDQNkMiqESCD2mKbpxwjRpwg3B1qXRCQgxuqDJk5uYNS5db4N1BtRhwM1CSeEdEat',
        },
        '2147483647': {
          node: {
            public_key: '0330b341038400b357f7cdb274678b37b21826d016334a7da6bdd6c7d38f8a5b89',
          },
          xpub: 'Ltub2Z6mbeZsFq4Ns4K87QdG7xEEWec2ixwF913PFB8aSeXbNmVNuihJdn9jrE2v6Cq13wXg3xZi7By7pmWqSHUCHrnjq2tfNyF2AzBF1A8QLkP',
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
            public_key: '02d0a13111337f96e4f9f546e74116460ec0d6f1697bda64f1427e041e98ff6aef',
          },
          xpub: 'Mtub2seD3tFjwUGtnh9ujzvjtmTkwNe9MrtQKtBCAgxcoidLKtKi533KhSeyZbm9zJzqkApNVeut5G52kS6rXtw5zHT62xZttf8TMstXfSpgeQC',
        },
        '100': {
          node: {
            public_key: '02b659500b7d27abcbf503bfa8c78f6278d158842bd19283c4fcca339ed5c935a4',
          },
          xpub: 'Mtub2seD3tFjwUGyAxFMWoXd2F55SBcgV5BckEKrQGd7HPfgodMtximGkWsVnMEkbeGxWgj4PSFx3EEEsikfjd7pQQX8LPjR1syxGzmxJ9Czx6o',
        },
        '2147483647': {
          node: {
            public_key: '02516b171b309c1b5a52e065c79e9726f8417132d3e37d0d8201efc25e7fedb8a2',
          },
          xpub: 'Mtub2seD3tFtH8ortox2MGma1tBtTKZzXH3hxtzHphPhPHMB1S9xhJxkzkzEicrgnXvFpf2S8znSu6HCov5tGfXAeVJir1Pk4fvYoCtpTd6ipuo',
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
            public_key: '03b9ffecdccd05eabd252c3b8effae52d686ed57a995ef68e95c7af0b5aa5e9036',
          },
          xpub: 'zpub6rK5PtRQSe9Ly3kd3f5J5JkiVPA47ZKwbhMpy19L1Sa7AtX8JLr4YLW5cGbYNDD2a5cr3kRLwT15pVgoKWMHeDGLUsoWupPfEKTytSGc26K',
        },
        '100': {
          node: {
            public_key: '02f00d060f9155298587c682a27da1f29863c50e349e231f43952efd9d217b0ecd',
          },
          xpub: 'zpub6rK5PtRQSe9RN4KZg7vyGQzK4511nCHHA7x9zq2qkHi5u8qnLUmUu46dnhFXaqDV9Daitw3XWu7cB68ckd34ULSDhvbSbjKTEFNfctYxnVf',
        },
        '2147483647': {
          node: {
            public_key: '0280a9854aea5f25b20c56d419d5ee84aac732b7e6e1e5ccf13cad7fcfcdea098d',
          },
          xpub: 'zpub6rK5PtRYnJgK8SNG5jM8wJhRDckEyGf8zEKfuGvjS8kpasihH6VrNTR8mDxue216qJ3ZmNDGKc3fN8snujBm84yPWQ1nWj94nj5ZBGmKTYR',
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
            public_key: '03103d6725c2ff1f7929221dde34d672e22379d05da26abcdc0586a3aa74a9f5bf',
          },
          xpub: 'dgub8t2Lcpps1YrtHTqma4KYf9wzPChy3iWGLuSQa4Vyvo6H8c8pk7vonDbqajxTTUieUTVgof5hWvYuDYfc6RwXq7fU1tTB8ohpjg9cSr62czk',
        },
        '100': {
          node: {
            public_key: '02f4fae64c2b89c7541a6878bc6ad7fce5cba553bb51a48a9cb80604a00abd4743',
          },
          xpub: 'dgub8t2Lcpps1YrxiJuCeB9uJBpQ3UEvGWjQzoHex54wSTQi17JdL6MP4UgdrFJPYprkMPR92hL1MTTxgMqmP5phqzrbr5WM3pt5urPAiseZNf8',
        },
        '2147483647': {
          node: {
            public_key: '03698bffee84b18e31ec8539916f86a7ac1b9dca8854dfb8f4b02a6ac95b2bb354',
          },
          xpub: 'dgub8t2Lcpq1MDPrTMNWzpuKWSv7AMc24QxsqthqxBCsdFCMY9FuyeKF1C6FhEDgLAbcP6LQDR6yXkcQ3xNPt9ZPGUSCxHWPXemZP8UQFTFHZHK',
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
            public_key: '0238f5f53a54d01fc400c40e0758743562fb4e7bd30df9b83cbc0743e6e3d76836',
          },
          xpub: 'dgub8rNYhB9CQpH9SGLNXSdCRMitG97NCtkhUnKQ7EHTmH7JnPQDvvZ2pkXq4aBvyLKoS5zwY2nGLLnWnKseNsTiZWEp545iDXnyccnV6zX1h5z',
        },
        '100': {
          node: {
            public_key: '02240104f3ab216886a6892d3d92226c07a30f5fba3a25f6e3dce8a4ca096d3225',
          },
          xpub: 'dgub8rNYhB9CQpHDqVAkUEh49LKTUEJgLU4187KhFZ1wgDwkXLNqhnMoVMDBbWFJspnXCMxYMjyPsGPW8GZ5VxXvppzs1fbE53mcw5JXKM7a17r',
        },
        '2147483647': {
          node: {
            public_key: '0202dad2fba4ca0177b2fb1af68167d7bce661848575a578ee19376c1d589fa2c7',
          },
          xpub: 'dgub8rNYhB9LkUp7ZGfR9jrHZK2kPHsDNiSauvGBqsBkxTxousSCnFScawDe9B3RPjbW26E7bGNo8bDrm5223JVPofGVKPXUpFNrWU4zRM8bzwW',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '0368ef0d37ead8df94007983f7b774e4f5939fb058ab7aa73d0125aa5ac981bda3',
        },
        '100': {
          publicKey: '030b28c74b5995e42ea14f5ab87ca6f92fb3bd9f539bf73c176770bc276c87b700',
        },
        '2147483647': {
          publicKey: '03ff8fabd9d96706f8d3d8a8564d5357987ef6660ee7f1841b31cff4ff2e69e562',
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
          xpub: 'xpub6CYJxpe7cXRz6rU8G2J3rx45U5siACDGr3tCLAKpH4H8BkQhwTdviNJHHwPeJGxzvMA1pQQpnQcLDN3wLGfLv2AFXkK5dWgrHcKiwgvCfCB',
          publicKey: '0240492e1cbba2857af672172d076c58efe8807e8a9c24a7c58263236d8dd334da',
        },
        '100': {
          xpub: 'xpub6CYJxpe7cXS4W1eFaf5ZUsvGm8VkgnMKCvjS9xN2EDjF9MeZaLzX2JsJgjcNFHyRCundQ9s9455PNWbYLXnRbJTpSFVp8DhNPTupmwMucSk',
          publicKey: '03fabe94dad3dd09a9d2a46e6d94079d864b1d7a532e1d2a32a25430bc90dae395',
        },
        '2147483647': {
          xpub: 'xpub6CYJxpeFxBxxEpDfaW87nLPmeMn8mz5zKkURmhfGMkPGbLxd9v2enPKtw7quyXivBUNV5Yc2r37gYRfxk8d6U9kZQ5WFyzqqgJMBW34USB1',
          publicKey: '021549c7beb41a15b21ed4e06a5f599be6ed6ddd4a479a1cbbb989d0ef395c3c2a',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6Gv4oNJQuA8awC5diYaSRB4h496geRa7rBqyyQFAdpxPKCpjotsoNMSiT348D6Ct2p1a73JPofrvJRKCavdrwh8DdYNvi99tSnpsNBkF677',
          publicKey: '0201b771be6a21b93eed2668d4ce37d7800518041fac9a9328dafe067469505bb3',
        },
        '100': {
          xpub: 'xpub6Gv4oNJQuA8fL8HFXEPYppU1U1BhfefiRLUAbRqj7HXKJcNA8CQUVKK4i7PPmaodUkD96xjqgJzgNTExMcCxD8W3QR8rEDL1NvuDyBSnZAT',
          publicKey: '02a737a7e251bddecf167baf78c6c405b81d053b239b9baa6549ef0f508f4d0709',
        },
        '2147483647': {
          xpub: 'xpub6Gv4oNJZEpfZ39xYm7c9j2cSTQBWW76nG8PNTaragyWarDWvsMQQeQ6yYBnjoEugG5MNXob3KHCvfrux8sX1wXr3o4BnZkVYsas6FaanChe',
          publicKey: '02614be2ca12e343da4024bd5f620b9ac14d9b99a77f364570e690232436402e9f',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub16n3e4dhx5w60dmvkqzf5uu8gx8erfzcegrmqrq542xw725mjtu7qv7l9tp',
          publickey: 'd4e39ab6e6a3b4f6ed9600934e70e831f2348b1940f6018295519de553725f3c',
        },
        '100': {
          npub: 'npub1qhndslqg049gg90ekhg545fkaehgvfx2szlhj5u6t8w0zknj9lwsphttt3',
          publickey: '05e6d87c087d4a8415f9b5d14ad136ee6e8624ca80bf79539a59dcf15a722fdd',
        },
        '2147483647': {
          npub: 'npub1hqurc43nm9tgljsrewaghk2ndwhyp00e5pj0fmptae4nj5p2xx2s20s8s3',
          publickey: 'b8383c5633d9568fca03cbba8bd9536bae40bdf9a064f4ec2bee6b39502a3195',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xc39927807743a6eb37dd8197ad585a9f3c659fc7df7b8e9110001d4bddd8ae02',
        },
        '100': {
          publicKey: '0x55cacb0247e90c67f7b8dfb9f2a10432466ec28334d2df60d5fbd807a5572e7c',
        },
        '2147483647': {
          publicKey: '0x0fafa9674aa4c57c574984db00ba4c2a805224f16e694b8e155078a53fe213e3',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '03b2c0c1d559886425baaf0a167daec8c717207ae1cf615230dcba2bd78be25b13',
        },
        '100': {
          publicKey: '025bec6219bb69b5f0df17e8bca73f8671b2b1b4be1be00a8e7e7ff16003289077',
        },
        '2147483647': {
          publicKey: '02867fb06fb4533d1a41c896eb8933702b044e777b3b2b80746f447d4c5c7110a4',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '80880b001409c2caf36e7408ebda5880da622c8bc26a240eb9749e717e1713d6',
        },
        '100': {
          publicKey: '9a97093ef4ae11396fa0e211a0720272ee33384936c833f93ae587f94c8434fa',
        },
        '2147483647': {
          publicKey: 'aa478021f85562a228c86146846f916effaf8c9428ec725fbc01b3974748f032',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
