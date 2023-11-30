import type { TestCase } from './types';

export default {
  name: 'passphrase12-3',
  passphrase: '11111111',
  passphraseState: 'ms8QNM6uuo3zbo4SM9YqrsxPRGv3b3HmuQ',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649/passphrase-12',
  data: [
    {
      method: 'algoGetAddress',
      expectedAddress: '3IAK33SJQ4FZNXICBKP2I4IBC5DWJH2ZZS36WCKROVCRIWWIHEN2JBBTEU',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0x090657a5f714e2a6984a11fe87a85725ee27eca330ad61395aee2092a7f45d25',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '3HgHMHhh871x6hxcuSGtfmLfyJRxbyyhTr',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qxrwuuccm88c8rlntmfd4f42860a0vvp7m3k3e6e56u75u5ta3csahrwxumct6fupq6z4v3cg6ky477p8gphye3w0k0qns4zgy',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aarjde7bmcehj036bj9h0j005ewcrvymty1d46aym2',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1gcstv0akxdxuajmycg8az3tautn05y296p4n4z',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0xb2e8841e85c5704A809FE7Bf9B7A03CC03c8c08C',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: 'kaspa:qq9mcg8rhx3gn5e2kfsdjccfjeuhajlypapart7zfsypg74vahnnk7sl3c4r7',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: '86d85cf0c5c9304993f5a5138eff05b4483dae69c1be2ca2e426d44cd80ef3f2',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g5u7z4appsd3n97nc5kut29yh52a04mdvf4xn0m7w8',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '1iqYnHQPWvcC2fetJivvurquj5FRZSGGqkKc9cPVqJgtfXH',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'raTsST5mBfx4FZ3xVWcb8bbVp2FjB2EYsq',
    },
    {
      method: 'solGetAddress',
      expectedAddress: '5zghGgs1YfLtWAUNtanLe1evHp5FEgAfYmFNMT8vADAf',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '0xbd4bc3d248e7952af7ca651766293d52',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0x46b7cc10929fb4f63cdfdb00bdb4fc9628f8a0cbbc08f4201adfc076c706b958',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TF2hetHtsw8FgsSEbDdW46VuGvPuVtGTEj',
    },
  ],
} as TestCase;
