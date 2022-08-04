import type { Response } from '../params';
import type { Device, SupportFeatures } from '../device';

export type DeviceSupportFeatures = SupportFeatures & { device: Device | null };

export declare function deviceSupportFeatures(connectId?: string): Response<DeviceSupportFeatures>;
