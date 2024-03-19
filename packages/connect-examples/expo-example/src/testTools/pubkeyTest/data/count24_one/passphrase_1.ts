import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-密语1',
  passphrase: 'asdfg7890',
  passphraseState: 'n4kk9unKaT8HBt5CgnarZLZSMyhk2SrsQE',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162869',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            'd8f950e075473883d94d286ac9f9893275c15baf06498a5d827e4f7ea8ff43300cb0fc2e1511f3f8757075ef3175fd14c3e4782fbc13b2073f4303d24ef77003',
        },
        '10': {
          publicKey:
            'b0a5810b2d7f14b3c198176558fe1234427db1c22538ec475b7dfcde740c3d63bee3321a8013dda4362e6c2bc008ecdae101ea7703d638d98384378202eb640d',
        },
        '2147483647': {
          publicKey:
            '0b0dccbedfca6250c474baa5e940c7aa9a0f68a16831b1efcdae908924a99d21f5e6263187f1cb9c10a397cae47a79da6339b98318337f09e714c221579e302d',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '16328a77c23f15b22ab5402a6e3d8b9c02d92701560d002f26cc2aede1327e6a',
        },
        '10': {
          publicKey: 'b70b4d599ce93aefd60bdefbf3f7bbd779cb86f6d6a65e0ada9a967952d7f2db',
        },
        '2147483647': {
          publicKey: 'ad4ce5c1d7c7c4072e68b19858b40757da7764505bbbd7e10d671bfcc94a0422',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03d03ced3231541169979861dab50010419d2ba6ea6d8963b2a63271e27126a840',
          },
          xpub: 'xpub6FZKzFURDCbNYTtoZLddLh6wQaBYU8u7D3imHEZnJFnbjGzBMVRmT6qu4ehmf7EAhaJV6Matk7wbbchsUFeku1s2b2HdiEQtZkFfBjvBhpF',
        },
        '10': {
          node: {
            public_key: '02abd39b3194e922afb04348bd35d01bb1d02b3a132549ff306b95cd8f7b823255',
          },
          xpub: 'xpub6FZKzFURDCbNxdarq69M82E61megqog7nESumNj3WLiokMcwdfnMjF9JpEEp9P2pNs48bMycqK4Fw6dbrq9e4M4SabhvdUtPMUajZa8Rk88',
        },
        '2147483647': {
          node: {
            public_key: '02a685a726b50bb28dbb979177c1ffe237754656f884d26563c544a575d6ecfc58',
          },
          xpub: 'xpub6FZKzFUZYs8LgATP6WsJXWGUvNyZpEP2tbTK2S4mpKBD74hCyiVMfaQZXpLsrmwLeyr1HTqASraWy4DJzF5pocGD7K2NJBn1gJ6vvNa2mm8',
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
            public_key: '030b8dd210e5a593228a2b333f8c3fb67528fec63b3f26a038ca389a3b820c84b3',
          },
          xpub: 'xpub6DAR1Vpbvfv4NXmpMGUznPLDKuiwqW94HTdhwvLFX4QpvRmPurCJeumXETf3hq1PfaA1ppf3KfdBYP1ftBe1BEyPjukJ2HUbFj1fyFxfuTn',
        },
        '10': {
          node: {
            public_key: '0388c4e37ba18a561cff2ccb727be3f79a6e40f00739a35fcb8356fe37bc1bd9b8',
          },
          xpub: 'xpub6DAR1Vpbvfv4p2PuqaKUxLBR9qtVKse8Y8go2DaZneHzUvrPCogAEsXbbtKDZK6g4vmk4fskcEcm396KmqXhW5vYT8HdkUiTTnQ8b5Vgus5',
        },
        '2147483647': {
          node: {
            public_key: '027924c43d45b9c38c4bed90ee9a44a705131ecb5ebc90d4d35dd1784ab4c63853',
          },
          xpub: 'xpub6DAR1VpkGLT2WBXjweAqkTFnF8yPPVewtC3S3LwL4V7mZkMU88Afd76AE7CK3pEmb2ETmHMZFraag32gvfE9THYh9FgvHQRqKNVaYHgfMWm',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '02d3665af442be1c832838612f435f9606c8fe61962867c7dbcbee584ed864276d',
        },
        '10': {
          publicKey: '023fa118cd37d13b45f7e06838847eaaddcb133d5565329ea72b30763a8ba43f95',
        },
        '2147483647': {
          publicKey: '02fe75db5eebc2dc655514b75fff9149a7221f6acd313227a07f9220607475fd02',
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
          xpub: 'xpub6CxQt11HqqGMotT83MVLS6Rppgq6ZRsQUHWsZ9C3obCkU7MHiiqUnJdT74EMv7ZSDuXg9dMuNPJgowsHfcYAg9Ag9o53b3D6q9ySU4RyryF',
          publicKey: '03b77ad8974356e616123ab8ef240ce1d244ccfc132a9432183f778c6736d90296',
        },
        '10': {
          xpub: 'xpub6CxQt11HqqGNDdGgD3UbwtEkzt537wLdib8p2qMeRpZuzDpg1MHYUncUGbMCfGMXcuPTGnj3pf3a1vjAfzoieRnUVZYC7AyKwB22tat9mFp',
          publicKey: '03d5b3ab7b3739b6840238b3a994e04127cd6afa646e703a2af293b44744099bac',
        },
        '2147483647': {
          xpub: 'xpub6CxQt11SBVoKwKEyb1muRBH23oFrRbhMkqrhataSHQXK5A8DCVyaGDXR3sTcXhWFsEeqk58CJenjEuSYPiGHNLLTNj8cgCcjTGuD448UgJL',
          publicKey: '03c263c44b16f482f09eee27055764b2d692439fca9b3f7f6be9e7d0e1dd85fe8b',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6FoVGu5AGoctTiKfC5WfY5XSW6sAoueCCC8mEPbaQPkjmo4imQZcnjR6jtPqmYJHdcYqpTMTXAxkJPRHC3vVFjZ2v6pEZJUysoHH3FjRYJt',
          publicKey: '034ca842d84d9b8228e679c2fb8842778c736e7cd2001790b2772ed7c12e623188',
        },
        '10': {
          xpub: 'xpub6FoVGu5AGoctuJjgtssxZNfL2Z7pXygdrsnugrHMXF26Uu4SR4g7DuHyCUVkYMexxrXc7RpXDs9Do1mYnRFtJg39BUxJmetYra3BEndRZVk',
          publicKey: '026fa312953551564cfa5133413e61fcbee6d4028367b9bee886ab9c469ce6278a',
        },
        '2147483647': {
          xpub: 'xpub6FoVGu5JcU9rb55XmFXVpUXrPR9gTBPhmSLoUe7FSCuGrRmq1udA8WCLLQisFc4egNg1xRENSPt3dQ922SeMJWLD8Mora3Xhivoan6T2x29',
          publicKey: '0205b1d4af2e2a22b6db88847a54851f1dcf384d1bd120cf5daa8c356a8b824f0b',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1dwh20lwmhmy3np3w0e4nn4mw8szgdkzl3pwfcf8tx7vera4mqceq37funy',
          publickey: '6baea7fddbbec919862e7e6b39d76e3c0486d85f885c9c24eb379991f6bb0632',
        },
        '10': {
          npub: 'npub1t3wy2lmn2jkjkquhcu0puftdyfqgs2h3gq0fu797ccjv75dewp5spn9vwz',
          publickey: '5c5c457f7354ad2b0397c71e1e256d2240882af1401e9e78bec624cf51b97069',
        },
        '2147483647': {
          npub: 'npub1yvvcnkpn2kasqw3a4wwh39fuhfajga8ctujseajc4443gphj5kss5g8n0q',
          publickey: '231989d83355bb003a3dab9d78953cba7b2474f85f250cf658ad6b1406f2a5a1',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xec2a90e9227af944fd084467d8e6d8015750e3d587f28ee57db0a916c194954b',
        },
        '10': {
          publicKey: '0x95c7fe291c22534a650d6964ea4cd1a0847805f598905759f98f7fe6a040eaaa',
        },
        '2147483647': {
          publicKey: '0xe498fe1ee3034092740afbaaadb50105e98f17e925beee53a8ef06246dbbe7e1',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '02f686a75b19559cf06324cf4d66016acfbfa3b7d108e837c18948e78257bd4950',
        },
        '10': {
          publicKey: '034f0a049e4126264694fc46de2b0a01b5590b3313af08476657603e1d56688332',
        },
        '2147483647': {
          publicKey: '02a53c12fd42b188ae95610cda1313b8d5902422f4641e742f88e3d10bc99e1bb9',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '789b942372ae3c6357f05816a14ac802c503361fdcfc6e14b3b3c196ad2f9b6e',
        },
        '10': {
          publicKey: 'becb190dd9dff9e1e845eafd59eebc9176918ded931970fc7a996c0dd127085b',
        },
        '2147483647': {
          publicKey: '18afe85dda33baa6f96bb202a03cabcf2b9d968bf2d9647cf119b4667ef195d6',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
