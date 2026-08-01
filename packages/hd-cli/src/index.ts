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
