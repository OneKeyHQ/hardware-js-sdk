import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase12-密语2',
  passphrase: 'jFhC5z@Dk%ya2edpvkECr~qr',
  passphraseState: 'mwtNPp4ak7Cj3bEdDsFqQ3bHityz2mFAT5',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162680',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qysxa3psfysjqn9thpdsh6mu3zl7accuts9pgk897f5dwh6exnsw477v78753974lm443any46tt9u2czax3mrxnavlspcff8h',
        '25': 'addr1qxsw978fugu6fupj4upn8dnvm5xuwf2rz9hc6llkukzud5wyww2ktd5nxxwcah8zq9vdau8rz9200sks9mdvq9yl0ltsvv4nk2',
        '2147483647':
          'addr1qyya8stt5xgkl08qnkx5shxwnwl0gsksr4gjnzkkhs9wjjakd8dsg2ddy6ts4qtnxu2ss5887qxyugccah097q9uclyqsjfc4x',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'EMLA73ODZWMPQ2MYUN2KUZ2CXQHWUJKHME2NG2NKP66UO64QWSJNDHKCEQ',
        '25': 'TZ3YXXX6RSPU2T2RJBUGJCPQYMYWQKNEPUUDYSJHED5N2S3FAOQ4F6XOKQ',
        '2147483647': 'C6OQJNLPWQ7GWSDMC4QBLDXPI7PWRLPRFRVAT5MQSYGW3VDCNJLSUYJMFQ',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x9c1f0b456b8931b25540f0f2f014628b80bed6aa2722ad91638379237f64d9c5',
        '25': '0xcee46db243bc76f2fc8e3934b9dcca4ed588db00b769b4d5e272c2f91348e8f7',
        '2147483647': '0x5f5e6ef62625559bb331b9d5c105b11451d2c8df9f1ae154ffa12d798de9c2fd',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '14ue1MTCznXrJV6rF42KzYRxhd9XLFUdBE',
        '25': '1NDBfmJBTupXhf5enxJ1sYtVXqb1YWc3P6',
        '2147483647': '1MwQLS8wkLzdHXu2FLnEc295T934vzoRe4',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3B7b4H98rmC2GnGgEfabZK8cBxE3EMRjQP',
        '25': '3HjfJxjABJGXJyPk6of6fPmbhugVsbXvgf',
        '2147483647': '3GE6bv6Mkqk2SayGA84u6TRUNsXopEp4yh',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qr05zgfhuwy00r2ftyf6mv29avrw4nz5spgfeq8',
        '25': 'bc1q3xllj3mlm7c7ank56ndq55zld463zrqz3f8drs',
        '2147483647': 'bc1q5a2dqeuqvc5ugvdke5gd9aacyfull6d5zldjyk',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1p0v2wthygpk8md3gnkwe8emyjrlqy0zz6fsck5h3yc6j4tjng4cnqfnnnnt',
        '25': 'bc1pd4f5t97s7w2n982ktyvnfqgleq5h08qza4x7l2ans93unwzczalsl6wz0y',
        '2147483647': 'bc1p7sjseyha6z2gug6ss3d6efa8ntzglywgdtjkw92908zhr2znvyssxf82w4',
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
        '0': 'DKhTKEeVzq248vbe9wtXeqZVBxXcMQZtD8',
        '25': 'DTMrThou4QhQiMepvTihtTxqiXiePPfxEr',
        '2147483647': 'DC97YUhFRjH9YNmdseeP36BVwLL1xKL4vT',
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
        '0': 'bitcoincash:qqeu0xp00cxhel4akml3wv908lgm2ms75c9w0hyzwg',
        '25': 'bitcoincash:qp8325hsqewj92w8spscwd27lgu8krve5cl08v2qh3',
        '2147483647': 'bitcoincash:qq57w8u72e6ftnh3v0nql2p0th8ufc5whcxfngm5vd',
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
        '0': 'LPVpr4zPUNcvQZUMLay9iHPyePTUJXg1Ew',
        '25': 'LeHyNfjFogR2vxqwRyZhbdNM74VU6FsSZ3',
        '2147483647': 'LR5P15oQ9ztoUpKLVuVLZisFTLLiUUt4Rg',
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
        '0': 'MWEWNUEDwjyXUgNEn3sCD6za7FpEUCne3i',
        '25': 'MM5U85RT8LdoamZrFEPMZAwNdxtVGx2oQy',
        '2147483647': 'MFiLav1UDqnFS7fNEEuRR3ThxwzUMqjva2',
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
        '0': 'ltc1q64gfnhnurp9rldcfhd7lw8sxsur2hxjt409leg',
        '25': 'ltc1qesxuhgewwgzuv0e9wu4887apma00gyrmlxj2hl',
        '2147483647': 'ltc1qmyu3j8dt8pefg98vk3kvr09097gq0t6qa3jd5g',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aan8t4v8a49aftxp803ryb9bb6wwf3ae2ycah22e4d',
        '25': 'cfx:aaprdg45ngen6p6ftvrp26dy3k9zukwpya9s42astd',
        '2147483647': 'cfx:aarv0a62x3e8wbcpmv7na83wvtt5n6c9cuf7rrjkj0',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos14920vuzm4acamhsha9x56cxplzx4tnjphp42ps',
        '25': 'cosmos1ctfppeshf2mzvt046gar9lvvwamkqed23jp38t',
        '2147483647': 'cosmos1csntkkfled9mt96cpe89zdlh80cts84nrspatu',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash14920vuzm4acamhsha9x56cxplzx4tnjp66cdc2',
        '25': 'akash1ctfppeshf2mzvt046gar9lvvwamkqed2ufvk73',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro14920vuzm4acamhsha9x56cxplzx4tnjp06anap',
        '25': 'cro1ctfppeshf2mzvt046gar9lvvwamkqed2fffgm6',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch14920vuzm4acamhsha9x56cxplzx4tnjpyuuwr8',
        '25': 'fetch1ctfppeshf2mzvt046gar9lvvwamkqed2z0g49u',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo14920vuzm4acamhsha9x56cxplzx4tnjpl6x6hz',
        '25': 'osmo1ctfppeshf2mzvt046gar9lvvwamkqed2efjp3e',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno14920vuzm4acamhsha9x56cxplzx4tnjppnk3xv',
        '25': 'juno1ctfppeshf2mzvt046gar9lvvwamkqed28qz2qh',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra14920vuzm4acamhsha9x56cxplzx4tnjp3902rs',
        '25': 'terra1ctfppeshf2mzvt046gar9lvvwamkqed2hkm39t',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret14920vuzm4acamhsha9x56cxplzx4tnjp4ypruv',
        '25': 'secret1ctfppeshf2mzvt046gar9lvvwamkqed2nh4c6h',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia14920vuzm4acamhsha9x56cxplzx4tnjpxty6ma',
        '25': 'celestia1ctfppeshf2mzvt046gar9lvvwamkqed2qcspax',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x81f2A434b6E87008c2ABc1241E3519256fB18B3c',
        '25': '0x52A213aDDBbF2AD3d34067eAaF7906466eB75769',
        '2147483647': '0x94A616569CDBFae9bAB7256f2C7A827B815800aa',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x5e89cBbed9E2E90fa483B030BC6140f6989a58c7',
        '2147483647': '0x338832e6d13a58062D37e763616c5b8d868d9A90',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x5e89cBbed9E2E90fa483B030BC6140f6989a58c7',
        '2147483647': '0x55C4D3Ddb71A4e9b76B7c134C7B6f4A09ac4C24F',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1s7vmpthr3thmulladbgl2jfmxhzrrv5lwm4onia',
        '25': 'f1xkhj3ludpnynmaifz6uqasqwqn4sf7frdbistpy',
        '2147483647': 'f1xbtwslm64jrwyhprec7ezvqez4mqnkwdkt3ceqy',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qz0u4qxc299kydjr5wugrvlhelx6wrh63umhkk3306memymqyfj0cq2uxx8f2',
        '25': 'kaspa:qz484szcs7v69hqf4drtdvs7ty260y4h2gq7zq9k6w092q0lkek3724p3z8vw',
        '2147483647': 'kaspa:qpzdghtp32x5lqhhg9zr8ra436x6zjv9x4z8u8r3tvael3vmhsslknhrrzd59',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '238dd99983b04389bdbfb433477f0e8f799f9e391e7c160f7e8b1918d5f4bf69',
        '25': '79510bccca6671f0813b523bc9ffb5665d3bba9836dff896294c2693a6177b87',
        '2147483647': 'f28a180b87b86f623a6b7614a6b605ba8776328d1ffab8e1fe119cca260395fc',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NBJ75AS35ZRDRITF3TRB6EEMVRFB76FOWB7AQISB',
        '25': 'NABW5UO3GLPMCRUJDYVMMZQAY43Q6S3DGJI52QI2',
        '2147483647': 'NAWRBVXTDLC5JJT6MFJWYKSXRH7UCOLORZBVZRZS',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5ytv3fr73ddgvf659f7efqw8w4g3h6hwrujqns39n',
        '25': 'nexa:nqtsq5g5pymquhwasjuw3fg44r9agfvfk8jh9qff3l64jrje',
        '2147483647': 'nexa:nqtsq5g5jtk3p6raufwlqkl7qs5vt97v8l8jcn0we2vs2nqm',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '13jpQwS9UBPQVkdamA546kkzuoL6aV6wts8N7uY699UQirn5',
        '25': '16izVdp1TQiDwBSzhLdu4jXLG7oJEHnEsYi9aNASCFMZLGpR',
        '2147483647': '1WyWrb4aq2XMYJS5YTFuGABUfidxP713NYV4PjPVixLaf2A',
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
        '0': 'Yg7hu9APdm3H3euHpUAzG689E3ZrQFYqZu2CKkbTRSr8ZdK',
        '2147483647': 'WTGopJ5WHQA8qKkcCrNnmVJi6S7EJFbz5K98owtozvmzSQa',
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
        '0': 'FK8vvWxEm8rosSWaDq6rZHrCmcggrMzGkEdMGph4rfPHfjr',
        '2147483647': 'D6J2qfsMQmyff7MtcDJf4h2me1E4kN3RFekHm1zRS9K9PWF',
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
        '0': 'j4U4RqeR3V7cxtq4p5VTjokdqaZR2P57yYK2KLAb428bXBvqx',
        '2147483647': 'j4RqawZZxbmG5kcjfPsqwcG329RoZky82gpSSGenMNi5T3gLA',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rfmLFYsBJ6nUKQRYFZgTrDj6N5ntyRRLBy',
        '2147483647': 'rHkPg9WRTRwyzoGyiKHAfdC3cCf6HmUrf6',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '6MBCyLJkWz1PSiSqK4n1tf2bSzTXjPXxiSPCNickQqa',
        '25': 'Aju8pYu3ZCyRcZXidxFNqMCQNsz8epEgKkcGtXj4ac88',
        '2147483647': '2yfyG9QGDgR86U9PSouvaaozXgbqeqJ6WaJZkiUWTtBU',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x4a8965b3eaeccad3bd0a1e53e22274a6',
        '25': '0x9f53837476a5fae78d8475d8bc2e5ae9',
        '2147483647': '0xc7d58b33b8065fa31be1e4bae23db921',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GBKYRUDNEHBBSN5BFSVWW6E2U2XK6CKOFCYHG5KVMBSK5BMKHCWUYI23',
        '25': 'GAZSFIA5J5EKJUXJP764PR57UUVY6LLWMKBKZ77T5WGKXAZ6AC4O5NUL',
        '2147483647': 'GDHSK7BJQDO2VIW5HOBZVQHDE5N56GQMZ3ZUZF5IYCTVNKYEYUUIWOFB',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xf26dd435784744d4666558447c5102ec56e6f4b7069e503f12ab849d89a758a8',
        '25': '0xd8f50a4cdabc2e43487ed3622db96b391ba40b0ff2693944c6cdf92eaba3080c',
        '2147483647': '0xb7ca2399a2e1cce17ff7b9b6a3edcc01156117dc1118ed63fae3a654ac499a0a',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TBUfdsgaHtm59vNML8rgEahqjP844CAFXL',
        '25': 'TVYVTytB2H9Ay8Q933AKoZoF4YpzAxV6B3',
        '2147483647': 'TTpd2BUBaCuMqHtBhTCJe9dgXVnHBtbqXf',
      },
    },
  ],
} as AddressTestCaseData;
