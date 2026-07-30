import type { Features, KnownDevice } from '../src/types';

export const requireKnownDeviceFeatures = ({ features }: KnownDevice): Features => features;
