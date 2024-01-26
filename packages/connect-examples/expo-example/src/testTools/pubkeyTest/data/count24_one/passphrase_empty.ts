import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-empty',
  passphrase: '',
  passphraseState: 'mgyRVtXdyGcWA8YTbDDPpMCqDxr994sZVG',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162869',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            '1144cf8d79ea63cb2e6c05ad15bb20de89ad9f188868576b54ab594fc60809a88503ced935072e5d5aecc4a10764c4a8414019962ee79d74857da0035073ebbb',
        },
        '10': {
          publicKey:
            '946676b8c4dd081f957f40630c04fee397f92f71ce65e45e2806e59616c75e2ec1e16c4379a84bcb0859462b08b52df17edc0efb8651952975fa3c16ea1ec453',
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
        '10': {
          publicKey: 'dcecf26ed85d65c4ef0b0141fa49ae733abf589fa667ba8d4601dfbc546773d2',
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
        '10': {
          node: {
            public_key: '023b6146311fd0a3ed25e0ac13c22ff95e3f29aa6fb577ed06e5355f0bac46bb19',
          },
          xpub: 'xpub6HFjgAJLL6sqcaWv5gaxNpzhCFqGeKDG3ktc3pAeudZi6whr4tLWBWpUpqx7KUfMd1iFUsVtbsn7K6Z3wQ19mxmwimg985nvzeFJvunM4y8',
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
        '10': {
          node: {
            public_key: '03dc8ecce46acf842fbfd8a08e11e6d78f2830215fb17113fcdc2d7ed936278f48',
          },
          xpub: 'xpub6DHc9oLtDxsHjH9bQPk3bDT5zaE4WqMjQHX1QSZ33Tp2Jy31Br3wFXjTYTGcSmVc37zp4vnZcWE8AsD3LE925dS8k9xVyDWFDASpv8fFk47',
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
        '10': {
          publicKey: '03a97d887239d3bb91f1b686d2508a65fc482d8c471d3f4dc7cbe394ec58a35142',
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
        '10': {
          xpub: 'xpub6CJ2ELqT6iSdQkQzMd5MZegSu6GWR8PYW1Y7dxpwDj81GRyhEySa6HWaMgMMgMVUPyPPSmNv9UKnFroSBNuqAr7jkzV4ANLXiRepKdQzjyZ',
          publicKey: '036f28b2a34fa57ad38c83874c2272e7f97dd09750d2a305cf29c6e254888443a2',
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
        '10': {
          xpub: 'xpub6GyVbgG81zUdDSb85X5Nym3bya6fPgxeKczKtEsUJ4kFxehEwSMyUfTU3BYYdCPyafYA8GgvtkzUMQiYhRLXoZafHRf9u8YYbY8BRnmyP3H',
          publicKey: '02c84a6c72af124f1f2ab3e7ec524d69c4967470a3a43c4176d0e33945a0362efc',
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
        '10': {
          npub: 'npub1r0sjsc7juzzn9vdwpxkc9aqp2d9g46h0yzfnmu3vu2wm3pvf2gmqamjjy0',
          publickey: '1be12863d2e08532b1ae09ad82f401534a8aeaef20933df22ce29db885895236',
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
        '10': {
          publicKey: '0x931c9c21e81417df4692d533307b87f7f1ac938a7ba55d6d674e7dbd0a312cc8',
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
        '10': {
          publicKey: '03a6886e9d4cf40d8c0662cf2a2bfe56495bcca158d699c1d9821a9ac71c4891ba',
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
        '10': {
          publicKey: 'a6b4ddb0436729d512f204d937725486488f4ec15e7b5365af9591fad014c2f1',
        },
        '2147483647': {
          publicKey: '663ab2b496e0df725e25eb233eba7d5d29c27cc1d1ea6e2525672648645ae965',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
