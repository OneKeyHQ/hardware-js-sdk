import type { TestCase } from './types';

export default {
  name: 'passphrase12-empty',
  passphrase: '',
  passphraseState: 'mpERhxif9Eaovvh3PfStVMDKrwCc8ELwS9',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649/passphrase-12',
  data: [
    {
      method: 'algoGetAddress',
      expectedAddress: 'H2YV7OSMNOGAE4ZZDE27SIPAV27AH6TMCTMEPKEOP23ACJHCXHFFFSQDKQ',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0xd5fe41294bfcc0a75d4ccfff0e9f0edfeb55655f55ab63709b2d574d685df896',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/0'/0'/0/0",
      },
      expectedAddress: '1BwB5Ccg2bpiaeDZVGe4C9ZfEaKsAdo5QP',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '3ABPiv2fTPqfxZ8FFGc9RwKVAqRHrLdGtq',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qxcmtg5ynpglewg99tazga5ldg8meev65udzq8ytkknsp2ehs88lvux5enct3grg69z74jw626apjnscc8gqpxr7f2xqh4q87w',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aat74vz8k8f6m9mues4cfgd3785hmswjvu6jgbnh47',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1k786mn207hngdhena6zzcz9uvastmzu6dv4xfa',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0x6b0d57bF95EaBC628c4F75787F6C34E1557636A0',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: 'kaspa:qza30x4puc9cdcrraeysextzjqdsfymvnw7cqq6gr6qps67yasg5ypgu85evv',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: '6ec13fd902ec7a5889306f11f9271016944f6fade5ee5c4f82a7b183e1d2afb3',
    },
    {
      method: 'nemGetAddress',
      expectedAddress: '',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g5efrq0d0gp9s3zatjcrpcesvawxm588arnywwkley',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '15UazL3RuRbu9CQX55hZ74K2kQtKZwBoi1YPQTWPv5n7QxLE',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'rGnrDDju6H3JGP8PAcnMs1JKioEba8iWs1',
    },
    {
      method: 'solGetAddress',
      expectedAddress: 'B5tqDNGk8kfdVwv3BMui6bSKnGwAe4hUchc86fjkfNTX',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '0x98c4cb28bb180d213799f01dc6568113',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0x16edeeb71fc7dfb39a83c36df4db6972112ebdd9d09a6e082938d01d9bb65e90',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TVaY1kz1gqbyGETTaLTnrdhusVuiFCUNfR',
    },
  ],
} as TestCase;
