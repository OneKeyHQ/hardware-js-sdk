import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'three-passphrase12-密语3',
  passphrase: '11111111',
  passphraseState: 'ms8QNM6uuo3zbo4SM9YqrsxPRGv3b3HmuQ',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qxrwuuccm88c8rlntmfd4f42860a0vvp7m3k3e6e56u75u5ta3csahrwxumct6fupq6z4v3cg6ky477p8gphye3w0k0qns4zgy',
        '1': 'addr1qydjwrdx4n52depq8yhcraufngj6nqqm94u3xya47ne5jtkjx2udf8zxtp5tz2ws7jfex670fsufm7h4xxtqw93y6cfqe8lzx8',
        '21234567':
          'addr1q87d2zlg2mscnk9wd8c37dmt202ky46cd88mgaw0x0j2nd4v5p5lkeh868mq9ll53kjcx8exly4xy445t75u663xytasv0cshp',
        '2147483646':
          'addr1qyuxq2llmqzapl4lldxllfg4zhcrwumpazgm68xek9axy3ly2f3tkmt2ayj6al7s7uz65z609wzun0hehz5x8e4y0gsszhpqjj',
        '2147483647':
          'addr1qy7yvd2jsgaq8j52l23qgygkgmpcx8rdmgmpky2z9mu95nxs9q5md8zsmy43j0x8759g65jfn3e3szwnegacfzv60a5qgalhtf',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': '3IAK33SJQ4FZNXICBKP2I4IBC5DWJH2ZZS36WCKROVCRIWWIHEN2JBBTEU',
        '1': 'Q3MHFZPVG2375O5BYVQRIOFQPN3JHZATT57ET2VIKII4TAZDWS5YCZDNNY',
        '21234567': 'RMZ542KLQLAXUGKVG523LBQGBU6IXEQ3YYSSLEIR4XBLUABZKDT32KH7UI',
        '2147483646': 'I22UFVNFINQKPNQTU7PFWOOCUZR7LGPZGCB5XKACI27D7V365YSJ4QPT54',
        '2147483647': 'RNVPVZT765MTFZP4K47N5QBJWT75GO5PFZCYJIND74C6Y3SZQR3QO3NR4Y',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x090657a5f714e2a6984a11fe87a85725ee27eca330ad61395aee2092a7f45d25',
        '1': '0x65053da4a2c4d11841a5d2fc867e5e4f05e631c28042306e6717ca96cd0dc98d',
        '21234567': '0x286e555763f92a3e5e0a44cea75b1b40eb6c12aaffb3cafcb421a37f18a2479a',
        '2147483646': '0xe8ec0ab1a1860ee833923c155ba399e3d9df1b492ce179b125e4c61a90d9dc62',
        '2147483647': '0xa51e5c1682899cbc8ed3d4bf08ca7e82ed6997db1569700dab8fbdde2f5fa2a5',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '14ox6PqPnEEzfnQrcszLUb4HiKhSkdzQAC',
        '1': '1MoT4Q5UtdwAh2q1WbB3Mud4Qo9THbdg8F',
        '21234567': '1LkSrZraZcmbZ1XZpJQsY5Q4KaXPWLCDBR',
        '2147483646': '14AEN8W24MSnCpwo7RGvhBufsoiyADy5Lf',
        '2147483647': '1KUxarQuQ8MDYedMebwcLURyuyvnsZpcxU',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3HgHMHhh871x6hxcuSGtfmLfyJRxbyyhTr',
        '1': '3HowNofsgJ21UFtEQZzRQ9BLTbRkn1wNGK',
        '21234567': '37J7V5bwPRnuawg9sBEJdDhSgSKNsze15W',
        '2147483646': '3JxuX9ZDtJpwPrXDb129dtwR72sTSHFKT3',
        '2147483647': '3FzzwezqihRaDj9kVXYQM3Zy2KgTXgxnv6',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q56d5cjs2a2qjvjnfr34r34d9lqgstdp8fedlse',
        '1': 'bc1qdg5g8vpfmrx6vw6zclsarc04z40xq0xeeswqhg',
        '21234567': 'bc1qdfac2f6n2v268e57ldyffl528a604kq9zlwz70',
        '2147483646': 'bc1qvzhafgnapagzfrwnk5jauevqvyvsc7v2pajp36',
        '2147483647': 'bc1qla0at64yhlndxhflw8vces0hyef6txlss7xz0j',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1p5xxd6ukcdrw80ly466g9xu8entahpjj0gtqsqpunpc3cksc6t2nsyruvmz',
        '1': 'bc1pfc6xn0xvraghlw40w3w7apsj7t9l3a3aa0zf8f6cd6kasv7ymupsq7n3du',
        '21234567': 'bc1pm4095tr85vvz2dfwnkr3r5edkp8v7avdrw67whmrwcl5zfpn9maspv60fk',
        '2147483646': 'bc1pwadlywcyv76phcwa4senpjqgj94c4znp7pwz26qx422erfqkugsscevl2j',
        '2147483647': 'bc1p6992gh9jkpc9cjc2d0gumnghnjyc0cpmycgq5kx7v6w0s0cutjvsyj4vhc',
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
        '0': 'DFvnQADHV1foAnbUEceiHc77JagKxB5DG6',
        '1': 'D5MG4NxXVit7Hhu1QbEEDcoj2JKiRp1Dwj',
        '21234567': 'DJw6FSQ8jMmethuMCwNr34xSqeSBTP7dMa',
        '2147483646': 'D8TgEasLvQ5F887GfQLnSzafvtMKBcDmHw',
        '2147483647': 'DRkcgAhTvKCTq2Z2EUxPakD8nCVjEbYqFG',
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
        '0': 'bitcoincash:qqurrm5e3ctc5ulamacrjrssc5yl3rxwmqs54nrl3z',
        '1': 'bitcoincash:qpahqczcwkrpw8yr4f2de8lq8rx4hyrlrgtg22auj9',
        '21234567': 'bitcoincash:qpwjyjze84sf8zczxalh0uhswhkcqdsr3u69sqqggj',
        '2147483646': 'bitcoincash:qqameqkupg0qw2jrsw2t3j2ryky55lfs7s0erw4a59',
        '2147483647': 'bitcoincash:qrp2hf22vw7myu3899wd2a4q8js4lgexhu492hz5r5',
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
        '0': 'LWNH2UsQNKUkT2ttV7QdFjVgVstmp3mWJ1',
        '1': 'LNRrd3KXWwwpVpVRfwivDhPR8898DJd7Cd',
        '21234567': 'Li9aMyUhckoVSSAg6DPX7i385o93VMSQP5',
        '2147483646': 'LhUQwtH8pfBxC4njGUZaZuyme9sMRpr3zD',
        '2147483647': 'LWA59kAPi429XkXgXjpMX7uWScSVdcBVif',
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
        '0': 'MTX2aiFUJ6N5tbiaGwPZVfJsDRW7ipqJgP',
        '1': 'ML2UfcEB8MQDMDYCggPbDXQsDFM4LJ2rQT',
        '21234567': 'MSN5qLZoPNnZQRAZp26NcAdkUw1mPgjUEk',
        '2147483646': 'MPf2jCEzjJBgVvF9vKzS1vtzkyAvSCeqtQ',
        '2147483647': 'MG4Rq9xNBpmsiU3fJ6vAbWHzXH8kT6o7rQ',
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
        '0': 'ltc1qzqe3r4kr5jk8vewvutj238a9k87t2ystp5x409',
        '1': 'ltc1qf6q655uvyg8vdrv2gc5sfcl9wvrep6kudg9w5y',
        '21234567': 'ltc1qdv8tm2cs4hu8jssdufgupy7uy7tu7mtx88492m',
        '2147483646': 'ltc1qerz70wtr7w4zhjty4swpc4wlfg7mgc5rwljpdr',
        '2147483647': 'ltc1qu267etkatejffffj0dwwdm8njx3cqmnhudywl4',
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
        '0': 'NPLBHQ6tEd9NyKxYiGg3GcUuzNSJvs4DDc',
        '1': 'NVhg51iDuwuwKTsbwSex4asKGWEryEPXd8',
        '21234567': 'NhpToESeTZD73vf6Do76i3TjbZooSumgmv',
        '2147483646': 'NRs8cDpcCgFb5yvJf87vMNjMWWTjqc54Ng',
        '2147483647': 'NcdeD73rQRqm2b2jYERXgigxdfNjMrRRdp',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aarjde7bmcehj036bj9h0j005ewcrvymty1d46aym2',
        '1': 'cfx:aamd8agm0exz8cb861wehwxj4tzg5btxwyc1n76cjt',
        '21234567': 'cfx:aaptaj1vuw1asw6h8pa81sy70c0x1w3pxyhb2f6nb5',
        '2147483646': 'cfx:aamw76y2tz5e88fj8vux3uj87ty4t8a912t4m0rn2v',
        '2147483647': 'cfx:aakhad4kxjwz5wrrr6jvu9jfnea85u2dp2brz85j9v',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1gcstv0akxdxuajmycg8az3tautn05y296p4n4z',
        '1': 'cosmos1c5dmkfahrkjmssydxe7dzndvhk380nm6zhfcv3',
        '21234567': 'cosmos17jaks6wl57hzy0ank58khtwyn79emrzc3nh3p3',
        '2147483646': 'cosmos1jke03sv8nfks9ygasl0p5c32t5sz0pfc4r0nkk',
        '2147483647': 'cosmos17n42tmzly3haaaezjcteyv3tj8xnrr3vgfthyj',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1gcstv0akxdxuajmycg8az3tautn05y29h6c5vc',
        '1': 'akash1c5dmkfahrkjmssydxe7dzndvhk380nm60vyl4t',
        '21234567': 'akash17jaks6wl57hzy0ank58khtwyn79emrzcug6kct',
        '2147483646': 'akash1jke03sv8nfks9ygasl0p5c32t5sz0pfcccz50v',
        '2147483647': 'akash17n42tmzly3haaaezjcteyv3tj8xnrr3v9jxsag',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1gcstv0akxdxuajmycg8az3tautn05y29z6a2fn',
        '1': 'cro1c5dmkfahrkjmssydxe7dzndvhk380nm66vppsq',
        '21234567': 'cro17jaks6wl57hzy0ank58khtwyn79emrzcfglgaq',
        '2147483646': 'cro1jke03sv8nfks9ygasl0p5c32t5sz0pfcdc8228',
        '2147483647': 'cro17n42tmzly3haaaezjcteyv3tj8xnrr3vsjrwcr',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1gcstv0akxdxuajmycg8az3tautn05y29fuuhh4',
        '1': 'fetch1c5dmkfahrkjmssydxe7dzndvhk380nm632quwx',
        '21234567': 'fetch17jaks6wl57hzy0ank58khtwyn79emrzczw74rx',
        '2147483646': 'fetch1jke03sv8nfks9ygasl0p5c32t5sz0pfcx7xh5p',
        '2147483647': 'fetch17n42tmzly3haaaezjcteyv3tj8xnrr3vm5znx9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1gcstv0akxdxuajmycg8az3tautn05y29j6xrrs',
        '1': 'osmo1c5dmkfahrkjmssydxe7dzndvhk380nm62v6g6r',
        '21234567': 'osmo17jaks6wl57hzy0ank58khtwyn79emrzcegyphr',
        '2147483646': 'osmo1jke03sv8nfks9ygasl0p5c32t5sz0pfcacurqy',
        '2147483647': 'osmo17n42tmzly3haaaezjcteyv3tj8xnrr3vqjc8jq',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1gcstv0akxdxuajmycg8az3tautn05y29vnkgj7',
        '1': 'juno1c5dmkfahrkjmssydxe7dzndvhk380nm6592rtd',
        '21234567': 'juno17jaks6wl57hzy0ank58khtwyn79emrzc8p52xd',
        '2147483646': 'juno1jke03sv8nfks9ygasl0p5c32t5sz0pfcr3vg32',
        '2147483647': 'juno17n42tmzly3haaaezjcteyv3tj8xnrr3v7mgvrw',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1gcstv0akxdxuajmycg8az3tautn05y29u90nhz',
        '1': 'terra1c5dmkfahrkjmssydxe7dzndvhk380nm6ynncw3',
        '21234567': 'terra17jaks6wl57hzy0ank58khtwyn79emrzchhd3r3',
        '2147483646': 'terra1jke03sv8nfks9ygasl0p5c32t5sz0pfcn84n5k',
        '2147483647': 'terra17n42tmzly3haaaezjcteyv3tj8xnrr3vwd3hxj',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1gcstv0akxdxuajmycg8az3tautn05y29cyp6g7',
        '1': 'secret1c5dmkfahrkjmssydxe7dzndvhk380nm6qja33d',
        '21234567': 'secret17jaks6wl57hzy0ank58khtwyn79emrzcnkrcud',
        '2147483646': 'secret1jke03sv8nfks9ygasl0p5c32t5sz0pfchxm6t2',
        '2147483647': 'secret17n42tmzly3haaaezjcteyv3tj8xnrr3v2vl7ew',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1gcstv0akxdxuajmycg8az3tautn05y29ttyr00',
        '1': 'celestia1c5dmkfahrkjmssydxe7dzndvhk380nm6nacgku',
        '21234567': 'celestia17jaks6wl57hzy0ank58khtwyn79emrzcqexpmu',
        '2147483646': 'celestia1jke03sv8nfks9ygasl0p5c32t5sz0pfcyf7rvm',
        '2147483647': 'celestia17n42tmzly3haaaezjcteyv3tj8xnrr3ver687l',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwogVWDkZn9CFNNoRc1YQoM85oEQiQMB2KWSvyb6ULLxHjnka8ncyyc5khn2FoBgFi8Dfrw1JeTo2F1goutAGfBW159gpxaQ6',
        '1': 'XwmnoLccdto1YDqjPjiVu7hgUDNgUmMV5UeJBK16GYtr4XXvQ1hzSRWQPxdCbecT62Wu9Ao359KuFGgNwwC7PenY1aT1yqYbq',
        '21234567':
          'Xwn2YJqULNM6n2Vn2RyEcXCwktLuQbwgvMEydNtJ7y7xZJh4HaAqjhJQk6M8rDmNPiY6XvRSbHaCHGVcZF2XnvhH1wiJbMx4K',
        '2147483646':
          'Xwnyodf8SvwPKGoJPcKWPEYVngqYi2F8iS7NgHzAeNDoHrJ2Wc3TuJYLbfndMLrsdyGhrX2rAtLagiwSCCK6yuE41ozCrfz5B',
        '2147483647':
          'XwoesxVyZbDatW7Knr7XQqDT78q5yUsKCAhBow1pSbwjMCHnd9M2gexT4TABC8WfTjZ3ftPnx84fAaQhUCG6Wu1j1hvSARsvS',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xb2e8841e85c5704A809FE7Bf9B7A03CC03c8c08C',
        '1': '0xd6Fd97088c30CFBa80e1bb89c6389a76659618c0',
        '21234567': '0xB58c3eEA2c2a753f157AE46940FB3B106939024b',
        '2147483646': '0x1ecDcA18fb2554eeCAdd38BB9BDF1c8142eD7eeb',
        '2147483647': '0x8AD7e48EcAB767Ad4Dbdb7BDA36D33f01A1BC26A',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0xcd3851147fA5069cdE9C25d6eBEEdAD87223d0bA',
        '1': '0x48804D4FB98737189b1d8DeDC436D4F74296A505',
        '21234567': '0x83608B5c64BD914d88E855914dAd0C27536635ed',
        '2147483646': '0x8d17FFfa9a8107D0e6f7f6e48d32F01DA8242851',
        '2147483647': '0x3F05D6C2F85DCd0f20142AC02dd963E4bF2fdA1d',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0xcd3851147fA5069cdE9C25d6eBEEdAD87223d0bA',
        '1': '0xd4BC750Fbf41279cE3A21d9817070677B5Ac52e7',
        '21234567': '0x713e9E584AF3aBc9369960A1551C732a1204BdDe',
        '2147483646': '0xB0C045fc9846eAb0DcCF754F369E3e39cC6b854D',
        '2147483647': '0xc02125cF8A499C624f2eeAb09F11b2180d68acbA',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f15hjd7r554mtskvtp423ylc6kyw25qwidvjbj7py',
        '1': 'f1cbdanz3ud32bda57a4bcph5lqbryn22tiyjfewy',
        '21234567': 'f1rkmyie4kng6mfgtypp4nou6wvggg3yqbqt37jty',
        '2147483646': 'f1cut7xuhscibouagw2znzngowetkie7rfim54xcq',
        '2147483647': 'f1ofuda2q7tcgkf7ioazg6zaad2hyhug2hitzigma',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qq9mcg8rhx3gn5e2kfsdjccfjeuhajlypapart7zfsypg74vahnnk7sl3c4r7',
        '1': 'kaspa:qqr3p8upfktsyj24azqpqzheaam27j277t6gtkq3jskec3kkt7kr2rf4arw8q',
        '21234567': 'kaspa:qpqx3haeuktjzjuq55u8ygydcte8guyx4aj3glfrpdwly8e75thequ8x23yp9',
        '2147483646': 'kaspa:qrpr7jkhjfmfhcvcgv0spwkzz85px2n7w87hy7c3xv5vzt2yhrc5squj6ef7q',
        '2147483647': 'kaspa:qrzu0gzjre5rlnrptnjj5fscn22l8lq20fkul045lf2jdjn7p4c4zw6fzd4zv',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '86d85cf0c5c9304993f5a5138eff05b4483dae69c1be2ca2e426d44cd80ef3f2',
        '1': '24cef1cdc193c708d16035ca606ebb7fb435a2206a213eaaa89c77faf05b4a04',
        '21234567': 'd86f99ddbe2f9dfa86dd57b67c918d9580b323e5816ae9ee96682d9b77dfebcd',
        '2147483646': '426c6edb510d871bc85948b2533b53161f8c7843adceeabd6fffa8715d836664',
        '2147483647': 'bde97dde767f268812b3ca6d3a5abdaae8ee20d94f6328acc2424f3255a3ba4a',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqfgdwx4zz7tjywdc9hxuytz6xe28yh7p9qr9z7mq',
        '1': 'ckb1qyqvw06s4czscusdwvvpkt4krrmfk5xfr6tsz0cky5',
        '21234567': 'ckb1qyqr3ph4clfrtcv53s2zuj7aaxcqyl6r99vs07kvfc',
        '2147483646': 'ckb1qyqqr5qhpf3cr77jnk9yp7eteu66695vun0sqzlzgl',
        '2147483647': 'ckb1qyqdh5qn7ce2cfq47pdjrznj7990p9fcaalsdrtu9t',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NACSDY4TCGA37SZNX6DGRSQF2X6BT2CDTF3XG3O4',
        '1': 'ND2M7XEYOFOVHMN5JM2HKOVWQ7LEP6XRG3262E63',
        '21234567': 'NA7WEVYH7S5BSEUX6BXVIPYWRRWLUUUB43PSCVU2',
        '2147483646': 'NBWWDCWMYQUKUJDDUUQEO3QWSLEU7IA7WQHUW3I4',
        '2147483647': 'NBOLUZDCGFF5YGMH7JYZDVAQPSXIDCHAQUOAX74Z',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5u7z4appsd3n97nc5kut29yh52a04mdvf4xn0m7w8',
        '1': 'nexa:nqtsq5g5yrmdmav9dceda7mas7qt703gxs5xcq875z4kvlh5',
        '21234567': 'nexa:nqtsq5g5vr3ayx4q5uk7ku495a8ye30kxyakk6am30zg7w2g',
        '2147483646': 'nexa:nqtsq5g5lzedpy35advs6mpqckl967cvz30qagxtc72d4m6r',
        '2147483647': 'nexa:nqtsq5g5fnfm3qvg52kemmv06lrjegkykz0nwajna6mdvuqt',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '1iqYnHQPWvcC2fetJivvurquj5FRZSGGqkKc9cPVqJgtfXH',
        '1': '11etVhyobqvoW52LWBhRoEFohQZM6yubjCCTaRK4y89cbxT',
        '21234567': '14AfDpxHtcPtgZ6nqRTcrFWDF5EEQFNBv4GduvCxzoxF3Nck',
        '2147483646': '15rEBCFq1eepbtBm7QRne8RQizQjHsheDA5HyBHQC46e987r',
        '2147483647': '12RFwAgGXem1jamgd5BGDdBDJN2mSiyFZ9Ux4zAEt8aRfBxf',
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
        '0': 'Wf8qjzRJyJEyKgyQy83pRBy99nihUasDYWygZptp7H8JMn1',
        '1': 'VwxBTQzj4DZao6LsAapKJZP3882d28WYRxrXzdpPF6b2SLX',
        '21234567': 'Z6xWnfJp4mXTr87N5rjjkqLUVwhgAWnrm3HzLRUK5vgSxbx',
        '2147483646': 'anXU9xqw72TPBD5e4puXdkXxR8CZnrF9rqx3bVuWL55YnAH',
        '2147483647': 'XMZE8PHT78eWso19jaP78WLXnkEie7rVrFc9QNkCQYs4j26',
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
        '0': 'DJA4mNDA6g4W9UahNUygiPhChMqXvhJeiraqWtzRYVfTUt9',
        '1': 'CayQUnnaBbP7csx9ZwkBbm76fh9TUEwycJTgwhuzgK8BUAQ',
        '21234567': 'Fjyjp36fC9LzfuieVDfc434Y3WpWcdEHwNu9HVZvX9DbzMg',
        '2147483646': 'HRYhBLdnEQGuzzgvUBqPvxG1xhKQExgb3BZCYa17mHchzJe',
        '2147483647': 'DzaT9m5JEWU3hacS8wJyRi4bLKMZ6EHw2bDJMSqoqmQDky7',
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
        '0': 'j4S3SyVGJQTAAb76tCe7cdujgaVABE9THvHeGpQfMNpRoMq1f',
        '1': 'j4RLGKCgspY5VCaWFeqaP8o76UTVV9gzwFB69fqUGwxFG5eCs',
        '21234567': 'j4UVGeXwBuYdT5dY29krJZFP3uqKACqPDZWAb8BFvso5MWTDr',
        '2147483646': 'j4WAqbuEj2atNzxczRjpUM8JFPkVf6TifrbyFBSLN53DkcGTU',
        '2147483647': 'j4SjsMsfAYaza8fCuwQZwvd43y87hFJzHCbNuHFDCm7hY8JDX',
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
        '0': 'dfXGrNHKwA4Qpo2S7q1K8Twj5npi37Qq2NcLXSwq9MHienVXs',
        '1': 'dfWZfhzkWa9L9QVqVHCmtxq6Vgo3M2xNfhVnQJNe4vRY7WS6V',
        '21234567': 'dfZig3Kzpf9t7HYsFn83pPHNT8As266kx1prqkiRirGNCwGng',
        '2147483646': 'dfbQEzhJMnC93CsxE471zBAHec63Wyj6QJvfVoyWA3WWc384b',
        '2147483647': 'dfXyGkfioJCFELaY9ZmmTkf3TBTfZ8aN1ev59unNzjazPYrkg',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'raTsST5mBfx4FZ3xVWcb8bbVp2FjB2EYsq',
        '1': 'rh2qS43wr34jUrMg1KZpcgRWDLwkHkkK66',
        '21234567': 'rnSC2m4vVnyKR5DKhSSqZBjQZhtkjRQJUh',
        '2147483646': 'rPenPfyiS5ZyaoERZGyQ3hqVwxq2Q9zPi9',
        '2147483647': 'rNtUyRGqv7x9EQg4wUcxtoPaaa1M2NFeLM',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '5zghGgs1YfLtWAUNtanLe1evHp5FEgAfYmFNMT8vADAf',
        '1': 'HAEo3jSeJYxR2pf4vPgjkfhQgGpuwtZrAC3phQ8BKq4C',
        '21234567': 'HNkr49NkdxpLSTDEP5CdQkh6ymrXmkonNYrWrTH43YzD',
        '2147483646': '8cQzYLdzCbTkLYFpstsKaagjAxbC6CgD44xEut7QakxE',
        '2147483647': 'CXGLnRvATTbeJEUkCqtzfdhedUKkDuispY2WRUvJTsg3',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xbd4bc3d248e7952af7ca651766293d52',
        '1': '0x55f7f53914d7acc9ecdb6a159882ad76',
        '21234567': '0x9260b7713550a9bc4b3fb61a93fe756b',
        '2147483646': '0x3350097626a83ca6c08768bbb5cf425a',
        '2147483647': '0x4e2153f0aa69311f40462137392f986b',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GADBZDBXUTOMUYBHZLOSS3MYRUE5C2ZDXOPV4ISZW6H2WJCVD7CKT2JB',
        '1': 'GDUU6OKMKYBXID2Y2HDQH6FAWK7THLOFQGKS5GM2TTGJDVEQ3QW7Q6DL',
        '21234567': 'GBBOVA64JDCLV6TIKYYIQXAK56N6LDVKXD5XOXDSPZOSJGHATK4XFFXO',
        '2147483646': 'GAESBK42NS2RQOX2JLKBCHQW6SABYLMBRZKVD5IKTF3DYOXRARFSGYLY',
        '2147483647': 'GANKN2ED5ZI5RP5GAO6BUZKIXESWS7AOE3EASDEW6KOG6BNQWSKGEXW4',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x46b7cc10929fb4f63cdfdb00bdb4fc9628f8a0cbbc08f4201adfc076c706b958',
        '1': '0xb647b226e5b71164de0a772b3e72ef695e2a20d36bbd911ec94e2fccb8880316',
        '21234567': '0xae48740d55e4a501bf3d5f1d2a543a514c10c4ee8cff14273bc6e0bac591990d',
        '2147483646': '0x7d1429b4f31bb37035a7adc8dbf69d0d915da39f19bdb4ba060eb6377ef90ffd',
        '2147483647': '0xab31714ed6c62deaacfda00c5db1f92a1789ffa4a4cc77179e96f97df18b7243',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TF2hetHtsw8FgsSEbDdW46VuGvPuVtGTEj',
        '1': 'TEffxSgr9yTX9PH5cUvEX7pHGASU6JyZ7H',
        '21234567': 'TPmPpe5UHt6qsoVVuuRePLgiiJcWpWP2mN',
        '2147483646': 'TEG2eUm6FiohMCcQrSAoHFvbcePK1Lp2kk',
        '2147483647': 'TS8C5VCCCR83yqRvrLx2sj23k9EHsnbnC6',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFCc3f6d4edd2c00125fb4aeb58c54d1b06626b685bf1be2a16a600e29713a2f67ea7e8',
        '1': 'BFCc1f9138bdc1d03cc47ab9cc909c6ec704b09444ee7610dedd0ed0dd7a39f4869596b',
        '21234567': 'BFCa16113164db28e788422fb265dc08ae0a30b647602714f59da188c024a392d396fe6',
        '2147483646': 'BFC8ff609bf6e3b87965f4d2e8dd3f57d19d4c65ad71133c4e7a8348bade49c0f695831',
        '2147483647': 'BFC5b8bdd12050906421fde23d116e702f0dbd6362c92f4b0e77a3b227fba2ac2475439',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NWtABCpj9wCLJeGVhCwqqGxaP34GHXSCVd',
        '1': 'NWFNt2tiaX1LfzfoKiKD3VK2kDKYj3XfQg',
        '21234567': 'NNyjSe8y1pSK97ieVzC17mThoyLUsmUA1f',
        '2147483646': 'NYPU6be7k6txVLzax84v1U8RKnd4xdj3p3',
        '2147483647': 'NNRUtHhfDA8rYsn4N1JxTGLMdnG6oenAGS',
      },
    },
  ],
} as AddressTestCaseData;
