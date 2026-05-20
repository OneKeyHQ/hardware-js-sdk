/**
 * Protocol V2 DeviceFirmwareTargetType enum (from messages-pro2.json).
 */
export const ProtocolV2FirmwareTargetType = {
  TARGET_INVALID: 0,
  TARGET_ROMLOADER: 1,
  TARGET_BOOTLOADER: 2,
  TARGET_FIRMWARE_P1: 3,
  TARGET_FIRMWARE_P2: 4,
  TARGET_COPROCESSOR: 5,
  TARGET_SE: 6,
  TARGET_RESOURCE: 10,
} as const;

/**
 * Map Protocol V2 firmware file name to DeviceFirmwareUpdate target_id.
 */
export function protocolV2FileNameToTargetId(fileName: string): number {
  const normalized = fileName.toLowerCase();
  if (normalized.includes('romloader')) return ProtocolV2FirmwareTargetType.TARGET_ROMLOADER;
  if (normalized.includes('bootloader')) return ProtocolV2FirmwareTargetType.TARGET_BOOTLOADER;
  if (normalized.includes('ble')) return ProtocolV2FirmwareTargetType.TARGET_COPROCESSOR;
  if (normalized.includes('se')) return ProtocolV2FirmwareTargetType.TARGET_SE;
  if (normalized.includes('p2')) return ProtocolV2FirmwareTargetType.TARGET_FIRMWARE_P2;
  return ProtocolV2FirmwareTargetType.TARGET_FIRMWARE_P1;
}
