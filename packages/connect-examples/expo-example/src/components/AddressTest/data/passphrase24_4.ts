import type { TestCase } from './types';

export default {
  name: 'passphrase24-4',
  passphrase: '110*4fHKZnm7@^',
  passphraseState: 'n2NMoDFVJGpXjTDVXCy7Qu7e6YszjuGacu',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/394297355/passphrase-24',
  data: [
    {
      method: 'algoGetAddress',
      expectedAddress: 'GOTZYJYBSFWKL3BDRBLHDFKQXRULYGFBSPLEODPPOYGQIUKHYIWBTFQ5XU',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0x6a955493013fe2bf3900260f24477cc66f2304fac0394f8d568cae6afd33d114',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '3Nwf7B1bSjcKz7soGDPW6STQmnebyPPKwR',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qymyswnkd8m305yd6xtp3w6fmxrxu09yynz0u800tn46j6v5cdne5dscqpy2ely6j0twfmvxjp86t6jprpp2e0q6cwssl3v63e',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aanwkzb0rhs7s667g41zyfrpdecea6c6pef8rr1d23',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1fd3zpq3dwqyh43c2mj2kzmv75cr7ltk79v5sqe',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0xd17CBA319F704054e10640f0aCab35D8b4eA5f53',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: 'kaspa:qzyg3wjzggvd6m4vvw9g3y287ydezxmfslnkrtec9hmfcpaffpvvgsmacqzx0',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: '009cb01757ea75e4e721799e52e6ae274dd70d4687e77492840c49ec030e1fa9',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g57t02n54p942ze3whn842vfw6tzznn8aeqv70t4r3',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '135gMxX3ixZy7e8TRgXfuDFSaUZxR1jt1GGiALcwFiNwpL6N',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'r9hBimJmyijpJokPo5Xz6QKrax5vrNb2uq',
    },
    {
      method: 'solGetAddress',
      expectedAddress: 'CWJuh4diwhohFArpUSPzY9vbCWfo2vqfgUPv7LbS2gqY',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '0xa2452b7b5c2613b47ec45a2dd86d17a9',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0x0a21b0b41d5bd6525c15ddec0d317bef9f113fba4f8d17c86ae00517ee9e153a',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TNSjas4AGT7GEdbUmSDy9akoRzVuGbr4G9',
    },
  ],
} as TestCase;
