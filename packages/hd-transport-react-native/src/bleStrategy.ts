import { ANDROID_DEFAULT_MTU, ANDROID_PACKET_LENGTH, IOS_PACKET_LENGTH } from './constants';

export type BlePlatform = 'ios' | 'android' | string;

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
