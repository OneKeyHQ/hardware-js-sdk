import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'two-passphrase24-empty',
  passphrase: '',
  passphraseState: 'n2XDwPTRoTrLUxu25L6XDnyDBuDeXhjmoz',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429359364',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            '63a464052027e8e3790f25dd7b4f469b6710820b402b20d5da200ae98b45362bc4c1f8b4d7828d9d605f4337c35fe3aa5b3d0a05df36c7f84e04439ca2545827',
        },
        '100': {
          publicKey:
            '9802b00a957997017ec686829f94cd74cfde83afb837fdc0401ee93018a3743aabae7d1c9d8db00a66dffba046127ba24bb470cca999211e8fb05037a0f0d98d',
        },
        '2147483647': {
          publicKey:
            'fe9e5c22101a3d5cb3f0a6c619a8e38b1e72bfbf86246a2efbb32dd8eb135b212a4735df5ba111cbcc7b979f0a1d195b4c4daf412085d040b37daf1290488394',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '38465d91aa4ebde5fb6729ce218de85189955bb482e4ed28b73d5b377c4d79e8',
        },
        '100': {
          publicKey: '4b2b839a9130a93e0aa85b8fe97498161035489321cac89ccbe70eb1f68cd42d',
        },
        '2147483647': {
          publicKey: '205e28f9b6eeee0c1ed4c11ae760a6af669db8959476dd00269b120cb1ccc22c',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03b15acebedd876b1dc992acd683f3d0c94048f08f9583247fdb062a62872ab197',
          },
          xpub: 'xpub6GA4sb59mg7fxLtZFPW4NWorGSgKkG4wnCu4jw7yFfgtDvs3vE9LfFxYvRUgDtfAAdpLWjKDzPAXAvHDHgvEzhkegfGSY5RoHrQcyxaEWrQ',
        },
        '100': {
          node: {
            public_key: '03b71f963af5d86478c47435a3b6b10a8e754f59da18eb7bd33d239f44692f4cee',
          },
          xpub: 'xpub6GA4sb59mg7kNKWzVoxEQowGC69M4m7iNnZezVvRme2Jx5VghgW2hQiEYYbXCyPL1uxLhDr6WrMFf3UCVVXP3Z17UqAwfsoqAKvazrx55QA',
        },
        '2147483647': {
          node: {
            public_key: '030ba32a7a49783f23c74b54fd334d2a3474f67866c96025b65a5b1899560e6755',
          },
          xpub: 'xpub6GA4sb5J7Lee5xsxVUUzaWVwwK5AjsSyYb8UevcmhWzdb41SeUtenfdey4r2hzKrgZE1oXJoQXtdbUgn9LWBCHPZ9feGNdxzqFo5unUn3xz',
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
            public_key: '03ee9f4fc2e3c7a4233cc96ab0ad6b71f22567970fc1944896bcca365e25817702',
          },
          xpub: 'xpub6DEhxDPPZQsaTHuKKL1nYnP5aMmyk1gMm5K5cxM5VjMxjAVLwa7fixeTrbHZ6TSvT3Di5skXwhZUqG9FA1hgUiuf46BqKJWiAAMBXaR4bB5',
        },
        '100': {
          node: {
            public_key: '027916cae4615ddc0678148f052a447e93e409dcb85552f4223f69be882266e6a4',
          },
          xpub: 'xpub6DEhxDPPZQses25YQuVBSRGfWJ1JkSZmwXXqYWWG5EWGWSfF21mtmYq4PheSW589NoKRSVDKF9AvvAFv7KVGwTDviYMcG2R9FHgBMGPAQxN',
        },
        '2147483647': {
          node: {
            public_key: '03648e281f983faa26dc65559502a4cf78ba5c15cb6be4c2527d5ab8b4843b432f',
          },
          xpub: 'xpub6DEhxDPXu5QYb7TPv8DiDL8mmnZdE7TSEztmSTNJdXT5kjddJZYpuQF4LPkkc5Strgj13scAuSWWNpqk1BSFe9CVzgYM5mBFmopVV8NHZzq',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '035fa0ce7b5fa7a5ddaaba44b3dadb6fc078632acf7b83625db4177a2a83eb44e5',
        },
        '100': {
          publicKey: '02b6886ddd1115280770d1844ec53c3e0b8c160197cf0a1d332e29d2707c66b5bd',
        },
        '2147483647': {
          publicKey: '031c21a809af98ea6fda6e08d4b2962542ffdc78f2c46ab5df459fe937efd2707a',
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
          xpub: 'xpub6BpnhhdW6g52kBnschto3AxxrdL9T9UQYew8Xy8uqv8dgnELqAw5regP5vKLop8gozM6tsLk47QC2PvfCKSFqeUVz4zMBZPFbsLQVot5t6J',
          publicKey: '03952fe53d31df701f273f316ae4da0be1a8d7cc5aa3fca11fabbc1f503fbf307c',
        },
        '100': {
          xpub: 'xpub6BpnhhdW6g57AHw3PMdXJy5kRFE6y5RY6rstaxRbo2tToKF6kUYS4SRX3TRqsqQ9bgbshDFLMgawEbnQXr26kpeabGpF4sABz87Gfwg7523',
          publicKey: '03e01bf983769d29a41c822c5abaa08ed1c13921555ba15bc2443ac87c5bb5ad57',
        },
        '2147483647': {
          xpub: 'xpub6BpnhhdeSLbzuh57tz7neAd8wGese2aQYD7Bryqkc4ADQMsNRy6SVK8y8ANnpe6YXYH5EP4wnWAveNGbdkUZDnzFhRLxiwPgo7uQYpCe3QQ',
          publicKey: '03ac0d471adea9f254b820f860d5993156a82b2db687d9acfcbafaa77f1eabf693',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GmcuhAjVkj5mWpgZbQHWoRFfpGPi5iXuD8iT63eUNP2sHQif2qCCWSw7HwVavZgYY96XGHNaCqtJePCvjB662wpNsQJNrDsCG72xgNiCqQ',
          publicKey: '0225d7816c851683d92269891502cc0a75dc0628dc05da88018fdfa8adbd328fe6',
        },
        '100': {
          xpub: 'xpub6GmcuhAjVkjA82HMQ4EnfCUZym1dcvRXCrp51FEfT7NXUCNLEJMEMVquiJHJo8SHHLEgbHb8txvkxKLGWpfiSp98dSuVxZccCP5YxV6DmX8',
          publicKey: '038cd0bb771b14d41f772a83f0f05d4c5730228686f2ce41973945e7029124d547',
        },
        '2147483647': {
          xpub: 'xpub6GmcuhAsqRG3tDixSsjy9We4fL676EYYc6UW89VsksyWYYurAqw3AR1zZc67mQb1httnKsw4mavQ3d5ted1geKzEXxCPEjn4tnTubMDHsr7',
          publicKey: '039d1e401af63c7f6be041a134bbd8f2612a240f46b59739a2fb417805f6475b16',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1k7h3h7ufw8dq045403qlzqtz408zfg7an79glz85nnwax090n8yqcyxg2s',
          publickey: 'b7af1bfb8971da07d6957c41f10162abce24a3dd9f8a8f88f49cddd33caf99c8',
        },
        '100': {
          npub: 'npub1swggtqgy969wf6fsw7xz3w497xs7wxtujnh3fr9ha3wgvqcmrzrqtvw0gd',
          publickey: '83908581042e8ae4e930778c28baa5f1a1e7197c94ef148cb7ec5c86031b1886',
        },
        '2147483647': {
          npub: 'npub1d45k4r2v3vvqku24v9m2mm6z0zlc2ely6qegzqvay9vt2h54ex5qtp5a8e',
          publickey: '6d696a8d4c8b180b71556176adef4278bf8567e4d03281019d2158b55e95c9a8',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xa60a29f8431ae46009c75312d10ff92649c2b17cc039ca3deac7611949aba897',
        },
        '100': {
          publicKey: '0x9e6b9556d4917c24c1af2b4b83ecd9a237c2207b7067d0fdff571943fb2195eb',
        },
        '2147483647': {
          publicKey: '0xf030f7c9668a5015cd4fc28efed27d823e794f021ad293296c76555df772d324',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '03e8ce09b1d2be9d4d099fbb627517ada3bc094842b8cc5ff45709bf4f98fd80ee',
        },
        '100': {
          publicKey: '0245c862a0a69ec07206515dda87d7d3cb7b1c485088e9074e568655aee190d760',
        },
        '2147483647': {
          publicKey: '0245162cf4537392eb223dfd4ac0cc91ee0954186bd5ee1230903962ecbe7595d9',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '11fe30ca3d73f8255b536b0f00be13f5ab80a8fd80d47b8c06c90f16c3f27225',
        },
        '100': {
          publicKey: '0e2778cb1c03a7eb7dc4dd1cf115d2bff0faeda8f81228b9c986b689bbc3d0bf',
        },
        '2147483647': {
          publicKey: '2b4160e776b9d4a92841fc91451eecc15b26a034c7e9dba842b9cf3094292c81',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
