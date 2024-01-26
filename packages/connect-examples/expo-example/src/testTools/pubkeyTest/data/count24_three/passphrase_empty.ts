import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase24-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428802119',
  passphrase: '',
  passphraseState: 'mv8SRcYZ8vcfWnx1KjtHeEYpiuXweaHm9y',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            '607f5c25837135ffd0c17870c665401b09c6c88c9458373defd80f289832c54781c9bfea44aba5a8b435aeb87f126ad07c35880eeedb748b0e149c669d0e571a',
        },
        '1': {
          publicKey:
            '1212898f49cae2100d2279abfc6baa4b7562ab0ecf1834a4d9d8bd7d58857bba04ddc67831243e565883bfb6d7b302bbfab03bd4eeac3981240950f8282a82b7',
        },
        '10086': {
          publicKey:
            'fa39db27bc36ba165a6f5e450aeaccd4a9dc1970345a77265d03d02cb720c1bf4aaed02e826aa1b74eef2f1bbd539c02fdd7386eadf996a9f7ccba02457e0c86',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'd0f73de413e939396a0526a991b1187e62479c227872df7886bf3a0557e617af',
        },
        '1': {
          publicKey: '189818000b81d710348bf6009629ef1b9f4995c9958275129c487a21869a1345',
        },
        '10086': {
          publicKey: '05291e74b5885c82583a14dd5aa02af29b6c6a52e725d2ba13f84312c1fbe76a',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '038b390ff8aebf0633b56e64cf5be5eb7e407fb2d5471b6d895acbecd613e45f93',
          },
          xpub: 'xpub6GkHj1TzPzChPFtz7wNsQMHZKywMDqdNFaRkRWcpTKo4aMHykCrD4JoxUNCxph6rFCPRipshe4p9phhhhYCNz76jQNDy5zpkcasGV8jcnvS',
        },
        '1': {
          node: {
            public_key: '0322cb9d036e259ee3c1fcb0b2de235746a43364d93a49da6154db710f5a97a07a',
          },
          xpub: 'xpub6GkHj1TzPzChQAjHn7C76rAVngWunmVvHByzDhPEuvvYasCBDQG3tYPuy1rVDdYQ4yTsabQ5JbP76rSqrguCxyVp3MdB3Ww3MgvvAaSLT41',
        },
        '10086': {
          node: {
            public_key: '02f3a8e4bd93cb4e044c33a8ddac971aa19c5a2e8e4bf811e2efb797c44bea6426',
          },
          xpub: 'xpub6GkHj1TzPzLLZcMPfXgimNuqfZRLmabojXC5LohtUEcT55dRsRFFTBq1etYr1z5bemSthNkqTsHwZzgj2tEArYZiBCu2HtaA8uFF7mCF7mh',
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
            public_key: '02cbeeeb118d6328593eef8b7499ff9d86c4ea4d1354bf18d1672b1169db7d314a',
          },
          xpub: 'xpub6DJUKB138nx9cRBRD4kEtq4fjhtco1oQxA4CmmkS37PzRcVHXsTzkRJyiaCLg58EkLRoLhdhRRAFZ5xH1vqceScCEnn77jnZxsLt71jWyWX',
        },
        '1': {
          node: {
            public_key: '03e57cdd66b0bfd8d30bb7bc072992cc54d7ec2ed6c057db50c749b2932ed1ff0f',
          },
          xpub: 'xpub6DJUKB138nx9gQ1bMLFRd9f6KT4vZ5G1RoW298SQYZo37tCs6iKz9yAKD4dnS2MqRrEyt5sAd9S31H9wXvjomybQ4AbexiivQKfKB2zd2p4',
        },
        '10086': {
          node: {
            public_key: '0385f1ba21b91fbbac416b02f54243935b098a53920358e7f71ffef1703f0db532',
          },
          xpub: 'xpub6DJUKB138o5nqiRqPnj6zDUgqBQXUtgfc9vhsCAjD6jnRw3CpLCDNP5TCQz1CbQhvsd2Dgh8cvRyobMzhGMqG3cQK63VZAX5aiVptPigA7q',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '02231bd76f9b96844e80c2e0cf96da8a50405e039de780ab5d7b030f848ef15a11',
        },
        '1': {
          publicKey: '02eb9483edd2f5b5bce337333d1077be165d4349c3e700f64b8c1a1c74443c051d',
        },
        '10086': {
          publicKey: '02f64da58630e265032affd41b7b7fe47fd5fdf51857258443439b8575497a1258',
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
          xpub: 'xpub6Chv7qb5RQSTWF9S9qXv2PV1VBxZAnewbmPpUahpJMonrccFdezR1cErQFWyi7ui1KcnNmtH1ReVGC7F9SGF6FpJ9dAcdWmETRzWrYzz8mH',
          publicKey: '03ff88fb639a94ebf5db4990747199778e102ce291083bb58a6de8545899b5baae',
        },
        '1': {
          xpub: 'xpub6Chv7qb5RQSTaKzYHiyh1efuSd4CY8XxzSGhiTnFxxygqKVD5Tj466mGifrZThXyjkbs7eCe1pjCaCCC8nQFptYST7GjSkwWHrcUSkTkzbH',
          publicKey: '035b558b765dda6bc3e9f235d95d07750b025deb6e5590ae9898add750071c0339',
        },
        '10086': {
          xpub: 'xpub6Chv7qb5RQa6jmeLjLFLV1jnSPgXMJZt3ZNGV5vF1TYXpXjXivPbwY4PLgLBzfi5YAje1MkDSPv4VKPuFTExJYwD1nkvAJQf61n9qQQWAhm',
          publicKey: '02da7eea86bdd71704bef8ba352e78d0ec94a2e2f376d8e1e1dd18e6b2706db03d',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GmYq9daz8J6FXSshRzyqXyPvTahkGXk3eU6xnHzRjSWkZUnsgXvH9PsKiWcVF9AghTrnpjTtWXeoydKXChpXEJEqPsbdsaQBneV8in8NXJ',
          publicKey: '036a3d5101b38e1e69b41fb324653a7cf4d2c116d36e7c16f4b409a9e9335577fd',
        },
        '1': {
          xpub: 'xpub6GmYq9daz8J6Hj3xFDr8GE6aRigLTB6YRDkHRPPing5biNAabPFMYmBsFvUhLzoEURn3Q3M1e3upKp1vh8vbQhoXb49S4dJpfvLhMQQbK9S',
          publicKey: '03635fc88b672e20057d080c9d5daad64c358dfa24371d244ffa366508c5980994',
        },
        '10086': {
          xpub: 'xpub6GmYq9daz8RjUM5pPSGECwP7mjPRLLWkmVdHmABHAU5d47mSKTiEnbqGC4KMnMUKHc8exxevfWBbUDL8HHUz9cCZdcp2hHG2M3efj4LMint',
          publicKey: '033829c5b833b1195520cce94f21a62aff207741a806c8051c7c9e26a8ba84a9d2',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1kw5utct9t2e2qmgp60evx47u8gmmnkg46vtz3jnmu3gdlyx4djwq5wa4xf',
          publickey: 'b3a9c5e1655ab2a06d01d3f2c357dc3a37b9d915d31628ca7be450df90d56c9c',
        },
        '1': {
          npub: 'npub18f9687cf7peljpt33a2naqacxesxjcr60rtc3sz65q50uh7zmjlqjjypnv',
          publickey: '3a4ba3fb09f073f905718f553e83b8366069607a78d788c05aa028fe5fc2dcbe',
        },
        '10086': {
          npub: 'npub1zxayv89s9mc799kvwdge69rf9htv0sa74kqerr6l3yg4pxjvfeyqslx2nv',
          publickey: '11ba461cb02ef1e296cc73519d14692dd6c7c3bead81918f5f8911509a4c4e48',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x709ae284be2dfb343182909ac76f7cb1f689b33c4e168278aac1ad2a03e7bca0',
        },
        '1': {
          publicKey: '0xf1043ee690b3e6627acc91f8790700852ad181258dea3a232934e6e7aebddd56',
        },
        '10086': {
          publicKey: '0x0c9f84a0d0767cba81abb3cd5a6adb12a0c73eebc5e4e00f22203ca4cdac78b0',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '02305fcef470a160750185af6b1ba7e8ad42ba2b31a04cb107f79961463c1eb536',
        },
        '1': {
          publicKey: '02c2a202d2b62ea827678b775f2ccc632512ce5f243e9b5bf599543254a76d68c7',
        },
        '10086': {
          publicKey: '03faac1f6a0a3b95666456742e82997e4132361ad6fc16d2963bf6b3a015993f0b',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '45ea3fa9563bcf8db6d2609e0c6638ce5185b29cbe3567697722a2ca15fa43a2',
        },
        '1': {
          publicKey: '2e6a98890543540f0e8151d1ed1bdb613178f11cf85af97370cd5060552ba6a0',
        },
        '10086': {
          publicKey: '39918fd650bd20659ac1c52bc73da3543cee9e7686854e5ee143fe8ac1417fbf',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
