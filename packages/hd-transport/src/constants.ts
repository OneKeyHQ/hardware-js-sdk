// ---- Protocol V1 (Pro1 / Touch / Mini / Classic) ----

/** Protocol V1 USB report marker, ASCII `?`. */
export const PROTOCOL_V1_REPORT_ID = 0x3f;

/** Protocol V1 envelope marker, ASCII `#`. */
export const PROTOCOL_V1_HEADER_BYTE = 0x23;

/** Protocol V1 payload bytes per chunk after the report marker. */
export const PROTOCOL_V1_CHUNK_PAYLOAD_SIZE = 63;

/** Protocol V1 USB packet length: report marker plus chunk payload. */
export const PROTOCOL_V1_USB_PACKET_SIZE = PROTOCOL_V1_CHUNK_PAYLOAD_SIZE + 1;

/** Protocol V1 message metadata: two-byte type plus four-byte payload length. */
export const PROTOCOL_V1_MESSAGE_HEADER_SIZE = 2 + 4;

/** Protocol V1 envelope metadata: `##`, message type, and payload length. */
export const PROTOCOL_V1_ENVELOPE_HEADER_SIZE = 1 + 1 + PROTOCOL_V1_MESSAGE_HEADER_SIZE;

// ---- Protocol V2 (Pro2 USB / BLE transports) ----

/** Firmware Proto Link runtime limit for a complete V2 frame, including header and CRC. */
export const PROTOCOL_V2_FRAME_MAX_BYTES = 4200;

/** FilesystemFileWrite chunk size over WebUSB. */
export const PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE = 4000;

/** Generic FilesystemFileWrite chunk size over BLE, including support for long filesystem paths. */
export const PROTOCOL_V2_BLE_FILE_CHUNK_SIZE = 1800;

/**
 * FirmwareUpdateV4 chunk size for its fixed BLE staging paths.
 * The longest current path still leaves 28 bytes below the 2048-byte BLE frame limit.
 */
export const PROTOCOL_V2_BLE_FIRMWARE_FILE_CHUNK_SIZE = 1960;

/** BLE FilesystemFileRead chunk size, limited by the Pro2 1024-byte UART TX buffer. */
export const PROTOCOL_V2_BLE_FILE_READ_CHUNK_SIZE = 900;

/** Pro2 BLE/UART RX FIFO must hold a complete Proto Link frame. */
export const PROTOCOL_V2_BLE_FRAME_MAX_BYTES = 2048;

/** @deprecated Use the transport-specific WebUSB or BLE file chunk constant. */
export const PROTOCOL_V2_FILE_CHUNK_SIZE = PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE;

/**
 * Protocol V2 routing channel. USB reaches the main MCU directly, while BLE routes
 * through the BLE coprocessor UART bridge.
 */
export const PROTOCOL_V2_CHANNEL_USB = 0;
export const PROTOCOL_V2_CHANNEL_BLE_UART = 1;
export const PROTOCOL_V2_CHANNEL_SOCKET = 2;

/** packet_src for protobuf commands; firmware routes zero to the protobuf dispatcher. */
export const PROTOCOL_V2_PACKET_SRC_COMMAND = 0;

/**
 * Shared upper bound for a Protocol V2 request without a method-specific timeout.
 * Interactive and signing calls may wait on the device UI, so keep this longer than
 * ordinary transport timeouts while still preventing a stalled link from blocking
 * the per-device queue forever.
 */
export const PROTOCOL_V2_DEFAULT_RESPONSE_TIMEOUT_MS = 5 * 60 * 1000;
