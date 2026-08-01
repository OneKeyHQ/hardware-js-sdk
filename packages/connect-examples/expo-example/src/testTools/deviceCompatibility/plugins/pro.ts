import { EDeviceType } from '@onekeyfe/hd-shared';

import type { DevicePlugin } from '../DeviceCompatibility';

export const proPlugin: DevicePlugin = {
  deviceType: EDeviceType.Pro,
  overrides: [
    {
      id: 'pro-dnx-get-address-expected-fail',
      methods: 'dnxGetAddress',
      expected: false,
    },
    {
      id: 'pro-dnx-sign-tx-expected-fail',
      methods: 'dnxSignTransaction',
      expected: false,
    },
  ],
};
