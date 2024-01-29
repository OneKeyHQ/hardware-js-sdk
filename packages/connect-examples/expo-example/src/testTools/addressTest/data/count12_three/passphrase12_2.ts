import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'three-passphrase12-密语2',
  passphrase: '12345y67890ABc4',
  passphraseState: 'mkeNhHFDxRQue8scCqLUgwwomia6FgnR3C',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        0: 'addr1qyacuhaf8gj3r8k9q40lpssu68x5fah2vy736c3tcp8xpmsxtzz4nxy07xwejhu5mxtt2h4kctaqy84v2jd3r3eurq0q0euvrg',
        1: 'addr1qy996zvr30g0gcsxjcvatkq54z5wykg083xdraftu96t895r7dtn4chajshq3hk2hwtmpkgghhud3ge765m2nvrqrdwq56s5tu',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        0: '4OBITAH4EW26X35F5QD5MMFEKPL27JQIMT6BNVN6TA5N5W5PWFSKXRVKYY',
        1: '67MFL7PWMUPGRL4DGWVN3NAM2TMDH3FZ52KEBYGM3SAN5HMQ3GMGKFT3AQ',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        0: '0x0cdf7825c41c2792b2fe632eb7aeec8d575a6f5950607bb9bb4174d7d4e587ac',
        1: '0xef0e65579320a84661dc613aff7a628ddee1eaa6a1c8eaf56adafa814947bd16',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: `m/44'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '1C8g2V138h5TWoMmd9MNG8eCJWE11f1VqA',
        1: '1FHJ9TGTFgaaNNXXSFAiXThTPKZxBNWHNG',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: `m/49'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '3PH6hhUyptejXTSXHGcc16dmUX9S18gSXZ',
        1: '34MrkmoBR8PN9kXqECPfBUxbRvCS9jD2cF',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: `m/84'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: 'bc1q2v8gvytgnxd4znh8ce6tcr8j5mym6st8r9yd62',
        1: 'bc1qe7tnn53hdr24scyaa78z49sgy0gj3ye9uu8l2d',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: `m/86'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: 'bc1p8glk605ezz24732hzwkty0ces6tx6kdrpp7cw5xm46l27mj2fcds3kq3v5',
        1: 'bc1pj028k57jjw8rng88we9en96yakml9wrmpnnyaaccz483ag8m85kqf52rah',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Doge',
      params: {
        path: `m/44'/3'/${INDEX_MARK}'/0/0`,
        coin: 'doge',
      },
      expectedAddress: {
        0: 'DEuTEdcuB7Vdk5NU8AjyfvxbCvjk7YV5ac',
        1: 'DTMrmsucCd8cPKm8AXdNmSz9791EHDShwN',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-BCH',
      params: {
        path: `m/44'/145'/${INDEX_MARK}'/0/0`,
        coin: 'bch',
      },
      expectedAddress: {
        0: 'bitcoincash:qp6z4xelgpc5f3mvmd3hw6f6unhafaz44vu5n5u7ym',
        1: 'bitcoincash:qp4k3z9ftznjhqx7slpj5m30fhx85rmdsqzlxpv8zd',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Legacy',
      params: {
        path: `m/44'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'LaeJ3v89rdAG21eUf1458iZjBrHNaRCbYo',
        1: 'Lhn2k8Jca2iWNpGfwKgG15o2UqpYbGV8ns',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: `m/49'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'MRfHJ8R7GCZYQTm93nsUoXDj5BpWTJ8cwP',
        1: 'MNkMHGaP29PAvDwPBNbtgGvEQ9NCoQHsER',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: `m/84'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'ltc1q6s93d5pxugev2yx5tee9a22lfkdhzk64p4swhj',
        1: 'ltc1q5rmhtjjk33pea7cpfze63dmzuy6z0egszzqyra',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        0: 'cfx:aan7tg66xvuwmsx4ku5vzcr0eymmzgrrhem8yckya3',
        1: 'cfx:aak1uxk3kj2juvct6kr91vs5jnftgmy91p2yggk0jc',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        0: 'cosmos1ntfu3mx70pjgldq82g3zn2l4g2anltm8ugge9m',
        1: 'cosmos1h0h20svsrshr8sxd6tfechqqz0rysumxcn8qrn',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        0: 'akash1ntfu3mx70pjgldq82g3zn2l4g2anltm83n97up',
        1: 'akash1h0h20svsrshr8sxd6tfechqqz0rysumx4g286f',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        0: 'cro1ntfu3mx70pjgldq82g3zn2l4g2anltm8ynqqe2',
        1: 'cro1h0h20svsrshr8sxd6tfechqqz0rysumxqg0elz',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        0: 'fetch1ntfu3mx70pjgldq82g3zn2l4g2anltm804pa8v',
        1: 'fetch1h0h20svsrshr8sxd6tfechqqz0rysumxtwwypy',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        0: 'osmo1ntfu3mx70pjgldq82g3zn2l4g2anltm85nmfnf',
        1: 'osmo1h0h20svsrshr8sxd6tfechqqz0rysumxsg5s4p',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        0: 'juno1ntfu3mx70pjgldq82g3zn2l4g2anltm826tzz8',
        1: 'juno1h0h20svsrshr8sxd6tfechqqz0rysumxwpymy0',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        0: 'terra1ntfu3mx70pjgldq82g3zn2l4g2anltm86vje8m',
        1: 'terra1h0h20svsrshr8sxd6tfechqqz0rysumx7haqpn',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        0: 'secret1ntfu3mx70pjgldq82g3zn2l4g2anltm87dusc8',
        1: 'secret1h0h20svsrshr8sxd6tfechqqz0rysumx6knf70',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        0: 'celestia1ntfu3mx70pjgldq82g3zn2l4g2anltm8dzeflk',
        1: 'celestia1h0h20svsrshr8sxd6tfechqqz0rysumxfekse7',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        0: '0x4A6529459C5DbFA005B8FdADC42827F1e720289B',
        1: '0x6F932e876Fe9d0c39b0C66bCeE8B79246b79851C',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: `m/44'/60'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '0x4A6529459C5DbFA005B8FdADC42827F1e720289B',
        1: '0x2849a86a8034255Cc8B821cBeEaE729eCb9447be',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: `m/44'/61'/0'/0/${INDEX_MARK}`,
      },
      expectedAddress: {
        0: '0x2dDe3EfB5B6252A9D6E6683beBFd2cD6cCC98038',
        1: '0x6bCb185CD4Ff6016D792F5aF9833939ab4C5e1BB',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        0: 'f1jxqqtttk4pkzt46cpjfo2sqauju375x4pdoimhi',
        1: 'f1j5gryc55fmwifun23rsslavds4ewq2xwdvzhtei',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        0: 'kaspa:qz6z9s2myh9c2tcwdyhe5vdkadd8pfp6n8vgxngtv48ql5atle8r632z624e4',
        1: 'kaspa:qq3zwxje6u2a4lz5d605y6w449zq37nvttdwhzxt84xd84qm75kf5ejlnqkm3',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        0: '077c5138cd63408a5b531f9253b4a855f6482c752cd46ce0300355a57bc4c3f1',
        1: '25ec4d53b4ca0d34483f5fade42d94fa105b9b4a56cdd1576e00f2a1b6e1e9cb',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        0: 'NC3IG7SPMDB32FCUEUNHIHKSRLYSEH6LYTPW27SM',
        1: 'NCA4QVH2PZV7GSX4N3OIGO657GBHBULQYUMQNG3M',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        0: 'nexa:nqtsq5g5l60edcd5glhcw3kr7wpxvrd02xkgn5m49rg7shck',
        1: 'nexa:nqtsq5g59p6ckjxa638030luntjdgdw403d6dzf6rdstqwuw',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        0: '16QYFBLmZrgNfPsXNd3KCbtsSeiqsRDvY8Zbue1VUZokXq8W',
        1: '13qJ3fMUATKxrM7N4iZxDXTVEDdXfXtsqqUeth9dyYEzj9Ft',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-astar',
      params: {
        prefix: '5',
        network: 'astar',
      },
      expectedAddress: {
        0: 'bLqY93nVK41SgtquHSS67Dzg5SK9LNXUqLFz4DznqnBwjtw',
        1: 'YmbLd4V5uhbde8gbNy572ncTeLzwT3UnYFJy7N9HpDS8mZG',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-kusama',
      params: {
        prefix: '2',
        network: 'kusama',
      },
      expectedAddress: {
        0: 'HyrmARaLSRpyWgTBgoMxQRijd1RynUxv1fs91J6QGzj6bad',
        1: 'FQcZeSGw35RATvHsnKzyKzLXBv7mu9vDiav84SEuFRyHnyC',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-joystream',
      params: {
        prefix: '126',
        network: 'joystream',
      },
      expectedAddress: {
        0: 'j4Wj9ftKfanuw4UJkgxRzubmi7Qomg1ExBaTZ7u4TMYvs12e8',
        1: 'j4U9uUNLNBPZXFRYbP3xdvXLKtyiTU7uuVHNc6xCbrXN7C3cR',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        0: 'rBCWoFT67Qaia7ghMgBWj89TAP2BbbkMWC',
        1: 'r44AFDjUUqmLJwt5xasKtzaQreVdz6CFF5',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        0: 'GLym9ZWPiP4a2pZorViKMJNfTMxixUNHSXLtZKxwpbGb',
        1: '3GU7EqPte2QJJYpanU8K2qKuXuitzumZ4SU1Hwzzei8U',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        0: '0xda390604d544250b32ded8b153d7a776',
        1: '0x62b08bdb3086294920be4966e9fffdf3',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        0: 'GD5CF5AQZSFTJKMB557BMQMR4U2G5CAO7GIDYTFFTSDMXEVVPCNDW5QB',
        1: 'GDQJ6XH7CF4WA4FEYNTIGP3JJNICMP2UWRNK4EL2ZUT6YTIPILBYVUHU',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        0: '0x6a22fbea097253a6b97457a459b8c4613983d3626f4b1d691d9fcbb591198c19',
        1: '0x410786190508085521fa239da5d4763c2953edd8476a40580333e0ab61df42bf',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        0: 'TVEUgsmqyU4fBriHe9KSr9Dj6M9eMSTDRm',
        1: 'TGhsk6YXzi9tnoLGqb4z8XAyaRq566izi3',
      },
    },
  ],
} as AddressTestCaseData;
