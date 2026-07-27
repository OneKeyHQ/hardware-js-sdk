import { program } from '../cli';

describe('firmware-update-v4 CLI command', () => {
  test('exposes firmware-update-v4 as the formal command', () => {
    const command = program.commands.find(item => item.name() === 'firmware-update-v4');

    expect(command).toBeDefined();
    expect(command?.description()).toBe(
      'Run Protocol V2 firmware update through sdk.firmwareUpdateV4'
    );
  });

  test('does not expose the pre-release firmware-update-v4-debug command', () => {
    expect(program.commands.some(item => item.name() === 'firmware-update-v4-debug')).toBe(false);
    expect(program.commands.some(item => item.aliases().includes('firmware-update-v4-debug'))).toBe(
      false
    );
  });
});
