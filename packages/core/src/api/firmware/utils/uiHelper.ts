import type { Device } from '../../../device/Device';
import type { CoreMessage } from '../../../events';
import { DEVICE, createUiMessage, UI_REQUEST } from '../../../events';
import type { KnownDevice } from '../../../types';

// UI Helper Functions
export const postConfirmationMessage = (device: Device) => {
  // only if firmware is already installed. fresh device does not require button confirmation
  if (device.features?.firmware_present) {
    device.emit(DEVICE.BUTTON, device, { code: 'ButtonRequest_FirmwareUpdate' });
  }
};

export const postProgressMessage = (
  device: Device,
  progress: number,
  postMessage: (message: CoreMessage) => void
) => {
  postMessage(
    createUiMessage(UI_REQUEST.FIRMWARE_PROGRESS, {
      device: device.toMessageObject() as KnownDevice,
      progress,
    })
  );
};

export const postProgressTip = (
  device: Device,
  message: string,
  postMessage: (message: CoreMessage) => void
) => {
  postMessage(
    createUiMessage(UI_REQUEST.FIRMWARE_TIP, {
      device: device.toMessageObject() as KnownDevice,
      data: {
        message,
      },
    })
  );
};
