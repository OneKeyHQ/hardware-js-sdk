import { MessageFactoryFn } from './utils';
import { getBleFirmwareReleaseInfo, getFirmwareReleaseInfo } from '../api/firmware/releaseHelper';
import type { KnownDevice as Device } from '../types/device';

export const FIRMWARE_EVENT = 'FIRMWARE_EVENT';
export const FIRMWARE = {
  RELEASE_INFO: 'firmware-release-info',
  BLE_RELEASE_INFO: 'ble-firmware-release-info',
} as const;

export type ReleaseInfoPayload = ReturnType<typeof getFirmwareReleaseInfo> & {
  device?: Device | null;
};
export interface ReleaseInfoEvent {
  type: typeof FIRMWARE.RELEASE_INFO;
  payload: ReleaseInfoPayload;
}

export type BleReleaseInfoPayload = ReturnType<typeof getBleFirmwareReleaseInfo> & {
  device?: Device | null;
};

export interface BleReleaseInfoEvent {
  type: typeof FIRMWARE.BLE_RELEASE_INFO;
  payload: BleReleaseInfoPayload;
}

export type FirmwareEvent = ReleaseInfoEvent | BleReleaseInfoEvent;

export type FirmwareMessage = FirmwareEvent & { event: typeof FIRMWARE_EVENT };

export const createFirmwareMessage: MessageFactoryFn<typeof FIRMWARE_EVENT, FirmwareEvent> = (
  type,
  payload
) =>
  ({
    event: FIRMWARE_EVENT,
    type,
    payload,
  } as any);
