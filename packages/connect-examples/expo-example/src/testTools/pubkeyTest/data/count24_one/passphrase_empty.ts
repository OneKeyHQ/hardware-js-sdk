import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-empty',
  passphrase: '',
  passphraseState: 'mpZyZrARXurTXC6fhzHdQzs4xVNXCkCbxW',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162869',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            'c432a6857a36ab8f11ad624915f6fd6ede8df2ecca17087ae263e54e9b302efbe52f81f11ff10bb6c0e76d71d83ac715b4c3646e673484d217d63633b6f32f5c',
        },
        '10': {
          publicKey:
            '2c47e7b37835cf3741623aed4f4bcd8f9762227143b13a250fccef883e9afc76d5b2d0dfec25ced85d38a499443ebf9d5b4cd2848fdfcef67b1773ebd555144d',
        },
        '2147483647': {
          publicKey:
            'd9a0e25ee66cf2b7b6f46fcdc776803c0691c517e460007ec1faca3740785c758b0c39bf6541a54a0227af320b09ad999912f10e72675a646c8836e8bcf9138b',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'b5bb7077b85e580e9fbf5deeeb68d9f0e03ed4057b5b4f6be26c9825f4bf024b',
        },
        '10': {
          publicKey: 'e3f98a6fda8c16ce9b3d69a892ea0a3e25e6db556a7140363e314337aee55040',
        },
        '2147483647': {
          publicKey: '1aded9748472330f6e2319933ff5f07bbd760d6361ee8a465931846784a5be92',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '02a0681c7a2bcc3b576a8077fd062762b74d75b60c65d450364e126da8393032df',
          },
          xpub: 'xpub6FxmLDUWgApKoXYWUApdowrzq2Tq2RJPwoYHp3EQ855USAwuoGL1qjT2SUkCrehJquHunZtuSMRGk3E8B6aDz97X2AmGPrUpan9om8HK5pV',
        },
        '10': {
          node: {
            public_key: '037f6198c9211620cb86d92708f1a70f02a9be8b1ae07c11b46d9f24d6e8c61865',
          },
          xpub: 'xpub6FxmLDUWgApLDyvRtyMAm77vzcBAs4uu9g9b95EVuutL4fhSf7xYqtkVHb9wMzBLCzygzfdpsMSGpwcp5hBWhXL34RoeDNgJxV6GDLLz9ns',
        },
        '2147483647': {
          node: {
            public_key: '0304b6607238dc35dc62607f916781d9a86396d80ec286f9752e851d76d6575957',
          },
          xpub: 'xpub6FxmLDUf1qMHv7e9hTQ1XBkZeWPZwh7PpVuF3skAyXEgPoqZMhUdFGobxrxCHFSLownkzMKE6a8bNwukASZfk4YeUNRv8XdqS1YZ1hT8LeH',
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
            public_key: '0243db30827c74d973a160e4d30da0c4aae87d740edcf9c05eaabd62f7a0904713',
          },
          xpub: 'xpub6DGvuAqse3icyBCAaTDx38WmCpb3uMqZHDgXktnJnU78RSZVZxPqU4AzoWr4d6Rvdpm7VZbQUeFoNN3i888TaL6XbGsFM5QN4edQMuo1XRG',
        },
        '10': {
          node: {
            public_key: '03b810eb15882dae619364974cad65677466714e7a03833fb86cf3055d7f33d40d',
          },
          xpub: 'xpub6DGvuAqse3idQnY7Q4xqcW62N74Ra23aJEevM4qrbVgxzrgzcCfin8yW3VzBha8j6FXNkFZZ4A1NX3eKUZbnGPvFfH4fzMkijMhrTvgc2U4',
        },
        '2147483647': {
          node: {
            public_key: '036f0160c0a531e8bd983a590fe49e583bcb54e7a4844aee2ec88688d1bc5b8210',
          },
          xpub: 'xpub6DGvuAr1yiFb6Eb4J2wF8gjXb76Eih3cHFvmAibhET6xnRr3kyrZFmvmM4jN1KWBF97UeQhj9JDdXfefmtbzMtUT9VbVuq4NRaSKeRhbFmK',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '021e66b46796d6f24172d93095e9b2cc88018f86cdae1db3a7cffa456bbe17587b',
        },
        '10': {
          publicKey: '02273023d3d42154330e5764ee9316d9d3d6a2ef7ab1543449891d95d81c761ca0',
        },
        '2147483647': {
          publicKey: '02fbc87d5ddac492ed2420c191edb93aa98cfd06cc88dbc138cf8a84587e21e51e',
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
          xpub: 'xpub6CFhfNmUggugQNoMNjVb6zM9LU3K5znVrocZNUWNsdng2Ly3bH9375MzXERjRznrC7xSDN47EzKFPeZUB6zHx2QGNHiTQUEDxjgXu1KmtS8',
          publicKey: '0294f6604afc77dd56aacc9ee0b672ba3603fb86a420308e061e44705411086e98',
        },
        '10': {
          xpub: 'xpub6CFhfNmUggugqZkyYdf5TLPGa7KMQwWWxBoT3ZdtWB3x8yhN8yA87BsvfSftCCRCrBPa9SC4WMeWUrz711Rt5GiFNdEXHUman1cBQLK7Y96',
          publicKey: '029ea1744ce3d6806f1b4fcda144d16f163c73b90b218b8bb5f2c79912284c1b22',
        },
        '2147483647': {
          xpub: 'xpub6CFhfNmd2MSeYsG8p1SkmuRnzH81kC8sLDYyQgrfdmDfHhmGQDcYhG1vepTLJqXwWBnXXuTWdsv27xxNDQz86yKsdb6Sp7Ag8SLTceTDZnY',
          publicKey: '02346de861234888a0767bc68d1ead59c4d3701e2abef3d5305b359b75e9f9b6b4',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GgPGALJNisjXz4ZPkDSqxW21684Ziua8aJWvVPJLvrMXrK2h3BEJq9r11e6MNspgDB4G6W5iiUzgHUmXAggLmJ5ozt9USm1nCjt8KkeGzE',
          publicKey: '03d37d4b2cbc16b7d086521398119281e42ade5883732913ae0e47f9796f23ff56',
        },
        '10': {
          xpub: 'xpub6GgPGALJNisjx1fbyx6JhSVyPA47YvzCm8dNrLddt6s4KdfSPpi3YS1BJjeFsrosj9jgw8jw1V2fzA34gVB49JFJziBL1HvLn6CigxkdN3D',
          publicKey: '03e515eaa7e509b0ee44a57562ea64617f2affeb316ee0eb5f7c1a84835ebbe7ba',
        },
        '2147483647': {
          xpub: 'xpub6GgPGALSiPQhdvTSaF1aW76UGLv2aEcZbyTbRgYkeuwd5SVMTXaFzq5TELB3woJy8iDTjqJ3WucC7nXDqeuXf5J6GqE9wZJUwyN4D5uaFqC',
          publicKey: '032e31e31fc5ea5b16d9f0d3b0335e790c3ea7759e0ca4b7e59b1796bee0a03264',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1edn4fhtmu2k4cf9c4z6lf5kna7q8t2t7xwg63f7ng0sf5zzrw38s5dvwy4',
          publickey: 'cb6754dd7be2ad5c24b8a8b5f4d2d3ef8075a97e3391a8a7d343e09a0843744f',
        },
        '10': {
          npub: 'npub1mzykz9wqyuy93u0szc7kl7qz3yz57ptrugjc85xeyr8hs5x95wyslkn2wl',
          publickey: 'd8896115c0270858f1f0163d6ff80289054f0563e22583d0d920cf7850c5a389',
        },
        '2147483647': {
          npub: 'npub1562zks44ujl8a6slnl6txdn5509jwmu34t6w73wne66pfyvxwmasy8hwc9',
          publickey: 'a6942b42b5e4be7eea1f9ff4b33674a3cb276f91aaf4ef45d3ceb414918676fb',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xfe9d310b045b06a963aa9d955867d3483323576af054b589995151c6d50f593f',
        },
        '10': {
          publicKey: '0xec93e07b473038aec486e3f7f3eb204e7b77a877c8c71dddd2a47c2660b654db',
        },
        '2147483647': {
          publicKey: '0x21faeeab1f77ef04785325f365126773f0efb21affb5aa42003f40687bb6352f',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '02a05c6bb759de0ca57c0dbaf2727a0a8ced7b43972198be2f40f7f6987c0212ae',
        },
        '10': {
          publicKey: '034bed16fa979aab0847df1e83b60eec550fd8a66ba36a5dd52a7811b48be7fa82',
        },
        '2147483647': {
          publicKey: '02ba4e0dfb5144df80fca99b60bd4f25b04dcc7ab3aaa0827337f657a903c742bb',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '068221b7c674985c220c296f435133f56fc0ca459937e064db6e35f4613f9845',
        },
        '10': {
          publicKey: 'a1e54308a06d0143902b57bb4cd8586d3e7fd106d15c94790b0a25f45d73306f',
        },
        '2147483647': {
          publicKey: '6cbcc66bbe9e6de2c8b8cf0879933289559115b67df6f58b80c51e57d1938869',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
