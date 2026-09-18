/**
 * The one place a Keystone device-queue key is derived.
 *
 * Three call sites have to agree on it or a cancel misses its target: the job
 * `enqueue` in every business method, the bundle-wide cancel scope in
 * `allNetworkGetAddress`, and `cancel()`. An operation id wins when there is
 * one, because a call pinned to an operation is queued under it.
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
 * Every queue key one identifier can stand for. A call queues under its
 * operation id, its connectId or the wallet id behind either, so a cancel that
 * knows only one of them has to fan out over all of them.
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
