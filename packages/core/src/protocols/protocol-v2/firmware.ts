/**
 * Protocol V2 DevFirmwareTargetType enum (from firmware-pro2 messages_device.proto).
 *
 * declaration order matches firmware FwMgmtTarget_t.
 */
export const ProtocolV2FirmwareTargetType = {
  TARGET_INVALID: 0,
  TARGET_ROMLOADER: 1,
  TARGET_BOOTLOADER: 2,
  TARGET_APPLICATION_P1: 3,
  TARGET_APPLICATION_P2: 4,
  TARGET_COPROCESSOR: 5,
  TARGET_SE01: 6,
  TARGET_SE02: 7,
  TARGET_SE03: 8,
  TARGET_SE04: 9,
  TARGET_RESOURCE: 10,
} as const;

/**
 * Map Protocol V2 firmware file name to DevFirmwareUpdate target_id.
 */
export function protocolV2FileNameToTargetId(fileName: string): number {
  const normalized = fileName.toLowerCase();
  if (normalized.includes('romloader')) {
    return ProtocolV2FirmwareTargetType.TARGET_ROMLOADER;
  }
  if (normalized.includes('bootloader') || normalized.includes('update_rom')) {
    return ProtocolV2FirmwareTargetType.TARGET_BOOTLOADER;
  }
  if (
    normalized.includes('coprocessor') ||
    normalized.includes('ble') ||
    normalized.includes('bluetooth') ||
    normalized.includes('bt')
  ) {
    return ProtocolV2FirmwareTargetType.TARGET_COPROCESSOR;
  }
  if (normalized.includes('se4')) return ProtocolV2FirmwareTargetType.TARGET_SE04;
  if (normalized.includes('se3')) return ProtocolV2FirmwareTargetType.TARGET_SE03;
  if (normalized.includes('se2')) return ProtocolV2FirmwareTargetType.TARGET_SE02;
  if (normalized.includes('se')) return ProtocolV2FirmwareTargetType.TARGET_SE01;
  if (normalized.includes('p2')) return ProtocolV2FirmwareTargetType.TARGET_APPLICATION_P2;
  return ProtocolV2FirmwareTargetType.TARGET_APPLICATION_P1;
}
