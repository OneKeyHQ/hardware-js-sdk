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
          xpub: 'a3b639a234a699c9c5b6de849f4c5216fcb8d0b4865e6daface41ae915f53a9bf0ae111cf6e9f6e354ce1f242bb38d70e2bfe9af9241cb2c8e86900e35bc641d',
        },
        '1': {
          xpub: 'e13986763d5e293c0b6e19e961b50b32eeae4d9f7761e1b69a0271f01d88da04941e5c596df83c0186223efa19e1db623a35be2e96faa3dc56b8655c23597d3e',
        },
        '2147483647': {
          xpub: '8f6e15ce407dacfbe26d453fcb2a093019c5c6119511396fb75993574fc28a432704605fe9dcd7e57434a4c654b6a268f02393827fb889f141514db184a12762',
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
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-test-xpub',
      params: {
        path: "m/44'/1'/$$INDEX$$'",
        coin: 'test',
      },
      result: {
        '0': {
          node: {
            public_key: '03c72683880b2c4d764f178694b8eaad8167aa58aba635a7e50bfc3fff318e7e9d',
          },
          xpub: 'tpubDCUhb8byMtUfBH176odZyUY82qb6byon1s8pCHXNMxbd5xvxzF1cFnLXYRt7WZSm2Qrhsw13TGAnu4pruNGAVR9CKtTV5u46FsNW4pBUGwz',
        },
        '1': {
          node: {
            public_key: '0224ae3f6cc6f459744c424e8156f85ee885a5129ac3cf4d1db37adf5bf612a3e6',
          },
          xpub: 'tpubDCUhb8byMtUfCFGmAZ4mRNCXRTEoPbfMt1pqyFn7cb5B61kQKYQJt4qfeDCr7wCqD7fJzp6Wsd3zuSi3dTqzhHTLkJuYrXZJxmHmvLMWDXW',
        },
        '2147483647': {
          node: {
            public_key: '0385da3b0fe292dff663ad62c4d77976552a3090e4a096658aa2d9b9748b2c0c0b',
          },
          xpub: 'tpubDCUhb8c7hZ1dJiKsttDhJs3fbfKjGsJJN6Dd5ZUKfWEZ5iYRuZwRNSTebq4f4wEWJnCr2j9qk3h9xq8cWaBnUVAhpqoHWLoGPq34DjbRHfN',
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
            public_key: '02b45acfe43d1e99ebea3a351c70869a4dca63c90362de25d3f46c17cc99bcfb10',
          },
          xpub: 'xpub6CAJcF4pivwkxGGmreaMyauyo3MDekni7fwF5S6JSfDxv3jsFxwrADoLEtJLNTR6YHFn4ZHtMS92fV773QzBqsxQQNp8CahhJtPrLcLX9t7',
        },
        '1': {
          node: {
            public_key: '03e714647090a3650a3b75c3a70b27aeaf46a8ee9b03166f5aa0a75a850154ba08',
          },
          xpub: 'xpub6CAJcF4pivwkzxu93XDzcvhfhxGMoj2SHJt9o4sHoHiaD9RrFFjRVrS9zoGHiixWZTEfUJSFivnvzK72KMkoTuLtjPLPMAjMehdgVNEiYVh',
        },
        '2147483647': {
          node: {
            public_key: '03db43e9f6af7cd9e404c6c64748756103ebaf45cb88c0239d35aa3541393bf534',
          },
          xpub: 'xpub6CAJcF4y4bUj6kybzsHpfLaXyuVJGC8c4sW9a9i8zc3cKycTj3KkWYr4cPcr7zrcLdskfbgD91NLhxuYWJF6JtvzpqcKhA1JThdH2u6Ducc',
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
            public_key: '03171e183c84c8362a7dbbcaa5184cf7be930bed09b063bb1566024526a7c28d50',
          },
          xpub: 'ypub6XhX8sBSGDBVJVrPV89KS74UJ8CvXmYF7zcmQDatN9BKNUuMZmZxYN1cGWA9QWEP1ijniP3Z3qpXooiu5FJZEziZZuCNZeqheav2UyoEsaG',
        },
        '1': {
          node: {
            public_key: '03a8de2f0ade3f5466125ddab1269023dfce6bbe4b35677f8d3c472fc6e658b281',
          },
          xpub: 'ypub6XhX8sBSGDBVJf2bMVX9PnqQWgNYfkv6seHURRcDUDP4Uwjyhch4q49cwSo8CXEMPbns8mjthHmjt487izf5RLEhRDZxfo1UfaSt5bDHGd1',
        },
        '2147483647': {
          node: {
            public_key: '03834ed316bcaebeb20f9233f41a147767b70be3c49cb5dd36ce059b7f471a147a',
          },
          xpub: 'ypub6XhX8sBabsiTRknbsTkWkpAzWk4b4WrZUePSKASWkvHwgJuyZJiMW3VN9VE5gb7N3df3qCafmjZTEtNNaiQXpvjSZJfwX8JaiSGghzDAkXu',
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
            public_key: '03a8b2648ac8129420c5be1e13bf655f8e9ce89d1007868e145f91c72ee648a8b9',
          },
          xpub: 'zpub6r43xSoGaVYZipq7AVxdvEMfAPk8nJ2VzCx9K8kXGSqipsY6RMZ8RtsudFSewqZkM738GpxAXGiqrUNt1zUooeTHV8HAtGCRtUqjWudeeVb',
        },
        '1': {
          node: {
            public_key: '032b7de16e696197dda6acd8a04d12962bf8f27af08b7bf2a91560299234b1a49a',
          },
          xpub: 'zpub6r43xSoGaVYZmHvQgdifsD4HHpzhwGMufiojtz3vjQSNnX1979YE8gtc3gJUQaNmS1VugRZxsSwj6dNvwNs8X5mzxGiiFXm4kBAY8w8xhzN',
        },
        '2147483647': {
          node: {
            public_key: '0255247f815606e0ce44b802d1ef685e8186c9357ec2e3d688e8abdf1a09bd601e',
          },
          xpub: 'zpub6r43xSoQvA5XrhaPwAsLRxcuEL7wWguGCHWD5QF6Ry9ZSLmSMiCAPx5SNbXou3fy1AshPU9EmjSFFCgbkjB3bHLoEe4qAWv7mUrDinUz8r6',
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
            public_key: '026403cdc417eb4cc09e776c4e11d12afdb76ecb0dd19937fd8cbddaaa8ba93571',
          },
          xpub: 'xpub6DBdmWLrAFhPTXp5DPSkhaBNbGVvddFLF2RMr6uCp5xyYvAVTSnRfCi5GzFG2XRz6kdCwrghVr4gvPYPCe3LGV7jS633C6TAEbtCQ73umHx',
        },
        '1': {
          node: {
            public_key: '036f2e3bcf5059c4a72e1e1ffd7ae0ff43dae8c9df233f52fa470f13b35272b73b',
          },
          xpub: 'xpub6DBdmWLrAFhPWuK293kZP3Nys7BFAFinjovUAr8f9dtzaG5CgKs61sDJTMwTG2wHFg5a4NfT8jLAKUuWSYtq76cXFYcg2pM3HWE9uj7Ew2c',
        },
        '2147483647': {
          node: {
            public_key: '03f949166b74a591b54df02b945c04493d99df62a7f2362559db75c62c9adf1ec1',
          },
          xpub: 'xpub6DBdmWLzVvEMbjAoVCaEbUW8Pjym1rBVAy6Pr3m47mFwz8qkP1673n4GYoeaYp8DWouQa1T7qMw6b9NUQzMcJdcgsQUBz1PhBWK41Cevzn5',
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
            public_key: '0265a27ac2fed8af67d28d1b0d7efd5208e79cf49e81412af7a6a97cfc45796825',
          },
          xpub: 'Ltub2ZJmvdZYt2TX7Bi3hzMuERWhR4PpBvGQoh6i46UYCNZksbp2r3jnFNzNbHDkJtb2xT7x9bbP3K55jhah3LPamKhdTvRHE4MoTNwhmA2gLbv',
        },
        '1': {
          node: {
            public_key: '02d090db1ca9b2b6cea700d36e1eeba22fdd95f2a5fde1b82e2707e076e5c0f83a',
          },
          xpub: 'Ltub2ZJmvdZYt2TX9B1891RcESBp4XBHYkXJPw3MLBFdyS2qTmZfbgouCCgVu2jryY3MP5kCaqeKZNezTMq1fDJt6PRYTdGVdSZ1A3gup2ikXcj',
        },
        '2147483647': {
          node: {
            public_key: '0205a56c1f81d518103331349e74505fb630504eec23aafd0b22fbdbb924d2a3fd',
          },
          xpub: 'Ltub2ZJmvdZhDgzVGHAZWoGCUwomsm51NkAyzksxu6wezDR2xcLpmAP1xvPRtweNvduunuoQRCM5NsN1dcNfg9vMUUwqTEymc2XU1xw6emtZPZN',
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
            public_key: '02aaaae2c2d42311c9ad6f500271afcff0f867a5cc6e75392bad62548ec77a7c78',
          },
          xpub: 'Mtub2tnMT6QUHZSdj6MKPmtsYhYWyGLWfTW4Y7pEKnr7393VrehnXyvhCJV1hWoK6uFBVqb1czGCGT5SkFvawEm2QopAJEdw7Hf5VDQUMcGeEU7',
        },
        '1': {
          node: {
            public_key: '02bc0e4eeee7ef7ecabdfb50e8a9dd5514c5a05610fd9e04f2be73dbbcb3dfb580',
          },
          xpub: 'Mtub2tnMT6QUHZSdkFwhbT2ZLQHnhoetP7inK76FCPhTef5db6hHe1E4LxbdDyUh5Ti8SUq1vz7kKBNEED6VFMo16V5iiL2obELz3AGRqeQLVjD',
        },
        '2147483647': {
          node: {
            public_key: '030d178a2bea643618027d206b561cdaa8d88803d51abc6069ae4479fd5536d524',
          },
          xpub: 'Mtub2tnMT6QcdDybprRnfDyewPPckMcskZsXtqKf3Zd3t5pHihPrPhab8TyA1yQyZDhV59121Gk2cpvaWU2xQbcxfpWD6jcSHxHEqEjofu4hj3Q',
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
            public_key: '020462f25654805d2e00c027b75c6942833680f1c4032efc1fbc492a5583ae5e07',
          },
          xpub: 'zpub6qLZEXYTcYgjZnzvpgT8DdG73yCKAR45BzXnyQyg7mQaSXhHxZTVn3etD78scX6r93ta2VH5nL7FiQWPEy3q3zub97hAxTjxvrGxPLgfWxC',
        },
        '1': {
          node: {
            public_key: '02e1734f6f6dfbb76c53249b41941e6f35c5936deae78e5b04569fd1af72480e9d',
          },
          xpub: 'zpub6qLZEXYTcYgjcEM8XPamkDMiaHioxoM1nRSuNnrHWNNyzsJzVWqLiRsqHMrnrHKmkXvEWPjrEffVg7XNm1WcCrKmoMBNPrCRQA2kbVhe7Je',
        },
        '2147483647': {
          node: {
            public_key: '03d4fe37d2e96964d8feed0610b012c8dfe145fd3267eebd308c4654d8ff027b08',
          },
          xpub: 'zpub6qLZEXYbxDDhgK5gG56FiEntDsXCJMcPRtyah8PJhSkGmnSyYFj6HcRtVsXE841FpRkeDANA7NWqfG7btoD8hKVsCAiVA9v3t2RHQTDXq7j',
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
            public_key: '0232bf78b1b9ea224aead150aee4c5c49605034637fbfe89b476f88bf158fcb4a4',
          },
          xpub: 'dgub8s7nxeLthRrRwRPiSERBEeLhmpRhq31ZQcULCrcvTeKt3RsU1tt19jkWPcgo5EGp6VUzDRYFScpnFPsRxUKKTvess36uqqH63uwhGX9NW93',
        },
        '1': {
          node: {
            public_key: '03c16e5a1a53ca27ff59fd80f01515ba192dc4967a1ee960a482d977a82be285c3',
          },
          xpub: 'dgub8s7nxeLthRrRzNz45oJb8R2W1kAnALLoytjCSPHmFUzGwGiR8hJjkfRyJrZw4c7hCFUAT3tkZARxF4fZkGBDNLC68e4GWKUmkfm6qKKdE8j',
        },
        '2147483647': {
          node: {
            public_key: '03d8f70aa01b43613f5ccba94b87ca01d5f0342f1d7e4ac99f3642947149dff4f6',
          },
          xpub: 'dgub8s7nxeM336PQ6Lxad1bLRKevtuYYXqb8uzbFhBDMVgBF5Q2pcHBzsgZGVtyza5TmiWParyQYy4CiFaD4jhghSKD5ywJ76mHjDHdGuUBWMtm',
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
            public_key: '024e0b678031961188eaf5021a3c6d0be5e8803106c50ee9078e8be9890465873e',
          },
          xpub: 'dgub8sd9DHsdPUUciH8d46rRLwjs6ybgv6oM2mhFD8YChEnjvpsXkLkwSeqY5aDwfAhRhaak5nKcntEzxC6Kp4qLRvyCWU5K5oenso7bnAMxhpq',
        },
        '1': {
          node: {
            public_key: '032f78cb3fe2025920b1341fb4c6808b99617c75180a9b787b058a84259b95ad4f',
          },
          xpub: 'dgub8sd9DHsdPUUcmEL7JKgN6DiZhMdcDXQc5Dwc78tgnHq42VTVEWuGbJo1NHw3FwiG5gYjhZ9z5K29CdMVf8Jhs5DdKZgqRtVAUQagC4QZubK',
        },
        '2147483647': {
          node: {
            public_key: '02cf7070847e3ff822213131f400b11369759fdc3512f92099a916185d9ed42a04',
          },
          xpub: 'dgub8sd9DHsmj91arhGs4R9jJNMWNvR39ejodKJTK3f9dp6t5Ju2H7EG4pxyzz1nJevikXvoQepToVqVrxZWDLevejuAMzcjrBXYufjMBxH3rsf',
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
