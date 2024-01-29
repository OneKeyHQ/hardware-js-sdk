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
          publicKey:
            'b8f1925815877bcf2da4eaa512944601fa17c35ede8c78ae011af681896e1919b607eaedc97faf7f0689b489d6faf6a9afd84ef66ae2209654ba47a960c4c65c',
        },
        '100': {
          publicKey:
            '4cdb3e54d02367ee43fdd7dd1a4ef5502dd08c4eb51b945d244bff3f829df0fac86936c45803db0619169d2b99edec573f8611d2a05dd4a802fbe8a7c452bfdd',
        },
        '2147483647': {
          publicKey:
            '62f101f0b31af0a525cc8d8ced3562fe5776e7f8275b6463480dd7693c02d03fa605ec4982787fe18c8646d3312c20dc9e84a3c35982a892e397316db23719fd',
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
