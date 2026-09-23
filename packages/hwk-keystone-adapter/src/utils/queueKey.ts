/**
 * Single source of the device-queue key: enqueue, the all-network cancel scope and `cancel()`
 * must agree or a cancel misses its target. A pinned operation id wins.
 */
import { isHardwareOperationId } from '@onekeyfe/hwk-adapter-core';

import { KEYSTONE_WALLET_CONNECT_ID_PREFIX } from '../adapter/deviceTable';

/** Queue key for a cold start, which has neither a connectId nor a deviceId yet. */
export const KEYSTONE_COLD_START_JOB_LABEL = 'keystone-cold-start';

export function keystoneQueueKey(connectId?: string, deviceId?: string): string {
  return isHardwareOperationId(connectId)
    ? connectId
    : deviceId || connectId || KEYSTONE_COLD_START_JOB_LABEL;
}

/** A Keystone identifier is either a wallet connectId or the bare 64-hex wallet id. */
export function keystoneWalletIdFromIdentifier(identifier: string): string | undefined {
  const value = identifier.startsWith(KEYSTONE_WALLET_CONNECT_ID_PREFIX)
    ? identifier.slice(KEYSTONE_WALLET_CONNECT_ID_PREFIX.length)
    : identifier;
  return /^[0-9a-f]{64}$/i.test(value) ? value.toLowerCase() : undefined;
}

/**
 * Every queue key one identifier can stand for, so a cancel that knows only one of operation id,
 * connectId or wallet id fans out over all of them.
 */
export function keystoneCancelQueueKeys(identifiers: (string | undefined)[]): Set<string> {
  const keys = new Set<string>();
  for (const identifier of identifiers) {
    if (identifier) {
      keys.add(identifier);
      const walletId = keystoneWalletIdFromIdentifier(identifier);
      if (walletId) keys.add(walletId);
    }
  }
  return keys;
}
