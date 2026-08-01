import { createUiMessage } from '../src/events';
import { UI_REQUEST } from '../src/events/ui-request';
import { createUiProgressMessageFilter } from '../src/utils/uiProgressThrottle';

import type { KnownDevice } from '../src/types';

describe('createUiProgressMessageFilter', () => {
  let currentTime: number;
  let shouldPostMessage: ReturnType<typeof createUiProgressMessageFilter>;

  beforeEach(() => {
    currentTime = 1_000;
    shouldPostMessage = createUiProgressMessageFilter(250, () => currentTime);
  });

  const firmwareProgress = (
    progress: number,
    progressType: 'transferData' | 'installingFirmware' = 'transferData'
  ) =>
    createUiMessage(UI_REQUEST.FIRMWARE_PROGRESS, {
      device: {} as KnownDevice,
      progress,
      progressType,
    });

  test('limits firmware progress to one event per interval', () => {
    expect(shouldPostMessage(firmwareProgress(1))).toBe(true);

    currentTime += 100;
    expect(shouldPostMessage(firmwareProgress(1))).toBe(false);

    currentTime += 150;
    expect(shouldPostMessage(firmwareProgress(1))).toBe(true);
  });

  test('limits transfer and install progress independently', () => {
    expect(shouldPostMessage(firmwareProgress(1, 'transferData'))).toBe(true);
    expect(shouldPostMessage(firmwareProgress(1, 'installingFirmware'))).toBe(true);

    currentTime += 10;
    expect(shouldPostMessage(firmwareProgress(2, 'transferData'))).toBe(false);
    expect(shouldPostMessage(firmwareProgress(2, 'installingFirmware'))).toBe(false);
  });

  test('emits phase boundaries immediately and suppresses duplicate boundaries', () => {
    expect(shouldPostMessage(firmwareProgress(0))).toBe(true);
    expect(shouldPostMessage(firmwareProgress(0))).toBe(false);

    currentTime += 10;
    expect(shouldPostMessage(firmwareProgress(50))).toBe(false);
    expect(shouldPostMessage(firmwareProgress(100))).toBe(true);
    expect(shouldPostMessage(firmwareProgress(100))).toBe(false);

    expect(shouldPostMessage(firmwareProgress(0))).toBe(true);
  });

  test('treats decreasing progress as a new phase', () => {
    expect(shouldPostMessage(firmwareProgress(80))).toBe(true);

    currentTime += 10;
    expect(shouldPostMessage(firmwareProgress(20))).toBe(true);
  });

  test('also limits device progress and leaves other UI events unchanged', () => {
    const deviceProgress = (progress: number) =>
      createUiMessage(UI_REQUEST.DEVICE_PROGRESS, { progress });

    expect(shouldPostMessage(deviceProgress(1))).toBe(true);
    currentTime += 10;
    expect(shouldPostMessage(deviceProgress(2))).toBe(false);

    expect(shouldPostMessage(createUiMessage(UI_REQUEST.CLOSE_UI_WINDOW))).toBe(true);
  });
});
