import { EDeviceType } from '@onekeyfe/hd-shared';

import type { DevicePlugin } from '../DeviceCompatibility';

const classicUnsupportedMethods = [
  // 新链能力（固件未支持）
  'benfenGetAddress',
  'alephiumGetAddress',
  'alephiumSignTransaction',
  'alephiumSignMessage',
  'scdoGetAddress',
  'scdoSignTransaction',
  'scdoSignMessage',
  'tonGetAddress',
  'tonSignMessage',
  'tonSignProof',
  'neoGetAddress',
  'neoSignTransaction',
  // 新特性（当前固件版本未支持）
  'btcSignPsbt',
  'aptosSignInMessage',
  // 设备特定能力
  'deviceRebootToBoardloader',
];

export const classicPlugin: DevicePlugin = {
  deviceType: EDeviceType.Classic,
  overrides: [
    {
      id: 'classic-unsupported-methods',
      methods: classicUnsupportedMethods,
      expected: false,
    },
    {
      id: 'classic-eip7702',
      methods: 'evmSignTransaction',
      when: ({ params }) => Boolean(params?.transaction?.authorizationList),
      expected: false,
    },
    {
      id: 'classic-stellar-coin60-expected-success',
      methods: 'stellarSignTransaction',
      when: ({ key }) => key === '60',
      expected: true,
    },
    {
      id: 'classic-nem-coin60-expected-success',
      methods: 'nemSignTransaction',
      when: ({ key }) => key === '60',
      expected: true,
    },
    {
      id: 'classic-sol-coin501-expected-fail',
      methods: 'solSignTransaction',
      when: ({ key }) => key === '501',
      expected: false,
    },
  ],
};
