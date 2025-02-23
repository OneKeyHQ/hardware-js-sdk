import { EventEmitter } from 'events';
import log from 'electron-log';
import { DesktopTransportManager } from '@onekeyfe/hd-desktop-sdk';

let hardwareSDK: DesktopTransportManager | null = null;
const emitter = new EventEmitter();

export async function initHardwareSDK(): Promise<DesktopTransportManager> {
  if (hardwareSDK) {
    return hardwareSDK;
  }

  hardwareSDK = new DesktopTransportManager();

  try {
    // Initialize with logger and emitter
    await hardwareSDK.init(log.functions, emitter);

    // Configure SDK with signed data
    await hardwareSDK.configure(
      JSON.stringify({
        version: '1.0.0',
        debug: false,
      }),
    );

    // Start device enumeration
    const devices = await hardwareSDK.enumerate();
    log.info('Available devices:', devices);
  } catch (error) {
    log.error('Failed to initialize hardware SDK:', error);
    throw error;
  }

  return hardwareSDK;
}

export function getHardwareSDK(): DesktopTransportManager {
  if (!hardwareSDK) {
    throw new Error('Hardware SDK not initialized');
  }
  return hardwareSDK;
}

export function stopHardwareSDK(): void {
  if (hardwareSDK) {
    hardwareSDK.stop();
    hardwareSDK = null;
  }
}
