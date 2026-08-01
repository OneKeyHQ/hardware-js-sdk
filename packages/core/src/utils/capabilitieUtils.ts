import type { Enum_Capability } from '@onekeyfe/hd-transport';
import type { Features } from '../types/device';

export const existCapability = (features?: Features, capability?: Enum_Capability) =>
  capability !== undefined && features?.capabilities?.includes(capability);

export const requireCapability = (features: Features, capability: Enum_Capability) => {
  if (!existCapability(features, capability)) {
    throw new Error(`Capability ${capability} is required`);
  }
};
