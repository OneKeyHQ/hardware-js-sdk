import { EDeviceType } from '@onekeyfe/hd-shared';

import type { FirmwareUpdateV4Params } from '@onekeyfe/hd-core';

export type ProtocolV2BinaryField = Exclude<
  {
    [K in keyof FirmwareUpdateV4Params]: FirmwareUpdateV4Params[K] extends ArrayBuffer | undefined
      ? K
      : never;
  }[keyof FirmwareUpdateV4Params],
  undefined
>;

export type ProtocolV2FirmwareTarget = {
  param: ProtocolV2BinaryField;
  label: string;
};

const PROTOCOL_V2_FIRMWARE_TARGETS: readonly ProtocolV2FirmwareTarget[] = [
  { param: 'bootloaderBinary', label: 'Bootloader' },
  { param: 'applicationP1Binary', label: 'APP P1' },
  { param: 'applicationP2Binary', label: 'APP P2' },
  { param: 'coprocessorBinary', label: 'Coprocessor' },
  { param: 'se01Binary', label: 'SE01' },
  { param: 'se02Binary', label: 'SE02' },
  { param: 'se03Binary', label: 'SE03' },
  { param: 'se04Binary', label: 'SE04' },
];

export function getProtocolV2FirmwareTargets(deviceType: string) {
  if (deviceType === EDeviceType.Pro2) return PROTOCOL_V2_FIRMWARE_TARGETS;
  return PROTOCOL_V2_FIRMWARE_TARGETS.filter(
    target => target.param !== 'se03Binary' && target.param !== 'se04Binary'
  );
}
