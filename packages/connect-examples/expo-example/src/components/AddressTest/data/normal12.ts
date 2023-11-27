import type { TestCase } from './types';

export default {
  name: 'normal-12',
  description: '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/218726488',
  data: [
    {
      method: 'algoGetAddress',
      expectedAddress: '74MX3E7TJRON3LTP3DCRR3AJYAVNRMYZSYZPK3XTJ3UOTHZFJ65SSJKHWI',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/0'/0'/0/0",
      },
      expectedAddress: '12FYqAVUYjrPtGCYk3hfW3NYrmqYayF8nD',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '37gkBRwk2wso7NJhhuMaaYYxwKa1ooBzbu',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/84'/0'/0'/0/0",
      },
      expectedAddress: 'bc1qztfq5mg7nmn82pa6hawgv0fazuqnqpf8np26t3',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/86'/0'/0'/0/0",
      },
      expectedAddress: 'bc1psd4y7u8vmxj60s5xhm6lythnvrs0zlrc9ffzpv0jqcfnnf8te0cs9q5f4d',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/3'/0'/0/0",
        coin: 'doge',
      },
      expectedAddress: 'DDTHwiFPjKu6YkmiNu4QqUPsgmu2qcYqNH',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/145'/0'/0/0",
        coin: 'bch',
      },
      expectedAddress: 'bitcoincash:qrgec83eff6t6rclcg7scmhgjaer7p8fe50wlf6q59',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'Ld1mDZbEDPSkGwgmGSGJqNSBWzitYJbhUF',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'MCDdhA1sF19ndyYEthHmK2NDaoM3GZSTHg',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/84'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'ltc1qezxh89ghhu6qlse5mu0vrpue9d6xr3pkqzs2ke',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qy8y29tt9vr229fycfeqdthquuxk4da05xtakec2c49aq5y6p5s2zkcuzskt6wfyrp26r9m7h64hmdul5dtymgmz6has9eqnsn',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aajftxw8pcaxxwy0mv3uprfp93pstm6h5uzu44a4gd',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos148ea3zrv3r8ke9mt34xygl89k3gn03q69y66zf',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'akash',
      },
      expectedAddress: 'akash148ea3zrv3r8ke9mt34xygl89k3gn03q6glhamn',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'cro',
      },
      expectedAddress: 'cro148ea3zrv3r8ke9mt34xygl89k3gn03q6aljr7c',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: 'fetch148ea3zrv3r8ke9mt34xygl89k3gn03q6ken7q7',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: 'osmo148ea3zrv3r8ke9mt34xygl89k3gn03q6dlf25m',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'juno',
      },
      expectedAddress: 'juno148ea3zrv3r8ke9mt34xygl89k3gn03q6nkep94',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0xc8E5E76BE7B3a6ef776fbC0AB3df51FA0F8639e7',
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: 'f1qi7xcylshtjazoatg4izkcidyi4dx4apyl4aizq',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: '',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: '4866891b00cadfe81eb6ea932c9d43fc76a6e29d63f1060ddab755a021b13e17',
    },
    {
      method: 'nemGetAddress',
      expectedAddress: '',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: '',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '16fP6kx3FxmYAE562zZSEtxqcF3pRDorizjb6mDY5RBmnohB',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '2',
        network: 'kusama',
      },
      expectedAddress: 'JEhck2r2YWzULt1r4KUzhVguDLQXb4u6sqrL8W918NkMXHZ',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '5',
        network: 'astar',
      },
      expectedAddress: 'bbgPif4BR9AwX6QZexZ8QHxqfmHh8xTfhWFBBS3PhADCMZf',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'rf5VU3nANb4DVaPgEkw2uzd33TtxPDUwTL',
    },
    {
      method: 'solGetAddress',
      expectedAddress: '2LsEofA6PH9mTbkynyjpLooAPCC7Cd69kuZqPmbHAMmF',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '',
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: '',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0x3bb9c05ec50fef0dca816c5fef791bcfe96db95bee30a226ec6c41e08f491e5a',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: '',
    },
  ],
} as TestCase;
