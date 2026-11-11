import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { isIosPeerRemovedPairingInformation, toIosStaleBondError } from '../bleIosBond';

describe('iOS lost-bond mapping', () => {
  test('recognizes CBErrorPeerRemovedPairingInformation from the native code', () => {
    const error = Object.assign(new Error('Device was disconnected'), {
      errorCode: 201,
      iosErrorCode: 14,
      reason: 'Peer removed pairing information',
    });

    expect(isIosPeerRemovedPairingInformation(error)).toBe(true);
    expect(isIosPeerRemovedPairingInformation({ iosErrorCode: 7 })).toBe(false);
    expect(isIosPeerRemovedPairingInformation(new Error('localized text is ignored'))).toBe(false);
  });

  test('maps the lost bond to the public re-pair error with safe context', () => {
    const mapped = toIosStaleBondError(
      Object.assign(new Error('Device was disconnected'), {
        iosErrorCode: 14,
        reason: 'Peer removed pairing information',
      })
    );

    expect(mapped).toMatchObject({
      errorCode: HardwareErrorCode.BlePeerRemovedPairingInformation,
      params: {
        phase: 'connect',
        reason: 'peer_removed_pairing_information',
        nativeErrorMessage: 'Peer removed pairing information Device was disconnected',
      },
    });
  });
});
