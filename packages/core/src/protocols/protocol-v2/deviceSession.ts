import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import type { DeviceSession } from '@onekeyfe/hd-transport';

export type CompleteDeviceSession = DeviceSession & {
  session_id: string;
  btc_test_address: string;
};

export function assertCompleteDeviceSession(
  message: DeviceSession
): asserts message is CompleteDeviceSession {
  if (
    typeof message.session_id !== 'string' ||
    !message.session_id ||
    typeof message.btc_test_address !== 'string' ||
    !message.btc_test_address
  ) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      'DeviceSessionGet returned an incomplete DeviceSession response.'
    );
  }
}
