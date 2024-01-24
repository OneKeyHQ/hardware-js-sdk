import { IDeviceType } from '../types';
import { MessageVersion } from './DataManager';

type DeviceVersionConfig = {
  [deviceType in IDeviceType]?: {
    minVersion: string;
    messageVersion: MessageVersion;
  }[];
};

export const PROTOBUF_MESSAGE_CONFIG: DeviceVersionConfig = {
  classic1s: [{ minVersion: '0.0.0', messageVersion: 'latest' }],
  classic: [
    { minVersion: '3.3.0', messageVersion: 'latest' },
    { minVersion: '0.0.0', messageVersion: 'v1' },
  ],
  mini: [
    { minVersion: '3.3.0', messageVersion: 'latest' },
    { minVersion: '0.0.0', messageVersion: 'v1' },
  ],
  touch: [
    { minVersion: '4.5.0', messageVersion: 'latest' },
    { minVersion: '0.0.0', messageVersion: 'v1' },
  ],
  pro: [{ minVersion: '0.0.0', messageVersion: 'latest' }],
};
