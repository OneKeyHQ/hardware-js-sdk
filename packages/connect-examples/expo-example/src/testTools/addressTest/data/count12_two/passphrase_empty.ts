import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'two-passphrase12-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429392047',
  passphrase: '',
  passphraseState: 'n1wHog59hyJ8aABwa5hU5UCBjrgE5TWYSa',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q84wtl5lyk2kxzn7k93gay0t2jsk9sywhh6zgejrj854vg2mqcnr48txhesr5k7vnd3gk2a6dqjctct82yz0rlvlh9cs32jvrj',
        '1': 'addr1qy02lw6h8f2lvtzw69n0vymqy0qqxzcvq2fnuujp97ap5zz74hkmsy00rs80whtwwq9ccrq7sxh7k6j3ecscn0vluvcsrq9k9s',
        '35': 'addr1q9n034hu2smmlwhxhuxdx402n4y5dfhsqjcd8ekswt2pna0qfh2rjf63mlh8z0ft4x8sgpgs3v768wlhhytkgkekx8wslp36y6',
        '2147483646':
          'addr1qxpqy2v5lc4j2e7crhnfpgruag78zgnjyyrnmfv8y495w54dt29a6wduewxzdn4evq4uhf3m9qjqfwhmqc8em34e36sq4xaz3a',
        '2147483647':
          'addr1qyvhe2esq5scz7k3rj26kmk9h54yy0xdg4pzgm7t5xjn9t7xt8ca7f4386d7wh6gpfp7pmdpmtfmjeq63ftxd096y9rqvewze7',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'AICPBMJ5U22O53GD2K7GJXS3EYXRPQXL5BNDCP3HEVEYQAMG76VL5EEWSQ',
        '1': 'ECHHSKJOQ2F3IRJEX6EWBKAN54URMZIQY3T7ZF36A2YYRLO2Z5NYQVV7SM',
        '35': 'TFDZFVZ7UX2DVKTVV27S2O7CIXGWAPJHDS43UJIN5BLVHILKWLI22I2IVU',
        '2147483646': 'P7COLHLEKRHX2WSVW4BL2VYU75YQXDHWNN4NJ2RQE5NXKHIFX7UHLHMIHY',
        '2147483647': 'NMMXXXUDXYQ2B6I4F3JUODR2OUMB3OWEWXTSVB62ZMS5UV7W5TYCQYTPBY',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xd20573ae91d1b8b0834400dd95f047ee5a3b1b6712df9feb7d7126a380715de2',
        '1': '0xbe00cf6d1d270de36ddd4708d5a6c66586ef29de472b5c28703115ed0f434dde',
        '35': '0x456ea542e46c31cb5dbc3c9c348f03f064bb37f64c77c42bc8b84c42185a1e06',
        '2147483646': '0x691adca15d705b29d9926adee72be8f2d4539bed87e4fdc60cdeee4b66dd549a',
        '2147483647': '0x68b601e82ba91d29465f8d72fc98a9b94a3abd451a6b8baf5ab88cb98e7d72db',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1DAznPTmPfdWKfbet5FiQX2EGHxLeyzRQU',
        '1': '1Fp9a7HeCGBh8knR6gf663KRB3EehKzMMW',
        '35': '1KcNSEsWmzi9VnqRxdaCRjTHJjwi9kQjfJ',
        '2147483646': '1BzJ5kZnjeZx34JcY5Y6briLW5kMnmUkLy',
        '2147483647': '18f1BMV694ZBQ98upCJQ8t6vmHGd8X3QKP',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3QtvowGBhhzMB6R8jh56K6Sc7TSdZ7kLqN',
        '1': '35QeVNFPzjCVWfM8xS9yUx9G6ybN3nerqT',
        '35': '37XSZzbG2kfDmtQVsc6DCbYhMR57gtnLHr',
        '2147483646': '3DVHPiQm7iUDEejxFf2itbGWDvjby7uP8B',
        '2147483647': '3C4VmLEU2Eu3gKXYwQt8WfrtsknVrW1qEi',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q92jn2t9075makvet40avged7gau0kctj2v63et',
        '1': 'bc1qdyjalgjc4xk55nhxjpmex23zecltj9p0cgzht3',
        '35': 'bc1qmt38qjj5ke0606fkj0ep82uy0zajlh8qfwcvm2',
        '2147483646': 'bc1q9l6skzxlkhlp7m64q5e334uelmrvtzdfnnwynh',
        '2147483647': 'bc1qeujeet8rhygxlkg4m8fs05sltvk7kkfe4z5w70',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pkza6swqdpq3tyu8rruznxf73ttuh0jrh6c76p3m7a4hqhw94xfwqzvydq6',
        '1': 'bc1pl9f36a2rntut055063zxdeyvshqr9z45nwmuuaswh6l2am2xcnyqrxlhzt',
        '35': 'bc1pzhcdssznws35qcezgf88m5uk0rr2x6ex2gneefzm9ejrsjhacfxqpqlwfe',
        '2147483646': 'bc1ph8gyn8zwpd7m7mgk90t0gvxh3nc3gw22eu84htjjnuafczhtkz3sl7gk9l',
        '2147483647': 'bc1pqsnykdll4tkard6q0atuasn6zgsnmktm9eps885eyuvnpafjhp3syuyqkj',
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
        '0': 'DBV1zrmLfki7x3BwKuBKGTGHAsyzfG4T12',
        '1': 'DRdc9bnb2qAsh7PP2TwA4h8VYGW2eJjEox',
        '35': 'DRhmNrvUdu3LU3x7Qo8HsyxrnNzAAyMfDu',
        '2147483646': 'D866YYSY2fp4P658Z8B1YgG6iirDzBgWng',
        '2147483647': 'DNW18mxfkrSeTejGn8p1PyuFvL4yBNFHc6',
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
        '0': 'bitcoincash:qrx0yz5f49eufc7us2x3xq475d4eawz8p5rts5gl9m',
        '1': 'bitcoincash:qquxvtsssqfygv57qxn67gqe7t4hks3tpyjnmae75k',
        '35': 'bitcoincash:qqjjrf3f932jkkhvzsdvd0f6hxxwk73hcvje0hkzqs',
        '2147483646': 'bitcoincash:qp5l4xzj2pqm2eghppa9fex50fh3fm3fhq52g2gar5',
        '2147483647': 'bitcoincash:qre6qmlfka6gxmzg8qz62nhnz7c0n9wkls7q4ymf3m',
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
        '0': 'LToPiR3LR6xTVSJ6znREZ6vTYgsrWLAmQ7',
        '1': 'LiV1VUvjW84FmRmi1iFg8DVsMvDoMKUya1',
        '35': 'LKkF6Ho3ejxWtoT2SPJh5AL4VGnwrJdGrT',
        '2147483646': 'LN4LCHPwvKnknGF8zfNeiyQkYuLE1L3HXU',
        '2147483647': 'LP6MgFonc9mRVWQwG62rGP3eSpgeNVMM7c',
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
        '0': 'MGUyukriDs9d8LhfzxrkKnRUMbBsA5bRxf',
        '1': 'MTci33xQu29D4k1LqXs21dGq7cJDw2H4wR',
        '35': 'MXEY9YRTe4PdFV7kTb9TuW5JYGcoKTtJtU',
        '2147483646': 'MWirDq8mLP9faf2Kd5G93Jw2VBasjZPCEE',
        '2147483647': 'MLbDcgVE6aSEMHkCiXfiHP3DYVhhTZqCaZ',
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
        '0': 'ltc1q7z4qvg0t9psn0u545q7tvmwwcc82xmq32t6tg8',
        '1': 'ltc1qrjtnzfde4fnu2hc9g7amlrltcsampz5mzvs7nx',
        '35': 'ltc1qafue8aadddnpu4j2faqx0t6hwh70nl7w88ym4m',
        '2147483646': 'ltc1q3n0f3xm2knkq8je8rjgtwmuvtk8vt25ltplcjw',
        '2147483647': 'ltc1q4gnmrm26damrwxczf696n0gvv98lync6zhv0mc',
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
        '0': 'Nbtcekb5qAVi75ua9seFCBH5LesxXe97to',
        '1': 'NZ5dpXUiSU7NUFC5meZVa7FdQUiCvqjtfL',
        '35': 'NiQySarBJjBXJwLazyyVLuHzuSttK9tLiG',
        '2147483646': 'Ngt3cjM6ToXsTdnjfDKJSzyxaVVui9ZBNh',
        '2147483647': 'NQ9xzxXTww1x55XCWiZu7oVPU3d24TBMPX',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aat0ne7eexx7r91rejmr45189mjc01r04atd1afg7b',
        '1': 'cfx:aamztg0bep9jkbe0w3u5xcmyrcpaxhub7j6p5xfcfu',
        '35': 'cfx:aaj33fgj1huz8jrfduwkuc1ja487e22z9ay1kgp3ah',
        '2147483646': 'cfx:aap3ndmzh2rnn0txxj7u0wcrkpn16uuk3u6n46bfs7',
        '2147483647': 'cfx:aaj1w0ttkdeye1wr46xwvx79sk8w8x2842zk62ejmx',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1wsm2dqwga0tej7hzlw4mlj2wydrhsdvermlzmj',
        '1': 'cosmos13ssamc2sv3zmrsah3ac46z4gge0dq8rurpsszf',
        '35': 'cosmos19kxrs4g5sst26jgqfk4k6lv9gzkj2yr60ntvmw',
        '2147483646': 'cosmos1qs86sl4zfz7n9pqx7u7v0t5kyf64pcf9r9844l',
        '2147483647': 'cosmos1zktmyxnp55ewmr0whxjuzhn29nmgsksqp3ascm',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1wsm2dqwga0tej7hzlw4mlj2wydrhsdvewqj9zg',
        '1': 'akash13ssamc2sv3zmrsah3ac46z4gge0dq8ruw6ahmn',
        '35': 'akash19kxrs4g5sst26jgqfk4k6lv9gzkj2yr6zgxtz5',
        '2147483646': 'akash1qs86sl4zfz7n9pqx7u7v0t5kyf64pcf9w72jv9',
        '2147483647': 'akash1zktmyxnp55ewmr0whxjuzhn29nmgsksqv2shpp',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1wsm2dqwga0tej7hzlw4mlj2wydrhsdvemqhm8r',
        '1': 'cro13ssamc2sv3zmrsah3ac46z4gge0dq8rum6cf7c',
        '35': 'cro19kxrs4g5sst26jgqfk4k6lv9gzkj2yr6hgr48l',
        '2147483646': 'cro1qs86sl4zfz7n9pqx7u7v0t5kyf64pcf9m70vfw',
        '2147483647': 'cro1zktmyxnp55ewmr0whxjuzhn29nmgsksqe24fy2',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1wsm2dqwga0tej7hzlw4mlj2wydrhsdvesxkxe9',
        '1': 'fetch13ssamc2sv3zmrsah3ac46z4gge0dq8rusue5q7',
        '35': 'fetch19kxrs4g5sst26jgqfk4k6lv9gzkj2yr6uwzgee',
        '2147483646': 'fetch1qs86sl4zfz7n9pqx7u7v0t5kyf64pcf9scw3hg',
        '2147483647': 'fetch1zktmyxnp55ewmr0whxjuzhn29nmgsksqjv556v',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1wsm2dqwga0tej7hzlw4mlj2wydrhsdvetqvjdq',
        '1': 'osmo13ssamc2sv3zmrsah3ac46z4gge0dq8rut6rq5m',
        '35': 'osmo19kxrs4g5sst26jgqfk4k6lv9gzkj2yr68gcudu',
        '2147483646': 'osmo1qs86sl4zfz7n9pqx7u7v0t5kyf64pcf9t759rd',
        '2147483647': 'osmo1zktmyxnp55ewmr0whxjuzhn29nmgsksqf2wqwf',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1wsm2dqwga0tej7hzlw4mlj2wydrhsdve4fueuw',
        '1': 'juno13ssamc2sv3zmrsah3ac46z4gge0dq8ru4nnt94',
        '35': 'juno19kxrs4g5sst26jgqfk4k6lv9gzkj2yr6epghuj',
        '2147483646': 'juno1qs86sl4zfz7n9pqx7u7v0t5kyf64pcf94hywjr',
        '2147483647': 'juno1zktmyxnp55ewmr0whxjuzhn29nmgsksqhr7tl8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1wsm2dqwga0tej7hzlw4mlj2wydrhsdve9l9zej',
        '1': 'terra13ssamc2sv3zmrsah3ac46z4gge0dq8ru992sqf',
        '35': 'terra19kxrs4g5sst26jgqfk4k6lv9gzkj2yr6fh3vew',
        '2147483646': 'terra1qs86sl4zfz7n9pqx7u7v0t5kyf64pcf99pa4hl',
        '2147483647': 'terra1zktmyxnp55ewmr0whxjuzhn29nmgsksq848s6m',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1wsm2dqwga0tej7hzlw4mlj2wydrhsdvep7ttxw',
        '1': 'secret13ssamc2sv3zmrsah3ac46z4gge0dq8rupyyel4',
        '35': 'secret19kxrs4g5sst26jgqfk4k6lv9gzkj2yr6dkl9xj',
        '2147483646': 'secret1qs86sl4zfz7n9pqx7u7v0t5kyf64pcf9pqnugr',
        '2147483647': 'secret1zktmyxnp55ewmr0whxjuzhn29nmgsksqr5fe98',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1wsm2dqwga0tej7hzlw4mlj2wydrhsdvej3wjpl',
        '1': 'celestia13ssamc2sv3zmrsah3ac46z4gge0dq8rujtpqcy',
        '35': 'celestia19kxrs4g5sst26jgqfk4k6lv9gzkj2yr67e6upr',
        '2147483646': 'celestia1qs86sl4zfz7n9pqx7u7v0t5kyf64pcf9j0k90j',
        '2147483647': 'celestia1zktmyxnp55ewmr0whxjuzhn29nmgsksqsmvqzk',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwmpdGhpd6WguKD72K2JT5dBLHMywHaT7JtjBbgZg5sM81BEQQqjRM6FWBEgzU2PqBgfKKBFWitHc6wCQcGNphMR38smFz1pr',
        '1': 'Xwns4SZsJLpQyWjf91PijL2QzJGDe12KgGLVJjy7TTmgPMW5z1nD7Wujc1CuoLwvUbbHEvPKHp1Yphpkm6NgjPGT2qbLrXcLJ',
        '35': 'XwmvEZ6fSE2G4ZDTTgUVPzboxGmy26gDHf4nUiGQFPqf1nWuBXUUDeqMrs6DqtHJFbUjuHLa2ce4RHVw2CGN1QUK2533WGEV6',
        '2147483646':
          'XwoGoyVSeE97uxG5QgBMMnEe8LonMwJPF13dsHVhamewZcggpYNpYj6hSAZTPRkfaNRN8JtMsKghC8aHyieXZqGs2NJiSXzbs',
        '2147483647':
          'XwmqQguk2woPk4dCgmbFasjpRG1zWn9SPHi5yvHya2k12etkJ56ZEVeQbef2os8ksySBtE19MQqEPTKedmXzK5Xi2csBcYJx4',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xDD1f45b8A28Edab37d571c25C6465cF03a7aE7f6',
        '1': '0x13Ee2D3060B033706298b8F4C8C939982983A922',
        '35': '0x6b67533438E38BD2Ebdc41aaDe2821F8E49968F6',
        '2147483646': '0xeE51AA6bC3fC41C162316d0619390Afc010E5938',
        '2147483647': '0x0895C3CFBF91c07e65fE20F26d95957547B3721B',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0xFe70f157fd434C60e6D15edc49Cb22d3e5d91529',
        '1': '0x69a1326F171663fd8F0841d4173d3612480d0923',
        '35': '0x38044e8dfeE535bE848eDfF8E5eeD215B0F158f0',
        '2147483646': '0x74BCc7E94251CFC411705635a4E3BbC3b2861992',
        '2147483647': '0x7af8c85b54bFC436774BAeDFE364C9d0EA842F2c',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0xFe70f157fd434C60e6D15edc49Cb22d3e5d91529',
        '1': '0x470A30284B0EC543B2dcC7ED89D52fF28C703007',
        '35': '0x8a022647Dbe8f93B1305Bcd2230Cfb2b594516E0',
        '2147483646': '0x0f52401702517cB3Aec46643660db064537661A0',
        '2147483647': '0xf295A421c43238b22299402908648f3fD0e0E6E6',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f13xlvipn6z6vpl24zup2sz4wm7qwk6osyvfdqluy',
        '1': 'f1g3nisqfl355bfkm3nwell6qt765eb6d67ypvgzy',
        '35': 'f174bfwmpuvofuiip53mg5ma4y6h3usnryyo7bcla',
        '2147483646': 'f1wbbdxrt7ytdpn72p4vc5dc7wsutf2codl44ggva',
        '2147483647': 'f1jmrizyzvcmrccpedlep6epvwv7otqwgh3kaiksi',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qrypy60qp7wj372sl4cp3pa43rrj8zj65d9tn0dm93qrw4x2n7t97dxuufwet',
        '1': 'kaspa:qrq2jvls5uq8vx2vc7v3xs5cgn9rw2evxsm88lwdz5lcfftw9kd42x2s9fgas',
        '35': 'kaspa:qrk5gc9t6rsa6pu2hwwxj8526m9hsy9rmfsnvycm456ss73w842ju2u7gge6g',
        '2147483646': 'kaspa:qq48lcmc8cju00vhwjxwefegj0j4v8jhawjxht0kqdrqtn59arxp2dn2cxsgn',
        '2147483647': 'kaspa:qphmtwr9vrz4uaszp50qzsn7ftum33z0e7rasn88jsyqeaqn4edcq60jtrlnt',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'fabf4421977176e099659871ef937efa14be589c57518a4ca7b9ad933e4fb7a7',
        '1': '8359ccd8bbbeea61c96cbbbc6d37965d2dea1f01b75b6ca020ecccb9e9cd7da2',
        '35': '56ab4bdaae68b63d3e988fd48d5e9009ff7a25b08ab50ad79fef02b7c8ed2dd0',
        '2147483646': 'e5317177279886f035f625035a278389a664841cd5b2dec53fea9695cd1d953a',
        '2147483647': '673a2b041349e2b3555acae066219e575625cb51eb860abf19b2b28dec4d5e64',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqxps2dhcmnrya8n7n96ujuu6ljgtppvh3qql4ues',
        '1': 'ckb1qyqgqm0n7e3plzm4sj7k5hnu0ra8gfy5gzpq8j3rph',
        '35': 'ckb1qyqxhs26fhry7j3gwk5mugnc50rqrkuacrtsx89vkv',
        '2147483646': 'ckb1qyqx4eca6zzy84ej7mxfkypxsa03sphntldsst3v0y',
        '2147483647': 'ckb1qyq8kwem9yjsxjqcuvw63nsy8zeccmf8782seknj67',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NAVXDPZUNZYAJMNPWS7LVBSCQ45TU7ITVBIGBEW7',
        '1': 'NCNDG3YWQR3GPY3AQMZVTXI54KDOCMVPJE2G5Q3V',
        '35': 'NDPTFIBYL2AWMMNV3TIGQORHHRREOTYXXXVZFVTX',
        '2147483646': 'NBIUJ6E43TZYFED3L77OXBUS76B77WLHBUHOE4RV',
        '2147483647': 'ND4P47NUFPMVI6LXOGYTUZD7WMWQ2WROA2XQ4DSN',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5kq6rkn294ve44xjf5w5j7u63pkk8kjswjq0xacmh',
        '1': 'nexa:nqtsq5g5804w7vrjdg2xtpa8zuhuen577lkf2uh0kfgm37gc',
        '35': 'nexa:nqtsq5g5fmt8q3qa4w0k0texexxqad7ckfpl822cmacc3f00',
        '2147483646': 'nexa:nqtsq5g5l535d60jgxlsjnxzlmy3zwp5pygd3kgg6n2uz5lk',
        '2147483647': 'nexa:nqtsq5g599kjh854a5akkzgww7fkldzaky378uwlqza4ghjw',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '15SAeQpG2CgHcxFgjBmc1E4SzjLMq6ATXjE4Pv57uc6Fmphn',
        '1': '16gAZrhrzjbRzRiZUzaDbV71xeQ6iQG9DmoGoS2Zxvsz9Ree',
        '35': '12tg8ioXaxXMq4SyDtRvmRGZHW5JL9SPNHnH8NLun62GD4cF',
        '2147483646': '1HZ2uBTTkstfXZ3dhUbj3TE939MXyy122xSpBkom2ZvqqsE',
        '2147483647': '13DQhCy11T6aTHoUaWKa76LrRj7pcT4UGuPSjw2T3p8MNuhA',
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
        '0': 'aNTwNXGwf3vQFH1FrAitjPaEA3q71K4URziULHdDt4hBUEJ',
        '1': 'bcTrpQsvBy4mijt1eyLUzS9C57ZzKQkAUZvsrF5HCrRZ8QS',
        '35': 'XpyRgWYWQtzcMUHkYq3evbgWvnmc4azJzYwCnZR6MzhcfUk',
        '2147483646': 'WDrKrtUPDFXSpaNAMsicYnMNTrpou7bxjj6tbyK5JYNFgWo',
        '2147483647': 'Y9hzAg1vuUDEapo7Aigzbfyf9qHtND5DcA6pMExN66nnafi',
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
        '0': 'H1VAPu4nnRjw54cYFXem2bJHhcwwTRVucLKdHMiqKHELExJ',
        '1': 'JFV5qnfmKLtJYXVJ4LGMHdsFcggpmXBbeuY2oKAte4xi5EL',
        '35': 'ETzehtLMYGp9BFu2xByXDoQaUMtSWhRkAtYMjdWhoDEmhj9',
        '2147483646': 'CrsYtGGELdLyeMySmEeUqz5S1RweME3Pv4i3Z3QgjkuQhVc',
        '2147483647': 'EnjDC3on2r2mQcQPa5crtshihQQipKWenVhyJK3yXKKwSeR',
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
        '0': 'j4Vkn57oA38ur22gv3XAHiDwHfVRHdgBVBB81cB85nbDNEvbt',
        '1': 'j4WzmzZgm1fpzPW9noKxuJUyrdQV2WzHAsDhE1h5Xqv16cbGL',
        '35': 'j4TDHZRnRbtkvE8tCYDpcUR9PxGAE8jTR1jgELdPsf59Ng7Vf',
        '2147483646': 'j4RcATcAMUh7T4bzGx2sHS3L4ooEHLZz2fUrQ2Some1h3K47d',
        '2147483647': 'j4TY27uwu2PL8rNEhtqiFp6Dh6VCkR35VvMHPxC5QvoFTr2XG',
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
        '0': 'dfazBTurnnkAWDx29ftMoYFvgspy9WwZDdVpGEiHsm4WDfkSw',
        '1': 'dfcEBPMkPmH5ebRV2RhAR8WyFqk2tQFeuKYPUeEFKpPHx3W3t',
        '35': 'dfYSgxDr4MW1aS4DSAb28JT8oAbi61zq9U4NUyAZfdYSE6rma',
        '2147483646': 'dfWqZrQDzEJN7GXKWaQ4oG5KU28n9DqMm7oYeeyyZcUytjcb8',
        '2147483647': 'dfYmRWi1Xmzao4HZwXCume8D6JpkcJJTENfyeajFCuGYKGtt9',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rydpHmXv1SKiijoje865XFx612KY2QBih',
        '1': 'rs8SDkit44M4vY1WWgGVR471rUS175fYhf',
        '35': 'rnhrY87Qm5A8oHxL4xUV49awgk3rt2MKLZ',
        '2147483646': 'rBc1mWGi1avovze9uL2CDnrkBuNJkBh8Hk',
        '2147483647': 'rLuaq2GzCs8xhzV8XJRmMWPuMELoKZbcKP',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'E6rY9s3Ex3vegYqxZs2WgfS2aXbd9h9dPvjJhzDvz4zC',
        '1': 'Bodi4z1GeieRgSQbdos5PLaHJ1ti8wTLN5wC1hrq1593',
        '35': '6kh2CLTTvZSNmsuYPeCQGfvGLwdVJN1ezKbwHSdjT6jp',
        '2147483646': 'jhyUAA5F4GVsjpmWjy1XjqQq7ijWo2JfzMKYy1Bt6F4',
        '2147483647': '4i7C1wxFQNZWTvwF32h4dFr1VeJscvQaW4vGoFyieHLS',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xe647f34af2d1b3937ab365e54563afd3',
        '1': '0xa5ba6d46271bb6c6f33b4534217e60ef',
        '35': '0xa36ff0644f4dc5b76f99680c592a8813',
        '2147483646': '0x6390ab02dce531721d1165de2c6866cc',
        '2147483647': '0xfbcb55bd07ef9c73997ecdfd5e56e6fe',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GA3R4S2OY4C3QXR67T4ENRYEI7FFSQC654S3ZR4COJEIB4YS7M7Y27OP',
        '1': 'GDOTKU72VPUWNUINZUMTBQV3ZLM4MEG34EX4Q2447VH7W2QKK3DUA5TL',
        '35': 'GBGR43PKJPRPHU3UTQYAHOLBUOBPLPBBO26SOWOUIX7OL3TMCXXSC4BM',
        '2147483646': 'GDNDBV65NFAFYSUIKEZZV624W2RJXZVOWM6PJRU2ZIOCX7PQ2WL7M7DZ',
        '2147483647': 'GARC7YHFHE4WHWF54IOITLAWSD2XKUXID7XZKFHYGUEJHZ7CURXP32RH',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xc6bdf3a3b38ec43f0da3bd815522549f1092a2c84826ffd590e26b973219c887',
        '1': '0x20237703179baa4e34fde0638f508a65d36c5cb29f8953a96b074a70b5d624ee',
        '35': '0x96f5ed3f5bd657e1c74f67f2ca171ba3aa1cd230c1ddc49f89f7b82908a50f18',
        '2147483646': '0x8a08a7f8a883f936de2fea705ce5a341f290efa41baaa9f53cbcb5b5f7eeeaf8',
        '2147483647': '0xb8bc55ff405427da0e8dfd00f34c5db8ea1d7fd2b5ae225b53d9207c5b9d0def',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TYufQJTADA4b2kWky1bP5eVtaoMiGSfWWk',
        '1': 'TETZfuUTuRp8U9J4VAYd22SYuqM7SwQG3o',
        '35': 'TUAwryc6rZP44hicoL2YiAvMokq8EvcYgQ',
        '2147483646': 'THA8AKN9TPvkvk5KNyjym2X2Qvw6QYEHGq',
        '2147483647': 'TTXTCwxbw4VJ65Exq9mWsARPP5FMmnuRGD',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC1541833f3508db54b734dadffffe5008d55bc970ed7c3e07d1927bec53fd08b58a62',
        '1': 'BFC8408d30e070805c12cd7bb6e4576786f4220fa36e9e46442a00f5b9cabb286d0ae37',
        '35': 'BFCab52788ef7ea21c51ff832d84eba25170d1876a23950d3cf744a4e02c406085b5736',
        '2147483646': 'BFCc242e3886a5a7914e966fbe228b27fd4619016d27c2836adf9ff5865919cb35f7ea9',
        '2147483647': 'BFCfc09750a594f84e6added92ba364e3ff0f52a1fb3533313f6e02870c34015c3ae9f0',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NbSBGEiuMExEdZ3RrHBnvcgucTsHrjMrXz',
        '1': 'NgYAVmbBcDnahVF5hEW8sJqQAWwwW1TqXN',
        '35': 'NXuLd4GWK8QYGREHcBRyfqWYmZnCbrgxVi',
        '2147483646': 'NaFPY5dgmPGaC25C7MJHwKp25iWeYgWc4B',
        '2147483647': 'Nb5JrdUq2g4A956oux2msymnLeFKfs1neM',
      },
    },
  ],
} as AddressTestCaseData;
