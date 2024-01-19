import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'two-passphrase12-密语1',
  passphrase: '56789',
  passphraseState: 'n3EKBUnoqYtYqg7qdUyCpehKXsuq1tx3yY',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429457507',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            '7391bbe881d801695737b073be06bc77679745e2488f29ec917cf178aae1651f8b9c7293967d1ba022abc45fae53a63b3281b8329e22b06bee807619c6cea415',
        },
        '35': {
          publicKey:
            '3ca0e0c6d55c0a33e1a78e4bbb917e7e4944181ddf0c7e74299a62f6fbf29583b9dd97104c369599025677b7d1e1f540ea5d2c9f3ff37019bfebabd630937704',
        },
        '2147483647': {
          publicKey:
            '3ec372fea205b1d2147982ede3798137ba1ed5fa7355eeb9b50a8f6ac36614faef10e1e7512c73c66bddd519de9a66346d279c7fa3a3488486de1dd3b3c99ef7',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '21cfde36adf650a52e0e26eaf36415ecde45599a1002bbc29e1f062a681d6a78',
        },
        '35': {
          publicKey: '5bc430c5c53b68d0af7f4cea21cdb99b45ec3d316a5d16936957e1271b04d2b8',
        },
        '2147483647': {
          publicKey: '254d2b54e04f2a4a9e0dc92da84fad2f4cb6b4971147ca83277741f980ec54cc',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '032ca52393360a5364b0a3873e5ef0ede79bb35b3261f72b212f8ababc21244baa',
          },
          xpub: 'xpub6FpFsjvPVx5UkVDDn6d5iH8d14nfjuEoA2GUDF5txPSotM3tZ7q5pkEWZ7Awwey8E5S9nCTGjL3HTgeutcQJkRPGQxDQRnnKR8X6DHin7nU',
        },
        '35': {
          node: {
            public_key: '02ba5c5fce22a082b442907b27c6ffaec9934035485a10f6ed7ea1d6d7d4a5e142',
          },
          xpub: 'xpub6FpFsjvPVx5WJ1jxMwJ1DEBSwxzfWMNLXRp5nwEgvS1yce3iaiLBKrM5151y8yoaKbQmKa1eyH6uf117vyH3CBHPpoHCQNeFiCtSY38H3ck',
        },
        '2147483647': {
          node: {
            public_key: '03ed3cbda72bf2bf8522fe956cabdd859a55b2a5faec26c7329a7046e03102a2da',
          },
          xpub: 'xpub6FpFsjvXqccSu5CTMYSiAw8m1UVvRyEnVCWSTdskAwfeNd2WqUaSVsefNvGWuFNQ1YAxHp3a8f3bEHTBxx9pZaLUsE2WEJcEVw7MG6NMeKA',
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
            public_key: '03323248ac03c39fd316e2af7d31d88f574ca0ace58f641942433791ff35c05a52',
          },
          xpub: 'xpub6CbkAHZeEHUTSGiW5bWyaLyaPChrW3BnmMPhrbSARmPv5CvMaLVrsoMsezoPNMc8y5gQZsp8RjjSijAPYFF2EyvZCuceYdMvSJA7sbPGrpQ',
        },
        '35': {
          node: {
            public_key: '038af4906e8acc0baa80c78b4cbc3f94d69a284548daa61aaf7fdfd010e5290bcb',
          },
          xpub: 'xpub6CbkAHZeEHUUyrEFo1sHiw4cEozAqoJ4J1qjrdqkmnaZzrqYetYyh4gA1WM7WM4Z8bV9WMuNhcaveq9ALkbDqNW7N98tYjxnhZec5rMSntJ',
        },
        '2147483647': {
          node: {
            public_key: '032765a7931a70dbcf778dc3d12b611e670e9575c784047056477a94981846e719',
          },
          xpub: 'xpub6CbkAHZnZx1RZNzYLxrchcW2ndmAEpiXCb1sRPVRPBX7er1fxDiaNgHRuBLaZBy2o7oYKTG1hS1ah4ijT8cFt7QQwutFmLhtELJxgUrJnT7',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '03c14577d348d9f1deabdab9174b448f85029aaa89a0e1c8a06b0ad60d4daff792',
        },
        '35': {
          publicKey: '036af0cb840d60dfb03e23885b2c0f5db9c0017b75181723215641944bb490bf37',
        },
        '2147483647': {
          publicKey: '03378f47fbcd065f13d63c93698936350768c23b5612ed4545bfe74e73d0292387',
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
          xpub: 'xpub6CYN8qm4RkeHJMBAaCB7ZygpCNwVqc9dSwWoQg39aQEQcrEmXgbSeuQ92QWuSvhgSf5FAe5vBHZku5mP4GaWcCbjj6dQferCupk1FSpzQUc',
          publicKey: '021dd7635ce15fd82898b2af52a09d24b43da7cfa6a62018183b540fc2d71a8fbf',
        },
        '35': {
          xpub: 'xpub6CYN8qm4RkeJq1p8M4qmDV2Loi6EaDREe16g3tBNuxGa4vDeCDrbs8AGEcaGPmN13CbhMbKge3krUaRPzjwPoTh1g1JQbG2QAoqZkh1rf6N',
          publicKey: '022b11b4934fcfb6fb99d52b767fd5fe60511e8c83f085cc828ac61ace0e18ddda',
        },
        '2147483647': {
          xpub: 'xpub6CYN8qmCmRBFR9Z2q7wRbtXkMMT2fdS6MwwhRMTjXjWHECP5cZXWkvuSHRDCht6ELhz764whH5mehBEjyP4t7mynKT1UqgniX2HdWzNrJyG',
          publicKey: '0220100b7823a289014365fd0c29cd416f063a8d493b511d7aa07aa0898e1ed1ee',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GPje1gUZAcqMwLJUrPae2j1GqAbFD7L87AzfW95379M1erbLKGzvMEaoF3112QfCwNhn68oGMLV2u4yGH62JHz2njKEDVcxUNKqT7Kv4in',
          publicKey: '038b9037c6fd5024cd2e80479817706ce37a0205fb4d0d8ef74a48e8cd694e61f7',
        },
        '35': {
          xpub: 'xpub6GPje1gUZAcruFupzs4V5Pjk7q5jxjgE6uCVRHcraELg9QjBodYhcv5fu8Q43iSmxgKYLJWxZqQcVsVxXft2bvdqZoUuTRywHnm1BP3yYh7',
          publicKey: '03466a319fa58db8d00385c3984f1399bba3649a52cfbad5abed690755f2b6895c',
        },
        '2147483647': {
          xpub: 'xpub6GPje1gctq9oVrHMp7a2yYLGYPASGASQHrmYzbMQacWvhRzFxCSZhENtVT3ourFUe4aCcjaVkuNf3h83ZHGHxs2meeaW8iDbVZdkMdoq3hZ',
          publicKey: '03de4a93d8449a0fc11f87c95b7e449dc072278540e1ae2460714aa3c3792d73da',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1tqd5er283xzrfekcd9f0cufj2e3uwlc34dg5knhksen3en3w6tqqsnfmv3',
          publickey: '581b4c8d47898434e6d86952fc71325663c77f11ab514b4ef686671cce2ed2c0',
        },
        '35': {
          npub: 'npub1valwtzytmts4gvqlddlnucg5zppjf9vx49qtet3wz2rlgxzp9qlsr5uw48',
          publickey: '677ee5888bdae154301f6b7f3e61141043249586a940bcae2e1287f41841283f',
        },
        '2147483647': {
          npub: 'npub1kxuy29wa4huy3pvethh2dhelrgn5z44d59r8ntru2mmvtkeaj7espugglc',
          publickey: 'b1b84515ddadf84885995deea6df3f1a274156ada14679ac7c56f6c5db3d97b3',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x89e6e02f7013b8a95a4bb3a81537e4f6644410a4e6b956826b82356e50ddc55d',
        },
        '35': {
          publicKey: '0xce286c0d94a1e1cd7f316210800b09264f714d3376d112a759e986f86b1955c9',
        },
        '2147483647': {
          publicKey: '0x024f4a4ca01ce63035292c5c6ad3f9599fcea84881c7aeb7f40993c90aa39096',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '020621f30e39c6a30c6357a681326ae661ef07f63f670017345a38263037e01fb0',
        },
        '35': {
          publicKey: '03d753c86f5913c314a1dc8791058687e0b0357840fa6bbb3a2cbeef89dba1ece3',
        },
        '2147483647': {
          publicKey: '03efcabc9058a0d9b2dc019e09360ebc7b91b22bce4ad6ec1d905cd8c1d3e31363',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '916f4e93850a63568ec9a326d4b660bd0a79f1faaf0d1f64cdea537ffc6b4b6c',
        },
        '35': {
          publicKey: '4a229f68fb2e38a2ff6dc18693e45502c62e1d8c14f6249b9a278d2eda2419e5',
        },
        '2147483647': {
          publicKey: 'f1693ee1b4ca8103089c1a232fc21a285c978a897ff177a9c505742909c12117',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
