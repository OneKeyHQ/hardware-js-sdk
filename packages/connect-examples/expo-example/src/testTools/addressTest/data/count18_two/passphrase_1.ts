import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'two-passphrase18-密语1',
  passphrase: 'xyz456',
  passphraseState: 'mwdeVF48d9APXPFNUcZD71JEGWHCKerED3',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429817885',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q8ah658m568qvrmywma5rfk0x00rnadv2nxtw3cgpxnktnfpvukqmvh09vqqg8thtc0a42pdu9duswwxrrttuqf6y0mqawyg8y',
        '1': 'addr1q9qqh4lj7feys8x970t732dlnkklluf6erdfxxlhlw76lhe3rmluea8aqrdzn94hhpmxm4l28h3yhjt320gpw2uuz3fshnatu9',
        '30': 'addr1qye6aqv4xds76seaad6an2zr2yacn2906ldkqj2mnw8u2gdqkx3rfkwwweysnhnjxms2hvem5qdca50c2242xvzy2zvs7vc06x',
        '2147483646':
          'addr1q98se9rqfqmhlen07vru76kwulh874u9tl82zf8ehkwn5qaauj0zrncqfy9cg4qy9gpcyalgtx5vnj866eh4av7ks2pss329rd',
        '2147483647':
          'addr1q8kjl5f3ee3eql67qt2gt3qpulnz7vvqecpu24sztp520kz2qluje38juxrvnp7spctl65m6grkv64uykhy8zcj9zekqqqjzr0',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'XY4PBTXT7SXK6T4V4IFEYFJUNJCQ25QLNGBFT5KC65ZORV2WCZOWEBTIWQ',
        '1': 'H2SRXCC7JTGPOCASWUFDESWWZIMYNK4OGBZ6YMBOBBVAWSTZVCNXSYHGJU',
        '30': 'OUQGAIJFSIMDF7B53CU7D4QPBTVN4MC7AMKTKEKH6JDF67XBR2XNYUUQNQ',
        '2147483646': 'VH6XR2JO5Z2F4IXHJC7WIVBSF6PZQ3O5YYC72QLAOVSRZX54U7TY7U5ZHI',
        '2147483647': '6VCT5FTYQHPGWSQ6VTGGSCG67F2ETKZTMMGFRIGLK5DMOFUXXYEWUNNGNY',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x3f824ba4a988611c022a5a5de9e7335b463546fe15fe5e64c02cccac495d58d2',
        '1': '0x3d09ef2b9ea77ac61ae24c9448a45366f2ba153036cadbe5a47952cda7bd77d8',
        '30': '0x260b8c9c3bb5a9262a43b28ab965dbe7ce9ad5b318c4383bd04636c1089e6fee',
        '2147483646': '0x0af1c047c17e05e0bf7ff87f877d9fc0428c3749a478b0059f6804aa306ff6df',
        '2147483647': '0x593b762a85b925ae46d95ce18d4894bdf30cdb3275ef76f2403a4a7dd6a102ca',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1JLttAPMai8qNfJHPqLmTAE6Sfmj2fsb3p',
        '1': '16RJzszWYRYDyA7Hm51RJHXjJCEePbU6ey',
        '30': '18GmDeahwXbpvquFPZ4aspH4GLft8ZH8e3',
        '2147483646': '1AQBwjgFJbxykFU2KTuiLacbmD5NDBsxKc',
        '2147483647': '17Hwaw4S38hwbuqcSQueZUFBvvmbfc4B4H',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3KGedkWCBC8iZHU3ncLAaPbJfMKU5DYCit',
        '1': '3Fd1vqwfjwDmZzf899Xf7Pd93zqfqidVy4',
        '30': '3D9rLow4wN6Pj97FXVChrKesirxkVMzACj',
        '2147483646': '355eskdGd6YiFpeS2ncaAAYaC4nMu6btPP',
        '2147483647': '39VJVgfaoMY3rbx78Z9gzDoEd1YZ4nP7Zv',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q2ua42wp6wx22kujkulwpl75fnndp5rv3fv3eng',
        '1': 'bc1q9g73tmsy0le6cvveu0z9qnx325xsedq67z9h3y',
        '30': 'bc1qw0kwdq5rcengu04tejmwft786f9y53g3uvvest',
        '2147483646': 'bc1q97naksn9gv4ztl2wwcnwr93c3qjpq2ggzr9u88',
        '2147483647': 'bc1q00repv73sng2frg5l2ypvx7450yu072ggfr9jv',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pg9hdqquzk6daje9qvnmehnhdelw8j3pqwrxqh50r9d7l8pfwrlusklctyt',
        '1': 'bc1pyf4hztdtl9lrjx52jxsw0wa2t9k6jnjm8ykvgkqnupgersdu94gqgwmjsk',
        '30': 'bc1pjeaftpr5fkpz6feja073uylj9ctayvaswqkvy5rmzzq3cduha5ushfjrw8',
        '2147483646': 'bc1prnavk7tyrfrtvuqym6e2skdu7jguxrf9q8yx2u638hkez0wk39xqjze833',
        '2147483647': 'bc1ps2trxwzzsw3dxes7yq64g8g80ne3ylrz2aru8quur2t4t6h7yqmsv0m3e9',
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
        '0': 'DNbEVjytWGNfPtz21P6XKYwcUFo7rur6ms',
        '1': 'DLr7qEo1JCnvRPwd5yTh9w1Ea5ySMMcAQT',
        '30': 'DATw8f9D15oqxqZyipksjxAToQLQA4mDeL',
        '2147483646': 'DNSEpriRk7kUNpt7brLd6bCvN4gMngzBHJ',
        '2147483647': 'DJMtoXZ3rvaBqkA57FoXnWkLDs8DwGjTqE',
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
        '0': 'bitcoincash:qzn85h4uuv9nz3s0vm4cn47uz377m72ajspxk82vhj',
        '1': 'bitcoincash:qr38mle8flat3u9ec9cy9x7060kcxs24cs93elwdf7',
        '30': 'bitcoincash:qzl369wntk2zluhdxcaya2dwkf2wa9f6jg89w346ad',
        '2147483646': 'bitcoincash:qpc900fkhvjerye49pwzgtrdmtclxs62wv6tj86lc6',
        '2147483647': 'bitcoincash:qzurkasdgkh444dzp0h20328kragjhmmcuflvqs4gj',
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
        '0': 'LTNKV9mCqAdZdA4H4S2QNTaEXeJWz1zNyY',
        '1': 'LRa7rBU5WGLiYmT5TEsCE6a9gA8K7P8UqM',
        '30': 'LNLF5Zj8Hvku8Zinsun4r5QmUZYFjWsFyv',
        '2147483646': 'LLhAtejdoKdej9hkaNwb2DJbzXoiYbKPqY',
        '2147483647': 'LdgAwBamgBLPeuiFeJWrNVrd7uFiNUv61K',
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
        '0': 'MUV19qnPacxiRQSDAAmKnxZLTqy2rosk6m',
        '1': 'MX5iF6ojAAf6HmBqvU7bpsGXYjRT9hDerY',
        '30': 'MNeVNnpPfDor7o5NqamVLm8MGHVDtpqpG4',
        '2147483646': 'MMfEfh1MY9EkPqLTFuwfMxKQEivyFdFPes',
        '2147483647': 'MATyzC4TeadCMXwUFz1jFcV3xhjauZhv9e',
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
        '0': 'ltc1qyqexhz2r8rql5mqx6fjl4snqy0dne3mnfzlz3n',
        '1': 'ltc1q5jrlrmz6hllh902scp3kfydcrl3xl5jr9e0np8',
        '30': 'ltc1qcrn0h7s7sj7326hmc3fvf6s6eerph7vvdvq90g',
        '2147483646': 'ltc1qszwxd0lylqe5aja3l7v3he3pdxp0vcwklhgwjc',
        '2147483647': 'ltc1qy9gjuenezdqkctq6n8zt4xm5ye24v0gp6wdx25',
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
        '0': 'NYpX2z2EJBNofw6zd3RvF8zQNzhE8h57vo',
        '1': 'NSynK5PeNQHR2bd3o9ftcHQ7UV6kJH5PUy',
        '30': 'NUouSsc7FrU3vMuds2zJFeF4NGNcv3cT1m',
        '2147483646': 'NTbkBdUQ4p9JWC4BnBMWKP4WuEZ4194unV',
        '2147483647': 'NX91vZ3wGca1ft3Er5izPeA479qauG47Q1',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqvmrp9ltv50k33y8zdrxsclh56750tm2fs5pqyc5',
        '1': 'ckb1qyqwfw3tsqj4m8qwf3d6avj95ng535z4lyys9npnre',
        '30': 'ckb1qyqq9c0hreuq6dcxfyatu44y2p7yu870j6js6h44ug',
        '2147483646': 'ckb1qyqq5cj22m2khp3k0q3ar768acvgcy0jsucsds36f9',
        '2147483647': 'ckb1qyqppwrx76c5kg2uq6wf2pg2szakct4jmplsa3zwde',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aapupkcrmue1vu3vjdj0ygsvcw4zb5f04au5519gct',
        '1': 'cfx:aat8813vj2yeya1eaku71fnar42e0k6wtest66bsgp',
        '30': 'cfx:aakg9vez67rw4sdc1wmr7f7wn8yryyhg8edxyj5gw5',
        '2147483646': 'cfx:aajn60z7s5e2fn00f0jz0xycwxr47xatjexe5xd9xe',
        '2147483647': 'cfx:aarzfynsnnta4j2878dxcm139zkbe88fjjs8wu5efh',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1s9ysm322cen0peqrm7nfrxha8kpp5jp3xz0dvg',
        '1': 'cosmos1d24hn07xkrghd437m0qz3vrx73ya9zzaazwl9e',
        '30': 'cosmos1j0hmjky56qe25xrak5scqzzlwf3dgxa9qz8q59',
        '2147483646': 'cosmos15psh0h2rkk9lhqaaqkqhlpun6skgame57sxhgk',
        '2147483647': 'cosmos1u89fm984hrz4hf34wxhnram0f75me62q4k80f9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1s9ysm322cen0peqrm7nfrxha8kpp5jp3tez24j',
        '1': 'akash1d24hn07xkrghd437m0qz3vrx73ya9zzasercur',
        '30': 'akash1j0hmjky56qe25xrak5scqzzlwf3dgxa9de28dl',
        '2147483646': 'akash15psh0h2rkk9lhqaaqkqhlpun6skgame5ntts3v',
        '2147483647': 'akash1u89fm984hrz4hf34wxhnram0f75me62qcd2gsl',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1s9ysm322cen0peqrm7nfrxha8kpp5jp37e85se',
        '1': 'cro1d24hn07xkrghd437m0qz3vrx73ya9zza9exxeg',
        '30': 'cro1j0hmjky56qe25xrak5scqzzlwf3dgxa9ce0eg5',
        '2147483646': 'cro15psh0h2rkk9lhqaaqkqhlpun6skgame5xtww58',
        '2147483647': 'cro1u89fm984hrz4hf34wxhnram0f75me62qdd0k45',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1s9ysm322cen0peqrm7nfrxha8kpp5jp34lxfwl',
        '1': 'fetch1d24hn07xkrghd437m0qz3vrx73ya9zzawl8m8w',
        '30': 'fetch1j0hmjky56qe25xrak5scqzzlwf3dgxa9nlwykj',
        '2147483646': 'fetch15psh0h2rkk9lhqaaqkqhlpun6skgame5dd0n2p',
        '2147483647': 'fetch1u89fm984hrz4hf34wxhnram0f75me62qxtwttj',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1s9ysm322cen0peqrm7nfrxha8kpp5jp3weua66',
        '1': 'osmo1d24hn07xkrghd437m0qz3vrx73ya9zza4ea0nt',
        '30': 'osmo1j0hmjky56qe25xrak5scqzzlwf3dgxa9ge5szh',
        '2147483646': 'osmo15psh0h2rkk9lhqaaqkqhlpun6skgame5kt487y',
        '2147483647': 'osmo1u89fm984hrz4hf34wxhnram0f75me62qad5llh',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1s9ysm322cen0peqrm7nfrxha8kpp5jp3ssvkt5',
        '1': 'juno1d24hn07xkrghd437m0qz3vrx73ya9zzatsdyz9',
        '30': 'juno1j0hmjky56qe25xrak5scqzzlwf3dgxa9ksymne',
        '2147483646': 'juno15psh0h2rkk9lhqaaqkqhlpun6skgame5gz9v02',
        '2147483647': 'juno1u89fm984hrz4hf34wxhnram0f75me62qryy5we',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1s9ysm322cen0peqrm7nfrxha8kpp5jp3qx4dwg',
        '1': 'terra1d24hn07xkrghd437m0qz3vrx73ya9zzamx5l8e',
        '30': 'terra1j0hmjky56qe25xrak5scqzzlwf3dgxa9xxaqk9',
        '2147483646': 'terra15psh0h2rkk9lhqaaqkqhlpun6skgame5c5uh2k',
        '2147483647': 'terra1u89fm984hrz4hf34wxhnram0f75me62qnja0t9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1s9ysm322cen0peqrm7nfrxha8kpp5jp3y8my35',
        '1': 'secret1d24hn07xkrghd437m0qz3vrx73ya9zzal86kc9',
        '30': 'secret1j0hmjky56qe25xrak5scqzzlwf3dgxa9z8nffe',
        '2147483646': 'secret15psh0h2rkk9lhqaaqkqhlpun6skgame5u4j742',
        '2147483647': 'secret1u89fm984hrz4hf34wxhnram0f75me62qhnnx5e',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1s9ysm322cen0peqrm7nfrxha8kpp5jp3hg7ak9',
        '1': 'celestia1d24hn07xkrghd437m0qz3vrx73ya9zzavgl0l5',
        '30': 'celestia1j0hmjky56qe25xrak5scqzzlwf3dgxa93gkswg',
        '2147483646': 'celestia15psh0h2rkk9lhqaaqkqhlpun6skgame506h8jm',
        '2147483647': 'celestia1u89fm984hrz4hf34wxhnram0f75me62qyuklng',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'Xwngeg2BXXJeeQAejEo7nG2eZPopFA9YcJPnDtasT5eMHBCYR85AubG59vedk8jXGeYRKmwa41JcxeZyGxtRCLPi1ng8ZCRr4',
        '1': 'XwoBr2NYHqEP62p493DY6E298ZV9qLva81AL6E4zsckb6QnVtsTdufWEym91T4cB173pAWdht5PDsc7CyQiWtVjm1fxLHmGm2',
        '30': 'Xwop7VStDZYhrj6XwW4Fxq66mtbRKBahAJEopyMuqns5fkXAPPfuWSfYNudJYg4bA8Wr4NHmSwpA9TN36QacfPY31aQc2V3fq',
        '2147483646':
          'Xwnniyf1DgyX78X1anM8zadoxZG9XDAHrUehR2Rae1s2TZTxNafW2g71dE26V3uRA89UvSh55BzHrBuMa8CPSPLH2FDtsoWfE',
        '2147483647':
          'Xwo9ZKf4qZ3Yc3XAnLMEuwVYGpCL7ib4kWNFLg9BFVtWdwdgppVfpzSM9HpfYeWtk5XDREMfwz5y61p1UJGM58jm2B8tuKysb',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xc55DdBEAa298633B630dCECCc72471cF5bCEc036',
        '1': '0xb5C94b03fEb633BCE77527984773F514e6380f26',
        '30': '0xD729CCd128505f4001c4eDD63d3A4Fb6AE70Ba3d',
        '2147483646': '0x34827C7Da9CD1a47d441f4F2bA3E11316ccA7dD1',
        '2147483647': '0x1a40696D12922eb01dD5b7747bF9F475088e7B26',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x013C7ac1B9ae82Cc1A253e25055582994D7EAee5',
        '1': '0x2c34602790F8eD3B8CD0263c76cEe0C43f9ED5F3',
        '30': '0xF713EDfd03425C061Ac4FF77a6bA52f011152968',
        '2147483646': '0xB6A1F97771926daEe9dE1B6548bB04f2100Bb9Fc',
        '2147483647': '0x57F11cfe4BbbdD4A81C4e2aa6609dC2cd03cb3CE',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x013C7ac1B9ae82Cc1A253e25055582994D7EAee5',
        '1': '0x64aB766d8E1Bb27fcb068039d3c095D3FAC0AD75',
        '30': '0x15517E2084cB2D3107d342f1295d13D50287c523',
        '2147483646': '0x84965BDdd5467c4190e64C69f96C928888B8E825',
        '2147483647': '0x6a4b19996be6C683f2B8a5724C7f06E1E62b8769',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1mgtnch3rqvgzctkn2ybusgyhwwi6c7ehy37l4ta',
        '1': 'f1xspaxvhq7xhux6y7nmrk7dnzcdhmsxmmwq7kcda',
        '30': 'f1o45sdidxqshlwvmpos5y2n2fnwxqf7eu6qdkq7i',
        '2147483646': 'f1sjr6wh3g674txpvtam26sffeibxzyt7kkudjxca',
        '2147483647': 'f1mnpp7uagezmcfk7u6o33ibbrwewehxas5k4snni',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qqn53w6mjsr4mmvrhnfxjjrzy0nru89mjn8jtz7x5de2pe5vr2492mw24rupe',
        '1': 'kaspa:qqzqtq924tndgu7rcj8wvwlm9w2yylxztmtzr8y460dd3engjlm37mgqfzjxh',
        '30': 'kaspa:qpwahjwj049svm55fx2chfvgtpm3578agyue40n4tzq4cx093neukq0jtm7qm',
        '2147483646': 'kaspa:qr4u4xzywueffeln90ajzuv6m4u9wsrry92eg0jnag4rte3k0mnukn3hjhldn',
        '2147483647': 'kaspa:qr4hz93gudu3wp6cg27wsvj0wrm6l8tr6mfw9q8eqtgmd5u3xthz2w0nwvk8p',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '1d426075fc509f0a7e242b473d5ef1c4cfdad037c22076d903f3aab5ccec2ce1',
        '1': '009ecdd6aca61cacbbac944eb0261ad3a270ad0e2a1bd4849d138820637cbc99',
        '30': '51088ff39359285155de328716e7b37cb094f0c652ffa79b7c6574a59e59548e',
        '2147483646': 'a6e3c6449ac96c4873b677228f460559c17683c0c169f6dbb8896507896135b6',
        '2147483647': 'abcf4efe9da5990de50944975c852d10055a3d8c59190ff7a70659d932636462',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NBPZ7VOHFLF7JMUOD46C2BH7XZ4GCNBLWQFOE2M7',
        '1': 'NAARMHEVEEUQBIKZ6GXKHCDK5LLYMA5ELCT3A3YE',
        '30': 'NBKO6XM4Y737NDLOBF5VG4LBGUXR7JNKGFPKO7GX',
        '2147483646': 'NCY6P3GBO7CJTW6UL6QJT4EGISINR4R3NA7YQ2SG',
        '2147483647': 'NAIFEGOJVIL5GXHIUMMAHF3XF4QZNCFGB5GMMUWJ',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5jh82r223vtylkwecevdzj6pujj960gh9n53hr3wr',
        '1': 'nexa:nqtsq5g5w00u0akv529v7cls0u3zc4dqm7cnvkfwxw5h5ym2',
        '30': 'nexa:nqtsq5g5pma739axd2l90czlwahf7fufvwh83hhddspwun09',
        '2147483646': 'nexa:nqtsq5g5mndsscnnxlpyf09582xw72fx8lxw9698w536jzgc',
        '2147483647': 'nexa:nqtsq5g55e9vjw33nw3cl7wcavjdl67pxy9qgqhz843wgyh8',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '12NBnxeh4W8QAebnb5uGp6ywstpuQ7b31xchxtGVtnyHJUp6',
        '1': '15fcHng1Mtd7LXsRUssotHRMmUxGrLHTRRPm3PMp8DW13KHN',
        '30': '168KdAyNmmWhEHKeKUXSUDVLzJ4zouUQAkKLs7LkBPk3Unc9',
        '2147483646': '121VJqzt3RGX3cm7kpX9BCtokErpvQirZ9iGErzmqDP71Kcx',
        '2147483647': '14TygvLwZRhWXrf5CwvfCFTj2i4fAnqDZ9sK5zSv9wpT1cUf',
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
        '0': 'XJV5vMhyxW2wwd77kJPhcK57KYNg2jdxfPN3JV1D4wii7m7',
        '1': 'abuakP2HLzk7ptk1YGvmnkUzufk8FS4N8AR7oaKSVUSSsv2',
        '30': 'b4cv8gPhDtL1aLxr8vZMipUDinU5pd17T5zwXZFVfiUtJsi',
        '2147483646': 'Wwnbohtxse9punSHUvG4iDvyfaJCKsTVrUvKHDH9VMYR2GL',
        '2147483647': 'ZQGyt3xUt59K9gPjcKn5knrG8n8ShypVrdyAQfRUDntRAY4',
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
        '0': 'DwWJwjVq5srUmQiQ9fKZuWoAs7VWUr5PqiyCFZ6pWAFs6t2',
        '1': 'HEvomkp8UNZeegMHwdre5xD4TErxhYVoJW2GkeR3vgybvLb',
        '30': 'Hhe9A4BYMG9YQ8a8YHVE22CHGMavGjSYdRc6UdM76w23TQz',
        '2147483646': 'Daopq5gp11yMja3ZtHBw1Rf3D9R2mytw2pXUEHNkva5Zznj',
        '2147483647': 'G3JCuRkL1SxqyU121ghx3zaKgMFHA6Fw2yaKMjX5f1RaHtk',
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
        '0': 'j4SgoDfdb5SMxZj31uRHxX6rnYeuqChc4fQWfB9KTmn6PmRew',
        '1': 'j4VzDiVeuNprfjcJeoDGVbHJCSF3CevJV4sHiFeQn1Cd7WPis',
        '30': 'j4WSw3sxGnhkFdMksdov8BDNBf49vcVVRpCDJ5NPi4Ns9wxmh',
        '2147483646': 'j4SL6jYyn4MW5ShCM59uptCmeQzwkizjtCbcDT83jiCWDUUCy',
        '2147483647': 'j4Unb7dKqaMw4vw6JXHKLuFLZhU9ayNrFCbmGJFVt2vwZUaRQ',
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
        '0': 'dfXvCcThDq3ccmeNFXnVUM8rBkzTh5xyo7jCuogVFkFPFCT8B',
        '1': 'dfbDd7HiY8S7KwXdtRaU1RKHbeab4YBgDXByxtBaZyfuxwEQT',
        '30': 'dfbgLSg1uYJzuqH67GB7e1FMasPhnVksAGWuYhuZW2rA1NacC',
        '2147483646': 'dfXZW8M3QoxkjecXahX7LiEm3dLVccG7cevJU5fDXgfo4uC5Z',
        '2147483647': 'dfa1zWRPUKyBj8rRY9eWrjHKxuohSreDyevTWvnfg1QEQuRcp',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rotCRtqCsad9ggx5AX5XJ8dATE6NuK4LC',
        '1': 'rUFvX4K2i3hpaMXv1LGvZnDHVCF7pHtsfZ',
        '30': 'r3VtzriqxgbpT155rDYwUsQu6QikJSJUm6',
        '2147483646': 'rwQfQkWToLBAwD2LEtDWBF3YAdwx7PCxSD',
        '2147483647': 'rUwN9SpRh4ahaHg7kupHANrmuyvRyrRrt9',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '37AhiStLrZZp5Zk32tTubnPZ2Utf7VoupzjB88ve7A7B',
        '1': '6io7AdcWF2iYSuQqKpjjSQnm4BByAv1CVDhTRGAAkuBM',
        '30': 'CftN7RpH1k24LRRVKy1pUKDisn31C4RX4hxgKYtF9YGr',
        '2147483646': '991MbBU6PTDMnkHAk5Eozpb81TeKEc4RToFdrytQKqGj',
        '2147483647': '9k9fxaP2oRHkLiWHQQxZezMyFd897K6onzNFNjzFqqh3',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xd77c7acc68c7c452b4258c9e5e486880',
        '1': '0x616cfdcb9a4b1a4db0ff23defd11c8cf',
        '30': '0x5d2aa38e6f8d9c9fdc4296abdb85d655',
        '2147483646': '0xabd3ba096e9b2da81332f9bc3636ead7',
        '2147483647': '0xc7c299f08c98eb41e942917b33252fcf',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GA4D5BS5QKSBQWEIKSCLL5O752ZMECCN446LDMHV3BBPJHG5ZKTCUPX5',
        '1': 'GBNMWOBIHEZRWX2D4YG7XUUE4JMI4AM3KEVGMX4QJZ6CTR5XEQWVHQTC',
        '30': 'GCFPQRTKMLZ5HBSW6YDR5K2EI5VLBVYRFDMCWMIYJDWBS6HQ6IQE5T27',
        '2147483646': 'GCSQV42OAWXZ3BFXNYHZKQ7VTOMXLRJ5N4NHNY2YWNX6D6CDW5VXSCBT',
        '2147483647': 'GDFA6LAZSMULSGN2HWW7F6OOTXSBHQJGCUCAJSBNCKN2UWQDYVCQ6ZSM',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x074f198a2389cd529d6cb7f8bb29ce47cebb0ca65f135da0e0c45de682017d04',
        '1': '0xd227a717d34f39898bdcec23630ae88f9198e894ed500397a5b3bf265e0b2dd1',
        '30': '0xfe8ea815d4de2b0e27df5dd1f2d45c8151cb1bef940484b50f54a69417cb3e81',
        '2147483646': '0x93f899b26ae575ad51dfefbe23d68b0e2f1f78e12d13ab046da604939c62500e',
        '2147483647': '0xb64d6e66434a070fce3766be8459debe7fcc2b855f745e795b5ce485c866b8bc',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TKPE4uiUABtNg3Mz91hrXe1SbmpRpJfe86',
        '1': 'TR1v94koHmvhfSy1ZFHx8jppAM7qqnwPEC',
        '30': 'TH5KNPdn2uT2AowFjtykNtKKgNPXwzzssn',
        '2147483646': 'TPSvgH9oif3i2ZSoZtJg33b2pxRfpZ1Yu6',
        '2147483647': 'TUDLQpX75UCku4vCAYccj29GC563dH33bZ',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC6e8c7669699bbafdaeec84c45d67c7609370b451b1ffd3a558b365afa9993ac710fd',
        '1': 'BFC647a389509d9d5dda09c4589b1fcb1c27939107f205e6d47fddf01604c779bd697c5',
        '30': 'BFC065be1986b4f63876ca30a7daedf53fcea31e9716e86b455789199ef1ab0c46c908f',
        '2147483646': 'BFC82327c80577de309ad9db82fe8fef7ed63fa4251c6748ce322051df9214fa7b9f86d',
        '2147483647': 'BFC4ab98edf626afd04d154cd96bf21b0dd94dd9427cc77ffa1af15f09e6e56727c2e6e',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NSoC7csZgt1kKLAyxMBZuiHvC26YFPBq13',
        '1': 'Na81iNuVyZfYjiwWwm2Ed8VgJtDbc3JfGM',
        '30': 'NeqH6pbyHsi6SLKPCd4VfCqRWXYMfQVQhB',
        '2147483646': 'NP5JTNdSxh1qUuajJbTJd8qwpYwhtRDoFW',
        '2147483647': 'NMU2oCCzzgVeYdWX2foFKWFcBiFSpPtG9a',
      },
    },
  ],
} as AddressTestCaseData;
