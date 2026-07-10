/**
 * Sub-export barrel for `@onekeyfe/hwk-adapter-core/ui-events`.
 *
 * UI_REQUEST / UI_RESPONSE come as a pair — every REQUEST_* the adapter
 * raises has a matching RECEIVE_* the UI sends back. They are intentionally
 * kept under the same sub-export so wallet code that handles the UI loop
 * never has to import from two different paths.
 *
 * UiRequestRegistry and its tag constants belong here too: the registry is
 * the runtime correlation table for outstanding UI requests, not a generic
 * utility. Splitting it into '/utils' would scatter the UI control flow.
 *
 * Vendor-agnostic UI signaling layer — nothing here references Trezor,
 * Ledger, USB, BLE, etc.
 */
export { UI_EVENT, UI_REQUEST, UI_RESPONSE } from '../events/ui-request';
export type {
  DevicePermissionDeniedReason,
  DevicePermissionResponse,
  UiResponseEvent,
} from '../events/ui-request';

export {
  UiRequestRegistry,
  UI_REQUEST_DEFAULT_TIMEOUT_MS,
  UI_REQUEST_PREEMPTED_TAG,
  UI_REQUEST_CANCELLED_TAG,
  UI_REQUEST_TIMEOUT_TAG,
} from '../utils/UiRequestRegistry';
