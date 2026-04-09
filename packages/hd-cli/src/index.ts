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

export { createSDK } from './sdk';
export type { SDKOptions } from './sdk';

export {
  resolveGetAddress,
  resolveGetPublicKey,
  resolveSignTransaction,
  resolveSignMessage,
  resolveBatchGetAddress,
} from './chains';

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
  signTransaction(chain: string, tx: Record<string, unknown>, path?: string): Promise<{ signature: string; [key: string]: unknown }>;
  /** Sign a message */
  signMessage(chain: string, message: string, path?: string): Promise<{ signature: string; [key: string]: unknown }>;
  /** Dispose SDK resources */
  dispose(): void;
}

export async function createHardwareSigner(opts?: {
  connectId?: string;
  deviceId?: string;
  useEmptyPassphrase?: boolean;
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
      });
      if (result && typeof result === 'object' && 'success' in result && !(result as any).success) {
        throw new Error((result as any).payload?.error || 'Failed to get address');
      }
      return { address: (result as any).payload?.address || (result as any).address, path: (result as any).path };
    },

    async signTransaction(chain: string, tx: Record<string, unknown>, path?: string) {
      const result = await resolveSignTransaction(sdk, {
        chain,
        path,
        transaction: tx,
        connectId: opts?.connectId,
        deviceId: opts?.deviceId,
      });
      if (result && typeof result === 'object' && 'success' in result && !(result as any).success) {
        throw new Error((result as any).payload?.error || 'Failed to sign transaction');
      }
      return result as any;
    },

    async signMessage(chain: string, message: string, path?: string) {
      const result = await resolveSignMessage(sdk, {
        chain,
        path,
        message,
        connectId: opts?.connectId,
        deviceId: opts?.deviceId,
      });
      if (result && typeof result === 'object' && 'success' in result && !(result as any).success) {
        throw new Error((result as any).payload?.error || 'Failed to sign message');
      }
      return result as any;
    },

    dispose() {
      sdk.dispose();
    },
  };
}
