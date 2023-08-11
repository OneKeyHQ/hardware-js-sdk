import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import transport from '@onekeyfe/hd-transport';
import type EventEmitter from 'events';
import type { LowlevelTransportSharedPlugin } from '@onekeyfe/hd-transport';
import type { LowLevelAcquireInput } from './types';

const { check, buildBuffers, receiveOne, parseConfigure } = transport;

export default class LowlevelTransport {
  _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  configured = false;

  Log?: any;

  emitter?: EventEmitter;

  plugin: LowlevelTransportSharedPlugin = {} as LowlevelTransportSharedPlugin;

  init(logger: any, emitter: EventEmitter, plugin: LowlevelTransportSharedPlugin) {
    this.Log = logger;
    this.emitter = emitter;
    this.plugin = plugin;
    this.plugin.init();
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this._messages = messages;
  }

  listen() {
    // empty
  }

  enumerate() {
    return this.plugin.enumerate();
  }

  async acquire(input: LowLevelAcquireInput) {
    try {
      await this.plugin.connect(input.uuid);
    } catch (error) {
      this.Log.debug('lowlelvel transport connect error: ', error);
      throw ERRORS.TypedError(
        HardwareErrorCode.LowlevelTrasnportConnectError,
        error.message ?? error
      );
    }
  }

  async release(uuid: string) {
    try {
      await this.plugin.disconnect(uuid);
      return true;
    } catch (error) {
      this.Log.debug('lowlelvel transport disconnect error: ', error);
      return false;
    }
  }

  async call(uuid: string, name: string, data: Record<string, unknown>) {
    if (this._messages === null || !this._messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const messages = this._messages;
    this.Log.debug('lowlevel-transport', 'call-', ' name: ', name, ' data: ', data);

    const buffers = buildBuffers(messages, name, data);
    for (const o of buffers) {
      const outData = o.toString('base64');
      // Upload resources on low-end phones may OOM
      this.Log.debug('send hex strting: ', o.toString('hex'));
      try {
        await this.plugin.send(uuid, outData);
      } catch (e) {
        this.Log.debug('lowlevel transport send error: ', e);
        throw ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError, e.reason);
      }
    }

    try {
      const response = await this.plugin.receive();
      if (typeof response !== 'string') {
        throw new Error('Returning data is not string');
      }
      this.Log.debug('receive data: ', response);
      const jsonData = receiveOne(messages, response);
      return check.call(jsonData);
    } catch (e) {
      this.Log.error('lowlevel call error: ', e);
      throw e;
    }
  }

  cancel() {
    this.Log.debug('lowlevel-transport', 'cancel');
  }
}
