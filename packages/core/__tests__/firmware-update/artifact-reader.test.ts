import {
  FirmwareHostBindingRegistry,
  FirmwareUpdateErrorCode,
  openFirmwareArtifactReader,
} from '../../src/firmware-update';

import type {
  FirmwareArtifactReader,
  FirmwareArtifactReaderReadResult,
  FirmwareUpdateHostBinding,
} from '../../src/firmware-update';

const createBinding = (artifactReader: FirmwareArtifactReader): FirmwareUpdateHostBinding => ({
  artifactReader,
  checkpointSink: {
    commit: jest.fn(() => Promise.resolve()),
  },
});

const createReader = (overrides: Partial<FirmwareArtifactReader> = {}): FirmwareArtifactReader => ({
  open: jest.fn(() =>
    Promise.resolve({
      readerId: 'reader-1',
      size: 4096,
    })
  ),
  read: jest.fn(input =>
    Promise.resolve({
      data: new ArrayBuffer(input.length),
      bytesRead: input.length,
      eof: input.offset + input.length === 4096,
    })
  ),
  close: jest.fn(() => Promise.resolve()),
  cancel: jest.fn(() => Promise.resolve()),
  ...overrides,
});

describe('firmware artifact reader sessions', () => {
  it('opens against the current generation and closes idempotently', async () => {
    const registry = new FirmwareHostBindingRegistry();
    const hostReader = createReader();
    registry.register(createBinding(hostReader));
    const reader = await openFirmwareArtifactReader(registry, 'artifact-ref-1');

    await reader.close();
    await reader.close();

    expect(hostReader.close).toHaveBeenCalledTimes(1);
    expect(hostReader.close).toHaveBeenCalledWith({ readerId: 'reader-1' });
  });

  it('enforces one in-flight read and cancels by operationId', async () => {
    let resolveRead: ((value: FirmwareArtifactReaderReadResult) => void) | undefined;
    const hostReader = createReader({
      read: jest.fn(
        () =>
          new Promise<FirmwareArtifactReaderReadResult>(resolve => {
            resolveRead = resolve;
          })
      ),
    });
    const registry = new FirmwareHostBindingRegistry();
    registry.register(createBinding(hostReader));
    const reader = await openFirmwareArtifactReader(registry, 'artifact-ref-1');
    const firstRead = reader.read({
      operationId: 'operation-1',
      offset: 0,
      length: 16,
    });

    await expect(
      reader.read({
        operationId: 'operation-2',
        offset: 16,
        length: 16,
      })
    ).rejects.toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwareArtifactReaderInvalid,
    });
    await reader.cancel('operation-1');
    expect(hostReader.cancel).toHaveBeenCalledWith({ operationId: 'operation-1' });
    resolveRead?.({
      data: new ArrayBuffer(16),
      bytesRead: 16,
      eof: false,
    });
    await firstRead;
    await reader.close();
  });

  it('invalidates an open reader after host reset but still permits cleanup', async () => {
    const registry = new FirmwareHostBindingRegistry();
    const hostReader = createReader();
    registry.register(createBinding(hostReader));
    const reader = await openFirmwareArtifactReader(registry, 'artifact-ref-1');

    registry.reset();

    await expect(
      reader.read({
        operationId: 'operation-stale',
        offset: 0,
        length: 16,
      })
    ).rejects.toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwareArtifactReaderInvalid,
    });
    await reader.close();
    expect(hostReader.close).toHaveBeenCalledTimes(1);
  });

  it('closes a reader opened by a stale generation race', async () => {
    let resolveOpen: ((value: { readerId: string; size: number }) => void) | undefined;
    const hostReader = createReader({
      open: jest.fn(
        () =>
          new Promise<{ readerId: string; size: number }>(resolve => {
            resolveOpen = resolve;
          })
      ),
    });
    const registry = new FirmwareHostBindingRegistry();
    registry.register(createBinding(hostReader));
    const opening = openFirmwareArtifactReader(registry, 'artifact-ref-1');

    registry.reset();
    resolveOpen?.({ readerId: 'reader-stale', size: 4096 });

    await expect(opening).rejects.toMatchObject({
      errorCode: FirmwareUpdateErrorCode.FirmwareArtifactReaderInvalid,
    });
    expect(hostReader.close).toHaveBeenCalledWith({ readerId: 'reader-stale' });
  });
});
