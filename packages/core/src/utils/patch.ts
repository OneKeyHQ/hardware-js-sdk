import type { DefaultMessageResponse } from '../device/DeviceCommands';

export function patchFeatures(response: DefaultMessageResponse) {
  if (response.type !== 'Features') {
    return response;
  }

  // Bootloader 小于 1.8.7 时 major_version 可能小于 0，需要转换为 1
  if (response.message.major_version < 1) {
    response.message.major_version = 1;
  }

  return response;
}
