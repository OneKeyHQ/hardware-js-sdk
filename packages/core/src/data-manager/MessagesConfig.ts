import type { IDeviceModel, IDeviceType } from '../types';
import type { MessageVersion } from './DataManager';

type DeviceVersionConfig = {
  [deviceType in IDeviceType | IDeviceModel]?: {
    minVersion: string;
    messageVersion: MessageVersion;
  }[];
};

export const PROTOBUF_MESSAGE_CONFIG: DeviceVersionConfig = {
  model_mini: [
    // Classic1s starts from 3.5.0, so use latest by default
    // Only use v1 for specific old versions (< 3.3.0)
    { minVersion: '3.3.0', messageVersion: 'latest' },
    { minVersion: '0.0.1', messageVersion: 'v1' },
    // Fallback to latest for unknown versions (0.0.0) to prevent device type detection issues
    { minVersion: '0.0.0', messageVersion: 'latest' },
  ],
  model_touch: [
    // Use latest by default for Touch/Pro
    // Only use v1 for specific old versions (< 4.5.0)
    { minVersion: '4.5.0', messageVersion: 'latest' },
    { minVersion: '0.0.1', messageVersion: 'v1' },
    // Fallback to latest for unknown versions (0.0.0)
    { minVersion: '0.0.0', messageVersion: 'latest' },
  ],
};
