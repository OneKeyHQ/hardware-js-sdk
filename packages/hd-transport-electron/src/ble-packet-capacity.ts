const BLE_ATT_HEADER_BYTES = 3;

export function resolveNobleAttMtu(
  reportedMtu: number | null | undefined,
  platform: NodeJS.Platform = process.platform
): number | undefined {
  if (typeof reportedMtu !== 'number' || !Number.isFinite(reportedMtu) || reportedMtu <= 0) {
    return undefined;
  }

  const normalizedMtu = Math.floor(reportedMtu);
  return platform === 'darwin' || platform === 'win32'
    ? normalizedMtu + BLE_ATT_HEADER_BYTES
    : normalizedMtu;
}

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
