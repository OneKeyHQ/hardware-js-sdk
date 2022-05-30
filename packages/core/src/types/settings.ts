export interface Manifest {
  appUrl: string;
  email: string;
}

export type ConnectSettings = {
  manifest?: Manifest;
  connectSrc?: string;
  debug?: boolean;
  transportReconnect?: boolean;
  lazyLoad?: boolean;
  // internal part, not to be accepted from .init()
  origin?: string;
  parentOrigin?: string; // parent window origin
  configSrc: string;
  iframeSrc: string;
  version: string;
  priority: number;
  trustedHost: boolean;
  supportedBrowser?: boolean;
  env: 'node' | 'web' | 'webextension' | 'electron' | 'react-native';
  timestamp: number;
  isFrame?: boolean;
};

// config settings
export type AssetCollection = { [key: string]: JSON };

type WhiteList = {
  priority: number;
  origin: string;
};

type Asset = {
  name: string;
  type?: string;
  url: string;
};

type KnownHost = {
  origin: string;
  label?: string;
  icon?: string;
};

type SupportedBrowser = {
  version: number;
  download: string;
  update: string;
};

type Resources = {
  bridge: string;
};

type ProtobufMessages = {
  name: string;
  range: {
    min: string[];
    max?: string[];
  };
  json: string;
};

export type ConfigSettings = {
  whitelist: WhiteList[];
  management: WhiteList[];
  knownHosts: KnownHost[];
  resources: Resources;
  assets: Asset[];
  messages: ProtobufMessages[];
  supportedBrowsers: { [key: string]: SupportedBrowser };
  supportedFirmware: Array<{
    coinType?: string;
    coin?: string | string[];
    excludedMethods?: string[];
    min?: string[];
    max?: string[];
  }>;
};
