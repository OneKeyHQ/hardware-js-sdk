import parseUri from 'parse-uri';
import * as configJSON from '../data/config.json';
import { httpRequest } from '../utils';
import { parseBridgeJSON } from './transportInfo';
import type { ConnectSettings, ConfigSettings, AssetCollection } from '../types';

const parseConfig = (json: any): ConfigSettings => {
  const config: ConfigSettings = json;
  return config;
};

export default class DataManager {
  static config: ConfigSettings;

  static assets: AssetCollection = {};

  static settings: ConnectSettings;

  static messages: { [key: string]: JSON } = {};

  static async load(settings: ConnectSettings, withAssets = true) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const ts = `?r=${settings.timestamp}`;
    this.settings = settings;
    const config = await httpRequest(`${settings.configSrc}${ts}`, 'json');
    this.config = parseConfig(config);

    const isLocalhost =
      typeof window !== 'undefined' && window.location
        ? window.location.hostname === 'localhost'
        : true;
    const whitelist = DataManager.isWhitelisted(this.settings.origin || '');
    this.settings.trustedHost = isLocalhost || !!whitelist;

    // ensure that debug is disabled
    if (!this.settings.trustedHost && !whitelist) {
      this.settings.debug = false;
    }

    if (!withAssets) return;

    const assetPromises = this.config.assets.map(async asset => {
      const json = await httpRequest(`${asset.url}${ts}`, 'json');
      this.assets[asset.name] = json;
    });
    await Promise.all(assetPromises);

    let nrfData = this.assets.nrf;
    try {
      const timestamp = new Date().getTime();
      const resp = await fetch(`https://data.onekey.so/version.json?noCache=${timestamp}`);
      const { firmware, ble, mini_firmware } = await resp.json();
      if (ble && Array.isArray(ble)) {
        // TODO: use bleFirmware config
        [nrfData] = ble;
      }

      if (firmware && Array.isArray(firmware)) {
        const paredFirmwareConfig = firmware.map(firm => {
          if (firm.changelog) return firm;
          return {
            ...firm,
            changelog: firm.changelog_cn,
          };
        });

        // @ts-expect-error
        this.assets['firmware-t1'] = paredFirmwareConfig;
        this.assets.ble = ble;
      }
      if (mini_firmware && Array.isArray(mini_firmware)) {
        const paredFirmwareConfig = mini_firmware.map(firm => {
          if (firm.changelog) return firm;
          return {
            ...firm,
            changelog: firm.changelog_cn,
          };
        });

        // @ts-expect-error
        this.assets['firmware-mini'] = paredFirmwareConfig;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('fetch data error', e.message);
    }

    if (typeof window !== 'undefined' && window?.parent) {
      window?.parent?.postMessage?.(
        {
          type: 'UPDATE_NRF_DATA',
          data: nrfData ?? this.assets.nrf,
        },
        '*'
      );
    }

    const protobufPromises = configJSON.messages.map(async protobuf => {
      const json = await httpRequest(`${protobuf.json}${ts}`, 'json');
      this.messages[protobuf.name] = json;
    });
    await Promise.all(protobufPromises);

    // parse bridge JSON
    parseBridgeJSON(this.assets.bridge);
  }

  static getProtobufMessages() {
    return this.messages.default;
  }

  static isWhitelisted(origin: string) {
    const uri = parseUri(origin);
    if (uri && typeof uri.host === 'string') {
      const parts = uri.host.split('.');
      if (parts.length > 2) {
        // subdomain
        uri.host = parts.slice(parts.length - 2, parts.length).join('.');
      }
      return this.config.whitelist.find(item => item.origin === origin || item.origin === uri.host);
    }
  }

  static getSettings(key?: undefined): ConnectSettings;

  static getSettings<T extends keyof ConnectSettings>(key: T): ConnectSettings[T];

  static getSettings(key?: keyof ConnectSettings) {
    if (!this.settings) return null;
    if (typeof key === 'string') {
      return this.settings[key];
    }
    return this.settings;
  }
}
