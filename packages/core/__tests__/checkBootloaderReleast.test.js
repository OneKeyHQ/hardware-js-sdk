const semver = require('semver');

const fixtures = [
  {
    description: 'version: 2.10.0 -> 2.11.0, boot 1.9.0 -> boot 2.0.0, No need to upgrade',
    currentVersion: '2.10.0',
    bootloaderVersion: '1.9.0',
    willUpdateFirmware: '2.11.0',
    targetBootloaderVersion: [2, 0, 0],
    bootloaderRelatedFirmwareVersion: [3, 0, 0],
    shouldUpdateBootloader: false,
  },
  {
    description: 'version: 2.10.0 -> 3.0.0, boot 1.9.0 -> boot 2.0.0, Should upgrade bootloader',
    currentVersion: '2.10.0',
    bootloaderVersion: '1.9.0',
    willUpdateFirmware: '3.0.0',
    targetBootloaderVersion: [2, 0, 0],
    bootloaderRelatedFirmwareVersion: [3, 0, 0],
    shouldUpdateBootloader: true,
  },
  {
    description: 'version: 2.10.0 -> 3.0.0, boot 2.0.0 -> boot 2.0.0, No need to upgrade',
    currentVersion: '2.10.0',
    bootloaderVersion: '2.0.0',
    willUpdateFirmware: '3.0.0',
    targetBootloaderVersion: [2, 0, 0],
    bootloaderRelatedFirmwareVersion: [3, 0, 0],
    shouldUpdateBootloader: false,
  },
  {
    description: 'version: 3.0.0 -> 3.0.0, boot 2.0.0 -> boot 2.0.0, No need to upgrade',
    currentVersion: '3.0.0',
    bootloaderVersion: '2.0.0',
    willUpdateFirmware: '3.0.0',
    targetBootloaderVersion: [2, 0, 0],
    bootloaderRelatedFirmwareVersion: [3, 0, 0],
    shouldUpdateBootloader: false,
  },
  {
    description: 'version: 3.0.0 -> 3.1.0, boot 2.0.0 -> boot 2.0.0, No need to upgrade',
    currentVersion: '3.0.0',
    bootloaderVersion: '2.0.0',
    willUpdateFirmware: '3.1.0',
    targetBootloaderVersion: [2, 0, 0],
    bootloaderRelatedFirmwareVersion: [3, 0, 0],
    shouldUpdateBootloader: false,
  },
  {
    description: 'version: 2.11.0 -> 3.1.0, boot 1.9.0 -> boot 2.0.0, Should upgrade bootloader',
    currentVersion: '2.11.0',
    bootloaderVersion: '2.0.0',
    willUpdateFirmware: '3.1.0',
    targetBootloaderVersion: [2, 0, 0],
    bootloaderRelatedFirmwareVersion: [3, 0, 0],
    shouldUpdateBootloader: false,
  },
  {
    description: 'version: 2.11.0 -> 3.1.0, boot 2.0.0 -> boot 2.0.0, No need to upgrade',
    currentVersion: '2.11.0',
    bootloaderVersion: '2.0.0',
    willUpdateFirmware: '3.1.0',
    targetBootloaderVersion: [2, 0, 0],
    bootloaderRelatedFirmwareVersion: [3, 0, 0],
    shouldUpdateBootloader: false,
  },
  {
    description: 'version: 3.1.0 -> 3.2.0, boot 1.9.0 -> boot 2.0.0, Should upgrade bootloader',
    currentVersion: '3.1.0',
    bootloaderVersion: '1.9.0',
    willUpdateFirmware: '3.2.0',
    targetBootloaderVersion: [2, 0, 0],
    bootloaderRelatedFirmwareVersion: [3, 0, 0],
    shouldUpdateBootloader: true,
  },
  {
    description: 'version: 3.1.0 -> 3.3.0, boot 2.0.0 -> boot 2.0.0, No need to upgrade',
    currentVersion: '3.1.0',
    bootloaderVersion: '1.9.0',
    willUpdateFirmware: '3.2.0',
    targetBootloaderVersion: [2, 0, 0],
    bootloaderRelatedFirmwareVersion: [3, 0, 0],
    shouldUpdateBootloader: true,
  },
];

function checkNeedUpdateBootForClassicAndMini({
  currentVersion,
  bootloaderVersion,
  willUpdateFirmware,
  targetBootloaderVersion,
  bootloaderRelatedFirmwareVersion,
}) {
  // If the current bootloader version is greater than or equal to the version that needs to be upgraded, then no upgrade is required
  if (targetBootloaderVersion && semver.gte(bootloaderVersion, targetBootloaderVersion.join('.'))) {
    return false;
  }

  if (semver.gte(willUpdateFirmware, bootloaderRelatedFirmwareVersion.join('.'))) {
    return true;
  }

  // The current version is greater than the relatedVersion and the bootloader version is lower than the target bootloader version
  if (semver.gte(currentVersion, bootloaderRelatedFirmwareVersion.join('.'))) {
    return true;
  }

  return false;
}

describe('CheckBootloaderReleast', () => {
  fixtures.forEach(data => {
    test(data.description, () => {
      const {
        currentVersion,
        bootloaderVersion,
        willUpdateFirmware,
        targetBootloaderVersion,
        bootloaderRelatedFirmwareVersion,
      } = data;
      const shouldUpdateBootloader = checkNeedUpdateBootForClassicAndMini({
        currentVersion,
        bootloaderVersion,
        willUpdateFirmware,
        targetBootloaderVersion,
        bootloaderRelatedFirmwareVersion,
      });
      expect(shouldUpdateBootloader).toBe(data.shouldUpdateBootloader);
    });
  });
});
