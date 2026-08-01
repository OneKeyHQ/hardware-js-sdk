import { createKnownBleUuidAliases, matchesKnownBleUuid } from '@onekeyfe/hd-shared';

export const IOS_PACKET_LENGTH = 128;
export const ANDROID_PACKET_LENGTH = 192;
export const ANDROID_DEFAULT_MTU = 23;

type BluetoothServices = Record<
  string,
  {
    serviceUuid: string;
    writeUuid?: string;
    notifyUuid?: string;
  }
>;

const ClassicServiceUUID = '00000001-0000-1000-8000-00805f9b34fb';

const OneKeyServices: Record<string, BluetoothServices> = {
  classic: {
    [ClassicServiceUUID]: {
      serviceUuid: ClassicServiceUUID,
      writeUuid: '00000002-0000-1000-8000-00805f9b34fb',
      notifyUuid: '00000003-0000-1000-8000-00805f9b34fb',
    },
  },
};

const bluetoothServices: string[] = [];

for (const deviceType of Object.keys(OneKeyServices)) {
  const services = OneKeyServices[deviceType];
  bluetoothServices.push(...Object.keys(services));
}

export const getBluetoothServiceUuids = () => bluetoothServices;
export const getInfosForServiceUuid = (serviceUuid: string, deviceType: 'classic') => {
  const services = OneKeyServices[deviceType];
  if (!services) {
    return null;
  }
  const normalizedServiceUuid = normalizeBleUuid(serviceUuid);
  const service =
    services[serviceUuid] ??
    Object.values(services).find(
      item =>
        normalizeBleUuid(item.serviceUuid) === normalizedServiceUuid ||
        matchesKnownBleUuid(serviceUuid, createKnownBleUuidAliases(item.serviceUuid))
    );
  if (!service) {
    return null;
  }
  return service;
};

export const normalizeBleUuid = (uuid?: string | null) =>
  (uuid ?? '').replace(/-/g, '').toLowerCase();

export const isSameBleUuid = (left?: string | null, right?: string | null) => {
  if (!left || !right) return false;
  return matchesKnownBleUuid(left, createKnownBleUuidAliases(right));
};
