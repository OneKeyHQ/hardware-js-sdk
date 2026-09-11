export const DEVICE_EVENT = 'DEVICE_EVENT';

/** Events originating from the hardware device. */
export const DEVICE = {
  CONNECT: 'device-connect',
  DISCONNECT: 'device-disconnect',
  CHANGED: 'device-changed',
  FEATURES: 'features',
  /**
   * Trezor-only. Emitted after a successful THP handshake that minted or
   * refreshed pairing credentials. The host should persist `credentials`
   * keyed by `deviceId` and feed them back into the connector on the next
   * connect to skip the CodeEntry/QrCode/NFC pairing UX.
   *
   * The `TREZOR_` prefix mirrors `UI_REQUEST.REQUEST_TREZOR_THP_PAIRING` —
   * vendor-specific events live in the shared event taxonomy but are named
   * so hosts can ignore them when they don't drive Trezor hardware.
   */
  TREZOR_THP_CREDENTIALS_CHANGED: 'device-trezor-thp-credentials-changed',
} as const;
