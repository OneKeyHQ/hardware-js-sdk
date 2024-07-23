/* eslint-disable vars-on-top */

import type { ConnectSettings } from '../types';
import { DEFAULT_DOMAIN, getSDKVersion } from '../data/config';

export const DEFAULT_PRIORITY = 2;

declare const chrome: any;
declare global {
  // eslint-disable-next-line no-var
  var ONEKEY_CONNECT_SRC: string;
}

const initialSettings: ConnectSettings = {
  configSrc: './data/config.json', // constant
  version: '', // constant
  debug: false,
  priority: DEFAULT_PRIORITY,
  trustedHost: false,
  connectSrc: DEFAULT_DOMAIN,
  iframeSrc: `${DEFAULT_DOMAIN}iframe.html`,
  parentOrigin: typeof window !== 'undefined' && window.location ? window.location.origin : '',
  extension: (typeof chrome !== 'undefined' && chrome?.runtime?.id) || '',
  supportedBrowser:
    typeof navigator !== 'undefined' ? !/Trident|MSIE|Edge/.test(navigator.userAgent) : true,
  env: 'web',
  lazyLoad: false,
  timestamp: new Date().getTime(),
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
  if (url.match(/^https:\/\/([A-Za-z0-9\-_]+\.)*onekey\.so\//)) return url;
  if (url.match(/^https?:\/\/localhost:[58][0-9]{3}\//)) return url;
  return url;
};

export const parseConnectSettings = (input: Partial<ConnectSettings> = {}) => {
  const settings: ConnectSettings = { ...initialSettings };

  if (Object.prototype.hasOwnProperty.call(input, 'debug')) {
    settings.debug = input.debug;
  }

  if (input.isFrame) {
    settings.parentOrigin = input.parentOrigin;
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

  if (input.transportReconnect) {
    settings.transportReconnect = input.transportReconnect;
  }

  if (input.lazyLoad) {
    settings.lazyLoad = input.lazyLoad;
  }

  if (typeof input.env === 'string') {
    settings.env = input.env;
  } else {
    settings.env = getEnv();
  }

  if (input.timestamp) {
    settings.timestamp = input.timestamp;
  }

  if (input.preRelease) {
    settings.preRelease = input.preRelease;
  }

  if (input.fetchConfig) {
    settings.fetchConfig = input.fetchConfig;
  }

  return settings;
};

export { getSDKVersion };
