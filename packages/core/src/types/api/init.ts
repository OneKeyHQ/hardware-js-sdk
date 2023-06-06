import { LowLevelCoreApi } from '../../lowLevelInject';
import type { ConnectSettings } from '../settings';

export declare function init(
  settings: Partial<ConnectSettings>,
  lowLevelApi?: LowLevelCoreApi
): Promise<boolean>;

export declare function updateSettings(settings: Partial<ConnectSettings>): Promise<boolean>;
