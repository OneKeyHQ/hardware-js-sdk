import type { TestCase } from './types';

export default {
  name: 'passphrase18-3',
  passphrase: '1111111111',
  passphraseState: 'mvQfzqgVRFLTvbuDxqLy9dmErXtfsCba95',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/394297345/passphrase-18',
  data: [
    {
      method: 'algoGetAddress',
      expectedAddress: 'MNSTMOZZGY4WVQABO47VAQU5CPGB34GCK3UAKVFMD5B7LKJKROWWHTBEXI',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0x907fbff9a2d48f42cfa9d53c2e72b11c9bec59ab673909c0afacce6e4570c974',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '3J15EHPWxzUhioHKyPbyDFoocFVkuwnJ68',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qx74tnagtlldcpckk29ddtfqhnh5zm6ytwxrjd4a6yjwse5zdhhngplqg7s6a6ke8a69mgt7jamjucrdnqfrk0gtf5js7wu3qu',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aapkpzdhp8ejmtf32rpfxgkvbajtch2csya14d3gvw',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1z40d57a535mjaxq03gq0xrht6vuufz2sadcq0e',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0x9C6A828fDcdF3CE9E2A73Cd08E75aFAdFd192455',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: 'kaspa:qqqw2ppwncl3xj92zwlfz5kv7ntlhxszzkc6rq9uj6gavzwch5an2jzks79dl',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: '7577574876da6869e1650e797d53b35ab5cad403be31ca7a4afad489d0a0f5dd',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g5v8cc85aqll60udr6rjay84jwt5zx7gd7znwne9x3',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '12ECLjH1WKhn7m1AVJ3fR4oyBYjMniJsQrkYzHDUPhLbEJEj',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'rEU6xNwgF9ZjRrQsTTDkrYcM9wbfBojUzS',
    },
    {
      method: 'solGetAddress',
      expectedAddress: 'C3qeETiK6PfaZGsb9wBnmLFKjwkan3haViDModwCoBDr',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '0x3ecce386f3008b00ea447641010cca3b',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0x8f18b7f1a1e169b6fbb8d14997d7640f5150e23eb97c4355fca9a6dfc9b5b39a',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TGc9gZz1pirj4Mkvdc6VUn5t3oqPkwbYRB',
    },
  ],
} as TestCase;
