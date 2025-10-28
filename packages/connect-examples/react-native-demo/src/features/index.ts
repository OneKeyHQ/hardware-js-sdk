import type { FeatureDescriptor } from './types';

import { airGapFeature } from '../../air-gap';
import { deepLinkFeature } from '../../deep-link';

export const features: FeatureDescriptor[] = [airGapFeature, deepLinkFeature];
