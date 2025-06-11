import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "polkadot",
  name: "Polkadot",
  description: "Polkadot ecosystem operations",
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.4 7.7a2.4 2.4 0 1 1-2.4-2.4 2.4 2.4 0 0 1 2.4 2.4zm-2.4 8.6a2.4 2.4 0 1 1 2.4-2.4 2.4 2.4 0 0 1-2.4 2.4zM12 18.4a2.4 2.4 0 1 1 2.4-2.4A2.4 2.4 0 0 1 12 18.4zm0-12.8a2.4 2.4 0 1 1 2.4-2.4A2.4 2.4 0 0 1 12 5.6zM5.6 16.3a2.4 2.4 0 1 1 2.4-2.4 2.4 2.4 0 0 1-2.4 2.4zm2.4-8.6a2.4 2.4 0 1 1-2.4-2.4 2.4 2.4 0 0 1 2.4 2.4z" fill="#E6007A"/></svg>`,
  color: "#E6007A",
  category: "polkadot" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'polkadotGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          prefix: '0',
          network: 'polkadot',
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/354'/0'/0'/0'",
              prefix: '0',
              network: 'polkadot',
              showOnOneKey: false,
            },
            {
              path: "m/44'/354'/1'/0'/0'",
              prefix: '0',
              network: 'polkadot',
              showOnOneKey: false,
            },
            {
              path: "m/44'/354'/2'/0'/0'",
              prefix: '0',
              network: 'polkadot',
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'polkadotSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'polkadot',
          rawTx:
            '050700388671dd546ba19495211c8cdc200600f9798cf078fca0fb4749ebbc0579c12a0700e40b54020500d000d72400001800000091b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3f8928b6c604b52a16c5b08be0a0390a454c1c2523f3c6d98a510b064a523a580',
        },
      },
      {
        title: 'Sign Transaction kusama(old)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'kusama',
          rawTx:
            '1f0400c5b74b18e5e691d0a0e1b816044ad44e6fefff7acedc4ac8d0a7276581d37a30006503ac0052000000020000009eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6cbefb7af897bf76fb9c51819167248171ef46a7ab0b7f0589d24388a2c48dccc',
        },
      },
      {
        title: 'Sign Transaction polkadot (1001003)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'polkadot',
          rawTx:
            '050000950ca256090ba9a4cd520e1d891081207e112b1353bbe8da0cd8a910d684481a025a6202c500040000154a0f001a00000091b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3e7f75975e0a90fd10ab432c76d9a0eb2b140732e4d7748c813d3d787909edfb300',
        },
      },
      {
        title: 'Sign Transaction kusama (1001003)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'kusama',
          rawTx:
            '040000950ca256090ba9a4cd520e1d891081207e112b1353bbe8da0cd8a910d684481a0284d71785010c0000164a0f001a000000b0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe516ea5c74484d00abde1e84116ed965c55ed2c6c2b0bdffcfb7499460f05b6f100',
        },
      },
      {
        title: 'Sign Transaction astar (90)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'astar',
          rawTx:
            '1f000065c53e9969a72f28679005ad3d9768249123e1102ab24b45e2151141c528b00213000064a7b3b6e00df502c4005a000000020000009eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6db8e9a31b23713c268cf7a9105c7f8e7cdff97efaf67d4e3403049061ccbcc81',
        },
      },
      {
        title: 'Sign Transaction manta (4720)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'manta',
          rawTx:
            '0a000065c53e9969a72f28679005ad3d9768249123e1102ab24b45e2151141c528b0021300008a5d7845630195021800006612000009000000f3c7ad88f6a80f366c4be216691411ef0622e8b809b1046ea297ef106058d4eb8842e75ba1c20d5f6c4c9093a2860529976d307c6a4681d3894ba18e5103f8cd00',
        },
      },
      {
        title: 'Sign Transaction joystream (2004)',
        value: {
          path: "m/44'/354'/0'/0'/0'",
          network: 'joystream',
          rawTx:
            '0500a0d4aa5815a939c8ec5d76d4ca4490ecbc0f90e9d1ec59f15593537529ccfac10284d71765023800d4070000020000006b5e488e0fa8f9821110d5c13f4c468abcd43ce5e297e62b34c53c334646595648e31d840ba735967ed9cef11a1c9ff4298ad0b1af118dd56603b2be49608c9b',
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
