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
    // Use `security -i` (interactive/batch mode): the tool parses commands
    // from stdin internally instead of re-spawning a sub-process per command,
    // so the password argument never appears in /proc or `ps aux` output.
    //
    // Keys are of the form `onekey-hw:<deviceId>/<slot>` and hex values only
    // contain 0-9a-f, so neither contains shell metacharacters that would
    // break the simple quoting security's parser expects.
    const cmd = `add-generic-password -s "${SERVICE_NAME}" -a "${key}" -w "${hex}" -U`;
    await this.runner.spawnWithStdin('security', ['-i'], cmd);
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
