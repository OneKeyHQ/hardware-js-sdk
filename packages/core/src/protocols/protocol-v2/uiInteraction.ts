import { UI_REQUEST, createUiMessage } from '../../events';

import type { CoreMessage, ProtocolV2UiCompletion } from '../../events';
import type { Device } from '../../device/Device';
import type { KnownDevice } from '../../types';

export type ProtocolV2InteractionDescriptor = {
  request: 'button' | 'pin';
  source: 'method-lifecycle';
  reason:
    | 'change-pin'
    | 'device-unlock'
    | 'settings-page'
    | 'address-confirmation'
    | 'public-key-confirmation'
    | 'signing-confirmation'
    | 'device-management';
  completion: ProtocolV2UiCompletion;
  deviceOnly: true;
  page?: string | number;
  operation?: string;
};

type ProtocolV2InteractionMethod = {
  name?: string;
  params?: unknown;
  payload?: unknown;
  protocolV2UiInteraction?: ProtocolV2InteractionDescriptor;
};

type InteractionDevice = Pick<Device, 'isProtocolV2' | 'toMessageObject'>;
type PostMessage = (message: CoreMessage) => void;

export const isProtocolV2UiEnabled = (method: { protocolV2UiMode?: 'auto' | 'none' }) =>
  method.protocolV2UiMode !== 'none';

const getDisplayState = (value: unknown) => {
  const visited = new Set<object>();
  let seen = false;
  let enabled = false;

  const visit = (current: unknown) => {
    if (current == null || typeof current !== 'object') return;
    if (visited.has(current)) return;
    visited.add(current);

    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }

    Object.entries(current).forEach(([key, item]) => {
      if ((key === 'show_display' || key === 'showOnOneKey') && typeof item === 'boolean') {
        seen = true;
        enabled ||= item;
        return;
      }
      visit(item);
    });
  };

  visit(value);
  return { seen, enabled };
};

const createMethodInteraction = (
  reason: 'address-confirmation' | 'public-key-confirmation' | 'signing-confirmation',
  operation: string
): ProtocolV2InteractionDescriptor => ({
  request: 'button',
  source: 'method-lifecycle',
  reason,
  completion: 'operation-completed',
  deviceOnly: true,
  operation,
});

const hasCipherConfirmation = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(hasCipherConfirmation);
  if (value == null || typeof value !== 'object') return false;

  const params = value as {
    encrypt?: boolean;
    ask_on_encrypt?: boolean;
    ask_on_decrypt?: boolean;
  };
  return params.encrypt === true ? params.ask_on_encrypt === true : params.ask_on_decrypt === true;
};

/**
 * Protocol V2 no longer relies on firmware ButtonRequest, so the SDK synthesizes
 * compatible UI events. Explicit descriptors win; address/public-key prompts appear
 * only when displayed, while signing emits one prompt.
 */
export const resolveProtocolV2UiInteraction = (
  method: ProtocolV2InteractionMethod
): ProtocolV2InteractionDescriptor | undefined => {
  if (method.protocolV2UiInteraction) return method.protocolV2UiInteraction;

  const operation = method.name;
  if (!operation) return undefined;

  const isAddress = /getAddress(?:ByLoop)?$/i.test(operation);
  const isPublicKey = /getPublicKey$/i.test(operation);
  if (isAddress || isPublicKey) {
    const paramsDisplay = getDisplayState(method.params);
    const payloadDisplay = getDisplayState(method.payload);
    const display = paramsDisplay.seen ? paramsDisplay : payloadDisplay;

    // Address methods usually display by default; public-key methods may be silent.
    const shouldDisplay = display.seen ? display.enabled : isAddress;
    if (!shouldDisplay) return undefined;

    return createMethodInteraction(
      isAddress ? 'address-confirmation' : 'public-key-confirmation',
      operation
    );
  }

  if (/sign/i.test(operation) || /verifyMessage$/i.test(operation) || operation === 'lnurlAuth') {
    return createMethodInteraction('signing-confirmation', operation);
  }

  if (operation === 'nostrEncryptMessage' || operation === 'nostrDecryptMessage') {
    const display = getDisplayState(method.params);
    if (!display.enabled) return undefined;
    return createMethodInteraction('signing-confirmation', operation);
  }

  if (operation === 'cipherKeyValue' && hasCipherConfirmation(method.params)) {
    return createMethodInteraction('signing-confirmation', operation);
  }

  return undefined;
};

export class ProtocolV2UiInteractionCoordinator {
  private readonly device: InteractionDevice;

  private readonly postMessage: PostMessage;

  private methodInteraction?: ProtocolV2InteractionDescriptor;

  private currentPhase?: string;

  private opened = false;

  private closed = false;

  constructor(device: InteractionDevice, postMessage: PostMessage) {
    this.device = device;
    this.postMessage = postMessage;
  }

  enterMethodInteraction(interaction?: ProtocolV2InteractionDescriptor) {
    this.methodInteraction = interaction;
    if (!interaction) return;
    const { request, ...metadata } = interaction;

    this.emit(
      request === 'pin' ? UI_REQUEST.REQUEST_PIN : UI_REQUEST.REQUEST_BUTTON,
      {
        device: this.device.toMessageObject() as KnownDevice,
        ...metadata,
      },
      `method:${request}:${interaction.reason}:${interaction.page ?? ''}:${
        interaction.operation ?? ''
      }`
    );
  }

  enterUnlockInteraction(method?: string) {
    this.emit(
      UI_REQUEST.REQUEST_PIN,
      {
        device: this.device.toMessageObject() as KnownDevice,
        source: 'unlock-coordinator',
        reason: 'device-locked',
        deviceOnly: true,
        method,
      },
      `unlock:${method ?? ''}`
    );
  }

  resumeMethodInteraction() {
    this.enterMethodInteraction(this.methodInteraction);
  }

  close() {
    if (!this.device.isProtocolV2() || !this.opened || this.closed) return;
    this.closed = true;
    this.postMessage(createUiMessage(UI_REQUEST.CLOSE_UI_WINDOW));
  }

  private emit(
    type: typeof UI_REQUEST.REQUEST_BUTTON | typeof UI_REQUEST.REQUEST_PIN,
    payload: any,
    phase: string
  ) {
    if (!this.device.isProtocolV2() || this.closed || this.currentPhase === phase) return;
    this.currentPhase = phase;
    this.opened = true;
    const message =
      type === UI_REQUEST.REQUEST_BUTTON
        ? createUiMessage(UI_REQUEST.REQUEST_BUTTON, payload)
        : createUiMessage(UI_REQUEST.REQUEST_PIN, payload);
    this.postMessage(message);
  }
}
