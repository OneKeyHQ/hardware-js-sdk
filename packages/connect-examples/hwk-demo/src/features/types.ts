import type { JSX } from 'react';

export type FeatureId = 'HWK';

export interface FeatureDescriptor {
  id: FeatureId;
  title: string;
  description: string;
  keywords: string[];
  Screen: () => JSX.Element;
  getSummary?: () => string;
}
