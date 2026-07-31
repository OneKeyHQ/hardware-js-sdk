import { UI_REQUEST } from '@onekeyfe/hd-core';

import type { UiEvent } from '@onekeyfe/hd-core';

export type HardwareUiPhase =
  | 'idle'
  | 'pin'
  | 'processing'
  | 'passphrase'
  | 'passphrase-on-device'
  | 'button'
  | 'closed';

type HardwareUiInteraction = {
  interactionId: string;
  phaseId: string;
  sequence: number;
  phase: 'pin' | 'passphrase' | 'passphrase-on-device' | 'button' | 'processing';
  transition: 'start' | 'complete' | 'finish';
  outcome?: 'submitted' | 'succeeded' | 'failed' | 'cancelled' | 'disconnected';
  protocol: 'V2';
};

type HardwareUiEventPayload = {
  device?: { connectId?: string | null };
  interaction?: HardwareUiInteraction;
};

export type HardwareUiState = {
  isOpen: boolean;
  phase: HardwareUiPhase;
  actionType: UiEvent['type'] | null;
  connectId?: string;
  interactionId?: string;
  phaseId?: string;
  lastSequence?: number;
};

const REQUEST_PHASES: Partial<Record<UiEvent['type'], HardwareUiPhase>> = {
  [UI_REQUEST.REQUEST_PIN]: 'pin',
  [UI_REQUEST.REQUEST_PASSPHRASE]: 'passphrase',
  [UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE]: 'passphrase-on-device',
  [UI_REQUEST.REQUEST_BUTTON]: 'button',
};

export const createHardwareUiState = (): HardwareUiState => ({
  isOpen: false,
  phase: 'idle',
  actionType: null,
});

const getPayload = (event: UiEvent): HardwareUiEventPayload => {
  if (!event.payload || typeof event.payload !== 'object') return {};
  const payload = event.payload as HardwareUiEventPayload & Partial<HardwareUiInteraction>;
  if (
    typeof payload.interactionId === 'string' &&
    typeof payload.phaseId === 'string' &&
    typeof payload.sequence === 'number'
  ) {
    return { interaction: payload as HardwareUiInteraction };
  }
  return payload;
};

const isSameDevice = (state: HardwareUiState, payload: HardwareUiEventPayload) => {
  const connectId = payload.device?.connectId;
  return !connectId || !state.connectId || connectId === state.connectId;
};

const isNewerInteractionEvent = (
  state: HardwareUiState,
  interaction: HardwareUiInteraction | undefined
) => {
  if (!interaction) return true;
  if (state.interactionId && state.interactionId !== interaction.interactionId) return true;
  return state.lastSequence === undefined || interaction.sequence > state.lastSequence;
};

const applyInteraction = (
  state: HardwareUiState,
  interaction: HardwareUiInteraction | undefined
): HardwareUiState => {
  if (!interaction) return state;
  return {
    ...state,
    interactionId: interaction.interactionId,
    phaseId: interaction.phaseId,
    lastSequence: interaction.sequence,
  };
};

export const reduceHardwareUiEvent = (
  state: HardwareUiState,
  event: UiEvent
): HardwareUiState => {
  const payload = getPayload(event);
  const interaction = payload.interaction;

  if (!isSameDevice(state, payload) || !isNewerInteractionEvent(state, interaction)) {
    return state;
  }

  const requestedPhase = REQUEST_PHASES[event.type];
  if (requestedPhase) {
    const connectId = payload.device?.connectId ?? state.connectId;
    return applyInteraction(
      {
        ...state,
        isOpen: true,
        phase: requestedPhase,
        actionType: event.type,
        connectId: connectId ?? undefined,
      },
      interaction
    );
  }

  if (event.type === UI_REQUEST.CLOSE_UI_PIN_WINDOW) {
    if (state.phase === 'passphrase' || state.phase === 'passphrase-on-device') return state;
    if (interaction && interaction.phase !== 'pin') return state;
    if (interaction && state.phaseId !== interaction.phaseId) return state;

    return applyInteraction(
      {
        ...state,
        isOpen: true,
        phase: 'processing',
        // The animation component renders unknown actions as Processing.
        actionType: UI_REQUEST.CLOSE_UI_PIN_WINDOW,
      },
      interaction
    );
  }

  if (event.type === UI_REQUEST.CLOSE_UI_WINDOW) {
    return applyInteraction(
      {
        ...state,
        isOpen: false,
        phase: 'closed',
        actionType: null,
      },
      interaction
    );
  }

  return state;
};

export class HardwareUiEventQueue {
  private tail: Promise<void> = Promise.resolve();

  private generation = 0;

  enqueue(event: UiEvent, handler: (event: UiEvent) => void | Promise<void>) {
    const generation = this.generation;
    const task = this.tail.then(async () => {
      if (generation !== this.generation) return;
      await handler(event);
    });

    // Keep the queue alive after one event fails while preserving the failure
    // on the promise returned to the caller for diagnostics.
    this.tail = task.catch(() => undefined);
    return task;
  }

  reset() {
    this.generation += 1;
    this.tail = Promise.resolve();
  }
}
