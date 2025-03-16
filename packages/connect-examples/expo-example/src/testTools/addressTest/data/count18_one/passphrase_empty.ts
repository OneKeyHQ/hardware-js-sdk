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
        '1': 'addr1qy092czeq368hk3xqrmyaeqpwhplmzrteanqas6f29huh36vhntzlcgysrdnhdymmq5u6ymr396eukwytgt5at80vyeqf97xtk',
        '100':
          'addr1qyxc0dwfn6xtlw8wkptlcmdthxk474zt4ax8n74xmac00dkstygsyak2wrt3s87fxekssngue2lnl9unfwxtfgd9297srr059j',
        '2147483646':
          'addr1q9s0fr0fn9gfzwf8cgfvsznnsmnqv4d85cswznxfhphet0nf8vrl0n5289zzpds8v59c786tkec8cc6d79rvtcwevtrqkfruqr',
        '2147483647':
          'addr1q9ph66lsff6mhu73c22lnpl7qmx3f7z5l5nesu85z9jdvkf5e65lskad87286k9e0ee4sfvpl4dwcykkm45724e7wluq7tdkps',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'O4MSHA2SXJLCGPV3JNWJPGTH4ZRE5KK6UBWCPHNXC7UGZKZ75S7SAXS5UA',
        '1': 'GDS264TTASEHNL5A7HP6RIANI4OQ5RWQK2XUHRDSOS73KLZMHK3NUETS7I',
        '100': 'K4G5GMCRSL4GUEBVUM2AYJAWJ527MOBKDFRWWQOS5U7VR5SBNYBEULV7RY',
        '2147483646': '5L52IB2WX4JWDBLNWAGOKXRMQ4W6BHOSBBZJVGJXDJE7ULL4PBWSTCOMYU',
        '2147483647': 'IICCHJTWP2VCJGQY3DUHP5NGCNS2V3FCAPQUDV4U725EYFX2NQW42YRRIE',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x9d98bcd204d8efebfe6e38a25f46454ea82eac205ad0a6cbeec4f4537e7f21d4',
        '1': '0x3e6d411d92ebe85d580cc049269771f5cdd15a614b108c94736fdfb0111c413d',
        '100': '0xaf748dd9e163fbb8d38ff0256c1e283aec76162a36cd1bd86bcc98d648747440',
        '2147483646': '0x0c064dbffc1bb20c42e1e1f934644b40cf14784f5ffc95a39a9ce3ef9d291dc3',
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
        '1': '14oHkzgkm29jQCLzt9RVTc77ZDsCRhgRkW',
        '100': '1f2RywQ1WpDRvYZs8RibmfuwZmV1oepe7',
        '2147483646': '16BDWgDfXvhdekKaTnHFS6V7tY8Us4BECR',
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
        '1': '32MH5zU5iAyoCJRSUKy9Lmu8xDvNRNUp7c',
        '100': '38BbrRPMLEikp77LHANV38sFcVi54fXr32',
        '2147483646': '3GEJPBv1KBBsQApxwgXb5TMFrbXMnm6r4F',
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
        '1': 'bc1qpwfg7zdau6s2n4stueaysygqtcft48yxdacx4g',
        '100': 'bc1qrdzu2f7ac97tq9q5kqusc239nzjcclg055wetg',
        '2147483646': 'bc1qk46hmh9xz6cdz4kuy2w9jegf5qda9slf24dsz3',
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
        '1': 'bc1pf5u2y0eacwee9zcw3vmkg3grj639przwgdypqy0yevwrw434yhlqrf00fh',
        '100': 'bc1pr8plp5dvtq670qxzxpzmyrzpg8cg22r70s3nmnend9j4cck8dkmsmerdks',
        '2147483646': 'bc1pxv4l5uj75hv9lwwfv9msc2phr26dkc5m7wqsjydzhk0sl0fay6vq8pl2zx',
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
        '1': 'DPgKfKDC2rhNUm9h7CTEXzQd2MmWaRApTB',
        '100': 'DUDXUGi5gYfBMMkLNXUfvBLFnMUxvbU919',
        '2147483646': 'DUScUSmrGV9AixvdsA61oVKRtfmV6Kfoee',
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
        '1': 'bitcoincash:qr8cmtsg67rnyt8ktm7yrzpygk98zuxr2yd3fm8hsf',
        '100': 'bitcoincash:qphrjzcsvq9409ktzhtfxlp2tjfx2zz3yqr5dnge22',
        '2147483646': 'bitcoincash:qqj79tv505fyuzlppp5x8zs5zacsdaju0vzs0ztfe0',
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
        '1': 'LX5ohvQd9KbieGviBzpj44CTMJ5FrUfy9s',
        '100': 'LNPPD8o3WvwpqXBaZhtke5F7QGDoScomyU',
        '2147483646': 'LSBTpPnqGkDAG8FWL5w3ci86GnnnHhzekm',
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
        '1': 'MRyjaCbZHXruiKzgJvhueLfie54e6GvKpT',
        '100': 'MPzdAryuWJ6Lksqn5tbrWzybDv3SfiRDJ8',
        '2147483646': 'MX7Nacg57Vo3fa9FhYM3dBcxA5hjZhgb82',
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
        '1': 'ltc1qmfarlm9tz682y6tay87wq83jmg7fx4pyazkkf5',
        '100': 'ltc1qup2e2jnr3yvca7gx2g0pkplr0p8nk5pgf4azaf',
        '2147483646': 'ltc1qgyhxy07y0xlxqwxm7ekg6p89lsgarampwr009s',
        '2147483647': 'ltc1qk5zcf469r0mw64s48v7kz7nhm6r5man4druhp2',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Neurai',
      params: {
        path: "m/44'/1900'/$$INDEX$$'/0/0",
        coin: 'neurai',
      },
      expectedAddress: {
        '0': 'NSwx3Pq8qsQddHro2ANFJvjAWbC9X8Q3Y2',
        '1': 'NWCzbazbKRZMZZZDLJA2GpqLY5vtVnhxKq',
        '25': 'NMqC8Xbz24nLg5VMs214yX6WmepfbzboQA',
        '2147483646': 'NikpCMpe8kX77dVDzZPx9g2qFSGTJYW9fY',
        '2147483647': 'Nb4E3bi3e7mJRQRMQHZSBhTjq8FQZRf8KR',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqynt6p6dd68v85n8tah4arrlh5wwhj034s6faunl',
        '1': 'ckb1qyqgt6vvf68mzjrzz9ngyd6uk3yuu8ejheas4v7qqx',
        '25': 'ckb1qyq2lcce9qra3lvrwg3c0vnj6qyurh7j3ugq8uh3lu',
        '2147483646': 'ckb1qyq99ya3q2j2n0sazmhmurd29nd7zhpmdueq2jvrt2',
        '2147483647': 'ckb1qyq0r66dwx4rfhgnm0hyg44slr23ws90dcnsjf4wcv',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aasmmnue6rp28nb7d4re9jwnwy7hw1v642hagrf1ch',
        '1': 'cfx:aarcyb5wggs6e4wy4xhpupjwmdpddjacuu0p6fnny7',
        '100': 'cfx:aak85szb0790vk9e5h5zkgtkusbd26t76es1xy8wsa',
        '2147483646': 'cfx:aapkuhhve7mu2h39mk160gtxvpwk8e6awpeeabsxgw',
        '2147483647': 'cfx:aarmf7jcygzjakmk44j3gg0cf7k1gdnmf2kpmnfm3k',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1q2wzy6xrfryvg2wlp4r2u6wrh38dqu30st8gls',
        '1': 'cosmos1gntfdjfzf4l8lryu7t9frd9jw0220gym0jgtjx',
        '100': 'cosmos1t7f6q0r5xfeqf82vllq54sa68xkwevlsjcy82t',
        '2147483646': 'cosmos1v3a0s3j27aq8atmska7lccwws4hlwz9gwzuz0c',
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
        '1': 'akash1gntfdjfzf4l8lryu7t9frd9jw0220gymzf9vtu',
        '100': 'akash1t7f6q0r5xfeqf82vllq54sa68xkwevlslrfqn3',
        '2147483646': 'akash1v3a0s3j27aq8atmska7lccwws4hlwz9gre39kz',
        '2147483647': 'akash12058wpqll57m0f3j5z9evwc50wvf4ty98ts5lt',
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
        '1': 'cro1gntfdjfzf4l8lryu7t9frd9jw0220gymhfqjwh',
        '100': 'cro1t7f6q0r5xfeqf82vllq54sa68xkwevls2rv7k6',
        '2147483646': 'cro1v3a0s3j27aq8atmska7lccwws4hlwz9gke5mnf',
        '2147483647': 'cro12058wpqll57m0f3j5z9evwc50wvf4ty9jt426q',
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
        '1': 'fetch1gntfdjfzf4l8lryu7t9frd9jw0220gymu0p0s3',
        '100': 'fetch1t7f6q0r5xfeqf82vllq54sa68xkwevlsp9drgu',
        '2147483646': 'fetch1v3a0s3j27aq8atmska7lccwws4hlwz9gal4xd0',
        '2147483647': 'fetch12058wpqll57m0f3j5z9evwc50wvf4ty9ed5hyx',
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
        '1': 'osmo1gntfdjfzf4l8lryu7t9frd9jw0220gym8fmmy5',
        '100': 'osmo1t7f6q0r5xfeqf82vllq54sa68xkwevls6rhhue',
        '2147483646': 'osmo1v3a0s3j27aq8atmska7lccwws4hlwz9gxe0je2',
        '2147483647': 'osmo12058wpqll57m0f3j5z9evwc50wvf4ty9ztwrsr',
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
        '1': 'juno1gntfdjfzf4l8lryu7t9frd9jw0220gymeqts46',
        '100': 'juno1t7f6q0r5xfeqf82vllq54sa68xkwevlsy28udh',
        '2147483646': 'juno1v3a0s3j27aq8atmska7lccwws4hlwz9gcslegy',
        '2147483647': 'juno12058wpqll57m0f3j5z9evwc50wvf4ty9uz7gpd',
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
        '1': 'terra1gntfdjfzf4l8lryu7t9frd9jw0220gymfkjtsx',
        '100': 'terra1t7f6q0r5xfeqf82vllq54sa68xkwevls5u78gt',
        '2147483646': 'terra1v3a0s3j27aq8atmska7lccwws4hlwz9ggxxzdc',
        '2147483647': 'terra12058wpqll57m0f3j5z9evwc50wvf4ty9v58ny3',
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
        '1': 'secret1gntfdjfzf4l8lryu7t9frd9jw0220gymdhuz06',
        '100': 'secret1t7f6q0r5xfeqf82vllq54sa68xkwevlssaswhh',
        '2147483646': 'secret1v3a0s3j27aq8atmska7lccwws4hlwz9gv8gtjy',
        '2147483647': 'secret12058wpqll57m0f3j5z9evwc50wvf4ty9g4f6md',
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
        '1': 'celestia1gntfdjfzf4l8lryu7t9frd9jw0220gym7cemgt',
        '100': 'celestia1t7f6q0r5xfeqf82vllq54sa68xkwevlsrj4hsx',
        '2147483646': 'celestia1v3a0s3j27aq8atmska7lccwws4hlwz9glgdj44',
        '2147483647': 'celestia12058wpqll57m0f3j5z9evwc50wvf4ty9m6vruu',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'Xwn9NH5LaWgVvXrJnfMsJH5jkfa1W8HzWgFB5MBbEjsXFH69HTwc4E1Hb11hqoSJ4rhssJAgj65PUVa8r6otvRLy2ECgR28Mu',
        '1': 'Xwn6uFCBfn2UhjaBntqgDGWRAbotDZySKEp16hC9CCcmaqK8BEeQdHEACDvZ4JindaWjLpTc8vMxuEpJPKrAaYpU1WxDFgAHc',
        '100':
          'XwmgQC3oWb5jRmDLQgRoL59KFyuBisEmNMu7PYLwZgc51bLMRjBfxFFXyhzZKhqx3chWavKnavjL8d2LRXaMBZRw3AGh1NYGN',
        '2147483646':
          'XwodMJJh3SSTbhDjZ9VQaWXdtXgBHDxddUY9qS5HVHoxJqZfT1gTKX9FWCyie2G6fVLkZ4Lsuh9CxhcCFodjukjy13NeuNiQe',
        '2147483647':
          'XwnvxUBEcRaFrVZEwgbpen9YrYCjtaCYmPbwhcwDQcEbSL8YTJAsekc626jnCMJ9C1Np87E94ySsp3Wukc62Hy1n2z22tChzi',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x45943E8210A532A993666d4247eCB000b0A93611',
        '1': '0xEd912165c95DcE41a6B657c613792c78500B592E',
        '100': '0x30fbE673b7B8a03ce3A733535EEfe201E6947F8A',
        '2147483646': '0xC9323a858A0b1B1AD5e5de4A341fe3F012C06F93',
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
        '1': '0x9E473fF37f4a932C1FD1eE20222c50D7FB0e9333',
        '100': '0x4a7695953D0d8a5D1Ab68f6A4A21817229da6Dea',
        '2147483646': '0x7BAEd933814D56420A76ad8E7999eFCce187836d',
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
        '1': '0x1265a4a0699a50285C27b1032eEff44Ba2629e73',
        '100': '0xdD5Ac9687633e5A568229bb78ce1EE36f2234590',
        '2147483646': '0x71242eea580F4e5d84b7fFa9726309736F53cCbA',
        '2147483647': '0x2095aaE251D337e34Ba284d558D1279B49a36C2F',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1p3sciqlouk7kuhlk5piyyk5qnowgq7cjtn5bury',
        '1': 'f1vs6vtyvdnrytabjgdyrznidcn54bt27qyxfqdja',
        '100': 'f1qm2hr543rx7iq2y354rcssfuwk2bggvq47l3jwa',
        '2147483646': 'f126yqugq6pljlvb6peph7nu72skcbf4nm4ufzdqq',
        '2147483647': 'f1vzox3lt3c5x2wy6bkezwht2nezfdbojzkcxfkyi',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qz0dpfym5q92sw6gkg4lr4m7x60gtr2und4ca7vu3zc2ge6axdv0xvck370v7',
        '1': 'kaspa:qqykjawr265mz3g9l0dc4lv5yjtpptc4eht52hlsuqdk92vupm4ksk7tgmtx8',
        '100': 'kaspa:qp5jztxengzq9t036ed9w0qqknej89q92tjjkvlwzez4z6wjwve6w5wk8qua9',
        '2147483646': 'kaspa:qr58e6d47d6zr47x8czxgzs8ez53g24ldjwfuzhljhfg5h9zz8kqku68fcudx',
        '2147483647': 'kaspa:qzstky5mqvvpmnycqsudjk9y240rldh4adtmughr0kaplf8psdq0we6qcvazh',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '7cf84ecb4861f9d5b69aea5fdde6ecf8fc05912fed5505321d082a196706dd25',
        '1': 'bc00221cd9fef19bc58d5656067298bd17d2a2821844ac0f223d90dc5c40265a',
        '100': 'cc568fe932ac49a168ebfdc65995ecb5b09a088c74c16ad6bce4230a641fcdb1',
        '2147483646': '945391371f2857b7026b5886436f40b77e9b9692c1e33d3ac5906be61f7f30b5',
        '2147483647': 'dc3536e4e004b38de87a34c9db4110cb5b06d941328f2411bc23f9bee8a9dfb5',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NDGCMZYDCOEMP675KZZRINSQIIEGUT3QICBBHN6T',
        '1': 'NDJY5EKUYZ5VY3FKVWOI2WNVV2MCPT2XQKGCRXBM',
        '100': 'ND7U542RGB2VCTKZQEXEOLQ7WNUHXLALHHUKV6KQ',
        '2147483646': 'NCRBAYJSIA4P5KSZ56ZJ34ZS7EMWXLUFAVGCIUEP',
        '2147483647': 'NBTSYUAEEIENUFIDIOVYKCY7CEEGH2MIDAOREDF4',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5djxkkna7jqmz550y9q8jjfx0r4fy2l0hq9hzhrsh',
        '1': 'nexa:nqtsq5g5se3shurfwl7rp0ycq2kgjzetjz7hfkydmryzd8yw',
        '100': 'nexa:nqtsq5g56gkhgpanw0jz7cjcq435rk529smfyxl3qajqv0wh',
        '2147483646': 'nexa:nqtsq5g5kmk2exxel95nxuem3pawqffp7rme2kh9ankv7ece',
        '2147483647': 'nexa:nqtsq5g5zd4ktn0523jlm6f025c3ajyjuvpj34uwup3kd49h',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '154jE99gp8vNGuDd6wDwmfpKCZWmipzeXuP9QrcNYjzSLdWN',
        '1': '1WzDNMNPdWbRgqE3MsBUsMJthEHDYLnTGc1nQQW3FiRQNDX',
        '100': '14sQsusugb914Nn2Vq16UgmnSCjGWfgZZKr2AFEXpcLkG9eX',
        '2147483646': '16N75JRpuDUxf8Yb7avCBt3cSwbHsoeyrnEjEFW21xX7CW6H',
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
        '1': 'WTHWL4PK5tECyrYa2GJNNgS87wkVTVPPyNfrpd1MXgrp22Y',
        '100': 'ZoiAsavc3WdqfoM2VQDNC6ufdSjnaqAW2cgEfT38tKBfyBm',
        '2147483646': 'bJQNG8qpfrbSRZueFKK5PNjgNJm9ioaoV1PJfiXLEVYc7oc',
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
        '1': 'D6JjMSBADG3joe9rRdEEftABfWsKubpq9iH1mh6xxuPyCZv',
        '100': 'GSjPtxiTAtTNVaxJtm9EVJdjB1rd2wbwCxHPcX8kKXipqHL',
        '2147483646': 'HwRbHWdfoEQyFMWvegEwgaTjusszAv2EfLzTcncwfi5kxDY',
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
        '1': 'j4Rqbe5LGQZk9pmGTMhFsBsE9ZTKD28Mp6iVxzfTTvEqXsXwm',
        '100': 'j4VC2JcrohXNZTTDFpAPnBged6xpCKFhbCmjyNWHVhbTrjNd9',
        '2147483646': 'j4WgiW1Qiv9iX4CypRvJstsvT7hgDgPg1WE8gSWYytweDfUkQ',
        '2147483647': 'j4U4M7BYUKHHjuo9W1An7rnG6LLBQu7AFGcFFPJ6chZQpbYQf',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-manta',
      params: {
        prefix: '77',
        network: 'manta',
      },
      expectedAddress: {
        '0': 'dfack3eCDagQastz63dp9JhgZ5f9ZQgPQdfyMFeq8QCQQEXNj',
        '1': 'dfX512sPuAAzp2gbgz4TP1uDYmns4uPjYZ3CDdCdFti8PJP5c',
        '25': 'dfWssT8Yq1zGf7TDL2DE7auMCvQzRZagkjagZhfbfSP5bR6Cm',
        '2147483646': 'dfbv7toUMfkyBG8K44HWPiuurL3E5Zf3jxYpw53imsQw56LHn',
        '2147483647': 'dfZHkVyc74tYQ7iUjdXydgpFVYfjGnNXyivwW1qGQg2hg2LzL',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rPU7TRcdPT1ZpXQsHuGMMzbPSZNBVcA6vL',
        '1': 'rwCjcKiBGhFF3QKjuUKygKYFv5Yrj3yE6E',
        '100': 'rLpLgPdmytx2VmviyLsFaUiAK7kDofk2dX',
        '2147483646': 'rftDeyGDgsXzbQoMcF7WbHc2WkZA8sZNSy',
        '2147483647': 'rwq8DM2mgC4RibEbpk8FDftP5dzFwmy4my',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '4xLQ77GtwJ1FT3dTHb1j1UhksYh5r3DwJFucQBT6Aovz',
        '1': 'GoNVA7sLEbTC4wzeUcRaWG4bJavvX9u7rQhX1E8WSJbD',
        '100': '5qUJ1i5bG5yymTWTFCg7uT8Yf6KdpzyS7GWEPw6nymGJ',
        '2147483646': 'Eu4wJyJC24BpEA1CGHGNQqhCvBgUTBGrpquRV2RYU3sy',
        '2147483647': 'C2kY14UB6ccHAJBBm8rGW9n7k6HAE7tnHRvqbKfXY1Kb',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x38e2acce472dbc8a05dcd0a3d62a4db0',
        '1': '0x524fc3fa727ad743cdc720fc90bc1309',
        '100': '0x7e73c74dd8aa1631f47fd0e1f30eafb9',
        '2147483646': '0x8a14ecafa8004cc1a12b25a7daef246e',
        '2147483647': '0x6998f224f068cbd3e18d1234b02b217d',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GDKJHQJZKQ5U444UIP52A6ETFGFTVYU2LYL5FYHZC3MXLZCI7E4HVT6T',
        '1': 'GC2RXEIW4T2GVC4KEUJ5CXRAAUBVJMINCHVQUITCFQEXUTICVWJTATBF',
        '100': 'GB2THKRXYGQLBKPFFTGOAYPTRSD6WTQM7ZJFFTTVFILRMMLZPOYFVFHZ',
        '2147483646': 'GD5NBWDABOPBWWAMEG3F7F6SSW6ODF3YWBPMNCW2A2P5J3THKRQATD2F',
        '2147483647': 'GDTZZLVDUUOSCJNGYCHWLLOLMRJ526AWBD7KCD3RATOOH7QCHSJJYNOS',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x05fe4961b0f3170f0f0a835289234d80dfe7ef6556e8ba2a77b0c06005fd3d1e',
        '1': '0xc248b0d6a7de87bdfb66a02515ce904ff2e0e24e4e41e8ce6dc87b15a14c8b0e',
        '100': '0x1892eccdef0c7ac212df025b60b1f21b4a33106cbfdc8a3b6ff449d2db98e65b',
        '2147483646': '0x6434ed46ef1a28756166927feea0012fecf51e1c6cee38c30519c5e5ac049cd9',
        '2147483647': '0xf6c22f2070271db1ed4424d37a441b085f2b8227904742903f11d17318739580',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TFMu2DfwQruh2haBhFBUGzpja96UbqZBtG',
        '1': 'TMtkv4ada3WKo9GTrJzgMWaeLkKkEgRcfv',
        '100': 'TMi9Erzr9Q8zNqYj1K4zaqL4CBsiB3FVpc',
        '2147483646': 'THkU19z72d6ibRpiQPisAoUbSJEpZLsAvZ',
        '2147483647': 'TXY2yvcT2aJHiyMk5iyjp2UrvcbtDLDZ8w',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC83f730a437993aeef2583c40590f7fed5e7a0e12b4ff5fdda7a45573a67fc6c61a67',
        '1': 'BFC73778847fba09d97951d1f7abe30c134d17c53eac8a0cd3db9ba008a39c2c45e8c84',
        '100': 'BFCe3404af3aa3a5d3985cf544f8795c817dafe92e3036f19deae2aa7402e1b33ec58f8',
        '2147483646': 'BFCac0d5396b5bfeff5477a74dbfe1ef56c74487801adedf05d94a05530c2a45f5a3eda',
        '2147483647': 'BFCff18b9e9a501e044569d86db9bfed749c6ebd776d23b3d8790039eee4a60aca1f946',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NWwKvLtaufMbGVfjui6tBBkhMPPmBMp6kC',
        '1': 'NasZNBZzRePKR9AFj84BcDfFDEQ1Spo7Jk',
        '100': 'NeXhknajvQqbGJ2VTCZbuLhWsZnorR5xEc',
        '2147483646': 'NYTsxARjHB4dhjfS4ANwFe7feaQEjMdFgP',
        '2147483647': 'NWt7KLuxx14pf9S9YTKFv25ze7zxwfbRhe',
      },
    },
  ],
} as AddressTestCaseData;
