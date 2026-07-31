export function selectSearchDevice<T extends { connectId?: string | null }>(
  devices: T[],
  preferredConnectId?: string
): T | undefined {
  if (preferredConnectId) {
    return (
      devices.find(device => device.connectId === preferredConnectId) ??
      ({ connectId: preferredConnectId } as T)
    );
  }

  return devices[0];
}
