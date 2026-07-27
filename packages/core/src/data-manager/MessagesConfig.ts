import type { IDeviceModel, IDeviceType } from '../types';
import type { ProtocolV1MessageSchema } from './DataManager';

type DeviceVersionConfig = {
  [deviceType in IDeviceType | IDeviceModel]?: {
    minVersion: string;
    protocolV1MessageSchema: ProtocolV1MessageSchema;
  }[];
};

export const PROTOBUF_MESSAGE_CONFIG: DeviceVersionConfig = {
  model_mini: [
    // Classic1s starts from 3.5.0, so use the current Protocol V1 schema by default.
    // Only use the legacy Protocol V1 schema for specific old versions (< 3.3.0).
    { minVersion: '3.3.0', protocolV1MessageSchema: 'v1CurrentSchema' },
    { minVersion: '0.0.1', protocolV1MessageSchema: 'v1LegacySchema' },
    // Fallback to current Protocol V1 schema for unknown versions (0.0.0).
    { minVersion: '0.0.0', protocolV1MessageSchema: 'v1CurrentSchema' },
  ],
  model_touch: [
    // Use the current Protocol V1 schema by default for Touch/Pro.
    // Only use the legacy Protocol V1 schema for specific old versions (< 4.5.0).
    { minVersion: '4.5.0', protocolV1MessageSchema: 'v1CurrentSchema' },
    { minVersion: '0.0.1', protocolV1MessageSchema: 'v1LegacySchema' },
    // Fallback to current Protocol V1 schema for unknown versions (0.0.0).
    { minVersion: '0.0.0', protocolV1MessageSchema: 'v1CurrentSchema' },
  ],
};
