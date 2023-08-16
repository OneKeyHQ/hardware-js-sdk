import type { LowlevelTransportSharedPlugin } from '@onekeyfe/hd-transport';
import { LowLevelCoreApi } from '../../lowLevelInject';
import type { ConnectSettings } from '../settings';

export declare function init(
  settings: Partial<ConnectSettings>,
  lowLevelApi?: LowLevelCoreApi,
  pulgin?: LowlevelTransportSharedPlugin
): Promise<boolean>;

export declare function updateSettings(settings: Partial<ConnectSettings>): Promise<boolean>;
