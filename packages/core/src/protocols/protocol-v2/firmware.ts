/**
 * Protocol V2 DevFirmwareTargetType enum (from firmware-pro2 messages_device.proto).
 */
export const ProtocolV2FirmwareTargetType = {
  TARGET_MAIN_APP: 0,
  TARGET_MAIN_BOOT: 1,
  TARGET_BT: 2,
  TARGET_SE1: 3,
  TARGET_SE2: 4,
  TARGET_SE3: 5,
  TARGET_SE4: 6,
  TARGET_RESOURCE: 10,
} as const;

/**
 * Map Protocol V2 firmware file name to DevFirmwareUpdate target_id.
 */
export function protocolV2FileNameToTargetId(fileName: string): number {
  const normalized = fileName.toLowerCase();
  if (normalized.includes('bootloader') || normalized.includes('romloader')) {
    return ProtocolV2FirmwareTargetType.TARGET_MAIN_BOOT;
  }
  if (normalized.includes('ble') || normalized.includes('bt')) {
    return ProtocolV2FirmwareTargetType.TARGET_BT;
  }
  if (normalized.includes('se4')) return ProtocolV2FirmwareTargetType.TARGET_SE4;
  if (normalized.includes('se3')) return ProtocolV2FirmwareTargetType.TARGET_SE3;
  if (normalized.includes('se2')) return ProtocolV2FirmwareTargetType.TARGET_SE2;
  if (normalized.includes('se')) return ProtocolV2FirmwareTargetType.TARGET_SE1;
  return ProtocolV2FirmwareTargetType.TARGET_MAIN_APP;
}
