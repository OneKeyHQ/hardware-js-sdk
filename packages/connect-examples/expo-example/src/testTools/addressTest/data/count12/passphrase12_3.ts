import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'passphrase12-密语3',
  passphrase: '11111111',
  passphraseState: 'ms8QNM6uuo3zbo4SM9YqrsxPRGv3b3HmuQ',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649/passphrase-12',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        0: 'addr1qxrwuuccm88c8rlntmfd4f42860a0vvp7m3k3e6e56u75u5ta3csahrwxumct6fupq6z4v3cg6ky477p8gphye3w0k0qns4zgy',
        1: 'addr1qydjwrdx4n52depq8yhcraufngj6nqqm94u3xya47ne5jtkjx2udf8zxtp5tz2ws7jfex670fsufm7h4xxtqw93y6cfqe8lzx8',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        0: '3IAK33SJQ4FZNXICBKP2I4IBC5DWJH2ZZS36WCKROVCRIWWIHEN2JBBTEU',
        1: 'Q3MHFZPVG2375O5BYVQRIOFQPN3JHZATT57ET2VIKII4TAZDWS5YCZDNNY',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        0: '0x090657a5f714e2a6984a11fe87a85725ee27eca330ad61395aee2092a7f45d25',
        1: '0x65053da4a2c4d11841a5d2fc867e5e4f05e631c28042306e6717ca96cd0dc98d',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: `m/44'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '14ox6PqPnEEzfnQrcszLUb4HiKhSkdzQAC',
        1: '1MoT4Q5UtdwAh2q1WbB3Mud4Qo9THbdg8F',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: `m/49'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '3HgHMHhh871x6hxcuSGtfmLfyJRxbyyhTr',
        1: '3HowNofsgJ21UFtEQZzRQ9BLTbRkn1wNGK',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: `m/84'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: 'bc1q56d5cjs2a2qjvjnfr34r34d9lqgstdp8fedlse',
        1: 'bc1qdg5g8vpfmrx6vw6zclsarc04z40xq0xeeswqhg',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: `m/86'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: 'bc1p5xxd6ukcdrw80ly466g9xu8entahpjj0gtqsqpunpc3cksc6t2nsyruvmz',
        1: 'bc1pfc6xn0xvraghlw40w3w7apsj7t9l3a3aa0zf8f6cd6kasv7ymupsq7n3du',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Doge',
      params: {
        path: `m/44'/3'/${INDEX_MARK}'/0/0`,
        coin: 'doge',
      },
      expectedAddress: {
        0: 'DFvnQADHV1foAnbUEceiHc77JagKxB5DG6',
        1: 'D5MG4NxXVit7Hhu1QbEEDcoj2JKiRp1Dwj',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-BCH',
      params: {
        path: `m/44'/145'/${INDEX_MARK}'/0/0`,
        coin: 'bch',
      },
      expectedAddress: {
        0: 'bitcoincash:qqurrm5e3ctc5ulamacrjrssc5yl3rxwmqs54nrl3z',
        1: 'bitcoincash:qpahqczcwkrpw8yr4f2de8lq8rx4hyrlrgtg22auj9',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Legacy',
      params: {
        path: `m/44'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'LWNH2UsQNKUkT2ttV7QdFjVgVstmp3mWJ1',
        1: 'LNRrd3KXWwwpVpVRfwivDhPR8898DJd7Cd',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: `m/49'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'MTX2aiFUJ6N5tbiaGwPZVfJsDRW7ipqJgP',
        1: 'ML2UfcEB8MQDMDYCggPbDXQsDFM4LJ2rQT',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: `m/84'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'ltc1qzqe3r4kr5jk8vewvutj238a9k87t2ystp5x409',
        1: 'ltc1qf6q655uvyg8vdrv2gc5sfcl9wvrep6kudg9w5y',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        0: 'cfx:aarjde7bmcehj036bj9h0j005ewcrvymty1d46aym2',
        1: 'cfx:aamd8agm0exz8cb861wehwxj4tzg5btxwyc1n76cjt',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        0: 'cosmos1gcstv0akxdxuajmycg8az3tautn05y296p4n4z',
        1: 'cosmos1c5dmkfahrkjmssydxe7dzndvhk380nm6zhfcv3',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        0: 'akash1gcstv0akxdxuajmycg8az3tautn05y29h6c5vc',
        1: 'akash1c5dmkfahrkjmssydxe7dzndvhk380nm60vyl4t',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        0: 'cro1gcstv0akxdxuajmycg8az3tautn05y29z6a2fn',
        1: 'cro1c5dmkfahrkjmssydxe7dzndvhk380nm66vppsq',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        0: 'fetch1gcstv0akxdxuajmycg8az3tautn05y29fuuhh4',
        1: 'fetch1c5dmkfahrkjmssydxe7dzndvhk380nm632quwx',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        0: 'osmo1gcstv0akxdxuajmycg8az3tautn05y29j6xrrs',
        1: 'osmo1c5dmkfahrkjmssydxe7dzndvhk380nm62v6g6r',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        0: 'juno1gcstv0akxdxuajmycg8az3tautn05y29vnkgj7',
        1: 'juno1c5dmkfahrkjmssydxe7dzndvhk380nm6592rtd',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        0: 'terra1gcstv0akxdxuajmycg8az3tautn05y29u90nhz',
        1: 'terra1c5dmkfahrkjmssydxe7dzndvhk380nm6ynncw3',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        0: 'secret1gcstv0akxdxuajmycg8az3tautn05y29cyp6g7',
        1: 'secret1c5dmkfahrkjmssydxe7dzndvhk380nm6qja33d',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        0: 'celestia1gcstv0akxdxuajmycg8az3tautn05y29ttyr00',
        1: 'celestia1c5dmkfahrkjmssydxe7dzndvhk380nm6nacgku',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        0: '0xb2e8841e85c5704A809FE7Bf9B7A03CC03c8c08C',
        1: '0xd6Fd97088c30CFBa80e1bb89c6389a76659618c0',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: `m/44'/60'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '0xb2e8841e85c5704A809FE7Bf9B7A03CC03c8c08C',
        1: '0x85f1002055D26f3258fE9F235f144c34841Ab4d6',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: `m/44'/61'/0'/0/${INDEX_MARK}`,
      },
      expectedAddress: {
        0: '0xcd3851147fA5069cdE9C25d6eBEEdAD87223d0bA',
        1: '0xd4BC750Fbf41279cE3A21d9817070677B5Ac52e7',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        0: 'f15hjd7r554mtskvtp423ylc6kyw25qwidvjbj7py',
        1: 'f1cbdanz3ud32bda57a4bcph5lqbryn22tiyjfewy',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        0: 'kaspa:qq9mcg8rhx3gn5e2kfsdjccfjeuhajlypapart7zfsypg74vahnnk7sl3c4r7',
        1: 'kaspa:qqr3p8upfktsyj24azqpqzheaam27j277t6gtkq3jskec3kkt7kr2rf4arw8q',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        0: '86d85cf0c5c9304993f5a5138eff05b4483dae69c1be2ca2e426d44cd80ef3f2',
        1: '24cef1cdc193c708d16035ca606ebb7fb435a2206a213eaaa89c77faf05b4a04',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        0: 'NACSDY4TCGA37SZNX6DGRSQF2X6BT2CDTF3XG3O4',
        1: 'ND2M7XEYOFOVHMN5JM2HKOVWQ7LEP6XRG3262E63',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        0: 'nexa:nqtsq5g5u7z4appsd3n97nc5kut29yh52a04mdvf4xn0m7w8',
        1: 'nexa:nqtsq5g5yrmdmav9dceda7mas7qt703gxs5xcq875z4kvlh5',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        0: '1iqYnHQPWvcC2fetJivvurquj5FRZSGGqkKc9cPVqJgtfXH',
        1: '11etVhyobqvoW52LWBhRoEFohQZM6yubjCCTaRK4y89cbxT',
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
        0: 'Wf8qjzRJyJEyKgyQy83pRBy99nihUasDYWygZptp7H8JMn1',
        1: 'VwxBTQzj4DZao6LsAapKJZP3882d28WYRxrXzdpPF6b2SLX',
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
        0: 'DJA4mNDA6g4W9UahNUygiPhChMqXvhJeiraqWtzRYVfTUt9',
        1: 'CayQUnnaBbP7csx9ZwkBbm76fh9TUEwycJTgwhuzgK8BUAQ',
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
        0: 'j4S3SyVGJQTAAb76tCe7cdujgaVABE9THvHeGpQfMNpRoMq1f',
        1: 'j4RLGKCgspY5VCaWFeqaP8o76UTVV9gzwFB69fqUGwxFG5eCs',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        0: 'raTsST5mBfx4FZ3xVWcb8bbVp2FjB2EYsq',
        1: 'rh2qS43wr34jUrMg1KZpcgRWDLwkHkkK66',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        0: '5zghGgs1YfLtWAUNtanLe1evHp5FEgAfYmFNMT8vADAf',
        1: 'HAEo3jSeJYxR2pf4vPgjkfhQgGpuwtZrAC3phQ8BKq4C',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        0: '0xbd4bc3d248e7952af7ca651766293d52',
        1: '0x55f7f53914d7acc9ecdb6a159882ad76',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        0: 'GADBZDBXUTOMUYBHZLOSS3MYRUE5C2ZDXOPV4ISZW6H2WJCVD7CKT2JB',
        1: 'GDUU6OKMKYBXID2Y2HDQH6FAWK7THLOFQGKS5GM2TTGJDVEQ3QW7Q6DL',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        0: '0x46b7cc10929fb4f63cdfdb00bdb4fc9628f8a0cbbc08f4201adfc076c706b958',
        1: '0xb647b226e5b71164de0a772b3e72ef695e2a20d36bbd911ec94e2fccb8880316',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        0: 'TF2hetHtsw8FgsSEbDdW46VuGvPuVtGTEj',
        1: 'TEffxSgr9yTX9PH5cUvEX7pHGASU6JyZ7H',
      },
    },
  ],
} as AddressTestCaseData;
