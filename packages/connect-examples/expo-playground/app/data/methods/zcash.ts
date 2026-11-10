import { ZcashAddressScope, ZcashAddressType } from '@onekeyfe/hd-transport';

import transparent from '../../../../expo-example/src/data/fixtures/zcash-transparent.json';
import orchard from '../../../../expo-example/src/data/fixtures/zcash-orchard.json';
import ironwood from '../../../../expo-example/src/data/fixtures/zcash-ironwood.json';

import type { MethodPreset, UnifiedMethodConfig } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'zcashGetAddress',
    description: 'methodDescriptions.zcashGetAddress',
    category: 'address',
    presets: [
      {
        title: 'Get address',
        parameters: [
          { name: 'path', type: 'string', required: true, value: "m/32'/133'/0'" },
          {
            name: 'addressType',
            type: 'select',
            value: ZcashAddressType.UNIFIED_ORCHARD_P2PKH,
            options: [
              { label: 'Unified (Orchard + P2PKH)', value: ZcashAddressType.UNIFIED_ORCHARD_P2PKH },
              { label: 'Transparent P2PKH', value: ZcashAddressType.TRANSPARENT_P2PKH },
              { label: 'Unified (Orchard)', value: ZcashAddressType.UNIFIED_ORCHARD },
            ],
          },
          {
            name: 'scope',
            type: 'select',
            value: ZcashAddressScope.EXTERNAL,
            options: [
              { label: 'External', value: ZcashAddressScope.EXTERNAL },
              { label: 'Internal', value: ZcashAddressScope.INTERNAL },
            ],
          },
          { name: 'diversifierIndex', type: 'number', value: 0, validation: { min: 0 } },
          { name: 'showOnOneKey', type: 'boolean', value: true },
          { name: 'includeSeedFingerprint', type: 'boolean', value: false },
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
              { path: "m/32'/133'/0'", showOnOneKey: false },
              { path: "m/32'/133'/1'", showOnOneKey: false },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'zcashGetFullViewingKey',
    description: 'methodDescriptions.zcashGetFullViewingKey',
    category: 'publicKey',
    presets: [
      {
        title: 'Get full viewing key',
        parameters: [{ name: 'path', type: 'string', required: true, value: "m/32'/133'/0'" }],
      },
      {
        title: 'Batch Get Full Viewing Key',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            value: [{ path: "m/32'/133'/0'" }, { path: "m/32'/133'/1'" }],
          },
        ],
      },
    ],
  },
  {
    method: 'zcashSignPczt',
    description: 'methodDescriptions.zcashSignPczt',
    category: 'transaction',
    presets: [
      { title: 'Static transparent P2PKH', value: transparent },
      { title: 'Static Orchard shielded', value: orchard },
      { title: 'Static Ironwood shielded', value: ironwood },
      { title: 'Invalid format (expected rejection)', value: { pczt: '00' } },
    ].map<MethodPreset>(preset => ({
      title: preset.title,
      description: 'Static offline sample. Signing requires matching wallet inputs.',
      parameters: [
        {
          name: 'pczt',
          type: 'textarea',
          required: true,
          label: 'PCZT (hex)',
          value: preset.value.pczt,
        },
      ],
    })),
  },
];

export const zcash = { id: 'zcash' as const, api };
