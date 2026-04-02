/**
 * SDK Factory — creates and initializes the hardware SDK instance
 * for CLI usage with the appropriate transport.
 */

import HardwareSDK from '@onekeyfe/hd-common-connect-sdk';
import type { ConnectSettings } from '@onekeyfe/hd-core';

export interface SDKOptions {
  transport?: string;
  json?: boolean;
  connectId?: string;
}

export async function createSDK(opts: SDKOptions) {
  const settings: Partial<ConnectSettings> = {
    debug: false,
    fetchConfig: true,
  };

  // Select transport based on CLI option
  switch (opts.transport) {
    case 'webusb':
      settings.env = 'webusb';
      break;
    case 'ble':
      settings.env = 'react-native';
      break;
    case 'http':
    default:
      settings.env = 'node';
      break;
  }

  await HardwareSDK.init(settings);
  return HardwareSDK;
}
