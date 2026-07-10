/**
 * Sub-export barrel for `@onekeyfe/hwk-adapter-core/errors`.
 *
 * Re-exports the package's error surface (codes, classes, and message helpers)
 * as a standalone entry. Consumers like wallet apps that only need to catch
 * and label errors can import from here without dragging the rest of the
 * adapter core (events, connector glue, chain-specific types) into their
 * bundle. Same values as the main entry — backward compatible.
 */
export { HardwareErrorCode, ORPHAN_ELIGIBLE_ERROR_CODES, createHwkError } from '../types/errors';
export type { HwkError, IHwkErrorPayload } from '../types/errors';

export { enrichErrorMessage } from '../utils/errorMessages';
