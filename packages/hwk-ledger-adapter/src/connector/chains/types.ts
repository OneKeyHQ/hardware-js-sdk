import type { ConnectorEventMap, ConnectorEventType } from '@onekeyfe/hwk-adapter-core';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import type { SignerManager } from '../../signer/SignerManager';
import type { LedgerDeviceManager } from '../../device/LedgerDeviceManager';
import type { WrapErrorOptions } from '../../errors';
import type { CancelReason } from '../../signer/deviceActionToPromise';

/**
 * Context provided by LedgerConnectorBase to per-chain handlers.
 * Exposes only what chain methods need — no access to raw connector internals.
 */
export interface ConnectorContext {
  emit<K extends ConnectorEventType>(event: K, data: ConnectorEventMap[K]): void;
  invalidateSession(sessionId: string): void;
  wrapError(err: unknown, opts?: WrapErrorOptions): Error;
  getOrCreateDmk(): Promise<DeviceManagementKit>;
  getDeviceManager(): Promise<LedgerDeviceManager>;
  getSignerManager(): Promise<SignerManager>;
  clearAllSigners(): void;
  /**
   * Notify the connector that a session has been replaced (e.g. after app switch).
   * Updates internal session tracking so subsequent calls use the new session.
   */
  replaceSession(oldSessionId: string, newSessionId: string): void;

  /**
   * Register a canceller function for the currently-in-flight DeviceAction on
   * this session. The connector stores the latest canceller; a subsequent
   * `IConnector.cancel(sessionId)` call invokes it to unsubscribe + release
   * DMK's intent queue slot. Chain handlers should register immediately after
   * creating a DeviceAction and clear in a `finally` block.
   */
  registerCanceller(sessionId: string, cancel: (reason?: CancelReason) => void): void;

  /** Clear any canceller previously registered for this session. */
  clearCanceller(sessionId: string): void;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import returns any
  importLedgerKit: (pkg: string) => Promise<any>;
}
