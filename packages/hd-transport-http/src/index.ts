import transport from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode, enableLog, getLogger, LoggerNames } from '@onekeyfe/hd-shared';
import type { AcquireInput, OneKeyDeviceInfoWithSession } from '@onekeyfe/hd-transport';
import { request as http } from './http';
import { DEFAULT_URL } from './constants';

const { check, buildOne, receiveOne, parseConfigure } = transport;

type IncompleteRequestOptions = {
  body?: Array<any> | Record<string, unknown> | string;
  url: string;
};

const Log = getLogger(LoggerNames.HdTransportHttp);

export default class HttpTransport {
  _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  configured = false;

  stopped = false;

  url: string;

  constructor(url?: string) {
    this.url = url == null ? DEFAULT_URL : url;
    enableLog(true);
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

  async init() {
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
    return devices;
  }

  _acquireMixed(input: AcquireInput) {
    const previousStr = input.previous == null ? 'null' : input.previous;
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const url = `/acquire/${input.path}/${previousStr}`;
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
    Log.debug('call-', ' name: ', name, ' data: ', data);
    const o = buildOne(messages, name, data);
    const outData = o.toString('hex');
    const resData = await this._post({
      url: `/call/${session}`,
      body: outData,
    });
    if (typeof resData !== 'string') {
      throw ERRORS.TypedError(HardwareErrorCode.NetworkError, 'Returning data is not string.');
    }
    const jsonData = receiveOne(messages, resData);
    return check.call(jsonData);
  }

  async post(session: string, name: string, data: Record<string, unknown>) {
    if (this._messages == null) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }
    const messages = this._messages;
    const outData = buildOne(messages, name, data).toString('hex');
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
    const jsonData = receiveOne(messages, resData);
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
    Log.debug('canceled');
  }
}
