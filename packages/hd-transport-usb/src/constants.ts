/** USB packet size in bytes */
export const PACKET_SIZE = 64;

/** Protocol marker byte (0x3F = '?') — first byte of every packet */
export const REPORT_ID = 0x3f;

/** Protocol header length: typeId (2 bytes) + length (4 bytes) */
export const HEADER_LENGTH = 6;
