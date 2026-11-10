import type { MoneroGetAddressParams, MoneroGetWatchKeyParams } from '@onekeyfe/hd-core';
import type { PlaygroundProps } from '../components/Playground';

import singleInput from './fixtures/monero-1-inputs.json';
import twoInputs from './fixtures/monero-2-inputs.json';
import {
  moneroKeyImageParams,
  prepareMoneroKeyImageSample,
  prepareMoneroSample,
} from '../utils/manualSigning/monero';
import type { ManualSigningCall } from '../utils/manualSigning/common';

const unbalanced = { ...singleInput, tsxData: { ...singleInput.tsxData, fee: '1' } };

const api: PlaygroundProps[] = [
  {
    method: 'moneroGetAddress',
    description: 'Get a Monero account address.',
    presupposes: [
      ...['Mainnet', 'Testnet', 'Stagenet'].map((title, networkType) => ({
        title,
        value: {
          path: "m/44'/128'/0'",
          networkType,
          showOnOneKey: true,
        } satisfies MoneroGetAddressParams,
      })),
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            { path: "m/44'/128'/0'", networkType: 0, showOnOneKey: false },
            { path: "m/44'/128'/1'", networkType: 0, showOnOneKey: false },
          ] satisfies MoneroGetAddressParams[],
        },
      },
    ],
  },
  {
    method: 'moneroGetWatchKey',
    description: 'Export the account private view key with device confirmation.',
    presupposes: [
      {
        title: 'Get watch key',
        value: { path: "m/44'/128'/0'", networkType: 0 } satisfies MoneroGetWatchKeyParams,
      },
      {
        title: 'Batch Get Watch Key',
        value: {
          bundle: [
            { path: "m/44'/128'/0'", networkType: 0 },
            { path: "m/44'/128'/1'", networkType: 0 },
          ] satisfies MoneroGetWatchKeyParams[],
        },
      },
    ],
  },
  {
    method: 'moneroKeyImageSync',
    description: '静态样例与签名共用同一份输入；可生成当前钱包的测试输出并同步 Key Image。',
    presupposes: [
      ...[singleInput, twoInputs].map((template, index) => ({
        title: `${index + 1} 笔输出（静态样例）`,
        value: moneroKeyImageParams(template),
        prepareSample: (call: ManualSigningCall) => prepareMoneroKeyImageSample(call, template),
      })),
      {
        title: '空 transfers（应拒绝）',
        value: { path: "m/44'/128'/0'", networkType: 0, transfers: [] },
        prepareSample: null,
      },
    ],
  },
  {
    method: 'moneroSignTransaction',
    description: '先选静态样例；生成当前钱包版本时保留金额、手续费、输入输出和环结构。',
    presupposes: [
      ...[
        { title: '单输入 / 双输出（静态样例）', value: singleInput },
        { title: '双输入 / 双输出（静态样例）', value: twoInputs },
        { title: '金额不平衡（应拒绝）', value: unbalanced },
      ].map(preset => ({
        ...preset,
        prepareSample: (call: ManualSigningCall) => prepareMoneroSample(call, preset.value),
      })),
      {
        title: '空输入（应拒绝）',
        value: { path: "m/44'/128'/0'", networkType: 0, tsxData: {}, inputs: [] },
        prepareSample: null,
      },
    ],
  },
];

export default api;
