/**
 * Version helpers for developer-portal copy.
 *
 * iframe host must match the *installed* `@onekeyfe/hd-web-sdk` version.
 * The SDK default is `https://jssdk.onekey.so/${pkg.version}/` from
 * `packages/core/src/data/config.ts` — omit `connectSrc` unless you host
 * the iframe yourself.
 */

export const SDK_PACKAGE_VERSION =
  process.env.NEXT_PUBLIC_SDK_VERSION || '1.2.1';

export const iframeConnectSrc = (version = SDK_PACKAGE_VERSION) =>
  `https://jssdk.onekey.so/${version}/`;
