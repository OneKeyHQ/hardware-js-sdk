import type { PubkeyTestCaseData } from '../../data/types';

export default {
  name: 'two-passphrase24-empty',
  passphrase: '',
  passphraseState: 'n2XDwPTRoTrLUxu25L6XDnyDBuDeXhjmoz',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490457',
  data: [
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub',
      params: {
        path: "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$",
        coin: 'btc',
      },
      result: {
        '0/C1/A200': {
          node: {
            public_key: '026694ff1c77e10b13233ae1cf7fad026efdadc7eaf140991e1d2c9767ac95a1d9',
          },
          xpub: 'xpub6G959p38Rr7TGDG64quMnZGCaCc8VMyH5hwpE7zJbycjN6SPK3Sha4cgK4VpATWUsjKKEZUVTYi4un3qRwAaHUYzjXrdGuxUp4NQCsgeqHE',
        },
        '100/C0/A200': {
          node: {
            public_key: '034642358a528ec2bf9ee225059eae134af13bed134a43b36aea2926a485d8e3bf',
          },
          xpub: 'xpub6G8xQSmgo6C1fjCMf2CRoDpE4e246bkvaKYmo2T6MVEnKt15hckuXXpJnueNDcw9WXmsZZBm5Dkn4TbZy4vayyDYXuaWcfUgxBHswN6b4Am',
        },
        '2147483647/C1/A200': {
          node: {
            public_key: '038bd2cc6b985544b0739398b7ec6fa2d5a73b3a6bc298aa7c67b4346bf1935d88',
          },
          xpub: 'xpub6H5x9VHZoogPvTqLVSKAgjP7pp6iKRmiRvbxm54UuccokAY8pBaUnEJvFviTEEWjVJPmRMrHNqWqRDL92qCBBXX5i6xYc16kAVyEbhRoeZq',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
