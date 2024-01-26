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
        '35': 'addr1q9n034hu2smmlwhxhuxdx402n4y5dfhsqjcd8ekswt2pna0qfh2rjf63mlh8z0ft4x8sgpgs3v768wlhhytkgkekx8wslp36y6',
        '2147483647':
          'addr1qyvhe2esq5scz7k3rj26kmk9h54yy0xdg4pzgm7t5xjn9t7xt8ca7f4386d7wh6gpfp7pmdpmtfmjeq63ftxd096y9rqvewze7',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'AICPBMJ5U22O53GD2K7GJXS3EYXRPQXL5BNDCP3HEVEYQAMG76VL5EEWSQ',
        '35': 'TFDZFVZ7UX2DVKTVV27S2O7CIXGWAPJHDS43UJIN5BLVHILKWLI22I2IVU',
        '2147483647': 'NMMXXXUDXYQ2B6I4F3JUODR2OUMB3OWEWXTSVB62ZMS5UV7W5TYCQYTPBY',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xd20573ae91d1b8b0834400dd95f047ee5a3b1b6712df9feb7d7126a380715de2',
        '35': '0x456ea542e46c31cb5dbc3c9c348f03f064bb37f64c77c42bc8b84c42185a1e06',
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
        '35': '1KcNSEsWmzi9VnqRxdaCRjTHJjwi9kQjfJ',
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
        '35': '37XSZzbG2kfDmtQVsc6DCbYhMR57gtnLHr',
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
        '35': 'bc1qmt38qjj5ke0606fkj0ep82uy0zajlh8qfwcvm2',
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
        '35': 'bc1pzhcdssznws35qcezgf88m5uk0rr2x6ex2gneefzm9ejrsjhacfxqpqlwfe',
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
        '35': 'DRhmNrvUdu3LU3x7Qo8HsyxrnNzAAyMfDu',
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
        '35': 'bitcoincash:qqjjrf3f932jkkhvzsdvd0f6hxxwk73hcvje0hkzqs',
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
        '35': 'LKkF6Ho3ejxWtoT2SPJh5AL4VGnwrJdGrT',
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
        '35': 'MXEY9YRTe4PdFV7kTb9TuW5JYGcoKTtJtU',
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
        '35': 'ltc1qafue8aadddnpu4j2faqx0t6hwh70nl7w88ym4m',
        '2147483647': 'ltc1q4gnmrm26damrwxczf696n0gvv98lync6zhv0mc',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aat0ne7eexx7r91rejmr45189mjc01r04atd1afg7b',
        '35': 'cfx:aaj33fgj1huz8jrfduwkuc1ja487e22z9ay1kgp3ah',
        '2147483647': 'cfx:aaj1w0ttkdeye1wr46xwvx79sk8w8x2842zk62ejmx',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1wsm2dqwga0tej7hzlw4mlj2wydrhsdvermlzmj',
        '35': 'cosmos19kxrs4g5sst26jgqfk4k6lv9gzkj2yr60ntvmw',
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
        '35': 'akash19kxrs4g5sst26jgqfk4k6lv9gzkj2yr6zgxtz5',
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
        '35': 'cro19kxrs4g5sst26jgqfk4k6lv9gzkj2yr6hgr48l',
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
        '35': 'fetch19kxrs4g5sst26jgqfk4k6lv9gzkj2yr6uwzgee',
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
        '35': 'osmo19kxrs4g5sst26jgqfk4k6lv9gzkj2yr68gcudu',
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
        '35': 'juno19kxrs4g5sst26jgqfk4k6lv9gzkj2yr6epghuj',
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
        '35': 'terra19kxrs4g5sst26jgqfk4k6lv9gzkj2yr6fh3vew',
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
        '35': 'secret19kxrs4g5sst26jgqfk4k6lv9gzkj2yr6dkl9xj',
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
        '35': 'celestia19kxrs4g5sst26jgqfk4k6lv9gzkj2yr67e6upr',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xDD1f45b8A28Edab37d571c25C6465cF03a7aE7f6',
        '35': '0x6b67533438E38BD2Ebdc41aaDe2821F8E49968F6',
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
        '2147483647': '0xf295A421c43238b22299402908648f3fD0e0E6E6',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f13xlvipn6z6vpl24zup2sz4wm7qwk6osyvfdqluy',
        '35': 'f174bfwmpuvofuiip53mg5ma4y6h3usnryyo7bcla',
        '2147483647': 'f1jmrizyzvcmrccpedlep6epvwv7otqwgh3kaiksi',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qrypy60qp7wj372sl4cp3pa43rrj8zj65d9tn0dm93qrw4x2n7t97dxuufwet',
        '35': 'kaspa:qrk5gc9t6rsa6pu2hwwxj8526m9hsy9rmfsnvycm456ss73w842ju2u7gge6g',
        '2147483647': 'kaspa:qphmtwr9vrz4uaszp50qzsn7ftum33z0e7rasn88jsyqeaqn4edcq60jtrlnt',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'fabf4421977176e099659871ef937efa14be589c57518a4ca7b9ad933e4fb7a7',
        '35': '56ab4bdaae68b63d3e988fd48d5e9009ff7a25b08ab50ad79fef02b7c8ed2dd0',
        '2147483647': '673a2b041349e2b3555acae066219e575625cb51eb860abf19b2b28dec4d5e64',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NAVXDPZUNZYAJMNPWS7LVBSCQ45TU7ITVBIGBEW7',
        '35': 'NDPTFIBYL2AWMMNV3TIGQORHHRREOTYXXXVZFVTX',
        '2147483647': 'ND4P47NUFPMVI6LXOGYTUZD7WMWQ2WROA2XQ4DSN',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5kq6rkn294ve44xjf5w5j7u63pkk8kjswjq0xacmh',
        '35': 'nexa:nqtsq5g5fmt8q3qa4w0k0texexxqad7ckfpl822cmacc3f00',
        '2147483647': 'nexa:nqtsq5g599kjh854a5akkzgww7fkldzaky378uwlqza4ghjw',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '15SAeQpG2CgHcxFgjBmc1E4SzjLMq6ATXjE4Pv57uc6Fmphn',
        '35': '12tg8ioXaxXMq4SyDtRvmRGZHW5JL9SPNHnH8NLun62GD4cF',
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
        '2147483647': 'j4TY27uwu2PL8rNEhtqiFp6Dh6VCkR35VvMHPxC5QvoFTr2XG',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rydpHmXv1SKiijoje865XFx612KY2QBih',
        '2147483647': 'rLuaq2GzCs8xhzV8XJRmMWPuMELoKZbcKP',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'E6rY9s3Ex3vegYqxZs2WgfS2aXbd9h9dPvjJhzDvz4zC',
        '35': '6kh2CLTTvZSNmsuYPeCQGfvGLwdVJN1ezKbwHSdjT6jp',
        '2147483647': '4i7C1wxFQNZWTvwF32h4dFr1VeJscvQaW4vGoFyieHLS',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xe647f34af2d1b3937ab365e54563afd3',
        '35': '0xa36ff0644f4dc5b76f99680c592a8813',
        '2147483647': '0xfbcb55bd07ef9c73997ecdfd5e56e6fe',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GA3R4S2OY4C3QXR67T4ENRYEI7FFSQC654S3ZR4COJEIB4YS7M7Y27OP',
        '35': 'GBGR43PKJPRPHU3UTQYAHOLBUOBPLPBBO26SOWOUIX7OL3TMCXXSC4BM',
        '2147483647': 'GARC7YHFHE4WHWF54IOITLAWSD2XKUXID7XZKFHYGUEJHZ7CURXP32RH',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xc6bdf3a3b38ec43f0da3bd815522549f1092a2c84826ffd590e26b973219c887',
        '35': '0x96f5ed3f5bd657e1c74f67f2ca171ba3aa1cd230c1ddc49f89f7b82908a50f18',
        '2147483647': '0xb8bc55ff405427da0e8dfd00f34c5db8ea1d7fd2b5ae225b53d9207c5b9d0def',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TYufQJTADA4b2kWky1bP5eVtaoMiGSfWWk',
        '35': 'TUAwryc6rZP44hicoL2YiAvMokq8EvcYgQ',
        '2147483647': 'TTXTCwxbw4VJ65Exq9mWsARPP5FMmnuRGD',
      },
    },
  ],
} as AddressTestCaseData;
