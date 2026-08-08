import { UI_EVENT, UI_REQUEST } from '../events/ui-request';

import type { CoreMessage } from '../events';

const DEFAULT_UI_PROGRESS_INTERVAL_MS = 250;

type UiProgressThrottleState = {
  lastEmittedAt: number;
  lastProgress?: number;
};

const normalizeProgress = (progress: unknown) => {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) {
    return undefined;
  }

  return Math.max(0, Math.min(100, Math.floor(progress)));
};

export const createUiProgressMessageFilter = (
  intervalMs = DEFAULT_UI_PROGRESS_INTERVAL_MS,
  now = Date.now
) => {
  const stateByType = new Map<string, UiProgressThrottleState>();

  return (message: CoreMessage) => {
    if (
      !('event' in message) ||
      message.event !== UI_EVENT ||
      (message.type !== UI_REQUEST.DEVICE_PROGRESS && message.type !== UI_REQUEST.FIRMWARE_PROGRESS)
    ) {
      return true;
    }

    const key =
      message.type === UI_REQUEST.FIRMWARE_PROGRESS
        ? `${message.type}:${message.payload.progressType}`
        : message.type;
    const progress = normalizeProgress(message.payload.progress);
    const currentTime = now();
    const state = stateByType.get(key);

    if (!state) {
      stateByType.set(key, { lastEmittedAt: currentTime, lastProgress: progress });
      return true;
    }

    const isBoundary = progress === 0 || progress === 100;
    if (isBoundary && progress === state.lastProgress) {
      return false;
    }

    const startsNewPhase =
      progress !== undefined && state.lastProgress !== undefined && progress < state.lastProgress;

    if (!isBoundary && !startsNewPhase && currentTime - state.lastEmittedAt < intervalMs) {
      return false;
    }

    stateByType.set(key, { lastEmittedAt: currentTime, lastProgress: progress });
    return true;
  };
};
