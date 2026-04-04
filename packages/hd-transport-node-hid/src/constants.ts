/** OneKey USB Vendor ID */
export const VENDOR_ID = 0x1209;

/** OneKey USB Product IDs */
export const PRODUCT_IDS = [
  0x53c0, // Classic Boot, Classic1s Boot, Mini Boot
  0x53c1, // Classic Firmware, Classic1s Firmware, Mini Firmware, Pro Firmware, Touch Firmware
  0x4f4a, // Pro Boot, Touch Boot
  0x4f4b, // Pro Firmware, Touch Firmware (Not implemented Trezor)
];

/** HID packet size in bytes */
export const PACKET_SIZE = 64;

/** HID report ID marker byte (0x3F = '?') */
export const REPORT_ID = 0x3f;

/** Protocol header length: typeId (2 bytes) + length (4 bytes) */
export const HEADER_LENGTH = 6;
