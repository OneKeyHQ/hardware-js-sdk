// eslint-disable-next-line @typescript-eslint/no-var-requires, import/no-unresolved
const pkg = require('../package.json');

export const getSDKVersion = () => pkg.version;
export const DEFAULT_DOMAIN = `https://jssdk.onekey.so/${getSDKVersion()}/`;

export const whitelist = [
  // Electron local file
  { origin: 'file://' },
  // OneKey App
  { origin: '1key.so' },
  { origin: 'onekey.so' },
  { origin: 'onekeycn.com' },
  { origin: 'onekeytest.com' },
  { origin: 'localhost' },
];

export const whitelistExtension = [
  // OneKey
  'jnmbobjmhlngoefaiojfljckilhhlhcj',
  // Rabby
  'acmacodkjbdgmoleebolmdjonilkdbch',
  // OKX
  'mcohilncbfahbmgdjkbpemcciiolgcge',
];
