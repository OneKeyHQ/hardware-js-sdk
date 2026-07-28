import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('hd-ble-sdk device state events', () => {
  test('forwards DEVICE.STATE to React Native SDK consumers', () => {
    const source = readFileSync(resolve(__dirname, '../src/index.ts'), 'utf8');
    const deviceEventHandler = source.slice(
      source.indexOf('case DEVICE_EVENT:'),
      source.indexOf('case IFRAME.CALLBACK:')
    );

    expect(deviceEventHandler).toContain('DEVICE.STATE');
    expect(deviceEventHandler).toContain('eventEmitter.emit(message.type, message.payload)');
  });
});
