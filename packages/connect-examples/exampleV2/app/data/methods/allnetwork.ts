import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'allNetworkGetAddress',

    presets: [
      {
        title: 'Batch Get Address',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,

            value: [
              {
                network: 'tbtc',
                path: "m/44'/1'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'ltc',
                path: "m/44'/2'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'bch',
                path: "m/44'/145'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'neurai',
                path: "m/44'/1900'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'doge',
                path: "m/44'/3'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'btc',
                chainName: 'bitcoin',
                path: "m/44'/0'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'btc',
                chainName: 'testnet',
                path: "m/44'/1'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'btc',
                chainName: 'litecoin',
                path: "m/44'/2'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'btc',
                chainName: 'bcash',
                path: "m/44'/145'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'btc',
                chainName: 'neurai',
                path: "m/44'/1900'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'btc',
                chainName: 'dogecoin',
                path: "m/44'/3'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'evm',
                path: "m/44'/60'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'evm',
                path: "m/44'/60'/0'/0/0",
                chainName: '20',
                showOnOneKey: false,
              },
              {
                network: 'algo',
                path: "m/44'/283'/0'/0'/0'",
                showOnOneKey: false,
              },
              {
                network: 'aptos',
                path: "m/44'/637'/0'/0'/0'",
                showOnOneKey: false,
              },
              {
                network: 'ada',
                path: "m/1852'/1815'/0'",
                showOnOneKey: false,
              },
              {
                network: 'cfx',
                path: "m/44'/503'/0'/0/0",
                chainName: '1029',
                showOnOneKey: false,
              },
              {
                network: 'cfx',
                path: "m/44'/503'/0'/0/0",
                chainName: '1',
                showOnOneKey: false,
              },
              {
                network: 'cosmos',
                path: "m/44'/118'/0'/0/0",
                prefix: 'cosmos',
                showOnOneKey: false,
              },
              {
                network: 'cosmos',
                path: "m/44'/118'/0'/0/0",
                prefix: 'osmosis',
                showOnOneKey: false,
              },
              {
                network: 'dynex',
                path: "m/44'/29538'/0'/0'/0'",
                showOnOneKey: false,
              },
              {
                network: 'fil',
                path: "m/44'/461'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'kaspa',
                path: "m/44'/111111'/0'/0/0",
                prefix: 'kaspa',
                showOnOneKey: false,
              },
              {
                network: 'near',
                path: "m/44'/397'/0'",
                showOnOneKey: false,
              },
              {
                network: 'nexa',
                path: "m/44'/29223'/0'/0/0",
                prefix: 'nexa',
                showOnOneKey: false,
              },
              {
                network: 'nervos',
                path: "m/44'/309'/0'/0/0",
                chainName: 'ckb',
                showOnOneKey: false,
              },
              {
                network: 'dot',
                path: "m/44'/354'/0'/0'/0'",
                prefix: '0',
                chainName: 'polkadot',
                showOnOneKey: false,
              },
              {
                network: 'xrp',
                path: "m/44'/144'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'sol',
                path: "m/44'/501'/0'/0'",
                showOnOneKey: false,
              },
              {
                network: 'stc',
                path: "m/44'/101010'/0'/0'/0'",
                showOnOneKey: false,
              },
              {
                network: 'sui',
                path: "m/44'/784'/0'/0'/0'",
                showOnOneKey: false,
              },
              {
                network: 'benfen',
                path: "m/44'/728'/0'/0'/0'",
                showOnOneKey: false,
              },
              {
                network: 'tron',
                path: "m/44'/195'/0'/0/0",
                showOnOneKey: false,
              },
              {
                network: 'ton',
                path: "m/44'/607'/0'",
                walletVersion: 3,
                isBounceable: false,
                isTestnetOnly: false,
                showOnOneKey: false,
              },
              {
                network: 'nostr',
                path: "m/44'/1237'/0'/0/0",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const allnetwork: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'allnetwork',
  api,
};
