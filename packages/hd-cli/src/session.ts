/**
 * Passphrase session management for hd-cli.
 *
 * Existing keychain entries remain readable for compatibility, but the public
 * SDK no longer exposes new device session ids for persistence.
 */

import { preloadSessionCache } from '@onekeyfe/hd-core';

import { createSecureStorage } from './storage';

import type { ISecureStorage } from './storage';

// Keychain key format: scoped by deviceId for multi-device support
function psKey(deviceId: string): string {
  return `onekey-hw:${deviceId}/passphrase-state`;
}
function sidKey(deviceId: string): string {
  return `onekey-hw:${deviceId}/session-id`;
}

let storageInstance: ISecureStorage | null = null;

function getStorage(): ISecureStorage {
  if (!storageInstance) {
    storageInstance = createSecureStorage();
  }
  return storageInstance;
}

/**
 * Load passphraseState + sessionId from keychain and call preloadSessionCache.
 * Non-fatal: returns the loaded passphraseState or undefined.
 */
export async function preloadSessionFromKeychain(deviceId: string): Promise<string | undefined> {
  try {
    const storage = getStorage();
    const [psBuf, sidBuf] = await Promise.all([
      storage.get(psKey(deviceId)),
      storage.get(sidKey(deviceId)),
    ]);
    if (psBuf && sidBuf) {
      const passphraseState = psBuf.toString('utf-8');
      const sessionId = sidBuf.toString('utf-8');

      preloadSessionCache(deviceId, passphraseState, sessionId);
      return passphraseState;
    }
  } catch {
    // Non-fatal — fall through to passphrase prompt
  }
  return undefined;
}

/**
 * Clear cached session from keychain.
 */
export async function clearSessionFromKeychain(deviceId?: string): Promise<void> {
  try {
    const storage = getStorage();
    if (deviceId) {
      await Promise.allSettled([storage.delete(psKey(deviceId)), storage.delete(sidKey(deviceId))]);
    }
  } catch {
    // Non-fatal
  }
}
