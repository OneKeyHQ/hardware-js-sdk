import { EDeviceType } from '@onekeyfe/hd-shared';

import type { DevicePlugin } from '../DeviceCompatibility';

export const classicPurePlugin: DevicePlugin = {
  deviceType: EDeviceType.ClassicPure,
  overrides: [
    {
      id: 'classicpure-dnx-performance-limit',
      methods: ['dnxGetAddress', 'dnxSignTransaction'],
      skip: 'Classic Pure 因性能限制暂不支持 DNX',
    },
    {
      id: 'classicpure-stellar-coin60-with-safety-off',
      methods: 'stellarSignTransaction',
      when: ({ key, testContext }) => key === '60' && testContext?.securityChecksDisabled === true,
      expected: true,
    },
    {
      id: 'classicpure-nem-coin60-with-safety-off',
      methods: 'nemSignTransaction',
      when: ({ key, testContext }) => key === '60' && testContext?.securityChecksDisabled === true,
      expected: true,
    },
    {
      id: 'classicpure-sol-coin501-expected-fail',
      methods: 'solSignTransaction',
      when: ({ key }) => key === '501',
      expected: false,
    },
  ],
};
