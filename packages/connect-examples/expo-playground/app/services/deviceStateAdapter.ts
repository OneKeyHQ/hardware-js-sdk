import type { DeviceState } from '@onekeyfe/hd-core';

import type { DeviceInfo } from '../types/hardware';

const nonEmpty = (value: string | null | undefined) => value || undefined;

export function applyDeviceStateToDevice(device: DeviceInfo, state: DeviceState): DeviceInfo {
  const { identity } = state;
  const serialNo = nonEmpty(identity.serialNo);
  const deviceId = nonEmpty(identity.deviceId);
  const label = nonEmpty(identity.label);
  const bleName = nonEmpty(identity.bleName);

  return {
    ...device,
    ...(serialNo ? { uuid: serialNo } : {}),
    ...(deviceId ? { deviceId } : {}),
    ...(identity.deviceType ? { deviceType: identity.deviceType } : {}),
    ...(label ? { label } : {}),
    name: bleName || label || device.name,
    deviceState: state,
    protocol: state.protocol,
    protocolVersion: state.protocolVersion,
  };
}
