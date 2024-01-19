import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase24-密语1',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428802119',
  passphrase: '0987654321QWERtyuioplkjhgfdsamnbvcxz@!###$$$%%%^&*',
  passphraseState: 'msnViVktp8SWFH4hjf5EYmXzTAiD6J89AB',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            '728212578025aafacb3a7934fb3cfa2298bedb9f60fa982f52d51954cfff8e2df82875505fdb56fbc5c59261cd4e3bfc8403e29729d594c06ac5a263632ec883',
        },
        '1': {
          publicKey:
            'b26ed7115341b7dad0870c3895c989b3d6e8890454f88e41fb884c6f4c1ef59ca0ee9904c2f663e7b0eb65456008a24f373679678b8d6fcb0f54e48bee232ad8',
        },
        '10086': {
          publicKey:
            '2283867dc9c5838369de29cb207890291b093677fb6e8ebf8a86cba2dd5ea0fb1f60cdfab847fbc05412b7702449b5736efd441a0c9eb83a4b27309d068cc3f4',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '3c349b844564086903b06406ad8e37481466525d128ad16acbd9b9b574752e2f',
        },
        '1': {
          publicKey: 'ec190d6d8abe9af421c112bfb3d8858b5bab2158c1367b20c18a4607f4129441',
        },
        '10086': {
          publicKey: '34aa71101a38401c4a524a6e3b12263d63772b3800b236e75f3505e4ef17e5c2',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03e15b135f5a9a2c254311c227fe4498879883748f00e8e943a01f079d3c92dabc',
          },
          xpub: 'xpub6GEWayvzcn1ndWJ4aocJxZdDM1XzHJmwvckPbZmZRzysLCuNtuieChXd2YwUsQaT5MwWEEKLHpvQTn1yh53HGPjQoMjXC865R5gMW7wtus6',
        },
        '1': {
          node: {
            public_key: '02244e0027592fa67d92c18fb2584370d4c4c71c93dbf660ee5513b5023e1b85a8',
          },
          xpub: 'xpub6GEWayvzcn1ndpVSmfCHN1Dox1gRTn6ChVe3tXSeXM6LKkTVnWXZRngZANSRLW7GBhFpJHWARjQy23sREdM2NSJ3nHJNgk6fc6HdYmpQXL8',
        },
        '10086': {
          node: {
            public_key: '02c2e7cba3ce5b6189e50aae6b26f109f6b662f3116c534a74aee714c798ec4c5e',
          },
          xpub: 'xpub6GEWayvzcn9Rq3R5jpiRyNaRA3cCtMfKvkrLNrCBDbYUN1TqQwXVZdGqdrX5x4Wuc4wMb39WvWE8pwMoiEeBZT2A5RThuaAkAaosp2KQMHp',
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
            public_key: '03eaf42c52df25e58f3a028a6a1eee1c610db3cfccab9a4c72e39850b9502e633d',
          },
          xpub: 'xpub6D92FmE3jSuoLoNLrGgypqsCPxmP3SJHhSaFwGkK93VJytFe3CgbhUbhYgdxT2NyBB5riUVmU8a9KuU4v6RasYnUsQhMkan5HaoZbEi51en',
        },
        '1': {
          node: {
            public_key: '023be3578415a19601bbda418f6e12c04c0000f3b5b8f3ca66eefe0abc5351cdab',
          },
          xpub: 'xpub6D92FmE3jSuoMDfH15piJXVoJsTPXTnP5rRni4oJibXJ9YwzWK4hGvUoCsBkSew9LYbW2QjvzcRGcMTQKgbpEFziiEAMpwSD3X1NQhHPELJ',
        },
        '10086': {
          node: {
            public_key: '0249165f488eedede077e44fda37c57b2220e86640205b150d24dbe0306a38ddb4',
          },
          xpub: 'xpub6D92FmE3jT3SX3hSNvbD3xZdgfm5fG46dC1Jk8pUHYXrkHMKkWwJMNvoFnzHuYZWpHwyjVLvvjrEo7rVFvnhXoq8J6BUHH8TfT2WyiXYJGW',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '02591d296e150b7385b7b0327c1c05c75d131e25e1316c5df9324388cf8e57da6d',
        },
        '1': {
          publicKey: '027fda6b4afdb48917843a0423988c44078abdd8cac1ebd11bcec7f2419c183c00',
        },
        '10086': {
          publicKey: '03ad338c29711de58948fa483ef88368c5cfbc379564d700dc031f6c1fdd07c7b0',
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
          xpub: 'xpub6CYaRsXLZyKqKLF3K9p3Ggffp5kvrWHgjDe9ZmD6b4hrvaPoLLS7MSVnWFAXtPcJA8mQNWaqkynCxGjCX69sG6DfnB6KD9Y7YFU3vVNwT8p',
          publicKey: '03e3112518bebeb7fe0b802a7d645dc5331721c83873bfb66d37b8528a529b5527',
        },
        '1': {
          xpub: 'xpub6CYaRsXLZyKqPVhE3NPJrdWrJc5JX1ebAAnPoZhCfC75pBX3uWwJMYrcUnfY1c89EViaUj8Mq8Fu4y1txFxpfjYHfsWtuCLBe7kMmfa5dPc',
          publicKey: '02a7b58cdc08a9c890b5aef494c3a6d068dc6eef6c06f5d09a0b6282b1f63076ec',
        },
        '10086': {
          xpub: 'xpub6CYaRsXLZyTUZxK8ZSf8Q9GSz1ajNANG4JQtLmHTyT1JnE3pRLubRjHXndsGS7pyHaYQLJiS9bR4whDbfgYfJ8nxE9Cz3sZBvSnEu3kSqyz',
          publicKey: '0260213cc7706848fb749073e3967836189a721f46b0128c92b482d24b710e3c7b',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6G3LHDWj7Lm4BcZrN7D4sbLh9Na6ghfrPNeWytE9VkFa9TGW5oguBXSdb5N8VtyaNGuJEWe9wkjddC5wJUxFezu8MkeouPVduFy8HLTx6W6',
          publicKey: '038e186d9cf928aa1444c4c5a2fe0d4c08a7318bbc230d743e129fb4861a04ae63',
        },
        '1': {
          xpub: 'xpub6G3LHDWj7Lm4CzAv5AnTjwY8JQsH67fHpULPW3GDv4gxTLN4FVoATJ6d8zLoQvhiDbUZHczi7Mqz5AHbNYx4ePHGcY9XKXWGg2RYMZLMeEz',
          publicKey: '03012d19076da10af336a226637ad09e2ead56ad0ada4e737a599008c365f4bd07',
        },
        '10086': {
          xpub: 'xpub6G3LHDWj7LthPGHUy6JyxKoLjpshVwof6fN7veKNziLFj26XjGL489gEjtfPsQk3pmJvHtta1Nc532mYVft7nmiqQtw2WtSSpJDZT2Sig65',
          publicKey: '02c01c5dba32a5b562ec0a20d486530b84493d417d3bdbdd9c2c76dfe052e31cc0',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1hzgjtp22xf0s0e5aslavf3pr5qd4mlk4qr2mhvkg73v00sd3z00qjkgcng',
          publickey: 'b89125854a325f07e69d87fac4c423a01b5dfed500d5bbb2c8f458f7c1b113de',
        },
        '1': {
          npub: 'npub19wfu8fpd9n7sks2d7dk9tzvkq7t3sr67gn2kjtd7ara5wwgfj6dsm3cjyy',
          publickey: '2b93c3a42d2cfd0b414df36c5589960797180f5e44d5692dbee8fb473909969b',
        },
        '10086': {
          npub: 'npub14m2g83qtp7tw3p7medqmry8zjnc3xt43z20j4m4285nwtnlw3jmqr2zgwd',
          publickey: 'aed483c40b0f96e887dbcb41b190e294f1132eb1129f2aeeaa3d26e5cfee8cb6',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xd426a95f07a737e68a800659fff92474d98249a39bc5e405879c8099cdcb0b3c',
        },
        '1': {
          publicKey: '0xc627f673c95e39979609c35f2c3f2d6c1f8c9fcd5787c9cb25f06d33febb5cb2',
        },
        '10086': {
          publicKey: '0xa90928936bd32ae84e20d8f6a253cb7f692012036a132e791dba96031059cfb7',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '02e999151126713c00cba166dd6710ae2cd4c2880b4063052ba1ce439510d402d5',
        },
        '1': {
          publicKey: '024da538b6180d33629da199f3963757f477d5ede017141ce45d8256497a6391f9',
        },
        '10086': {
          publicKey: '02ebf0919252ac1cbe8c9ced49b19a1315ec59ad20bb6c296ce6950169e0bac99b',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: 'bdb5f377712ea392136b434cf6427c9ed4e862546684fc4c8fe7562d37589364',
        },
        '1': {
          publicKey: '0055da10447db10873c954c5ebe3b077393e76e751ef5a9a5cf3d127e061148d',
        },
        '10086': {
          publicKey: '4026952fca4289969566408ebeda58e1909642d055ada45a9e291eca5e0d39d6',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
