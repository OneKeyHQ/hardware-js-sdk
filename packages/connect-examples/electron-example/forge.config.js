/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fs = require('fs-extra');
const d = require('debug');

const debug = d('forge config');

module.exports = {
  packagerConfig: {
    name: 'HardwareExample',
    appBundleId: 'so.onekey.example.hardware-desktop',
    executableName: process.platform === 'linux' ? 'onekey-hardware-example' : 'HardwareExample',
    appCategoryType: 'public.app-category.developer-tools',
    appCopyright: 'Copyright 2024 OneKey Ltd',
    asar: true,
    icon: path.resolve(__dirname, 'public', 'icons', 'icon'),
  },
  rebuildConfig: {},
  hooks: {
    packageAfterCopy: async (forgeConfig, buildPath, electronVersion, platform, arch) => {
      let originDir;
      let binName;
      const destDir = path.resolve(buildPath, '../', 'bin', 'bridge');

      switch (platform) {
        case 'darwin':
          originDir = path.resolve(buildPath, 'public', 'bin', 'bridge', `mac-${arch}`);
          binName = 'onekeyd';
          break;
        case 'win32':
          originDir = path.resolve(buildPath, 'public', 'bin', 'bridge', 'win-x64');
          binName = 'onekeyd.exe';
          break;
        case 'linux':
          originDir = path.resolve(buildPath, 'public', 'bin', 'bridge', `linux-${arch}`);
          binName = 'onekeyd';
          break;
        default:
          originDir = '';
          binName = 'onekeyd';
          break;
      }

      debug(`=====>>>>> copy bin: originDir:${originDir}, platform:${platform}, arch:${arch}`);
      await fs.ensureDir(destDir);
      await fs.copy(path.resolve(originDir, binName), path.resolve(destDir, binName));
    },
    packageAfterPrune: async (forgeConfig, buildPath, electronVersion, platform, arch) => {
      const bridgeDir = path.resolve(buildPath, 'public', 'bin');
      const scrDir = path.resolve(buildPath, 'src');
      const buildScriptDir = path.resolve(buildPath, 'scripts');

      await fs.remove(bridgeDir);
      await fs.remove(scrDir);
      await fs.remove(buildScriptDir);
      return null;
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
};
