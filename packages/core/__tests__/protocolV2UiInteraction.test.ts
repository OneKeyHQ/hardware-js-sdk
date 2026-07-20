import { UI_REQUEST } from '../src/events';
import {
  ProtocolV2UiInteractionCoordinator,
  isProtocolV2UiEnabled,
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

  test('switches to unlock prompt and restores the method interaction', () => {
    const postMessage = jest.fn();
    const coordinator = new ProtocolV2UiInteractionCoordinator(
      createDevice() as any,
      postMessage
    );

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

    const coordinator = new ProtocolV2UiInteractionCoordinator(
      createDevice() as any,
      postMessage
    );
    coordinator.enterMethodInteraction(changePinInteraction);
    coordinator.close();
    coordinator.close();

    expect(postMessage.mock.calls.map(([message]) => message.type)).toEqual([
      UI_REQUEST.REQUEST_BUTTON,
      UI_REQUEST.CLOSE_UI_WINDOW,
    ]);
  });

  test('does not emit interaction events for methods without metadata such as Portfolio', () => {
    const postMessage = jest.fn();
    const coordinator = new ProtocolV2UiInteractionCoordinator(
      createDevice() as any,
      postMessage
    );

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
