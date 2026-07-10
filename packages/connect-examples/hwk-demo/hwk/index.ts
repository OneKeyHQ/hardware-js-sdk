import { HwkScreen } from './src/HwkScreen';

import type { FeatureDescriptor } from '../src/features/types';

export const hwkFeature: FeatureDescriptor = {
  id: 'HWK',
  title: 'HWK Demo',
  description:
    'Multi-vendor hardware-wallet screen: scan, connect, run chain methods through the shared HWK adapter stack.',
  keywords: ['hwk', 'trezor', 'ledger', 'ble', 'webusb', 'webhid'],
  Screen: HwkScreen,
  getSummary: () => 'HWK scan, connect and call chain methods across Trezor and Ledger.',
};

export * from './src/HwkScreen';
