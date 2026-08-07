/**
 * Sub-export barrel for `@onekeyfe/hwk-adapter-core/types`.
 *
 * Pure type-only re-export. Every file referenced here has zero runtime
 * exports, so the emitted `dist/types.mjs` is empty (or near-empty) at
 * runtime — `import type { … } from '.../types'` resolves to declarations
 * only and gets erased by the TS compiler. Use this when you only need
 * shape information and want to avoid pulling any value-side code.
 *
 * Files with mixed type/runtime exports live elsewhere:
 *   - `errors.ts`      → '/errors'
 *   - `response.ts`    → '/utils' (Success/Failure/Response types live with the helpers)
 *   - `fingerprint.ts` → '/utils'
 *   - `connector.ts`   → main entry only (heavier runtime payload)
 */
export type * from '../types/chain-btc';
export type * from '../types/chain-evm';
export type * from '../types/chain-sol';
export type * from '../types/chain-tron';
export type * from '../types/device';
export type * from '../types/passphrase';
export type * from '../types/qr';
export type * from '../types/transport';
export type * from '../types/wallet';
