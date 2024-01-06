import type { TestCase } from './types';

export default {
  name: 'unsafe-normal-12',
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
      method: 'cosmosGetAddress',
      params: {
        hrp: 'terra',
      },
      expectedAddress: 'terra148ea3zrv3r8ke9mt34xygl89k3gn03q6rqq6qf',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'secret',
      },
      expectedAddress: 'secret148ea3zrv3r8ke9mt34xygl89k3gn03q68pwnl4',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: 'celestia148ea3zrv3r8ke9mt34xygl89k3gn03q65wt2cy',
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
      expectedAddress: 'kaspa:qqtwk4qk3ew62e4w3y6rfwxpqnt9yuv4nvdu7hy6m9rc0ndzxn2sqlezm4sw6',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: '4866891b00cadfe81eb6ea932c9d43fc76a6e29d63f1060ddab755a021b13e17',
    },
    {
      method: 'nemGetAddress',
      expectedAddress: 'NABU5EU5K3S7J5QBJG2IFH2VOGSQBHXU3T36PRFW',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g5z0dn9r9qat4mxc9c26nnppu0t5vujjlsckjkjdg0',
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
      method: 'polkadotGetAddress',
      params: {
        prefix: '126',
        network: 'joystream',
      },
      expectedAddress: 'j4WyzXTvwGu16ZJWKMKx7wtqgH18kDoptNSdYK2GVxQJtFg8m',
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
      expectedAddress: '0x9d0ee1e9add292461af2c2b1e541b92f',
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: 'GCDDBLVBK5TWR45HTCMIY2A5H6JEYMLSGSFJNLGBWIT7BZMZY6TLQAXT',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0x3bb9c05ec50fef0dca816c5fef791bcfe96db95bee30a226ec6c41e08f491e5a',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'THxKXKDfFuYJVxpdfESpxLuVpnREb73uHG',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0xa48856b8ac94ab08e639816778c2bd47e831347a00841ad2c48dc077a75bee5b',
    },
  ],
} as TestCase;
