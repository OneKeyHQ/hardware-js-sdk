import type { JSX } from 'react';

export type FeatureId = 'Air-Gap' | 'Deep-Link';

export interface FeatureDescriptor {
  id: FeatureId;
  title: string;
  description: string;
  keywords: string[];
  Screen: () => JSX.Element;
  getSummary?: () => string;
}
