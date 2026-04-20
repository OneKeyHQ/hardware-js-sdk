import type { ConnectorEventType, ConnectorEventMap } from '@onekeyfe/hwk-adapter-core';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import type { SignerManager } from '../../signer/SignerManager';
import type { LedgerDeviceManager } from '../../device/LedgerDeviceManager';

/**
 * Context provided by LedgerConnectorBase to per-chain handlers.
 * Exposes only what chain methods need — no access to raw connector internals.
 */
export interface ConnectorContext {
  emit<K extends ConnectorEventType>(event: K, data: ConnectorEventMap[K]): void;
  invalidateSession(sessionId: string): void;
  wrapError(err: unknown): Error;
  getOrCreateDmk(): Promise<DeviceManagementKit>;
  getDeviceManager(): Promise<LedgerDeviceManager>;
  getSignerManager(): Promise<SignerManager>;
  clearAllSigners(): void;
  /**
   * Notify the connector that a session has been replaced (e.g. after app switch).
   * Updates internal session tracking so subsequent calls use the new session.
   */
  replaceSession(oldSessionId: string, newSessionId: string): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import returns any
  importLedgerKit: (pkg: string) => Promise<any>;
}
