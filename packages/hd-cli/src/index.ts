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
 * For AI agent integration, use --json flag for structured output.
 */

export { createSDK } from './sdk';
export {
  resolveGetAddress,
  resolveGetPublicKey,
  resolveSignTransaction,
  resolveSignMessage,
  resolveBatchGetAddress,
} from './chains';

export type {
  GetAddressParams,
  GetPublicKeyParams,
  SignTransactionParams,
  SignMessageParams,
  BatchGetAddressParams,
} from './chains';
