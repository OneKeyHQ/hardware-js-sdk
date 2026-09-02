import { ANDROID_PROTOCOL_V2_PACKET_LENGTH, IOS_PROTOCOL_V2_PACKET_LENGTH } from './constants';

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
  iosPacketLength = IOS_PROTOCOL_V2_PACKET_LENGTH,
  androidPacketLength = ANDROID_PROTOCOL_V2_PACKET_LENGTH,
  mtu,
}: {
  platform: BlePlatform;
  iosPacketLength?: number;
  androidPacketLength?: number;
  mtu?: number | null;
}) {
  const negotiatedMtu =
    typeof mtu === 'number' && Number.isFinite(mtu) && mtu > 3 ? Math.floor(mtu) : 23;
  const payloadLength = negotiatedMtu - 3;
  const configuredPacketLength = platform === 'ios' ? iosPacketLength : androidPacketLength;
  return Math.min(configuredPacketLength, payloadLength);
}

export function shouldRefreshNegotiatedMtu(mtu?: number | null) {
  return typeof mtu !== 'number' || !Number.isFinite(mtu) || mtu <= 23;
}

export function shouldWriteProtocolV2WithResponse({
  requestedWithResponse,
  characteristic,
}: {
  platform: BlePlatform;
  highThroughput: boolean;
  requestedWithResponse?: boolean;
  characteristic: BleWriteCapability;
}) {
  if (!characteristic.isWritableWithResponse) return false;
  if (!characteristic.isWritableWithoutResponse) return true;
  return requestedWithResponse === true;
}
