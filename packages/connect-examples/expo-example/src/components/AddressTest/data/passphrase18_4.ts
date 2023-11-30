import type { TestCase } from './types';

export default {
  name: 'passphrase18-4',
  passphrase: 'hhhopopuuuKKllY',
  passphraseState: 'mfnExSMFHZnn29pgLrakRimPJU5MgpjMS7',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/394297345/passphrase-18',
  data: [
    {
      method: 'algoGetAddress',
      expectedAddress: 'XF5PYJONYTZ6O3J6PGRBWFJ5333JEVN7K7P474R7T7OGIBG5LUNIDNO5KM',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0xdad119026e421d1a9f0b25c6e6f59d4167aa9bac38dae99d95d368c636027876',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '37uN5tEmB6P8bSZJzskksmNGsPeqFQE9qG',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qx3ulfr42chfa2er55u7z6q9r33mk27hpwv8vxmve9tc9zpxj39q5zqclahavudsq40zl8qa4kfs3egjvkfgzjgfw7csxmaadd',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aannunsr0pzjp5e539pa78exu9kt6jm5z6sdgpv7dz',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1nz6ueq9tj2cgj2ppz5hvy23j8qg0hf2g5yvq2y',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0xd7DF1eD6c4A3944746976CB3ff6AdcF7968c8883',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: 'kaspa:qqg7rd4sdawcsczy6xez20dgml0dgq0qpexqneeu8d4pzpfw5l3t6eh8l5n4j',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: 'bad8749880d12bfd64b23a77b6dc9092ff861a0cf9e0d8171d7be9377bea6b2d',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g50d574l8gannkyj8za0cr0pklsye7c2yg3pr5cxg0',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '12BhN7ErWi1kH4maGh9putnRpESWT9ojp6yMtoaQiC8F4G5z',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'r91m4v3kd9wkyxq5nSKjqSDLxGpybu3BGh',
    },
    {
      method: 'solGetAddress',
      expectedAddress: '5X2fQYa7s5DSKqxBEMiD2dVUMk3dMaU83sfUzR1DmoqY',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '0x124f6dd879d4ea171766bf8be8a3463c',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0xf9ea13c6cb9c5f7c1b56e858e95275dcee4a23ede83bd2f827754dd33b17884a',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TXdSxWpnaX2qWQzhmqNxDjZrZH6TAkFBry',
    },
  ],
} as TestCase;
