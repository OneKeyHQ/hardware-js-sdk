import type { FeatureDescriptor } from './types';

import { airGapFeature } from '../../air-gap';
import { deepLinkFeature } from '../../deep-link';
import { bleFeature } from '../../ble';

export const features: FeatureDescriptor[] = [bleFeature, deepLinkFeature, airGapFeature];
