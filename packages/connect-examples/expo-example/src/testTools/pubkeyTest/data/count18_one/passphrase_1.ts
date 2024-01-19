import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase18-密语1',
  passphrase: 'abcdf12345',
  passphraseState: 'mw4kcXbdNjkf6Zu7nU3oHpajXXCc9wkZNR',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162750',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            'c753af8b0ce758d40fc2f715f60fad450ba79fb102693a37682ac8a068ec214ec0f01035ee183826872dc96f83f99371ff23d54f971fff93d327c4d98899fba6',
        },
        '100': {
          publicKey:
            '434caca3193510365050b4c7797d2c5e4525cc5fed9ebfceae53fc55ce76cb2734651d1feeb7782865554a4b6dc600518156580ce6d05c38104624a8924c0a73',
        },
        '2147483647': {
          publicKey:
            '9774bf83af1cb74724501be3700b388d0dcc3bdc374b406b942f3c093ce933553dda05edb8869f5a283adad6504924fda1f04d8f6fb1fc6c7e66e8d9e1dabfd0',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'e2641b19aab78464ea5506a1c58ac48f4966d1d6e8be2b25044af969208e0e49',
        },
        '100': {
          publicKey: 'fa6dd807ba5305fc88b82029f7a8d59f5ae57742a3a94d70c9ef03254256fbca',
        },
        '2147483647': {
          publicKey: 'caf87ea846780b03beb3a3c207982a102d3bfc1722b02ac3deb9b30cc2e73abb',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '02041e65bc963d4d85e0b38d9331fdb35bb931ba88edc4df0090fb0154743f2bb0',
          },
          xpub: 'xpub6HGvcbATY1CXic7z8YCAmeZEeHTAmFJFPriWBxd1r34RzXiRDnBqWyfFCMTLi5QcdPn2jqcm95bVjMu3SMbF32CoZuTybgTVyMhaUo2D3FV',
        },
        '100': {
          node: {
            public_key: '035858ea9287886ef8359abd2ac45b7d15987d11a9482b66730f5b166d74c4bfcc',
          },
          xpub: 'xpub6HGvcbATY1Cc769WJvxr7BQdpXfLSSxM6NE1rhqy5xRby2WC2GsZMQBpKvEuMGEvZLVBeJcNq6jQxY828NGJxMwtCmRrNmJK4EyAKgnrSi5',
        },
        '2147483647': {
          node: {
            public_key: '0397c9368f33ab53827832b5d26dad3094b0bbcd5fa0aa7c904338e10c932bbbe4',
          },
          xpub: 'xpub6HGvcbAbsfjVqTBMj4BEsZiXf1YQnvqKtWibdEyM5wK4beMRGRsbCyMSTForoTm535v341R6DwNUR3dLEKmDuboHnriSbJpPsUZQt9vufeV',
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
            public_key: '0379b90c3d6aef2c08b32395d4c71c72fcd06474ca6b26a9c109dee6b5c0ddd6bb',
          },
          xpub: 'xpub6CwYJknAy9pWtGu4mfcLtfqbH2czEuqnTcPBBidvzgjx1xmTnsW5d1cx9VSCo4kL6rS8ZFFKvcHCdu4URuCrhZJE6u2yYQYfCJhWFee2eB8',
        },
        '100': {
          node: {
            public_key: '0211fd405b53a3d63c3fc3e529159ef86a55064df0ca993fdaeeae107619888285',
          },
          xpub: 'xpub6CwYJknAy9pbGeD3xi3VxbYLAtmBqqU1MpP2xqZa9XYYFxUFztvp9MwPQn26aNNSQaJtr4XwLC6ozSNks5nTKJMxpnifwnD1X3rfHs46rER',
        },
        '2147483647': {
          node: {
            public_key: '03caac673270d9bb0eedf4e077be9a31d8b6bcda1a7695a0ae075ffb5c7fd3aaa1',
          },
          xpub: 'xpub6CwYJknKJpMV1fWhF8qatARfoXRN52Reo98oJRktpkEn5AaGCJVgqgXu6Rf3mt6jH6BKv9GKG2Hexn2VqBC6jbN7adC87APYMybqSbraene',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '022793828296be9addb9b6a0813cfc633ffe05be233118bb44d630ed57d6e5802a',
        },
        '100': {
          publicKey: '03856e7a5ec82e92874a6986423985342f8a302695f0ec8b8340f0770e4b523b6d',
        },
        '2147483647': {
          publicKey: '03c9640aa2050a377f3b4413c1ea10c4f228f7fd475274059ff2a6b50660b972da',
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
          xpub: 'xpub6CSx8EYkACrjM2kdUt3sWgKxaSkiWDo8V1te6PbPVR6a7VPmYkYGuF6pMfUEww5CLZyghfcGNpqnYeNjBm8nJPKaJyF4SrbufnQdmN41EbT',
          publicKey: '02a7b68a83d2aee30879aeadf40840ef8e0864698a657b6f604779cdc1e986b6fe',
        },
        '100': {
          xpub: 'xpub6CSx8EYkACrojLn4CvjAtFLYJqK5M2Ud1Yi37P2JUoWjmSX1ysiU2DJv86o5ATKyygXvAvmUoVhDVBNrL7bSRsqECXpfLH6sbMKu8yp2JiE',
          publicKey: '02217ce9e284ddc8d5f70320b2dc04212a695956cb80fb339a426849f0f418bff0',
        },
        '2147483647': {
          xpub: 'xpub6CSx8EYtVsPhUWS4E3xRsbo2PAGnNNAuojMkPvN95C5MjiXw7hixsE6n6jTrwExVT1rs5cLCk9LMQdhzgK1hcvu3dR9ZWxyWWMveTUNDn68',
          publicKey: '0246e2a5bb8357f5fe333af620308febbcdad3903b915e9a2c121521110fcd4b2d',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6FnohFvKW85EBLMizUxJk8wT3VoG56uqPfgxqZhjdPaEvxyGhfwB7iyQCrZdSyFvcqTzQF46EJ18Eetpb52ka2MKe9osVFCrxLoLWyzGgYg',
          publicKey: '025458a2743a096700c267094bc1448fbcfc91258e6e5d84fd9f1734eb2e6312d7',
        },
        '100': {
          xpub: 'xpub6FnohFvKW85JZBrYvRAhEspQ3RV2giZqbKuoESmED7sEGAVDwtUqTseHsCSmLBkfarxf9XAiVGd5zeoqfTynJFn8BB7zK1o5zBM91KQ8uLx',
          publicKey: '03b39c9f957be3110cfffbcaa28d8b8ba55dc50e6f97f36876392c7a99559ed92e',
        },
        '2147483647': {
          xpub: 'xpub6FnohFvTqncCKnVvQ2e2JXf44HoYBQj3LMTEbGpJEnLX5yBiLGGirThesy3n23ey6igpWWPwjY7CAj6vnEyt1fWBtcvF2mydJ2LDzyne6LP',
          publicKey: '038bf5cfff34161078e26b29ffa0e4f9f2cb2c5af5f5e74e699535b921054d5c3b',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1g5zkm3e6p8wxu74j4d2h7stx5yu0pwz4qrxzvyke95w44audx4ssyz2twj',
          publickey: '45056dc73a09dc6e7ab2ab557f4166a138f0b85500cc2612d92d1d5af78d3561',
        },
        '100': {
          npub: 'npub1duw7lnst94n7nxymm5lqv79s3y5vfjkk6a4nkahlak2q8wrdtmsqp9lg7f',
          publickey: '6f1defce0b2d67e9989bdd3e0678b08928c4cad6d76b3b76ffed9403b86d5ee0',
        },
        '2147483647': {
          npub: 'npub17nrk55qydgwjalp4n99ps47urpv8ud8x5xlkl2g2p8nnk0pn4dqsd2445p',
          publickey: 'f4c76a50046a1d2efc35994a1857dc18587e34e6a1bf6fa90a09e73b3c33ab41',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xf444ea93b0e6a8b95e8a5f188c1054a9eebd297764d68f55b1845eb718d7fad9',
        },
        '100': {
          publicKey: '0x2a3843913da16cdc4f33ad12eb35d4abf5729cdee3878bf0dbe881721d9fde5f',
        },
        '2147483647': {
          publicKey: '0xaaa80613addefddcedb33b6ad73a97d3b37fd2fccdc5e5dca2be69372f1cbb10',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '0316d01c9f31b78fa94f5fd53f62b40804b0210de50f361fb6aa07b56b818c1083',
        },
        '100': {
          publicKey: '02e29c4e5675d208e95345dff58cc7b37ffa24753d5489f5abc57bda3906478de9',
        },
        '2147483647': {
          publicKey: '03e77f49c1beae8c86af33b4cc26d2b9c6510b0972167ad644740b4c0f5d40e57e',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: 'e4182788ab8614a6ef4602e3b5e9cd9b117c89002b1dc35c9ea0c5fb2a5c0ace',
        },
        '100': {
          publicKey: 'd30e16c86d1acdfc14af21f41a6f5dd32443fdc10a7ea827c2bf21dbf6920399',
        },
        '2147483647': {
          publicKey: '59d4bbe92cb437dd9bf131c22fd7f58df8540386275d7309a49314e3e3a87d6d',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
