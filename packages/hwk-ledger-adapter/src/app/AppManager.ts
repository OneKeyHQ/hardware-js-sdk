import {
  CloseAppCommand,
  type DeviceManagementKit,
  GetAppAndVersionCommand,
  OpenAppCommand,
  isSuccessCommandResult,
} from '@ledgerhq/device-management-kit';

import { debugLog } from '../utils/debugLog';

/**
 * Map of chain ticker symbols to the Ledger app name
 * that must be open to sign transactions for that chain.
 */
export const APP_NAME_MAP: Record<string, string> = {
  ETH: 'Ethereum',
  BTC: 'Bitcoin',
  SOL: 'Solana',
  TRX: 'Tron',
  XRP: 'XRP',
  ADA: 'Cardano',
  DOT: 'Polkadot',
  ATOM: 'Cosmos',
};

/** The name reported by the Ledger when it sits on the home screen. */
const DASHBOARD_APP_NAME = 'BOLOS';

interface AppManagerOptions {
  waitMs?: number;
  maxRetries?: number;
}

/**
 * Orchestrates opening / closing Ledger on-device apps so that the
 * correct signer application is running before any signing call.
 */
export class AppManager {
  private readonly _dmk: DeviceManagementKit;

  private readonly _waitMs: number;

  private readonly _maxRetries: number;

  constructor(dmk: DeviceManagementKit, options?: AppManagerOptions) {
    this._dmk = dmk;
    this._waitMs = options?.waitMs ?? 1000;
    this._maxRetries = options?.maxRetries ?? 10;
  }

  /**
   * Return the Ledger app name for a given chain ticker,
   * or undefined if the chain is not supported.
   */
  static getAppName(chain: string): string | undefined {
    return APP_NAME_MAP[chain];
  }

  /**
   * Ensure the target app is open on the device identified by `sessionId`.
   *
   * Flow:
   * 1. Check the currently running app.
   * 2. If it is already the target, return immediately.
   * 3. If a different app is running (not dashboard), close it first.
   * 4. Open the target app.
   * 5. Poll until the device confirms the target app is running.
   */
  /**
   * @param onConfirmOnDevice Called BEFORE OpenAppCommand is issued — the
   *   device is about to display "Open <app>" on screen and wait for the
   *   user's button press. UI consumers should show their "open app" prompt
   *   in response. NOT called when the target app is already open (no user
   *   interaction needed in that case).
   *
   * Important: OpenAppCommand is blocking. It does not resolve until the user
   *   has physically confirmed on the device, so anything that runs AFTER
   *   `await this._openApp(...)` lands AFTER the prompt is already gone.
   *   Hence the callback must fire BEFORE that await.
   */
  async ensureAppOpen(
    sessionId: string,
    targetAppName: string,
    onConfirmOnDevice?: () => void
  ): Promise<void> {
    const currentApp = await this._getCurrentApp(sessionId);

    if (currentApp === targetAppName) {
      return;
    }

    // If we're not on the dashboard, close the current app first
    if (!this._isDashboard(currentApp)) {
      await this._closeCurrentApp(sessionId);
      // Wait for dashboard to become active
      await this._waitForApp(sessionId, DASHBOARD_APP_NAME);
    }

    // Notify UI BEFORE issuing the open-app APDU. OpenAppCommand blocks until
    // the user confirms on device, so by the time `_openApp` resolves the
    // prompt is already gone — the UI must be told ahead of the APDU.
    onConfirmOnDevice?.();

    // Open the target app — throws if not installed (0x6807).
    // Resolves only after the user has confirmed on the device screen.
    await this._openApp(sessionId, targetAppName);

    // Poll until the target app is confirmed open
    await this._waitForApp(sessionId, targetAppName);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async _getCurrentApp(sessionId: string): Promise<string> {
    const result = await this._dmk.sendCommand({
      sessionId,
      command: new GetAppAndVersionCommand(),
    });
    if (isSuccessCommandResult(result)) {
      debugLog('[AppManager] currentApp:', result.data.name);
      return result.data.name;
    }
    throw new Error('Failed to get current app from device');
  }

  private async _openApp(sessionId: string, appName: string): Promise<void> {
    const result = await this._dmk.sendCommand({
      sessionId,
      command: new OpenAppCommand({ appName }),
    });
    if (!isSuccessCommandResult(result)) {
      const { statusCode } = result as Record<string, unknown>;
      debugLog('[AppManager] openApp failed:', appName, 'statusCode:', statusCode);
      throw Object.assign(new Error(`Failed to open "${appName}"`), {
        _tag: 'OpenAppCommandError',
        errorCode: String(statusCode ?? ''),
        statusCode,
        appName,
      });
    }
  }

  private async _closeCurrentApp(sessionId: string): Promise<void> {
    debugLog('[AppManager] closeCurrentApp');
    await this._dmk.sendCommand({
      sessionId,
      command: new CloseAppCommand(),
    });
  }

  /**
   * Poll the device until the expected app is reported as running,
   * or throw after `_maxRetries` attempts.
   */
  private async _waitForApp(sessionId: string, expectedAppName: string): Promise<void> {
    let lastSeen = '';
    for (let i = 0; i < this._maxRetries; i++) {
      await this._wait();
      const current = await this._getCurrentApp(sessionId);
      lastSeen = current;
      if (current === expectedAppName) {
        return;
      }
    }
    debugLog(
      '[AppManager] waitForApp exhausted: expected=',
      expectedAppName,
      'lastSeen=',
      lastSeen
    );
    throw new Error(
      `Ledger: failed to open "${expectedAppName}" after ${this._maxRetries} retries (last seen: ${lastSeen})`
    );
  }

  private _isDashboard(appName: string): boolean {
    return appName === DASHBOARD_APP_NAME;
  }

  private _wait(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this._waitMs));
  }
}
