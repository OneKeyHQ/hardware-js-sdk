import type { TestCase } from './types';

export default {
  name: 'passphrase18-2',
  passphrase: '7789$$$add@@R@H',
  passphraseState: 'mp5EXTXF5h4QB2APmiRSEBi1xAX3H5ga3B',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/394297345/passphrase-18',
  data: [
    {
      method: 'algoGetAddress',
      expectedAddress: 'TQ636VDRJBVGZ2II62TKZ3SBWX2UNRXUWQSPUTQHS6NSOTMTMDLQQV5QCQ',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0x0c620f4ed3ac048c24f2c6295d3923645ec169659e7cdccc2b1b63fc8be22ea1',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '3EsxQmYmQ33cE22KvJUyr8xv58D99rPfYz',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qy0g467up0f909g2pq0uftmfclc59u7u6lmajr0sxytynxkjsd4wtyvthcl7z4ftj6c90evyrqsk2rvvnqd0etzda3jqz6rd54',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aam6hz637w2xws8f9vfgjv3ycd2w8gt8pe3p01abcm',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1crcprdmm5jy0uka5wrufd4pgtqgegqwggftyd6',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0x6d64B86b387fBfE817C120F77D613ed0c2e7444D',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: 'kaspa:qpzg4ch0ytz053n89e3pyun52qgje2mwpy3exevg48ryts2d6wscu3x9a227j',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: '15d40738920caf7666f624983d35b760be1196f8689d037e706d8512b00cef13',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g547w6dfzh9rqpgcfthmurxd9kn4543x6aw84j4sga',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '12E5Nw4J8oitXCHkBoT5qu8doCK7b9tdTgBtFiQkPcNZXjEy',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'rLWgabVpnrdXVb8sVc5E7Td85rSQs3vcNv',
    },
    {
      method: 'solGetAddress',
      expectedAddress: '8rf3KDom9vnYiXZz7maZKkXUB5j5nj3tC7araPpTtamK',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '0x59ab9db9ac50ac983b88fef8166df41d',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0x67ab654ad5c71d55152771c3f8ff3d3a9bf6500dbc11889ad35ed247fbc8c03b',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TPFaTZwCwSxtXf8CCezdo3Wt9LKt1zbzSx',
    },
  ],
} as TestCase;
