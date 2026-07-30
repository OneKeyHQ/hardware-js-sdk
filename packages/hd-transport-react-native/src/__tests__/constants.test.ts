import { getBluetoothServiceUuids, getInfosForServiceUuid } from '../constants';

describe('React Native BLE service filters', () => {
  test('does not scan or configure the ignored FFFD service', () => {
    expect(getBluetoothServiceUuids()).not.toContain('fffd');
    expect(getInfosForServiceUuid('fffd', 'classic')).toBeNull();
    expect(getInfosForServiceUuid('0000fffd-0000-1000-8000-00805f9b34fb', 'classic')).toBeNull();
  });

  test('keeps the OneKey communication service configured', () => {
    expect(getBluetoothServiceUuids()).toContain('00000001-0000-1000-8000-00805f9b34fb');
    expect(getInfosForServiceUuid('0001', 'classic')).toMatchObject({
      serviceUuid: '00000001-0000-1000-8000-00805f9b34fb',
    });
  });
});
