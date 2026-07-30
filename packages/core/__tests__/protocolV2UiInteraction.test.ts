import { UI_REQUEST } from '../src/events';
import { ProtocolV2UiInteractionCoordinator } from '../src/protocols/protocol-v2/uiInteraction';
import {
  isProtocolV2InteractionEnabled,
  resolveProtocolV2DeviceInteraction,
} from '../src/protocols/protocol-v2/interaction';
import { getProtocolV2SettingsBehavior } from '../src/protocols/protocol-v2/settingsBehavior';
import { DeviceSettingsPage } from '@onekeyfe/hd-transport';

const createDevice = (protocolV2 = true) => ({
  isProtocolV2: jest.fn(() => protocolV2),
  toMessageObject: jest.fn(() => ({ connectId: 'pro2-test', deviceType: 'pro2' })),
});

const changePinInteraction = {
  kind: 'confirm-on-device',
  reason: 'change-pin',
  completion: 'page-accepted',
} as const;

test('describes a settings page as a device interaction intent without legacy UI fields', () => {
  expect(
    getProtocolV2SettingsBehavior({
      kind: 'page',
      page: DeviceSettingsPage.DevicePinChange,
      reason: 'change-pin',
      operation: 'change-pin',
    } as any)
  ).toEqual({
    unlockPolicy: 'unlock-before-run',
    interaction: {
      kind: 'confirm-on-device',
      reason: 'change-pin',
      completion: 'operation-completed',
      page: DeviceSettingsPage.DevicePinChange,
      operation: 'change-pin',
    },
  });
});

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
      kind: 'enter-pin-on-device',
      reason: 'device-unlock',
      completion: 'operation-completed',
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
    expect(coordinator.close()).toBe(true);
    expect(coordinator.close()).toBe(false);

    expect(postMessage.mock.calls.map(([message]) => message.type)).toEqual([
      UI_REQUEST.REQUEST_BUTTON,
      UI_REQUEST.CLOSE_UI_WINDOW,
    ]);
  });

  test('does not emit interaction events for methods without metadata such as Portfolio', () => {
    const postMessage = jest.fn();
    const coordinator = new ProtocolV2UiInteractionCoordinator(createDevice() as any, postMessage);

    coordinator.enterMethodInteraction(undefined);
    coordinator.close();

    expect(postMessage).not.toHaveBeenCalled();
  });

  test('disables both synthesized prompts and compatibility close events for Portfolio', () => {
    expect(isProtocolV2InteractionEnabled({ protocolV2InteractionMode: 'none' })).toBe(false);
    expect(isProtocolV2InteractionEnabled({ protocolV2InteractionMode: 'auto' })).toBe(true);
    expect(isProtocolV2InteractionEnabled({})).toBe(true);
  });
});

describe('resolveProtocolV2DeviceInteraction', () => {
  test('keeps explicit method metadata as the highest-priority policy', () => {
    expect(
      resolveProtocolV2DeviceInteraction({
        name: 'evmSignMessage',
        params: {},
        protocolV2Interaction: changePinInteraction,
      })
    ).toBe(changePinInteraction);
  });

  test.each([
    ['evmGetAddress', 'address-confirmation'],
    ['btcGetPublicKey', 'public-key-confirmation'],
  ])('synthesizes display confirmation metadata for %s', (name, reason) => {
    expect(
      resolveProtocolV2DeviceInteraction({
        name,
        params: [{ show_display: false }, { show_display: true }],
      })
    ).toEqual({
      kind: 'confirm-on-device',
      reason,
      completion: 'operation-completed',
      operation: name,
    });
  });

  test.each(['evmGetAddress', 'btcGetPublicKey'])('keeps non-display %s calls eventless', name => {
    expect(
      resolveProtocolV2DeviceInteraction({
        name,
        params: [{ show_display: false }],
      })
    ).toBeUndefined();
  });

  test('uses the public address payload for aggregate address methods', () => {
    expect(
      resolveProtocolV2DeviceInteraction({
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
      resolveProtocolV2DeviceInteraction({
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
    expect(resolveProtocolV2DeviceInteraction({ name, params: {} })).toEqual({
      kind: 'confirm-on-device',
      reason: 'signing-confirmation',
      completion: 'operation-completed',
      operation: name,
    });
  });

  test.each(['nostrEncryptMessage', 'nostrDecryptMessage'])(
    'uses the display flag for interactive cryptographic method %s',
    name => {
      expect(
        resolveProtocolV2DeviceInteraction({ name, params: { show_display: true } })
      ).toMatchObject({
        reason: 'signing-confirmation',
        operation: name,
      });
      expect(
        resolveProtocolV2DeviceInteraction({ name, params: { show_display: false } })
      ).toBeUndefined();
    }
  );

  test('only prompts for cipherKeyValue when the active direction asks for confirmation', () => {
    expect(
      resolveProtocolV2DeviceInteraction({
        name: 'cipherKeyValue',
        params: [{ encrypt: true, ask_on_encrypt: true, ask_on_decrypt: false }],
      })
    ).toMatchObject({
      reason: 'signing-confirmation',
      operation: 'cipherKeyValue',
    });
    expect(
      resolveProtocolV2DeviceInteraction({
        name: 'cipherKeyValue',
        params: [{ encrypt: false, ask_on_encrypt: true, ask_on_decrypt: false }],
      })
    ).toBeUndefined();
  });

  test.each(['deviceVerify', 'deviceStatusGet', 'uploadPortfolio'])(
    'does not infer an interaction for %s',
    name => {
      expect(resolveProtocolV2DeviceInteraction({ name, params: {} })).toBeUndefined();
    }
  );
});
