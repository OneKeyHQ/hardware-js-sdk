import type { FeatureDescriptor } from '../src/features/types';

import { AirGapDemoScreen } from './src/AirGapDemoScreen';

export const airGapFeature: FeatureDescriptor = {
  id: 'Air-Gap',
  title: 'Air-Gap QR Demo',
  description:
    'Closed-loop example covering request construction, QR encoding, and scanning/decoding for offline signing.',
  keywords: ['airgap', 'qr', 'wallet'],
  Screen: AirGapDemoScreen,
  getSummary: () =>
    'Demonstrates QR chunk playback, UR decoding, and the onekey-app-call-device protocol building blocks.',
};

export * from './sdk';
