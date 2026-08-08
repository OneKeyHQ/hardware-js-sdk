import type {
  CoreMessage,
  UI_REQUEST,
  UiRequestDeviceAction,
  UiRequestPassphrase,
  UiResponseCorrelation,
} from '@onekeyfe/hd-core';

type SensitiveUiRequest = Extract<
  CoreMessage,
  {
    type: typeof UI_REQUEST.REQUEST_PIN | typeof UI_REQUEST.REQUEST_PASSPHRASE;
  }
>;

/**
 * V2 允许并行的敏感交互，UI 回应必须带回请求中的关联信息。
 * V1 没有关联信息时返回空对象，继续兼容原有单请求流程。
 */
export function getUiResponseCorrelation(
  message: SensitiveUiRequest
): Partial<UiResponseCorrelation> {
  return message.payload.responseCorrelation ?? {};
}

export function isProtocolV2PinRequest(message: UiRequestDeviceAction): boolean {
  return (
    message.payload.device.connectProtocol === 'V2' ||
    message.payload.interaction?.protocol === 'V2'
  );
}

export function isProtocolV2PassphraseRequest(message: UiRequestPassphrase): boolean {
  return (
    message.payload.device.connectProtocol === 'V2' ||
    message.payload.interaction?.protocol === 'V2'
  );
}
