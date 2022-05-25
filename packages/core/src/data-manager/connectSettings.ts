/* eslint-disable vars-on-top */

import type { Manifest, ConnectSettings } from '../types';
import { VERSION, DEFAULT_DOMAIN } from '../data/version';

export const DEFAULT_PRIORITY = 2;

declare const chrome: any;
declare global {
  // eslint-disable-next-line no-var
  var ONEKEY_CONNECT_SRC: string;
}

const initialSettings: ConnectSettings = {
  configSrc: './data/config.json', // constant
  version: VERSION, // constant
  debug: false,
  priority: DEFAULT_PRIORITY,
  trustedHost: false,
  connectSrc: DEFAULT_DOMAIN,
  iframeSrc: `${DEFAULT_DOMAIN}iframe.html`,
  supportedBrowser:
    typeof navigator !== 'undefined' ? !/Trident|MSIE|Edge/.test(navigator.userAgent) : true,
  // manifest: null,
  env: 'web',
  lazyLoad: false,
  timestamp: new Date().getTime(),
};

const parseManifest = (manifest?: Manifest) => {
  if (!manifest) return;
  if (typeof manifest.email !== 'string') return;
  if (typeof manifest.appUrl !== 'string') return;

  return {
    email: manifest.email,
    appUrl: manifest.appUrl,
  };
};

export const getEnv = () => {
  if (
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    typeof chrome.runtime.onConnect !== 'undefined'
  ) {
    return 'webextension';
  }
  if (typeof navigator !== 'undefined') {
    if (
      typeof navigator.product === 'string' &&
      navigator.product.toLowerCase() === 'reactnative'
    ) {
      return 'react-native';
    }
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.indexOf(' electron/') > -1) {
      return 'electron';
    }
  }
  return 'web';
};

export const corsValidator = (url?: string) => {
  if (typeof url !== 'string') return;
  if (url.match(/^https:\/\/([A-Za-z0-9\-_]+\.)*trezor\.io\//)) return url;
  if (url.match(/^https?:\/\/localhost:[58][0-9]{3}\//)) return url;
  if (url.match(/^https:\/\/([A-Za-z0-9\-_]+\.)*sldev\.cz\//)) return url;
  if (
    url.match(
      /^https?:\/\/([A-Za-z0-9\-_]+\.)*trezoriovpjcahpzkrewelclulmszwbqpzmzgub37gbcjlvluxtruqad\.onion\//
    )
  )
    return url;
};

export const parseConnectSettings = (input: Partial<ConnectSettings> = {}) => {
  const settings: ConnectSettings = { ...initialSettings };

  if (Object.prototype.hasOwnProperty.call(input, 'debug')) {
    if (typeof input.debug === 'boolean') {
      settings.debug = input.debug;
    } else if (typeof input.debug === 'string') {
      settings.debug = input.debug === 'true';
    }
  }

  if (typeof input.connectSrc === 'string') {
    settings.connectSrc = input.connectSrc;
  }

  let globalSrc: string | undefined;
  if (typeof window !== 'undefined') {
    globalSrc = window.ONEKEY_CONNECT_SRC;
  } else if (typeof global !== 'undefined') {
    globalSrc = global.ONEKEY_CONNECT_SRC;
  }
  if (typeof globalSrc === 'string') {
    settings.connectSrc = corsValidator(globalSrc);
    settings.debug = true;
  }

  const src = settings.connectSrc || DEFAULT_DOMAIN;
  settings.iframeSrc = `${src}iframe.html`;

  if (typeof input.transportReconnect === 'boolean') {
    settings.transportReconnect = input.transportReconnect;
  }

  if (typeof input.lazyLoad === 'boolean') {
    settings.lazyLoad = input.lazyLoad;
  }

  if (typeof input.env === 'string') {
    settings.env = input.env;
  } else {
    settings.env = getEnv();
  }

  if (typeof input.timestamp === 'number') {
    settings.timestamp = input.timestamp;
  }

  if (typeof input.manifest === 'object') {
    settings.manifest = parseManifest(input.manifest);
  }

  return settings;
};
