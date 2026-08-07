import type { FeatureDescriptor } from '../src/features/types';

import { DeepLinkDemoScreen } from './src/DeepLinkDemoScreen';

export const deepLinkFeature: FeatureDescriptor = {
  id: 'Deep-Link',
  title: 'Deep Link Demo',
  description:
    'Interactive deep link demo covering OneKey deep links, universal link fallback, and WalletConnect payload parsing.',
  keywords: ['deeplink', 'walletconnect', 'linking'],
  Screen: DeepLinkDemoScreen,
  getSummary: () =>
    'Simulate OneKey deep/universal links, inspect WalletConnect URIs, and verify fallback logic.',
};

export * from './src/DeepLinkDemoScreen';
