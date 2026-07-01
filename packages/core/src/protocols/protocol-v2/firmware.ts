/**
 * 当前 firmware-pro2 子模块的 DeviceFirmwareTargetType。
 */
export const ProtocolV2FirmwareTargetType = {
  FW_MGMT_TARGET_ROMLOADER: 1,
  FW_MGMT_TARGET_BOOTLOADER: 2,
  FW_MGMT_TARGET_APPLICATION_P1: 3,
  FW_MGMT_TARGET_APPLICATION_P2: 4,
  FW_MGMT_TARGET_COPROCESSOR: 5,
  FW_MGMT_TARGET_SE01: 6,
  FW_MGMT_TARGET_SE02: 7,
  FW_MGMT_TARGET_SE03: 8,
  FW_MGMT_TARGET_SE04: 9,
  FW_MGMT_TARGET_RESOURCE: 10,
} as const;

export type ProtocolV2FirmwareTargetType =
  (typeof ProtocolV2FirmwareTargetType)[keyof typeof ProtocolV2FirmwareTargetType];
