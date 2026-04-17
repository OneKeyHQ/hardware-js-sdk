import { defaultProcessRunner } from './process-utils';

import type { IProcessRunner, ISecureStorage, SecureStorageBackend } from './types';

const SERVICE_NAME = 'onekey-hw-cli';

export class MacOSSecureStorage implements ISecureStorage {
  private readonly runner: IProcessRunner;

  constructor(runner: IProcessRunner = defaultProcessRunner) {
    this.runner = runner;
  }

  getBackendType(): SecureStorageBackend {
    return 'macos-keychain';
  }

  async set(key: string, value: Buffer): Promise<void> {
    const hex = value.toString('hex');
    await this.runner.spawnWithStdin(
      'sh',
      [
        '-c',
        'read -r secret && security add-generic-password -s "$1" -a "$2" -w "$secret" -U',
        '--',
        SERVICE_NAME,
        key,
      ],
      hex
    );
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const { stdout } = await this.runner.execFileAsync('security', [
        'find-generic-password',
        '-s',
        SERVICE_NAME,
        '-a',
        key,
        '-w',
      ]);
      const hex = stdout.trim();
      return hex ? Buffer.from(hex, 'hex') : null;
    } catch (error) {
      if (this.isItemNotFound(error)) return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.runner.execFileAsync('security', [
        'delete-generic-password',
        '-s',
        SERVICE_NAME,
        '-a',
        key,
      ]);
    } catch (error) {
      if (this.isItemNotFound(error)) return;
      throw error;
    }
  }

  private isItemNotFound(error: unknown): boolean {
    const err = error as Error & { code?: number; stderr?: string };
    return err.code === 44 || err.stderr?.includes('could not be found') === true;
  }
}
