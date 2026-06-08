import { buildProfileFromProtocolV1 } from '../../deviceProfile';

import type {
  DeviceInfoProtocol,
  DeviceInfoSource,
  GetDeviceInfoParams,
  DeviceProfile,
} from '../../types/api/getDeviceInfo';
import type { Features, OnekeyFeatures } from '../../types';
import type { ProtocolV2DeviceInfo } from '../../protocols/protocol-v2/features';

type BuildDeviceInfoParams = {
  protocol: DeviceInfoProtocol;
  features?: Features;
  onekeyFeatures?: OnekeyFeatures;
  protocolV2DeviceInfo?: ProtocolV2DeviceInfo;
  sources: DeviceInfoSource[];
  scope?: GetDeviceInfoParams['scope'];
  includeRaw?: boolean;
};

export function buildDeviceProfile({
  protocol,
  features,
  onekeyFeatures,
  sources,
  scope,
  includeRaw,
}: BuildDeviceInfoParams): DeviceProfile {
  return buildProfileFromProtocolV1({
    protocol,
    features,
    onekeyFeatures,
    sources,
    scope,
    includeRaw,
  });
}
