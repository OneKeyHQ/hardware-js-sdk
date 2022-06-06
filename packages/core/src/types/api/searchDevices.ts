import { OneKeyDeviceInfo as DeviceDescriptor } from '@onekeyfe/hd-transport';
import { Response } from '../params';

export declare function searchDevices(): Response<DeviceDescriptor[]>;
