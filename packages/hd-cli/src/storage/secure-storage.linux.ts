import { defaultProcessRunner } from './process-utils';

import type { IProcessRunner, ISecureStorage, SecureStorageBackend } from './types';

const SERVICE_NAME = 'onekey-hw-cli';
const SECRET_LABEL = 'OneKey HW CLI Secret';

export class LinuxSecureStorage implements ISecureStorage {
  private readonly runner: IProcessRunner;

  constructor(runner: IProcessRunner = defaultProcessRunner) {
    this.runner = runner;
  }

  getBackendType(): SecureStorageBackend {
    return 'linux-secret-service';
  }

  async set(key: string, value: Buffer): Promise<void> {
    await this.runner.spawnWithStdin(
      'secret-tool',
      ['store', '--label', SECRET_LABEL, 'service', SERVICE_NAME, 'account', key],
      value.toString('hex')
    );
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const { stdout } = await this.runner.execFileAsync('secret-tool', [
        'lookup',
        'service',
        SERVICE_NAME,
        'account',
        key,
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
      await this.runner.execFileAsync('secret-tool', [
        'clear',
        'service',
        SERVICE_NAME,
        'account',
        key,
      ]);
    } catch (error) {
      if (this.isItemNotFound(error)) return;
      throw error;
    }
  }

  private isItemNotFound(error: unknown): boolean {
    const err = error as Error & { stderr?: string };
    const stderr = err.stderr ?? err.message ?? '';
    return (
      stderr.includes('No such secret item') ||
      stderr.includes('Object does not exist') ||
      stderr.includes('could not find')
    );
  }
}
