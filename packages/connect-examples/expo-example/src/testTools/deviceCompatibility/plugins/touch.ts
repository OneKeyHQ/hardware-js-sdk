import { EDeviceType } from '@onekeyfe/hd-shared';

import type { DevicePlugin } from '../DeviceCompatibility';

export const touchPlugin: DevicePlugin = {
  deviceType: EDeviceType.Touch,
  overrides: [
    {
      id: 'touch-alephium-sign-expected-fail',
      methods: ['alephiumSignTransaction', 'alephiumSignMessage'],
      expected: false,
    },
    {
      id: 'touch-dnx-sign-tx-expected-fail',
      methods: 'dnxSignTransaction',
      expected: false,
    },
    {
      id: 'touch-neo-sign-tx-expected-fail',
      methods: 'neoSignTransaction',
      expected: false,
    },
    {
      id: 'touch-scdo-sign-expected-fail',
      methods: ['scdoSignTransaction', 'scdoSignMessage'],
      expected: false,
    },
  ],
};
