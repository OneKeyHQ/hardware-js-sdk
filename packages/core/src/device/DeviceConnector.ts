import { isProtocolV2LinkDisabledError } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { safeThrowError } from '../constants';
import { DataManager } from '../data-manager';
import TransportManager from '../data-manager/TransportManager';
import { DevicePool } from './DevicePool';
import { resolveAfter } from '../utils/promiseUtils';
import { LoggerNames, getLogger } from '../utils';

import type { DeviceDescriptorDiff } from './DevicePool';
import type { HardwareConnectProtocol } from '@onekeyfe/hd-shared';
import type { OneKeyDeviceInfo as DeviceDescriptor, Transport } from '@onekeyfe/hd-transport';

const Log = getLogger(LoggerNames.DeviceConnector);

export default class DeviceConnector {
  transport?: Transport;

  listenTimestamp = 0;

  current: DeviceDescriptor[] | null = null;

  upcoming: DeviceDescriptor[] = [];

  listening = false;

  constructor() {
    TransportManager.load();
    this.transport = TransportManager.getTransport();
    DevicePool.setConnector(this);
  }

  private getActiveTransport(): Transport {
    const transport = this.transport ?? TransportManager.getTransport();
    if (!transport) {
      throw ERRORS.TypedError(
        HardwareErrorCode.TransportNotConfigured,
        'Device connector was created before transport initialization'
      );
    }
    this.transport = transport;
    return transport;
  }

  async enumerate() {
    try {
      const descriptors = await this.getActiveTransport().enumerate();
      this.upcoming = descriptors;
      this._reportDevicesChange();
      return { descriptors } as DeviceDescriptorDiff;
    } catch (error) {
      safeThrowError(error);
    }
  }

  async listen() {
    const waitForEvent = this.current !== null;
    const current: DeviceDescriptor[] = this.current || [];

    this.listening = true;

    let descriptors: DeviceDescriptor[];

    try {
      const transport = this.getActiveTransport();
      Log.debug('Start listening', current);
      this.listenTimestamp = new Date().getTime();
      descriptors = waitForEvent ? await transport.listen(current) : await transport.enumerate();
      if (!this.listening) return; // do not continue if stop() was called

      this.upcoming = descriptors;
      Log.debug('Listen result', descriptors);
      this._reportDevicesChange();
      if (this.listening) this.listen(); // handlers might have called stop()
    } catch (error) {
      const time = new Date().getTime() - this.listenTimestamp;
      Log.debug('Listen error', 'timestamp', time, typeof error);

      if (time > 1100) {
        await resolveAfter(1000, null);
        if (this.listening) this.listen();
      } else {
        Log.warn('Transport error');
      }
    }
  }

  stop() {
    this.listening = false;
  }

  async acquire(
    path: string,
    session?: string | null,
    forceCleanRunPromise?: boolean,
    expectedProtocol?: HardwareConnectProtocol,
    protocolHint?: HardwareConnectProtocol
  ) {
    Log.debug('acquire', path, session, expectedProtocol, protocolHint);
    const env = DataManager.getSettings('env');
    try {
      const transport = this.getActiveTransport();
      let res;
      if (DataManager.isBleConnect(env)) {
        res = await transport.acquire({
          uuid: path,
          forceCleanRunPromise,
          expectedProtocol,
          protocolHint,
        });
      } else {
        res = await transport.acquire({
          path,
          previous: session ?? null,
          expectedProtocol,
          protocolHint,
        });
      }
      if (expectedProtocol) {
        // The acquire response is the stable snapshot from this active probe. A delayed
        // disconnect from an older generation may clear caches, so do not rely on cache alone.
        const acquiredProtocol =
          typeof res === 'object' && res !== null
            ? (res as DeviceDescriptor).protocolType
            : undefined;
        const detectedProtocol = acquiredProtocol ?? transport.getProtocolType(path);
        if (detectedProtocol !== expectedProtocol) {
          throw ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            `Device protocol mismatch: expected ${expectedProtocol}, detected ${detectedProtocol}`
          );
        }
      }
      return res;
    } catch (error) {
      Log.error('acquire error: ', error.message);
      if (isProtocolV2LinkDisabledError(error)) {
        throw ERRORS.TypedError(HardwareErrorCode.BleUnavailableWhileUsbConnected, undefined, {
          failureCode: error.failureCode,
          firmwareMessage: error.firmwareMessage,
        });
      }
      safeThrowError(error);
    }
  }

  async release(session: string, onclose: boolean, keepSession?: boolean) {
    try {
      const res = await this.getActiveTransport().release(session, onclose, keepSession);
      return res;
    } catch (error) {
      safeThrowError(error);
    }
  }

  async disconnect(session: string | undefined | null) {
    try {
      const transport = this.getActiveTransport();
      if (transport.disconnect && !!session) {
        await transport.disconnect(session);
      }
    } catch (error) {
      safeThrowError(error);
    }
  }

  promptDeviceAccess(): Promise<USBDevice | BluetoothDevice | null> {
    const transport = this.getActiveTransport();
    if (!transport.promptDeviceAccess) {
      return Promise.resolve(null);
    }
    return transport.promptDeviceAccess();
  }

  _reportDevicesChange() {
    DevicePool.reportDeviceChange(this.upcoming);
  }
}
