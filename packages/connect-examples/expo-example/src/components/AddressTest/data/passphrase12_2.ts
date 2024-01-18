import type { TestCase } from './types';

export default {
  name: 'passphrase12-2',
  passphrase: '12345y67890ABc4',
  passphraseState: 'mkeNhHFDxRQue8scCqLUgwwomia6FgnR3C',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649/passphrase-12',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qyacuhaf8gj3r8k9q40lpssu68x5fah2vy736c3tcp8xpmsxtzz4nxy07xwejhu5mxtt2h4kctaqy84v2jd3r3eurq0q0euvrg',
    },
    {
      method: 'algoGetAddress',
      expectedAddress: '4OBITAH4EW26X35F5QD5MMFEKPL27JQIMT6BNVN6TA5N5W5PWFSKXRVKYY',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0x0cdf7825c41c2792b2fe632eb7aeec8d575a6f5950607bb9bb4174d7d4e587ac',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/0'/0'/0/0",
      },
      expectedAddress: '1C8g2V138h5TWoMmd9MNG8eCJWE11f1VqA',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '3PH6hhUyptejXTSXHGcc16dmUX9S18gSXZ',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/84'/0'/0'/0/0",
      },
      expectedAddress: 'bc1q2v8gvytgnxd4znh8ce6tcr8j5mym6st8r9yd62',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/86'/0'/0'/0/0",
      },
      expectedAddress: 'bc1p8glk605ezz24732hzwkty0ces6tx6kdrpp7cw5xm46l27mj2fcds3kq3v5',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/3'/0'/0/0",
        coin: 'doge',
      },
      expectedAddress: 'DEuTEdcuB7Vdk5NU8AjyfvxbCvjk7YV5ac',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/145'/0'/0/0",
        coin: 'bch',
      },
      expectedAddress: 'bitcoincash:qp6z4xelgpc5f3mvmd3hw6f6unhafaz44vu5n5u7ym',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'LaeJ3v89rdAG21eUf1458iZjBrHNaRCbYo',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'MRfHJ8R7GCZYQTm93nsUoXDj5BpWTJ8cwP',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/84'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'ltc1q6s93d5pxugev2yx5tee9a22lfkdhzk64p4swhj',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aan7tg66xvuwmsx4ku5vzcr0eymmzgrrhem8yckya3',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1ntfu3mx70pjgldq82g3zn2l4g2anltm8ugge9m',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'akash',
      },
      expectedAddress: 'akash1ntfu3mx70pjgldq82g3zn2l4g2anltm83n97up',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'cro',
      },
      expectedAddress: 'cro1ntfu3mx70pjgldq82g3zn2l4g2anltm8ynqqe2',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: 'fetch1ntfu3mx70pjgldq82g3zn2l4g2anltm804pa8v',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: 'osmo1ntfu3mx70pjgldq82g3zn2l4g2anltm85nmfnf',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'juno',
      },
      expectedAddress: 'juno1ntfu3mx70pjgldq82g3zn2l4g2anltm826tzz8',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'terra',
      },
      expectedAddress: 'terra1ntfu3mx70pjgldq82g3zn2l4g2anltm86vje8m',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'secret',
      },
      expectedAddress: 'secret1ntfu3mx70pjgldq82g3zn2l4g2anltm87dusc8',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: 'celestia1ntfu3mx70pjgldq82g3zn2l4g2anltm8dzeflk',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0x4A6529459C5DbFA005B8FdADC42827F1e720289B',
    },
    {
      method: 'evmGetAddress',
      params: {
        path: "m/44'/61'/0'/0/0",
      },
      expectedAddress: '0x2dDe3EfB5B6252A9D6E6683beBFd2cD6cCC98038',
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: 'f1jxqqtttk4pkzt46cpjfo2sqauju375x4pdoimhi',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: 'kaspa:qz6z9s2myh9c2tcwdyhe5vdkadd8pfp6n8vgxngtv48ql5atle8r632z624e4',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: '077c5138cd63408a5b531f9253b4a855f6482c752cd46ce0300355a57bc4c3f1',
    },
    {
      method: 'nemGetAddress',
      expectedAddress: 'NC3IG7SPMDB32FCUEUNHIHKSRLYSEH6LYTPW27SM',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g5l60edcd5glhcw3kr7wpxvrd02xkgn5m49rg7shck',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '16QYFBLmZrgNfPsXNd3KCbtsSeiqsRDvY8Zbue1VUZokXq8W',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '5',
        network: 'astar',
      },
      expectedAddress: 'bLqY93nVK41SgtquHSS67Dzg5SK9LNXUqLFz4DznqnBwjtw',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '2',
        network: 'kusama',
      },
      expectedAddress: 'HyrmARaLSRpyWgTBgoMxQRijd1RynUxv1fs91J6QGzj6bad',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '126',
        network: 'joystream',
      },
      expectedAddress: 'j4Wj9ftKfanuw4UJkgxRzubmi7Qomg1ExBaTZ7u4TMYvs12e8',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'rBCWoFT67Qaia7ghMgBWj89TAP2BbbkMWC',
    },
    {
      method: 'solGetAddress',
      expectedAddress: 'GLym9ZWPiP4a2pZorViKMJNfTMxixUNHSXLtZKxwpbGb',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '0xda390604d544250b32ded8b153d7a776',
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: 'GD5CF5AQZSFTJKMB557BMQMR4U2G5CAO7GIDYTFFTSDMXEVVPCNDW5QB',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0x6a22fbea097253a6b97457a459b8c4613983d3626f4b1d691d9fcbb591198c19',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TVEUgsmqyU4fBriHe9KSr9Dj6M9eMSTDRm',
    },
  ],
} as TestCase;
