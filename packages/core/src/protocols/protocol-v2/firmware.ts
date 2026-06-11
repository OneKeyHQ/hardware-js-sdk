import { DeviceFirmwareTargetType } from '@onekeyfe/hd-transport';

/**
 * 兼容别名：复用 hd-transport 生成的 DeviceFirmwareTargetType
 * （来源 firmware-pro2 messages_device.proto 的 FwMgmtTarget_t），
 * 不再维护手写副本。
 */
export const ProtocolV2FirmwareTargetType = DeviceFirmwareTargetType;

/**
 * Map Protocol V2 firmware file name to DevFirmwareUpdate target_id.
 */
export function protocolV2FileNameToTargetId(fileName: string): DeviceFirmwareTargetType {
  const normalized = fileName.toLowerCase();
  if (normalized.includes('romloader')) {
    return DeviceFirmwareTargetType.TARGET_ROMLOADER;
  }
  if (normalized.includes('bootloader') || normalized.includes('update_rom')) {
    return DeviceFirmwareTargetType.TARGET_BOOTLOADER;
  }
  if (
    normalized.includes('coprocessor') ||
    normalized.includes('ble') ||
    normalized.includes('bluetooth') ||
    normalized.includes('bt')
  ) {
    return DeviceFirmwareTargetType.TARGET_COPROCESSOR;
  }
  if (normalized.includes('se4')) return DeviceFirmwareTargetType.TARGET_SE04;
  if (normalized.includes('se3')) return DeviceFirmwareTargetType.TARGET_SE03;
  if (normalized.includes('se2')) return DeviceFirmwareTargetType.TARGET_SE02;
  if (normalized.includes('se')) return DeviceFirmwareTargetType.TARGET_SE01;
  if (normalized.includes('p2')) return DeviceFirmwareTargetType.TARGET_APPLICATION_P2;
  return DeviceFirmwareTargetType.TARGET_APPLICATION_P1;
}
