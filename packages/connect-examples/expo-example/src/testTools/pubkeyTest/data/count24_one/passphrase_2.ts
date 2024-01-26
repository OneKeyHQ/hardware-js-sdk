import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-密语2',
  passphrase: '$`%@@`&^~$',
  passphraseState: 'mw38WWF5QNSdvWKiZmHQVrPrada3ARc8f8',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162869',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            'bc5345ee450f6a85efbc86e26d5d94ec26390f09290c87f67fc060dd52411eaed2f5291189128b501d8b43ae69bce831dea073d861aa0480abfbf2d42013f51d',
        },
        '10': {
          publicKey:
            'e2b375d6a338cce0cd579398a6c0812f32f3b53b531387f18d5e444dda6cbfc4532c3173695a38ca92ea7ebc191065c2826bffbe41a0289b4dd5865500455078',
        },
        '2147483647': {
          publicKey:
            '3d6c94ea5064d6f60ac344acad3a4d1eff751cb68d9115fdeb847650cd9bd701fbeb246f6ee07b30db7f1644a48391bcb0be73eae4ef220bebfb405f006d6a4d',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'b8df192deca92596146068769269a25aa2b34a45261b4e62a4cb4da34ccc915c',
        },
        '10': {
          publicKey: 'bd7540d3f09794a5a7ec179a8ef326f4981443f8afb89cc6c2848be7b8cb928a',
        },
        '2147483647': {
          publicKey: '1ab695777a31ae0a9ade14c72640a8e57d6422a3612dc37d656e3b1101b0b28a',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '022747c662b5f9af3470f7b85d5dc860418e949912b8bf3155dc329dbbb6552eb7',
          },
          xpub: 'xpub6GvXCPvBemyEHzQ2MRXPXR88cPX9SdwA4rDqXY4ifPG9u6MFAqVyAEutLAjmoPEKwSiJGZ187RL7xrJMGNC1obyQXcoVcgHteai5ifVR89V',
        },
        '10': {
          node: {
            public_key: '03b0635a260bba55932a80c8cb93613fa64294621872b72b577c0fb128df53b7cf',
          },
          xpub: 'xpub6GvXCPvBemyEkeeLxrjotbing9UPsoZCgWXvTWMGXnN2anxGJU47pFCVTMBtHd6kDMno3oemr7SxBhJLpN8dHYVW8JAHXb4C8GCMbX4QB6t',
        },
        '2147483647': {
          node: {
            public_key: '0235c9d7affccbae9879b84d8281c9582912c66e72a0e92d71bb9ac17ce67ca794',
          },
          xpub: 'xpub6GvXCPvKzSWCRZrKGimK9aLRE5VnmRWdxp8tqewo1VKj8FMiRTuYbShZQ7YV1vHy5SgmWoC8Ho9rHcj7ynDJt5dn5Wq531ksZdhKuYFMwh1',
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
            public_key: '027b7964b4ef42c33853881d6270d9e31e97a2dbed08e425fe7fc39a8dc64dc38a',
          },
          xpub: 'xpub6DK76CAhTqktsioQ59wcdLehUAFa6v3pjaF45SKoFkZtwLnQ5qVtfRZch1azLQuYrnHJjBaspaxm1sEuQzhwmZfyUavAmMcNYm8mxSn4swn',
        },
        '10': {
          node: {
            public_key: '0252f5cd8bbdcfed05ff90052c0d835ab7073ff9dae2ac12c2a25f9837e438fb0a',
          },
          xpub: 'xpub6DK76CAhTqkuK2CqrCqGNbE1bXQ2QBYWwSgsdYHari9EG5m1jGcE7KkkctV9sfLJmyc8kAJz3SrLL7bGvPyzYNAMWy1ckuir3anXmago5ca',
        },
        '2147483647': {
          node: {
            public_key: '02ebd0904e569847fafaf9808dac7bea2b03824f6c6a319fbb4ee40271e6373bd0',
          },
          xpub: 'xpub6DK76CAqoWHrzvMoUJQuV6YtrX7HR1xR8pZe9NBfpWozL7VWDGW19varjxeKN5KojcVCDnMA44GqDjwR2QMsy6ehTvAuspmtQty5SkUdDaK',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '0279bf2eeb06e85515067e7b2e1c159f746c4da7a0833fc5193ad1323968838532',
        },
        '10': {
          publicKey: '03f8ce93b3b707c3be7d7c12191285a600c21e4c42b62028c3e3e76fa43ba795b9',
        },
        '2147483647': {
          publicKey: '037cb0e5d72a6cf69c7e381c6a6b8183af31adfb2b8db7bb610b2708e1568f478f',
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
          xpub: 'xpub6Bk7cx8LXiwRRw9pbnxHCGPKaJVEsinGHTdyqjWsRR5piPFp1nKGEQrGHZQTSYmnQAadRkdKiXBT7MWMNSTB49qnyYsvxPwymUPJ67FDfTS',
          publicKey: '03695ecbc748331bbc5a05ebc58254af9e80c12abc55d581286fbe17bc6ccbbca6',
        },
        '10': {
          xpub: 'xpub6Bk7cx8LXiwRufwC6P3a4F3H6fN3S9GQrfXMXa7eN4er9ou4XXMn2bPgEg4JGEF45xHTZnEF3PtsxKAFi6smaw93WYPxpstRA8XJDtQv5F9',
          publicKey: '0203b5a32ac632d63fbfb388797fcceaf29f18ad0c142604f92b935f4e9f085c61',
        },
        '2147483647': {
          xpub: 'xpub6Bk7cx8UsPUPaSZ36jcbBKTSqAaZeoMho1PFv7hm366nxiEgdJhxa4FePhEjRuSGdGPpmrrCbwSP5CrWMpRswbrGGzF9gGheePZmHpB5XtB',
          publicKey: '02a8ddb86f56555df9f071ea1cba2bdacf581515047aa3bdda91705850b5e69b08',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GA6NstNszdGBYgTvLBAzD4FhxUhPcYE8EfDhTgMn7cWW4h1Gnut1uUzb5ufdPhobjyGN6SZvYRsHVZw1M1MWs4HKfM2LqPwYsLjEoPjc15',
          publicKey: '02f79669ebeb7e576fbd3e815d36256e3abf2dc3544324e9c2d0240794d5e972d4',
        },
        '10': {
          xpub: 'xpub6GA6NstNszdGeUPyfaYo51NEhAB3wuiA2ywapTKRTLhEXJXNqWY7oAc2Zhg4G84dQPvjTawNa4pUjPAupLjaWkFt8udvt499Km8zVQXzZzb',
          publicKey: '030803dc7455914cc6fb103eb2ec4b957b0d562c25fae4f26d189234ed7f37e970',
        },
        '2147483647': {
          xpub: 'xpub6GA6NstXDfAEKT7rPDckUkUBaYfRwykVm7PKiNM9aGVs25LW9RbNNZVDoQvUcgsLgNmCQedG5kEWXyAZpwFFfSwmeesR5qUjNsBzctogTtd',
          publicKey: '037cb02c28a7ee571b49295b11e6ef21c756de36fce382a2062ba1fdf888bb1b45',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub10rdkd8pwc9pyg997upuk4n49uf330340vmu4dvzlwdql89fnfdwq6ujecf',
          publickey: '78db669c2ec1424414bee0796acea5e26317c6af66f956b05f7341f395334b5c',
        },
        '10': {
          npub: 'npub1zprykjw3fdag24znwq5r68dnrly66f6exzr4cvp02vyply362alqt4m62g',
          publickey: '10464b49d14b7a85545370283d1db31fc9ad275930875c302f53081f923a577e',
        },
        '2147483647': {
          npub: 'npub164a6umek7g7x5k54ujss65k7wsctaecrsnp3gne9c3s38v8aj0ds0aayhp',
          publickey: 'd57bae6f36f23c6a5a95e4a10d52de7430bee70384c3144f25c46113b0fd93db',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x2c32d9929af91ed448eb4e1f196d38f6f61fadd481f57a65b6a20dbf29af205a',
        },
        '10': {
          publicKey: '0x9f72d894c5ac9a46f3c6367637fcdce8a818436bcf7da77c285e1a01a2007c2c',
        },
        '2147483647': {
          publicKey: '0xa459daf4c82c8dea0bedd907cd5403cfeee6e268761d0ac875d34f07064d0117',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '0303ffb09e1347f3a68477a2da6c92a24721ca3a3a4274083169f7bf11498d7266',
        },
        '10': {
          publicKey: '02563a1e810cfd446fa2154ee506fce247053b99f581e5e0be7a535b6ea77aef62',
        },
        '2147483647': {
          publicKey: '02119ee31a5a0e2ca24ab849a4352e545b7c7487983f2f977e582fc2d7d9edd185',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '265e9972c73f34b2b09e778dc2173bf15fcc14f78d36467ff0827307b9749a07',
        },
        '10': {
          publicKey: '1c7269e1b1626aa4412881fce2343acec92b18c06fcc696ace71aff4dfdb98cd',
        },
        '2147483647': {
          publicKey: 'd3115bc66cdc6eea17b4be6db4d731390dd02c19bd3363460dee908655a0ffeb',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
