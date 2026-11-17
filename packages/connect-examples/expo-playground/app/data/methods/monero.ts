import singleInput from '../../../../expo-example/src/data/fixtures/monero-1-inputs.json';
import twoInputs from '../../../../expo-example/src/data/fixtures/monero-2-inputs.json';

import type { MethodPreset, ParameterField, UnifiedMethodConfig } from '../types';

const accountParameters = (): ParameterField[] => [
  { name: 'path', type: 'string', required: true, value: "m/44'/128'/0'" },
  {
    name: 'networkType',
    type: 'select',
    value: 0,
    options: [
      { label: 'Mainnet', value: 0 },
      { label: 'Testnet', value: 1 },
      { label: 'Stagenet', value: 2 },
    ],
  },
];

const api: UnifiedMethodConfig[] = [
  {
    method: 'moneroGetAddress',
    description: 'methodDescriptions.moneroGetAddress',
    category: 'address',
    presets: [
      {
        title: 'Get address',
        parameters: [
          ...accountParameters(),
          { name: 'showOnOneKey', type: 'boolean', value: true },
        ],
      },
      {
        title: 'Batch Get Address',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            value: [
              { path: "m/44'/128'/0'", networkType: 0, showOnOneKey: false },
              { path: "m/44'/128'/1'", networkType: 0, showOnOneKey: false },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'moneroGetWatchKey',
    description: 'methodDescriptions.moneroGetWatchKey',
    category: 'security',
    presets: [
      { title: 'Get watch key', parameters: accountParameters() },
      {
        title: 'Batch Get Watch Key',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            value: [
              { path: "m/44'/128'/0'", networkType: 0 },
              { path: "m/44'/128'/1'", networkType: 0 },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'moneroKeyImageSync',
    description: 'methodDescriptions.moneroKeyImageSync',
    category: 'advanced',
    presets: [singleInput, twoInputs].map<MethodPreset>(template => ({
      title: `${template.inputs.length} owned outputs (static sample)`,
      description: 'Static offline sample. Key Image export requires matching wallet outputs.',
      parameters: [
        ...accountParameters(),
        {
          name: 'transfers',
          type: 'textarea',
          required: true,
          value: template.inputs.map(input => ({
            outKey: input.outputs[input.real_output].key.dest,
            txPubKey: input.real_out_tx_key,
            additionalTxPubKeys: input.real_out_additional_tx_keys,
            internalOutputIndex: input.real_output_in_tx_index,
            subAddrMajor: template.tsxData.account,
            subAddrMinor: input.subaddr_minor,
          })),
        },
      ],
    })),
  },
  {
    method: 'moneroSignTransaction',
    description: 'methodDescriptions.moneroSignTransaction',
    category: 'transaction',
    presets: [
      { title: '1 input / 2 outputs (static sample)', value: singleInput },
      { title: '2 inputs / 2 outputs (static sample)', value: twoInputs },
      {
        title: 'Unbalanced fee (expected rejection)',
        value: { ...singleInput, tsxData: { ...singleInput.tsxData, fee: '1' } },
      },
    ].map<MethodPreset>(preset => ({
      title: preset.title,
      description: 'Static offline sample. Signing requires matching wallet inputs.',
      parameters: [
        ...accountParameters(),
        { name: 'tsxData', type: 'textarea', required: true, value: preset.value.tsxData },
        { name: 'inputs', type: 'textarea', required: true, value: preset.value.inputs },
      ],
    })),
  },
];

export const monero = { id: 'monero' as const, api };
