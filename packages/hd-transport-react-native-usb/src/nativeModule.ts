import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { Buffer } from 'buffer';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

import type { EmitterSubscription } from 'react-native';

export const ONEKEY_USB_DEVICE_ATTACHED = 'OneKeyUsbDeviceAttached';
export const ONEKEY_USB_DEVICE_DETACHED = 'OneKeyUsbDeviceDetached';

/**
 * Packets cross the React Native bridge as standard Base64 (no data-URL prefix).
 * Native Kotlin encodes/decodes the same alphabet.
 */
export const USB_PACKET_ENCODING = 'base64' as const;

export type NativeUsbDeviceInfo = {
  path: string;
  vendorId: number;
  productId: number;
  serialNumber?: string | null;
};

export type NativeUsbDeviceEvent = NativeUsbDeviceInfo;

type OneKeyUsbNativeModule = {
  getDevices(): Promise<NativeUsbDeviceInfo[]>;
  hasPermission(path: string): Promise<boolean>;
  requestPermission(path: string): Promise<boolean>;
  open(path: string): Promise<void>;
  close(path: string): Promise<void>;
  transferOut(path: string, data: string, timeoutMs: number): Promise<void>;
  transferIn(path: string, length: number, timeoutMs: number): Promise<string>;
  cancel(path: string): Promise<void>;
};

const UNSUPPORTED_MESSAGE =
  'Android USB host is not available on this platform. iOS has no general USB host API.';

function createUnsupportedError(cause?: string) {
  return ERRORS.TypedError(
    HardwareErrorCode.RuntimeError,
    cause ? `${UNSUPPORTED_MESSAGE} ${cause}` : UNSUPPORTED_MESSAGE
  );
}

export function isNativeUsbAvailable(): boolean {
  if (Platform.OS !== 'android') {
    return false;
  }
  return NativeModules.OneKeyUsb != null;
}

export function getOneKeyUsbModule(): OneKeyUsbNativeModule {
  if (Platform.OS !== 'android') {
    throw createUnsupportedError();
  }
  const native = NativeModules.OneKeyUsb as OneKeyUsbNativeModule | undefined;
  if (!native) {
    throw createUnsupportedError('Native module OneKeyUsb is not linked.');
  }
  return native;
}

export function createUsbEventEmitter(): NativeEventEmitter | null {
  if (!isNativeUsbAvailable()) {
    return null;
  }
  return new NativeEventEmitter(NativeModules.OneKeyUsb);
}

export function subscribeUsbDeviceEvents(
  emitter: NativeEventEmitter | null,
  handlers: {
    onAttached?: (device: NativeUsbDeviceEvent) => void;
    onDetached?: (device: NativeUsbDeviceEvent) => void;
  }
): EmitterSubscription[] {
  if (!emitter) {
    return [];
  }
  const subscriptions: EmitterSubscription[] = [];
  if (handlers.onAttached) {
    const { onAttached } = handlers;
    subscriptions.push(
      emitter.addListener(ONEKEY_USB_DEVICE_ATTACHED, event =>
        onAttached(event as NativeUsbDeviceEvent)
      )
    );
  }
  if (handlers.onDetached) {
    const { onDetached } = handlers;
    subscriptions.push(
      emitter.addListener(ONEKEY_USB_DEVICE_DETACHED, event =>
        onDetached(event as NativeUsbDeviceEvent)
      )
    );
  }
  return subscriptions;
}

export function encodeUsbPacket(data: Uint8Array): string {
  return Buffer.from(data).toString(USB_PACKET_ENCODING);
}

export function decodeUsbPacket(encoded: string): Uint8Array {
  return Uint8Array.from(Buffer.from(encoded, USB_PACKET_ENCODING));
}

export function mapNativeUsbError(error: unknown): never {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : String(error ?? '');
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  const upperCode = code.toUpperCase();
  const combined = `${code} ${message}`.toLowerCase();

  if (
    upperCode === 'USB_CANCELLED' ||
    combined.includes('cancelled') ||
    combined.includes('canceled')
  ) {
    throw ERRORS.TypedError(
      HardwareErrorCode.DeviceInterruptedFromOutside,
      message || 'USB transfer cancelled'
    );
  }
  if (upperCode === 'USB_PERMISSION' || combined.includes('permission')) {
    throw ERRORS.TypedError(HardwareErrorCode.WebUsbDeviceAccessError, message || undefined);
  }
  if (
    upperCode === 'USB_NOT_SUPPORTED' ||
    combined.includes('not_supported') ||
    combined.includes('not supported')
  ) {
    throw createUnsupportedError(message);
  }
  if (
    upperCode === 'USB_TIMEOUT' ||
    combined.includes('timeout') ||
    combined.includes('timed_out')
  ) {
    const timeoutMessage =
      message && /timeout|timed_out/i.test(message) ? message : 'USB transfer timeout';
    throw ERRORS.TypedError(HardwareErrorCode.NetworkError, timeoutMessage);
  }
  if (
    upperCode === 'USB_NOT_FOUND' ||
    combined.includes('not_found') ||
    combined.includes('not found') ||
    combined.includes('disconnected')
  ) {
    throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, message || 'USB device disconnected');
  }
  if (upperCode === 'USB_TRANSFER_FAILED') {
    throw ERRORS.TypedError(HardwareErrorCode.NetworkError, message || 'USB transfer failed');
  }
  throw ERRORS.TypedError(HardwareErrorCode.NetworkError, message || 'USB native error');
}
