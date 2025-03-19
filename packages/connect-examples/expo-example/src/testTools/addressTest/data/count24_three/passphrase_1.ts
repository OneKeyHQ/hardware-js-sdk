import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'three-passphrase24-密语1',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428736557',
  passphrase: '0987654321QWERtyuioplkjhgfdsamnbvcxz@!###$$$%%%^&*',
  passphraseState: 'msnViVktp8SWFH4hjf5EYmXzTAiD6J89AB',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q9zd2w0crrz3lh2p86l8eddu78fk5qfjpkxl4pv29nxsltwdsjkkjvvvyl5du32egvxh3734r224ldkz5eak50q6jecsjd2rea',
        '1': 'addr1q8jr5ue63ldp27hdzktus3r2649tjllgzz2nz23zpud378wpj0ayk52yv7cr5dc4xn47202zwdrjmuvgeuw3yufzr39s3me062',
        '50': 'addr1qx08epcaanaswwn0jy24zzcsgr2tuxkf0663lmcaj6mjfj3hjjv8nfclf7g0d8w8kw3y2slx36ljsvcvdjm0dtw8gahqee728d',
        '2147483646':
          'addr1q9lg35ytuk7apneppakgpfdzf3sa266uep5s3s7w05r9hf969tnj6cmupa3ptt4kkx3swm7jsmmmxdslpdep0t2cheqqnlytss',
        '2147483647':
          'addr1q8jmkk5uhvu0mrs7dxvrt9fkwmtxfyycuksq0a7v3ck6aa2r3fw4uzzcseugk4vst68dpvj64yxzu9dt30j5nejx6uqs97gkp4',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': '6CUPQI562HW2QJZKL3J4CGDWGGUXP63GXLEK3WDW6OZR6LXCLK45XBC3AQ',
        '1': 'UFFXP4BSWEXIIPQBIZHB6E7CDUIPL7NU33ZETSRFCULR7DTX4UOWF4A424',
        '50': 'C5V23SXU442DUPPYEBGTT5MX2WRGBD6PW2RMY5NHWBMSR3K3NCESOCFTAA',
        '2147483646': 'CR7VVBPEPUOIEAPOGGUZ3HXWZ4TNGOBSNJPOJ5R2FNIIV62NXMFZSU3M2M',
        '2147483647': 'LK7FELHCTAP27YPHAYQKS7OM7DVUB4XPERLBOVCMV7SQYRX5LKCUK7WDYY',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xf78d0fd8cf979446c9b4f7764b47dcc7bea189ea61dae6a4ec1e314702d4e8fc',
        '1': '0x8627285f1f8d8cb915766aed5bf35c7974f6a660f05ed57df2312a434fe84961',
        '50': '0x31f5ef02cf7aa9521460e67ef221bc9545c27c44be8a02c70e674859b60c217d',
        '2147483646': '0xe340a5dcb269b83a6b87c2515bd5452d6292b51165a113588a43c87ec6d8d699',
        '2147483647': '0xf7820b6913575974298251a8e7c3cc2770aa874abbcd07446949ff64953074d7',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '18WVQA7ndtSpiVi5JpdBWWeM8n1FbMCNQV',
        '1': '17gMaVG6SGz7cX5gCXec9NMtbdVUNU3c7b',
        '50': '1EhwtKbwaEVPR3RE8J4VCzjxaYzDh1rDKg',
        '2147483646': '1L4ttC4HgDViehiPmVgKYLxJ13w78C21Tw',
        '2147483647': '1HQH63hBp6TdYKJwG8isBVHz1uFgmPjVpH',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3FmHVmJUngzT6da4dnXfLPdV9JZxLqrVPa',
        '1': '3JFE2MeE3znrbF325YNuS1GoMrQgXWV665',
        '50': '3PhAsvVP5VQaqZYcjAXVQhyERqaSUqsTdD',
        '2147483646': '39jWcjZx8PYAzNKUaA9f4UN3ScvjC52aTJ',
        '2147483647': '3QEexa3ZGKR4PQPCcqcnWBMQ62DtmzFgsA',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q76k9luedd4tftccks0qfavzfsyxt0dw968qd6q',
        '1': 'bc1qdnat09c3uu7tztxg8d62xpqdksmkwzrtvlk3ue',
        '50': 'bc1qenuh95f0sm3244qucnplqt2fa06zhwj9rszx2y',
        '2147483646': 'bc1qfxpv490lqvlcl2ky3fuvcncmg0dc27460g7xxn',
        '2147483647': 'bc1qml9t369jwjpjqv62x7kcscdq8m7jltjt6c2l2f',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pc0jlqs8mzeaz2tyms6rspjca9nw9gc6q6ln3tcvc8ueztcappwsqp2cdz0',
        '1': 'bc1pv84m0sjy7fm8mpvzxwqf442zsg8jchxnlp5uf5k74hzspwzedp5qf7trxk',
        '50': 'bc1p875sa6d7l9d7c8y4d53p526m4lm2tz969cfl4dy9y03t88uklqcqvyw3vd',
        '2147483646': 'bc1pddz9ntpq9xfu35dclua32smvfcdeqsa65pmw0flkvx7uchptzajs4569hn',
        '2147483647': 'bc1pzt5jx904jpag9043mtk5xq0w6d8kl45kkflyrumk9xg8nutjq0fq05n3h9',
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
        '0': 'DCWBy4GK5gX9RdntYYQwGK1nQGocfcvYQp',
        '1': 'DLrvsoEoqrxZz89TMGSxCuxk81ZVNzjaxh',
        '50': 'DNZsvhPMT3L3weAWRCkzgS8uDWNsxsVEmZ',
        '2147483646': 'DRJe1bKk37SywwEdB5EGGPeP8fzvgmecGJ',
        '2147483647': 'DPoo3jWZgA34wRRyxxERpABSkSVcUNnW2q',
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
        '0': 'bitcoincash:qqzg7g9wlsvz63aen4cacsvgty5wwcd9zcqd4lqlez',
        '1': 'bitcoincash:qqvmy0rdwyfgf759k4uwlkuevqtc2348vqnu90ax7t',
        '50': 'bitcoincash:qzt0xa80pwlgyn0fg05gc24ccy3lqzn8fczx9zy6gg',
        '2147483646': 'bitcoincash:qzdc9ffagvnf2m538sxr4sav3hpmrtxgyy9j5zu85u',
        '2147483647': 'bitcoincash:qpafzwkulz2vvu0r8w3keq5xt959leuykccrhfzh44',
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
        '0': 'LX32fttXiW8Yk5SeaTsbWkKJYJbqqAVVH4',
        '1': 'LMmZHj3dGAY7YoMLtmNCijv1SNmBkkbqL6',
        '50': 'LebtYF6ojEL5Jf8wE5osLUrSfoF6kXywtd',
        '2147483646': 'Lcb6gN9rDwExLyx6k3ruX1GaSrAxMgJgWv',
        '2147483647': 'LhVJyYjL21uotrqNervrvLeZa7vRcRQsyf',
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
        '0': 'MQsLaPPnPpQ9Ua8x2Xe1FGBUuSAAiRMgjU',
        '1': 'MJwjzYQE3p4Xm89AUsyMwNfn5pgNmjdx9t',
        '50': 'MNVrrHGpREmKLwBRUGTbNPAEP72qfEDU7e',
        '2147483646': 'MPaDjZvg9RrBFEs8ZbbUS8y1fDoQEomfby',
        '2147483647': 'MULMgZ2hupTXxBoEc6JcCFThsJBrXkPPGz',
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
        '0': 'ltc1qerdnlv90pyfp9j2xc58273muqu3uhsannjg5n9',
        '1': 'ltc1quv8mjmej0pt3q2g37vs8vua5kur3rev7yjdju7',
        '50': 'ltc1q9gxrgtm5yhcfg2jp0dpdsgjrmnldx9mev8kzr9',
        '2147483646': 'ltc1qdkpykvvt5nkevqc03ysvfjuu3c8mcdknxec6c7',
        '2147483647': 'ltc1q9qe70896lxwjvl7852zwzzdxnx05mthkk470sp',
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
        '0': 'Neonjcht5cyMQFasm7koVepWBDfbf1xBpJ',
        '1': 'NMrBHYa3N4PjEHVG9zRp5o5DYuDsy1x2W9',
        '50': 'NQHPtb7bYKFjZVSNLNHKz9Z5JMnn1cMXdK',
        '2147483646': 'NZgPmQKVbJYVpD3dZE1PfsoPwHhkdk5YS7',
        '2147483647': 'NTj5NLn2uhd6UCWYvZ41wUKoByrjes2VpH',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqdcdpah52rn4s3ajxhrjde3q32ppagkeesp4ua59',
        '1': 'ckb1qyqraru7wsjmt37f5872kg33q2fvngumslhs6ww6cd',
        '50': 'ckb1qyq2avfz35zx2malyzeepv7pq57snd2yan3qahr3g4',
        '2147483646': 'ckb1qyqwgt4fe6jaajwjak0m2qxf85y224pq3l5s2xyj5d',
        '2147483647': 'ckb1qyqqymdvd04g67tz8glwv0ddvspu25ymjsnqz6d99p',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aam84jxcugujedp4v3h3xzk9g7n5bzfdhpe89yw543',
        '1': 'cfx:aan3h8mg6hbwdybp5mxtyaha2uddbchg0y29u4k0k5',
        '50': 'cfx:aanp1a7fsp66atsept41gkjrjyubypbbd254j4aaen',
        '2147483646': 'cfx:aatpt3r33d91xv3muv19g2hdvggcv9w5vp1jgdrkes',
        '2147483647': 'cfx:aasw209syjr47z4254tem69tbanv1r6rgav9983hn2',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos18q7nk2h07meddk9pxxdyye00rjru0xngs5yw2z',
        '1': 'cosmos1mk2dt9jqeh0d84c8xr98zgeswhhxscgu4sx4wj',
        '50': 'cosmos123emrjuh7r66hlz34jft0d2u28dy8nfkkn9aur',
        '2147483646': 'cosmos1kc9laylc2lz9d584ln0xyre8szt9283xayz6qq',
        '2147483647': 'cosmos1y2q8pd3hw89kny7d03efmraqyamx74h3vuezr7',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash18q7nk2h07meddk9pxxdyye00rjru0xnga0ffnc',
        '1': 'akash1mk2dt9jqeh0d84c8xr98zgeswhhxscgucttjhg',
        '50': 'akash123emrjuh7r66hlz34jft0d2u28dy8nfkmgg69e',
        '2147483646': 'akash1kc9laylc2lz9d584ln0xyre8szt9283xsl0ae6',
        '2147483647': 'akash1y2q8pd3hw89kny7d03efmraqyamx74h3p8596y',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro18q7nk2h07meddk9pxxdyye00rjru0xngg0vhkn',
        '1': 'cro1mk2dt9jqeh0d84c8xr98zgeswhhxscgudtwvjr',
        '50': 'cro123emrjuh7r66hlz34jft0d2u28dy8nfkwgdyqj',
        '2147483646': 'cro1kc9laylc2lz9d584ln0xyre8szt9283x9l2ru3',
        '2147483647': 'cro1y2q8pd3hw89kny7d03efmraqyamx74h3583ml0',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch18q7nk2h07meddk9pxxdyye00rjru0xngrfd2g4',
        '1': 'fetch1mk2dt9jqeh0d84c8xr98zgeswhhxscguxd03v9',
        '50': 'fetch123emrjuh7r66hlz34jft0d2u28dy8nfk9wve75',
        '2147483646': 'fetch1kc9laylc2lz9d584ln0xyre8szt9283xwet7zh',
        '2147483647': 'fetch1y2q8pd3hw89kny7d03efmraqyamx74h3lpsxpf',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo18q7nk2h07meddk9pxxdyye00rjru0xngc0h7us',
        '1': 'osmo1mk2dt9jqeh0d84c8xr98zgeswhhxscguat49cq',
        '50': 'osmo123emrjuh7r66hlz34jft0d2u28dy8nfk7gkd23',
        '2147483646': 'osmo1kc9laylc2lz9d584ln0xyre8szt9283x4l32kj',
        '2147483647': 'osmo1y2q8pd3hw89kny7d03efmraqyamx74h3y82j4v',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno18q7nk2h07meddk9pxxdyye00rjru0xngxx84d7',
        '1': 'juno1mk2dt9jqeh0d84c8xr98zgeswhhxscgurz9wfw',
        '50': 'juno123emrjuh7r66hlz34jft0d2u28dy8nfkqpxxml',
        '2147483646': 'juno1kc9laylc2lz9d584ln0xyre8szt9283xtkpp8u',
        '2147483647': 'juno1y2q8pd3hw89kny7d03efmraqyamx74h36w6eyz',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra18q7nk2h07meddk9pxxdyye00rjru0xngks7wgz',
        '1': 'terra1mk2dt9jqeh0d84c8xr98zgeswhhxscgun5u4vj',
        '50': 'terra123emrjuh7r66hlz34jft0d2u28dy8nfkshla7r',
        '2147483646': 'terra1kc9laylc2lz9d584ln0xyre8szt9283xmqc6zq',
        '2147483647': 'terra1y2q8pd3hw89kny7d03efmraqyamx74h32crzp7',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret18q7nk2h07meddk9pxxdyye00rjru0xngj3s8h7',
        '1': 'secret1mk2dt9jqeh0d84c8xr98zgeswhhxscguh4junw',
        '50': 'secret123emrjuh7r66hlz34jft0d2u28dy8nfk5k35pl',
        '2147483646': 'secret1kc9laylc2lz9d584ln0xyre8szt9283xlpknau',
        '2147483647': 'secret1y2q8pd3hw89kny7d03efmraqyamx74h3wedt7z',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia18q7nk2h07meddk9pxxdyye00rjru0xngp747s0',
        '1': 'celestia1mk2dt9jqeh0d84c8xr98zgeswhhxscguy6h95l',
        '50': 'celestia123emrjuh7r66hlz34jft0d2u28dy8nfk8e5dxw',
        '2147483646': 'celestia1kc9laylc2lz9d584ln0xyre8szt9283xvwn26d',
        '2147483647': 'celestia1y2q8pd3hw89kny7d03efmraqyamx74h3akgjen',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwoYf7XG3pJX6zKbZ1rxcBaXPLPpWCFDHhMLAjRdGAec6VrjNPK6vdR5YWQYwcusceQmGvwmMbeLhX4qAkzP4gtN1cA7Vy8XY',
        '1': 'XwnYY3qcduYEdit9gUtXUpDvXxi7b8xqzfUP4SLZtFPweb2rTKPBCgLjTsDoT3FJ6aPwXT1D65VXA5nUV2utPefZ1kmuNBHv5',
        '50': 'Xwoq8d4QE2kc25seaFg2NFH4akjDj4NC3ht1NkRvcnZjWbQzKE51syajGzLQnyxrRDhDkjusgLgrBDqtjF9HLkaJ2K3jvgwZ2',
        '2147483646':
          'XwmsXfRqqw7JPATQppUS3DQdKFY2eBwASaTvaB41MvhCMNrYeCRTdPJdU5EmpqG4xcPGkKD2GcamQMzqr5brv8pJ1pGk1ydDq',
        '2147483647':
          'Xwoge86JMewMeKgV6SHHr2SVftyFMgVf5JLY8jQf6EaW5HTbUZbCkJR6A2N5GM4VBN6qZMvzAnUkd1fg5tYBQzde2gNhKjUcY',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xC97cc00B8c7D082792c61Da5865fe61e67A92b53',
        '1': '0xBf66453260bA16586346fbD5451D21dd9caB5De9',
        '50': '0x4C12b97B2a46262cd4d164c1F683EFa8FB616A23',
        '2147483646': '0xBff381Aa27cF9A8d79FA4664B35D09CAB1D2eFee',
        '2147483647': '0x18f0cF7510daeb98151AF89e778145a0CD24BEe0',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x2D472fA47a6f525b48398642a5923F5D4951eEf2',
        '1': '0x913618E4a28De5AA2352dcEc2E7B1195f062B92a',
        '50': '0x9fc33F8112E172Ba089356b7A06A46D509Fa701F',
        '2147483646': '0x87225A02fCC7088E392b336862e8F48821f2932F',
        '2147483647': '0xA6f189D0dFE4d5F7969E2C6C366F23C7b2CABe81',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x2D472fA47a6f525b48398642a5923F5D4951eEf2',
        '1': '0xe07c8217d5cb550855bAa268267900fC42910b2d',
        '50': '0x9C4483D752d8b2CffDb5F50F9F4d6AC0205EaFd7',
        '2147483646': '0xd624379854C466db35261de93f2BB4Ed1e37a71C',
        '2147483647': '0x176728DdA5d505473ce66F10555d7dD1f835968e',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f12ovuht4unnjsess6eupowswcqhtxagl2efrv26q',
        '1': 'f1tn2pw7ggksrbwk5ark3gevmd4sev7m66k4errsa',
        '50': 'f1xfajwjwul4ui3r26xmlxv6ec5ibrh46agt6nw2q',
        '2147483646': 'f1zhdglti75rw7tkxlwkn7zrulfkegdflafpeju5a',
        '2147483647': 'f1lgvaiql43bealb4t4j3hipqffffqaxoxz475xhq',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qq97t8trju0a6s35rnzg2e35t5ar4gv08la9ktkqzxpsmanfrhz72ajf6s8q0',
        '1': 'kaspa:qrm0hpw86t07hf7lhwmkl2xxnf4tnuscavukczssyuvr384mc9fvs0mrhwu0k',
        '50': 'kaspa:qr46ea22e6xyppgn5zzh5c3kejkqzcf3yqcrmug975jnl5g76uyrqzuw7039n',
        '2147483646': 'kaspa:qrm2rg8pqqzvckeex087msf6rrlggpfe32slcsg4qc55jqnlz6q8uupy26uch',
        '2147483647': 'kaspa:qzej0lcupmlk976y078fncv65av8tu522tc7dttz989n4ufzr8mwj4v4s5fxd',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '741dddd0ca63cf16b31a9d4177d960d871080689bf16820cfba57e543c404129',
        '1': '056136f1cb72bcee711fe96382f6fc3f36c16deb51191a037c0352bcd993b9a5',
        '50': '3a3f4c2889c2880b05b25bff2174a2910ac43dae68929cac56f570cf504274d2',
        '2147483646': '42e94baed2cd83758c70e4339b7c8e6cfef7b2748c5cb3564248d13d02d6ec74',
        '2147483647': '81e499d12b49bc0a28651799a60d5c1e54cd356efeab3b144b4f033ef88e3f2e',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NDBJ3NWGI443E4WUVIUD3QRPI2ECYP5F5F5PQX4T',
        '1': 'NAGK223SXR3LPARWBIL77UPAYS5FSFNWRI6JH7LU',
        '50': 'NBQDAH3K24KD4VVVEKSQ23RY3W7O5DTX5E4UCM2N',
        '2147483646': 'NDBNWOMGC52MBAVAAFKXAYWUBHMIBQ7PM5IZ7XIF',
        '2147483647': 'NDSPT3RTWCPTSBQKO26FWYWRW34AM6PNPF2KTN3O',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g59tfd29uyzsj7r032cyew7yep6x7rdjhs2w96re2s',
        '1': 'nexa:nqtsq5g5tepcgk6cxp6l9zs6h8dur0at6spg0ueehn6vwlxu',
        '50': 'nexa:nqtsq5g5qwerr3204nerzhrjlw4nk7m7qyhpep5shhfz8zu3',
        '2147483646': 'nexa:nqtsq5g5e8r5d2pv06ll9k8dmzjwl65rxgq74u5glj7q42tm',
        '2147483647': 'nexa:nqtsq5g5an5fajsjudu5jm084qdwqxwnaew5m5tt4slyfnhc',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '15oAdv2h7nKXgsJe38S6aVYmVy7i6g52Szg4CnxNUJhabWh8',
        '1': '15UpMT4VAd4ALucDMEexCTDeppc6TyaYY2e12aYWX4pqcQdU',
        '50': '1QvGuBcXCxdX5Q7orZfmc8ejGue1jn3KYsmtD5DzRycV931',
        '2147483646': '1JtECMENSCswjQByeRH3KBWawTxQFrTsdLbBy2bPQvR79nd',
        '2147483647': '15jJkAajxRauxWAET9oxcAAzZMWj4HJMB1Ymu7sXR8XbbvDJ',
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
        '0': 'ajTvsji3EhAUAKxZnqDTzstjPqBNbDdPhSiHDAsnag21Bpx',
        '1': 'aR7eQmW65Ro8CdXsu455xYn4FKZjtj9UjQf6zm1qLoH2A7A',
        '50': 'WMDZrtdSfLGJNRSLWxnf7Tmxhd7HeveGFeRxdHjJhx3tgH4',
        '2147483646': 'WFBXA4FHtaWj2RWWJpPvpWdpNBRgB14pL7FGPF6hgtrWtYJ',
        '2147483647': 'afc38HkssxYjoBYypD5VfW7nnECLCSx7iKRyY62jQW31adY',
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
        '0': 'HNV9u7VtN4yzz7ZrCC9LJ5cnwQJD3L4psnKSAEyQ1tZADLn',
        '1': 'H48sS9HwCocf2R9AJQzxFkW7ntgaLqauukGFwq7Sn1pB7sQ',
        '50': 'CzEntGRHni5qCD3cvKiXQfW2FCE8735hRz37aMpv9Ab3svi',
        '2147483646': 'CtCkBS391xLFrD7niBKo7iMsukYWd7WFWSrRLKCK87Pg6Sr',
        '2147483647': 'HJdG9fYj1LNGcyAGDa1MxhqrKoKAeZPYtf38VA8LqiaAjz9',
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
        '0': 'j4W7n4d1b8iZ65wjsMTpnHVRcAjCduG646Sa1R41LMHph4exg',
        '1': 'j4VoRnA3PBZHijz3Sfa3duT6VVah2GZbaBUXxEqbUQ3wx5crH',
        '50': 'j4RjXhcAWY9CBv9qM8BxMUc1VQ2zZpKo4xzmj6U8BsR6ix2B6',
        '2147483646': 'j4RdVeuL8PNSSLoqRHyoxkK4MFhYtCqsVX5EYQE5ZGQ3XaPGr',
        '2147483647': 'j4W3vAsZdyMpUMabTmVCeKA3qE7bersKNpTSj7NvVJ7ei5Caj',
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
        '0': 'dfbMBTR5DtKokHs56yq2J7XR1P4kVnXTnYmGG3bB8Km7YVH4f',
        '1': 'dfb2qAx71wAYNwuNgHwF9jV5thvEt9pyJdoECsNmGNXEoWTrf',
        '50': 'dfWxw6QE9HkSr85AakZ9sJdztcNYRhbAoRKTyj1HyqtPaNtc2',
        '2147483646': 'dfWru3hPm8yh6YjAevM1UaM3kU36k67FDyPvo2mFMEsLP12iG',
        '2147483647': 'dfbHKZfdGiy58ZVvhPrQA9C3EST9Wk8h7Gn8yjv6HGawZVnEQ',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rP52k9jtCWmzifPe7x7o7L4EtNWSgEAVED',
        '1': 'rHrsMfnNg449Nei53LCSzgZRsEBwYZkvJ6',
        '50': 'rN3bJRgsAAJrUMVFkeUoZF2d6zR4YuXCWK',
        '2147483646': 'r5kw5dmXWSFbp2y1HV6sydtqZCUerBdjV',
        '2147483647': 'rBqqjSQSLGFeaGyNa5e74ukMXS7QsQH21B',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'skkrKcA2nRX3Dv7sqjpFNqkmU4E9rAEJ8KrcUa8Pxgj',
        '1': 'CJoffzQ3bXJAeKRJMurREWb1PsLRyuckZhW1Fy81xfMV',
        '50': '8dJZR8F1gq1Wm1gWRWoaJU7sgKiGtynr9bTVoiHnD1yQ',
        '2147483646': '4hoayrMgp8ResptWomGC31fYNoxvetdT31JUxfnJCkJN',
        '2147483647': '12KAPJwxLFqu5LbXHbGAiGo7ooXdqeidqbUEzc1TcPt3',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x43ce36cb291a46e885a8b1508b6f7604',
        '1': '0x14bdc1e485a577f0d6add8456489f3b5',
        '50': '0xb43132f9b6ecac3a061226cce1c70ccd',
        '2147483646': '0xc621a394f3b6496b24de2f68d6a682b0',
        '2147483647': '0x5ccde7447860b2a46aa6189be2da3cac',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GDPLYLV37KUV37RK3DE6WOU4OVCHOOVIUJGYSDKXXXGDYIYBCW6SOMPH',
        '1': 'GDAFBF6OZ3Q2ZFCA3XFQ3KJPJMMAKIGNTN2L5SLLCECTZIMNWLZSIC3D',
        '50': 'GAFLS2W43577B2Y5BAQC4HZ7WI2JFIZEJMPO2NL24SGQMN2NWA4XR42O',
        '2147483646': 'GDYZW6UEHQHX55FPQZ37J32XRRBXEMABEEOAKXXCLUM2G6MXMMLVGB7I',
        '2147483647': 'GCPI3U5QRXJBK76RZKP4JF22H5OI7ANCNAP3V6XV4LZTB5GXKGXU3FOK',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x43aac93a4c8c7396cd948c3b4e0cbe65bce0d0c2c1b7e8bf0bc468f18c240a6f',
        '1': '0xc040d60abb89508bc039149502e15bbe258beaa557ae04023ba91b7b99912681',
        '50': '0x15944cadfa55cc8c8239d574454af2a3ae49324ba4bfe6c5086a70f2810bd89b',
        '2147483646': '0x792b25c7eb802b6d8f6152da0ed658b8a07967eeedfa9446b13c950bd04f6528',
        '2147483647': '0xfbd5d5ed5bda79dd29c44a8d123c4c2f6a66d1756ca6469e6b30c67f925c5e53',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TPYoBKf3TKfjKLWy3zKhZtcYRc827HHpVW',
        '1': 'TC94UjHMj8XMBqvrTfEpmg9NcLsgQph4mf',
        '50': 'THvN33kXXDNf8Rwu8TLToNKoupzBQ4ogvo',
        '2147483646': 'TVcqiYLLFXUBboEME3eke22QJ9CJRQZvvs',
        '2147483647': 'TZBvNVzxT5vVH9HPMYS9XBBTaH8qJZnDv1',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFCd249c6e9952b34e340790036c5a88cbe20a073ad0a30b2ff0cec1454cb50ddfe448d',
        '1': 'BFCbc42e9b7df88ad8f21348ca3fb4e3331a8cd1a106cf2a25e3661e96a27b67f53cf9e',
        '50': 'BFCdfe80d60fd9ac32af434e2e189533048c01dbf548a388ece8d6747f0a89c1cc786c4',
        '2147483646': 'BFC0107f5de1176bb285962dd7fe9972c4fb76a81de38f3ed008dfaf4815f4a711133f2',
        '2147483647': 'BFC46b509433b912ad94b3de282ff7f125a490eebe657ddb8cc431ae528d69a25e39472',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'Nhk9YdZN2kW4tmUBEnpLG4f463shzjwxNf',
        '1': 'NMJcnbewBNwpkGwmpw5TtDgUsDx5UrV5hi',
        '50': 'NQvvE8FzDpkboyY1USHtFt1Zh7d6zsctcj',
        '2147483646': 'NY2oEVs9gjvRGJzwrHZggdonvELHWv744e',
        '2147483647': 'Ni6nccxVghQ2zdTzZaMowsrg7agQF3z5oC',
      },
    },
  ],
} as AddressTestCaseData;
