import type { TestCase } from './types';

export default {
  name: 'passphrase24-3',
  passphrase: "ADxvB0383*3*%^%~./,';L",
  passphraseState: 'n1Kg8udanaFFE48Y8im6GmgCSzSUmGHxV4',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/394297355/passphrase-24',
  data: [
    {
      method: 'algoGetAddress',
      expectedAddress: 'DW6ZSEO3BYTPGFGWLAWIWK5CHHS74XMDIDK4C4WC6NZ7EHPN5HBMU2ILGA',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0x2381cf671ac742b5459abf1b4d5b54e09bfd3b050b99a3a379de3479c2a5733a',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '3EXCE7hMQTxS67QXhukEcruGBWStrga89L',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1q840pns0w6rmpe2h4lh8tltx7tt7cayzk9ymnm8w4v6gqk7r5pepx5ryse9gs42hytmschdjmv0qsrv4rs8lllysqccqxfx2zk',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aam9b3vpzvj0v6hhrfnd214gfesvk8dbv2d8jnj2xx',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1frk93uca7jadua23au8mfqfhhez2nt565mg75k',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0xf80A597559eE9c6b03aED9c3774554f10E468898',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: 'kaspa:qqz98vv7rkl00vmss76mcn45t62zjnd2xpr67xf9xnhtr0dez3qs5t0tk8mkr',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: 'efcdf7b580f627e1215e08855855f092f835c5ce83098fefa12ee8f0b6406044',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g58dlygh5excmtxp2w6q33xlfpdkg6muthulw2w94f',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '1CvTcEz5oaUTQqC2S57LvsBegkEjh2BqoRqWjixyZhxq2bS',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'rNohzjkx1ZuMoV9J9DSUWSvskp8rKG5cUF',
    },
    {
      method: 'solGetAddress',
      expectedAddress: 'Fhh3QwnzYg3npyBkpD1Li1GYKJH9yRj9Lp5MsX8emfEH',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '0xb76507bcb761ea6946e71b7fc229d94e',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0x110760c5e1b016330ee3bd809fe07e7ade05a6f6b0c0aca8e89779d5e52ef6b0',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TWVsCKw4fB59qdf1pUUKU3gCrkf6nNy5xr',
    },
  ],
} as TestCase;
