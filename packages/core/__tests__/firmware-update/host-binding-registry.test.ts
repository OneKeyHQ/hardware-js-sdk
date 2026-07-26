import {
  firmwareHostBindingRegistry,
  getFirmwareHostBindingGeneration,
  registerFirmwareHostBinding,
  unregisterFirmwareHostBinding,
} from '../../src/firmware-update';

import type { FirmwareUpdateHostBinding } from '../../src/firmware-update';

const createBinding = (): FirmwareUpdateHostBinding => ({
  artifactReader: {
    open: jest.fn(),
    read: jest.fn(),
    close: jest.fn(),
  },
  checkpointSink: {
    commit: jest.fn(),
  },
});

describe('firmware host binding registration API', () => {
  afterEach(() => {
    firmwareHostBindingRegistry.reset();
  });

  it('exposes the active binding generation', () => {
    const binding = createBinding();

    const generation = registerFirmwareHostBinding(binding);

    expect(getFirmwareHostBindingGeneration()).toBe(generation);
    expect(firmwareHostBindingRegistry.capture()).toEqual({
      generation,
      binding,
    });
  });

  it('does not let a stale owner unregister a replacement binding', () => {
    const staleGeneration = registerFirmwareHostBinding(createBinding());
    const activeBinding = createBinding();
    const activeGeneration = registerFirmwareHostBinding(activeBinding);

    expect(unregisterFirmwareHostBinding(staleGeneration)).toBe(false);
    expect(firmwareHostBindingRegistry.capture()).toEqual({
      generation: activeGeneration,
      binding: activeBinding,
    });
    expect(unregisterFirmwareHostBinding(activeGeneration)).toBe(true);
    expect(() => firmwareHostBindingRegistry.capture()).toThrow(
      'Firmware host binding is not registered'
    );
  });
});
