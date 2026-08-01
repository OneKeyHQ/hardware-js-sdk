/**
 * DeviceFirmwareTargetType from the current firmware-pro2 submodule.
 */
export const ProtocolV2FirmwareTargetType = {
  FW_MGMT_TARGET_INVALID: 0,
  FW_MGMT_TARGET_CRATE: 1,
  FW_MGMT_TARGET_ROMLOADER: 2,
  FW_MGMT_TARGET_BOOTLOADER: 3,
  FW_MGMT_TARGET_APPLICATION_P1: 4,
  FW_MGMT_TARGET_APPLICATION_P2: 5,
  FW_MGMT_TARGET_COPROCESSOR: 6,
  FW_MGMT_TARGET_SE01: 7,
  FW_MGMT_TARGET_SE02: 8,
  FW_MGMT_TARGET_SE03: 9,
  FW_MGMT_TARGET_SE04: 10,
} as const;

export type ProtocolV2FirmwareTargetType =
  (typeof ProtocolV2FirmwareTargetType)[keyof typeof ProtocolV2FirmwareTargetType];
