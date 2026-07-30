import { UI_REQUEST, createUiMessage } from '../../events';

import type { CoreMessage } from '../../events';
import type { Device } from '../../device/Device';
import type { KnownDevice } from '../../types';
import type { ProtocolV2DeviceInteraction } from './interaction';

type InteractionDevice = Pick<Device, 'isProtocolV2' | 'toMessageObject'>;
type PostMessage = (message: CoreMessage) => void;

export class ProtocolV2UiInteractionCoordinator {
  private readonly device: InteractionDevice;

  private readonly postMessage: PostMessage;

  private methodInteraction?: ProtocolV2DeviceInteraction;

  private currentPhase?: string;

  private opened = false;

  private closed = false;

  constructor(device: InteractionDevice, postMessage: PostMessage) {
    this.device = device;
    this.postMessage = postMessage;
  }

  enterMethodInteraction(interaction?: ProtocolV2DeviceInteraction) {
    this.methodInteraction = interaction;
    if (!interaction) return;
    const { kind, ...metadata } = interaction;

    this.emit(
      kind === 'enter-pin-on-device' ? UI_REQUEST.REQUEST_PIN : UI_REQUEST.REQUEST_BUTTON,
      {
        device: this.device.toMessageObject() as KnownDevice,
        source: 'method-lifecycle',
        ...metadata,
        deviceOnly: true,
      },
      `method:${kind}:${interaction.reason}:${interaction.page ?? ''}:${
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
    if (!this.device.isProtocolV2() || !this.opened || this.closed) return false;
    this.closed = true;
    this.postMessage(createUiMessage(UI_REQUEST.CLOSE_UI_WINDOW));
    return true;
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
