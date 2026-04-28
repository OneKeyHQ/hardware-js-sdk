/**
 * Protocol V2 DevFirmwareTargetType enum (from messages-pro2.json).
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
  if (fileName.includes('ble')) return ProtocolV2FirmwareTargetType.TARGET_BT;
  if (fileName.includes('bootloader')) return ProtocolV2FirmwareTargetType.TARGET_MAIN_BOOT;
  if (fileName.includes('se1')) return ProtocolV2FirmwareTargetType.TARGET_SE1;
  if (fileName.includes('se2')) return ProtocolV2FirmwareTargetType.TARGET_SE2;
  if (fileName.includes('se3')) return ProtocolV2FirmwareTargetType.TARGET_SE3;
  if (fileName.includes('se4')) return ProtocolV2FirmwareTargetType.TARGET_SE4;
  return ProtocolV2FirmwareTargetType.TARGET_MAIN_APP;
}
