import {
  HardwareErrorCode,
  InteractionRegistry,
  ORPHAN_ELIGIBLE_ERROR_CODES,
  createHardwareConnectorSessionId,
  createHardwareSearchTargetId,
  isHardwareInteractionId,
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

describe('InteractionRegistry', () => {
  it('treats interaction loss as an onboarding-wide failure', () => {
    expect(ORPHAN_ELIGIBLE_ERROR_CODES).toEqual(
      expect.arrayContaining([
        HardwareErrorCode.InteractionNotFound,
        HardwareErrorCode.InteractionEnded,
      ])
    );
  });

  it('creates an opaque runtime id and resolves the same bound search target', () => {
    const registry = new InteractionRegistry({ vendor: 'ledger' });
    const interaction = registry.create({
      searchTargetId: 'usb-target',
      connectId: 'usb-target',
      device,
      connectionKeys: ['session-1'],
    });

    expect(isHardwareInteractionId(interaction.interactionId)).toBe(true);
    expect(parseHardwareRuntimeId(interaction.interactionId)).toMatchObject({
      kind: 'interaction',
      vendor: 'ledger',
    });
    expect(registry.resolve(interaction.interactionId)).toMatchObject({
      searchTargetId: 'usb-target',
      connectId: 'usb-target',
      connectionKeys: ['usb-target', 'session-1'],
    });

    registry.endAll('runtime-reset');
  });

  it('uses random runtime ids instead of a process-local sequence', () => {
    const registry = new InteractionRegistry({ vendor: 'ledger' });
    const first = registry.create({
      searchTargetId: 'usb-target',
      connectId: 'usb-target',
      device,
    });
    const second = registry.create({
      searchTargetId: 'usb-target',
      connectId: 'usb-target',
      device,
    });

    expect(first.interactionId).not.toBe(second.interactionId);
    expect(first.interactionId).toMatch(/^hwk:runtime:v1:interaction:ledger:[0-9a-f]{32}$/);
    expect(second.interactionId).toMatch(/^hwk:runtime:v1:interaction:ledger:[0-9a-f]{32}$/);
    registry.endAll('runtime-reset');
  });

  it('creates typed search targets without exposing physical descriptor data', () => {
    const searchTargetId = createHardwareSearchTargetId({
      vendor: 'keystone',
      connectionType: 'usb',
    });

    expect(parseHardwareRuntimeId(searchTargetId)).toMatchObject({
      kind: 'search-target',
      vendor: 'keystone',
      connectionType: 'usb',
    });
    expect(searchTargetId).not.toContain('serial');
  });

  it('normalizes positional compatibility and rejects conflicting interaction ids', () => {
    const registry = new InteractionRegistry({ vendor: 'trezor' });
    const first = registry.create({
      searchTargetId: 'usb-target',
      connectId: 'usb-target',
      device: { ...device, vendor: 'trezor' },
    });
    const second = registry.create({
      searchTargetId: 'usb-target-2',
      connectId: 'usb-target-2',
      device: { ...device, vendor: 'trezor' },
    });

    expect(resolveHardwareOperationTarget(first.interactionId, undefined)).toEqual({
      success: true,
      payload: {
        targetId: first.interactionId,
        interactionId: first.interactionId,
      },
    });
    expect(resolveHardwareOperationTarget('usb-target', first.interactionId)).toEqual({
      success: true,
      payload: {
        targetId: first.interactionId,
        interactionId: first.interactionId,
      },
    });
    expect(resolveHardwareOperationTarget(first.interactionId, second.interactionId)).toMatchObject(
      {
        success: false,
        payload: { code: HardwareErrorCode.InvalidParams },
      }
    );
    registry.endAll('runtime-reset');
  });

  it('rejects malformed, cross-vendor, and connector-session runtime targets', () => {
    const keystoneTarget = createHardwareSearchTargetId({
      vendor: 'keystone',
      connectionType: 'usb',
    });
    const ledgerSession = createHardwareConnectorSessionId({
      vendor: 'ledger',
      connectionType: 'usb',
    });

    expect(
      resolveHardwareOperationTarget('hwk:runtime:v1:interaction:ledger:not-random', undefined)
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
    const registry = new InteractionRegistry({ vendor: 'trezor' });
    const interaction = registry.create({
      searchTargetId: 'safe-7',
      connectId: 'safe-7',
      device: { ...device, vendor: 'trezor', connectId: 'safe-7' },
    });

    registry.end(interaction.interactionId, 'disconnect');

    expect(() => registry.resolve(interaction.interactionId)).toThrow(
      expect.objectContaining({
        code: HardwareErrorCode.InteractionEnded,
        params: expect.objectContaining({ reason: 'disconnect' }),
      })
    );
  });

  it('rebinds an active interaction to a recovered session without reviving ended ids', () => {
    const registry = new InteractionRegistry({ vendor: 'ledger' });
    const interaction = registry.create({
      searchTargetId: 'usb-target',
      connectId: 'usb-target',
      device,
      connectionKeys: ['session-1'],
    });

    registry.endByConnectionKey('session-1', 'disconnect', interaction.interactionId);
    registry.endAll('explicit', interaction.interactionId);

    registry.rebind(interaction.interactionId, {
      connectId: 'usb-target-recovered',
      device: { ...device, connectId: 'usb-target-recovered' },
      connectionKeys: ['session-2'],
    });

    expect(registry.resolve(interaction.interactionId)).toMatchObject({
      searchTargetId: 'usb-target',
      connectId: 'usb-target-recovered',
      connectionKeys: ['usb-target-recovered', 'session-2'],
    });
    registry.end(interaction.interactionId, 'disconnect');
    expect(() =>
      registry.rebind(interaction.interactionId, {
        connectId: 'usb-target-3',
        device,
      })
    ).toThrow(expect.objectContaining({ code: HardwareErrorCode.InteractionEnded }));
  });

  it('ends a binding when its physical session disconnects', () => {
    const onEnded = jest.fn();
    const registry = new InteractionRegistry({ vendor: 'ledger', onEnded });
    const interaction = registry.create({
      searchTargetId: '',
      connectId: '',
      device: { ...device, connectId: '' },
      connectionKeys: ['session-1'],
    });

    registry.endByConnectionKey('session-1', 'disconnect');

    expect(onEnded).toHaveBeenCalledWith(
      expect.objectContaining({ interactionId: interaction.interactionId }),
      'disconnect'
    );
    expect(() => registry.resolve(interaction.interactionId)).toThrow(
      expect.objectContaining({ code: HardwareErrorCode.InteractionEnded })
    );
  });

  it('expires an idle binding', async () => {
    const onEnded = jest.fn();
    const registry = new InteractionRegistry({
      vendor: 'keystone',
      ttlMs: 5,
      onEnded,
    });
    const interaction = registry.create({
      searchTargetId: 'keystone-qr:connect',
      connectId: 'keystone-wallet:abc',
      device: { ...device, vendor: 'keystone' },
    });

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(onEnded).toHaveBeenCalledWith(
      expect.objectContaining({ interactionId: interaction.interactionId }),
      'timeout'
    );
  });

  it('does not expire while retained by an active device job', async () => {
    const onEnded = jest.fn();
    const registry = new InteractionRegistry({ vendor: 'ledger', ttlMs: 5, onEnded });
    const interaction = registry.create({
      searchTargetId: 'usb-target',
      connectId: 'usb-target',
      device,
    });
    const release = registry.retain(interaction.interactionId);

    await new Promise(resolve => setTimeout(resolve, 20));
    expect(registry.resolve(interaction.interactionId)).toMatchObject({
      interactionId: interaction.interactionId,
    });
    expect(onEnded).not.toHaveBeenCalled();

    release();
    registry.end(interaction.interactionId, 'explicit');
  });

  it('keeps binding data after timeout so adapters can release the session', async () => {
    const registry = new InteractionRegistry({ vendor: 'trezor', ttlMs: 5 });
    const interaction = registry.create({
      searchTargetId: 'safe-7',
      connectId: 'safe-7',
      device: { ...device, vendor: 'trezor', connectId: 'safe-7' },
      connectionKeys: ['session-7'],
    });

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(registry.find(interaction.interactionId)).toMatchObject({
      connectId: 'safe-7',
      connectionKeys: expect.arrayContaining(['session-7']),
    });
  });
});
