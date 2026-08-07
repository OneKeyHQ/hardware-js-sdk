import type { FeatureDescriptor } from '../src/features/types';

import { BleDemoScreen } from './src/BleDemoScreen';

export const bleFeature: FeatureDescriptor = {
  id: 'BLE',
  title: 'BLE Connect Demo',
  description:
    'Scan devices, fetch device features, get address and sign messages via @onekeyfe/hd-ble-sdk with live logs.',
  keywords: ['bluetooth', 'ble', 'hardware', 'onekey'],
  Screen: BleDemoScreen,
  getSummary: () => 'BLE scan, select device, get features, address and sign.',
};

export * from './src/BleDemoScreen';
