import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('hd-ble-sdk device state events', () => {
  test('exposes direct firmware host binding on named and default exports', () => {
    const source = readFileSync(resolve(__dirname, '../src/index.ts'), 'utf8');

    expect(source).toContain('export const registerFirmwareHostBinding');
    expect(source).toContain('export const unregisterFirmwareHostBinding');
    expect(source).toContain('getFirmwareHostBindingGeneration');
    expect(source).toContain('Object.assign(');
  });

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
