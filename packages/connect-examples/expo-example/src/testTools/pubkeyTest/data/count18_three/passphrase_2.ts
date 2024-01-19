import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase18-密语2',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428736640',
  passphrase: '7789$$$add@@R@H',
  passphraseState: 'mp5EXTXF5h4QB2APmiRSEBi1xAX3H5ga3B',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            '8004345b3104d85bae7520be35017d88e83e8192333502f76fc63ee7945a6323460c1e6de94a0ba12f60a7eb2e2dca82ef2a1f41cba5c4e2bd9af272a01a475a',
        },
        '1': {
          publicKey:
            '4c4662992df1777a268f6bfe193080043967c1a2eddc6a2de9df0f1b6ae1f927d69fcc74373b3047ad690ad3189e52960f9141ad01453c15571c98a827ccc15a',
        },
        '2147483647': {
          publicKey:
            'e88207778bea33cc6678d85d9bc775f843da6ebc6df3d681b1d8947552f43c5b1bdbca61fead963b00f3cea5f1578d0dce0143614cd8dbf247747e9f1b8e3b15',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '94f3a198a94f6b86f63dd412b437d9d4696dbad3f82bd614ca61768aef1f333b',
        },
        '1': {
          publicKey: '795b63944f4fe0f6fc59c8ce000464ecae1aa397b4ddcae964822457d41993a6',
        },
        '2147483647': {
          publicKey: 'd9c954a6cffef1839b8b0fff7fae0d3e09235f2efaf2eb999c30259b8e40f75f',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '034bfcdbe0147d2e9eaa46796953c05012579a50009bde602c98ee5f15d47074a5',
          },
          xpub: 'xpub6GjEj6EU1PHaWbCpBdd1vjoZUmsJPZL1Zs8HwXxAuWPoAQm4KAWSGw41jEFzXBdMrAMedjrr5zSbPuaGj8FjSutSFBmBn16GjWcdtYXqhqG',
        },
        '1': {
          node: {
            public_key: '02186ab232a84df2aedf1714cf77aa6da74bbb057e2348b24ce49c973025fc1ff9',
          },
          xpub: 'xpub6GjEj6EU1PHaXWXsgQMNQRfSEJtzoXYsEiXhnK5ghdmeMmjNhfeV9GECsDohcvuDoK17tcQnR5ikuimtp8cHVzafHsbjFBspP4MxrUmT69P',
        },
        '2147483647': {
          node: {
            public_key: '02f767180117c8e3522f88d02200423e74aa6d7df4f12ca997d937c959501143a0',
          },
          xpub: 'xpub6GjEj6EcM3pYeYqcKhPFFRLMBz32fknTCC5q8HjzWK65y8sAQWGPFvfShW38RsoiYPuk3myHPaK2dQr6RRov1EHAFcS4Vgy18eNk79hUiUD',
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
            public_key: '02f0e68d0c35863df03bfa365625a329547ca6ecb8f2fad3f9620f5cff487c8e91',
          },
          xpub: 'xpub6CVxQDdgVwD2xEifnuUDZtFBq6TLRNt6yDdiNEnHuYTozTKmmSz5cwyNLtSrJqPCRrn8iw3fGETRcvme4SG7TGgaBEmiLWNX6U9KSkK6Aaa',
        },
        '1': {
          node: {
            public_key: '036c2860191bd63c308294f66f3ef0ab11addad3984e9ff4e48df0f5df7ebd49c7',
          },
          xpub: 'xpub6CVxQDdgVwD31HTF3s9C3znRrjDkHcUSGomNHL6sDeq9qa4nBWVriCCii5WCCEs5FJmRGTBDU9cyCpUxn527p6mjCBCGsV3NzbYHTBme3yc',
        },
        '2147483647': {
          node: {
            public_key: '03ab560a1896bce6cc61f989a7ff99fb018d1c4c6c3829a0b74bde07741bafd0fe',
          },
          xpub: 'xpub6CVxQDdpqbk14vX8k8xAgusQ6mfwryxKtiRGgFis8psmTMDbrVZBfK4iabDai9iE98gzxUYwF5Za7QPgvxUTtwfrUuqe7sbjx8hNx4BdDwR',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '035febdef9e8462dfa8c61dee783cc9848b447ecc2230ea43432ed69114b50199a',
        },
        '1': {
          publicKey: '03f8a095479fa2e0229580a420f8d894bc5ba19cc45c9d3ab5b479d126dd3c3c2e',
        },
        '2147483647': {
          publicKey: '0280e27d0696db9d1a4cf9dd5d6ac2f955f9464988b364060f3da7272509d1608f',
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
          xpub: 'xpub6D2vfSNf2h9UFk1inVFPKoqkmgbN6ZUzduhiK7fm3pF3qdDtZU8qnGwEHA9SGpwWeNbnZkVjFFdRuqyiDw1z4exZETqXby5ksex47m7vGM1',
          publicKey: '0367232df4eb05102cdc2a2e2b8d1cea2926ae1d5be965abcefe6437366523b10f',
        },
        '1': {
          xpub: 'xpub6D2vfSNf2h9UKfiESuh7wcwJ74qZWtTGMw1Smw6btz8rHAkigHHF2KzdL6TKSdbtNU995zjs5LKgdGNEKJMGHs9fsGJ21nwkwn6ahc5na7G',
          publicKey: '03fb0511280b356d7710cb215e9f9fbea2dd4e4f440767ddc9b4d3f3fb44d8494a',
        },
        '2147483647': {
          xpub: 'xpub6D2vfSNoNMgSPBjWnXPVMEDUZHsFb4kPPbDtShXHRZ1gxsjVmMshzyma7yUiEuXpCWodUk6GC7yL8Hbz2ocMjKExXVjgLqoXvbtXVyap2tP',
          publicKey: '0378b9ebfaec31ea46a1f3da6ae130ba0e8bb98bb3b0e0e59ad90290245b23d2a1',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6H5CUod7pEzubyZ3PTyPvHWQhrGEhvvknemow47zYbip7BMdqfX3f1WmUqotDib9V57Eh9uSN8JeUGTFpsLLbnka5WN2CHbgs85xwCR5ufF',
          publicKey: '03de2fb3499a1f7ffde47aaae776fbea1b9fa612bd4ca85f8b59bd2266575ea3de',
        },
        '1': {
          xpub: 'xpub6H5CUod7pEzudcHrALaWRHVKXankKa8tP6UK8fY4S1xUSdWVTiSHEvfPB6gdSBjwMrgwBD9GdqjWXQ5sQNp2YJaRYhLokSQhHH1FMeRd13a',
          publicKey: '02edc97f4fe10a2cb1d27ab204e2665ab3c2244171423651cb985c7ff66fefff03',
        },
        '2147483647': {
          xpub: 'xpub6H5CUodG9uXsi5aY6CpX2JHNVrSndx9h39c5WcCyVHTjiAEv1HTS3pqo5rX18P9RpHkBCrGRrByZxWBvryvdqTYJ32169SetdnxEtLPPjcM',
          publicKey: '02a307f8741502d51cd23bc44f8b516f82b80e0e158ce3edc90f424b15aac24d70',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1gvdwr68t9r3s076m3l7qv5au9hpv6t3vh8xeqme07pal9rntf86qj882cz',
          publickey: '431ae1e8eb28e307fb5b8ffc0653bc2dc2cd2e2cb9cd906f2ff07bf28e6b49f4',
        },
        '1': {
          npub: 'npub1awhrfz50tpvt7uex9h8cam654rqujxzknntvn6j3rvmsp49vcr4szf02gj',
          publickey: 'ebae348a8f5858bf73262dcf8eef54a8c1c918569cd6c9ea511b3700d4acc0eb',
        },
        '2147483647': {
          npub: 'npub1a3pm7egvf3ysa29z4vlmd4g68r0mud3z6tw0sn29pz68wk72fw7s26zguk',
          publickey: 'ec43bf650c4c490ea8a2ab3fb6d51a38dfbe3622d2dcf84d4508b4775bca4bbd',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x3635296e1eb28710f4bc3ee0883ab72a68d6318bbb307798637a17d2bee90de3',
        },
        '1': {
          publicKey: '0x3628477dac2f7c019db8147e7b360d15b07bff50fb126854488c4b1312da1aa6',
        },
        '2147483647': {
          publicKey: '0x2f2b2b76db0ad294174d14a36daf2455c89ed1252ca1cd19929eaa7c94ccef68',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '03b84e68331a5cabf652a63cf5e2b6aba549d14381082d1c46afe2f2fdc55b85fb',
        },
        '1': {
          publicKey: '0324714ebeae7c1883ba2b47954957c5f37957f04c9b22fc26eb8307ca332b821b',
        },
        '2147483647': {
          publicKey: '02c35e6ab9c8a1927d82cf5f12c4e0ad241e14e7ad113c3e3281eee0b6ec2b75f6',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '6d46cbcd2708e9d75216fe95a511c98caaad1607a8b61ca205707b7bce1e9db3',
        },
        '1': {
          publicKey: '390375100411f56d7c0c0b62ed508d08883a8f23617cdb78062bc8113dbcb79b',
        },
        '2147483647': {
          publicKey: '26118c977a4466da5a662fa2bbbced932bf0990cb01b15cb9079b3c32c7c2a65',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
