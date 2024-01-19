import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase18-empty',
  passphrase: '',
  passphraseState: 'n1xWjoRozJunfJ949rNixAWMCh4Vwj4L9j',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490322',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qxpfn67w6240s7dd4j2gkynk6073dqc4cxhtdqzkusdnwywutwtgsjsqqdnefjtfeh5d62xnvkn0tch2urmxqvkmnzvqtf8mvs',
        '100':
          'addr1qyxc0dwfn6xtlw8wkptlcmdthxk474zt4ax8n74xmac00dkstygsyak2wrt3s87fxekssngue2lnl9unfwxtfgd9297srr059j',
        '2147483647':
          'addr1q9ph66lsff6mhu73c22lnpl7qmx3f7z5l5nesu85z9jdvkf5e65lskad87286k9e0ee4sfvpl4dwcykkm45724e7wluq7tdkps',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'O4MSHA2SXJLCGPV3JNWJPGTH4ZRE5KK6UBWCPHNXC7UGZKZ75S7SAXS5UA',
        '100': 'K4G5GMCRSL4GUEBVUM2AYJAWJ527MOBKDFRWWQOS5U7VR5SBNYBEULV7RY',
        '2147483647': 'IICCHJTWP2VCJGQY3DUHP5NGCNS2V3FCAPQUDV4U725EYFX2NQW42YRRIE',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x9d98bcd204d8efebfe6e38a25f46454ea82eac205ad0a6cbeec4f4537e7f21d4',
        '100': '0xaf748dd9e163fbb8d38ff0256c1e283aec76162a36cd1bd86bcc98d648747440',
        '2147483647': '0x5387fe0f3bca7378faff0de60b61bed6ee04a7d0f25b985330bb998ab07eabb6',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '13ynC7G2kfLGsmga6T2M9veefooQYgd9kj',
        '100': '1f2RywQ1WpDRvYZs8RibmfuwZmV1oepe7',
        '2147483647': '1NKzZ2YhE9Eq36fgLzQFymb3e3NiCmdf29',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '33M68LM4oKdwShwVGrQWZoBksfEm5SNLMj',
        '100': '38BbrRPMLEikp77LHANV38sFcVi54fXr32',
        '2147483647': '3LP8q4NiSjAvJWo2R2AvWgkiLEAfD6zZKb',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qvncj7d9lxfn799jrlza3lerl3s8w4agp5umhyn',
        '100': 'bc1qrdzu2f7ac97tq9q5kqusc239nzjcclg055wetg',
        '2147483647': 'bc1qzru7mpwf48jq5kv6c8d0jee5wj0a546n6vuqd8',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pl7h0tjptf635ypj4ertg2925hqz49g7mqqaqw4ehq88fshm74x9qvumh06',
        '100': 'bc1pr8plp5dvtq670qxzxpzmyrzpg8cg22r70s3nmnend9j4cck8dkmsmerdks',
        '2147483647': 'bc1pchapxfwlde3ktc9k34j94pt6hyq3p35y6yftzmh7dz3jhlegx25sfalenj',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Doge',
      params: {
        path: "m/44'/3'/$$INDEX$$'/0/0",
        coin: 'doge',
      },
      expectedAddress: {
        '0': 'DCYS9YJSfRUQte9xRETtmUFZyhYqbaRGZQ',
        '100': 'DUDXUGi5gYfBMMkLNXUfvBLFnMUxvbU919',
        '2147483647': 'DSfw2At21nUUBeFE2fG3awEEm2ukrrEkTf',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-BCH',
      params: {
        path: "m/44'/145'/$$INDEX$$'/0/0",
        coin: 'bch',
      },
      expectedAddress: {
        '0': 'bitcoincash:qznelvvcqjmq6q8a9ft3wgtjc5szsqs0fccrxll2zd',
        '100': 'bitcoincash:qphrjzcsvq9409ktzhtfxlp2tjfx2zz3yqr5dnge22',
        '2147483647': 'bitcoincash:qp0wlwnlfmj2f5xzg6eem87t0j5y4eyk85fz8hkcue',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Legacy',
      params: {
        path: "m/44'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'LYZPXNnP8YDCTgm8UWvsK8DaKh2GrxsWRy',
        '100': 'LNPPD8o3WvwpqXBaZhtke5F7QGDoScomyU',
        '2147483647': 'LUnvD4hoDbzgmxjF3CuW57c5E3Zk4Rt3a8',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: "m/49'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'MG5CQBBzPdidShuBbr1FG6t469VrgzBvW3',
        '100': 'MPzdAryuWJ6Lksqn5tbrWzybDv3SfiRDJ8',
        '2147483647': 'MD7EFtaHRjgbwffBsTFj6zAuJhvn72T8Jz',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: "m/84'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'ltc1q92p7zwy8468pvvjuzmc2xeh2xjrdwtdwafsnwr',
        '100': 'ltc1qup2e2jnr3yvca7gx2g0pkplr0p8nk5pgf4azaf',
        '2147483647': 'ltc1qk5zcf469r0mw64s48v7kz7nhm6r5man4druhp2',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aasmmnue6rp28nb7d4re9jwnwy7hw1v642hagrf1ch',
        '100': 'cfx:aak85szb0790vk9e5h5zkgtkusbd26t76es1xy8wsa',
        '2147483647': 'cfx:aarmf7jcygzjakmk44j3gg0cf7k1gdnmf2kpmnfm3k',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1q2wzy6xrfryvg2wlp4r2u6wrh38dqu30st8gls',
        '100': 'cosmos1t7f6q0r5xfeqf82vllq54sa68xkwevlsjcy82t',
        '2147483647': 'cosmos12058wpqll57m0f3j5z9evwc50wvf4ty92sanx3',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1q2wzy6xrfryvg2wlp4r2u6wrh38dqu30as20x2',
        '100': 'akash1t7f6q0r5xfeqf82vllq54sa68xkwevlslrfqn3',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1q2wzy6xrfryvg2wlp4r2u6wrh38dqu30gs03rp',
        '100': 'cro1t7f6q0r5xfeqf82vllq54sa68xkwevls2rv7k6',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1q2wzy6xrfryvg2wlp4r2u6wrh38dqu30rkwva8',
        '100': 'fetch1t7f6q0r5xfeqf82vllq54sa68xkwevlsp9drgu',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1q2wzy6xrfryvg2wlp4r2u6wrh38dqu30cs5cfz',
        '100': 'osmo1t7f6q0r5xfeqf82vllq54sa68xkwevls6rhhue',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1q2wzy6xrfryvg2wlp4r2u6wrh38dqu30xeyncv',
        '100': 'juno1t7f6q0r5xfeqf82vllq54sa68xkwevlsy28udh',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1q2wzy6xrfryvg2wlp4r2u6wrh38dqu30k0agas',
        '100': 'terra1t7f6q0r5xfeqf82vllq54sa68xkwevls5u78gt',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1q2wzy6xrfryvg2wlp4r2u6wrh38dqu30jwnpzv',
        '100': 'secret1t7f6q0r5xfeqf82vllq54sa68xkwevlssaswhh',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1q2wzy6xrfryvg2wlp4r2u6wrh38dqu30ppkc9a',
        '100': 'celestia1t7f6q0r5xfeqf82vllq54sa68xkwevlsrj4hsx',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x45943E8210A532A993666d4247eCB000b0A93611',
        '100': '0x30fbE673b7B8a03ce3A733535EEfe201E6947F8A',
        '2147483647': '0xfc5a763E426E044E1DDeB56414C0cf6eFA5ed839',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x7cca1CAF49a3af55393f818e2A27911d107D347a',
        '2147483647': '0xdDD872E728643B29f54907bA53b1417cd5d195c9',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x7cca1CAF49a3af55393f818e2A27911d107D347a',
        '2147483647': '0x2095aaE251D337e34Ba284d558D1279B49a36C2F',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1p3sciqlouk7kuhlk5piyyk5qnowgq7cjtn5bury',
        '100': 'f1qm2hr543rx7iq2y354rcssfuwk2bggvq47l3jwa',
        '2147483647': 'f1vzox3lt3c5x2wy6bkezwht2nezfdbojzkcxfkyi',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qz0dpfym5q92sw6gkg4lr4m7x60gtr2und4ca7vu3zc2ge6axdv0xvck370v7',
        '100': 'kaspa:qp5jztxengzq9t036ed9w0qqknej89q92tjjkvlwzez4z6wjwve6w5wk8qua9',
        '2147483647': 'kaspa:qzstky5mqvvpmnycqsudjk9y240rldh4adtmughr0kaplf8psdq0we6qcvazh',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '7cf84ecb4861f9d5b69aea5fdde6ecf8fc05912fed5505321d082a196706dd25',
        '100': 'cc568fe932ac49a168ebfdc65995ecb5b09a088c74c16ad6bce4230a641fcdb1',
        '2147483647': 'dc3536e4e004b38de87a34c9db4110cb5b06d941328f2411bc23f9bee8a9dfb5',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NDGCMZYDCOEMP675KZZRINSQIIEGUT3QICBBHN6T',
        '100': 'ND7U542RGB2VCTKZQEXEOLQ7WNUHXLALHHUKV6KQ',
        '2147483647': 'NBTSYUAEEIENUFIDIOVYKCY7CEEGH2MIDAOREDF4',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5djxkkna7jqmz550y9q8jjfx0r4fy2l0hq9hzhrsh',
        '100': 'nexa:nqtsq5g56gkhgpanw0jz7cjcq435rk529smfyxl3qajqv0wh',
        '2147483647': 'nexa:nqtsq5g5zd4ktn0523jlm6f025c3ajyjuvpj34uwup3kd49h',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '154jE99gp8vNGuDd6wDwmfpKCZWmipzeXuP9QrcNYjzSLdWN',
        '100': '14sQsusugb914Nn2Vq16UgmnSCjGWfgZZKr2AFEXpcLkG9eX',
        '2147483647': '13jjgUZaJM4BWiiGgqPS9nPFfa6V6X9DdAMJB33epaHi8TLY',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-astar',
      params: {
        prefix: '5',
        network: 'astar',
      },
      expectedAddress: {
        '0': 'a12X6rhjbJ14CEwdbd4fB9SRzEEzk9FUc9oVGpss1xskSNn',
        '2147483647': 'Yg2ySGbDoRpJ1jbDVnZ3HiNtzoxNSHpZs7xFTGA8rG9XyV7',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-kusama',
      params: {
        prefix: '2',
        network: 'kusama',
      },
      expectedAddress: {
        '0': 'Ge3k8EVaifpb22YuzyzXUMAVXoMqCFgunVQeDtyUTBQuKAn',
        '2147483647': 'FK4CTeP4vodpqXCVu9Uuav6xYP5CtQG13TZQQLFkHUghCJR',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-joystream',
      params: {
        prefix: '126',
        network: 'joystream',
      },
      expectedAddress: {
        '0': 'j4VPLer8aq59vfyerRGcdUfh9sKbhXR1gBMH6d7fLRj7YohAG',
        '2147483647': 'j4U4M7BYUKHHjuo9W1An7rnG6LLBQu7AFGcFFPJ6chZQpbYQf',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rPU7TRcdPT1ZpXQsHuGMMzbPSZNBVcA6vL',
        '2147483647': 'rwq8DM2mgC4RibEbpk8FDftP5dzFwmy4my',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '4xLQ77GtwJ1FT3dTHb1j1UhksYh5r3DwJFucQBT6Aovz',
        '100': '5qUJ1i5bG5yymTWTFCg7uT8Yf6KdpzyS7GWEPw6nymGJ',
        '2147483647': 'C2kY14UB6ccHAJBBm8rGW9n7k6HAE7tnHRvqbKfXY1Kb',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x38e2acce472dbc8a05dcd0a3d62a4db0',
        '100': '0x7e73c74dd8aa1631f47fd0e1f30eafb9',
        '2147483647': '0x6998f224f068cbd3e18d1234b02b217d',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GDKJHQJZKQ5U444UIP52A6ETFGFTVYU2LYL5FYHZC3MXLZCI7E4HVT6T',
        '100': 'GB2THKRXYGQLBKPFFTGOAYPTRSD6WTQM7ZJFFTTVFILRMMLZPOYFVFHZ',
        '2147483647': 'GDTZZLVDUUOSCJNGYCHWLLOLMRJ526AWBD7KCD3RATOOH7QCHSJJYNOS',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x05fe4961b0f3170f0f0a835289234d80dfe7ef6556e8ba2a77b0c06005fd3d1e',
        '100': '0x1892eccdef0c7ac212df025b60b1f21b4a33106cbfdc8a3b6ff449d2db98e65b',
        '2147483647': '0xf6c22f2070271db1ed4424d37a441b085f2b8227904742903f11d17318739580',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TFMu2DfwQruh2haBhFBUGzpja96UbqZBtG',
        '100': 'TMi9Erzr9Q8zNqYj1K4zaqL4CBsiB3FVpc',
        '2147483647': 'TXY2yvcT2aJHiyMk5iyjp2UrvcbtDLDZ8w',
      },
    },
  ],
} as AddressTestCaseData;
