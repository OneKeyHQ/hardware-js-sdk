const BLE_ATT_HEADER_BYTES = 3;

export function resolveBlePacketCapacity(
  mtu: number | null | undefined,
  maximumPacketCapacity: number,
  fallbackPacketCapacity: number
): number {
  if (typeof mtu !== 'number' || !Number.isFinite(mtu) || mtu <= BLE_ATT_HEADER_BYTES) {
    return fallbackPacketCapacity;
  }

  return Math.min(maximumPacketCapacity, Math.floor(mtu) - BLE_ATT_HEADER_BYTES);
}
