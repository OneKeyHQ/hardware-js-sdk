// ---- Protocol V1 (Pro1 / Touch / Mini / Classic) ----

export const MESSAGE_TOP_CHAR = 0x003f;
export const MESSAGE_HEADER_BYTE = 0x23;
export const HEADER_SIZE = 1 + 1 + 4 + 2;
export const BUFFER_SIZE = 63;
/**
 * exclude ?##
 */
export const COMMON_HEADER_SIZE = 6;

// ---- Protocol V2 (Pro2 USB / BLE transports) ----

/** Maximum size of a Protocol V2 frame including header + payload + CRC */
export const PROTOCOL_V2_FRAME_MAX_BYTES = 2200;

/** Safe data chunk for FilesystemFileWrite payload (frame max minus message overhead, ~50B) */
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
