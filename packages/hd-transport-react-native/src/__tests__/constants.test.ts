import { getBleUuidKey, getBluetoothServiceUuids, getInfosForServiceUuid } from '../constants';

describe('React Native BLE service constants', () => {
  it('includes the Pro2 advertisement service in scan filters', () => {
    expect(getBluetoothServiceUuids().map(getBleUuidKey)).toContain('fffd');
  });

  it.each(['fffd', '0000fffd-0000-1000-8000-00805f9b34fb'])(
    'resolves Pro2 service configuration for %s',
    serviceUuid => {
      expect(getInfosForServiceUuid(serviceUuid, 'classic')).toEqual({
        serviceUuid: 'fffd',
        writeUuid: '00000002-0000-1000-8000-00805f9b34fb',
        notifyUuid: '00000003-0000-1000-8000-00805f9b34fb',
      });
    }
  );
});
