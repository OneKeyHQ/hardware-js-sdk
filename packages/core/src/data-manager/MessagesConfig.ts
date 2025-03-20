import { IDeviceModel, IDeviceType } from '../types';
import { MessageVersion } from './DataManager';

type DeviceVersionConfig = {
  [deviceType in IDeviceType | IDeviceModel]?: {
    minVersion: string;
    messageVersion: MessageVersion;
  }[];
};

export const PROTOBUF_MESSAGE_CONFIG: DeviceVersionConfig = {
  model_mini: [
    { minVersion: '3.3.0', messageVersion: 'latest' },
    { minVersion: '0.0.0', messageVersion: 'v1' },
  ],
  model_touch: [
    { minVersion: '4.5.0', messageVersion: 'latest' },
    { minVersion: '0.0.0', messageVersion: 'v1' },
  ],
};
