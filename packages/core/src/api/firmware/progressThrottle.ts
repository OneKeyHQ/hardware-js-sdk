import type { IFirmwareUpdateProgressType } from '../../events/ui-request';

const DEFAULT_FIRMWARE_PROGRESS_INTERVAL_MS = 250;

type FirmwareProgressThrottleState = {
  lastEmittedAt: number;
  lastProgress?: number;
};

export const createFirmwareProgressThrottle = (
  intervalMs = DEFAULT_FIRMWARE_PROGRESS_INTERVAL_MS
) => {
  const stateByType = new Map<IFirmwareUpdateProgressType, FirmwareProgressThrottleState>();

  return (progress: number, progressType: IFirmwareUpdateProgressType) => {
    if (progressType !== 'transferData') {
      return true;
    }

    const normalizedProgress = Math.max(0, Math.min(100, Math.floor(progress)));
    if (normalizedProgress === 0 || normalizedProgress === 100) {
      stateByType.set(progressType, {
        lastEmittedAt: Date.now(),
        lastProgress: normalizedProgress,
      });
      return true;
    }

    const now = Date.now();
    const state = stateByType.get(progressType);
    if (
      state &&
      (state.lastProgress === normalizedProgress || now - state.lastEmittedAt < intervalMs)
    ) {
      return false;
    }

    stateByType.set(progressType, {
      lastEmittedAt: now,
      lastProgress: normalizedProgress,
    });
    return true;
  };
};
