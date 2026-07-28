import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('hd-web-sdk device state events', () => {
  test('forwards DEVICE.STATE through the device event bridge and global listener', () => {
    const source = readFileSync(resolve(__dirname, '../src/index.ts'), 'utf8');
    const deviceEventHandler = source.slice(
      source.indexOf('case DEVICE_EVENT:'),
      source.indexOf('case IFRAME.CALLBACK:')
    );
    const globalEventListener = source.slice(
      source.indexOf('const addHardwareGlobalEventListener'),
      source.indexOf('const HardwareSDKLowLevel')
    );

    expect(deviceEventHandler).toContain('DEVICE.STATE');
    expect(deviceEventHandler).toContain('eventEmitter.emit(message.type, message.payload)');
    expect(globalEventListener).toContain('DEVICE.STATE');
    expect(globalEventListener).toContain('eventEmitter.on(eventName, (message: CoreMessage) => {');
    expect(globalEventListener).toContain('listener?.(emitMessage)');
  });
});
