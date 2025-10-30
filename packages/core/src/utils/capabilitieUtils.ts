import { Enum_Capability } from '@onekeyfe/hd-transport';
import { Features } from '../types/device';

export const existCapability = (features?: Features, capability?: Enum_Capability) =>
  // @ts-expect-error
  features?.capabilities?.includes(capability);

export const requireCapability = (features: Features, capability: Enum_Capability) => {
  if (!existCapability(features, capability)) {
    throw new Error(`Capability ${capability} is required`);
  }
};
