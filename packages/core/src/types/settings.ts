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
};
