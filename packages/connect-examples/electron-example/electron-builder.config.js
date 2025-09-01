/* eslint-disable no-template-curly-in-string */
// eslint-disable-next-line import/no-import-module-exports, @typescript-eslint/no-var-requires
const { version } = require('./package.json');

module.exports = {
  extraMetadata: {
    main: 'dist/index.js',
    version,
  },
  appId: 'so.onekey.example.hardware-desktop',
  productName: 'HardwareExample',
  copyright: 'Copyright © OeKey 2024',
  asar: true,
  // Unpack native modules so they can be loaded at runtime
  asarUnpack: [
    'node_modules/@stoprocent/noble/**',
    'node_modules/@stoprocent/bluetooth-hci-socket/**',
  ],
  buildVersion: version,
  directories: {
    output: 'out',
  },
  files: [
    'web-build',
    'public',
    'bin',
    '!public/bin/**/*',
    'dist/**/*.js',
    '!dist/__**',
    'package.json',
    '!scripts/**',
  ],
  extraResources: [
    {
      from: 'public/icons/512x512.png',
      to: 'icons/512x512.png',
    },
  ],
  dmg: {
    sign: false,
    contents: [
      {
        x: 410,
        y: 175,
        type: 'link',
        path: '/Applications',
      },
      {
        x: 130,
        y: 175,
        type: 'file',
      },
    ],
    background: 'public/icons/background.png',
  },
  nsis: {
    oneClick: false,
    installerSidebar: 'public/icons/installerSidebar.bmp',
  },
  mac: {
    // skip code signing
    identity: null,
    extraResources: [
      {
        from: 'public/bin/bridge/mac-${arch}',
        to: 'bin/bridge',
      },
    ],
    icon: 'public/icons/512x512.png',
    artifactName: 'Hardware-Example-mac-${arch}.${ext}',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    darkModeSupport: false,
    category: 'productivity',
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] },
      // { target: 'zip', arch: ['x64', 'arm64'] },
    ],
    entitlements: 'entitlements.mac.plist',
    extendInfo: {
      NSCameraUsageDescription: 'Please allow OneKey to use your camera',
    },
  },
  win: {
    extraResources: [
      {
        from: 'public/bin/bridge/win-${arch}',
        to: 'bin/bridge',
      },
    ],
    icon: 'public/icons/512x512.png',
    artifactName: 'Hardware-Example-win-${arch}.${ext}',
    verifyUpdateCodeSignature: false,
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
  },
  linux: {
    extraResources: [
      {
        from: 'public/bin/bridge/linux-${arch}',
        to: 'bin/bridge',
      },
    ],
    icon: 'public/icons/512x512.png',
    artifactName: 'Hardware-Example-linux-${arch}.${ext}',
    executableName: 'onekey-hardware-example',
    category: 'Utility',
    target: ['AppImage'],
  },
  publish: [
    {
      provider: 'github',
      owner: 'OneKeyHQ',
      repo: 'hardware-js-sdk',
      private: false,
      vPrefixedTagName: true,
    },
  ],
};
