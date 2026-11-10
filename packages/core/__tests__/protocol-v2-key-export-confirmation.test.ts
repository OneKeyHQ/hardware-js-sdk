import MoneroGetWatchKey from '../src/api/monero/MoneroGetWatchKey';
import MoneroKeyImageSync from '../src/api/monero/MoneroKeyImageSync';
import ZcashGetFullViewingKey from '../src/api/zcash/ZcashGetFullViewingKey';
import { UI_REQUEST } from '../src/events';
import {
  ProtocolV2UiInteractionCoordinator,
  resolveProtocolV2UiInteraction,
} from '../src/protocols/protocol-v2/uiInteraction';

import type { BaseMethod } from '../src/api/BaseMethod';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const key = (byte: number) => byte.toString(16).padStart(2, '0').repeat(32);

// Protocol V2 firmware sends no ButtonRequest, so these exports declare the prompt they cause.
test.each<[string, () => BaseMethod]>([
  [
    'zcashGetFullViewingKey',
    () =>
      new ZcashGetFullViewingKey({
        id: 1,
        payload: { method: 'zcashGetFullViewingKey', path: "m/32'/133'/0'" },
      }),
  ],
  [
    'moneroGetWatchKey',
    () =>
      new MoneroGetWatchKey({
        id: 1,
        payload: { method: 'moneroGetWatchKey', path: "m/44'/128'/0'", networkType: 0 },
      }),
  ],
  [
    'moneroKeyImageSync',
    () =>
      new MoneroKeyImageSync({
        id: 1,
        payload: {
          method: 'moneroKeyImageSync',
          path: "m/44'/128'/0'",
          networkType: 0,
          transfers: [{ outKey: key(1), txPubKey: key(2), internalOutputIndex: 0 }],
        },
      }),
  ],
])('%s asks the client to show the device confirmation', (name, createMethod) => {
  const method = createMethod();
  method.init();
  const postMessage = jest.fn();
  const device = {
    isProtocolV2: () => true,
    toMessageObject: () => ({ connectId: 'pro2-test', deviceType: 'pro2' }),
  };

  // The same call the unlock-policy runner makes before run().
  new ProtocolV2UiInteractionCoordinator(device as never, postMessage).enterMethodInteraction(
    resolveProtocolV2UiInteraction(method)
  );

  expect(postMessage).toHaveBeenCalledTimes(1);
  expect(postMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      type: UI_REQUEST.REQUEST_BUTTON,
      payload: expect.objectContaining({
        reason: 'public-key-confirmation',
        completion: 'operation-completed',
        operation: name,
      }),
    })
  );
});
