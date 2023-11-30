import type { TestCase } from './types';

export default {
  name: 'passphrase12-2',
  passphrase: '12345y67890ABc4',
  passphraseState: 'mkeNhHFDxRQue8scCqLUgwwomia6FgnR3C',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649/passphrase-12',
  data: [
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
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '3PH6hhUyptejXTSXHGcc16dmUX9S18gSXZ',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qyacuhaf8gj3r8k9q40lpssu68x5fah2vy736c3tcp8xpmsxtzz4nxy07xwejhu5mxtt2h4kctaqy84v2jd3r3eurq0q0euvrg',
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
      method: 'evmGetAddress',
      expectedAddress: '0x4A6529459C5DbFA005B8FdADC42827F1e720289B',
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
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g5l60edcd5glhcw3kr7wpxvrd02xkgn5m49rg7shck',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '16QYFBLmZrgNfPsXNd3KCbtsSeiqsRDvY8Zbue1VUZokXq8W',
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
      method: 'suiGetAddress',
      expectedAddress: '0x6a22fbea097253a6b97457a459b8c4613983d3626f4b1d691d9fcbb591198c19',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TVEUgsmqyU4fBriHe9KSr9Dj6M9eMSTDRm',
    },
  ],
} as TestCase;
