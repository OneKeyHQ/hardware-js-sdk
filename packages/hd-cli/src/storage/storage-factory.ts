import { LinuxSecureStorage } from './secure-storage.linux';
import { MacOSSecureStorage } from './secure-storage.macos';

import type { ISecureStorage } from './types';

export function createSecureStorage(
  platform: NodeJS.Platform = process.platform
): ISecureStorage {
  if (platform === 'darwin') return new MacOSSecureStorage();
  if (platform === 'linux') return new LinuxSecureStorage();
  throw new Error(
    `Secure storage is not supported on platform "${platform}". ` +
      'Use macOS Keychain or Linux Secret Service.'
  );
}
