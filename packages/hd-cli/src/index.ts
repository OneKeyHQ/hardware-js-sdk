/**
 * @onekeyfe/hardware-cli
 *
 * OneKey hardware wallet CLI for AI agent integration.
 * Provides device management, multi-chain signing, firmware updates,
 * and security management capabilities.
 *
 * Usage:
 *   npx @onekeyfe/hardware-cli search
 *   npx @onekeyfe/hardware-cli get-address --chain evm
 *   npx @onekeyfe/hardware-cli sign-transaction --chain evm --tx '{...}'
 *
 * All output is structured JSON for AI agent consumption.
 *
 * IMPORTANT: All signing operations require physical confirmation on the
 * hardware device. The CLI handles PIN/Passphrase prompts via stdin for
 * interactive use, or via SDK event system for programmatic use.
 */

import { createSDK } from './sdk';
import {
  resolveBatchGetAddress,
  resolveGetAddress,
  resolveGetPublicKey,
  resolveSignMessage,
  resolveSignTransaction,
} from './chains';

import type { Unsuccessful } from '@onekeyfe/hd-core';

export { createSDK };
export type { SDKOptions } from './sdk';

export {
  resolveGetAddress,
  resolveGetPublicKey,
  resolveSignTransaction,
  resolveSignMessage,
  resolveBatchGetAddress,
};

export type {
  CommonCLIParams,
  GetAddressParams,
  GetPublicKeyParams,
  SignTransactionParams,
  SignMessageParams,
  BatchGetAddressParams,
} from './chains';

/**
 * Hardware signer interface — bridge for app-monorepo CLI integration.
 * Allows `onekey transfer --signer hardware` to use hardware wallet signing.
 */
export interface HardwareSigner {
  /** Get address for a given chain */
  getAddress(chain: string, path?: string): Promise<{ address: string; path: string }>;
  /** Sign a transaction (requires physical device confirmation) */
  signTransaction(
    chain: string,
    tx: Record<string, unknown>,
    path?: string
  ): Promise<{ signature: string; [key: string]: unknown }>;
  /** Sign a message */
  signMessage(
    chain: string,
    message: string,
    path?: string
  ): Promise<{ signature: string; [key: string]: unknown }>;
  /** Dispose SDK resources */
  dispose(): void;
}

export { getMode, detectAndSetMode, emitEvent, outputResult } from './output';
export type { OutputMode, EventType } from './output';

/** Type guard: check if an SDK result is unsuccessful */
function isUnsuccessful(result: unknown): result is Unsuccessful {
  return (
    result != null &&
    typeof result === 'object' &&
    'success' in result &&
    (result as Unsuccessful).success === false
  );
}

/** Extract error message from an Unsuccessful result */
function getErrorMessage(result: Unsuccessful, fallback: string): string {
  return result.payload?.error || fallback;
}

/**
 * Create a HardwareSigner instance for programmatic integration.
 *
 * IMPORTANT: Always call `dispose()` in a `finally` block to release
 * USB transport connections and event listeners.
 */
export async function createHardwareSigner(opts?: {
  connectId?: string;
  deviceId?: string;
  useEmptyPassphrase?: boolean;
  passphraseState?: string;
}): Promise<HardwareSigner> {
  const sdk = await createSDK(opts || {});

  return {
    async getAddress(chain: string, path?: string) {
      const result = await resolveGetAddress(sdk, {
        chain,
        path,
        showOnDevice: false,
        connectId: opts?.connectId,
        deviceId: opts?.deviceId,
        useEmptyPassphrase: opts?.useEmptyPassphrase,
        passphraseState: opts?.passphraseState,
      });
      if (isUnsuccessful(result)) {
        throw new Error(getErrorMessage(result, 'Failed to get address'));
      }
      // resolveGetAddress returns SDK result spread with { chain, path }.
      // The SDK Success<T>.payload contains the address; resolve spreads it at top level.
      const r = result as Record<string, unknown>;
      const payload = r.payload as Record<string, string> | undefined;
      return {
        address: (payload?.address ?? r.address) as string,
        path: (r.path ?? payload?.path) as string,
      };
    },

    async signTransaction(chain: string, tx: Record<string, unknown>, path?: string) {
      const result = await resolveSignTransaction(sdk, {
        chain,
        path,
        transaction: tx,
        connectId: opts?.connectId,
        deviceId: opts?.deviceId,
        useEmptyPassphrase: opts?.useEmptyPassphrase,
        passphraseState: opts?.passphraseState,
      });
      if (isUnsuccessful(result)) {
        throw new Error(getErrorMessage(result, 'Failed to sign transaction'));
      }
      // resolveSignTransaction returns SDK result (with .payload) spread with { chain, path }
      const r = result as Record<string, unknown>;
      const payload = (r.payload ?? r) as Record<string, unknown>;
      return { signature: '', ...payload } as { signature: string; [key: string]: unknown };
    },

    async signMessage(chain: string, message: string, path?: string) {
      const result = await resolveSignMessage(sdk, {
        chain,
        path,
        message,
        connectId: opts?.connectId,
        deviceId: opts?.deviceId,
        useEmptyPassphrase: opts?.useEmptyPassphrase,
        passphraseState: opts?.passphraseState,
      });
      if (isUnsuccessful(result)) {
        throw new Error(getErrorMessage(result, 'Failed to sign message'));
      }
      // resolveSignMessage returns SDK result (with .payload) spread with { chain, path }
      const r = result as Record<string, unknown>;
      const payload = (r.payload ?? r) as Record<string, unknown>;
      return { signature: '', ...payload } as { signature: string; [key: string]: unknown };
    },

    dispose() {
      sdk.dispose();
    },
  };
}
