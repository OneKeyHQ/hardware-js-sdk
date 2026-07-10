/**
 * Sub-export barrel for `@onekeyfe/hwk-trezor-adapter/utils`.
 *
 * Lightweight Trezor-side helpers — model/name normalization, BLE descriptor
 * predicates, connect-id resolution. Wallet UIs that filter or label devices
 * before opening a session import these without dragging in the full
 * `TrezorAdapter` graph (protobuf bindings, transport plumbing, protocol
 * codecs) which the adapter ships in the main entry.
 *
 * Only BLE-flavored Trezor identity logic lives here — USB-specific
 * filters / VID-PID stay in `@onekeyfe/hwk-trezor-connector-webusb`
 * because that's their natural home. The adapter package stays
 * transport-agnostic by not re-exporting them.
 */
export {
  isTrezorBleServiceUuid,
  isTrezorBleSupportedModel,
  isTrezorBleDescriptor,
  isTrezorSafe7BleDescriptor,
  isTrezorSafe7BleName,
  normalizeTrezorBleUuid,
  resolveTrezorBleConnectId,
} from '../utils/bleIdentity';
