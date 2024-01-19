import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'two-passphrase18-empty',
  passphrase: '',
  passphraseState: 'mgyRVtXdyGcWA8YTbDDPpMCqDxr994sZVG',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490398',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            '1144cf8d79ea63cb2e6c05ad15bb20de89ad9f188868576b54ab594fc60809a88503ced935072e5d5aecc4a10764c4a8414019962ee79d74857da0035073ebbb',
        },
        '100': {
          publicKey:
            '525250b1ca85696010fa9fead747b025443d6b217aeb1d631dde6a16b9679542e8838e8b12c7c282a0cc9efd47130622c7b8124c172c2758640b7081e60fb3e5',
        },
        '2147483647': {
          publicKey:
            'd6ff53dd2525cb7c508682fda75ec6bfb285296c457e239653d47b717719f4224d5d951623050343776c2ecb140fabb2305a2161c215c50e0d6fab47caffe6d6',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'f6f6a66ede2a181659116c8832986152ab9c6cfe89156b474389087d6a9cb687',
        },
        '100': {
          publicKey: 'e7d0732cb33dfd3cafdbc989991edfe620df53d102b232886f45bdfd9bcc500c',
        },
        '2147483647': {
          publicKey: '6a4bdb3046086058b9b5e822ae2406ee40f00ac04bd64d362ea73c3e06349856',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '026755b5e820e75844f07af16feff12070cfef6e6d3eccc1e9c8a9520b1795c2d2',
          },
          xpub: 'xpub6HFjgAJLL6sqAqwtdyoz4jJoYcsMBSYQEr669rX2CjRhjXXGgKiwmQYcMgzkuRbbdWjb5mxAea5r7CQxtoqqHeYP68C2DsDCpp92o2FJhq3',
        },
        '100': {
          node: {
            public_key: '0205387166dbfc4f20eba6992e40cfd6c2b0e84d68a3c157fbcef7716732972d1e',
          },
          xpub: 'xpub6HFjgAJLL6suahgu2dQm86jqFuBopc5U5KBN1rSG4aWkJipj6g4myDfjK5Q6Bs1KcoAChyRdkZ2VDj7RG4Y8hjLyGNwEDXP97oQPHR9dKs2',
        },
        '2147483647': {
          node: {
            public_key: '03571a4b45bed1881b7cf687fe6e6662b0eea2f9ae39197770a1fc95c650c1b374',
          },
          xpub: 'xpub6HFjgAJUfmQoJwCzqfCoL5mQAw45i9dcp4JwJtGLfrJQ9hmJUYhoYXoUK6dAHtZgket8FSSxRcVkGiSahdwQrh8xxenH1edcjjN1CbhcDP2',
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
            public_key: '02b95d42f04700a7aab6cadda76fbd16a97d55a9e93367cb86283dba49353cf357',
          },
          xpub: 'xpub6DHc9oLtDxsHFh8jvV7igx8T5uk4NUGuVt5cHwDP3i888hKZWsUXbtYr74osp2CYBe9RkPDwHG6v35GSGxsevLAv5rRYCkyMEpqXxtLfXGh',
        },
        '100': {
          node: {
            public_key: '03007939d78703fe941a7e550ed23e9b2f4335f7073252b12fba2980b5869ee520',
          },
          xpub: 'xpub6DHc9oLtDxsMfovuqSaHM6DaiLsQvadCPcp6DubDeT4sc3iR2NWRS5aNTtZc9BqTXmnCPuSKEReqgRKyG7bVR5vgNhEQBaRqSTa1WHw6kKr',
        },
        '2147483647': {
          node: {
            public_key: '0310e502c1fac3f22d4799175cfcfe05554a91e378dbe66c662d3a00b9111b64cc',
          },
          xpub: 'xpub6DHc9oM2ZdQFR2siYXyy7wsrCUusVZXwHCKvdLceuwYvorQeLmt25Vbgw1EicQi4mZFNAkVGUuKA4R4e39P7XfRjgUHyDfnL2irw9gwsajH',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '0340e585b2249f67bde8f5a5b41482fb6702c2f8e21f002e334172ded1a8680762',
        },
        '100': {
          publicKey: '026c8b08cd8b6f065d438f43cf0a89159a5e98c0920a7f54dea0b35de63051b2d2',
        },
        '2147483647': {
          publicKey: '036ba0113c24c2e8b2ff095a20a829acfc8d68882221bf81209c036fcbb34d1aea',
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
          xpub: 'xpub6CJ2ELqT6iScy7dJV9Hd9HL1y1tkCteTm7Rz8Sa3i929xUNeChusoYwQ6C22Dy1KrN6MH5LYWdWu4V3YcDE2JrfAUxm84S7xDbzjymhbyFv',
          publicKey: '03078a16e26fce81738600356650776519c4c135b04285fd2819a0b6cfd5dc6dfc',
        },
        '100': {
          xpub: 'xpub6CJ2ELqT6iShP2bxnSe5JsUsutzwn2JYTbZxBwQkWkwjuAYG94iuJdEwqPZW5CymtibJb4RkKvHRh4zb8VtcPzWeSdmTV8g5753HacGDhx2',
          publicKey: '03ecda2bff2013fb3b4d75953ca01ca6f48120a6e4f65d6ab31b3c2970fb67c9fe',
        },
        '2147483647': {
          xpub: 'xpub6CJ2ELqbSNyb94y7stNaaZTvSYyt5jpgU94KNwRa3xVr3doyk5mH4Lo9mcPNwYykEcQXZAxZwbGw4ADMs2pMK1TwCfSH1cCpjCTyt3zXM1K',
          publicKey: '02e2ec0f80a62906e9b1f48099aba8cd0ed4fbcf6b4e01a40449a624182d5e3de2',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GyVbgG81zUcn72aoWwFjP52EP3LGvzJMj6aTHjNmeDcCkQvL3m5nt4stNcvpJ15kAynTeePgRtLch7Q48qcGYSBGRbJTKM96aJ8WJDPUPb',
          publicKey: '03c3bada69e322d461795435e5688259c5385aa5d8be544de49773b708ea979286',
        },
        '100': {
          xpub: 'xpub6GyVbgG81zUh94AoUkWEnY3eMATKT1L2PxXVFvQxtQjKNMgkmBUnMaYkH7oAB5TSzUGhm5cxKygEpwQqcqrpZasFSXQQKL8CzVYp4gNbQKo',
          publicKey: '02ca00e5cc85338873fc5f03062d16351ce1af49e7a059db1e63c53c5c43161833',
        },
        '2147483647': {
          xpub: 'xpub6GyVbgGGMf1au1yfnN8P4NJMMUUGGmKpCgqGHAAaDkCLyA7x7eh8HD59NTsYuLEFPXCCgwVG34obDez8AdBtnoBvuLSyKnQbCosNe98hQVB',
          publicKey: '03176b25c8cec5690182dd68c07e0a1aec3c1e5de7247b25d62d91f68d46d3eb8c',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub19qmld6gm5gzaugudcghdx80ryycnafgnwlc8ccjve9p45hzf985qf60nd3',
          publickey: '2837f6e91ba205de238dc22ed31de321313ea51377f07c624cc9435a5c4929e8',
        },
        '100': {
          npub: 'npub1elp0whququfj4utqjadxtyzhzngkgeu2x06wk6tq3pcwgn6z3v4sgnexen',
          publickey: 'cfc2f75c1c07132af160975a65905714d164678a33f4eb69608870e44f428b2b',
        },
        '2147483647': {
          npub: 'npub1dlygtdzh4quhl4vhheldgsefgl0xrgnyk4c6e036gdgkwxz77pvq7cezqu',
          publickey: '6fc885b457a8397fd597be7ed4432947de61a264b571acbe3a435167185ef058',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x0c5aa1f92751887da248be2f60d6b229de11b25f0cb2d4a1074ee7daf47f7682',
        },
        '100': {
          publicKey: '0xf02f210408b58aebcfdfaeb1ddee257a8ac87af410a1a9d7e86089d5b96bd730',
        },
        '2147483647': {
          publicKey: '0x28499086e48f4d98bc3ba53f0daf6b1ec4b447c0f64c9031e7c9d588a86acd13',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '028f249eb7f5602a688f4806f847d1d10fac63427534b6a279c7e2e453ce33de4b',
        },
        '100': {
          publicKey: '02d5d6e43845742541485143645994622605ec24e8104837c5212c7476b5a1e552',
        },
        '2147483647': {
          publicKey: '033e80924ea6e34bf174d123fdb3c2e7072044e77ce65d708ba205cb7133935c78',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: 'c03f93b29356fba9383ff2c513ebf0199b850e24707cd94b8dd1a193d9af92a5',
        },
        '100': {
          publicKey: '02123b40f9e8fdda9a9aeb8c10e87fda1c34891c683b628d3d13473359c1d92b',
        },
        '2147483647': {
          publicKey: '663ab2b496e0df725e25eb233eba7d5d29c27cc1d1ea6e2525672648645ae965',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
