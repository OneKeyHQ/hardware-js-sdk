/**
 * 当前 firmware-pro2 子模块的 DevFirmwareTargetType。
 *
 * 注意：仓库里的 hd-transport 生成物暂时仍带旧 target 名称；这里显式按
 * submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device.proto
 * 对齐当前子模块，避免运行时取到 undefined。
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

export type ProtocolV2FirmwareTargetType =
  (typeof ProtocolV2FirmwareTargetType)[keyof typeof ProtocolV2FirmwareTargetType];

/**
 * Map Protocol V2 firmware file name to DevFirmwareUpdate target_id.
 */
export function protocolV2FileNameToTargetId(fileName: string): ProtocolV2FirmwareTargetType {
  const normalized = fileName.toLowerCase();
  if (normalized.includes('bootloader') || normalized.includes('update_rom')) {
    return ProtocolV2FirmwareTargetType.TARGET_MAIN_BOOT;
  }
  if (
    normalized.includes('coprocessor') ||
    normalized.includes('ble') ||
    normalized.includes('bluetooth') ||
    normalized.includes('bt')
  ) {
    return ProtocolV2FirmwareTargetType.TARGET_BT;
  }
  if (normalized.includes('se4')) return ProtocolV2FirmwareTargetType.TARGET_SE4;
  if (normalized.includes('se3')) return ProtocolV2FirmwareTargetType.TARGET_SE3;
  if (normalized.includes('se2')) return ProtocolV2FirmwareTargetType.TARGET_SE2;
  if (normalized.includes('se')) return ProtocolV2FirmwareTargetType.TARGET_SE1;
  return ProtocolV2FirmwareTargetType.TARGET_MAIN_APP;
}
