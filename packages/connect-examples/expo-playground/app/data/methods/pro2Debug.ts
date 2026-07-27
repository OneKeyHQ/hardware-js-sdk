import type { UnifiedMethodConfig } from '../types';
import { deviceDebugApi } from './device';
import { firmwareDebugApi } from './firmware';

const stateDebugApi: UnifiedMethodConfig[] = [
  {
    method: 'deviceInfoGet',
    description: 'Read the raw Protocol V2 DeviceInfo response for debugging.',
    noDeviceIdReq: true,
    debugOnly: true,
    presets: [
      {
        title: 'Basic raw device info',
        description: 'Read hardware, firmware and coprocessor versions without runtime status.',
        parameters: [
          { name: 'targets.hw', type: 'boolean', label: 'Target: hw', value: true },
          { name: 'targets.fw', type: 'boolean', label: 'Target: fw', value: true },
          {
            name: 'targets.coprocessor',
            type: 'boolean',
            label: 'Target: coprocessor',
            value: true,
          },
          { name: 'types.version', type: 'boolean', label: 'Type: version', value: true },
          { name: 'types.specific', type: 'boolean', label: 'Type: specific', value: true },
        ],
      },
      {
        title: 'Full firmware verification info',
        description: 'Read every firmware target with version, build ID, hash and specific data.',
        parameters: [
          { name: 'targets.hw', type: 'boolean', label: 'Target: hw', value: true },
          { name: 'targets.fw', type: 'boolean', label: 'Target: fw', value: true },
          {
            name: 'targets.coprocessor',
            type: 'boolean',
            label: 'Target: coprocessor',
            value: true,
          },
          { name: 'targets.se1', type: 'boolean', label: 'Target: se1', value: true },
          { name: 'targets.se2', type: 'boolean', label: 'Target: se2', value: true },
          { name: 'targets.se3', type: 'boolean', label: 'Target: se3', value: true },
          { name: 'targets.se4', type: 'boolean', label: 'Target: se4', value: true },
          { name: 'types.version', type: 'boolean', label: 'Type: version', value: true },
          { name: 'types.build_id', type: 'boolean', label: 'Type: build ID', value: true },
          { name: 'types.hash', type: 'boolean', label: 'Type: hash', value: true },
          { name: 'types.specific', type: 'boolean', label: 'Type: specific', value: true },
        ],
      },
    ],
  },
  {
    method: 'deviceStatusGet',
    description: 'Read the raw Protocol V2 DeviceStatus response and update the SDK state cache.',
    noDeviceIdReq: true,
    debugOnly: true,
    presets: [{ title: 'Read runtime status', parameters: [] }],
  },
];

export const pro2Debug = {
  api: [...stateDebugApi, ...deviceDebugApi, ...firmwareDebugApi],
  id: 'device' as const,
};
