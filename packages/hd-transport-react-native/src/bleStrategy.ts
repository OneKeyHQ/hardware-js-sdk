import { ANDROID_DEFAULT_MTU, ANDROID_PACKET_LENGTH, IOS_PACKET_LENGTH } from './constants';

export type BlePlatform = 'ios' | 'android' | string;
const PROTOCOL_V1_BLE_PACKET_LENGTH = 64;
const ANDROID_GATT_CONGESTED_STATUS = 143;

export type BleWriteCapability = {
  isWritableWithResponse?: boolean | null;
  isWritableWithoutResponse?: boolean | null;
};

export type BleWriteMode = 'withResponse' | 'withoutResponse';

export function hasWritableCapability(characteristic: BleWriteCapability) {
  return !!(characteristic.isWritableWithResponse || characteristic.isWritableWithoutResponse);
}

export function resolveBleWriteMode(
  characteristic: BleWriteCapability,
  preferredMode: BleWriteMode = 'withoutResponse'
): BleWriteMode {
  if (preferredMode === 'withoutResponse' && characteristic.isWritableWithoutResponse) {
    return 'withoutResponse';
  }

  if (preferredMode === 'withResponse' && characteristic.isWritableWithResponse) {
    return 'withResponse';
  }

  if (characteristic.isWritableWithoutResponse) {
    return 'withoutResponse';
  }

  if (characteristic.isWritableWithResponse) {
    return 'withResponse';
  }

  return preferredMode;
}

export function resolveProtocolV2PacketCapacity({
  platform,
  iosPacketLength = IOS_PACKET_LENGTH,
  androidPacketLength = ANDROID_PACKET_LENGTH,
  mtu,
}: {
  platform: BlePlatform;
  iosPacketLength?: number;
  androidPacketLength?: number;
  mtu?: number | null;
}) {
  if (platform === 'ios') {
    return iosPacketLength;
  }

  if (platform === 'android') {
    const payloadLength = Math.max((mtu ?? ANDROID_DEFAULT_MTU) - 3, 1);
    return Math.min(androidPacketLength, payloadLength);
  }

  return androidPacketLength;
}

export function resolveProtocolV1HighVolumePacketCapacity({
  platform,
  iosPacketLength = IOS_PACKET_LENGTH,
  androidPacketLength = ANDROID_PACKET_LENGTH,
  mtu,
  protocolPacketLength = PROTOCOL_V1_BLE_PACKET_LENGTH,
}: {
  platform: BlePlatform;
  iosPacketLength?: number;
  androidPacketLength?: number;
  mtu?: number | null;
  protocolPacketLength?: number;
}) {
  if (platform === 'ios') {
    return iosPacketLength;
  }

  if (platform !== 'android' || !mtu || mtu <= ANDROID_DEFAULT_MTU) {
    return androidPacketLength;
  }

  const attPayloadLength = Math.max(mtu - 3, protocolPacketLength);
  const cappedLength = Math.min(androidPacketLength, attPayloadLength);
  return Math.max(
    protocolPacketLength,
    Math.floor(cappedLength / protocolPacketLength) * protocolPacketLength
  );
}

function getErrorText(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const maybeError = error as {
    reason?: unknown;
    message?: unknown;
    name?: unknown;
  };
  return [maybeError.reason, maybeError.message, maybeError.name]
    .filter(value => typeof value === 'string')
    .join(' ');
}

export function isGattCongestedError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as {
    androidErrorCode?: unknown;
    status?: unknown;
  };

  if (
    maybeError.androidErrorCode === ANDROID_GATT_CONGESTED_STATUS ||
    maybeError.status === ANDROID_GATT_CONGESTED_STATUS
  ) {
    return true;
  }

  const text = getErrorText(error);
  return text.includes('GATT_CONGESTED') || text.includes('status 143');
}

export function shouldRetryFirmwareUploadWrite(
  error: unknown,
  attempt: number,
  maxRetries: number
) {
  return attempt < maxRetries && isGattCongestedError(error);
}

export function resolveFirmwareUploadRetryDelay(
  attempt: number,
  baseDelayMs = 200,
  maxDelayMs = 1200
) {
  return Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
}
