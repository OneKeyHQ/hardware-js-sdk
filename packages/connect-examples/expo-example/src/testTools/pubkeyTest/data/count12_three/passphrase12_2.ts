import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase12-密语2',
  passphrase: '11111111',
  passphraseState: 'ms8QNM6uuo3zbo4SM9YqrsxPRGv3b3HmuQ',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/427983033',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            'a528bf7af375637e8d3c5ae95f6c29e8c04f04f6c105efb42b74839511a4fb6cf63836364c41dbdc73a86cc74eaabe153af9f7e8ce2a1be9df13c6f6175e3dfd',
        },
        '1': {
          publicKey:
            '550ac6c13e120f5f0bed980cd103828c1b5d065841dd584f7db2edf641e1ff5797fc50e966966f6407c8f2ba05ba1c9314b5f367684e0b82cbbd432c78b940dc',
        },
        '10086': {
          publicKey:
            'c992c846071c5d72eace9aca3e6827b137e5dd2522dae0f6572e0701f6fffbcfb8c2f5824244989f5717a200f61fdb8b83e69c10d039ac0618fd3148fb336ad2',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '91ae7a75b0157c9fc1a8d94cd8c9533a79664e090b5a316622d6f9e06385a0fb',
        },
        '1': {
          publicKey: 'e89766f542b328757c8f94e41a7eb29b6414154d40d996fe1f2a3f0ef25d8696',
        },
        '10086': {
          publicKey: 'f5defdbd36a57a5313014f0ecb02a1114140cf4ba6822d086553e0ebdd732b9a',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03a09e322ae17f66bb12cd871cdbe661ac554097abb69b24f7e691cc352c88e3e6',
          },
          xpub: 'xpub6FpKvhDcJ4ZrbVPTEoC16WTSTDb1S1WqcHyCuPidAueBh5HHsP7cBd5iYoMy723n7sNpWezySJXdXFj7mwxFw8yjfhJEMWDhNM1NgiMM266',
        },
        '1': {
          node: {
            public_key: '024285b1943997857f8f73df0c39b9e99df51a4c02b835e97ba8b747e26caee161',
          },
          xpub: 'xpub6FpKvhDcJ4Zrckns6myunnScBdHR6Rbs5LNLeLr9PNA9um2CgkwDzLRMtEgxBB28QrwofjixGVz4Hx4xVbQRc4ocENiNkT2v7EWV6ub4oHP',
        },
        '10086': {
          node: {
            public_key: '02ba241fa0ca50f7405f359cf106e80ee10c4ef0ebe8b788ab05a5c7d6b6eca2b8',
          },
          xpub: 'xpub6FpKvhDcJ4hVncWRLHj61fz153K2nHkviMXpR2JXJ6gci8CYGzLJMnCsreMKo8WrXAfETeh7bRWNgumgrjBar8dhDSPzXo5dAn9ExWdL5FZ',
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
            public_key: '03c7fe12c8c2e666d764fee822f1897b9ec1f527f3a92c252f0e24c320c1bb2f69',
          },
          xpub: 'xpub6DRippbeDX53mL1xAvDqK8PZ1LxnVGBH6RzExkDALhnYbGMQtff6LjoELuN8aGJ2s2oFGEV1TTDKbnY6gDDmp6Pz7hhpmG3krA2ehUWWjEL',
        },
        '1': {
          node: {
            public_key: '02050d6e50c5e6fe4ebef867c18913ee7cd32eed8ce791f8be2eb4c667acb466f1',
          },
          xpub: 'xpub6DRippbeDX53pqzvspNQ2vE8AwrcJ6QFoYra1TNhUGQzXZnWEGdynzY8iUM912QpoXJJtNX8Gy6eRxBnBdYRhTayQms326L6UYDnzbfi84A',
        },
        '10086': {
          node: {
            public_key: '0323217db7411bdfce8561d11e9be8b1f129bc49ee6e68dd002b0fdf94ada9706a',
          },
          xpub: 'xpub6DRippbeDXCgyS3cPpJGut4cQKqUBibL6WjFmeQBAdbSuoTt6k88tBGEMWVuUb9DJMYtrrLghxp7FfVS2LxJrCJTTtU5V1wmmMokXE5bZn6',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '027d038c42db70bf37be4dd4f79120bd6f45d743fe6e1930b11e7d7a3723003f4f',
        },
        '1': {
          publicKey: '03f5786516d650b45a4f5d7f8291ff12fad0015c0751e6587f010b386ccffcc237',
        },
        '10086': {
          publicKey: '0313a082a77e29aa9fc63611b8f3d36ae8118d1b0b61f63403cede8e28d628b790',
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
          xpub: 'xpub6CGgE98DdnwrCDgEWwW3u5j8LwQ7kxzsWEnYEujRa1VyFwPybCzuPFCnSM6EobojSDeCYdhKKNRm4Z3ef1vtYkSfJFFRSsCGy1UMbEmp2Du',
          publicKey: '039355111bad4a197e64231f8eac9d4696821cec8a911600ec73ce5c006037d64d',
        },
        '1': {
          xpub: 'xpub6CGgE98DdnwrGn6ov79npkok7nDLgo2xM6nLLpf6N3uN6VcyE2EngsLiUCqJck5rHebpEMGSNZuuiJHVtyG3x1d2sfZWPSqiPEDm29BojFn',
          publicKey: '0386b7586a1f4b516a94f369e196a58db113381e84bb3084d40282837d141f271d',
        },
        '10086': {
          xpub: 'xpub6CGgE98Ddo5VR5fZ2KEKRLRmbVmKm7kRifMXJHo36asnizJLfJvUuE1ue4eRtd56deXLogffePtpt13fpcgHc9umd7v67pHBEcUPMXyqkzs',
          publicKey: '028e89c7bdb6ae99a9dd42c433a318d9ee061fc50cb1fdd1e49ecb77ace2c1e520',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GostHdarUSgGjjyiBh46NQ3bULebTVh7Z3hRNjhCHNS5EtzsCrztTGsvGGviUFE6kDKt7Qovdnibdb8Ya1gx6TkQPHiku9NSyydZjgjF2P',
          publicKey: '03c114d2d420777ada2d3230cd18be39002d779f1b42f67ec892b8a2f9bd82b45e',
        },
        '1': {
          xpub: 'xpub6GostHdarUSgKyufzcAHd4g6No7rga8WekdxFK8JmmnyWWoQpEvTWnfMzTBesTcYr1BySKMSqJK2wn6YWPEF2qhCuvaCdFL7wW9YrW83Kc1',
          publicKey: '02bb21ae6b3319fa540357e1a54353c4c90177860018436d72e8c6ce5965280724',
        },
        '10086': {
          xpub: 'xpub6GostHdarUaKVjpQRJzQ5C9v2cQ3fLfFjSaf5HxMZwTPY6hSmoP3UMJKuAcU1zRaqjaqq37vqpZMVfCM5Zw9Xsd4FoS5bFPsnGLidqrPHLJ',
          publicKey: '02f3f76bc1a378b5e5fd1c12ae0ba14933c1527b1c192e36d196be2d45759add30',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1t8k6m5agw9lxysh9a7ff0qml9urcs4xht7nzellchngxyjmpq2nqjsjnrx',
          publickey: '59edadd3a8717e6242e5ef9297837f2f078854d75fa62cfff8bcd0624b6102a6',
        },
        '1': {
          npub: 'npub1e4lwa909ehp88sjgl4zgnex32x5jwj5jnqm0h2kxsz7c6r87rraqqt69ap',
          publickey: 'cd7eee95e5cdc273c248fd4489e4d151a9274a929836fbaac680bd8d0cfe18fa',
        },
        '10086': {
          npub: 'npub1lpahe440fn6n8e9kz30zjy8ygwxtmhwv3y5gkkcf79lwtmceaqxq972dac',
          publickey: 'f87b7cd6af4cf533e4b6145e2910e4438cbdddcc89288b5b09f17ee5ef19e80c',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x1fe87d1002f335a1f9b7c36bbfe0b988c4446826110e863b034f804548999452',
        },
        '1': {
          publicKey: '0x007f8ab6c67ec20ea03bc08d798e7821f59571256bca719461462ef30cbeac78',
        },
        '10086': {
          publicKey: '0x1a4e35bffe851f43c53fd3b87cc6826a88b3a45fb29cce76f6ef7055085dab45',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '03615f7af5ae8e7c32c039a7336b1b5ff99fa3e0bf0ddee207184346777db5828a',
        },
        '1': {
          publicKey: '037123dd56a85073128d81e0b13f9e5b83584f196d408e7c812d0ff3fe77c90e49',
        },
        '10086': {
          publicKey: '025d5e538bf56902802c2536d14072a51051ab21f66d14008d0e54be2693f26339',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: 'e9c5eb5bab97f0cb9d3c298431cf556103c68988dfcd141c412289c67fde3294',
        },
        '1': {
          publicKey: '70e5453d336cca53eaa9f2bb57ed0b20b69a2840364023b09054b0428aaf8ce0',
        },
        '10086': {
          publicKey: '25e3059d2e0fcdce072a37efb3f8c73ef8e5269503cb9559cd3210b903ab6ff0',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
