import type { TestCase } from './types';

export default {
  name: 'passphrase18-1',
  passphrase: 'fhsdkhf^&%#4366ghhj<<>>$$$',
  passphraseState: 'mkXCUesRyVY1hZCemmXxGqEne6Jc7u9LbY',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/394297345/passphrase-18',
  data: [
    {
      method: 'algoGetAddress',
      expectedAddress: 'BCYQOVCEJX3DIYHVLNKGQ7Y6PFTAEOGJCSA3GHGV4NKI7OSUOKLO2EEQCA',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0xa15f15b47dbb2dd0f1f2ef66fdc4ee3b7ba49724124a24462101c83ebbc9bcdd',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '3JpbbRQJUnJX3rUxurNo7U87kdZkCKXNQ2',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qyd2h62unwxgq7mdymq0xhh527yh4vpen59lanwy9l606zenfp5atx578pc4hufgmstq4p922mckv777nu8lwnkkcjmqltjjxy',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aaseu43u6fxtj0ut37evrysyfbaa172tz60dzx9d9w',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1sy7tcq4nnnf9naxzg8fysg2cyumlxwwgr82vkj',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0x570959B3553927DCd0Ce93D5b0D9b99Cd1542EF0',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: 'kaspa:qpd5hrfac9v37xxsg37g3kcdddaangaf4hesanvv9f2hnuftemw9vx04dc52c',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: 'e0d6b78740262aa704f507cfc33dc1131256cd5355460ff52a6a2fe9a949ea55',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g5cet2qn2x40gu552rra356qgt2duzmqpxv57kd9we',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '15qYhNQ88zziabtRG1P9G8ctX7N5o7ZPYdTsaLsPVpkHnQDK',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'rLuE79ZERXu5eQNSgRm7KkQ1gTdFV5YCcs',
    },
    {
      method: 'solGetAddress',
      expectedAddress: '5iinGEhrwhw3o4Hi7BdLzrKMsMhuxfi6WQcDLk2BEJTx',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '0x8096a9555942b6525c2abe9d4cec7105',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0x6fbe51414abaeeabdf227a2f93c9db89605aa1a6585268fd06f164859172d4fa',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TN5feHMrq2RbdpGoSL4Tc5VYnGxwBdpJSv',
    },
  ],
} as TestCase;
