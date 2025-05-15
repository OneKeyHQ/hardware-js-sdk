import packageJson from '../../package.json';

export const CONNECT_SRC =
  process.env.CONNECT_SRC || `https://jssdk.onekey.so/${packageJson.version}/`;
