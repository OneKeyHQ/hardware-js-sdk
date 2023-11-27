import type { TestCase } from './types';

export default {
  name: 'normal-18',
  description: '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/218726488',
  data: [
    {
      method: 'algoGetAddress',
      expectedAddress: 'V57S5YT77SNH7SPWLWY27PPHGXEYWA7TMH2PHVMT2HF3P7HWAIJHNWJ7E4',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/0'/0'/0/0",
      },
      expectedAddress: '1HtFoKQaC6hacPBKVQDUo2uDVUuSXu8X5F',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '37dwAaNLRr96aJFb2mQv37YUtT9uWvXZi1',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/84'/0'/0'/0/0",
      },
      expectedAddress: 'bc1q8ytzt4elp44kynjh6pddlehzmeqgkx5xtph6qu',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/86'/0'/0'/0/0",
      },
      expectedAddress: 'bc1p0zzclc79segnke36tss0hxkka9sm0g9en84gztdjz870qv6xcvzqlugmwd',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/3'/0'/0/0",
        coin: 'doge',
      },
      expectedAddress: 'D59stDbvDkPRM3FCdQGGUgCsN5tx188EUN',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/145'/0'/0/0",
        coin: 'bch',
      },
      expectedAddress: 'bitcoincash:qp0udaacx9avsvttcp83v7u2x7fnmc57j5pl9v8mur',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'La7iCj4NN8jDUVL82b382d5djViFLDppwe',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'MFeuCy48YYZ1rKE4x3hxiS6orK7bBdWRQE',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/84'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'ltc1qy0k92a55g9zyycrcvdhs0su3gdklza3vk2cr8g',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1q94v75d9jm5tlqxmhaf9xjfrpejuhvqjsx7l58tq2gdta7mkwquh9d8rnhmpenppuyghfzy396gmr73ymygr46d3e0gs5wqhqm',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aap2ahh8346btnwk8mektt9hpe6f44rc3p8g0xwdhp',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1u78ua8tpf2xy3lsvt9l9ev779n9e4fpnc6cfz3',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'akash',
      },
      expectedAddress: 'akash1u78ua8tpf2xy3lsvt9l9ev779n9e4fpn4p4wmt',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'cro',
      },
      expectedAddress: 'cro1u78ua8tpf2xy3lsvt9l9ev779n9e4fpnqpss7q',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: 'fetch1u78ua8tpf2xy3lsvt9l9ev779n9e4fpnt83dqx',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: 'osmo1u78ua8tpf2xy3lsvt9l9ev779n9e4fpnspte5r',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'juno',
      },
      expectedAddress: 'juno1u78ua8tpf2xy3lsvt9l9ev779n9e4fpnwgmj9d',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0x5C8DD86c9d7DF51550F860Ec0567124e86DE91Fa',
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: 'f1bp6hi3vawa4qdkiccxysjwt6s5xsdllxhsv44oy',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: '',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: '06aa2d05de7bcd297ca12621923fb4c9dfa031adeb820d3b20e93e68fa3dc7c5',
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
      expectedAddress: '13K48SsFCLkh3FWxgJRpXDAJ2wio6wm6DPK3cEpb1TMik9yh',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '2',
        network: 'kusama',
      },
      expectedAddress: 'EtNeRx3xvW9MNKtVNBsH1h9Kv1PDK28bGRJqc7BwAYhJtD9',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '5',
        network: 'astar',
      },
      expectedAddress: 'YFMRQaG7o8KpYYHCxpwQiVRGNSGNruhA65hgf36KjLA9bGa',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'rfERf1MKC6JkBEHWuBm2iBQo5xY1aBSJNF',
    },
    {
      method: 'solGetAddress',
      expectedAddress: '7saU8kc3DCXA7WWDbXwGe8X8febDxCGqAWeS3p7GqiMR',
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
      expectedAddress: '0x81f7d475a77b0af6c4941714ddf304f4441b70935ef0939116f8eaa009e1d04c',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: '',
    },
  ],
} as TestCase;
