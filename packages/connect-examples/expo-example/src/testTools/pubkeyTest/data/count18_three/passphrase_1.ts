import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase18-密语1',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428736640',
  passphrase: 'fhsdkhf^&%#4366ghhj<<>>$$$',
  passphraseState: 'mkXCUesRyVY1hZCemmXxGqEne6Jc7u9LbY',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            'a3b639a234a699c9c5b6de849f4c5216fcb8d0b4865e6daface41ae915f53a9bf0ae111cf6e9f6e354ce1f242bb38d70e2bfe9af9241cb2c8e86900e35bc641d',
        },
        '1': {
          publicKey:
            'e13986763d5e293c0b6e19e961b50b32eeae4d9f7761e1b69a0271f01d88da04941e5c596df83c0186223efa19e1db623a35be2e96faa3dc56b8655c23597d3e',
        },
        '2147483647': {
          publicKey:
            '8f6e15ce407dacfbe26d453fcb2a093019c5c6119511396fb75993574fc28a432704605fe9dcd7e57434a4c654b6a268f02393827fb889f141514db184a12762',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '95e0c0eb8bca600fc0e3b6569ddea35b7a9ccbd0e27222e7a9f65d35a71c9df5',
        },
        '1': {
          publicKey: '179f3d7b2b73cc1a722f94119e3c96424478a793c256b84b48cd179ea411a1ff',
        },
        '2147483647': {
          publicKey: '6e2df327828318e8540e1fefcb4e4cbe5bb71e826331d0741de4088a7fed3b0e',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '037abf8c69cb01b2649950c3cd8b4d33dd5cbc3b52a6ef1bf04e0bdf224e4fdcf6',
          },
          xpub: 'xpub6HBJkZZwD2QLvRsnjeMmXnjj4uzFKgafdFTxjTwf24nkuv99jur57K4tXiSyoSQr1ynUR8DJ1UuDSBNdSDxeSb9AFsApPD31vYVwzYh3bja',
        },
        '1': {
          node: {
            public_key: '03b1c5d3427e4f2c5726f285bf1eb3267305ce56cc81cc1d17d9292887d7bbc290',
          },
          xpub: 'xpub6HBJkZZwD2QLzw7XqHNmAxvNeSmDcELg68pDGk7xi52GdHZa49yeFUgPCpb8fCeB5QkwZo7ATNnHs2KWPdJHrnpV4QXVV1Jod26gqfwH9wo',
        },
        '2147483647': {
          node: {
            public_key: '020cf923d71c3b11f109e12a9ac28a791c54d62d2e966b9428e46140735532f880',
          },
          xpub: 'xpub6HBJkZa5YgwK3iy3AdpnzMW2pCxqGWpTMihHUAxSfhWPDEGQFitpGFhAw1eWVk82FV42yo986XHQQVXievEuNZvaJJDT8oqS2EZEtXZsrMx',
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
            public_key: '02b072a19c90c493880d63f34f494b7a6902cc10415f02de676c29be255125b935',
          },
          xpub: 'xpub6D8LFGTNJutR6kzbTq6oN5ppiDrU3K6TbDjb1c2Y4gZw2Ldi3ReE8JTWPze9Mn29bT7Vtq86tHP2m3rHr8biEK9iK9rZoAr7XWabioTLLPQ',
        },
        '1': {
          node: {
            public_key: '0288b7f10265824e9b0eb1d1c4a2a17459950eb66fcfa94d7122d5548fd51f37f8',
          },
          xpub: 'xpub6D8LFGTNJutR9J3wvDscMdCjnwdCPojebECRtMdxHgncSCzuhzfaxuH1dEbEWYfEAvZjkXWvvesUnYqxPyQwKaQrS69BjnFX6ptpLujo7et',
        },
        '2147483647': {
          node: {
            public_key: '036adc0d7c761d9ac9f9d4a06d952525566833acae98d5718905fe128868762857',
          },
          xpub: 'xpub6D8LFGTWeaRPE7BF6J7brPAdsKoTTcd4V7LcENaHLwbRhcSvzw19xYBYc4CmHzFf7kd1j3SvHjiBX7hsb7SETe7Vr4kgaMWzgzjitqLbrfm',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '0247123eb4b47054ba7aff2626e2021a56afb03bc06903e9d5f47e95678a4926a9',
        },
        '1': {
          publicKey: '02aa9783260c6326ca355e5704adb32a403ce48dc3f83137f433343fa9c1cd30ac',
        },
        '2147483647': {
          publicKey: '020cf3ebdeb03a94710c827025454b03d2018686389b31c562d5b7b90d3c173f8b',
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
          xpub: 'xpub6DEj93wwkPbRUhgjLRPfw4UbdykLZnG1TgtXkDHZ7xYNSaW77RA6H13YdEbxo1KCbkfudyX9KG9qrq4bgmKyWvGvnonVDEKStAaHmQ8h9h6',
          publicKey: '03b05903e9d11ac04a9eef1362eb7df1a0e107f666b72cb322dc478a41a10ada36',
        },
        '1': {
          xpub: 'xpub6DEj93wwkPbRVmsPmfsgfkWYjPVPUzPT9ig6GHGPdYw9gPDSRfR4vD4LjetmthfKREmBZQnLVqKneoQHJpHN1gBDbnbVkh8kcb4AHShQVyq',
          publicKey: '02a3dcd6cdfcb2e33d35c9712468603908683df25100f82460de818eb3b78928f4',
        },
        '2147483647': {
          xpub: 'xpub6DEj93x6648Pb9Sv7VH5HCaCiaB6ZmkUZdMDH2GkqdUvPTf3yGnynN9XtGYfc9GV2mY2937dWXBcC2BwhfmQaonLAH6EUEq7VWZsgaTKyPo',
          publicKey: '0303d1a8078bc8fd61794b811bbf15578951ad24da05a7dfc9befe7c752c06b721',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6HCbViSbWgX71PND8ih21RtEMcpDxeXTjuo6aavn9o5AwduVTGzu58avdo25orvGVpTriihxodivUWfrE5kRczPjqmZjVF91gnJyCiQH9FH',
          publicKey: '02a550290fdfb526498aa6e0f7a4627ee90f8b7cd5385f5cefca7e6949f1fc146e',
        },
        '1': {
          xpub: 'xpub6HCbViSbWgX73BSzxqFumbA7gqMqc5h2d7xAc5j1jdXovyAb5q3U5BavQaXF7evHmSj6bz6zWseUJ6XrTbRrPGMuCo69jQEY3ZAb42TPmSq',
          publicKey: '02a7bd2101896f1903f00e64c9ab8763c20f9bb986fc1cc540bfd546847c97949e',
        },
        '2147483647': {
          xpub: 'xpub6HCbViSjrM459es4uKh7P6QQafWemrHYduDgE7gC7xZUJtLdsqxfo7RRErJk9on4xD4WrooqyTnC4gQUN6Hr33DVrMQYgkqYWMj3VweaeAh',
          publicKey: '02181d70ea7e68c9a708a400de2fd868535901edef515c0bbe3ddff1306fb9a707',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1a6nr8fy7dfx8zugtq4q93yhjvazz77nxpkcaq4c4sk7hapzm8m0stnjd2v',
          publickey: 'eea633a49e6a4c71710b05405892f267442f7a660db1d0571585bd7e845b3edf',
        },
        '1': {
          npub: 'npub1nmglnv4p95ae38fh8vyxqx76ucyhk7r0ge2sp4q2u9hn9r5mqsqsq7mr3t',
          publickey: '9ed1f9b2a12d3b989d373b08601bdae6097b786f465500d40ae16f328e9b0401',
        },
        '2147483647': {
          npub: 'npub1tcswlvml8nngvh9sm9a38gsxjq64pnmtx4h8el8vwvtyzeyjfx0q3d7uu8',
          publickey: '5e20efb37f3ce6865cb0d97b13a206903550cf6b356e7cfcec7316416492499e',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xd5f769599531df5c6321ecdb7b6040ce0eba9992086fb46367421c91aca5a166',
        },
        '1': {
          publicKey: '0xe4da5f6171f9994ef15848252de42206236b942ccacafcad8fda303d9744df14',
        },
        '2147483647': {
          publicKey: '0x13651037ccf5ca61139dd775e59d254e18b21401d2f623c610e463b440b5b1ef',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '030f352a15a30e150ee500e0e39e66a4680db8a36614204d9157f3db1c68e6840d',
        },
        '1': {
          publicKey: '030d523caf0aec1b6db5779cc88c5712f1fdf4c4a875c3913caffb05712943a262',
        },
        '2147483647': {
          publicKey: '03f3cf600fa64cf9aba91112ebc7a9622c072b16774c59209aad887f191cff86e4',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '999067ea75feebaf75698dda3d7f113a9eee8a2c46e30eebdee87ac6576106fe',
        },
        '1': {
          publicKey: 'a25ce1faa4b789289b8caf6ddacf13103fcf55b783d1943c2791a7957e88da21',
        },
        '2147483647': {
          publicKey: '714ee4aab2326bd420dc24273d04f458d426fcbebe4e14f2c3936fd6671fc685',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
