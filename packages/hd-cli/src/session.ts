/**
 * Passphrase session management for hd-cli.
 *
 * Aligns with app-monorepo's CLI pattern:
 *   Login:   getPassphraseState → passphraseState + sessionId → keychain
 *   Command: keychain → preloadSessionCache → SDK call (no passphrase prompt)
 *   Stale:   error 112 → clear keychain → re-prompt → retry
 *   Logout:  keychain delete
 */

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

      const hdCore = await import('@onekeyfe/hd-core');
      (hdCore as any).preloadSessionCache(deviceId, passphraseState, sessionId);
      return passphraseState;
    }
  } catch {
    // Non-fatal — fall through to passphrase prompt
  }
  return undefined;
}

/**
 * Save passphraseState + sessionId to keychain for next CLI invocation.
 */
export async function saveSessionToKeychain(
  deviceId: string,
  passphraseState: string,
  sessionId: string
): Promise<void> {
  try {
    const storage = getStorage();
    await Promise.all([
      storage.set(psKey(deviceId), Buffer.from(passphraseState, 'utf-8')),
      storage.set(sidKey(deviceId), Buffer.from(sessionId, 'utf-8')),
    ]);
  } catch {
    // Non-fatal — session still works in-memory for this invocation
  }
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
