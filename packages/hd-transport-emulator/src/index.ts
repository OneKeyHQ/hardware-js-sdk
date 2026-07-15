import transport from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { request as http } from './http';
import { DEFAULT_URL } from './constants';

import type {
  AcquireInput,
  OneKeyDeviceInfoWithSession,
  ProtocolType,
} from '@onekeyfe/hd-transport';

const { check, ProtocolV1, parseConfigure } = transport;

type IncompleteRequestOptions = {
  body?: Array<any> | Record<string, unknown> | string;
  url: string;
  timeout?: number;
};

export default class EmulatorTransport {
  _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  name = 'EmulatorTransport';

  version = '1.0.0';

  configured = false;

  stopped = false;

  isOutdated = false;

  // EmulatorTransport speaks Protocol V1 only.
  getProtocolType(_path: string): ProtocolType {
    return 'V1';
  }

  url: string;

  Log?: any;

  constructor(url?: string) {
    this.url = url == null ? DEFAULT_URL : url;
  }

  _post(options: IncompleteRequestOptions) {
    if (this.stopped) {
      return Promise.reject(ERRORS.TypedError('Transport stopped.'));
    }
    return http({
      ...options,
      method: 'POST',
      url: this.url + options.url,
    });
  }

  async init(logger: any) {
    this.Log = logger;
    const bridgeVersion = await this._silentInit();
    return bridgeVersion;
  }

  async _silentInit() {
    const infoS = await http({
      url: this.url,
      method: 'POST',
      timeout: 3000,
    });
    const info = check.info(infoS);
    return info.version;
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this._messages = messages;
  }

  async listen(old?: Array<OneKeyDeviceInfoWithSession>) {
    if (old === null) {
      throw ERRORS.TypedError('Http-Transport does not support listen without previous.');
    }
    const devicesS = await this._post({
      url: '/listen',
      body: old,
    });
    const devices = check.devices(devicesS);
    return devices;
  }

  async enumerate() {
    const devicesS = await this._post({ url: '/enumerate' });
    const devices = check.devices(devicesS);
    return devices.map(device => ({ ...device, commType: 'emulator' }));
  }

  _acquireMixed(input: AcquireInput) {
    const previousStr = input.previous == null ? 'null' : encodeURIComponent(input.previous);
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const path = encodeURIComponent(input.path);
    const url = `/acquire/${path}/${previousStr}`;
    return this._post({ url });
  }

  async acquire(input: AcquireInput) {
    const acquireS = await this._acquireMixed(input);
    return check.acquire(acquireS);
  }

  async release(session: string, onclose: boolean) {
    const res = this._post({
      url: `/release/${session}`,
    });
    if (onclose) {
      return;
    }
    await res;
  }

  async call(session: string, name: string, data: Record<string, unknown>) {
    if (this._messages == null) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }
    const messages = this._messages;
    this.Log.debug('transport call', { name, protocol: 'V1' });

    const o = ProtocolV1.encodeEnvelope(messages, name, data);
    const outData = o.toString('hex');
    const resData = await this._post({
      url: `/call/${session}`,
      body: outData,
      timeout: name === 'Initialize' ? 10000 : undefined,
    });
    if (typeof resData !== 'string') {
      throw ERRORS.TypedError(HardwareErrorCode.NetworkError, 'Returning data is not string.');
    }
    const jsonData = ProtocolV1.decodeMessage(messages, resData);
    return check.call(jsonData);
  }

  async post(session: string, name: string, data: Record<string, unknown>) {
    if (this._messages == null) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }
    const messages = this._messages;
    const outData = ProtocolV1.encodeEnvelope(messages, name, data).toString('hex');
    await this._post({
      url: `/post/${session}`,
      body: outData,
    });
  }

  async read(session: string) {
    if (this._messages == null) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }
    const messages = this._messages;
    const resData = await this._post({
      url: `/read/${session}`,
    });
    if (typeof resData !== 'string') {
      throw ERRORS.TypedError(HardwareErrorCode.NetworkError, 'Returning data is not string.');
    }
    const jsonData = ProtocolV1.decodeMessage(messages, resData);
    return check.call(jsonData);
  }

  requestDevice() {
    // eslint-disable-next-line prefer-promise-reject-errors
    return Promise.reject();
  }

  stop() {
    this.stopped = true;
  }

  cancel() {
    this.Log.debug('canceled');
  }
}
