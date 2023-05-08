import { LowLevelCoreApi } from '../../lowLevelInject';
import type { ConnectSettings } from '../settings';

export declare function init(
  settings: Partial<ConnectSettings>,
  lowLevelApi?: LowLevelCoreApi
): Promise<boolean>;
