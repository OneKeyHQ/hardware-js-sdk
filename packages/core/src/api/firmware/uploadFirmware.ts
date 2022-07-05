import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DEVICE, CoreMessage, createUiMessage, UI_REQUEST } from '../../events';
import { PROTO } from '../../constants';
import type { Device } from '../../device/Device';
import type { TypedCall } from '../../device/DeviceCommands';
import { KnownDevice } from '../../types';

const postConfirmationMessage = (device: Device) => {
  // only if firmware is already installed. fresh device does not require button confirmation
  if (device.features?.firmware_present) {
    device.emit(DEVICE.BUTTON, device, { code: 'ButtonRequest_FirmwareUpdate' });
  }
};

const postProgressMessage = (
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

export const uploadFirmware = async (
  updateType: 'firmware' | 'ble',
  typedCall: TypedCall,
  postMessage: (message: CoreMessage) => void,
  device: Device,
  { payload }: PROTO.FirmwareUpload
) => {
  if (device.features?.major_version === 1) {
    postConfirmationMessage(device);
    const eraseCommand = updateType === 'firmware' ? 'FirmwareErase' : 'FirmwareErase_ex';
    await typedCall(eraseCommand as unknown as any, 'Success', {});
    postProgressMessage(device, 0, postMessage);
    const { message } = await typedCall('FirmwareUpload', 'Success', {
      payload,
    });
    postProgressMessage(device, 100, postMessage);
    return message;
  }

  if (device.features?.major_version === 2) {
    postConfirmationMessage(device);
    const length = payload.byteLength;

    let response = await typedCall('FirmwareErase', ['FirmwareRequest', 'Success'], { length });
    while (response.type !== 'Success') {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const start = response.message.offset!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const end = response.message.offset! + response.message.length!;
      const chunk = payload.slice(start, end);

      if (start > 0) {
        postProgressMessage(device, Math.round((start / length) * 100), postMessage);
      }

      response = await typedCall('FirmwareUpload', ['FirmwareRequest', 'Success'], {
        payload: chunk,
      });
    }

    postProgressMessage(device, 100, postMessage);
    return response.message;
  }

  throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'uploadFirmware: unknown major_version');
};
