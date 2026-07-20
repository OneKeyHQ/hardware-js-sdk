import { UI_REQUEST, createUiMessage } from '../../events';

import type { CoreMessage, ProtocolV2UiCompletion } from '../../events';
import type { Device } from '../../device/Device';
import type { KnownDevice } from '../../types';

export type ProtocolV2InteractionDescriptor = {
  request: 'button';
  source: 'method-lifecycle';
  reason:
    | 'change-pin'
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

type InteractionDevice = Pick<Device, 'isProtocolV2' | 'toMessageObject'>;
type PostMessage = (message: CoreMessage) => void;

export const isProtocolV2UiEnabled = (method: { protocolV2UiMode?: 'auto' | 'none' }) =>
  method.protocolV2UiMode !== 'none';

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
    const { request: _request, ...metadata } = interaction;

    this.emit(
      UI_REQUEST.REQUEST_BUTTON,
      {
        device: this.device.toMessageObject() as KnownDevice,
        ...metadata,
      },
      `method:${interaction.reason}:${interaction.page ?? ''}:${interaction.operation ?? ''}`
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
