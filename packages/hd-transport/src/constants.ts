// ---- Protocol V1 (Pro1 / Touch / Mini / Classic) ----

export const MESSAGE_TOP_CHAR = 0x003f;
export const MESSAGE_HEADER_BYTE = 0x23;
export const HEADER_SIZE = 1 + 1 + 4 + 2;
export const BUFFER_SIZE = 63;
/**
 * exclude ?##
 */
export const COMMON_HEADER_SIZE = 6;

// ---- Protocol V2 (Pro2) ----

/**
 * USB Product ID for Pro2 — used by WebUSB transport to detect Protocol V2 devices.
 *
 * TODO(pro2-pid): Pro2 currently shares 0x53c1 with Classic / Mini / Pro / Touch
 * firmware (see ONEKEY_WEBUSB_FILTER comments in packages/shared/src/constants.ts).
 * That means PID-only detection mis-identifies V1 devices as V2 when Pro2 firmware
 * leaves this PID. Production fix: assign a Pro2-specific PID and update this
 * constant. Until then this detection is only safe in environments where only
 * Pro2 devices connect.
 */
export const PROTOCOL_V2_USB_PID = 0x53c1;

/** Maximum size of a Protocol V2 frame including header + payload + CRC */
export const PROTOCOL_V2_FRAME_MAX_BYTES = 2200;

/** Safe data chunk for FileWrite payload (frame max minus FileWrite overhead, ~50B) */
export const PROTOCOL_V2_FILE_CHUNK_SIZE = 2048;

/**
 * Protocol V2 routing channel IDs.
 * The firmware multiplexes the V2 frame across transports.
 * USB endpoints talk directly to the main MCU (no proto-link routing needed),
 * while BLE goes through the BLE coprocessor's UART bridge and must specify CHANNEL=1.
 */
export const PROTOCOL_V2_CHANNEL_USB = 0;
export const PROTOCOL_V2_CHANNEL_BLE_UART = 1;
export const PROTOCOL_V2_CHANNEL_SOCKET = 2;

/** Protocol V2 packet_src for protobuf command/response traffic */
export const PROTOCOL_V2_PACKET_SRC_COMMAND = 1;
