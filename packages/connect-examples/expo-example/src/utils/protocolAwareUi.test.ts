import { UI_REQUEST } from '@onekeyfe/hd-core';

import { getUiResponseCorrelation, isProtocolV2PinRequest } from './protocolAwareUi';

describe('Protocol V2 UI 适配', () => {
  test('敏感 UI 请求会透传交互关联信息', () => {
    const message = {
      type: UI_REQUEST.REQUEST_PASSPHRASE,
      payload: {
        device: { connectProtocol: 'V2' },
        responseCorrelation: {
          interactionId: 'interaction-1',
          deviceId: 'device-1',
        },
      },
    } as any;

    expect(getUiResponseCorrelation(message)).toEqual({
      interactionId: 'interaction-1',
      deviceId: 'device-1',
    });
  });

  test('V2 PIN 请求仅提示设备端输入', () => {
    expect(
      isProtocolV2PinRequest({
        type: UI_REQUEST.REQUEST_PIN,
        payload: { device: { connectProtocol: 'V2' } },
      } as any)
    ).toBe(true);
  });
});
