import { UI_REQUEST } from '../src/events';
import {
  ProtocolV2UiInteractionCoordinator,
  isProtocolV2UiEnabled,
  resolveProtocolV2UiInteraction,
} from '../src/protocols/protocol-v2/uiInteraction';

const createDevice = (protocolV2 = true) => ({
  isProtocolV2: jest.fn(() => protocolV2),
  toMessageObject: jest.fn(() => ({ connectId: 'pro2-test', deviceType: 'pro2' })),
});

const changePinInteraction = {
  request: 'button',
  source: 'method-lifecycle',
  reason: 'change-pin',
  completion: 'page-accepted',
  deviceOnly: true,
} as const;

describe('ProtocolV2UiInteractionCoordinator', () => {
  test('does not synthesize UI events for Protocol V1 devices', () => {
    const postMessage = jest.fn();
    const coordinator = new ProtocolV2UiInteractionCoordinator(
      createDevice(false) as any,
      postMessage
    );

    coordinator.enterMethodInteraction(changePinInteraction);
    coordinator.enterUnlockInteraction('deviceChangePin');
    coordinator.close();

    expect(postMessage).not.toHaveBeenCalled();
  });

  test('synthesizes and deduplicates a Protocol V2 method interaction', () => {
    const postMessage = jest.fn();
    const device = createDevice();
    const coordinator = new ProtocolV2UiInteractionCoordinator(device as any, postMessage);

    coordinator.enterMethodInteraction(changePinInteraction);
    coordinator.enterMethodInteraction(changePinInteraction);

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      event: 'UI_EVENT',
      type: UI_REQUEST.REQUEST_BUTTON,
      payload: {
        device: { connectId: 'pro2-test', deviceType: 'pro2' },
        source: 'method-lifecycle',
        reason: 'change-pin',
        completion: 'page-accepted',
        deviceOnly: true,
      },
    });
  });

  test('synthesizes a PIN prompt for an explicit Protocol V2 unlock method', () => {
    const postMessage = jest.fn();
    const coordinator = new ProtocolV2UiInteractionCoordinator(createDevice() as any, postMessage);

    coordinator.enterMethodInteraction({
      request: 'pin',
      source: 'method-lifecycle',
      reason: 'device-unlock',
      completion: 'operation-completed',
      deviceOnly: true,
      operation: 'unlock-device',
    });

    expect(postMessage.mock.calls.map(([message]) => message.type)).toEqual([
      UI_REQUEST.REQUEST_PIN,
    ]);
  });

  test('switches to unlock prompt and restores the method interaction', () => {
    const postMessage = jest.fn();
    const coordinator = new ProtocolV2UiInteractionCoordinator(createDevice() as any, postMessage);

    coordinator.enterMethodInteraction(changePinInteraction);
    coordinator.enterUnlockInteraction('deviceChangePin');
    coordinator.resumeMethodInteraction();

    expect(postMessage.mock.calls.map(([message]) => message.type)).toEqual([
      UI_REQUEST.REQUEST_BUTTON,
      UI_REQUEST.REQUEST_PIN,
      UI_REQUEST.REQUEST_BUTTON,
    ]);
    expect(postMessage.mock.calls[1][0]).toEqual({
      event: 'UI_EVENT',
      type: UI_REQUEST.REQUEST_PIN,
      payload: {
        device: { connectId: 'pro2-test', deviceType: 'pro2' },
        source: 'unlock-coordinator',
        reason: 'device-locked',
        deviceOnly: true,
        method: 'deviceChangePin',
      },
    });
  });

  test('only closes an opened interaction once', () => {
    const postMessage = jest.fn();
    const idleCoordinator = new ProtocolV2UiInteractionCoordinator(
      createDevice() as any,
      postMessage
    );

    idleCoordinator.close();
    expect(postMessage).not.toHaveBeenCalled();

    const coordinator = new ProtocolV2UiInteractionCoordinator(createDevice() as any, postMessage);
    coordinator.enterMethodInteraction(changePinInteraction);
    coordinator.close();
    coordinator.close();

    expect(postMessage.mock.calls.map(([message]) => message.type)).toEqual([
      UI_REQUEST.REQUEST_BUTTON,
      UI_REQUEST.CLOSE_UI_WINDOW,
    ]);
  });

  test('emits a routable close for a progress-only Protocol V2 operation', () => {
    const postMessage = jest.fn();
    const interaction = {
      interactionId: 'interaction-progress',
      phaseId: 'interaction-progress:phase-1',
      sequence: 1,
      phase: 'processing',
      transition: 'finish',
      outcome: 'succeeded',
      protocol: 'V2',
    } as const;
    const device = {
      ...createDevice(),
      finishProtocolV2UiInteraction: jest.fn(() => interaction),
    };
    const coordinator = new ProtocolV2UiInteractionCoordinator(device as any, postMessage);

    const emitted = coordinator.close({ ensureOperationClose: true });

    expect(emitted).toBe(true);
    expect(postMessage).toHaveBeenCalledWith({
      event: 'UI_EVENT',
      type: UI_REQUEST.CLOSE_UI_WINDOW,
      payload: {
        ...interaction,
        device: { connectId: 'pro2-test', deviceType: 'pro2' },
      },
    });
  });

  test('closes a known Protocol V2 operation after transport state is released', () => {
    const postMessage = jest.fn();
    const interaction = {
      interactionId: 'interaction-released',
      phaseId: 'interaction-released:phase-1',
      sequence: 2,
      phase: 'processing',
      transition: 'finish',
      outcome: 'succeeded',
      protocol: 'V2',
    } as const;
    const device = {
      ...createDevice(false),
      finishProtocolV2UiInteraction: jest.fn(() => interaction),
    };
    const coordinator = new ProtocolV2UiInteractionCoordinator(device as any, postMessage);

    const emitted = coordinator.close({
      ensureOperationClose: true,
      protocolV2Operation: true,
    });

    expect(emitted).toBe(true);
    expect(postMessage).toHaveBeenCalledWith({
      event: 'UI_EVENT',
      type: UI_REQUEST.CLOSE_UI_WINDOW,
      payload: {
        ...interaction,
        device: { connectId: 'pro2-test', deviceType: 'pro2' },
      },
    });
  });

  test('does not emit interaction events for methods without metadata such as Portfolio', () => {
    const postMessage = jest.fn();
    const coordinator = new ProtocolV2UiInteractionCoordinator(createDevice() as any, postMessage);

    coordinator.enterMethodInteraction(undefined);
    coordinator.close();

    expect(postMessage).not.toHaveBeenCalled();
  });

  test('disables both synthesized prompts and compatibility close events for Portfolio', () => {
    expect(isProtocolV2UiEnabled({ protocolV2UiMode: 'none' })).toBe(false);
    expect(isProtocolV2UiEnabled({ protocolV2UiMode: 'auto' })).toBe(true);
    expect(isProtocolV2UiEnabled({})).toBe(true);
  });
});

