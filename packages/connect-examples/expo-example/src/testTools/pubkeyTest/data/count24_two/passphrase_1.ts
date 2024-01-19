import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'two-passphrase24-密语1',
  passphrase: 'temp10086',
  passphraseState: 'mgGpxhbSthC4jMPvS88CYL28dXH5sb46nc',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429359364',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            '6f8fdbfeb11e101be3f90c064c9e52dc1558c960009447628147820dc4bc15d71fea45f3c27b065fb3725388055321226ea61652d0469af9dd1826c4f3c1dd83',
        },
        '100': {
          publicKey:
            '1e17c2c599bdecd82d7147fe7b4d8de2c35064ee9fcbf95f11e8b18cb14a0dbcdb3e8e7c321d65844915399993d91672c366022474066f886c2735980fb89eef',
        },
        '2147483647': {
          publicKey:
            'bb94d8108d70de48ea61e4bfc76031bf6ffde3a19e3750922ffb98dce18f600572d745686acabc9985ebbd998aabb7fbd8bb5be8deb55bf8b27111087f847ef2',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '3dc2ec50a10678333dc6537f3a46bc6373239f4d3d2ef243cca9c4bdcd85dd6b',
        },
        '100': {
          publicKey: '1267d83dc6a8873ab337068128b88c2c9ccee3ba4e67aa6037e8be3ad3dd7f5f',
        },
        '2147483647': {
          publicKey: '73e43b4e59efb7b5d37491382c2735834e04533fedddf5c83c29f51b49e16c61',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03bdf79450ba047fcfc563380c2b2f5401778a50464d3ecf12531e0f5e1ba48901',
          },
          xpub: 'xpub6H7TV2ztNgFEuXdTTA7ATQCGVFS4uZX2jgjXcX1Z1cbqPWrewAdJQfmdrwD7F69JHzeq2aUBNHtaxky6m6E2gy943FCrgCjvdBGQZvmRNwP',
        },
        '100': {
          node: {
            public_key: '0321fb9041bbcc2b27c3bd2811d3bf0dc396eb1af98b0c1b78e1077096b341aa50',
          },
          xpub: 'xpub6H7TV2ztNgFKJmKLPMct8W7HKG4VWr5boU4XffCUADpLGtQaCnP3r8aPsLNs7c1eDMrLTFCn3vo5t68rjzM4ZYHqGFeWoxekHYvDss2ud9o',
        },
        '2147483647': {
          node: {
            public_key: '03f8a1bf14d398b260eb0f07a4681d78f9879dd3a132eea85d4e955f3bf5d649fe',
          },
          xpub: 'xpub6H7TV312iLnD35aagWCkzQQeWSKYa7ry4pWFdGTPLX3k4W9S4iKdBnBQ5o4V5yM8iEEYkv9K9BXdzn7p96uR9u1vozbghSVyHjzJHdf9s2V',
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
            public_key: '02bd836397343bf60a51f20cc20ff4173307f9cc9d9caf00aeed6ade321db179b1',
          },
          xpub: 'xpub6Cq658ZfsbxRQNQbaYXs5MJhYi7XPuxhtz4D7HRgeeXDhLvDMTfou8bepaAZRucRCUZBce91yQ6b19bAypLTftCHYvPP8cxGGbJdDboP6dR',
        },
        '100': {
          node: {
            public_key: '027df7f599277e8c596c1dcac32f044a437106c3bfa81e13d9566cfa38d4d5c89e',
          },
          xpub: 'xpub6Cq658ZfsbxVohGi4Pxi5NMZ2fQQsVXiccQYBFCcWko6iZLMxZpYvfw2agJZsxMKnxLbM1dFkVzKKfHUDfMvtW7yWrSGJUf6U61N7MSwv4R',
        },
        '2147483647': {
          node: {
            public_key: '0278c35d68093fba8c2dc519e64bd1b6bba47c725542534f0105928e454d7b12c8',
          },
          xpub: 'xpub6Cq658ZpDGVPZaCb98qLpDgEZKivjwBjAYv6n4u8YyxE6WeNMjBvL8BennEfP9aLuFRPAHNn4Yb9NoNBs4FZKHM9NQHbozyuvGoJ6gSn7pk',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '0249ae84ae3693c40460f58d4b7990c4b6379abdfb962111e464686683e13b268f',
        },
        '100': {
          publicKey: '02244d48aea987d13159144749e8f45f2edd4c475d4efbe91c68a206e5c871fe7f',
        },
        '2147483647': {
          publicKey: '0287e0713fe347d20211a0e7f5f4fd94cc7d3119cebcbcc284834750ad69c4f678',
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
          xpub: 'xpub6CSBz5oznbymtbhCn356FtmT89eAmJwtaUG2vwkFSMTq8MTqC199SMdJad47gQ98sWrX4QsPKmjUXp31bHzwudWDEjK8E9uMhEckrH16AEv',
          publicKey: '039ca683961832c61c7b89c38eac4b4330635f1023c223a0aababd4eb1d5e3588c',
        },
        '100': {
          xpub: 'xpub6CSBz5oznbyrGrWZ4859AsBRXNY5UDMUtrD9vvApxoACi84cCMa78sDdXCPJ7txVDF1xT57CW9YWoNPRmGYB6rrKbANiswjsoNvFxPb9Yot',
          publicKey: '0283c160f8e420827c9e691b8cd2b0035400860b88bfc2836297734853fe7ffda4',
        },
        '2147483647': {
          xpub: 'xpub6CSBz5p98GWk1vbzyCE629ua7XhrPA4hP2ss6ExWMJwAhf4t5whSRgRB9LNr3CNmcbtuexJckNDHjJYALRSZNMVa3XTXyVEAsMsohJ64jPk',
          publicKey: '032a904352bd27a630a01d9ef32c8402e48f99848f80c502fc278193feb38273d1',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6G38qcKwvCx8qcMW78Cij4HKJnjtizWr1u1QXwCCfJau4g9FYDCksxuRTZvonHr2BNADBDxD2xN11gYVkfdT22LVGXmKWc4kfsqkMNwBCFf',
          publicKey: '03f571314885fd2e3929edb1eec5661f7e47c155c495eeb73371236737b972415f',
        },
        '100': {
          xpub: 'xpub6G38qcKwvCxDF2KdArNpUgayioXuUrrVdWu5Dhupo19W65kKNHfz9uk7CPc6dQxMgEJBLo97A1Y9Gyg88UuAjuJBJkVtNSnUK44XgoUHenG',
          publicKey: '0393225f413f5c4078568cef8d9eba49198e12f08f6811857bf1f00a03a9f179ae',
        },
        '2147483647': {
          xpub: 'xpub6G38qcL6FsV6zpzBunat7d5xrJsyjs8HRrvQTWMK33i6aLN9tiLYMrb5zfgaasTV9CzBvzBPgyxxQpiH45sAaN1orm4jzNwWN4euAyZGg7G',
          publicKey: '02879acde0d0972cfcf436a505c00c66e51709253fd3b11d62c442fdf554e6a54f',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub18haeahsyzay4544vtp7qy4mavscv48g24ckh929d5uwf92tlmdmqmh63y0',
          publickey: '3dfb9ede0417495a56ac587c02577d6430ca9d0aae2d72a8ada71c92a97fdb76',
        },
        '100': {
          npub: 'npub1mvzhtjaqgycl8w3a9xn72ylq3fn2hqypt68y93jm5m29tx337fvqwzf86h',
          publickey: 'db0575cba04131f3ba3d29a7e513e08a66ab80815e8e42c65ba6d4559a31f258',
        },
        '2147483647': {
          npub: 'npub1epr7dx78wjsqshjjfj5cccu54xkg29dtk6s9t3ma5zytrjmjrdwqz0sjcv',
          publickey: 'c847e69bc774a0085e524ca98c6394a9ac8515abb6a055c77da088b1cb721b5c',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xcc4fbb1d65fc8e8c17144ab0f456a5aeec86638af3781254e49ff249a735f800',
        },
        '100': {
          publicKey: '0x7f4d274aa6accac63e525dc8d46c278c265abb552f57c7ef0e42764c872676e3',
        },
        '2147483647': {
          publicKey: '0x6622b72613f45af84f60b061480775dca38656da3d77e0a3433f6c32d2d73827',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '030742f70ca9ead04fc8b8b8605773ad1632214cfd6da187763acfa6db24657b6e',
        },
        '100': {
          publicKey: '030784ed0b23201f1b0a1c1e98d3fccaaefde31dfdca430b10870841b90d279838',
        },
        '2147483647': {
          publicKey: '0378a79b6df51f536e348e8d6146100ed960c052c4e53035084bfffda7d9ba9d01',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '98481a751c506a0b61177a113db7194dedec338c3330d33e5222a8745a0c036f',
        },
        '100': {
          publicKey: '52edd6f365b79d11fced986440c5e679f609da27baf2dd8d8719c7b5b0fbf3f6',
        },
        '2147483647': {
          publicKey: 'a523e55f23836ae90516697871bb441e3d70d8e55b44f667f2fc48a9c4bdc897',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
