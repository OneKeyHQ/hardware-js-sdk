import { KnownDevice } from '../device';
import { Response } from '../params';

export declare function promptWebDeviceAccess(): Response<{ device: KnownDevice | null }>;
