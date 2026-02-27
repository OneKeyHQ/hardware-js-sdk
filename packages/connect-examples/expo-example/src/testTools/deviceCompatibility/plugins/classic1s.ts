import { EDeviceType } from '@onekeyfe/hd-shared';

import type { DevicePlugin } from '../DeviceCompatibility';

export const classic1sPlugin: DevicePlugin = {
  deviceType: EDeviceType.Classic1s,
  overrides: [
    {
      id: 'classic1s-dnx-performance-limit',
      methods: ['dnxGetAddress'],
      expected: false,
    },
    {
      id: 'classic1s-stellar-coin60-with-safety-off',
      methods: 'stellarSignTransaction',
      when: ({ key, testContext }) => key === '60' && testContext?.securityChecksDisabled === true,
      expected: true,
    },
    {
      id: 'classic1s-nem-coin60-with-safety-off',
      methods: 'nemSignTransaction',
      when: ({ key, testContext }) => key === '60' && testContext?.securityChecksDisabled === true,
      expected: true,
    },
    {
      id: 'classic1s-sol-coin501-expected-fail',
      methods: 'solSignTransaction',
      when: ({ key }) => key === '501',
      expected: false,
    },
    {
      id: 'classic1s-tron-sign-message-expected-fail',
      methods: 'tronSignMessage',
      expected: false,
    },
    {
      id: 'classic1s-dnx-sign-tx-expected-fail',
      methods: 'dnxSignTransaction',
      expected: false,
    },
  ],
};
