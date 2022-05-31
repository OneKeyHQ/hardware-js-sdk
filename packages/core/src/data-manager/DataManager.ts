import parseUri from 'parse-uri';
import { httpRequest } from '../utils';
import { parseBridgeJSON } from './transportInfo';
import type { ConnectSettings, ConfigSettings, AssetCollection } from '../types';
import { parseFirmware } from './FirmwareInfo';
import { parseBLEFirmware } from './BLEFirmwareInfo';

const parseConfig = (json: any): ConfigSettings => {
  const config: ConfigSettings = typeof json === 'string' ? JSON.parse(json) : json;
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

    let nrfData = this.assets.nrf;
    try {
      const timestamp = new Date().getTime();
      const resp = await httpRequest(
        `https://data.onekey.so/version.json?noCache=${timestamp}`,
        'json'
      );
      const { firmware, ble, mini_firmware, bridge } = resp;
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

        this.assets.bridge = bridge;
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

    const protobufPromises = this.config.messages.map(async protobuf => {
      const json = await httpRequest(`${protobuf.json}${ts}`, 'json');
      this.messages[protobuf.name] = typeof json === 'string' ? JSON.parse(json) : json;
    });
    await Promise.all(protobufPromises);

    // parse bridge JSON
    parseBridgeJSON(this.assets.bridge);

    // parse firmware definitions
    parseFirmware(this.assets['firmware-t1'], 1);
    parseFirmware(this.assets['firmware-t2'], 2);
    parseFirmware(this.assets['firmware-mini'], 'mini');
    parseBLEFirmware(this.assets.ble);
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
