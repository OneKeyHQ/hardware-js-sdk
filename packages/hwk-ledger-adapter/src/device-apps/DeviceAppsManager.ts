import { DeviceApps } from './DeviceApps';

import type { LedgerKitModule } from './DeviceApps';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';

/** Per-call factory for DeviceApps. Mirrors SignerManager — builds fresh each
 *  call because DMK device actions hold per-action state. */
export class DeviceAppsManager {
  private readonly _dmk: DeviceManagementKit;

  private readonly _importLedgerKit: (pkg: string) => Promise<unknown>;

  constructor(
    dmk: DeviceManagementKit,
    importLedgerKit: (pkg: string) => Promise<unknown>,
  ) {
    this._dmk = dmk;
    this._importLedgerKit = importLedgerKit;
  }

  async getOrCreate(sessionId: string): Promise<DeviceApps> {
    const ledgerKit = (await this._importLedgerKit(
      '@ledgerhq/device-management-kit',
    )) as LedgerKitModule;
    return new DeviceApps(this._dmk, sessionId, ledgerKit);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  invalidate(_sessionId: string): void {}

  // eslint-disable-next-line class-methods-use-this
  clearAll(): void {}
}
