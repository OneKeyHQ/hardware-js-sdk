import { EDeviceType } from '@onekeyfe/hd-shared';

import type { DevicePlugin } from '../DeviceCompatibility';

export const miniPlugin: DevicePlugin = {
  deviceType: EDeviceType.Mini,
  overrides: [
    {
      id: 'mini-failure-expected-methods',
      methods: [
        'alephiumSignTransaction',
        'alephiumSignMessage',
        'dnxSignTransaction',
        'neoSignTransaction',
        'scdoSignTransaction',
        'scdoSignMessage',
        'tonSignMessage',
        'tonSignProof',
        'tronSignMessage',
      ],
      expected: false,
    },
    {
      id: 'mini-nem-coin60-expected-success',
      methods: 'nemSignTransaction',
      when: ({ key }) => key === '60',
      expected: true,
    },
    {
      id: 'mini-stellar-coin60-expected-success',
      methods: 'stellarSignTransaction',
      when: ({ key }) => key === '60',
      expected: true,
    },
  ],
};
