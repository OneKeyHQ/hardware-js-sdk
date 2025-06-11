import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "cardano",
  name: "Cardano",
  description: "Cardano blockchain operations",
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.153 7.845a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zm-1.335 8.31a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zM12 18.667a1.067 1.067 0 1 1 0-2.134 1.067 1.067 0 0 1 0 2.134zm0-2.4A5.333 5.333 0 1 1 17.333 10.933 5.339 5.339 0 0 1 12 16.267zm0-8.534a3.2 3.2 0 1 0 3.2 3.2A3.204 3.204 0 0 0 12 7.733zm0-2.4a1.067 1.067 0 1 1 0-2.133 1.067 1.067 0 0 1 0 2.133zM5.847 7.845a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zm1.335 8.31a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6z" fill="#0033AD"/></svg>`,
  color: "#0033AD",
  category: "cardano" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'cardanoGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          addressParameters: {
            addressType: 0,
            path: "m/1852'/1815'/0'/0/0",
            stakingPath: "m/1852'/1815'/0'/2/0",
            stakingKeyHash: undefined,
            paymentScriptHash: undefined,
            stakingScriptHash: undefined,
          },
          protocolMagic: 764824073,
          networkId: 1,
          derivationType: 1,
          address: '',
          showOnOneKey: false,
          isCheck: false,
        },
      },
      {
        title: 'Classic Batch Get Address',
        value: {
          bundle: [
            {
              addressParameters: {
                addressType: 0,
                path: "m/1852'/1815'/0'/0/0",
                stakingPath: "m/1852'/1815'/0'/2/0",
              },
              protocolMagic: 764824073,
              networkId: 1,
              derivationType: 1,
              address: '',
              showOnOneKey: false,
              isCheck: false,
            },
            {
              addressParameters: {
                addressType: 0,
                path: "m/1852'/1815'/0'/1/0",
                stakingPath: "m/1852'/1815'/0'/2/0",
              },
              protocolMagic: 764824073,
              networkId: 1,
              derivationType: 1,
              address: '',
              showOnOneKey: false,
              isCheck: false,
            },
            {
              addressParameters: {
                addressType: 0,
                path: "m/1852'/1815'/0'/2/0",
                stakingPath: "m/1852'/1815'/0'/2/0",
              },
              protocolMagic: 764824073,
              networkId: 1,
              derivationType: 1,
              address: '',
              showOnOneKey: false,
              isCheck: false,
            },
          ],
        },
      },
      {
        title: 'Touch Batch Get Address',
        value: {
          bundle: [
            {
              addressParameters: {
                addressType: 0,
                path: "m/1852'/1815'/0'/0/0",
                stakingPath: "m/1852'/1815'/0'/2/0",
              },
              protocolMagic: 764824073,
              networkId: 1,
              derivationType: 1,
              address: '',
              showOnOneKey: false,
              isCheck: false,
            },
            {
              addressParameters: {
                addressType: 0,
                path: "m/1852'/1815'/0'/1/0",
                stakingPath: "m/1852'/1815'/0'/2/0",
              },
              protocolMagic: 764824073,
              networkId: 1,
              derivationType: 2,
              address: '',
              showOnOneKey: false,
              isCheck: false,
            },
            {
              addressParameters: {
                addressType: 0,
                path: "m/1852'/1815'/0'/2/0",
                stakingPath: "m/1852'/1815'/0'/2/0",
              },
              protocolMagic: 764824073,
              networkId: 1,
              derivationType: 1,
              address: '',
              showOnOneKey: false,
              isCheck: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'cardanoGetPublicKey',
    description: 'Get PublicKey',
    presupposes: [
      {
        title: 'Get PublicKey',
        value: {
          path: "m/1852'/1815'/0'",
          showOnOneKey: false,
          derivationType: 1,
        },
      },
      {
        title: 'Classic Batch Get PublicKey',
        value: {
          bundle: [
            {
              path: "m/1852'/1815'/0'",
              showOnOneKey: false,
              derivationType: 1,
            },
            {
              path: "m/1852'/1815'/0'",
              showOnOneKey: false,
              derivationType: 1,
            },
            {
              path: "m/1852'/1815'/0'",
              showOnOneKey: false,
              derivationType: 1,
            },
          ],
        },
      },
      {
        title: 'Touch Batch Get PublicKey',
        value: {
          bundle: [
            {
              path: "m/1852'/1815'/0'",
              showOnOneKey: false,
              derivationType: 2,
            },
            {
              path: "m/1852'/1815'/0'",
              showOnOneKey: false,
              derivationType: 1,
            },
            {
              path: "m/1852'/1815'/0'",
              showOnOneKey: false,
              derivationType: 2,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'cardanoSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          signingMode: 0,
          inputs: [
            {
              path: "m/1852'/1815'/0'/0/0",
              prev_hash: '311940642e2f1ee1029a59c05f83c78fc27cc8a52bfd1e65721800dd8b026dec',
              prev_index: 0,
            },
            {
              path: "m/1852'/1815'/0'/0/0",
              prev_hash: '416538899e722e49c5a3670461d2bc6ce8aea8b307fae8bcec39d0019ee3c3d0',
              prev_index: 0,
            },
            {
              path: "m/1852'/1815'/0'/0/0",
              prev_hash: '416538899e722e49c5a3670461d2bc6ce8aea8b307fae8bcec39d0019ee3c3d0',
              prev_index: 1,
            },
          ],
          outputs: [
            {
              address:
                'addr1qxfzjswzujgvn70cwpkxdal5dddtasjrljmx8upgzlaehqa2vx9039emchclmwwfmwtar32lp4x558nr8wa3f26rkn7qwne3ad',
              amount: '2613231',
              tokenBundle: [
                {
                  policyId: '29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6',
                  tokenAmounts: [{ assetNameBytes: '4d494e', amount: '27828472' }],
                },
              ],
            },
            {
              addressParameters: {
                path: "m/1852'/1815'/0'/0/0",
                addressType: 0,
                stakingPath: "m/1852'/1815'/0'/2/0",
              },
              amount: '1222487',
            },
          ],
          fee: '177513',
          protocolMagic: 764824073,
          networkId: 1,
          derivationType: 1,
        },
      },
    ],
  },
  {
    method: 'cardanoSignMessage',
    description: 'Sign Message',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/1852'/1815'/0'/0/0",
          message: 'Hello World',
          derivationType: 1,
          networkId: 1,
        },
      },
    ],
  },
];


// 导出链配置对象
export const chainConfig = {
  ...chainMeta,
  api,
};

export default api;
