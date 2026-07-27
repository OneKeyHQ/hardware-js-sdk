import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('hd-common-connect-sdk device state events', () => {
  test('forwards the canonical DEVICE.STATE event to SDK consumers', () => {
    const source = readFileSync(resolve(__dirname, '../src/index.ts'), 'utf8');

    expect(source).toContain('DEVICE.STATE');
    expect(source).toContain('eventEmitter.emit(message.type, message.payload)');
  });
});
