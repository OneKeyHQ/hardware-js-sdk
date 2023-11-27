import type { TestCase } from './types';

export default {
  name: 'passphrase24-2',
  passphrase: '7789$$$add@@R@H',
  passphraseState: 'mrtG2eMw47hUawxDbL2Y1uYedXsGUnKuPb',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/394297355/passphrase-24',
  data: [
    {
      method: 'algoGetAddress',
      expectedAddress: 'SYL3HUBX7XTCEJVPQY4PFPH46YQJKTQZT74EFSSJ7OZMQ7H2NMG6ZO3A3Y',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0xa993303e9cd00348e84bc055ddeca98af1755b318356293ffa53abee724fdd75',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '39NidWdTWiGJnaMpw1TJzqNitgMnJtGSaq',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qyes4qc4ezs0wgv5jukl8nhercxjkr5upn4lpc7rshpy8umqlfhdp9j944ur5f8dpe9rk6w43azsezwf0qdy7xk2f2ksjqjtys',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aas6d9dbnf4186tggkkv1xrh0jhdm1tr9e5bjhds8g',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1j3y3l89s39q0tp2asv28vz78mu3ul007dnesug',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0x78AD0C8eA9B2675412d3cb6Df7118361F99AbEE7',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: 'kaspa:qp4wjaa7x3umuj6kzmq9y4y74qcc0yer7vmnt4k97hg8sfwjl8tzg4spl4nnc',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: 'ae114c21379f997c1e3ea18cfdaa4161f064a35e3ee26998f46b62679cf18848',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g567xpgu5jsy4xx9xs0n22rscv4qa6c2e9s356q798',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '152S5JD5Y19TJs3RNJSk9NjwJzEPb8kPp9ya2Eu2y9kfxFyY',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'rNLUUCJV2wSLfZ8oAuSzyGsTW9oWkVd4mL',
    },
    {
      method: 'solGetAddress',
      expectedAddress: '7kfn2Vg5B65eGUxM6SnZ9w6BVkpRnhtaywn8qYocn1Zb',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '0x727192262d38faba3541431206dc74f9',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0x9e801e1ae80b80523867bf565125231b609fe94d2bd57bc2a566a86a62832213',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TESZBiP55xKz6DcQYXwi8PVFjueAwNj5AF',
    },
  ],
} as TestCase;
