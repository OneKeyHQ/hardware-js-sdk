import {
  getFirmwareUpdateHostBindingGeneration,
  registerFirmwareUpdateHostBinding,
  resolveFirmwareUpdateHostBinding,
  unregisterFirmwareUpdateHostBinding,
} from '../../src/api/firmware/FirmwareHostBinding';

const createBinding = () => ({
  preparedPlanDigest: 'a'.repeat(64),
  artifactReader: {
    open: jest.fn(() => Promise.resolve({ readerId: 'reader-1', size: 4 })),
    read: jest.fn(() =>
      Promise.resolve({
        data: new ArrayBuffer(4),
        bytesRead: 4,
        eof: true,
      })
    ),
    close: jest.fn(() => Promise.resolve()),
  },
});

describe('firmware host binding generation', () => {
  afterEach(() => {
    unregisterFirmwareUpdateHostBinding();
  });

  test('invalidates callbacks from a replaced generation', async () => {
    const staleBinding = createBinding();
    const staleGeneration = registerFirmwareUpdateHostBinding(staleBinding);
    const stale = resolveFirmwareUpdateHostBinding(staleGeneration);
    const activeGeneration = registerFirmwareUpdateHostBinding(createBinding());

    expect(activeGeneration).toBeGreaterThan(staleGeneration);
    expect(getFirmwareUpdateHostBindingGeneration()).toBe(activeGeneration);
    await expect(
      stale.artifactReader.read({
        readerId: 'reader-1',
        offset: 0,
        length: 4,
      })
    ).rejects.toMatchObject({
      params: {
        firmwareUpdateCode: 'FirmwareArtifactReaderInvalid',
      },
    });
    expect(unregisterFirmwareUpdateHostBinding(staleGeneration)).toBe(false);
    expect(getFirmwareUpdateHostBindingGeneration()).toBe(activeGeneration);
  });

  test('closes an artifact opened during a generation race', async () => {
    const binding = createBinding();
    binding.artifactReader.open.mockImplementationOnce(() => {
      registerFirmwareUpdateHostBinding(createBinding());
      return Promise.resolve({ readerId: 'stale-reader', size: 4 });
    });
    const generation = registerFirmwareUpdateHostBinding(binding);
    const guarded = resolveFirmwareUpdateHostBinding(generation);

    await expect(
      guarded.artifactReader.open({ artifactRef: `fw:${'a'.repeat(64)}` })
    ).rejects.toMatchObject({
      params: {
        firmwareUpdateCode: 'FirmwareArtifactReaderInvalid',
      },
    });
    expect(binding.artifactReader.close).toHaveBeenCalledWith({
      readerId: 'stale-reader',
    });
  });

  test('rejects a prepared plan from another host generation before opening artifacts', () => {
    const generation = registerFirmwareUpdateHostBinding(createBinding());

    expect(() => resolveFirmwareUpdateHostBinding(generation, 'b'.repeat(64))).toThrow(
      'does not match the prepared plan'
    );
  });
});
