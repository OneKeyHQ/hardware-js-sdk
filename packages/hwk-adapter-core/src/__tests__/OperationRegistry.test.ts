import {
  HardwareErrorCode,
  OperationRegistry,
  ORPHAN_ELIGIBLE_ERROR_CODES,
  createHardwareLinkId,
  createHardwareSearchTargetId,
  isHardwareOperationId,
  parseHardwareRuntimeId,
  resolveHardwareOperationTarget,
} from '../index';

const device = {
  vendor: 'ledger' as const,
  model: 'nanoX',
  firmwareVersion: '2.2.4',
  deviceId: '',
  connectId: 'usb-target',
  connectionType: 'usb' as const,
};

describe('OperationRegistry', () => {
  it('treats operation loss as an onboarding-wide failure', () => {
    expect(ORPHAN_ELIGIBLE_ERROR_CODES).toEqual(
      expect.arrayContaining([
        HardwareErrorCode.OperationNotFound,
        HardwareErrorCode.OperationEnded,
      ])
    );
  });

  it('creates an opaque runtime id and resolves the same bound search target', () => {
    const registry = new OperationRegistry({ vendor: 'ledger' });
    const operation = registry.create({
      searchTargetId: 'usb-target',
      connectId: 'usb-target',
      device,
      connectionType: 'usb' as const,
      connectionKeys: ['session-1'],
    });

    expect(isHardwareOperationId(operation.operationId)).toBe(true);
    expect(parseHardwareRuntimeId(operation.operationId)).toMatchObject({
      kind: 'operation',
      vendor: 'ledger',
    });
    expect(registry.resolve(operation.operationId)).toMatchObject({
      connectId: 'usb-target',
      connectionKeys: ['usb-target', 'session-1'],
    });

    registry.endAll('runtime-reset');
  });

  it('records the channel the adapter states, not the one on the device snapshot', () => {
    const registry = new OperationRegistry({ vendor: 'ledger' });
    const operation = registry.create({
      searchTargetId: 'ble-target',
      connectId: 'ble-target',
      // A combined connector fills this in with a nominal channel.
      device: { ...device, connectId: 'ble-target' },
      connectionType: 'ble',
    });

    expect(operation.connectionType).toBe('ble');
    expect(registry.resolve(operation.operationId).connectionType).toBe('ble');

    const rebound = registry.rebind(operation.operationId, {
      connectId: 'usb-target',
      device,
      connectionType: 'usb',
    });
    expect(rebound.connectionType).toBe('usb');

    registry.endAll('runtime-reset');
  });

  it('will not create an operation without a stated channel', () => {
    const registry = new OperationRegistry({ vendor: 'ledger' });
    registry.create({
      searchTargetId: 'usb-target',
      connectId: 'usb-target',
      device,
      // @ts-expect-error the channel is required and must not be inferred from `device`.
      connectionType: undefined,
    });
    registry.endAll('runtime-reset');
  });

  it('uses random runtime ids instead of a process-local sequence', () => {
    const registry = new OperationRegistry({ vendor: 'ledger' });
    const first = registry.create({
      searchTargetId: 'usb-target',
      connectId: 'usb-target',
      device,
      connectionType: 'usb' as const,
    });
    const second = registry.create({
      searchTargetId: 'usb-target',
      connectId: 'usb-target',
      device,
      connectionType: 'usb' as const,
    });

    expect(first.operationId).not.toBe(second.operationId);
    expect(first.operationId).toMatch(/^hwk:runtime:operation:ledger:[0-9a-f]{32}$/);
    expect(second.operationId).toMatch(/^hwk:runtime:operation:ledger:[0-9a-f]{32}$/);
    registry.endAll('runtime-reset');
  });

  it('creates typed search targets without exposing physical descriptor data', () => {
    const searchTargetId = createHardwareSearchTargetId('keystone');

    expect(parseHardwareRuntimeId(searchTargetId)).toEqual({
      kind: 'search-target',
      vendor: 'keystone',
    });
    expect(searchTargetId).not.toContain('serial');
  });

  it('normalizes positional compatibility and rejects conflicting operation ids', () => {
    const registry = new OperationRegistry({ vendor: 'trezor' });
    const first = registry.create({
      searchTargetId: 'usb-target',
      connectId: 'usb-target',
      device: { ...device, vendor: 'trezor' },
      connectionType: 'usb' as const,
    });
    const second = registry.create({
      searchTargetId: 'usb-target-2',
      connectId: 'usb-target-2',
      device: { ...device, vendor: 'trezor' },
      connectionType: 'usb' as const,
    });

    expect(resolveHardwareOperationTarget(first.operationId, undefined)).toEqual({
      success: true,
      payload: {
        targetId: first.operationId,
        operationId: first.operationId,
      },
    });
    expect(resolveHardwareOperationTarget('usb-target', first.operationId)).toEqual({
      success: true,
      payload: {
        targetId: first.operationId,
        operationId: first.operationId,
      },
    });
    expect(resolveHardwareOperationTarget(first.operationId, second.operationId)).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.InvalidParams },
    });
    registry.endAll('runtime-reset');
  });

  it('rejects malformed, cross-vendor, and link runtime targets', () => {
    const keystoneTarget = createHardwareSearchTargetId('keystone');
    const ledgerSession = createHardwareLinkId('ledger');

    expect(
      resolveHardwareOperationTarget('hwk:runtime:operation:ledger:not-random', undefined)
    ).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.InvalidParams },
    });
    expect(resolveHardwareOperationTarget(keystoneTarget, undefined, 'ledger')).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.InvalidParams },
    });
    expect(resolveHardwareOperationTarget(ledgerSession, undefined, 'ledger')).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.InvalidParams },
    });
    expect(
      resolveHardwareOperationTarget('legacy-connect-id', keystoneTarget, 'keystone')
    ).toMatchObject({
      success: false,
      payload: { code: HardwareErrorCode.InvalidParams },
    });
  });

  it('keeps an ended id as a tombstone so it cannot silently fall back', () => {
    const registry = new OperationRegistry({ vendor: 'trezor' });
    const operation = registry.create({
      searchTargetId: 'safe-7',
      connectId: 'safe-7',
      device: { ...device, vendor: 'trezor', connectId: 'safe-7' },
      connectionType: 'usb' as const,
    });

    registry.end(operation.operationId, 'disconnect');

    expect(() => registry.resolve(operation.operationId)).toThrow(
      expect.objectContaining({
        code: HardwareErrorCode.OperationEnded,
        params: expect.objectContaining({ reason: 'disconnect' }),
      })
    );
  });

  it('rebinds an active operation to a recovered session without reviving ended ids', () => {
    const registry = new OperationRegistry({ vendor: 'ledger' });
    const operation = registry.create({
      searchTargetId: 'usb-target',
      connectId: 'usb-target',
      device,
      connectionType: 'usb' as const,
      connectionKeys: ['session-1'],
    });

    registry.endByConnectionKey('session-1', 'disconnect', operation.operationId);
    registry.endAll('explicit', operation.operationId);

    registry.rebind(operation.operationId, {
      connectId: 'usb-target-recovered',
      device: { ...device, connectId: 'usb-target-recovered' },
      connectionType: 'usb' as const,
      connectionKeys: ['session-2'],
    });

    // A rebind replaces the transport binding wholesale: the recovered
    // connectId is the only key, and the pre-rebind target is not carried over.
    expect(registry.resolve(operation.operationId)).toMatchObject({
      connectId: 'usb-target-recovered',
      connectionKeys: ['usb-target-recovered', 'session-2'],
    });
    registry.end(operation.operationId, 'disconnect');
    expect(() =>
      registry.rebind(operation.operationId, {
        connectId: 'usb-target-3',
        device,
        connectionType: 'usb' as const,
      })
    ).toThrow(expect.objectContaining({ code: HardwareErrorCode.OperationEnded }));
  });

  it('ends a binding when its physical session disconnects', () => {
    const onEnded = jest.fn();
    const registry = new OperationRegistry({ vendor: 'ledger', onEnded });
    const operation = registry.create({
      searchTargetId: '',
      connectId: '',
      device: { ...device, connectId: '' },
      connectionType: 'usb' as const,
      connectionKeys: ['session-1'],
    });

    registry.endByConnectionKey('session-1', 'disconnect');

    expect(onEnded).toHaveBeenCalledWith(
      expect.objectContaining({ operationId: operation.operationId }),
      'disconnect'
    );
    expect(() => registry.resolve(operation.operationId)).toThrow(
      expect.objectContaining({ code: HardwareErrorCode.OperationEnded })
    );
  });

  it('expires an idle binding', async () => {
    const onEnded = jest.fn();
    const registry = new OperationRegistry({
      vendor: 'keystone',
      ttlMs: 5,
      onEnded,
    });
    const operation = registry.create({
      searchTargetId: 'keystone-qr:connect',
      connectId: 'keystone-wallet:abc',
      device: { ...device, vendor: 'keystone' },
      connectionType: 'usb' as const,
    });

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(onEnded).toHaveBeenCalledWith(
      expect.objectContaining({ operationId: operation.operationId }),
      'timeout'
    );
  });

  it('does not expire while retained by an active device job', async () => {
    const onEnded = jest.fn();
    const registry = new OperationRegistry({ vendor: 'ledger', ttlMs: 5, onEnded });
    const operation = registry.create({
      searchTargetId: 'usb-target',
      connectId: 'usb-target',
      device,
      connectionType: 'usb' as const,
    });
    const release = registry.retain(operation.operationId);

    await new Promise(resolve => setTimeout(resolve, 20));
    expect(registry.resolve(operation.operationId)).toMatchObject({
      operationId: operation.operationId,
    });
    expect(onEnded).not.toHaveBeenCalled();

    release();
    registry.end(operation.operationId, 'explicit');
  });

  it('keeps binding data after timeout so adapters can release the session', async () => {
    const registry = new OperationRegistry({ vendor: 'trezor', ttlMs: 5 });
    const operation = registry.create({
      searchTargetId: 'safe-7',
      connectId: 'safe-7',
      device: { ...device, vendor: 'trezor', connectId: 'safe-7' },
      connectionType: 'usb' as const,
      connectionKeys: ['session-7'],
    });

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(registry.find(operation.operationId)).toMatchObject({
      connectId: 'safe-7',
      connectionKeys: expect.arrayContaining(['session-7']),
    });
  });
});