describe('resolveProtocolV2UiInteraction', () => {
  test('keeps explicit method metadata as the highest-priority policy', () => {
    expect(
      resolveProtocolV2UiInteraction({
        name: 'evmSignMessage',
        params: {},
        protocolV2UiInteraction: changePinInteraction,
      })
    ).toBe(changePinInteraction);
  });

  test.each([
    ['evmGetAddress', 'address-confirmation'],
    ['btcGetPublicKey', 'public-key-confirmation'],
  ])('synthesizes display confirmation metadata for %s', (name, reason) => {
    expect(
      resolveProtocolV2UiInteraction({
        name,
        params: [{ show_display: false }, { show_display: true }],
      })
    ).toEqual({
      request: 'button',
      source: 'method-lifecycle',
      reason,
      completion: 'operation-completed',
      deviceOnly: true,
      operation: name,
    });
  });

  test.each(['evmGetAddress', 'btcGetPublicKey'])('keeps non-display %s calls eventless', name => {
    expect(
      resolveProtocolV2UiInteraction({
        name,
        params: [{ show_display: false }],
      })
    ).toBeUndefined();
  });

  test('uses the public address payload for aggregate address methods', () => {
    expect(
      resolveProtocolV2UiInteraction({
        name: 'allNetworkGetAddress',
        params: undefined,
        payload: {
          bundle: [{ showOnOneKey: false }, { showOnOneKey: true }],
        },
      })
    ).toMatchObject({
      reason: 'address-confirmation',
      operation: 'allNetworkGetAddress',
    });
  });

  test('covers the loop-based aggregate address method', () => {
    expect(
      resolveProtocolV2UiInteraction({
        name: 'allNetworkGetAddressByLoop',
        payload: { bundle: [{ showOnOneKey: true }] },
      })
    ).toMatchObject({
      reason: 'address-confirmation',
      operation: 'allNetworkGetAddressByLoop',
    });
  });

  test.each([
    'evmSignMessage',
    'evmSignTransaction',
    'btcSignPsbt',
    'nostrSignEvent',
    'tonSignProof',
    'lnurlAuth',
    'btcVerifyMessage',
    'evmVerifyMessage',
    'starcoinVerifyMessage',
  ])('synthesizes one generic signing confirmation for %s', name => {
    expect(resolveProtocolV2UiInteraction({ name, params: {} })).toEqual({
      request: 'button',
      source: 'method-lifecycle',
      reason: 'signing-confirmation',
      completion: 'operation-completed',
      deviceOnly: true,
      operation: name,
    });
  });

  test.each(['nostrEncryptMessage', 'nostrDecryptMessage'])(
    'uses the display flag for interactive cryptographic method %s',
    name => {
      expect(
        resolveProtocolV2UiInteraction({ name, params: { show_display: true } })
      ).toMatchObject({
        reason: 'signing-confirmation',
        operation: name,
      });
      expect(
        resolveProtocolV2UiInteraction({ name, params: { show_display: false } })
      ).toBeUndefined();
    }
  );

  test('only prompts for cipherKeyValue when the active direction asks for confirmation', () => {
    expect(
      resolveProtocolV2UiInteraction({
        name: 'cipherKeyValue',
        params: [{ encrypt: true, ask_on_encrypt: true, ask_on_decrypt: false }],
      })
    ).toMatchObject({
      reason: 'signing-confirmation',
      operation: 'cipherKeyValue',
    });
    expect(
      resolveProtocolV2UiInteraction({
        name: 'cipherKeyValue',
        params: [{ encrypt: false, ask_on_encrypt: true, ask_on_decrypt: false }],
      })
    ).toBeUndefined();
  });

  test.each(['deviceVerify', 'deviceStatusGet', 'uploadPortfolio'])(
    'does not infer an interaction for %s',
    name => {
      expect(resolveProtocolV2UiInteraction({ name, params: {} })).toBeUndefined();
    }
  );
});
