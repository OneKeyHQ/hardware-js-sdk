import type { ProtocolV2UiCompletion } from '../../events';

export type ProtocolV2InteractionReason =
  | 'change-pin'
  | 'device-unlock'
  | 'settings-page'
  | 'address-confirmation'
  | 'public-key-confirmation'
  | 'signing-confirmation'
  | 'device-management';

export type ProtocolV2DeviceInteraction = {
  kind: 'confirm-on-device' | 'enter-pin-on-device';
  reason: ProtocolV2InteractionReason;
  completion: ProtocolV2UiCompletion;
  page?: string | number;
  operation?: string;
};

type ProtocolV2InteractionMethod = {
  name?: string;
  params?: unknown;
  payload?: unknown;
  protocolV2Interaction?: ProtocolV2DeviceInteraction;
};

export const createProtocolV2DeviceInteraction = (
  interaction: ProtocolV2DeviceInteraction
): ProtocolV2DeviceInteraction => interaction;

export const isProtocolV2InteractionEnabled = (method: {
  protocolV2InteractionMode?: 'auto' | 'none';
}) => method.protocolV2InteractionMode !== 'none';

const getDisplayState = (value: unknown) => {
  const visited = new Set<object>();
  let seen = false;
  let enabled = false;

  const visit = (current: unknown) => {
    if (current == null || typeof current !== 'object') return;
    if (visited.has(current)) return;
    visited.add(current);

    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }

    Object.entries(current).forEach(([key, item]) => {
      if ((key === 'show_display' || key === 'showOnOneKey') && typeof item === 'boolean') {
        seen = true;
        enabled ||= item;
        return;
      }
      visit(item);
    });
  };

  visit(value);
  return { seen, enabled };
};

const createMethodInteraction = (
  reason: Extract<
    ProtocolV2InteractionReason,
    'address-confirmation' | 'public-key-confirmation' | 'signing-confirmation'
  >,
  operation: string
): ProtocolV2DeviceInteraction => ({
  kind: 'confirm-on-device',
  reason,
  completion: 'operation-completed',
  operation,
});

const hasCipherConfirmation = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(hasCipherConfirmation);
  if (value == null || typeof value !== 'object') return false;

  const params = value as {
    encrypt?: boolean;
    ask_on_encrypt?: boolean;
    ask_on_decrypt?: boolean;
  };
  return params.encrypt === true ? params.ask_on_encrypt === true : params.ask_on_decrypt === true;
};

/** Resolve an SDK method into a device-side interaction without exposing UI event details. */
export const resolveProtocolV2DeviceInteraction = (
  method: ProtocolV2InteractionMethod
): ProtocolV2DeviceInteraction | undefined => {
  if (method.protocolV2Interaction) return method.protocolV2Interaction;

  const operation = method.name;
  if (!operation) return undefined;

  const isAddress = /getAddress(?:ByLoop)?$/i.test(operation);
  const isPublicKey = /getPublicKey$/i.test(operation);
  if (isAddress || isPublicKey) {
    const paramsDisplay = getDisplayState(method.params);
    const payloadDisplay = getDisplayState(method.payload);
    const display = paramsDisplay.seen ? paramsDisplay : payloadDisplay;
    const shouldDisplay = display.seen ? display.enabled : isAddress;
    if (!shouldDisplay) return undefined;

    return createMethodInteraction(
      isAddress ? 'address-confirmation' : 'public-key-confirmation',
      operation
    );
  }

  if (/sign/i.test(operation) || /verifyMessage$/i.test(operation) || operation === 'lnurlAuth') {
    return createMethodInteraction('signing-confirmation', operation);
  }

  if (operation === 'nostrEncryptMessage' || operation === 'nostrDecryptMessage') {
    const display = getDisplayState(method.params);
    if (!display.enabled) return undefined;
    return createMethodInteraction('signing-confirmation', operation);
  }

  if (operation === 'cipherKeyValue' && hasCipherConfirmation(method.params)) {
    return createMethodInteraction('signing-confirmation', operation);
  }

  return undefined;
};
