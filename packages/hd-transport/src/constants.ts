// ---- Protocol V1 (Pro1 / Touch / Mini / Classic) ----

/** Protocol V1 USB report 标记，ASCII '?'。 */
export const PROTOCOL_V1_REPORT_ID = 0x3f;

/** Protocol V1 envelope 头部标记，ASCII '#'。 */
export const PROTOCOL_V1_HEADER_BYTE = 0x23;

/** Protocol V1 单个 chunk 去掉 report 标记后的可用 payload 长度。 */
export const PROTOCOL_V1_CHUNK_PAYLOAD_SIZE = 63;

/** Protocol V1 USB packet 长度：report 标记 + chunk payload。 */
export const PROTOCOL_V1_USB_PACKET_SIZE = PROTOCOL_V1_CHUNK_PAYLOAD_SIZE + 1;

/** Protocol V1 message metadata：message type 2 字节 + payload length 4 字节。 */
export const PROTOCOL_V1_MESSAGE_HEADER_SIZE = 2 + 4;

/** Protocol V1 envelope metadata：## + message type + payload length。 */
export const PROTOCOL_V1_ENVELOPE_HEADER_SIZE = 1 + 1 + PROTOCOL_V1_MESSAGE_HEADER_SIZE;

// ---- Protocol V2 (Pro2 USB / BLE transports) ----

/** Protocol V2 单帧最大长度，包含 header、payload 和 CRC；需容纳 4000 数据块及 protobuf 开销。 */
export const PROTOCOL_V2_FRAME_MAX_BYTES = 4608;

/** WebUSB 下 FilesystemFileWrite 的文件数据分块大小。 */
export const PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE = 4000;

/** BLE 下 FilesystemFileWrite 的文件数据分块大小。 */
export const PROTOCOL_V2_BLE_FILE_CHUNK_SIZE = 1800;

/** @deprecated 使用按传输区分的 PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE / PROTOCOL_V2_BLE_FILE_CHUNK_SIZE。 */
export const PROTOCOL_V2_FILE_CHUNK_SIZE = PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE;

/**
 * Protocol V2 路由 channel。
 * USB 端点直接到主 MCU，不需要 proto-link 路由；BLE 需要经过 BLE 协处理器 UART bridge。
 */
export const PROTOCOL_V2_CHANNEL_USB = 0;
export const PROTOCOL_V2_CHANNEL_BLE_UART = 1;
export const PROTOCOL_V2_CHANNEL_SOCKET = 2;

/** protobuf 命令流的 packet_src，固件侧会把 0 路由到 protobuf dispatcher。 */
export const PROTOCOL_V2_PACKET_SRC_COMMAND = 0;
