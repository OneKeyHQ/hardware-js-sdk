import { ANDROID_DEFAULT_MTU, ANDROID_PACKET_LENGTH, IOS_PACKET_LENGTH } from './constants';

export type BlePlatform = 'ios' | 'android' | string;

export type BleWriteCapability = {
  isWritableWithResponse?: boolean | null;
  isWritableWithoutResponse?: boolean | null;
};

export function hasWritableCapability(characteristic: BleWriteCapability) {
  return !!(characteristic.isWritableWithResponse || characteristic.isWritableWithoutResponse);
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
