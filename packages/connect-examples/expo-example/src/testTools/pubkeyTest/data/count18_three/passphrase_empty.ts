import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase18-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428736640',
  passphrase: '',
  passphraseState: 'n2BKLUzeWAiE1WTVWoLgshKW3sqdiaECWE',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            'cbc72dcd81f7e4fa6e467d99b61621ec00036581f33656b2fac0f9062766f6239177af3e13a9c3f1f14384575d25215ab28e1859b6e88f1b98c567ef949eeb85',
        },
        '1': {
          publicKey:
            'b12ccf631c4b924047ff021c50c5f259e3438665e112c660be72ec15871ab5b9c79b5f9bd46a118f0e6fe6d7c027cc66ccc9bc72e94b235c57e5d4760b80abe4',
        },
        '2147483647': {
          publicKey:
            '08867a5a074f44eab0d29554312b0a554a06b267385ff7c37f8e80c1ba86e978c893d31f42ef950ba49cf28cd5991d9229d2e54f45bcba3ddf8abb8ada8348ad',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'cd6bbb7a853f591913d0fd63baf8f1422c50c2bf45dd734ad15cad76f3e56342',
        },
        '1': {
          publicKey: '679ad5c2333a90b50c60010f469262cd7b80f50544837f730266e40ce2e1cdd3',
        },
        '2147483647': {
          publicKey: '022eaf6358ea373b098f747186f67fee0e4e0c1a4002f76c35fca3662abaa9e1',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '02a0d1649758c8fa8db0141482d884d90ba60913306e4ac495b825646396ea20da',
          },
          xpub: 'xpub6GNSThbAQa3UqVgpdUA9F61vgvdKxQHVYpd2Yi2GEkLjLuzXud9h7uUssHThL9rF342TG81Qso6S7qzDj1RmKBYBHYFZdWbWALAsBbVfXpn',
        },
        '1': {
          node: {
            public_key: '03886812b74f2a9e8ca620049bb744a0c1edfc0c6b08dad869f18e201d748ed17f',
          },
          xpub: 'xpub6GNSThbAQa3Utcbxdp87p4J6gCXQSe4MqwwtcEPsjJPvhcQYTCnFjMBwzX6fRwud3xCfyKjJzz8owQ4AG27KSixpg7fCSxWYGxPwX5GABcQ',
        },
        '2147483647': {
          node: {
            public_key: '03c88e2e0222e761531dc5c7b2c2cb9d87dac7e86044df260277baeca6d017ecef',
          },
          xpub: 'xpub6GNSThbJkEaSyVQj9vpDYCWVgsRMWUuhd5rffzJNnyPBDo3BRFzdQMZXWJyxnXdFmLedFUz5RhQwaPJke363roJp36mfrmXHfThUCqn38Uc',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub',
      params: {
        path: "m/44'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '03b2ea9a67e0a7bc0efa7dc6ae707c45624de5ec25d1e431e5e733b70906dc7a2e',
          },
          xpub: 'xpub6BkMfgrFfiYEs8tXoBGemPCzDS5qMrHEyC5LDQGJTBLmCSpgVZEjiDUhLYjaF7mSKMH6HRSwN2rMfi7Cm23qUZ41zoTxQK5a5STMkja3Xod',
        },
        '1': {
          node: {
            public_key: '03ab6a75931f1bde547810a87b8a778dcd5c96defa239347c32fecbf802ff6787e',
          },
          xpub: 'xpub6BkMfgrFfiYEvkbXSc8BerTw9yn3Eq9TuPnRtye7UKqrFtquTqGW8TDniUa9z5PYEQckDspwXETVFhSk7YdHJn4Nd3JE4LmR7U9nmBtVW9D',
        },
        '2147483647': {
          node: {
            public_key: '027d77caadea0bda525cf5b283a6f36f3c8843aaf80203d9f5066520cb9a0e4451',
          },
          xpub: 'xpub6BkMfgrQ1P5D1UpMKLTfnnuTSACSw5ewZiixs98aJiX2KZYhpMg9bPZaq5zwu3vAUkXTCUsYzHCBV2xVDQKh3GMYPn7GYfGf2SKerpHiCXw',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '03541da939cf61eddda176e70a2bfd30a734a9a9ae6ea9376b6068b6a401d72b70',
        },
        '1': {
          publicKey: '03fc6ba35a1354a36e64e95bcb6100e36c852fd69c2b2185abd3548835cca1d15c',
        },
        '2147483647': {
          publicKey: '022fd78d026366f4f60535fe680a698a92c15385320b124c9e6621604f8f3328d3',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-xpub',
      params: {
        path: "m/44'/60'/$$INDEX$$'",
      },
      result: {
        '0': {
          xpub: 'xpub6DXfWiqKp2q7BAeEQ7ryWxcNeRTxyzNsTaXuf1Y1zbrhy7jAMdSEJmd6Cnj1D866xshGqPcVByUvwNVuf6jXJxWwsoqQPEWNtiBLcCqNmwD',
          publicKey: '028aecd7dcca97a69f45b5a36b544848b951ece356ef1836546e3d719a75a9a39c',
        },
        '1': {
          xpub: 'xpub6DXfWiqKp2q7ECw9p2Yf4qLwP3wsBSm4KcUGHZbFNcAbkrbbb2AHoJqTZJKPzW55DRe8QRqmd77NBsEX6MbpKsbapcLVd7npYUywhb2tMek',
          publicKey: '025bd0b93f42eabb30b34b1758ed1d330ad3b686b75416ceb5c01f04c283303e6f',
        },
        '2147483647': {
          xpub: 'xpub6DXfWiqU9hN5KM2MscgSvwkY8csDQtB1SZLoqeVSkkLAcRysJZQuGyTQ1Ue9DcFjANR4CYXrrakC4KdwQ3JTtwwC9RdAnSbVrojyeHaUYxs',
          publicKey: '0276a2cdb8d411f1480391a37d7ce0d5da5f12cbe14c227b41a88fb009ebd6f794',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GzYcxS4q4CzBT3aaxyfB1ZZkrXrSuGxz3kuiuN6hP1oyRBTYuRFtVKnVhsz4Q4xi9tcFayK9h9KbCsybFTa7hRtdytmA6wssSUNd3PDWuP',
          publicKey: '03458e58d04bcdd99f086ac79c613371076c652c22ca057724455e53b96b1ecafa',
        },
        '1': {
          xpub: 'xpub6GzYcxS4q4CzDYtR43P5j51tAERuctE4776AuJDEYFW6NQyk5xrvNk5XwKv3bTsrXCQEMLqrhDMeTtVZzDoz7wQTuDkHfniB1BsrMM1oYk4',
          publicKey: '03828cfc1230fd9b88a4e23f2873b7904295c72eeec3db4004dca6b5c911d7da2b',
        },
        '2147483647': {
          xpub: 'xpub6GzYcxSDAijxJUTdZ2wDYEM2Vr29WTBWUmegUCAGoUFBH17Ut5zu19mSR1CVjcS153ZEVEedqv4Dw7DJwGe9Rqq4fFoS3Ut76P5wRoGmRHs',
          publicKey: '0348781dc8f9b68267fa5c51202f79cb8740e69954e0bcb651cce8c33d900779c6',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1rtucg57p9hq4r4lqdevx4ltjx8g7j27d0xe6t77x3x42f725d65qpheghr',
          publickey: '1af98453c12dc151d7e06e586afd7231d1e92bcd79b3a5fbc689aaa4f9546ea8',
        },
        '1': {
          npub: 'npub1zvtnf0env5s8tyhkv5hdfc5qvhr6wr4plvh7kmcme4rn6lu2m27qwmrsjf',
          publickey: '131734bf3365207592f6652ed4e28065c7a70ea1fb2feb6f1bcd473d7f8adabc',
        },
        '2147483647': {
          npub: 'npub19exm3gzl37pqahm4p0eqyhga5mppyzq0w0nxqxzdd5edwl4tyrwqjaceaw',
          publickey: '2e4db8a05f8f820edf750bf2025d1da6c212080f73e660184d6d32d77eab20dc',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xe43efd6aa0a3fc839a9b79c1b4570dc3147d342cce6995ba72be27f3a4cc79c1',
        },
        '1': {
          publicKey: '0x1174df6906434135a922e703becb672c4e7ab08a30ab5f98a625c62704c699a1',
        },
        '2147483647': {
          publicKey: '0xc66e97004a932986eabb088e03157db2767337a4d1312408ec24dc4c5632ba75',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '0372b6b33435cfd315cf00dff83ee5078e3d2d0aecd2030e1868c3dce5c5f04f59',
        },
        '1': {
          publicKey: '037d8e6cd5065133b8308c4d18ec532d853897105b4ebe64f414dd5dccfba3eeed',
        },
        '2147483647': {
          publicKey: '03db3bdf161490ac10378cad0ec16511343467e2dab0efb717bb01619a207ccb09',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '287c8982abf31b4d6822879c2db5a662f05996113d99ca5345fb6b32a19c1765',
        },
        '1': {
          publicKey: '1543e5ad2cdb07b6f100e8f73351d08bd0fb3bb3a27b96c9b1d203337636c287',
        },
        '2147483647': {
          publicKey: '064817cde2fceb8b12496e63f332990c9d8d60853af7d404d6b25b65ae5c90f1',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
