import transport from '@onekeyfe/hd-transport';
import { request as http } from './http';
import { DEFAULT_URL, DEFAULT_VERSION_URL } from './constants';
import type { AcquireInput, OneKeyDeviceInfoWithSession } from '@onekeyfe/hd-transport';

const { check, buildOne, receiveOne, parseConfigure } = transport;

type IncompleteRequestOptions = {
  body?: Array<any> | Record<string, unknown> | string;
  url: string;
};

export default class HttpTransport {
  _messages: ReturnType<typeof transport.parseConfigure> | undefined;
  bridgeVersion?: string;
  configured = false;
  debug = false;
  isOutdated?: boolean;
  newestVersionUrl: string;
  stopped = false;
  url: string;
  version = '';

  constructor(url?: string, newestVersionUrl?: string) {
    this.url = url == null ? DEFAULT_URL : url;
    this.newestVersionUrl = newestVersionUrl == null ? DEFAULT_VERSION_URL : newestVersionUrl;
  }

  _post(options: IncompleteRequestOptions) {
    if (this.stopped) {
      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject('Transport stopped.');
    }
    return http({
      ...options,
      method: 'POST',
      url: this.url + options.url,
      skipContentTypeHeader: true,
    });
  }

  async init(debug: boolean) {
    this.debug = !!debug;
    await this._silentInit();
  }

  async _silentInit() {
    const infoS = await http({
      url: this.url,
      method: 'POST',
    });
    const info = check.info(infoS);
    this.version = info.version;
    const newVersion =
      typeof this.bridgeVersion === 'string'
        ? this.bridgeVersion
        : check.version(
            await http({
              url: `${this.newestVersionUrl}?${Date.now()}`,
              method: 'GET',
            }),
          );
    // TODO: 这里需要进行版本比较，可以使用 semver 比较，不引入其他工具类
    // this.isOutdated = versionUtils.isNewer(newVersion, this.version);
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this._messages = messages;
  }

  async listen(old?: Array<OneKeyDeviceInfoWithSession>) {
    if (old === null) {
      throw new Error('Http-Transport does not support listen without previous.');
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

  _acquireMixed(input: AcquireInput, debugLink: boolean) {
    const previousStr = input.previous == null ? 'null' : input.previous;
    const url = `${debugLink ? '/debug' : ''}/acquire/${input.path}/${previousStr}`;
    return this._post({ url });
  }

  async acquire(input: AcquireInput, debugLink: boolean) {
    const acquireS = await this._acquireMixed(input, debugLink);
    return check.acquire(acquireS);
  }

  async release(session: string, onclose: boolean, debugLink: boolean) {
    const res = this._post({
      url: `${debugLink ? '/debug' : ''}/release/${session}`,
    });
    if (onclose) {
      return;
    }
    await res;
  }

  async call(session: string, name: string, data: Record<string, unknown>, debugLink: boolean) {
    if (this._messages == null) {
      throw new Error('Transport not configured.');
    }
    const messages = this._messages;
    const o = buildOne(messages, name, data);
    const outData = o.toString('hex');
    const resData = await this._post({
      url: `${debugLink ? '/debug' : ''}/call/${session}`,
      body: outData,
    });
    if (typeof resData !== 'string') {
      throw new Error('Returning data is not string.');
    }
    const jsonData = receiveOne(messages, resData);
    return check.call(jsonData);
  }

  async post(session: string, name: string, data: Record<string, unknown>, debugLink: boolean) {
    if (this._messages == null) {
      throw new Error('Transport not configured.');
    }
    const messages = this._messages;
    const outData = buildOne(messages, name, data).toString('hex');
    await this._post({
      url: `${debugLink ? '/debug' : ''}/post/${session}`,
      body: outData,
    });
  }

  async read(session: string, debugLink: boolean) {
    if (this._messages == null) {
      throw new Error('Transport not configured.');
    }
    const messages = this._messages;
    const resData = await this._post({
      url: `${debugLink ? '/debug' : ''}/read/${session}`,
    });
    if (typeof resData !== 'string') {
      throw new Error('Returning data is not string.');
    }
    const jsonData = receiveOne(messages, resData);
    return check.call(jsonData);
  }

  requestDevice() {
    // eslint-disable-next-line prefer-promise-reject-errors
    return Promise.reject();
  }

  setBridgeLatestUrl(url: string) {
    this.newestVersionUrl = url;
  }

  setBridgeLatestVersion(version: string) {
    this.bridgeVersion = version;
  }

  stop() {
    this.stopped = true;
  }
}
